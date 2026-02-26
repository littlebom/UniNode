import http from 'k6/http'
import { check, sleep } from 'k6'
import { ROOT_URL, defaultHeaders } from '../config.js'

/**
 * Health check scenario
 * Tests: GET /health, GET /health/ready
 */
export function healthCheck() {
  // Liveness
  const liveness = http.get(`${ROOT_URL}/health`, {
    headers: defaultHeaders,
    tags: { name: 'GET /health' },
  })

  check(liveness, {
    'health: status 200': (r) => r.status === 200,
    'health: status ok': (r) => {
      try {
        const body = JSON.parse(r.body)
        return body.status === 'ok'
      } catch {
        return false
      }
    },
  })

  // Readiness
  const readiness = http.get(`${ROOT_URL}/health/ready`, {
    headers: defaultHeaders,
    tags: { name: 'GET /health/ready' },
  })

  check(readiness, {
    'health/ready: status 200': (r) => r.status === 200,
  })

  sleep(0.5)
}
