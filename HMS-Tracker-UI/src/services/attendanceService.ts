import { parseFlexibleDate, formatDateDMY, getFullMonthDates } from '../utils/dateUtils'
import { parseDurationToHours, formatHoursToHM, round2 } from '../utils/durationUtils'
import { autoDetectColumns, normalizeEmpId } from '../utils/columnUtils'

export function calculateAttendanceSummary(logs: any[] = [], monthStr = '2026-08', leaveBalances: Record<string, any> = {}): any[] {
  const dates = getFullMonthDates(monthStr)
  const empMap = new Map<string, any>()

  logs.forEach(log => {
    const id = normalizeEmpId(log.emp_id || log.emp_no)
    if (!id) return

    if (!empMap.has(id)) {
      empMap.set(id, {
        emp_id: id,
        emp_name: log.emp_name || log.name || id,
        department: log.department || 'General',
        doj: log.doj || '',
        present_days: 0,
        pl_used: 0,
        cl_used: 0,
        sl_used: 0,
        lop: 0,
        total_pay_days: 0,
        pl_bal: 12,
        cl_bal: 6,
        sl_bal: 6
      })
    }

    const emp = empMap.get(id)
    const status = (log.status || 'P').toUpperCase()

    if (status === 'P') emp.present_days += 1
    else if (status === '3/4P') emp.present_days += 0.75
    else if (status === '1/2P') emp.present_days += 0.5
    else if (status === 'PL') emp.pl_used += 1
    else if (status === 'CL') emp.cl_used += 1
    else if (status === 'SL') emp.sl_used += 1
    else if (status === 'A' || status === 'LOP') emp.lop += 1
  })

  const summary: any[] = []
  empMap.forEach((emp) => {
    emp.pl_bal = Math.max(12 - emp.pl_used, 0)
    emp.cl_bal = Math.max(6 - emp.cl_used, 0)
    emp.sl_bal = Math.max(6 - emp.sl_used, 0)
    emp.total_pay_days = emp.present_days + emp.pl_used + emp.cl_used + emp.sl_used
    summary.push(emp)
  })

  return summary
}

export function deriveEmployeesList(logs: any[] = [], summary: any[] = []): any[] {
  const empMap = new Map<string, any>()

  summary.forEach(s => {
    const id = normalizeEmpId(s.emp_id)
    if (id) {
      empMap.set(id, {
        emp_id: id,
        emp_name: s.emp_name || id,
        department: s.department || 'General',
        doj: s.doj || ''
      })
    }
  })

  logs.forEach(l => {
    const id = normalizeEmpId(l.emp_id)
    if (id && !empMap.has(id)) {
      empMap.set(id, {
        emp_id: id,
        emp_name: l.emp_name || id,
        department: l.department || 'General',
        doj: l.doj || ''
      })
    }
  })

  return Array.from(empMap.values())
}

export function computeSequentialLeaveDeduction(absentCount: number, halfCount: number, explicitPL = 0, explicitCL = 0, explicitSL = 0, plTotal = 12, clTotal = 10, slTotal = 8) {
  const unassignedAbsenceTotal = absentCount * 1.0 + halfCount * 0.5

  let plAvail = Math.max(plTotal - explicitPL, 0)
  let clAvail = Math.max(clTotal - explicitCL, 0)
  let slAvail = Math.max(slTotal - explicitSL, 0)

  let plAuto = Math.min(unassignedAbsenceTotal, plAvail)
  let rem1 = unassignedAbsenceTotal - plAuto

  let clAuto = Math.min(rem1, clAvail)
  let rem2 = rem1 - clAuto

  let slAuto = Math.min(rem2, slAvail)
  let lwpAuto = rem2 - slAuto

  const plUsed = round2(explicitPL + plAuto)
  const clUsed = round2(explicitCL + clAuto)
  const slUsed = round2(explicitSL + slAuto)
  const lwpUsed = round2(lwpAuto)

  return {
    plTotal, clTotal, slTotal,
    plUsed, clUsed, slUsed, lwpUsed,
    plRemaining: round2(Math.max(plTotal - plUsed, 0)),
    clRemaining: round2(Math.max(clTotal - clUsed, 0)),
    slRemaining: round2(Math.max(slTotal - slUsed, 0)),
    unassignedAbsenceTotal: round2(unassignedAbsenceTotal),
    plAutoDeduct: round2(plAuto),
    clAutoDeduct: round2(clAuto),
    slAutoDeduct: round2(slAuto)
  }
}

