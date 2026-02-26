/**
 * k6 Load Test: VC Verification Flow
 *
 * Tests: POST /vc/challenge → POST /vc/verify
 * Target: p95 < 1000ms, error rate < 1%
 *
 * Run: k6 run --env BASE_URL=http://localhost:3000 test/load/vc-verify.k6.js
 */
import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate, Trend } from 'k6/metrics'
import { BASE_URL, fullLoadOptions } from './config.js'

// ── Custom Metrics ──
const errorRate = new Rate('errors')
const challengeLatency = new Trend('challenge_latency', true)
const verifyLatency = new Trend('verify_latency', true)

export const options = {
  ...fullLoadOptions,
  thresholds: {
    ...fullLoadOptions.thresholds,
    challenge_latency: ['p(95)<500'],
    verify_latency: ['p(95)<1000'],
  },
}

// ── Mock VP for testing ──
const MOCK_VP = {
  '@context': ['https://www.w3.org/2018/credentials/v1'],
  type: ['VerifiablePresentation'],
  holder: 'did:web:tu.ac.th:students:6401001',
  verifiableCredential: [],
  proof: {
    type: 'Ed25519Signature2020',
    created: new Date().toISOString(),
    verificationMethod: 'did:web:tu.ac.th:students:6401001#key-1',
    proofPurpose: 'authentication',
    challenge: '',
    proofValue: 'mock-signature-value',
  },
}

/**
 * VC Verify scenario — can be imported by orchestrators
 */
export function vcVerifyFlow() {
  const headers = { 'Content-Type': 'application/json' }

  // ── Step 1: Generate Challenge ──
  const challengeRes = http.post(
    `${BASE_URL}/vc/challenge`,
    JSON.stringify({ domain: 'tu.ac.th' }),
    { headers, tags: { endpoint: 'challenge' } },
  )

  challengeLatency.add(challengeRes.timings.duration)

  const challengeOk = check(challengeRes, {
    'challenge: status 200': (r) => r.status === 200,
    'challenge: has challenge field': (r) => {
      try {
        return JSON.parse(r.body).data.challenge !== undefined
      } catch {
        return false
      }
    },
  })

  if (!challengeOk) {
    errorRate.add(1)
    sleep(1)
    return
  }

  const challengeData = JSON.parse(challengeRes.body)
  const challenge = challengeData.data.challenge

  // ── Step 2: Verify VP ──
  const vpPayload = JSON.parse(JSON.stringify(MOCK_VP))
  vpPayload.proof.challenge = challenge

  const verifyRes = http.post(
    `${BASE_URL}/vc/verify`,
    JSON.stringify({
      vp: vpPayload,
      challenge: challenge,
      domain: 'tu.ac.th',
    }),
    { headers, tags: { endpoint: 'verify' } },
  )

  verifyLatency.add(verifyRes.timings.duration)

  const verifyOk = check(verifyRes, {
    'verify: status 200': (r) => r.status === 200,
    'verify: has result': (r) => {
      try {
        return JSON.parse(r.body).data !== undefined
      } catch {
        return false
      }
    },
  })

  if (!verifyOk) {
    errorRate.add(1)
  } else {
    errorRate.add(0)
  }

  sleep(1)
}

export default function () {
  vcVerifyFlow()
}

export function handleSummary(data) {
  const p95 = data.metrics.http_req_duration.values['p(95)']
  const errRate = data.metrics.errors ? data.metrics.errors.values.rate : 0

  return {
    stdout: `
══════════════════════════════════════════
  VC Verify Load Test Results
══════════════════════════════════════════
  HTTP p95 latency:    ${p95.toFixed(2)}ms ${p95 < 1000 ? '✅' : '❌'}
  Error rate:          ${(errRate * 100).toFixed(2)}% ${errRate < 0.01 ? '✅' : '❌'}
  Challenge p95:       ${data.metrics.challenge_latency.values['p(95)'].toFixed(2)}ms
  Verify p95:          ${data.metrics.verify_latency.values['p(95)'].toFixed(2)}ms
══════════════════════════════════════════
`,
  }
}
