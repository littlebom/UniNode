import { Injectable, Inject, Logger } from '@nestjs/common'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import type { Cache } from 'cache-manager'
import { ConfigService } from '@nestjs/config'
import { CourseRepository } from './course.repository'
import { CryptoService } from '../crypto/crypto.service'
import { ListCoursesDto } from './dto/list-courses.dto'
import { SearchCoursesDto } from './dto/search-courses.dto'
import { VerifyCourseIntegrityDto } from './dto/verify-course-integrity.dto'
import { UniLinkException, UniLinkErrorCode } from '@unilink/dto'
import { sha256Hex, canonicalize, verifyRaw } from '@unilink/crypto'
import { didWebToUrl } from '@unilink/vc-core'
import type { DIDDocument } from '@unilink/vc-core'
import type {
  LISCourseTemplate,
  CourseIntegrity,
  CASEDocument,
  CASELearningOutcome,
  CourseSyllabus,
  SchemaOrgCourse,
  BloomLevel,
  PaginatedResponse,
} from '@unilink/dto'
import type { CourseEntity } from './entities/course.entity'
import { CACHE_KEYS, CACHE_TTL, buildCacheKey } from '../common/cache/cache-keys'

export interface LOMatchResult {
  matchPercentage: number
  matchedCount: number
  sourceTotal: number
  targetTotal: number
  matches: Array<{
    sourceOutcomeId: string
    targetOutcomeId: string
    sourceStatement: string
    targetStatement: string
    matchType: 'codingScheme' | 'statementMatch'
    bloomMatch: boolean
  }>
}

@Injectable()
export class CourseService {
  private readonly logger = new Logger(CourseService.name)

