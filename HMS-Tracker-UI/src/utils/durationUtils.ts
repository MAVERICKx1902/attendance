export function parseDurationToHours(val: any): number {
  if (val === null || val === undefined || val === '') return 0

  if (typeof val === 'number') {
    if (val > 0 && val <= 1) return val * 24 
    if (val > 24) {
      const s = String(Math.round(val))
      if (s.length === 3 || s.length === 4) {
        const h = parseInt(s.slice(0, -2), 10)
        const m = parseInt(s.slice(-2), 10)
        if (m >= 0 && m < 60) return h + m / 60
      }
      return val / 60 
    }
    if (val > 1 && val <= 24) {
      if (Number.isInteger(val) && val >= 15) return val / 60
      return val
    }
  }

  const str = String(val).trim().toLowerCase()
  if (!str || str === '00:00' || str === '00:00:00' || str === '0') return 0

  const tm = str.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/)
  if (tm) {
    const h = parseInt(tm[1], 10)
    const m = parseInt(tm[2], 10)
    return h + m / 60
  }

  const hhmm = str.match(/^(\d{1,2})(\d{2})$/)
  if (hhmm) {
    const h = parseInt(hhmm[1], 10)
    const m = parseInt(hhmm[2], 10)
    if (m >= 0 && m < 60) return h + m / 60
  }

  const hm = str.match(/^(\d+)\s*(?:h|hr|hrs|hour|hours)\s*(?:(\d+)\s*(?:m|min|mins|minute|minutes)?)?$/i)
  if (hm) {
    const h = parseInt(hm[1], 10) || 0
    const m = parseInt(hm[2] || '0', 10) || 0
    return h + m / 60
  }

  const minOnly = str.match(/^(\d+(?:\.\d+)?)\s*(?:m|min|mins|minute|minutes)$/i)
  if (minOnly) {
    const mins = parseFloat(minOnly[1])
    return mins / 60
  }

  const num = parseFloat(str)
  if (!isNaN(num)) {
    if (num > 0 && num <= 1) return num * 24
    if (num > 24) return num / 60
    if (num > 1 && num <= 24) {
      if (str.includes('.') || str.includes('h')) return num
      if (num >= 15) return num / 60
      return num
    }
  }

  return 0
}

export function formatHoursToHM(hours: number | null | undefined): string {
  if (!hours || isNaN(hours) || hours <= 0) return '0hrs 0min'
  const totalMins = Math.round(hours * 60)
  const h = Math.floor(totalMins / 60)
  const m = totalMins % 60
  if (m === 0) return `${h}hrs 0min`
  return `${h}hrs ${m}min`
}

export function round2(val: number | null | undefined): number {
  return Math.round((val || 0) * 100) / 100
}
