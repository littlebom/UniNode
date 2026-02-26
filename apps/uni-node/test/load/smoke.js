/**
 * k6 Smoke Test — UniLink Node
 *
 * Quick validation: 5 VUs for 30 seconds
 * Run: k6 run test/load/smoke.js
 */

import { smokeOptions } from './config.js'
import { healthCheck } from './scenarios/health.js'
import { publicEndpoints } from './scenarios/public-endpoints.js'
import { vcVerifyFlow } from './vc-verify.k6.js'
import { courseCatalogFlow } from './course-catalog.k6.js'
import { transferFlow } from './transfer.k6.js'

export const options = smokeOptions

const scenarios = [
  healthCheck,
  publicEndpoints,
  vcVerifyFlow,
  courseCatalogFlow,
  transferFlow,
]

export default function () {
  // Pick a random scenario for each iteration
  const scenario = scenarios[Math.floor(Math.random() * scenarios.length)]
  scenario()
}
