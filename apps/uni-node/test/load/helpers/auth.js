/**
 * Auth helpers for k6 load tests
 * Uses pre-generated JWT from TEST_JWT env variable
 */

/**
 * Get test JWT token from environment
 * @returns {string} JWT token
 */
export function getTestToken() {
  const token = __ENV.TEST_JWT
  if (!token) {
    throw new Error(
      'TEST_JWT environment variable is required. Generate with: node scripts/generate-test-jwt.js --role node_admin',
    )
  }
  return token
}

/**
 * Get authorization headers with Bearer token
 * @returns {object} Headers with Authorization
 */
export function getAuthHeaders() {
  return {
    Authorization: `Bearer ${getTestToken()}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }
}