export function buildLeaveDetailsList(matrix: any[], allDates: string[], leaveBalances: Record<string, any> = {}): any[] {
  const leaveDetails: any[] = []
  matrix.forEach(row => {
    let empExplicitPL = 0, empExplicitCL = 0, empExplicitSL = 0
    let absentDates: string[] = []
    let halfDates: string[] = []

    allDates.forEach(dateStr => {
      const val = String(row[dateStr] || '').toUpperCase()
      const dmyDate = formatDateDMY(dateStr)

      if (val === 'PL' || val === 'PAID LEAVE') {
        empExplicitPL += 1
        leaveDetails.push({
          'emp id': row.emp_id,
          'emplname': row.emp_name,
          'leave value': 1,
          'leave type': 'PL',
          'start date': dmyDate,
          'end date': dmyDate,
          'department': row.department || 'General',
          isExplicit: true
        })
      } else if (val === 'CL' || val === 'CASUAL LEAVE') {
        empExplicitCL += 1
        leaveDetails.push({
          'emp id': row.emp_id,
          'emplname': row.emp_name,
          'leave value': 1,
          'leave type': 'CL',
          'start date': dmyDate,
          'end date': dmyDate,
          'department': row.department || 'General',
          isExplicit: true
        })
      } else if (val === 'SL' || val === 'SICK LEAVE') {
        empExplicitSL += 1
        leaveDetails.push({
          'emp id': row.emp_id,
          'emplname': row.emp_name,
          'leave value': 1,
          'leave type': 'SL',
          'start date': dmyDate,
          'end date': dmyDate,
          'department': row.department || 'General',
          isExplicit: true
        })
      } else if (val === '1/2P' || val === 'HD') {
        halfDates.push(dmyDate)
      } else if (val === 'A' || val === 'ABSENT' || val === '0') {
        absentDates.push(dmyDate)
      }
    })

    const empBal = leaveBalances[normalizeEmpId(row.emp_id)] || {}
    const plTotal = empBal.pl !== undefined ? empBal.pl : 12
    const clTotal = empBal.cl !== undefined ? empBal.cl : 10
    const slTotal = empBal.sl !== undefined ? empBal.sl : 8

    let plCap = Math.max(plTotal - empExplicitPL, 0)
    let clCap = Math.max(clTotal - empExplicitCL, 0)
    let slCap = Math.max(slTotal - empExplicitSL, 0)

    const allAbsenceItems = [
      ...absentDates.map(d => ({ date: d, value: 1.0 })),
      ...halfDates.map(d => ({ date: d, value: 0.5 }))
    ]

    allAbsenceItems.forEach(item => {
      let valNeeded = item.value
      let allocatedType = 'A'

      if (plCap >= valNeeded) {
        allocatedType = 'PL'
        plCap -= valNeeded
      } else if (clCap >= valNeeded) {
        allocatedType = 'CL'
        clCap -= valNeeded
      } else if (slCap >= valNeeded) {
        allocatedType = 'SL'
        slCap -= valNeeded
      } else {
        allocatedType = 'LWP'
      }

      if (allocatedType !== 'A' && allocatedType !== 'LWP') {
        leaveDetails.push({
          'emp id': row.emp_id,
          'emplname': row.emp_name,
          'leave value': item.value,
          'leave type': allocatedType,
          'start date': item.date,
          'end date': item.date,
          'department': row.department || 'General',
          isAuto: true
        })
      }
    })
  })
  return leaveDetails
}

