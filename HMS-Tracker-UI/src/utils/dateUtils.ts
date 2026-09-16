const flexDateCache = new Map<string, number | null>()

export function getLocalDateString(year: number | string, month1Indexed: number | string, day: number | string): string {
  const yyyy = String(year)
  const mm = String(month1Indexed).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export function formatDateDMY(dateStr: string): string {
  if (!dateStr || !dateStr.includes('-')) return dateStr
  const parts = dateStr.split('-')
  if (parts[0].length === 4) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`
  }
  return dateStr
}

export function getFullMonthDates(monthStr: string): string[] {
  let y = 2026, m = 8
  if (monthStr && monthStr.includes('-')) {
    const parts = monthStr.split('-')
    y = parseInt(parts[0], 10) || 2026
    m = parseInt(parts[1], 10) || 8
  }
  const daysInMonth = new Date(y, m, 0).getDate()
  const dates: string[] = []
  for (let d = 1; d <= daysInMonth; d++) {
    dates.push(getLocalDateString(y, m, d))
  }
  return dates
}

export function parseFlexibleDate(val: any, timeVal: any = null): Date | null {
  if (val === null || val === undefined || val === '') return null
  if (val instanceof Date && !isNaN(val.getTime())) return val

  const cacheKey = `${val}|${timeVal || ''}`
  if (flexDateCache.has(cacheKey)) {
    const cachedMs = flexDateCache.get(cacheKey)
    return cachedMs === null || cachedMs === undefined ? null : new Date(cachedMs)
  }

  const dateObj = parseFlexibleDateUncached(val, timeVal)
  const ms = (dateObj && !isNaN(dateObj.getTime())) ? dateObj.getTime() : null
  if (flexDateCache.size > 30000) flexDateCache.clear()
  flexDateCache.set(cacheKey, ms)
  return ms === null ? null : new Date(ms)
}

function parseFlexibleDateUncached(val: any, timeVal: any = null): Date | null {
  if (typeof val === 'number' || (!isNaN(val) && !String(val).includes('-') && !String(val).includes('/') && !String(val).includes(':'))) {
    const num = Number(val)
    if (num > 10000 && num < 90000) {
      const dateObj = new Date(Math.round((num - 25569) * 86400 * 1000))
      if (!isNaN(dateObj.getTime())) return dateObj
    }
  }

  const str = String(val).trim()
  if (!str || str.toLowerCase() === 'nan' || str.includes('01-01-3000')) return null

  let fullStr = str
  if (timeVal && String(timeVal).trim()) {
    fullStr = `${str} ${String(timeVal).trim()}`
  }

  const dmY = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/)
  if (dmY) {
    const day = parseInt(dmY[1], 10)
    const month = parseInt(dmY[2], 10) - 1
    let year = parseInt(dmY[3], 10)
    if (year < 100) year += 2000
    const h = parseInt(dmY[4] || '0', 10)
    const m = parseInt(dmY[5] || '0', 10)
    const s = parseInt(dmY[6] || '0', 10)
    if (month >= 0 && month < 12 && day >= 1 && day <= 31) {
      const parsed = new Date(year, month, day, h, m, s)
      if (!isNaN(parsed.getTime())) return parsed
    }
  }

  const Ymd = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/)
  if (Ymd) {
    const year = parseInt(Ymd[1], 10)
    const month = parseInt(Ymd[2], 10) - 1
    const day = parseInt(Ymd[3], 10)
    const h = parseInt(Ymd[4] || '0', 10)
    const m = parseInt(Ymd[5] || '0', 10)
    const s = parseInt(Ymd[6] || '0', 10)
    if (month >= 0 && month < 12 && day >= 1 && day <= 31) {
      const parsed = new Date(year, month, day, h, m, s)
      if (!isNaN(parsed.getTime())) return parsed
    }
  }

  let parsed = new Date(fullStr)
  if (!isNaN(parsed.getTime()) && parsed.getFullYear() > 2000 && parsed.getFullYear() < 2100) {
    return parsed
  }

  return new Date()
}
