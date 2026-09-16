export const COLUMN_ALIASES: Record<string, string[]> = {
  emp_id: ['emp id', 'employee id', 'employee code', 'emp code', 'id', 'code', 'staff id', 'card no', 'enroll', 'user id', 'emp_no'],
  emp_name: ['emp name', 'employee name', 'name', 'staff name', 'employee', 'person', 'emp_name', 'emplname'],
  date: ['date', 'punch date', 'attendance date', 'day', 'log date', 'work date', 'start date', 'end date'],
  time: ['time', 'punch time', 'log time', 'in time', 'out time', 'check time'],
  datetime: ['datetime', 'date time', 'punch datetime', 'timestamp', 'log time', 'date_time'],
  department: ['department', 'dept', 'division', 'team', 'sec', 'section'],
  status: ['status', 'att status', 'status code', 'complinfreestatus', 'compinfreestatus', 'free status', 'attstatus', 'statuscode'],
  duration: ['durationhhmm', 'duration hhmm', 'duration_hhmm', 'durationhh:mm', 'duration (hh:mm)', 'duration', 'totalduration', 'work duration', 'worked hours', 'hours']
}

export function autoDetectColumns(cols: string[]): Record<string, string> {
  const norm = (s: string) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '')
  const detected: Record<string, string> = {}

  Object.entries(COLUMN_ALIASES).forEach(([logical, aliases]) => {
    for (let alias of aliases) {
      const na = norm(alias)
      for (let c of cols) {
        const nc = norm(c)
        if (nc === na || nc.includes(na) || na.includes(nc)) {
          if (!detected[logical]) {
            detected[logical] = c
            break
          }
        }
      }
      if (detected[logical]) break
    }
  })

  if (!detected.emp_id && cols.length > 0) detected.emp_id = cols[0]
  if (!detected.emp_name && cols.length > 1) detected.emp_name = cols[1]

  return detected
}

export function normalizeEmpId(id: any): string {
  if (id === null || id === undefined) return ''
  const s = String(id).trim()
  return s.replace(/^0+/, '').split('.')[0]
}
