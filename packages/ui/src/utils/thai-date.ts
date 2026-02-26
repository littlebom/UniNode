const THAI_MONTHS = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
] as const

const THAI_MONTHS_FULL = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
] as const

export function toThaiYear(date: Date | string): number {
  const d = new Date(date)
  return d.getFullYear() + 543
}

export function formatThaiDate(date: Date | string): string {
  const d = new Date(date)
  const day = d.getDate()
  const month = THAI_MONTHS[d.getMonth()]
  const year = toThaiYear(d)
  return `${day} ${month} ${year}`
}

export function formatThaiDateFromISO(iso: string): string {
  return formatThaiDate(new Date(iso))
}

export function formatThaiDateFull(date: Date | string): string {
  const d = new Date(date)
  const day = d.getDate()
  const month = THAI_MONTHS_FULL[d.getMonth()]
  const year = toThaiYear(d)
  return `${day} ${month} พ.ศ. ${year}`
}
