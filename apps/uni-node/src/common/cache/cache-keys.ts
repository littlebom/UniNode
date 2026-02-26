/**
 * Cache key constants and helper for UniNode.
 * All TTL values in milliseconds (cache-manager v5 standard).
 */

export const CACHE_KEYS = {
  COURSES_LIST: 'node:courses:list',
  COURSES_SEARCH: 'node:courses:search',
  COURSE_DETAIL: 'node:course',
  COURSE_OUTCOMES: 'node:course:outcomes',
  COURSE_SYLLABUS: 'node:course:syllabus',
  COURSE_SCHEMA_ORG: 'node:course:schemaorg',
} as const

export const CACHE_TTL = {
  /** Course listing — 2 hours (changes only on SIS sync) */
  COURSES_LIST: 7200000,
  /** Course search — 2 hours */
  COURSES_SEARCH: 7200000,
  /** Course detail — 2 hours */
  COURSE_DETAIL: 7200000,
  /** Learning outcomes — 6 hours (static per semester) */
  COURSE_OUTCOMES: 21600000,
  /** Syllabus — 6 hours */
  COURSE_SYLLABUS: 21600000,
  /** Schema.org format — 24 hours (external API format) */
  COURSE_SCHEMA_ORG: 86400000,
} as const

/**
 * Build a deterministic cache key from prefix + query params.
 * Sorts params alphabetically to ensure consistent keys.
 */
export function buildCacheKey(
  prefix: string,
  params: Record<string, string | number | boolean | undefined>,
): string {
  const sorted = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${String(v)}`)
    .join('&')

  return sorted ? `${prefix}:${sorted}` : prefix
}
