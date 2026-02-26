const gradeColorMap: Record<string, string> = {
  'A': 'bg-green-100 text-green-800',
  'B+': 'bg-blue-100 text-blue-800',
  'B': 'bg-blue-100 text-blue-800',
  'C+': 'bg-yellow-100 text-yellow-800',
  'C': 'bg-yellow-100 text-yellow-800',
  'D+': 'bg-orange-100 text-orange-800',
  'D': 'bg-orange-100 text-orange-800',
  'F': 'bg-red-100 text-red-800',
  'S': 'bg-purple-100 text-purple-800',
  'U': 'bg-gray-100 text-gray-800',
  'W': 'bg-gray-100 text-gray-500',
  'I': 'bg-gray-100 text-gray-500',
}

const gradePointMap: Record<string, number> = {
  'A': 4.0,
  'B+': 3.5,
  'B': 3.0,
  'C+': 2.5,
  'C': 2.0,
  'D+': 1.5,
  'D': 1.0,
  'F': 0.0,
}

export function gradeColor(grade: string): string {
  return gradeColorMap[grade] ?? 'bg-gray-100 text-gray-800'
}

export function gradePoint(grade: string): number | undefined {
  return gradePointMap[grade]
}
