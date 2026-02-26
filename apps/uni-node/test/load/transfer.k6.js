/**
 * k6 Load Test: Credit Transfer Flow
 *
 * Tests: POST /transfer/request, GET /transfer/:id, PUT /transfer/:id/approve
 * Target: p95 < 1000ms, error rate < 1%
 *
 * Run: k6 run --env BASE_URL=http://localhost:3000 --env TEST_JWT=<admin-token> test/load/transfer.k6.js
 */
import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate, Trend, Counter } from 'k6/metrics'
import { BASE_URL } from './config.js'
import { getAuthHeaders } from './helpers/auth.js'
import { studentIds, sourceCourses, targetNodes, randomItem } from './helpers/data.js'

// ── Custom Metrics ──
const errorRate = new Rate('errors')
const createLatency = new Trend('create_latency', true)
const getLatency = new Trend('get_latency', true)
const approveLatency = new Trend('approve_latency', true)
const transfersCreated = new Counter('transfers_created')

export const options = {
  stages: [
    { duration: '20s', target: 20 },  // Ramp up to 20 VUs
    { duration: '2m', target: 50 },    // Steady at 50 VUs
    { duration: '1m', target: 80 },    // Push to 80 VUs
    { duration: '30s', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    errors: ['rate<0.01'],
    create_latency: ['p(95)<1000'],
    get_latency: ['p(95)<500'],
    approve_latency: ['p(95)<1000'],
  },
}

/**
 * Transfer flow scenario — can be imported by orchestrators
 */
export function transferFlow() {
  const headers = getAuthHeaders()
  const iteration = __ITER
  const vu = __VU

  // ── Step 1: Create Transfer Request ──
  const studentId = randomItem(studentIds)
  const courseName = randomItem(sourceCourses)

  const createRes = http.post(
    `${BASE_URL}/transfer/request`,
    JSON.stringify({
      studentId: studentId,
      sourceVcId: `vc-${courseName}-${studentId}-2569-1`,
      sourceCourseId: courseName,
      targetNodeId: randomItem(targetNodes),
      targetCourseId: `TGT-${courseName}`,
    }),
    { headers, tags: { endpoint: 'create' } },
  )

  createLatency.add(createRes.timings.duration)

  const createOk = check(createRes, {
    'create: status 201': (r) => r.status === 201,
    'create: has transferId': (r) => {
      try {
        return JSON.parse(r.body).data.transferId !== undefined
      } catch {
        return false
      }
    },
  })

  if (!createOk) {
    errorRate.add(1)
    sleep(1)
    return
  }

  errorRate.add(0)
  transfersCreated.add(1)

  const createData = JSON.parse(createRes.body)
  const transferId = createData.data.transferId

  sleep(0.5)

  // ── Step 2: Get Transfer Detail ──
  const getRes = http.get(
    `${BASE_URL}/transfer/${transferId}`,
    { headers, tags: { endpoint: 'get' } },
  )

  getLatency.add(getRes.timings.duration)

  const getOk = check(getRes, {
    'get: status 200': (r) => r.status === 200,
    'get: correct transferId': (r) => {
      try {
        return JSON.parse(r.body).data.transferId === transferId
      } catch {
        return false
      }
    },
  })
  errorRate.add(getOk ? 0 : 1)

  sleep(0.5)

  // ── Step 3: Approve Transfer (50% of the time) ──
  if (iteration % 2 === 0) {
    const approveRes = http.put(
      `${BASE_URL}/transfer/${transferId}/approve`,
      JSON.stringify({ reviewNote: `Approved by load test VU ${vu}` }),
      { headers, tags: { endpoint: 'approve' } },
    )

    approveLatency.add(approveRes.timings.duration)

    const approveOk = check(approveRes, {
      'approve: status 200': (r) => r.status === 200,
    })
    errorRate.add(approveOk ? 0 : 1)
  }

  sleep(1 + Math.random() * 2) // Random delay 1-3s
}

export default function () {
  transferFlow()
}

export function handleSummary(data) {
  const p95 = data.metrics.http_req_duration.values['p(95)']
  const errRate = data.metrics.errors ? data.metrics.errors.values.rate : 0
  const created = data.metrics.transfers_created
    ? data.metrics.transfers_created.values.count
    : 0

  return {
    stdout: `
══════════════════════════════════════════
  Transfer Flow Load Test Results
══════════════════════════════════════════
  HTTP p95 latency:    ${p95.toFixed(2)}ms ${p95 < 1000 ? '✅' : '❌'}
  Error rate:          ${(errRate * 100).toFixed(2)}% ${errRate < 0.01 ? '✅' : '❌'}
  Transfers created:   ${created}
  Create p95:          ${data.metrics.create_latency.values['p(95)'].toFixed(2)}ms
  Get p95:             ${data.metrics.get_latency.values['p(95)'].toFixed(2)}ms
  Approve p95:         ${data.metrics.approve_latency ? data.metrics.approve_latency.values['p(95)'].toFixed(2) : 'N/A'}ms
══════════════════════════════════════════
`,
  }
}
