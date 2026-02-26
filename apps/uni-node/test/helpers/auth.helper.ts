// eslint-disable-next-line @typescript-eslint/no-var-requires
const jwt = require('jsonwebtoken')

/**
 * JWT payload matching JwtStrategy's JwtPayload interface
 */
export interface TestJwtPayload {
  sub: string
  studentId?: string
  nodeId?: string
  role?: string
}

/** Must match the JWT_SECRET used in test env validation */
export const TEST_JWT_SECRET =
  'test-jwt-secret-that-is-at-least-64-characters-long-for-env-validation-check'

const DEFAULT_PAYLOAD: TestJwtPayload = {
  sub: 'did:web:tu.ac.th:staff:admin-001',
  role: 'node_admin',
  nodeId: 'tu.ac.th',
}

/**
 * Generate a valid JWT token for integration tests
 */
export function generateTestJwt(
  overrides?: Partial<TestJwtPayload>,
  options?: { expiresIn?: string | number },
): string {
  const payload = { ...DEFAULT_PAYLOAD, ...overrides }
  return jwt.sign(payload, TEST_JWT_SECRET, {
    expiresIn: options?.expiresIn ?? '1h',
  }) as string
}

/**
 * Generate an expired JWT for testing 401 responses
 */
export function generateExpiredJwt(
  overrides?: Partial<TestJwtPayload>,
): string {
  const payload = { ...DEFAULT_PAYLOAD, ...overrides }
  // Sign with iat in the past and very short expiry
  const now = Math.floor(Date.now() / 1000)
  return jwt.sign(
    { ...payload, iat: now - 3600, exp: now - 1 },
    TEST_JWT_SECRET,
  ) as string
}

/**
 * Generate a JWT signed with a wrong secret
 */
export function generateInvalidJwt(
  overrides?: Partial<TestJwtPayload>,
): string {
  const payload = { ...DEFAULT_PAYLOAD, ...overrides }
  return jwt.sign(payload, 'wrong-secret-key-that-does-not-match') as string
}

/**
 * Pre-built tokens for common roles
 */
export const TOKENS = {
  get admin(): string {
    return generateTestJwt({ role: 'node_admin' })
  },
  get registrar(): string {
    return generateTestJwt({
      sub: 'did:web:tu.ac.th:staff:registrar-001',
      role: 'registrar',
    })
  },
  get student(): string {
    return generateTestJwt({
      sub: 'did:web:tu.ac.th:students:6401001',
      studentId: '6401001',
      role: 'student',
    })
  },
  get noRole(): string {
    return generateTestJwt({ role: undefined })
  },
  get expired(): string {
    return generateExpiredJwt()
  },
  get invalid(): string {
    return generateInvalidJwt()
  },
}