  constructor(
    private readonly courseRepo: CourseRepository,
    private readonly cryptoService: CryptoService,
    private readonly config: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  /**
   * List courses with pagination and filters.
   */
  async listCourses(dto: ListCoursesDto): Promise<PaginatedResponse<LISCourseTemplate>> {
    const page = dto.page ?? 1
    const limit = dto.limit ?? 20

    const cacheKey = buildCacheKey(CACHE_KEYS.COURSES_LIST, {
      faculty: dto.faculty,
      deliveryMode: dto.deliveryMode,
      credits: dto.credits,
      isActive: dto.isActive,
      page,
      limit,
    })

    const cached = await this.cacheManager.get<PaginatedResponse<LISCourseTemplate>>(cacheKey)
    if (cached) {
      this.logger.debug(`Cache HIT: ${cacheKey}`)
      return cached
    }

    const { data, total } = await this.courseRepo.findAll({
      faculty: dto.faculty,
      deliveryMode: dto.deliveryMode,
      credits: dto.credits,
      isActive: dto.isActive,
      page,
      limit,
    })

    const result: PaginatedResponse<LISCourseTemplate> = {
      data: data.map((entity) => this.toListItem(entity)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    }

    await this.cacheManager.set(cacheKey, result, CACHE_TTL.COURSES_LIST)
    return result
  }

  /**
   * Get full course detail (LIS v2.0 format) with integrity signature.
   */
  async getCourse(courseId: string): Promise<LISCourseTemplate> {
    const entity = await this.courseRepo.findByCourseId(courseId)
    if (!entity) {
      throw new UniLinkException(
        UniLinkErrorCode.COURSE_NOT_FOUND,
        404,
        `Course ${courseId} not found`,
        `ไม่พบวิชา ${courseId}`,
      )
    }

    this.assertCourseActive(entity, courseId)

    const assessments = await this.courseRepo.getAssessmentsByCourseId(courseId)

    // Build course data for response + signing
    const courseData: Record<string, unknown> = {
      courseId: entity.courseId,
      courseName: entity.courseName,
      courseNameTH: entity.courseNameTH,
      credits: entity.credits,
      courseType: entity.courseType,
      deliveryMode: entity.deliveryMode,
      org: {
        faculty: entity.faculty,
        department: entity.department,
      },
      description: entity.description,
      descriptionTH: entity.descriptionTH,
      prerequisites: entity.prerequisites,
      language: entity.language,
      isActive: entity.isActive,
    }

    if (assessments.length > 0) {
      courseData.assessments = assessments.map((a) => ({
        type: a.assessmentType,
        weight: a.weight,
        description: a.description,
      }))
    }

    // Sign course data for integrity
    const integrity = await this.signCourseData(courseData)

    return {
      ...(courseData as Omit<LISCourseTemplate, 'integrity'>),
      integrity,
    } as LISCourseTemplate
  }

  /**
   * Get learning outcomes in CASE v1.1 CFDocument format.
   * Cached for 6 hours (static per semester).
   */
  async getOutcomes(courseId: string): Promise<CASEDocument> {
    const cacheKey = `${CACHE_KEYS.COURSE_OUTCOMES}:${courseId}`

    const cached = await this.cacheManager.get<CASEDocument>(cacheKey)
    if (cached) {
      this.logger.debug(`Cache HIT: ${cacheKey}`)
      return cached
    }

    // Validate course exists
    const course = await this.courseRepo.findByCourseId(courseId)
    if (!course) {
      throw new UniLinkException(
        UniLinkErrorCode.COURSE_NOT_FOUND,
        404,
        `Course ${courseId} not found`,
        `ไม่พบวิชา ${courseId}`,
      )
    }

    this.assertCourseActive(course, courseId)

    const outcomes = await this.courseRepo.getOutcomesByCourseId(courseId)
    if (outcomes.length === 0) {
      throw new UniLinkException(
        UniLinkErrorCode.COURSE_NO_OUTCOMES,
        404,
        `No learning outcomes found for course ${courseId}`,
        `ไม่พบผลลัพธ์การเรียนรู้สำหรับวิชา ${courseId}`,
      )
    }

    const domain = this.config.get<string>('NODE_DOMAIN', 'localhost')

    // Find the latest update time
    const latestUpdate = outcomes.reduce(
      (latest, o) => (o.updatedAt > latest ? o.updatedAt : latest),
      outcomes[0].updatedAt,
    )

    const cfItems: CASELearningOutcome[] = outcomes.map((o) => ({
      identifier: o.outcomeId,
      courseId: o.courseId,
      fullStatement: o.fullStatement,
      fullStatementTH: o.fullStatementTH ?? undefined,
      humanCodingScheme: o.codingScheme ?? undefined,
      educationLevel: o.educationLevel ?? undefined,
      bloomLevel: (o.bloomLevel as BloomLevel) ?? undefined,
      sortOrder: o.sortOrder,
    }))

    const result: CASEDocument = {
      identifier: `cfdoc-${courseId}`,
      uri: `https://${domain}/unilink/api/v1/courses/${courseId}/outcomes`,
      title: `${courseId} Learning Outcomes`,
      courseId,
      lastChangeDateTime: latestUpdate.toISOString(),
      CFItems: cfItems,
    }

    await this.cacheManager.set(cacheKey, result, CACHE_TTL.COURSE_OUTCOMES)
    return result
  }

  /**
   * Get weekly syllabus for a course.
   * Cached for 6 hours (static per semester).
   */
  async getSyllabus(courseId: string): Promise<CourseSyllabus[]> {
    const cacheKey = `${CACHE_KEYS.COURSE_SYLLABUS}:${courseId}`

    const cached = await this.cacheManager.get<CourseSyllabus[]>(cacheKey)
    if (cached) {
      this.logger.debug(`Cache HIT: ${cacheKey}`)
      return cached
    }

    // Validate course exists
    const course = await this.courseRepo.findByCourseId(courseId)
    if (!course) {
      throw new UniLinkException(
        UniLinkErrorCode.COURSE_NOT_FOUND,
        404,
        `Course ${courseId} not found`,
        `ไม่พบวิชา ${courseId}`,
      )
    }

    this.assertCourseActive(course, courseId)

    const syllabus = await this.courseRepo.getSyllabusByCourseId(courseId)

    const result = syllabus.map((s) => ({
      courseId: s.courseId,
      week: s.week,
      topic: s.topic,
      topicTH: s.topicTH ?? undefined,
      description: s.description ?? undefined,
      resources: s.resources ?? undefined,
    }))

    await this.cacheManager.set(cacheKey, result, CACHE_TTL.COURSE_SYLLABUS)
    return result
  }

  /**
   * Search courses by keyword.
   */
  async searchCourses(dto: SearchCoursesDto): Promise<PaginatedResponse<LISCourseTemplate>> {
    const page = dto.page ?? 1
    const limit = dto.limit ?? 20

    const cacheKey = buildCacheKey(CACHE_KEYS.COURSES_SEARCH, {
      q: dto.q,
      faculty: dto.faculty,
      credits: dto.credits,
      page,
      limit,
    })

    const cached = await this.cacheManager.get<PaginatedResponse<LISCourseTemplate>>(cacheKey)
    if (cached) {
      this.logger.debug(`Cache HIT: ${cacheKey}`)
      return cached
    }

    const { data, total } = await this.courseRepo.search(dto.q, {
      faculty: dto.faculty,
      credits: dto.credits,
      page,
      limit,
    })

    const result: PaginatedResponse<LISCourseTemplate> = {
      data: data.map((entity) => this.toListItem(entity)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    }

    await this.cacheManager.set(cacheKey, result, CACHE_TTL.COURSES_SEARCH)
    return result
  }

  /**
   * Verify course data integrity.
   * Re-hashes the course data and verifies the Ed25519 signature.
   */
  async verifyCourseIntegrity(dto: VerifyCourseIntegrityDto): Promise<{
    isValid: boolean
    verifiedAt: string
    error?: string
  }> {
    const { courseData, integrity } = dto
    const verifiedAt = new Date().toISOString()

    // 1. Re-hash the course data and compare
    const canonical = canonicalize(courseData)
    const computedHash = sha256Hex(canonical)

    if (`sha256:${computedHash}` !== integrity.hash) {
      return { isValid: false, verifiedAt, error: 'Hash mismatch — course data has been tampered with' }
    }

    // 2. Resolve public key and verify signature
    const signingKeyDid = integrity.signingKey.split('#')[0]
    const domain = this.config.get<string>('NODE_DOMAIN', 'localhost')
    const ownDid = `did:web:${domain}`

    try {
      let isValid: boolean

      if (signingKeyDid === ownDid) {
        // Own node: verify via Vault
        isValid = await this.cryptoService.verify(computedHash, integrity.signature)
      } else {
        // Other node: resolve DID → fetch public key → verify with verifyRaw
        const publicKeyMultibase = await this.resolveSigningKey(integrity.signingKey)
        isValid = await verifyRaw(computedHash, integrity.signature, publicKeyMultibase)
      }

      if (!isValid) {
        return { isValid: false, verifiedAt, error: 'Signature verification failed' }
      }

      return { isValid: true, verifiedAt }
    } catch (error) {
      throw new UniLinkException(
        UniLinkErrorCode.COURSE_INTEGRITY_FAILED,
        400,
        `Integrity verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        `การตรวจสอบความสมบูรณ์ล้มเหลว`,
      )
    }
  }

  /**
   * Calculate Learning Outcome match percentage between source and target courses.
   * Used for credit transfer compatibility assessment.
   *
   * Optimized: Uses Set-based word lookup instead of O(n*m) array.filter().includes()
   * and fetches both outcome lists in parallel via Promise.all.
   */
  async calculateLOMatch(
    sourceCourseId: string,
    targetCourseId: string,
  ): Promise<LOMatchResult> {
    // 1. Fetch outcomes for both courses IN PARALLEL (fix N+1 sequential pattern)
    const [sourceOutcomes, targetOutcomes] = await Promise.all([
      this.courseRepo.getOutcomesByCourseId(sourceCourseId),
      this.courseRepo.getOutcomesByCourseId(targetCourseId),
    ])

    if (sourceOutcomes.length === 0) {
      throw new UniLinkException(
        UniLinkErrorCode.COURSE_NO_OUTCOMES,
        404,
        `No learning outcomes found for source course ${sourceCourseId}`,
        `ไม่พบผลลัพธ์การเรียนรู้สำหรับวิชาต้นทาง ${sourceCourseId}`,
      )
    }

    if (targetOutcomes.length === 0) {
      throw new UniLinkException(
        UniLinkErrorCode.COURSE_NO_OUTCOMES,
        404,
        `No learning outcomes found for target course ${targetCourseId}`,
        `ไม่พบผลลัพธ์การเรียนรู้สำหรับวิชาปลายทาง ${targetCourseId}`,
      )
    }

    // 2. Pre-compute word sets for source outcomes (O(n) once, instead of O(n*m))
    const sourceWordSets = new Map<string, Set<string>>()
    for (const source of sourceOutcomes) {
      sourceWordSets.set(
        source.outcomeId,
        new Set(source.fullStatement.toLowerCase().split(/\s+/)),
      )
    }

    // 3. For each target outcome, find best matching source outcome
    const matches: LOMatchResult['matches'] = []
    const usedSourceIds = new Set<string>()

    for (const target of targetOutcomes) {
      let bestMatch: (typeof sourceOutcomes)[0] | null = null
      let matchType: 'codingScheme' | 'statementMatch' = 'statementMatch'

      // Priority 1: Exact humanCodingScheme match
      if (target.codingScheme) {
        const schemeMatch = sourceOutcomes.find(
          (s) => s.codingScheme === target.codingScheme && !usedSourceIds.has(s.outcomeId),
        )
        if (schemeMatch) {
          bestMatch = schemeMatch
          matchType = 'codingScheme'
        }
      }

      // Priority 2: Word overlap >= 50% in fullStatement (optimized with Set)
      if (!bestMatch) {
        const targetWords = target.fullStatement.toLowerCase().split(/\s+/)
        const targetWordCount = Math.max(targetWords.length, 1)
        let bestScore = 0

        for (const source of sourceOutcomes) {
          if (usedSourceIds.has(source.outcomeId)) continue

          const sourceWordSet = sourceWordSets.get(source.outcomeId)!
          let commonCount = 0
          for (const word of targetWords) {
            if (sourceWordSet.has(word)) {
              commonCount++
            }
          }
          const score = commonCount / targetWordCount

          if (score > bestScore && score >= 0.5) {
            bestScore = score
            bestMatch = source
          }
        }
      }

      if (bestMatch) {
        usedSourceIds.add(bestMatch.outcomeId)
        matches.push({
          sourceOutcomeId: bestMatch.outcomeId,
          targetOutcomeId: target.outcomeId,
          sourceStatement: bestMatch.fullStatement,
          targetStatement: target.fullStatement,
          matchType,
          bloomMatch: bestMatch.bloomLevel === target.bloomLevel,
        })
      }
    }

    const matchedCount = matches.length
    const targetTotal = targetOutcomes.length
    const matchPercentage = Math.round((matchedCount / targetTotal) * 100)

    return {
      matchPercentage,
      matchedCount,
      sourceTotal: sourceOutcomes.length,
      targetTotal,
      matches,
    }
  }

  /**
   * Get course in Schema.org/Course format for external interoperability.
   * Cached for 24 hours (external API format, very stable data).
   */
  async getSchemaOrg(courseId: string): Promise<SchemaOrgCourse> {
    const cacheKey = `${CACHE_KEYS.COURSE_SCHEMA_ORG}:${courseId}`

    const cached = await this.cacheManager.get<SchemaOrgCourse>(cacheKey)
    if (cached) {
      this.logger.debug(`Cache HIT: ${cacheKey}`)
      return cached
    }

    const entity = await this.courseRepo.findByCourseId(courseId)
    if (!entity) {
      throw new UniLinkException(
        UniLinkErrorCode.COURSE_NOT_FOUND,
        404,
        `Course ${courseId} not found`,
        `ไม่พบวิชา ${courseId}`,
      )
    }

    this.assertCourseActive(entity, courseId)

    const domain = this.config.get<string>('NODE_DOMAIN', 'localhost')

    const result: SchemaOrgCourse = {
      '@context': 'https://schema.org',
      '@type': 'Course',
      name: entity.courseName,
      description: entity.description ?? undefined,
      provider: {
        '@type': 'Organization',
        name: domain,
        url: `https://${domain}`,
      },
      numberOfCredits: entity.credits,
      educationalLevel: 'undergraduate',
      inLanguage: entity.language ?? 'th',
    }

    await this.cacheManager.set(cacheKey, result, CACHE_TTL.COURSE_SCHEMA_ORG)
    return result
  }

  /**
   * Invalidate all course-related caches.
   * Called when SIS webhook updates course data.
   */
  async invalidateCourseCache(): Promise<void> {
    await this.cacheManager.reset()
    this.logger.log('Course cache invalidated')
  }

  // ─── Private Helpers ────────────────────────────────────

  /**
   * Guard: throw COURSE_INACTIVE if course is deactivated.
   */
  private assertCourseActive(course: CourseEntity, courseId: string): void {
    if (!course.isActive) {
      throw new UniLinkException(
        UniLinkErrorCode.COURSE_INACTIVE,
        404,
        `Course ${courseId} is inactive`,
        `วิชา ${courseId} ถูกปิดใช้งานแล้ว`,
      )
    }
  }

  /**
   * Convert entity to list item (without integrity signing for performance).
   */
  private toListItem(entity: CourseEntity): LISCourseTemplate {
    return {
      courseId: entity.courseId,
      courseName: entity.courseName,
      courseNameTH: entity.courseNameTH ?? undefined,
      credits: entity.credits,
      courseType: entity.courseType ?? undefined,
      deliveryMode: (entity.deliveryMode as 'Onsite' | 'Online' | 'Hybrid') ?? undefined,
      org: {
        faculty: entity.faculty ?? undefined,
        department: entity.department ?? undefined,
      },
      description: entity.description ?? undefined,
      descriptionTH: entity.descriptionTH ?? undefined,
      prerequisites: entity.prerequisites ?? undefined,
      language: entity.language ?? undefined,
      isActive: entity.isActive,
    }
  }

  /**
   * Sign course data for integrity verification.
   * Uses SHA-256 hash + Ed25519 signature via Vault.
   */
  private async signCourseData(
    courseData: Record<string, unknown>,
  ): Promise<CourseIntegrity> {
    const canonical = canonicalize(courseData)
    const hash = sha256Hex(canonical)
    const signature = await this.cryptoService.sign(hash)
    const domain = this.config.get<string>('NODE_DOMAIN', 'localhost')

    return {
      hash: `sha256:${hash}`,
      signature,
      signingKey: `did:web:${domain}#key-1`,
    }
  }

  /**
   * Resolve a signing key DID to its public key multibase.
   * Fetches DID Document via HTTPS (did:web method).
   */
  private async resolveSigningKey(verificationMethodId: string): Promise<string> {
    const did = verificationMethodId.split('#')[0]
    const url = didWebToUrl(did)

    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`DID document fetch failed with status ${response.status}: ${url}`)
    }

    const didDoc = (await response.json()) as DIDDocument
    const vm = didDoc.verificationMethod.find(
      (v) => v.id === verificationMethodId,
    )

    if (!vm) {
      throw new Error(`Verification method ${verificationMethodId} not found in DID document`)
    }

    return vm.publicKeyMultibase
  }
}
