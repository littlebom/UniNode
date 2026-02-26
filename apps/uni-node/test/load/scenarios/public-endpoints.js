import http from 'k6/http'
import { check, sleep } from 'k6'
import { ROOT_URL, defaultHeaders } from '../config.js'
import { randomItem, statusListIds } from '../helpers/data.js'

/**
 * Public endpoints scenario — tests cached responses
 * Tests: GET /.well-known/did.json, GET /.well-known/status-list/:id
 */
export function publicEndpoints() {
  // ── DID Document (cached 300s) ──
  const didRes = http.get(`${ROOT_URL}/.well-known/did.json`, {
    headers: defaultHeaders,
    tags: { name: 'GET /.well-known/did.json' },
  })

  check(didRes, {
    'did.json: status 200': (r) => r.status === 200,
    'did.json: has @context': (r) => {
      try {
        const body = JSON.parse(r.body)
        return body['@context'] !== undefined || body.data?.['@context'] !== undefined
      } catch {
        return false
      }
    },
  })

  // ── Status List (cached 60s) ──
  const statusListId = randomItem(statusListIds)
  const statusRes = http.get(
    `${ROOT_URL}/.well-known/status-list/${statusListId}`,
    {
      headers: defaultHeaders,
      tags: { name: 'GET /.well-known/status-list/:id' },
    },
  )

  check(statusRes, {
    'status-list: status 200 or 404': (r) =>
      r.status === 200 || r.status === 404,
  })

  sleep(0.5)
}
