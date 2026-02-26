/**
 * k6 Load Test Configuration
 * UniLink Node — Phase 4 Sprint 9-10
 */

export const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/unilink/api/v1'
export const ROOT_URL = __ENV.BASE_URL || 'http://localhost:3000'

// ── Smoke Test Options ──
export const smokeOptions = {
  vus: 5,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.05'],
  },
}

// ── Full Load Test Stages ──
export const fullLoadStages = [
  { duration: '1m', target: 50 },  // Ramp up to 50 VUs
  { duration: '3m', target: 100 }, // Stay at 100 VUs
  { duration: '1m', target: 0 },   // Ramp down
]

export const fullLoadOptions = {
  stages: fullLoadStages,
  thresholds: {
    http_req_duration: ['p(95)<1000', 'p(99)<2000'],
    http_req_failed: ['rate<0.01'],
    http_reqs: ['rate>10'],
  },
}

// ── Stress Test Stages ──
export const stressStages = [
  { duration: '1m', target: 50 },   // Warm up
  { duration: '2m', target: 200 },  // Push to 200 VUs
  { duration: '2m', target: 300 },  // Spike to 300 VUs
  { duration: '1m', target: 100 },  // Scale back
  { duration: '1m', target: 0 },    // Ramp down
]

export const stressOptions = {
  stages: stressStages,
  thresholds: {
    http_req_duration: ['p(95)<2000', 'p(99)<5000'],
    http_req_failed: ['rate<0.05'],
  },
}

// ── Common Headers ──
export const defaultHeaders = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
}
