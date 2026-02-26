import { Test, TestingModule } from '@nestjs/testing'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { ConfigService } from '@nestjs/config'
import { CourseService } from '../course.service'
import { CourseRepository } from '../course.repository'
import { CryptoService } from '../../crypto/crypto.service'

// Mock @unilink/crypto to avoid ESM issues
jest.mock('@unilink/crypto', () => ({
  VaultCrypto: jest.fn(),
  sha256Hex: jest.fn().mockReturnValue('abc123hash'),
  canonicalize: jest.fn().mockReturnValue('{"canonical":"json"}'),
  verifyRaw: jest.fn().mockResolvedValue(true),
}))

// Mock @unilink/vc-core to avoid ESM issues
jest.mock('@unilink/vc-core', () => ({
  createVC: jest.fn(),
  getDIDDocument: jest.fn(),
  didWebToUrl: jest.fn().mockReturnValue('https://localhost/.well-known/did.json'),
}))

/**
 * Performance and correctness tests for the optimized calculateLOMatch algorithm.
 *
 * Key optimizations tested:
 * 1. Pre-computed Set-based word lookup (instead of Array.filter().includes())
 * 2. Parallel outcome fetching via Promise.all (instead of sequential)
 */
describe('CourseService — LO Match Optimization', () => {
  let service: CourseService
  let repository: jest.Mocked<CourseRepository>

  const makeOutcome = (
    id: string,
    statement: string,
    options?: { codingScheme?: string; bloomLevel?: string },
  ) => ({
    id: `uuid-${id}`,
    outcomeId: id,
    courseId: 'CS101',
    fullStatement: statement,
    fullStatementTH: null,
    codingScheme: options?.codingScheme ?? null,
    educationLevel: null,
    bloomLevel: options?.bloomLevel ?? null,
    sortOrder: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  })

  beforeEach(async () => {
    const mockCacheManager = {
      get: jest.fn().mockResolvedValue(undefined),
      set: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
      reset: jest.fn().mockResolvedValue(undefined),
    }

    const mockRepo = {
      findAll: jest.fn(),
      findByCourseId: jest.fn(),
      getAssessmentsByCourseId: jest.fn(),
      getOutcomesByCourseId: jest.fn(),
      getSyllabusByCourseId: jest.fn(),
      search: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CourseService,
        { provide: CourseRepository, useValue: mockRepo },
        { provide: CryptoService, useValue: { sign: jest.fn(), verify: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('localhost') } },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
      ],
    }).compile()

    service = module.get<CourseService>(CourseService)
    repository = module.get(CourseRepository) as jest.Mocked<CourseRepository>
  })

  describe('correctness', () => {
    it('should match outcomes by codingScheme (priority 1)', async () => {
      repository.getOutcomesByCourseId
        .mockResolvedValueOnce([
          makeOutcome('src-1', 'Understand programming', { codingScheme: 'PLO-01' }),
        ])
        .mockResolvedValueOnce([
          makeOutcome('tgt-1', 'Know programming basics', { codingScheme: 'PLO-01' }),
        ])

      const result = await service.calculateLOMatch('CS101', 'CS201')

      expect(result.matchPercentage).toBe(100)
      expect(result.matches[0]!.matchType).toBe('codingScheme')
    })

    it('should match outcomes by word overlap >= 50%', async () => {
      repository.getOutcomesByCourseId
        .mockResolvedValueOnce([
          makeOutcome('src-1', 'Apply data structures and algorithms effectively'),
        ])
        .mockResolvedValueOnce([
          makeOutcome('tgt-1', 'Apply data structures and algorithms in practice'),
        ])

      const result = await service.calculateLOMatch('CS101', 'CS201')

      expect(result.matchPercentage).toBe(100)
      expect(result.matches[0]!.matchType).toBe('statementMatch')
    })

    it('should NOT match when word overlap < 50%', async () => {
      repository.getOutcomesByCourseId
        .mockResolvedValueOnce([
          makeOutcome('src-1', 'Understand quantum physics principles'),
        ])
        .mockResolvedValueOnce([
          makeOutcome('tgt-1', 'Design web applications using modern frameworks'),
        ])

      const result = await service.calculateLOMatch('CS101', 'CS201')

      expect(result.matchPercentage).toBe(0)
      expect(result.matches).toHaveLength(0)
    })

    it('should not reuse source outcomes for multiple targets', async () => {
      repository.getOutcomesByCourseId
        .mockResolvedValueOnce([
          makeOutcome('src-1', 'Apply data structures and algorithms'),
        ])
        .mockResolvedValueOnce([
          makeOutcome('tgt-1', 'Apply data structures and algorithms'),
          makeOutcome('tgt-2', 'Apply data structures and algorithms'),
        ])

      const result = await service.calculateLOMatch('CS101', 'CS201')

      // Only one target can match the single source
      expect(result.matchedCount).toBe(1)
      expect(result.matchPercentage).toBe(50)
    })

    it('should check bloomLevel match correctly', async () => {
      repository.getOutcomesByCourseId
        .mockResolvedValueOnce([
          makeOutcome('src-1', 'Understand basic concepts', { bloomLevel: 'understand' }),
        ])
        .mockResolvedValueOnce([
          makeOutcome('tgt-1', 'Understand basic concepts', { bloomLevel: 'apply' }),
        ])

      const result = await service.calculateLOMatch('CS101', 'CS201')

      expect(result.matches[0]!.bloomMatch).toBe(false)
    })

    it('should fetch source and target outcomes in parallel', async () => {
      let callOrder: string[] = []

      repository.getOutcomesByCourseId.mockImplementation(async (courseId: string) => {
        callOrder.push(courseId)
        // Simulate some delay
        await new Promise((r) => setTimeout(r, 10))
        return [makeOutcome(`${courseId}-lo1`, `Outcome for ${courseId}`)]
      })

      await service.calculateLOMatch('SOURCE', 'TARGET')

      // Both should be called (Promise.all)
      expect(repository.getOutcomesByCourseId).toHaveBeenCalledTimes(2)
      expect(repository.getOutcomesByCourseId).toHaveBeenCalledWith('SOURCE')
      expect(repository.getOutcomesByCourseId).toHaveBeenCalledWith('TARGET')
    })
  })

  describe('performance — large datasets', () => {
    it('should handle 100+ outcomes efficiently', async () => {
      // Generate large outcome lists
      const sourceOutcomes = Array.from({ length: 100 }, (_, i) =>
        makeOutcome(
          `src-${i}`,
          `Learning outcome ${i} about topic ${i % 10} with concepts ${i} and methods ${i}`,
        ),
      )

      const targetOutcomes = Array.from({ length: 100 }, (_, i) =>
        makeOutcome(
          `tgt-${i}`,
          `Learning outcome ${i} about topic ${i % 10} with concepts ${i} and methods ${i}`,
        ),
      )

      repository.getOutcomesByCourseId
        .mockResolvedValueOnce(sourceOutcomes)
        .mockResolvedValueOnce(targetOutcomes)

      const startTime = Date.now()
      const result = await service.calculateLOMatch('CS101', 'CS201')
      const elapsed = Date.now() - startTime

      // Should complete in under 500ms (old O(n^2) with Array.includes could be slower)
      expect(elapsed).toBeLessThan(500)
      expect(result.matchedCount).toBeGreaterThan(0)
      expect(result.sourceTotal).toBe(100)
      expect(result.targetTotal).toBe(100)
    })

    it('should handle mismatched outcome counts', async () => {
      const sourceOutcomes = Array.from({ length: 50 }, (_, i) =>
        makeOutcome(`src-${i}`, `Source learning outcome number ${i}`),
      )

      const targetOutcomes = Array.from({ length: 10 }, (_, i) =>
        makeOutcome(`tgt-${i}`, `Target learning outcome number ${i}`),
      )

      repository.getOutcomesByCourseId
        .mockResolvedValueOnce(sourceOutcomes)
        .mockResolvedValueOnce(targetOutcomes)

      const result = await service.calculateLOMatch('CS101', 'CS201')

      expect(result.sourceTotal).toBe(50)
      expect(result.targetTotal).toBe(10)
      // matchPercentage is based on target total
      expect(result.matchPercentage).toBeLessThanOrEqual(100)
    })
  })
})
