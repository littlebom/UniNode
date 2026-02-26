/**
 * Test data generators for k6 load tests — UniLink Node
 */

// ── Course IDs for detail/outcomes endpoints ──
export const courseIds = [
  'CS101', 'CS102', 'CS201', 'CS301',
  'MATH101', 'MATH201', 'ENG101', 'PHY101',
  'CS401', 'CS402', 'STAT201', 'ECON101',
]

// ── Search keywords for course search ──
export const searchTerms = [
  'Computer', 'Data', 'Algorithm', 'Machine Learning',
  'Database', 'Network', 'Security', 'Software',
  'Programming', 'Calculus', 'Physics', 'Statistics',
]

// ── Student IDs for VC issuance / transfer tests ──
export const studentIds = [
  '6401001', '6401002', '6401003', '6401004', '6401005',
  '6401006', '6401007', '6401008', '6401009', '6401010',
]

// ── Target node IDs for transfer tests ──
export const targetNodes = [
  'cu.ac.th', 'mu.ac.th', 'ku.ac.th', 'kmutt.ac.th', 'cmu.ac.th',
]

// ── Source courses for transfer ──
export const sourceCourses = ['CS101', 'CS102', 'CS201', 'MATH101', 'ENG101']

// ── Status list IDs ──
export const statusListIds = ['1', '2', '3']

/**
 * Pick a random item from an array
 * @param {Array} arr
 * @returns {*} Random item
 */
export function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

/**
 * Generate a random page number
 * @param {number} max - Maximum page number
 * @returns {number}
 */
export function randomPage(max = 5) {
  return Math.floor(Math.random() * max) + 1
}

/**
 * Generate a random limit
 * @returns {number}
 */
export function randomLimit() {
  const limits = [10, 20, 50]
  return randomItem(limits)
}
