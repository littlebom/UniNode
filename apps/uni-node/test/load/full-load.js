/**
 * k6 Full Load Test — UniLink Node
 *
 * Staged load: ramp 50 → 100 → 0 VUs over 5 minutes
 * Weighted random scenario selection
 *
 * Run: k6 run test/load/full-load.js
 */

import { fullLoadOptions } from './config.js'
import { healthCheck } from './scenarios/health.js'
import { publicEndpoints } from './scenarios/public-endpoints.js'
import { vcVerifyFlow } from './vc-verify.k6.js'
import { courseCatalogFlow } from './course-catalog.k6.js'
import { transferFlow } from './transfer.k6.js'

export const options = fullLoadOptions

/**
 * Weighted scenario distribution:
 * - courseCatalog: 35%  (most common read — list, detail, search)
 * - vcVerify: 25%       (public endpoint, CPU-heavy crypto)
 * - transfer: 15%       (admin workflow, multi-step)
 * - health: 10%         (lightweight monitoring)
 * - publicEndpoints: 10% (DID + Status List, high cache hit)
 * - healthCheck: 5%     (baseline)
 */
const weightedScenarios = [
  { fn: courseCatalogFlow, weight: 35 },
  { fn: vcVerifyFlow, weight: 25 },
  { fn: transferFlow, weight: 15 },
  { fn: publicEndpoints, weight: 15 },
  { fn: healthCheck, weight: 10 },
]

// Build cumulative weights for O(1) selection
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
