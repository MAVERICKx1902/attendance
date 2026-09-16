import { getXLSX } from './backendApiService'
import { normalizeEmpId } from '../utils/columnUtils'

export async function exportSummaryToExcel(leaveSummary: any[] = [], monthStr = '2026-08', targetFileName = `Attendance_Summary_${monthStr}.xlsx`) {
  const XLSX = await getXLSX()
  const wb = XLSX.utils.book_new()

  const headers = [
    'Emp ID', 'Employee Name', 'Department', 'DOJ',
    'Present Days', 'PL Used', 'CL Used', 'SL Used', 'LOP', 'Total Pay Days',
    'Balance PL', 'Balance CL', 'Balance SL'
  ]

  const aoa: any[][] = [headers]

  leaveSummary.forEach(emp => {
    aoa.push([
      emp.emp_id,
      emp.emp_name,
      emp.department || 'N/A',
      emp.doj || '-',
      emp.present_days || 0,
      emp.pl_used || 0,
      emp.cl_used || 0,
      emp.sl_used || 0,
      emp.lop || 0,
      emp.total_pay_days || 0,
      emp.pl_bal ?? 12,
      emp.cl_bal ?? 6,
      emp.sl_bal ?? 6
    ])
  })

  const sheet = XLSX.utils.aoa_to_sheet(aoa)
  XLSX.utils.book_append_sheet(wb, sheet, 'Leave Summary')
  XLSX.writeFile(wb, targetFileName)
}

export async function exportToExcel(data: any, config: any = {}, targetFileName = 'Attendance_Export.xlsx') {
  if (!data) return
  const XLSX = await getXLSX()

  const wb = XLSX.utils.book_new()

  const dates: string[] = data.allDates || []
  const monthLabel = config.month || (dates.length > 0 ? dates[0].substring(0, 7) : '2026-08')

  const matrixHeaders = [
    'EmpCode', 'EmpName', 'Company', 'Department',
    ...dates,
    'Present (P)', 'Absent (A)', 'Leave (L)', 'Half Day (HD)', 'Week Off (WO)', 'WOP'
  ]
  const matrixAoa: any[][] = [
    ['Company Name:', config.company_name || 'Autocrat Engineers'],
    ['Month:', monthLabel],
    [],
    matrixHeaders
  ]

  const summaryMap = new Map()
  if (data.summary) {
    data.summary.forEach((s: any) => summaryMap.set(s.emp_id, s))
  }

  if (data.matrix) {
    data.matrix.forEach((row: any) => {
      const dr: any[] = [
        row.emp_id,
        row.emp_name,
        config.company_name || 'Autocrat Engineers',
        row.department || 'General'
      ]
      dates.forEach((d: string) => {
        dr.push(row[d] || '-')
      })

      const empSummary = summaryMap.get(row.emp_id) || {}
      dr.push(empSummary['Present (P)'] || 0)
      dr.push(empSummary['Absent (A)'] || 0)
      dr.push(empSummary['Leave (L)'] || 0)
      dr.push(empSummary['Half Day (HD)'] || 0)
      dr.push(empSummary['Week Off (WO)'] || 0)
      dr.push(0) 
      matrixAoa.push(dr)
    })
  }

  const dailyLogHeaders = ['Attendance Date', 'Employee Code', 'Employee Name', 'Department', 'Designation', 'DOJ', 'Shift Code', 'Begin Time', 'End Time', 'In Time', 'Out Time', 'Duration', 'LateBy', 'EarlyBy', 'LeaveType', 'Leave Status', 'Att Status', 'Status Code', 'TotalDuration', 'Punch Records', 'Location', 'Unnamed: 21']
  const dailyAoa: any[][] = [dailyLogHeaders]
  if (data.daily) {
    data.daily.forEach((row: any) => {
      dailyAoa.push([
        row.date, row.emp_id, row.emp_name, row.department || 'General', '', '', 'NS', '00:00:00', '00:00:00',
        row.first_punch || '00:00:00', row.last_punch || '00:00:00', row.durationStr || '0hrs 0min', 0, 0, '',
        row.status === 'A' ? 'Absent' : (row.status === 'WO' ? 'WeekOff' : 'Present'),
        row.status, '', row.durationMins || 0, '', 'Unit 1', ''
      ])
    })
  }

  const lsHeaders = ['Employee Name', 'Employee Code', 'Company', 'Department', 'RHO-Balance', 'COFF-Balance', 'CL-Balance', 'PL-Balance', 'SL-Balance', 'AE-COFF-Balance', 'LOP-Balance']
  const lsAoa: any[][] = [lsHeaders]
  if (data.summary) {
    data.summary.forEach((row: any) => {
      const balances = (data.leaveBalances && data.leaveBalances[normalizeEmpId(row.emp_id)]) || {}
      lsAoa.push([
        row.emp_name,
        row.emp_id,
        balances.company || config.company_name || 'Plot 21 & 22',
        balances.department || row.department || '',
        balances.rho || 0,
        balances.coff || 0,
        balances.cl || 0,
        balances.pl || 0,
        balances.sl || 0,
        balances.ae_coff || 0,
        balances.lop || 0
      ])
    })
  }

  const ffuHeaders = ['Employee Code', 'Employee Name', 'Shift', 'Punch Date', 'In Time', 'Out Time', 'Duration', 'Status', 'Late Min', 'Early Min']
  const ffuAoa: any[][] = [ffuHeaders]
  if (data.daily) {
    data.daily.forEach((row: any) => {
      ffuAoa.push([
        row.emp_id, row.emp_name, 'General', row.date,
        row.first_punch || '00:00:00', row.last_punch || '00:00:00',
        row.durationMins || 0, row.status, 0, 0
      ])
    })
  }

  const lrHeaders = ['Unnamed: 0', 'Unnamed: 1', 'Unnamed: 2']
  const lrAoa: any[][] = [
    lrHeaders,
    [null, 'Leave allotment /month for an employee', null],
    [null, 'CL', '3 days'],
    [null, 'PL', 'Less than or equal to 10 days, Max 5 days can be granted. More than 10 days then half of PL can be given.'],
    [null, 'SL', 'Strictly for sick leaves only (Max 3 days)'],
    [null, 'Special leave', 'Maximum can be considered based on the leave balance (case to case)']
  ]

  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(matrixAoa), "Monthly_BasicReportForEmployee")
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(dailyAoa), "Attendance Export logs")
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(lsAoa), "Leave Summary")
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(ffuAoa), "File format to upload")
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(lrAoa), "Leave rules")

  XLSX.writeFile(wb, targetFileName)
}
