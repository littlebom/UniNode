import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { v4 as uuidv4 } from 'uuid'
import { VCRepository } from './vc.repository'
import { StatusListService } from './status-list.service'
import { CryptoService } from '../crypto/crypto.service'
import { StudentService } from '../student/student.service'
import { CourseService } from '../course/course.service'
import { IssueVcDto } from './dto/issue-vc.dto'
import { createVC, verifyVC, verifyVP, isRevoked, didWebToUrl } from '@unilink/vc-core'
import type { DIDDocument, VPVerifyResult } from '@unilink/vc-core'
import { verifyRaw } from '@unilink/crypto'
import { UniLinkException, UniLinkErrorCode } from '@unilink/dto'
import type { VerifiableCredential, VerifiablePresentation, StatusListCredential } from '@unilink/dto'
import type { IssuedVcEntity } from './issued-vc.entity'

interface ChallengeEntry {
  domain: string
  expiresAt: number
}

const CHALLENGE_TTL_MS = 5 * 60 * 1000 // 5 minutes

@Injectable()
export class VCService {
  private readonly logger = new Logger(VCService.name)
  private readonly challenges = new Map<string, ChallengeEntry>()

  constructor(
    private readonly vcRepo: VCRepository,
    private readonly statusListService: StatusListService,
    private readonly cryptoService: CryptoService,
    private readonly studentService: StudentService,
    private readonly courseService: CourseService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Issue a new Verifiable Credential for a student's course completion.
   */
  async issueVC(
    dto: IssueVcDto,
    options?: { vcIdOverride?: string },
  ): Promise<{
    vcId: string
    status: string
    vc: VerifiableCredential
  }> {
    // 1. Validate student exists
    const student = await this.studentService.findByStudentId(dto.studentId)

    const domain = this.config.get<string>('NODE_DOMAIN', 'localhost')
    const nodeId = this.config.get<string>('NODE_ID', domain)
    const issuerDID = `did:web:${domain}`

    // 2. Build VC ID (or use override for grade.updated re-issue)
    const vcId = options?.vcIdOverride
      ?? `vc-${nodeId.replace(/\./g, '-')}-${dto.courseId.toLowerCase()}-${dto.studentId}-${dto.academicYear}-${dto.semester}`

    // 3. Check if VC already exists
    const existing = await this.vcRepo.existsByVcId(vcId)
    if (existing) {
      throw new UniLinkException(
        UniLinkErrorCode.VC_ISSUE_FAILED,
        409,
        `VC ${vcId} already exists`,
        `VC ${vcId} ถูกออกไปแล้ว`,
      )
    }

    // 4. Allocate status list index
    const { index, statusListUrl } = await this.statusListService.allocateIndex()

    // 5. Lookup course data for enriched credentialSubject
    const subjectDID = student.did ?? `did:web:${domain}:students:${dto.studentId}`
    let courseName: string = dto.courseId
    let courseNameTH: string | undefined
    let credits = 3

    try {
      const course = await this.courseService.getCourse(dto.courseId)
      courseName = course.courseName
      courseNameTH = course.courseNameTH
      credits = course.credits
    } catch (error) {
      this.logger.warn(
        `Course ${dto.courseId} not found or inactive, using fallback values: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      )
    }

    const credentialSubject: Record<string, unknown> = {
      studentId: dto.studentId,
      studentName: dto.studentId, // Placeholder — SIS will provide real name in future sprint
      courseId: dto.courseId,
      courseName,
      courseNameTH,
      credits,
      grade: dto.grade,
      gradePoint: dto.gradePoint,
      semester: dto.semester,
      academicYear: dto.academicYear,
      deliveryMode: dto.deliveryMode ?? 'Onsite',
      institution: domain,
      institutionDID: issuerDID,
    }

    // 6. Create and sign VC
    const vcType = dto.vcType ?? 'CourseCreditCredential'
    let vc: VerifiableCredential
    try {
      vc = await createVC({
        type: ['VerifiableCredential', vcType],
        issuerDID,
        subjectDID,
        credentialSubject,
        vcId,
        statusListIndex: index,
        statusListUrl,
        signFn: async (data: string) => this.cryptoService.sign(data),
        verificationMethod: `${issuerDID}#key-1`,
      })
    } catch (error) {
      this.logger.error(
        `Failed to sign VC ${vcId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
      throw new UniLinkException(
        UniLinkErrorCode.VC_ISSUE_FAILED,
        500,
        `Failed to issue VC: signing error`,
        `ไม่สามารถออก VC ได้: การ sign ล้มเหลว`,
      )
    }

    // 7. Save to DB
    await this.vcRepo.create({
      vcId,
      studentId: dto.studentId,
      vcType,
      courseId: dto.courseId,
      vcDocument: vc as unknown as Record<string, unknown>,
      statusIndex: index,
      status: 'active',
      issuedAt: new Date(),
    })

    this.logger.log(`VC issued: ${vcId} for student ${dto.studentId}`)

    return { vcId, status: 'issued', vc }
  }

  /**
   * Find all VCs for a student with pagination and optional status filter.
   */
  async findByStudentId(
    studentId: string,
    options?: { page?: number; limit?: number; status?: string },
  ): Promise<{ data: IssuedVcEntity[]; total: number }> {
    // Validate student exists
    await this.studentService.findByStudentId(studentId)

    return this.vcRepo.findByStudentId(studentId, options)
  }

  /**
   * Get a VC by its ID.
   */
  async getVC(vcId: string): Promise<{
    vcId: string
    status: string
    vc: Record<string, unknown>
    issuedAt: Date | null
    revokedAt: Date | null
  }> {
    const entity = await this.vcRepo.findByVcId(vcId)
    if (!entity) {
      throw new UniLinkException(
        UniLinkErrorCode.VC_NOT_FOUND,
        404,
        `VC ${vcId} not found`,
        `ไม่พบ VC ${vcId}`,
      )
    }

    return {
      vcId: entity.vcId,
      status: entity.status,
      vc: entity.vcDocument,
      issuedAt: entity.issuedAt,
      revokedAt: entity.revokedAt,
    }
  }

  /**
   * Revoke a VC by its ID.
   */
  async revokeVC(vcId: string, reason: string): Promise<{
    vcId: string
    status: string
  }> {
    const entity = await this.vcRepo.findByVcId(vcId)
    if (!entity) {
      throw new UniLinkException(
        UniLinkErrorCode.VC_NOT_FOUND,
        404,
        `VC ${vcId} not found`,
        `ไม่พบ VC ${vcId}`,
      )
    }

    if (entity.status === 'revoked') {
      throw new UniLinkException(
        UniLinkErrorCode.VC_ALREADY_REVOKED,
        409,
        `VC ${vcId} is already revoked`,
        `VC ${vcId} ถูกยกเลิกไปแล้ว`,
      )
    }

    // Update status list bitstring
    if (entity.statusIndex !== null) {
      await this.statusListService.revokeAtIndex(
        '1', // Default status list
        entity.statusIndex,
      )
    }

    // Update DB status
    await this.vcRepo.updateStatus(vcId, 'revoked', reason)

    this.logger.log(`VC revoked: ${vcId} — reason: ${reason}`)

    return { vcId, status: 'revoked' }
  }

  /**
   * Generate a challenge for VP verification.
   * Challenge is stored in-memory with 5-minute TTL.
   */
  generateChallenge(domain: string): {
    challenge: string
    expiresAt: string
  } {
    // Cleanup expired challenges
    this.cleanupExpiredChallenges()

    const challenge = uuidv4()
    const expiresAt = Date.now() + CHALLENGE_TTL_MS

    this.challenges.set(challenge, { domain, expiresAt })

    this.logger.debug(`Challenge generated for domain ${domain}: ${challenge}`)

    return {
      challenge,
      expiresAt: new Date(expiresAt).toISOString(),
    }
  }

  /**
   * Validate a challenge exists and is not expired.
   * Used during VP verification (Sprint 7-8).
   */
  validateChallenge(challenge: string, domain: string): boolean {
    const entry = this.challenges.get(challenge)
    if (!entry) return false

    if (Date.now() > entry.expiresAt) {
      this.challenges.delete(challenge)
      return false
    }

    if (entry.domain !== domain) return false

    // Consume the challenge (one-time use)
    this.challenges.delete(challenge)
    return true
  }

  /**
   * Verify a Verifiable Presentation (VP).
   *
   * 1. Validates challenge is valid and not expired
   * 2. Verifies VP holder signature (resolves holder DID → public key)
   * 3. Verifies each embedded VC (signature + dates + revocation)
   *
   * @param vp - The VP to verify
   * @param challenge - Challenge from POST /vc/challenge
   * @param domain - Verifier's domain
   * @returns VP verification result
   */
  async verifyPresentation(
    vp: VerifiablePresentation,
    challenge: string,
    domain: string,
  ): Promise<VPVerifyResult> {
    // 1. Validate challenge
    const challengeValid = this.validateChallenge(challenge, domain)
    if (!challengeValid) {
      throw new UniLinkException(
        UniLinkErrorCode.VP_CHALLENGE_EXPIRED,
        400,
        'Challenge is invalid, expired, or already used',
        'Challenge ไม่ถูกต้อง หมดอายุ หรือถูกใช้ไปแล้ว',
      )
    }

    // 2. Verify VP using vc-core
    const result = await verifyVP(vp, {
      challenge,
      domain,
      verifyHolderFn: async (
        data: string,
        signature: string,
        verificationMethod: string,
      ): Promise<boolean> => {
        const pubKey = await this.resolvePublicKey(verificationMethod)
        return verifyRaw(data, signature, pubKey)
      },
      verifyVcFn: async (vc: VerifiableCredential) => {
        return verifyVC(vc, {
          verifyFn: verifyRaw,
          resolveIssuerKeyFn: async (
            _issuerDID: string,
            verificationMethod: string,
          ): Promise<string> => {
            return this.resolvePublicKey(verificationMethod)
          },
          checkRevocationFn: async (vcToCheck: VerifiableCredential): Promise<boolean> => {
            return isRevoked(vcToCheck, async (url: string) => {
              return this.fetchStatusList(url)
            })
          },
        })
      },
    })

    this.logger.log(
      `VP verified: holder=${result.holder}, isValid=${result.isValid}, credentials=${result.credentials.length}`,
    )

    return result
  }

  /**
   * Resolve a verification method ID to its public key multibase.
   * Fetches the DID Document via HTTPS (did:web method).
   *
   * @param verificationMethodId - e.g. 'did:web:tu.ac.th#key-1'
   * @returns Public key in multibase format (z + base64)
   */
  async resolvePublicKey(verificationMethodId: string): Promise<string> {
    const did = verificationMethodId.split('#')[0]
    const url = didWebToUrl(did)

    let response: Response
    try {
      response = await fetch(url)
    } catch (error) {
      throw new UniLinkException(
        UniLinkErrorCode.VC_ISSUER_UNKNOWN,
        502,
        `Failed to fetch DID document from ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        `ไม่สามารถดึง DID document จาก ${url} ได้`,
      )
    }

    if (!response.ok) {
      throw new UniLinkException(
        UniLinkErrorCode.VC_ISSUER_UNKNOWN,
        502,
        `DID document fetch failed with status ${response.status}: ${url}`,
        `การดึง DID document ล้มเหลว (status ${response.status})`,
      )
    }

    const didDoc = (await response.json()) as DIDDocument
    const vm = didDoc.verificationMethod.find(
      (v) => v.id === verificationMethodId,
    )

    if (!vm) {
      throw new UniLinkException(
        UniLinkErrorCode.VC_SIGNATURE_INVALID,
        400,
        `Verification method ${verificationMethodId} not found in DID document`,
        `ไม่พบ verification method ${verificationMethodId} ใน DID document`,
      )
    }

    return vm.publicKeyMultibase
  }

  /**
   * Fetch a StatusListCredential from a URL.
   * Used during VC revocation checking.
   *
   * @param url - Status list credential URL
   * @returns The fetched StatusListCredential
   */
  async fetchStatusList(url: string): Promise<StatusListCredential> {
    let response: Response
    try {
      response = await fetch(url)
    } catch (error) {
      throw new UniLinkException(
        UniLinkErrorCode.SERVICE_UNAVAILABLE,
        502,
        `Failed to fetch status list from ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        `ไม่สามารถดึง status list จาก ${url} ได้`,
      )
    }

    if (!response.ok) {
      throw new UniLinkException(
        UniLinkErrorCode.SERVICE_UNAVAILABLE,
        502,
        `Status list fetch failed with status ${response.status}: ${url}`,
        `การดึง status list ล้มเหลว (status ${response.status})`,
      )
    }

    return (await response.json()) as StatusListCredential
  }

  private cleanupExpiredChallenges(): void {
    const now = Date.now()
    for (const [key, entry] of this.challenges.entries()) {
      if (now > entry.expiresAt) {
        this.challenges.delete(key)
      }
    }
  }
}
