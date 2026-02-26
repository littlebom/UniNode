/**
 * k6 Load Test: Course Catalog API
 *
 * Tests: GET /courses, GET /courses/:id, GET /courses/search
 * Target: p95 < 1000ms, error rate < 1%
 *
 * Run: k6 run --env BASE_URL=http://localhost:3000 --env TEST_JWT=<token> test/load/course-catalog.k6.js
 */
import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate, Trend } from 'k6/metrics'
import { BASE_URL, fullLoadOptions } from './config.js'
import { getAuthHeaders } from './helpers/auth.js'
import { courseIds, searchTerms, randomItem, randomPage } from './helpers/data.js'

// ── Custom Metrics ──
const errorRate = new Rate('errors')
const listLatency = new Trend('list_latency', true)
const detailLatency = new Trend('detail_latency', true)
const searchLatency = new Trend('search_latency', true)

export const options = {
  ...fullLoadOptions,
  thresholds: {
    ...fullLoadOptions.thresholds,
    list_latency: ['p(95)<800'],
    detail_latency: ['p(95)<500'],
    search_latency: ['p(95)<1000'],
  },
}

/**
 * Course catalog scenario — can be imported by orchestrators
 */
export function courseCatalogFlow() {
  const headers = getAuthHeaders()
  const iteration = __ITER

  // ── Scenario rotation: cycle through endpoints ──
  const scenario = iteration % 3

  if (scenario === 0) {
    // List courses with pagination
    const page = randomPage()
    const res = http.get(
      `${BASE_URL}/courses?page=${page}&limit=20`,
      { headers, tags: { endpoint: 'list' } },
    )

    listLatency.add(res.timings.duration)

    const ok = check(res, {
      'list: status 200': (r) => r.status === 200,
      'list: has data array': (r) => {
        try {
          return Array.isArray(JSON.parse(r.body).data.data)
        } catch {
          return false
        }
      },
    })
    errorRate.add(ok ? 0 : 1)
  } else if (scenario === 1) {
    // Get course detail
    const courseId = randomItem(courseIds)
    const res = http.get(
      `${BASE_URL}/courses/${courseId}`,
      { headers, tags: { endpoint: 'detail' } },
    )

    detailLatency.add(res.timings.duration)

    const ok = check(res, {
      'detail: status 200 or 404': (r) => r.status === 200 || r.status === 404,
    })
    errorRate.add(ok ? 0 : 1)
  } else {
    // Search courses
    const keyword = randomItem(searchTerms)
    const res = http.get(
      `${BASE_URL}/courses/search?q=${encodeURIComponent(keyword)}`,
      { headers, tags: { endpoint: 'search' } },
    )

    searchLatency.add(res.timings.duration)

    const ok = check(res, {
      'search: status 200': (r) => r.status === 200,
    })
    errorRate.add(ok ? 0 : 1)
  }

  sleep(0.5 + Math.random() * 1.5) // Random delay 0.5-2s
}

export default function () {
  courseCatalogFlow()
}

export function handleSummary(data) {
  const p95 = data.metrics.http_req_duration.values['p(95)']
  const errRate = data.metrics.errors ? data.metrics.errors.values.rate : 0

  return {
    stdout: `
══════════════════════════════════════════
  Course Catalog Load Test Results
══════════════════════════════════════════
  HTTP p95 latency:    ${p95.toFixed(2)}ms ${p95 < 1000 ? '✅' : '❌'}
  Error rate:          ${(errRate * 100).toFixed(2)}% ${errRate < 0.01 ? '✅' : '❌'}
  List p95:            ${data.metrics.list_latency.values['p(95)'].toFixed(2)}ms
  Detail p95:          ${data.metrics.detail_latency.values['p(95)'].toFixed(2)}ms
  Search p95:          ${data.metrics.search_latency.values['p(95)'].toFixed(2)}ms
══════════════════════════════════════════
`,
  }
}
