/**
 * k6 Stress Test — UniLink Node
 *
 * Find breaking point: ramp 50 → 200 → 300 (spike) → 0
 * Duration: ~7 minutes
 *
 * Run: k6 run test/load/stress.js
 */

import { stressOptions } from './config.js'
import { healthCheck } from './scenarios/health.js'
import { publicEndpoints } from './scenarios/public-endpoints.js'
import { vcVerifyFlow } from './vc-verify.k6.js'
import { courseCatalogFlow } from './course-catalog.k6.js'
import { transferFlow } from './transfer.k6.js'

export const options = stressOptions

/**
 * Stress distribution — heavier on CPU-intensive operations
 * - vcVerify: 35%       (CPU-heavy — find crypto bottleneck)
 * - courseCatalog: 30%  (DB-heavy — find query bottleneck)
 * - transfer: 15%       (multi-step transaction)
 * - publicEndpoints: 10% (cache pressure)
 * - health: 10%         (baseline)
 */
const weightedScenarios = [
  { fn: vcVerifyFlow, weight: 35 },
  { fn: courseCatalogFlow, weight: 30 },
  { fn: transferFlow, weight: 15 },
  { fn: publicEndpoints, weight: 10 },
  { fn: healthCheck, weight: 10 },
]

const totalWeight = weightedScenarios.reduce((sum, s) => sum + s.weight, 0)
const cumulativeWeights = []
let cumulative = 0
for (const s of weightedScenarios) {
  cumulative += s.weight
  cumulativeWeights.push({ fn: s.fn, cumWeight: cumulative })
}

function pickWeightedScenario() {
  const rand = Math.random() * totalWeight
  for (const s of cumulativeWeights) {
    if (rand < s.cumWeight) {
      return s.fn
    }
  }
  return cumulativeWeights[cumulativeWeights.length - 1].fn
}

export default function () {
  const scenario = pickWeightedScenario()
  scenario()
}

export function handleSummary(data) {
  const p95 = data.metrics.http_req_duration.values['p(95)']
  const p99 = data.metrics.http_req_duration.values['p(99)']
  const errRate = data.metrics.http_req_failed.values.rate
  const totalReqs = data.metrics.http_reqs.values.count
  const avgRps = data.metrics.http_reqs.values.rate

  const report = {
    timestamp: new Date().toISOString(),
    test: 'uni-node-stress',
    summary: {
      total_requests: totalReqs,
      avg_rps: avgRps.toFixed(2),
      p95_ms: p95.toFixed(2),
      p99_ms: p99.toFixed(2),
      error_rate: (errRate * 100).toFixed(2),
      pass: p95 < 2000 && errRate < 0.05,
    },
  }

  return {
    stdout: `
══════════════════════════════════════════
  Node Stress Test Results
══════════════════════════════════════════
  Total requests:      ${totalReqs}
  Avg RPS:             ${avgRps.toFixed(2)}
  HTTP p95 latency:    ${p95.toFixed(2)}ms ${p95 < 2000 ? '✅' : '❌'}
  HTTP p99 latency:    ${p99.toFixed(2)}ms ${p99 < 5000 ? '✅' : '❌'}
  Error rate:          ${(errRate * 100).toFixed(2)}% ${errRate < 0.05 ? '✅' : '❌'}
  Overall:             ${report.summary.pass ? '✅ PASS' : '❌ FAIL'}
══════════════════════════════════════════
`,
    './k6-stress-node-results.json': JSON.stringify(report, null, 2),
  }
}