export function parseDepartmentMaster(XLSX: any, wb: any): Record<string, string> {
  if (!wb || !wb.SheetNames) return {}
  const sheetName = wb.SheetNames.find((n: string) => {
    const s = n.toLowerCase().replace(/[^a-z]/g, '')
    return s === 'departments' || s === 'department' || s === 'depts' || s.includes('dept')
  })
  if (!sheetName) return {}

  const sheet = wb.Sheets[sheetName]
  const json = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false })
  const deptMap: Record<string, string> = {}

  json.forEach((row: any) => {
    const keys = Object.keys(row)
    const idKey = keys.find(k => {
      const lk = k.toLowerCase().replace(/[^a-z0-9]/g, '')
      return lk === 'departmentid' || lk === 'deptid' || lk === 'departmentcode' || lk === 'deptcode' || lk === 'id' || lk === 'code'
    }) || keys[0]

    const nameKey = keys.find(k => {
      const lk = k.toLowerCase().replace(/[^a-z0-9]/g, '')
      return lk === 'departmentname' || lk === 'deptname' || lk === 'department' || lk === 'name'
    }) || (keys.length > 1 ? keys[1] : idKey)

    if (idKey && row[idKey] !== undefined && row[idKey] !== null) {
      const rawId = String(row[idKey]).trim()
      const cleanId = rawId.toLowerCase().replace(/[^a-z0-9]/g, '')
      const deptName = nameKey && row[nameKey] ? String(row[nameKey]).trim() : rawId

      if (rawId) {
        deptMap[rawId] = deptName
        deptMap[cleanId] = deptName
      }
    }
  })

  return deptMap
}

export function parseEmployeeMaster(XLSX: any, wb: any): Record<string, any> {
  const deptMap = parseDepartmentMaster(XLSX, wb)

  const sheetName = wb.SheetNames.find((n: string) => {
    const s = n.toLowerCase().replace(/[^a-z]/g, '')
    return s === 'employees' || s === 'employee' || s.includes('employeedirectory') || s.includes('staff')
  })
  if (!sheetName) return {}

  const sheet = wb.Sheets[sheetName]
  const json = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false })
  const master: Record<string, any> = {}
  json.forEach((row: any) => {
    const keys = Object.keys(row)
    const empIdKey = keys.find(k => {
      const lk = k.toLowerCase().replace(/[^a-z0-9]/g, '')
      return lk === 'employeeid' || lk === 'empid' || lk === 'employeecode' || lk === 'empcode' || lk === 'staffid'
    }) || keys.find(k => k.toLowerCase().includes('id') || k.toLowerCase().includes('code'))
    const codeKey = keys.find(k => k.toLowerCase().includes('code')) || empIdKey
    const nameKey = keys.find(k => k.toLowerCase().includes('name'))
    const deptIdKey = keys.find(k => {
      const lk = k.toLowerCase().replace(/[^a-z0-9]/g, '')
      return lk === 'departmentid' || lk === 'deptid' || lk === 'departmentcode' || lk === 'deptcode'
    })
    const deptKey = deptIdKey || keys.find(k => k.toLowerCase().includes('department') || k.toLowerCase().includes('dept'))
    const dojKey = keys.find(k => k.toLowerCase() === 'doj' || k.toLowerCase().includes('date of joining') || k.toLowerCase().includes('joining'))

    const empName = nameKey && row[nameKey] ? String(row[nameKey]).trim() : ''
    const rawDept = deptKey && row[deptKey] ? String(row[deptKey]).trim() : 'General'
    const cleanDeptKey = rawDept.toLowerCase().replace(/[^a-z0-9]/g, '')
    const dept = deptMap[rawDept] || deptMap[cleanDeptKey] || rawDept

    const rawDoj = dojKey && row[dojKey] ? row[dojKey] : null
    const parsedDoj = rawDoj ? parseFlexibleDate(rawDoj) : null

    const info = { emp_name: empName, department: dept, doj: parsedDoj }

    if (empIdKey && row[empIdKey]) {
      const idStr = normalizeEmpId(row[empIdKey])
      if (idStr) master[idStr] = { ...info, emp_name: empName || idStr }
    }

    if (codeKey && row[codeKey]) {
      const codeStr = normalizeEmpId(row[codeKey])
      if (codeStr) master[codeStr] = { ...info, emp_name: empName || codeStr }
    }
  })
  return master
}
