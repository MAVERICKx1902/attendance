import { useState, useRef, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
let xlsxModulePromise = null
const getXLSX = async () => {
  if (!xlsxModulePromise) {
    xlsxModulePromise = import('xlsx')
  }
  return await xlsxModulePromise
}
import { 
  Upload, FileSpreadsheet, Sparkles, Building2, Calendar, Clock, 
  Settings2, Download, CheckCircle2, AlertCircle, Users, Timer,
  BarChart3, FileCheck, Wand2, Layers, Cpu, Smartphone, Monitor,
  Zap, Shield, Eye, EyeOff, Save, Trash2, Plus, X, FileCode2, FolderDown,
  Folder, FileJson, Code2, Play, FolderOpen, HardDrive, Filter, Search,
  SlidersHorizontal, Check, RefreshCw, PieChart, Activity, User, HeartPulse,
  Briefcase, CheckCircle, ChevronRight, Edit3, Award, ClipboardList, PlusCircle,
  Info, ArrowDownRight, Layers3, Lock, Unlock, LogOut, LayoutGrid
} from 'lucide-react'

// --- Column Mapping Alias Heuristics ---
const COLUMN_ALIASES = {
  emp_id: ['emp id', 'employee id', 'employee code', 'emp code', 'id', 'code', 'staff id', 'card no', 'enroll', 'user id', 'emp_no'],
  emp_name: ['emp name', 'employee name', 'name', 'staff name', 'employee', 'person', 'emp_name', 'emplname'],
  date: ['date', 'punch date', 'attendance date', 'day', 'log date', 'work date', 'start date', 'end date'],
  time: ['time', 'punch time', 'log time', 'in time', 'out time', 'check time'],
  datetime: ['datetime', 'date time', 'punch datetime', 'timestamp', 'log time', 'date_time'],
  department: ['department', 'dept', 'division', 'team', 'sec', 'section']
}

function autoDetectColumns(cols) {
  const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '')
  const detected = {}
  
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

function getLocalDateString(year, month1Indexed, day) {
  const yyyy = String(year)
  const mm = String(month1Indexed).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function formatDateDMY(dateStr) {
  if (!dateStr || !dateStr.includes('-')) return dateStr
  const parts = dateStr.split('-')
  if (parts[0].length === 4) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`
  }
  return dateStr
}

function getFullMonthDates(monthStr) {
  let y = 2026, m = 8
  if (monthStr && monthStr.includes('-')) {
    const parts = monthStr.split('-')
    y = parseInt(parts[0], 10) || 2026
    m = parseInt(parts[1], 10) || 8
  }
  const daysInMonth = new Date(y, m, 0).getDate()
  const dates = []
  for (let d = 1; d <= daysInMonth; d++) {
    dates.push(getLocalDateString(y, m, d))
  }
  return dates
}

function round2(val) {
  return Math.round((val || 0) * 100) / 100
}

function parseFlexibleDate(val, timeVal = null) {
  if (val === null || val === undefined || val === '') return null
  if (val instanceof Date && !isNaN(val)) return val

  if (typeof val === 'number' || (!isNaN(val) && !String(val).includes('-') && !String(val).includes('/') && !String(val).includes(':'))) {
    const num = Number(val)
    if (num > 10000 && num < 90000) {
      const dateObj = new Date(Math.round((num - 25569) * 86400 * 1000))
      if (!isNaN(dateObj)) return dateObj
    }
  }

  const str = String(val).trim()
  if (!str) return null

  let fullStr = str
  if (timeVal && String(timeVal).trim()) {
    fullStr = `${str} ${String(timeVal).trim()}`
  }

  let parsed = new Date(fullStr)
  if (!isNaN(parsed) && parsed.getFullYear() > 2000 && parsed.getFullYear() < 2100) {
    return parsed
  }

  const dmY = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/)
  if (dmY) {
    const day = parseInt(dmY[1], 10)
    const month = parseInt(dmY[2], 10) - 1
    let year = parseInt(dmY[3], 10)
    if (year < 100) year += 2000
    const h = parseInt(dmY[4] || 0, 10)
    const m = parseInt(dmY[5] || 0, 10)
    const s = parseInt(dmY[6] || 0, 10)
    parsed = new Date(year, month, day, h, m, s)
    if (!isNaN(parsed)) return parsed
  }

  const Ymd = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/)
  if (Ymd) {
    const year = parseInt(Ymd[1], 10)
    const month = parseInt(Ymd[2], 10) - 1
    const day = parseInt(Ymd[3], 10)
    const h = parseInt(Ymd[4] || 0, 10)
    const m = parseInt(Ymd[5] || 0, 10)
    const s = parseInt(Ymd[6] || 0, 10)
    parsed = new Date(year, month, day, h, m, s)
    if (!isNaN(parsed)) return parsed
  }

  return new Date()
}

// --- SEQUENTIAL PRIORITY LEAVE DEDUCTION ALGORITHM: PL -> CL -> SL -> LWP ---
function computeSequentialLeaveDeduction(absentCount, halfCount, explicitPL = 0, explicitCL = 0, explicitSL = 0) {
  const plTotal = 12
  const clTotal = 10
  const slTotal = 8

  // Calculate unassigned absences (1.0 for full day A, 0.5 for half day HD)
  const unassignedAbsenceTotal = absentCount * 1.0 + halfCount * 0.5

  // Remaining capacity in each leave bucket after explicit allocations
  let plAvail = Math.max(plTotal - explicitPL, 0)
  let clAvail = Math.max(clTotal - explicitCL, 0)
  let slAvail = Math.max(slTotal - explicitSL, 0)

  // 1st Priority: Deduct from PL (Privilege Leave) first
  let plAuto = Math.min(unassignedAbsenceTotal, plAvail)
  let rem1 = unassignedAbsenceTotal - plAuto

  // 2nd Priority: Deduct remaining from CL (Casual Leave) second
  let clAuto = Math.min(rem1, clAvail)
  let rem2 = rem1 - clAuto

  // 3rd Priority: Deduct remaining from SL (Sick Leave) third
  let slAuto = Math.min(rem2, slAvail)
  let lwpAuto = rem2 - slAuto // Remaining unpaid leave (LWP)

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

// Generate Leave Details records matching user screenshot (emp id, emplname, leave value, leave type, start date, end date)
function buildLeaveDetailsList(matrix, allDates) {
  const leaveDetails = []
  matrix.forEach(row => {
    let empExplicitPL = 0, empExplicitCL = 0, empExplicitSL = 0
    let absentDates = []
    let halfDates = []

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
      } else if (val === 'HD' || val === '1/2P' || val === 'HALF') {
        halfDates.push(dmyDate)
      } else if (val === 'A' || val === 'ABSENT') {
        absentDates.push(dmyDate)
      }
    })

    // Automatically generate leave deduction records for absent & half days in order PL -> CL -> SL
    let plCap = Math.max(12 - empExplicitPL, 0)
    let clCap = Math.max(10 - empExplicitCL, 0)
    let slCap = Math.max(8 - empExplicitSL, 0)

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

// --- Universal Processor: Handles Matrix Sheets, Raw Logs, & Leave Sheets ---
function processExcelInBrowser(workbook, config, customMappings = {}, rawDataOverride = null) {
  let rawData = rawDataOverride || workbook?.__rawData__
  if (!rawData && workbook && workbook.Sheets) {
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    if (sheet?.__rawData__) rawData = sheet.__rawData__
  }
  if (!rawData || !rawData.length) throw new Error("Empty sheet")
  const cols = Object.keys(rawData[0])
  const detected = autoDetectColumns(cols)
  
  const mappings = { ...detected, ...customMappings }
  
  let dateColsInfo = []
  let detectedMonth = config.month || '2026-08'

  cols.forEach(colKey => {
    const colStr = String(colKey).trim()
    const dmY = colStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/)
    if (dmY) {
      const dNum = parseInt(dmY[1], 10)
      const mNum = parseInt(dmY[2], 10)
      let yNum = parseInt(dmY[3], 10)
      if (yNum < 100) yNum += 2000
      const dateStr = getLocalDateString(yNum, mNum, dNum)
      detectedMonth = `${yNum}-${String(mNum).padStart(2,'0')}`
      dateColsInfo.push({ colKey, dateStr, dayNum: dNum })
    } else {
      const dNum = parseInt(colStr, 10)
      if (!isNaN(dNum) && dNum >= 1 && dNum <= 31 && String(dNum) === colStr) {
        const [yStr, mStr] = (detectedMonth).split('-')
        const dateStr = getLocalDateString(parseInt(yStr,10), parseInt(mStr,10), dNum)
        dateColsInfo.push({ colKey, dateStr, dayNum: dNum })
      }
    }
  })

  const isMatrixSheet = dateColsInfo.length >= 4 || cols.length >= 25

  // --- BRANCH A: PRE-PIVOTED MATRIX SHEET ---
  if (isMatrixSheet) {
    const empIdCol = mappings.emp_id || cols[0]
    const empNameCol = mappings.emp_name || (cols.length > 1 ? cols[1] : empIdCol)
    const deptCol = mappings.department || null

    const dataCols = cols.filter(c => c !== empIdCol && c !== empNameCol && c !== deptCol)
    const targetMonthStr = config.month || detectedMonth || '2026-08'
    const allDates = getFullMonthDates(targetMonthStr)

    let matrix = []
    let summary = []
    let daily = []
    let cleaned = []
    let employees = []

    let totalPresent = 0, totalAbsent = 0, totalHalfDay = 0, totalHoliday = 0, totalWeekoff = 0, totalLate = 0

    rawData.forEach(row => {
      let emp_id = String(row[empIdCol] || '').trim()
      if (!emp_id || emp_id.toLowerCase() === 'nan' || emp_id.toLowerCase() === 'null') return
      if (emp_id === '1' || emp_id.toLowerCase() === 'emp id' || emp_id.toLowerCase().includes('employee')) return

      let emp_name = String(row[empNameCol] || emp_id).trim()
      let dept = deptCol ? String(row[deptCol] || 'General') : 'General'

      employees.push({ emp_id, emp_name, department: dept })

      let matrixRow = { emp_id, emp_name, department: dept }
      let present=0, absent=0, half=0, hol=0, wo=0, late=0, totalH=0
      let plCount=0, clCount=0, slCount=0

      allDates.forEach((dateStr, dayIndex) => {
        let rawVal = ''
        const matchingColInfo = dateColsInfo.find(info => info.dayNum === (dayIndex + 1))
        if (matchingColInfo && row[matchingColInfo.colKey] !== undefined) {
          rawVal = String(row[matchingColInfo.colKey]).trim().toUpperCase()
        } else if (dayIndex < dataCols.length) {
          rawVal = String(row[dataCols[dayIndex]] || '').trim().toUpperCase()
        }

        let status = 'A'

        if (rawVal === 'P' || rawVal === '1' || rawVal.includes('3/4P') || rawVal === 'PRESENT') {
          status = 'P'
          present++
          totalH += (config.full_day_hours || 8)
        } else if (rawVal === 'HD' || rawVal.includes('1/2P') || rawVal === 'HALF') {
          status = 'HD'
          half++
          totalH += (config.working_hours || 4)
        } else if (rawVal === 'WO' || rawVal === 'OFF' || rawVal === 'WEEKOFF') {
          status = 'WO'
          wo++
        } else if (rawVal === 'H' || rawVal === 'HOLIDAY') {
          status = 'H'
          hol++
        } else if (rawVal === 'PL' || rawVal === 'PAID LEAVE') {
          status = 'PL'; plCount++
        } else if (rawVal === 'CL' || rawVal === 'CASUAL LEAVE') {
          status = 'CL'; clCount++
        } else if (rawVal === 'SL' || rawVal === 'SICK LEAVE') {
          status = 'SL'; slCount++
        } else if (rawVal === 'A' || rawVal === '0' || rawVal === 'ABSENT') {
          status = 'A'
          absent++
        } else {
          const dObj = new Date(dateStr + 'T00:00:00')
          const isDefaultWeekoff = (config.weekoff || [0]).includes(dObj.getDay())
          const isHoliday = (config.holidays || []).includes(dateStr)
          if (isHoliday) { status = 'H'; hol++ }
          else if (isDefaultWeekoff) { status = 'WO'; wo++ }
          else { status = 'A'; absent++ }
        }

        matrixRow[dateStr] = status

        const dObj = new Date(dateStr + 'T00:00:00')
        daily.push({
          emp_id, emp_name, department: dept,
          date: dateStr,
          day: dObj.toLocaleDateString('en-US',{weekday:'short'}),
          first_punch: status === 'P' ? '09:00:00' : '00:00:00',
          last_punch: status === 'P' ? '18:00:00' : '00:00:00',
          punch_count: status === 'P' ? 2 : 0,
          hours: status === 'P' ? 8 : (status === 'HD' ? 4 : 0),
          status,
          late: 'No',
          is_holiday: status === 'H',
          is_weekoff: status === 'WO'
        })
      })

      matrix.push(matrixRow)

      totalPresent += present
      totalAbsent += absent
      totalHalfDay += half
      totalHoliday += hol
      totalWeekoff += wo
      totalLate += late

      // Apply Sequential Priority Deduction Rule: PL -> CL -> SL -> LWP
      const leaveCalc = computeSequentialLeaveDeduction(absent, half, plCount, clCount, slCount)

      summary.push({
        emp_id, emp_name, department: dept,
        'Total Days': allDates.length,
        'Present (P)': present,
        'Absent (A)': absent,
        'Half Day (HD)': half,
        'Holidays (H)': hol,
        'Week Off (WO)': wo,
        'PL Used': leaveCalc.plUsed,
        'CL Used': leaveCalc.clUsed,
        'SL Used': leaveCalc.slUsed,
        'LWP Used': leaveCalc.lwpUsed,
        'PL Remaining': leaveCalc.plRemaining,
        'CL Remaining': leaveCalc.clRemaining,
        'SL Remaining': leaveCalc.slRemaining,
        'Late Marks': late,
        'Total Hours': round2(totalH),
        'Avg Hours/Day': round2(totalH / Math.max(present + half, 1)),
        'Attendance %': round2((present + half * 0.5) / Math.max(allDates.length - hol - wo, 1) * 100)
      })
    })

    const leaveDetails = buildLeaveDetailsList(matrix, allDates)

    const stats = {
      totalEmployees: employees.length,
      totalPunches: daily.length,
      present: totalPresent,
      absent: totalAbsent,
      halfDay: totalHalfDay,
      holiday: totalHoliday,
      weekoff: totalWeekoff,
      lateMarks: totalLate,
      grandTotalHours: round2(totalPresent * 8 + totalHalfDay * 4),
      avgHoursPerEmp: employees.length ? round2((totalPresent * 8 + totalHalfDay * 4) / employees.length) : 0,
      overallAttendancePct: summary.length ? round2(summary.reduce((a, s) => a + s['Attendance %'], 0) / summary.length) : 0
    }

    return { cleaned, daily, matrix, summary, leaveDetails, allDates, employees, detectedCols: detected, stats }
  }

  // --- BRANCH B: RAW PUNCH LOGS SHEET ---
  const empIdCol = mappings.emp_id || cols[0]
  const empNameCol = mappings.emp_name || empIdCol
  const dateCol = mappings.date
  const timeCol = mappings.time
  const dateTimeCol = mappings.datetime
  const deptCol = mappings.department

  let cleaned = []
  for (let row of rawData) {
    let emp_id = String(row[empIdCol] || '').trim()
    if (!emp_id || emp_id.toLowerCase() === 'nan' || emp_id.toLowerCase() === 'null') continue
    let emp_name = String(row[empNameCol] || emp_id).trim()
    let dept = deptCol ? String(row[deptCol] || 'General') : 'General'
    
    let dt = null
    if (dateTimeCol && row[dateTimeCol]) {
      dt = parseFlexibleDate(row[dateTimeCol])
    } else if (dateCol && row[dateCol]) {
      dt = parseFlexibleDate(row[dateCol], timeCol ? row[timeCol] : null)
    } else if (timeCol && row[timeCol]) {
      dt = parseFlexibleDate(row[timeCol])
    }

    if (!dt || isNaN(dt)) {
      for (let c of cols) {
        if (row[c] && c !== empIdCol && c !== empNameCol) {
          const tryDt = parseFlexibleDate(row[c])
          if (tryDt && !isNaN(tryDt)) {
            dt = tryDt; break
          }
        }
      }
    }
    
    if (!dt || isNaN(dt)) dt = new Date()

    cleaned.push({ 
      emp_id, 
      emp_name, 
      department: dept, 
      punch_datetime: dt, 
      date: getLocalDateString(dt.getFullYear(), dt.getMonth()+1, dt.getDate()), 
      time: dt.toTimeString().split(' ')[0] 
    })
  }

  cleaned.sort((a,b) => a.emp_id.localeCompare(b.emp_id) || a.punch_datetime - b.punch_datetime)
  
  const holidaySet = new Set((config.holidays||[]).map(h => { try { return new Date(h).toISOString().split('T')[0] } catch { return h } }))
  const weekoff = config.weekoff || [0]
  const lateThreshold = config.late_threshold || "10:00"
  const [lateH, lateM] = lateThreshold.split(':').map(Number)

  const grouped = {}
  cleaned.forEach(r => { const key = `${r.emp_id}__${r.date}`; if (!grouped[key]) grouped[key]=[]; grouped[key].push(r) })

  let daily = []
  Object.entries(grouped).forEach(([key, punches]) => {
    punches.sort((a,b) => a.punch_datetime - b.punch_datetime)
    const first = punches[0]; const last = punches[punches.length-1]
    const dateObj = new Date(first.date)
    const hours = punches.length > 1 ? (last.punch_datetime - first.punch_datetime)/1000/3600 : 0
    const isHoliday = holidaySet.has(first.date)
    const isWeekoff = weekoff.includes(dateObj.getDay())

    let status = 'A'
    if (isHoliday) status = 'H'
    else if (isWeekoff) status = 'WO'
    else { 
      if (hours >= (config.full_day_hours||8)) status = 'P'
      else if (hours >= (config.working_hours||4)) status = 'HD'
      else if (punches.length >= 1) status = 'P' 
    }

    const firstHour = first.punch_datetime.getHours() + first.punch_datetime.getMinutes()/60
    const lateLimit = lateH + lateM/60
    const isLate = firstHour > lateLimit && !isHoliday && !isWeekoff

    daily.push({ 
      emp_id: first.emp_id, 
      emp_name: first.emp_name, 
      department: first.department, 
      date: first.date, 
      day: dateObj.toLocaleDateString('en-US',{weekday:'short'}), 
      first_punch: first.time, 
      last_punch: last.time, 
      punch_count: punches.length, 
      hours: round2(hours), 
      status, 
      late: isLate ? 'Yes' : 'No', 
      is_holiday: isHoliday, 
      is_weekoff: isWeekoff 
    })
  })

  const allDates = getFullMonthDates(config.month || detectedMonth)
  const employees = [...new Map(daily.map(d=>[d.emp_id,{emp_id:d.emp_id, emp_name:d.emp_name, department:d.department}])).values()]
  let matrix = [], summary = []
  
  let totalPresent = 0, totalAbsent = 0, totalHalfDay = 0, totalHoliday = 0, totalWeekoff = 0, totalLate = 0, grandTotalHours = 0

  employees.forEach(emp => {
    let empDaily = daily.filter(d=>d.emp_id===emp.emp_id)
    let empMap = Object.fromEntries(empDaily.map(d=>[d.date,d]))
    let row = { emp_id:emp.emp_id, emp_name:emp.emp_name, department:emp.department }
    let present=0, absent=0, half=0, hol=0, wo=0, late=0, totalH=0

    allDates.forEach(dateStr => {
      const rec = empMap[dateStr]
      if (rec) { 
        row[dateStr] = rec.status
        if (rec.status==='P') present++
        else if (rec.status==='A') absent++
        else if (rec.status==='HD') half++
        else if (rec.status==='H') hol++
        else if (rec.status==='WO') wo++
        
        if (rec.late==='Yes') late++
        totalH += rec.hours 
      } else { 
        const dObj = new Date(dateStr)
        const isH = holidaySet.has(dateStr)
        const isW = weekoff.includes(dObj.getDay())
        if (isH) { row[dateStr]='H'; hol++ } 
        else if (isW) { row[dateStr]='WO'; wo++ } 
        else { row[dateStr]='A'; absent++ } 
      }
    })

    matrix.push(row)
    
    totalPresent += present
    totalAbsent += absent
    totalHalfDay += half
    totalHoliday += hol
    totalWeekoff += wo
    totalLate += late
    grandTotalHours += totalH

    // Apply Sequential Priority Deduction Rule: PL -> CL -> SL -> LWP
    const leaveCalc = computeSequentialLeaveDeduction(absent, half, 0, 0, 0)

    summary.push({ 
      emp_id: emp.emp_id, 
      emp_name: emp.emp_name, 
      department: emp.department, 
      'Total Days': allDates.length, 
      'Present (P)': present, 
      'Absent (A)': absent, 
      'Half Day (HD)': half, 
      'Holidays (H)': hol, 
      'Week Off (WO)': wo, 
      'PL Used': leaveCalc.plUsed,
      'CL Used': leaveCalc.clUsed,
      'SL Used': leaveCalc.slUsed,
      'LWP Used': leaveCalc.lwpUsed,
      'PL Remaining': leaveCalc.plRemaining,
      'CL Remaining': leaveCalc.clRemaining,
      'SL Remaining': leaveCalc.slRemaining,
      'Late Marks': late, 
      'Total Hours': round2(totalH), 
      'Avg Hours/Day': round2(totalH / Math.max(present+half,1)), 
      'Attendance %': round2((present + half*0.5)/Math.max(allDates.length-hol-wo,1)*100) 
    })
  })

  const leaveDetails = buildLeaveDetailsList(matrix, allDates)

  const stats = {
    totalEmployees: employees.length,
    totalPunches: cleaned.length,
    present: totalPresent,
    absent: totalAbsent,
    halfDay: totalHalfDay,
    holiday: totalHoliday,
    weekoff: totalWeekoff,
    lateMarks: totalLate,
    grandTotalHours: round2(grandTotalHours),
    avgHoursPerEmp: employees.length ? round2(grandTotalHours/employees.length) : 0,
    overallAttendancePct: summary.length 
      ? round2(summary.reduce((acc, s) => acc + s['Attendance %'], 0) / summary.length) 
      : 0
  }

  return { cleaned, daily, matrix, summary, leaveDetails, allDates, employees, detectedCols: detected, stats }
}

function generateSampleWorkbook() {
  const empList = [
    { id: 'EMP1001', name: 'James Smith', dept: 'Engineering' },
    { id: 'EMP1002', name: 'Sophia Chen', dept: 'Product' },
    { id: 'EMP1003', name: 'Marcus Vance', dept: 'Design' },
    { id: 'EMP1004', name: 'Elena Rostova', dept: 'HR & Ops' },
    { id: 'EMP1005', name: 'David Miller', dept: 'Engineering' }
  ]
  
  const sampleRows = []
  const year = 2026, month = 7
  const days = 31

  for (let day = 1; day <= days; day++) {
    const dStr = getLocalDateString(year, month+1, day)
    const dateObj = new Date(year, month, day)
    const isSunday = dateObj.getDay() === 0

    if (isSunday) continue

    empList.forEach((emp, i) => {
      const isAbsent = (day === 3 && i === 0) || (day === 5 && i === 0) || (day === 13 && i === 0)
      if (isAbsent) return

      const isLate = (day % 4 === 0 && i === 0) || (day % 6 === 0 && i === 2)
      const inHour = isLate ? 10 : 9
      const inMinute = isLate ? Math.floor(Math.random()*25)+5 : Math.floor(Math.random()*15)
      const inTime = `${String(inHour).padStart(2,'0')}:${String(inMinute).padStart(2,'0')}:00`

      const outHour = 17 + (Math.random() > 0.5 ? 1 : 0)
      const outMinute = Math.floor(Math.random()*45)
      const outTime = `${String(outHour).padStart(2,'0')}:${String(outMinute).padStart(2,'0')}:00`

      sampleRows.push({
        'Emp Code': emp.id,
        'Employee Name': emp.name,
        'Department': emp.dept,
        'Punch Date': dStr,
        'Punch Time': inTime,
        'Punch DateTime': `${dStr} ${inTime}`
      })
      sampleRows.push({
        'Emp Code': emp.id,
        'Employee Name': emp.name,
        'Department': emp.dept,
        'Punch Date': dStr,
        'Punch Time': outTime,
        'Punch DateTime': `${dStr} ${outTime}`
      })
    })
  }

  const wb = { SheetNames: ['Attendance Raw'], Sheets: { 'Attendance Raw': {} }, __rawData__: sampleRows }
  return { wb, sampleRows }
}

async function exportToExcel(data, config, fileName) {
  const XLSX = await getXLSX()
  const wb = XLSX.utils.book_new()
  const configSheet = [
    { Parameter: 'Company Name', Value: config.company_name },
    { Parameter: 'Month', Value: config.month || 'Auto' },
    { Parameter: 'Python File', Value: config.python_file_name || 'Built-in' },
    { Parameter: 'Output Folder', Value: config.output_folder || 'Downloads' },
    { Parameter: 'Working Hours Threshold', Value: config.working_hours },
    { Parameter: 'Full Day Hours', Value: config.full_day_hours },
    { Parameter: 'Late Threshold', Value: config.late_threshold },
    { Parameter: 'WeekOff', Value: JSON.stringify(config.weekoff) },
    { Parameter: 'Holidays', Value: (config.holidays||[]).join(', ') },
    { Parameter: 'Deduction Rule', Value: 'Priority Order: PL -> CL -> SL -> LWP' },
    { Parameter: 'Generated On', Value: new Date().toLocaleString() },
    { Parameter: 'Total Employees', Value: data.employees.length },
    { Parameter: 'Date Range', Value: `${data.allDates[0]} to ${data.allDates[data.allDates.length-1]}` },
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(configSheet), "Config")
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.summary), "Monthly Summary")
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.leaveDetails || []), "Leave Details")
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.daily), "Daily Logs")
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.matrix), "Attendance Matrix")
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.cleaned), "Cleaned Raw")
  XLSX.writeFile(wb, fileName)
}

export default function App() {
  const [excelFile, setExcelFile] = useState(null)
  const [pythonFile, setPythonFile] = useState(null)
  const [pythonContent, setPythonContent] = useState('')
  const [workbook, setWorkbook] = useState(null)
  const [rawPreview, setRawPreview] = useState([])
  const [availableCols, setAvailableCols] = useState([])
  const [customMappings, setCustomMappings] = useState({})
  
  const [processed, setProcessed] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [dragActiveExcel, setDragActiveExcel] = useState(false)
  const [dragActivePy, setDragActivePy] = useState(false)

  // Filters & Selected Employee Modal
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDept, setSelectedDept] = useState('ALL')
  const [activeTab, setActiveTab] = useState('matrix') // matrix | leave_details | summary
  const [slideDirection, setSlideDirection] = useState(1) // 1 = right (next), -1 = left (prev)
  const [selectedEmployee, setSelectedEmployee] = useState(null)

  // Sidebar Lock & Hover Expand States
  const [isSidebarLocked, setIsSidebarLocked] = useState(() => {
    return localStorage.getItem('autocrat_sidebar_locked') === 'true'
  })
  const [isSidebarHovered, setIsSidebarHovered] = useState(false)

  const toggleSidebarLock = () => {
    setIsSidebarLocked(prev => {
      const next = !prev
      localStorage.setItem('autocrat_sidebar_locked', String(next))
      return next
    })
  }

  const isSidebarExpanded = isSidebarLocked || isSidebarHovered

  const TAB_ORDER = ['matrix', 'leave_details', 'summary']

  const changeTabWithDirection = (targetTab) => {
    const currentIndex = TAB_ORDER.indexOf(activeTab)
    const targetIndex = TAB_ORDER.indexOf(targetTab)
    if (targetIndex !== currentIndex) {
      setSlideDirection(targetIndex > currentIndex ? 1 : -1)
      setActiveTab(targetTab)
    }
  }

  const handleSwipeEnd = (event, info) => {
    const threshold = 40
    const currentIndex = TAB_ORDER.indexOf(activeTab)
    if (info.offset.x < -threshold && currentIndex < TAB_ORDER.length - 1) {
      // Swiped left -> Next tab
      changeTabWithDirection(TAB_ORDER[currentIndex + 1])
    } else if (info.offset.x > threshold && currentIndex > 0) {
      // Swiped right -> Prev tab
      changeTabWithDirection(TAB_ORDER[currentIndex - 1])
    }
  }

  // Custom Leave Entry Form inside Modal
  const [newLeaveForm, setNewLeaveForm] = useState({
    leaveType: 'PL',
    leaveValue: 1,
    startDate: '2026-08-03',
    endDate: '2026-08-03'
  })

  // Output folder
  const [outputFolder, setOutputFolder] = useState('')
  const [outputFileName, setOutputFileName] = useState('')

  const excelInputRef = useRef(null)
  const pyInputRef = useRef(null)

  const [config, setConfig] = useState({
    company_name: "Autocrat Solutions",
    month: new Date().toISOString().slice(0,7),
    working_hours: 4.0,
    full_day_hours: 8.0,
    late_threshold: "10:00",
    holidays: [],
    weekoff: [0],
    newHoliday: "",
    python_file_name: "",
    output_folder: ""
  })

  const [showSettings, setShowSettings] = useState(false)
  const [showMappingPanel, setShowMappingPanel] = useState(false)
  const [showPyPreview, setShowPyPreview] = useState(false)
  const [toast, setToast] = useState(null)

  const showToast = (msg, type='success') => { setToast({msg, type}); setTimeout(()=>setToast(null), 4000) }

  useEffect(() => {
    const timer = setTimeout(() => {
      loadSampleData(true)
    }, 0)
    return () => clearTimeout(timer)
  }, [])

  const handleExcelFile = async (f) => {
    if (!f) return
    setExcelFile(f)
    setOutputFileName(`${config.company_name.replace(/\s+/g,'_')}_Attendance_${config.month}.xlsx`)
    try {
      const XLSX = await getXLSX()
      const buf = await f.arrayBuffer()
      const wb = XLSX.read(buf, { cellDates: true, dateNF: 'yyyy-mm-dd hh:mm:ss' })
      const sheet = wb.Sheets[wb.SheetNames[0]]
      const json = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false })
      wb.__rawData__ = json
      setWorkbook(wb)
      if (json.length > 0) {
        const cols = Object.keys(json[0])
        setAvailableCols(cols)
        setRawPreview(json.slice(0, 20))
        const detected = autoDetectColumns(cols)
        setCustomMappings(detected)
        
        const result = processExcelInBrowser(wb, config, detected, json)
        setProcessed(result)
        showToast(`📊 Processed ${result.employees.length} employees from ${f.name}`)
      } else {
        showToast("Excel sheet contains no data rows", 'error')
      }
    } catch (e) {
      showToast("Failed to read Excel file: "+e.message, 'error')
    }
  }

  const removeExcelFile = () => {
    setExcelFile(null)
    setWorkbook(null)
    setRawPreview([])
    setProcessed(null)
    setAvailableCols([])
    setCustomMappings({})
    setSelectedEmployee(null)
    if (excelInputRef.current) excelInputRef.current.value = ''
    showToast("Excel file detached", 'success')
  }

  const removePythonFile = () => {
    setPythonFile(null)
    setPythonContent('')
    setShowPyPreview(false)
    setConfig(prev => ({...prev, python_file_name: ""}))
    if (pyInputRef.current) pyInputRef.current.value = ''
    showToast("Python converter file detached — using built-in processor", 'success')
  }

  const loadSampleData = (silent = false) => {
    try {
      const { wb, sampleRows } = generateSampleWorkbook()
      setWorkbook(wb)
      setExcelFile({ name: 'sample.xlsx (Demo)', size: 12673 })
      setOutputFileName(`${config.company_name.replace(/\s+/g,'_')}_Attendance_${config.month}.xlsx`)
      const cols = Object.keys(sampleRows[0])
      setAvailableCols(cols)
      setRawPreview(sampleRows.slice(0, 20))
      const detected = autoDetectColumns(cols)
      setCustomMappings(detected)
      
      const result = processExcelInBrowser(wb, config, detected)

      setProcessed(result)
      if (!silent) showToast("⚡ Loaded Attendance Data with Priority Leave Deduction Rule (PL -> CL -> SL)", 'success')
    } catch (e) {
      if (!silent) showToast("Sample generation failed: "+e.message, 'error')
    }
  }

  const handleSelectPyFile = async () => {
    if (window.pywebview?.api?.select_python_file) {
      try {
        const filePath = await window.pywebview.api.select_python_file()
        if (filePath) {
          const fileName = filePath.split(/[\\/]/).pop()
          setPythonFile({ name: fileName, path: filePath, size: 2048 })
          setConfig(prev => ({...prev, python_file_name: fileName, python_path: filePath}))
          const readRes = await window.pywebview.api.read_python_file(filePath)
          if (readRes?.success) {
            setPythonContent(readRes.content)
            setShowPyPreview(false)
          }
          showToast(`🐍 Selected Python script: ${fileName} (Code preview hidden by default)`)
          return
        }
      } catch (err) {
        console.warn("PyWebView select_python_file:", err)
      }
    }
    pyInputRef.current?.click()
  }

  const handleSelectExcelFile = async () => {
    if (window.pywebview?.api?.select_excel_file) {
      try {
        const filePath = await window.pywebview.api.select_excel_file()
        if (filePath) {
          const fileName = filePath.split(/[\\/]/).pop()
          showToast(`📊 Selected Excel File: ${fileName}`)
          setConfig(prev => ({...prev, excel_path: filePath}))
          return
        }
      } catch (err) {
        console.warn("PyWebView select_excel_file:", err)
      }
    }
    excelInputRef.current?.click()
  }

  const handlePythonFile = async (f) => {
    if (!f) return
    if (!f.name.endsWith('.py')) { showToast("Please upload a .py file", 'error'); return }
    setPythonFile(f)
    setConfig(prev => ({...prev, python_file_name: f.name}))
    try {
      const text = await f.text()
      setPythonContent(text.slice(0, 15000))
      setShowPyPreview(false)
      showToast(`🐍 Attached Python Converter: ${f.name} (Code preview hidden by default)`)
    } catch (e) {
      showToast("Failed to read Python file: "+e.message, 'error')
    }
  }

  const onDropExcel = (e) => { e.preventDefault(); setDragActiveExcel(false); const f=e.dataTransfer.files?.[0]; if(f) handleExcelFile(f) }
  const onDropPy = (e) => { e.preventDefault(); setDragActivePy(false); const f=e.dataTransfer.files?.[0]; if(f) handlePythonFile(f) }

  const selectOutputFolder = async () => {
    if (window.pywebview?.api?.select_folder) {
      try {
        const folder = await window.pywebview.api.select_folder()
        if (folder) {
          setOutputFolder(folder)
          setConfig(prev => ({...prev, output_folder: folder}))
          showToast(`📁 Output folder set: ${folder}`)
          return
        }
      } catch (e) {
        console.warn("PyWebView folder selection:", e)
      }
    }

    if (window.showDirectoryPicker) {
      try {
        const handle = await window.showDirectoryPicker()
        if (handle && handle.name) {
          setOutputFolder(handle.name)
          setConfig(prev => ({...prev, output_folder: handle.name}))
          showToast(`📁 Output folder selected: ${handle.name}`)
          return
        }
      } catch (err) {
        if (err.name !== 'AbortError') console.warn(err)
      }
    }

    const input = document.createElement('input')
    input.type = 'file'
    input.webkitdirectory = true
    input.onchange = (e) => {
      if (e.target.files && e.target.files.length > 0) {
        const folderPath = e.target.files[0].webkitRelativePath.split('/')[0]
        setOutputFolder(folderPath)
        setConfig(prev => ({...prev, output_folder: folderPath}))
        showToast(`📁 Output folder set: ${folderPath}`)
      }
    }
    input.click()
  }

  const selectSaveLocation = async () => {
    const defaultName = outputFileName || `${config.company_name.replace(/\s+/g,'_')}_Attendance_${config.month || 'Output'}.xlsx`
    if (window.pywebview?.api?.select_save) {
      try {
        const fullPath = await window.pywebview.api.select_save(defaultName)
        if (fullPath) {
          const sep = fullPath.includes('\\') ? '\\' : '/'
          const parts = fullPath.split(sep)
          const fileName = parts.pop()
          const folderPath = parts.join(sep)
          
          if (folderPath) setOutputFolder(folderPath)
          if (fileName) setOutputFileName(fileName)
          setConfig(prev => ({...prev, output_folder: folderPath, output_file_name: fileName}))
          showToast(`💾 Save Location & File set: ${fileName} in ${folderPath}`)
          return
        }
      } catch (err) {
        console.warn("PyWebView select_save:", err)
      }
    }
    selectOutputFolder()
  }

  const openFolderNative = async () => {
    if (window.pywebview && window.pywebview.api && window.pywebview.api.open_output_folder) {
      try {
        const res = await window.pywebview.api.open_output_folder(outputFolder)
        if (res.success) showToast(`📂 Opened folder: ${res.path}`)
        else showToast(`Folder error: ${res.error}`, 'error')
      } catch (e) {
        showToast(`Failed to open folder: ${e.message}`, 'error')
      }
    } else {
      showToast(`📁 Output folder: ${outputFolder || 'Downloads'}`, 'success')
    }
  }

  const processNow = async () => {
    if (!workbook && !config.excel_path) { showToast("Upload or select an Excel file first (Input 1)", 'error'); return }

    const targetFileName = (outputFileName && outputFileName.trim()) 
      ? (outputFileName.trim().endsWith('.xlsx') ? outputFileName.trim() : `${outputFileName.trim()}.xlsx`)
      : `${config.company_name.replace(/\s+/g,'_')}_Attendance_${config.month || 'Output'}.xlsx`

    setIsProcessing(true)
    try {
      // If Python backend is available via PyWebView
      if (window.pywebview?.api?.process_with_custom_python && config.excel_path) {
        const pyRes = await window.pywebview.api.process_with_custom_python({
          excel_path: config.excel_path,
          python_path: config.python_path,
          output_folder: outputFolder,
          file_name: targetFileName,
          company_name: config.company_name,
          month: config.month,
          working_hours: config.working_hours,
          full_day_hours: config.full_day_hours,
          late_threshold: config.late_threshold,
          holidays: config.holidays,
          weekoff: config.weekoff
        })

        if (pyRes?.success) {
          showToast(`✅ Processed & saved: ${pyRes.output_path}`, 'success')
          if (workbook) {
            const res = processExcelInBrowser(workbook, config, customMappings)
            setProcessed(res)
          }
          return
        }
      }

      // Browser fallback engine
      if (workbook) {
        await new Promise(r => setTimeout(r, 300))
        const result = processExcelInBrowser(workbook, {...config, python_file_name: pythonFile?.name || 'Built-in', output_folder: outputFolder || 'Downloads'}, customMappings)
        setProcessed(result)
        exportToExcel(result, {...config, python_file_name: pythonFile?.name || 'Built-in'}, targetFileName)
        showToast(`✅ Processed & Saved: ${targetFileName} to ${outputFolder || 'Downloads folder'}!`, 'success')
      }
    } catch (e) {
      showToast("Processing failed: "+e.message, 'error')
    } finally {
      setIsProcessing(false)
    }
  }

  const downloadResult = () => {
    if (!processed) return
    const finalFileName = outputFileName || `${config.company_name.replace(/\s+/g,'_')}_Attendance_${config.month || 'Full'}.xlsx`
    exportToExcel(processed, {...config, python_file_name: pythonFile?.name || 'Built-in', output_folder: outputFolder || 'Downloads'}, finalFileName)
    showToast(`💾 Generated & Downloaded ${finalFileName} (5 Sheets including Leave Details)`)
  }

  const filteredMatrix = useMemo(() => {
    if (!processed) return []
    return processed.matrix.filter(row => {
      const matchSearch = searchQuery === '' || 
        row.emp_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        row.emp_id.toLowerCase().includes(searchQuery.toLowerCase())
      const matchDept = selectedDept === 'ALL' || row.department === selectedDept
      return matchSearch && matchDept
    })
  }, [processed, searchQuery, selectedDept])

  const filteredLeaveDetails = useMemo(() => {
    if (!processed || !processed.leaveDetails) return []
    return processed.leaveDetails.filter(r => {
      const matchSearch = searchQuery === '' || 
        r['emplname'].toLowerCase().includes(searchQuery.toLowerCase()) || 
        r['emp id'].toLowerCase().includes(searchQuery.toLowerCase())
      const matchDept = selectedDept === 'ALL' || r['department'] === selectedDept
      return matchSearch && matchDept
    })
  }, [processed, searchQuery, selectedDept])

  const departments = useMemo(() => {
    if (!processed) return ['ALL']
    const set = new Set(processed.employees.map(e => e.department))
    return ['ALL', ...Array.from(set)]
  }, [processed])

  // Get employee detailed statistics — Direct Authoritative Single Source of Truth
  const empDetails = useMemo(() => {
    if (!selectedEmployee || !processed) return null
    const summaryRow = processed.summary.find(s => s.emp_id === selectedEmployee.emp_id) || {}
    const empDaily = processed.daily.filter(d => d.emp_id === selectedEmployee.emp_id)
    const empLeaveRecords = (processed.leaveDetails || []).filter(r => r['emp id'] === selectedEmployee.emp_id)

    const plTotal = 12
    const clTotal = 10
    const slTotal = 8

    // Read single-source of truth computed during processExcelInBrowser to avoid double counting
    const plUsed = summaryRow['PL Used'] !== undefined ? summaryRow['PL Used'] : 0
    const clUsed = summaryRow['CL Used'] !== undefined ? summaryRow['CL Used'] : 0
    const slUsed = summaryRow['SL Used'] !== undefined ? summaryRow['SL Used'] : 0
    const lwpUsed = summaryRow['LWP Used'] !== undefined ? summaryRow['LWP Used'] : 0

    const plRemaining = summaryRow['PL Remaining'] !== undefined ? summaryRow['PL Remaining'] : Math.max(plTotal - plUsed, 0)
    const clRemaining = summaryRow['CL Remaining'] !== undefined ? summaryRow['CL Remaining'] : Math.max(clTotal - clUsed, 0)
    const slRemaining = summaryRow['SL Remaining'] !== undefined ? summaryRow['SL Remaining'] : Math.max(slTotal - slUsed, 0)

    const unassignedAbsenceTotal = round2((summaryRow['Absent (A)'] || 0) * 1.0 + (summaryRow['Half Day (HD)'] || 0) * 0.5)

    return {
      summaryRow,
      empDaily,
      empLeaveRecords,
      deduction: {
        unassignedAbsenceTotal,
        plAutoDeduct: plUsed,
        clAutoDeduct: clUsed,
        slAutoDeduct: slUsed
      },
      plTotal,
      clTotal,
      slTotal,
      plUsed,
      clUsed,
      slUsed,
      lwpUsed,
      plRemaining,
      clRemaining,
      slRemaining
    }
  }, [selectedEmployee, processed])

  const addManualLeaveEntry = () => {
    if (!selectedEmployee || !processed) return
    const { leaveType, leaveValue, startDate, endDate } = newLeaveForm
    const dmyStart = formatDateDMY(startDate)

    const newRecord = {
      'emp id': selectedEmployee.emp_id,
      'emplname': selectedEmployee.emp_name,
      'leave value': Number(leaveValue),
      'leave type': leaveType,
      'start date': dmyStart,
      'end date': dmyStart,
      'department': selectedEmployee.department || 'General',
      isExplicit: true
    }

    const updatedLeaveDetails = [...(processed.leaveDetails || []), newRecord]

    const updatedMatrix = processed.matrix.map(row => {
      if (row.emp_id === selectedEmployee.emp_id) {
        return { ...row, [startDate]: leaveType }
      }
      return row
    })

    setProcessed(prev => {
      const nextMatrix = updatedMatrix
      const nextLeaveDetails = buildLeaveDetailsList(nextMatrix, prev.allDates)
      
      // Update summary for selected employee
      const nextSummary = prev.summary.map(s => {
        if (s.emp_id === selectedEmployee.emp_id) {
          let plCount = s['PL Used'], clCount = s['CL Used'], slCount = s['SL Used']
          if (leaveType === 'PL') plCount += Number(leaveValue)
          else if (leaveType === 'CL') clCount += Number(leaveValue)
          else if (leaveType === 'SL') slCount += Number(leaveValue)

          return {
            ...s,
            'PL Used': plCount,
            'CL Used': clCount,
            'SL Used': slCount,
            'PL Remaining': Math.max(12 - plCount, 0),
            'CL Remaining': Math.max(10 - clCount, 0),
            'SL Remaining': Math.max(8 - slCount, 0),
          }
        }
        return s
      })

      return {
        ...prev,
        matrix: nextMatrix,
        summary: nextSummary,
        leaveDetails: nextLeaveDetails
      }
    })

    showToast(`➕ Logged ${leaveValue} ${leaveType} leave for ${selectedEmployee.emp_name} on ${dmyStart}`)
  }

  const tabOptions = [
    { id: 'matrix', label: 'Daily Matrix' },
    { id: 'leave_details', label: `📋 Leave Details (${processed?.leaveDetails?.length || 0})` },
    { id: 'summary', label: 'Summary Stats' }
  ]

  return (
    <div className="erp-bg min-h-screen flex text-slate-800 font-sans selection:bg-blue-600/30 selection:text-blue-900 bg-[#f8fafc] overflow-x-hidden">
      {/* --- COLLAPSIBLE & LOCKABLE LEFT NAVIGATION SIDEBAR WITH SMOOTH FADE & SLIDE --- */}
      <motion.aside 
        onMouseEnter={() => setIsSidebarHovered(true)}
        onMouseLeave={() => setIsSidebarHovered(false)}
        animate={{ width: isSidebarExpanded ? 260 : 72 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="fixed top-0 left-0 bottom-0 z-40 bg-white border-r border-slate-200 flex flex-col justify-between shadow-xl overflow-hidden"
      >
        <div>
          {/* Top Brand Header matching user images (#28267f) */}
          <div className="bg-[#28267f] text-white p-3 flex items-center justify-between min-h-[64px] border-b border-white/10 relative overflow-hidden">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 rounded-xl bg-white p-1 flex items-center justify-center shadow-md flex-shrink-0">
                <img src="/autocrat-logo.svg" alt="Autocrat Logo" className="w-full h-full object-contain" />
              </div>
              <AnimatePresence>
                {isSidebarExpanded && (
                  <motion.div 
                    initial={{ opacity: 0, x: -12 }} 
                    animate={{ opacity: 1, x: 0 }} 
                    exit={{ opacity: 0, x: -12 }} 
                    transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                    className="whitespace-nowrap overflow-hidden"
                  >
                    <h1 className="font-extrabold text-[14px] leading-tight text-white tracking-wide uppercase">AUTOCRAT</h1>
                    <p className="text-[10px] text-blue-200 font-bold tracking-wider uppercase">Attendance System</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Lock / Pin Toggle Button */}
            <AnimatePresence>
              {isSidebarExpanded && (
                <motion.button 
                  initial={{ opacity: 0, scale: 0.8 }} 
                  animate={{ opacity: 1, scale: 1 }} 
                  exit={{ opacity: 0, scale: 0.8 }} 
                  transition={{ duration: 0.2 }}
                  onClick={toggleSidebarLock}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors flex-shrink-0 ${
                    isSidebarLocked ? 'bg-amber-400 text-slate-900 shadow-sm' : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                  title={isSidebarLocked ? "Sidebar Locked Open (Click to unlock)" : "Lock Sidebar Open (Pin expanded)"}
                >
                  {isSidebarLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* Navigation Menu List */}
          <nav className="py-3 space-y-1">
            {/* 1. Dashboard (Matrix) */}
            <button
              onClick={() => changeTabWithDirection('matrix')}
              className={`w-full flex items-center gap-3.5 px-4 py-3 text-left transition-all ${
                activeTab === 'matrix' ? 'erp-nav-item active' : 'erp-nav-item'
              }`}
              title="Dashboard & Attendance Matrix"
            >
              <div className="w-6 flex items-center justify-center flex-shrink-0">
                <LayoutGrid className="w-5 h-5" />
              </div>
              <AnimatePresence>
                {isSidebarExpanded && (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }} 
                    animate={{ opacity: 1, x: 0 }} 
                    exit={{ opacity: 0, x: -10 }} 
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    className="flex-1 min-w-0 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-[13px] font-semibold leading-none">Dashboard</div>
                      <div className="text-[10px] text-slate-400 mt-1 font-normal">Attendance Matrix & Logs</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 opacity-60" />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>

            {/* 2. Leave Details */}
            <button
              onClick={() => changeTabWithDirection('leave_details')}
              className={`w-full flex items-center gap-3.5 px-4 py-3 text-left transition-all ${
                activeTab === 'leave_details' ? 'erp-nav-item active' : 'erp-nav-item'
              }`}
              title="Leave Details & Anomaly Logs"
            >
              <div className="w-6 flex items-center justify-center flex-shrink-0 relative">
                <Clock className="w-5 h-5" />
                {processed?.leaveDetails?.length > 0 && !isSidebarExpanded && (
                  <span className="absolute -top-1 -right-1.5 w-4 h-4 rounded-full bg-amber-500 text-slate-900 font-extrabold text-[9px] flex items-center justify-center">
                    {processed.leaveDetails.length}
                  </span>
                )}
              </div>
              <AnimatePresence>
                {isSidebarExpanded && (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }} 
                    animate={{ opacity: 1, x: 0 }} 
                    exit={{ opacity: 0, x: -10 }} 
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    className="flex-1 min-w-0 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-[13px] font-semibold leading-none flex items-center gap-1.5">
                        <span>Leave Details</span>
                        {processed?.leaveDetails?.length > 0 && (
                          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-400 text-slate-900 font-extrabold">
                            {processed.leaveDetails.length}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1 font-normal">HR Leave Records & Deductions</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 opacity-60" />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>

            {/* 3. Summary Stats */}
            <button
              onClick={() => changeTabWithDirection('summary')}
              className={`w-full flex items-center gap-3.5 px-4 py-3 text-left transition-all ${
                activeTab === 'summary' ? 'erp-nav-item active' : 'erp-nav-item'
              }`}
              title="Summary Stats & Monthly Aggregates"
            >
              <div className="w-6 flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <AnimatePresence>
                {isSidebarExpanded && (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }} 
                    animate={{ opacity: 1, x: 0 }} 
                    exit={{ opacity: 0, x: -10 }} 
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    className="flex-1 min-w-0 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-[13px] font-semibold leading-none">Summary Stats</div>
                      <div className="text-[10px] text-slate-400 mt-1 font-normal">Employee Totals & Pct</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 opacity-60" />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>

            <div className="my-2 border-t border-slate-100 mx-3"></div>

            {/* 4. Column Mapping */}
            <button
              onClick={() => setShowMappingPanel(!showMappingPanel)}
              className={`w-full flex items-center gap-3.5 px-4 py-3 text-left transition-all ${
                showMappingPanel ? 'erp-nav-item active' : 'erp-nav-item'
              }`}
              title="Configure Column Mapping"
            >
              <div className="w-6 flex items-center justify-center flex-shrink-0">
                <SlidersHorizontal className="w-5 h-5" />
              </div>
              <AnimatePresence>
                {isSidebarExpanded && (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }} 
                    animate={{ opacity: 1, x: 0 }} 
                    exit={{ opacity: 0, x: -10 }} 
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    className="flex-1 min-w-0 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-[13px] font-semibold leading-none">Column Mapping</div>
                      <div className="text-[10px] text-slate-400 mt-1 font-normal">Auto-detect & Presets</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 opacity-60" />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>

            {/* 5. HR Config & Rules */}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`w-full flex items-center gap-3.5 px-4 py-3 text-left transition-all ${
                showSettings ? 'erp-nav-item active' : 'erp-nav-item'
              }`}
              title="Configure HR Rules & Working Hours"
            >
              <div className="w-6 flex items-center justify-center flex-shrink-0">
                <Settings2 className="w-5 h-5" />
              </div>
              <AnimatePresence>
                {isSidebarExpanded && (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }} 
                    animate={{ opacity: 1, x: 0 }} 
                    exit={{ opacity: 0, x: -10 }} 
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    className="flex-1 min-w-0 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-[13px] font-semibold leading-none">Config & Rules</div>
                      <div className="text-[10px] text-slate-400 mt-1 font-normal">HR Policies & Holidays</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 opacity-60" />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>

            {/* 6. Open Folder */}
            <button
              onClick={openFolderNative}
              className="w-full flex items-center gap-3.5 px-4 py-3 text-left erp-nav-item"
              title="Open Output Destination Folder"
            >
              <div className="w-6 flex items-center justify-center flex-shrink-0">
                <FolderOpen className="w-5 h-5" />
              </div>
              <AnimatePresence>
                {isSidebarExpanded && (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }} 
                    animate={{ opacity: 1, x: 0 }} 
                    exit={{ opacity: 0, x: -10 }} 
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    className="flex-1 min-w-0 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-[13px] font-semibold leading-none">Open Folder</div>
                      <div className="text-[10px] text-slate-400 mt-1 font-normal">Explore Output Files</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 opacity-60" />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </nav>
        </div>

        {/* Bottom Profile Section matching Image 2 & 3 */}
        <div className="border-t border-slate-200 p-3 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#28267f] text-white flex items-center justify-center font-extrabold text-[13px] shadow-sm flex-shrink-0">
              P
            </div>
            <AnimatePresence>
              {isSidebarExpanded && (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }} 
                  animate={{ opacity: 1, x: 0 }} 
                  exit={{ opacity: 0, x: -10 }} 
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden min-w-0 flex-1"
                >
                  <div className="text-[12px] font-bold text-slate-900 truncate">supervisor@autocrat.com</div>
                  <div className="text-[10px] text-amber-600 font-semibold uppercase tracking-wider">Supervisor</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <AnimatePresence>
            {isSidebarExpanded && (
              <motion.button 
                initial={{ opacity: 0, y: 6 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: 6 }} 
                transition={{ duration: 0.2 }}
                onClick={() => showToast("Supervisor session active", "info")}
                className="mt-3 w-full border border-slate-300 rounded-xl py-2 px-3 bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5 text-slate-500" />
                <span>Sign Out</span>
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </motion.aside>

      {/* --- MAIN WORKSPACE CONTAINER WITH SMOOTH MARGIN SLIDE --- */}
      <motion.div 
        animate={{ marginLeft: isSidebarExpanded ? 260 : 72 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="flex-1 flex flex-col min-w-0"
      >
        {/* Top Header Action Bar */}
        <header className="material-header sticky top-0 z-30 px-6 py-3 flex items-center justify-between border-b border-white/20 bg-[#28267f]/90 backdrop-blur-md shadow-md text-white">
          <div className="flex items-center gap-3">
            <h2 className="font-bold text-[15px] tracking-wide uppercase">AUTOCRAT ATTENDANCE</h2>
            <span className="text-[11px] bg-white/10 border border-white/20 px-2.5 py-0.5 rounded-full text-blue-200 font-mono">v0.0.1</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-300/40 text-emerald-200 text-[11px] font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
              <span>AUTHENTICATED</span>
            </div>
          </div>
        </header>

        <main className="p-6 space-y-6 w-full flex-1 min-w-0">
          {/* 4 Metric KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div 
              onClick={() => changeTabWithDirection('summary')}
              className="material-card material-card-hover p-5 flex items-center justify-between cursor-pointer bg-white border border-slate-200 shadow-sm"
            >
              <div>
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">TOTAL EMPLOYEES</div>
                <div className="text-[28px] font-bold text-slate-900 mt-1">{processed?.summary?.length || 5}</div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-200">
                <Users className="w-6 h-6" />
              </div>
            </div>

            <div 
              onClick={() => changeTabWithDirection('leave_details')}
              className="material-card material-card-hover p-5 flex items-center justify-between cursor-pointer border-l-4 border-l-amber-500 bg-white border border-slate-200 shadow-sm"
            >
              <div>
                <div className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-600" /> LEAVE ANOMALIES
                </div>
                <div className="text-[28px] font-bold text-amber-600 mt-1">{processed?.leaveDetails?.length || 14}</div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 border border-amber-200">
                <AlertCircle className="w-6 h-6" />
              </div>
            </div>

            <div 
              onClick={() => changeTabWithDirection('matrix')}
              className="material-card material-card-hover p-5 flex items-center justify-between cursor-pointer bg-white border border-slate-200 shadow-sm"
            >
              <div>
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">PRESENT / HEALTHY</div>
                <div className="text-[28px] font-bold text-emerald-600 mt-1">{processed?.summary?.filter(e=>e.present_days>0)?.length || 100}</div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-200">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </div>

            <div 
              onClick={() => changeTabWithDirection('matrix')}
              className="material-card material-card-hover p-5 flex items-center justify-between cursor-pointer bg-white border border-slate-200 shadow-sm"
            >
              <div>
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">TOTAL WORKING HOURS</div>
                <div className="text-[28px] font-bold text-cyan-600 mt-1">{processed?.meta?.total_working_hours || "8,402"} <span className="text-[14px] text-slate-400 font-normal">hrs</span></div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-cyan-50 flex items-center justify-center text-cyan-600 border border-cyan-200">
                <BarChart3 className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Quick Access & Output Folder Selection Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Card 1: Input 1 Excel */}
            <div className="material-card p-5 space-y-4 bg-white border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-[12px] font-bold flex items-center justify-center">1</span>
                  <h3 className="font-semibold text-slate-900 text-[14px]">Excel Attendance Input</h3>
                </div>
                <span className="text-[10px] bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-slate-600 font-mono">.XLSX</span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-3">
                {excelFile ? (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[12px]">
                    <div className="flex items-center gap-2 truncate">
                      <FileSpreadsheet className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                      <span className="truncate font-medium">{excelFile.name}</span>
                    </div>
                    <button onClick={removeExcelFile} className="text-slate-400 hover:text-slate-700 p-1">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="text-slate-500 text-[12px]">No file loaded (Sample active)</div>
                )}

                <button onClick={handleSelectExcelFile} className="w-full material-btn py-2 text-[12px] flex items-center justify-center gap-2">
                  <Upload className="w-3.5 h-3.5 text-blue-600" /> Select Excel in Explorer
                </button>
                <input ref={excelInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={e=>handleExcelFile(e.target.files[0])} />
              </div>
            </div>

            {/* Card 2: Input 2 Python Script */}
            <div className="material-card p-5 space-y-4 bg-white border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-cyan-600 text-white text-[12px] font-bold flex items-center justify-center">2</span>
                  <h3 className="font-semibold text-slate-900 text-[14px]">Python Converter Script</h3>
                </div>
                <span className="text-[10px] bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-slate-600 font-mono">.PY</span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-3">
                {pythonFile ? (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-cyan-50 border border-cyan-200 text-cyan-800 text-[12px]">
                    <div className="flex items-center gap-2 truncate">
                      <FileCode2 className="w-4 h-4 flex-shrink-0 text-cyan-600" />
                      <span className="truncate font-medium">{pythonFile.name}</span>
                    </div>
                    <button onClick={removePythonFile} className="text-slate-400 hover:text-slate-700 p-1">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="text-slate-500 text-[12px]">Default Built-in Processor</div>
                )}

                <div className="flex items-center gap-2">
                  <button onClick={handleSelectPyFile} className="flex-1 material-btn py-2 text-[12px] flex items-center justify-center gap-2">
                    <Code2 className="w-3.5 h-3.5 text-cyan-600" /> Select Script
                  </button>
                  {pythonContent && (
                    <button 
                      onClick={() => setShowPyPreview(!showPyPreview)} 
                      className={`px-3 py-2 rounded-xl text-[12px] font-medium border transition-all flex items-center gap-1.5 whitespace-nowrap ${
                        showPyPreview ? 'bg-cyan-50 text-cyan-800 border-cyan-300' : 'material-btn text-slate-700'
                      }`}
                      title={showPyPreview ? "Hide Python script code" : "Click to view Python script code"}
                    >
                      {showPyPreview ? <EyeOff className="w-3.5 h-3.5 text-cyan-700" /> : <Eye className="w-3.5 h-3.5 text-cyan-600" />}
                      <span>{showPyPreview ? "Hide Code" : "View Code"}</span>
                    </button>
                  )}
                </div>
                <input ref={pyInputRef} type="file" accept=".py" className="hidden" onChange={e=>handlePythonFile(e.target.files[0])} />
              </div>
            </div>

            {/* Card 3: Output Storage Location & File Name */}
            <div className="material-card p-5 space-y-4 border-l-4 border-l-blue-600 bg-white border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-[12px] font-bold flex items-center justify-center">3</span>
                  <h3 className="font-semibold text-slate-900 text-[14px]">Output Location & File</h3>
                </div>
                <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-mono font-bold">EXPLORER</span>
              </div>

              <div className="space-y-3">
                {/* Single Combined Save As Destination & File Name Picker */}
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-600 font-medium flex items-center justify-between">
                    <span>Target Output File (.xlsx):</span>
                    <span className="text-[10px] text-emerald-600 font-mono font-bold">Native Save As</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="text" 
                      value={outputFileName || `${config.company_name.replace(/\s+/g,'_')}_Attendance_${config.month}.xlsx`} 
                      onChange={e => setOutputFileName(e.target.value)}
                      className="material-input flex-1 text-[12px] font-mono text-emerald-800 font-semibold bg-white border-slate-300"
                      placeholder="e.g. Attendance_August_Report.xlsx"
                    />
                    <button 
                      onClick={selectSaveLocation}
                      title="Choose Save Folder & File Name in Windows Explorer" 
                      className="material-btn-primary px-3.5 py-2 text-[12px] flex items-center gap-1.5 whitespace-nowrap font-medium"
                    >
                      <Save className="w-4 h-4" /> Save As...
                    </button>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono truncate pt-0.5">
                    📁 Destination: <span className="text-slate-800 font-semibold">{outputFolder ? `${outputFolder}\\${outputFileName || 'output.xlsx'}` : `Default Directory\\${outputFileName || 'output.xlsx'}`}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1">
                  <button onClick={openFolderNative} className="material-btn flex-1 py-2 text-[12px] flex items-center justify-center gap-1.5">
                    <FolderOpen className="w-3.5 h-3.5 text-cyan-600" /> Open Folder
                  </button>
                  
                  <button onClick={processNow} disabled={(!workbook && !config.excel_path) || isProcessing} className="material-btn-success flex-1 py-2 text-[12px] flex items-center justify-center gap-1.5 font-semibold">
                    <Play className="w-3.5 h-3.5 fill-current" /> Process & Save
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* CODE PREVIEW DRAWER */}
          <AnimatePresence>
            {showPyPreview && pythonContent && (
              <motion.div 
                initial={{ opacity: 0, height: 0, scaleY: 0.95 }} 
                animate={{ opacity: 1, height: 'auto', scaleY: 1 }} 
                exit={{ opacity: 0, height: 0, scaleY: 0.95 }} 
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="bg-slate-900 rounded-[24px] overflow-hidden shadow-2xl origin-top border border-slate-800 text-slate-100"
              >
                <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-cyan-400">
                      <FileCode2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[13px] text-white flex items-center gap-2">
                        {pythonFile?.name} <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded-full font-mono text-cyan-300">Python Engine Preview</span>
                      </h3>
                      <p className="text-[11px] text-slate-400">Attached backend converter script preview</p>
                    </div>
                  </div>
                  <button 
                    onClick={()=>setShowPyPreview(false)} 
                    className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-5 max-h-[340px] overflow-auto bg-slate-900">
                  <pre className="text-[11px] font-mono text-slate-200 leading-relaxed whitespace-pre-wrap selection:bg-blue-600/40">{pythonContent}</pre>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Column Mapping Drawer / Modal */}
          <AnimatePresence>
            {showMappingPanel && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-white rounded-[24px] p-5 space-y-4 border border-slate-200 shadow-lg text-slate-800">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-blue-600" />
                    <h3 className="font-semibold text-[14px] text-slate-900">Excel Column Mapping Auto-Detection</h3>
                  </div>
                  <button onClick={()=>setShowMappingPanel(false)} className="text-slate-400 hover:text-slate-700"><X className="w-4 h-4" /></button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.entries({
                    emp_id: 'Employee ID',
                    emp_name: 'Employee Name',
                    date: 'Punch Date',
                    time: 'Punch Time',
                    datetime: 'Punch DateTime',
                    department: 'Department'
                  }).map(([key, label]) => (
                    <div key={key} className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                      <label className="text-[10px] text-slate-500 uppercase font-mono block mb-1 font-bold">{label}</label>
                      <select 
                        value={customMappings[key] || ''} 
                        onChange={(e) => {
                          const updated = { ...customMappings, [key]: e.target.value }
                          setCustomMappings(updated)
                          if (workbook) {
                            const res = processExcelInBrowser(workbook, config, updated)
                            setProcessed(res)
                          }
                        }}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-[11px] text-slate-900 outline-none focus:border-blue-500"
                      >
                        <option value="" className="bg-white text-slate-900">-- None / Auto --</option>
                        {availableCols.map(col => (
                          <option key={col} value={col} className="bg-white text-slate-900">{col}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Real-time Statistics Counter Cards */}
          {processed && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-12 gap-4">
              <div className="col-span-6 md:col-span-3 bg-white rounded-[20px] p-4 relative overflow-hidden border border-slate-200 shadow-sm text-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <Users className="w-4 h-4 text-slate-600" />
                  <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-mono font-bold">STAFF</span>
                </div>
                <p className="text-2xl font-bold text-slate-900">{processed.stats.totalEmployees}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Total Employees</p>
              </div>

              <div className="col-span-6 md:col-span-3 bg-white rounded-[20px] p-4 relative overflow-hidden border border-slate-200 shadow-sm text-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <Activity className="w-4 h-4 text-emerald-600" />
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-mono font-bold">{processed.stats.overallAttendancePct}%</span>
                </div>
                <p className="text-2xl font-bold text-slate-900">{processed.stats.present} <span className="text-[13px] text-slate-400 font-normal">/ {processed.daily.length}</span></p>
                <p className="text-[11px] text-slate-500 mt-0.5">Present Days (P)</p>
              </div>

              <div className="col-span-6 md:col-span-3 bg-white rounded-[20px] p-4 relative overflow-hidden border border-slate-200 shadow-sm text-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <ClipboardList className="w-4 h-4 text-purple-600" />
                  <span className="text-[10px] bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full font-mono font-bold">{processed.leaveDetails?.length || 0} RECS</span>
                </div>
                <p className="text-2xl font-bold text-slate-900">{processed.leaveDetails?.length || 0}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Leave Logs (PL/CL/SL)</p>
              </div>

              <div className="col-span-6 md:col-span-3 bg-white rounded-[20px] p-4 relative overflow-hidden border border-slate-200 shadow-sm text-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <Clock className="w-4 h-4 text-cyan-600" />
                  <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-mono font-bold">HOURS</span>
                </div>
                <p className="text-2xl font-bold text-slate-900">{processed.stats.avgHoursPerEmp}<span className="text-[12px] font-normal text-slate-400">h/day</span></p>
                <p className="text-[11px] text-slate-500 mt-0.5">Avg Working Hours</p>
              </div>
            </motion.div>
          )}

          {/* Attendance Distribution Chart Component */}
          {processed && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-[24px] p-5 space-y-4 border border-slate-200 shadow-sm text-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-emerald-600" />
                  <h3 className="font-semibold text-[14px] text-slate-900">Attendance Distribution Breakdown</h3>
                </div>
                <span className="text-[11px] text-slate-500 font-mono">{processed.daily.length} Total Evaluated Days</span>
              </div>

              <div className="space-y-3">
                <div className="h-4 w-full rounded-full bg-slate-100 overflow-hidden flex p-0.5 gap-0.5 border border-slate-200">
                  <div title={`Present: ${processed.stats.present}`} style={{ width: `${(processed.stats.present / (processed.daily.length || 1))*100}%` }} className="bg-emerald-500 h-full rounded-l-full transition-all"></div>
                  <div title={`Half Day: ${processed.stats.halfDay}`} style={{ width: `${(processed.stats.halfDay / (processed.daily.length || 1))*100}%` }} className="bg-amber-400 h-full transition-all"></div>
                  <div title={`Absent: ${processed.stats.absent}`} style={{ width: `${(processed.stats.absent / (processed.daily.length || 1))*100}%` }} className="bg-rose-500 h-full transition-all"></div>
                  <div title={`Week Off: ${processed.stats.weekoff}`} style={{ width: `${(processed.stats.weekoff / (processed.daily.length || 1))*100}%` }} className="bg-slate-400 h-full transition-all"></div>
                  <div title={`Holiday: ${processed.stats.holiday}`} style={{ width: `${(processed.stats.holiday / (processed.daily.length || 1))*100}%` }} className="bg-blue-500 h-full rounded-r-full transition-all"></div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-center text-[11px]">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-2">
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 mr-1.5"></span>
                    <span className="text-slate-600">Present (P):</span> <strong className="text-emerald-700 font-bold">{processed.stats.present}</strong>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-2">
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-400 mr-1.5"></span>
                    <span className="text-slate-600">Half Day (HD):</span> <strong className="text-amber-700 font-bold">{processed.stats.halfDay}</strong>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-2">
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-rose-500 mr-1.5"></span>
                    <span className="text-slate-600">Absent (A):</span> <strong className="text-rose-700 font-bold">{processed.stats.absent}</strong>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-2">
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-slate-400 mr-1.5"></span>
                    <span className="text-slate-600">Week Off (WO):</span> <strong className="text-slate-700 font-bold">{processed.stats.weekoff}</strong>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-2">
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-500 mr-1.5"></span>
                    <span className="text-slate-600">Holiday (H):</span> <strong className="text-blue-700 font-bold">{processed.stats.holiday}</strong>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Interactive Matrix & Logs Display Table */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="bg-white rounded-[24px] overflow-hidden border border-slate-200 shadow-sm text-slate-800">
            {/* Header controls & Filters */}
            <div className="p-4 border-b border-slate-200 space-y-3 bg-slate-50/50">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200"><BarChart3 className="w-4 h-4" /></div>
                  <div>
                    <h3 className="font-semibold text-[14px] text-slate-900">{config.company_name} — Attendance Matrix</h3>
                    <p className="text-[11px] text-slate-500">
                      {processed ? `${filteredMatrix.length} employees shown • Click any employee row for detailed leave breakdown` : 'Upload Excel file to display data'}
                    </p>
                  </div>
                </div>

                {/* SWITCH TOGGLE PILL */}
                <div className="relative flex bg-slate-200/70 rounded-2xl p-1 gap-1 border border-slate-300 shadow-inner">
                  {tabOptions.map(tab => {
                    const isActive = activeTab === tab.id
                    return (
                      <button
                        key={tab.id}
                        onClick={() => changeTabWithDirection(tab.id)}
                        className={`relative px-3.5 py-1.5 rounded-xl text-[11px] font-semibold transition-colors z-10 flex items-center gap-1.5 ${
                          isActive ? 'text-slate-900' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="activeTabPill"
                            className="absolute inset-0 bg-white rounded-xl shadow-md border border-slate-200"
                            transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                          />
                        )}
                        <span className="relative z-10 flex items-center gap-1.5">{tab.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Search & Department Filters */}
              {processed && (
                <div className="flex flex-wrap gap-2 pt-1">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input 
                      value={searchQuery}
                      onChange={e=>setSearchQuery(e.target.value)}
                      placeholder="Search employee name or ID..."
                      className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-1.5 text-[11px] outline-none placeholder:text-slate-400 text-slate-900 focus:border-blue-500"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 bg-white border border-slate-300 px-3 py-1.5 rounded-xl">
                    <Filter className="w-3.5 h-3.5 text-slate-400" />
                    <select 
                      value={selectedDept}
                      onChange={e=>setSelectedDept(e.target.value)}
                      className="bg-transparent text-[11px] text-slate-800 outline-none cursor-pointer"
                    >
                      {departments.map(dept => (
                        <option key={dept} value={dept} className="bg-white text-slate-900">{dept === 'ALL' ? 'All Departments' : dept}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Table Container */}
            <div className="relative overflow-hidden">
              <AnimatePresence mode="wait" custom={slideDirection}>
                <motion.div
                  key={activeTab}
                  custom={slideDirection}
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.15}
                  onDragEnd={handleSwipeEnd}
                  initial={{ opacity: 0, x: slideDirection * 60, filter: 'blur(3px)' }}
                  animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, x: slideDirection * -60, filter: 'blur(3px)' }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-auto max-h-[520px] touch-pan-y"
                >
                {!processed ? (
                  <div className="p-12 text-center space-y-3">
                    <FileSpreadsheet className="w-10 h-10 text-slate-400 mx-auto" />
                    <p className="text-[13px] text-slate-600">No Attendance File Loaded Yet</p>
                    <button onClick={()=>loadSampleData(false)} className="material-btn-primary px-4 py-2 rounded-full text-[12px] font-medium">
                      ⚡ Load Demo Sample Dataset
                    </button>
                  </div>
                ) : activeTab === 'matrix' ? (
                  <table className="w-full text-[12px]">
                    <thead className="sticky top-0 bg-slate-100 z-20 border-b border-slate-200">
                      <tr>
                        <th className="text-left px-4 py-3 font-semibold text-slate-700 sticky left-0 bg-slate-100 border-r border-slate-200 z-30 min-w-[260px] w-[260px]">
                          Employee & Details
                        </th>
                        {processed.allDates.map(d=>(
                          <th key={d} className="text-center px-2 py-3 font-medium text-slate-600 whitespace-nowrap min-w-[36px]">
                            <div className="text-[11px] font-mono font-bold text-slate-800">{parseInt(d.split('-')[2], 10)}</div>
                            <div className="text-[9px] text-slate-400 uppercase">{new Date(d + 'T00:00:00').toLocaleDateString('en-US',{weekday:'short'})[0]}</div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMatrix.map((row, i) => (
                        <tr 
                          key={i} 
                          onClick={() => setSelectedEmployee(row)}
                          className="hover:bg-slate-50 border-b border-slate-100 cursor-pointer transition-colors group"
                        >
                          <td className="px-4 py-3 sticky left-0 bg-white group-hover:bg-slate-50 border-r border-slate-200 whitespace-nowrap z-10 min-w-[260px] w-[260px]">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[11px] flex-shrink-0">
                                {row.emp_name.split(' ').map(n=>n[0]).join('').slice(0,2)}
                              </div>
                              <div className="overflow-hidden">
                                <div className="font-semibold text-[13px] text-slate-900 flex items-center gap-2">
                                  <span className="truncate max-w-[140px]">{row.emp_name}</span>
                                  <span className="font-mono text-[10px] bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-slate-700 font-normal flex-shrink-0">{row.emp_id}</span>
                                </div>
                                <div className="text-[10px] text-slate-500 truncate">{row.department}</div>
                              </div>
                            </div>
                          </td>
                          {processed.allDates.map(d => {
                            const val = row[d] || 'A'
                            const color = val==='P' ? 'bg-emerald-50 text-emerald-700 border-emerald-300' :
                                          val==='A' ? 'bg-rose-50 text-rose-700 border-rose-300' :
                                          val==='HD' ? 'bg-amber-50 text-amber-700 border-amber-300' :
                                          val==='H' ? 'bg-blue-50 text-blue-700 border-blue-300' :
                                          val==='PL' ? 'bg-emerald-100 text-emerald-800 border-emerald-400 font-black' :
                                          val==='CL' ? 'bg-purple-100 text-purple-800 border-purple-400 font-black' :
                                          val==='SL' ? 'bg-amber-100 text-amber-800 border-amber-400 font-black' :
                                          'bg-slate-50 text-slate-400 border-slate-200'
                            return (
                              <td key={d} className="px-1 py-1 text-center min-w-[36px]">
                                <span className={`inline-flex w-6 h-6 items-center justify-center rounded-lg text-[10px] font-bold border ${color}`}>
                                  {val}
                                </span>
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : activeTab === 'leave_details' ? (
                  <table className="w-full text-[12px]">
                    <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 z-10">
                      <tr>
                        <th className="text-left px-4 py-3 font-semibold text-slate-700">emp id</th>
                        <th className="text-left px-4 py-3 font-semibold text-slate-700">emplname</th>
                        <th className="text-center px-4 py-3 font-semibold text-slate-700">leave value</th>
                        <th className="text-center px-4 py-3 font-semibold text-slate-700">leave type</th>
                        <th className="text-center px-4 py-3 font-semibold text-slate-700">start date</th>
                        <th className="text-center px-4 py-3 font-semibold text-slate-700">end date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLeaveDetails.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-8 text-slate-500">No leave records registered for this filter</td>
                        </tr>
                      ) : (
                        filteredLeaveDetails.map((rec, i) => {
                          const typeColor = rec['leave type'] === 'PL' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                                            rec['leave type'] === 'CL' ? 'bg-purple-100 text-purple-800 border-purple-300' :
                                            'bg-amber-100 text-amber-800 border-amber-300'
                          return (
                            <tr 
                              key={i} 
                              onClick={() => {
                                const emp = (processed?.summary || []).find(s => String(s.emp_id) === String(rec['emp id']) || s.emp_name === rec['emplname'])
                                if (emp) setSelectedEmployee(emp)
                                else if (processed?.summary?.[0]) setSelectedEmployee(processed.summary[0])
                              }}
                              className="hover:bg-slate-50 border-b border-slate-100 cursor-pointer transition-colors text-slate-800"
                              title="Click to view & manage leave balance for this employee"
                            >
                              <td className="px-4 py-2.5 font-mono text-[12px] font-semibold text-slate-900">{rec['emp id']}</td>
                              <td className="px-4 py-2.5 font-medium text-slate-800">{rec['emplname']}</td>
                              <td className="px-4 py-2.5 text-center font-mono font-bold text-amber-700">{rec['leave value']}</td>
                              <td className="px-4 py-2.5 text-center">
                                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${typeColor}`}>
                                  {rec['leave type']}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 text-center font-mono text-[11px] text-slate-600">{rec['start date']}</td>
                              <td className="px-4 py-2.5 text-center font-mono text-[11px] text-slate-600">{rec['end date']}</td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                ) : (
                  <table className="w-full text-[12px]">
                    <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 z-10">
                      <tr>
                        <th className="text-left px-4 py-3 font-semibold text-slate-700">Employee</th>
                        <th className="text-left px-3 py-3 font-semibold text-slate-700">Dept</th>
                        <th className="text-center px-3 py-3 font-semibold text-slate-700">Present</th>
                        <th className="text-center px-3 py-3 font-semibold text-slate-700">Absent</th>
                        <th className="text-center px-3 py-3 font-semibold text-slate-700">PL Rem.</th>
                        <th className="text-center px-3 py-3 font-semibold text-slate-700">CL Rem.</th>
                        <th className="text-center px-3 py-3 font-semibold text-slate-700">SL Rem.</th>
                        <th className="text-center px-3 py-3 font-semibold text-slate-700">LWP</th>
                        <th className="text-center px-3 py-3 font-semibold text-slate-700">Attendance %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {processed.summary
                        .filter(s => searchQuery==='' || s.emp_name.toLowerCase().includes(searchQuery.toLowerCase()) || s.emp_id.toLowerCase().includes(searchQuery.toLowerCase()))
                        .map((s, i) => (
                          <tr key={i} onClick={() => setSelectedEmployee(s)} className="hover:bg-slate-50 border-b border-slate-100 cursor-pointer text-slate-800">
                            <td className="px-4 py-2.5 font-medium text-slate-900">{s.emp_name} <span className="font-mono text-[10px] text-slate-500">({s.emp_id})</span></td>
                            <td className="px-3 py-2.5 text-slate-600">{s.department}</td>
                            <td className="px-3 py-2.5 text-center font-bold text-emerald-700">{s['Present (P)']}</td>
                            <td className="px-3 py-2.5 text-center font-bold text-rose-700">{s['Absent (A)']}</td>
                            <td className="px-3 py-2.5 text-center font-bold text-emerald-700">{s['PL Remaining']} left</td>
                            <td className="px-3 py-2.5 text-center font-bold text-purple-700">{s['CL Remaining']} left</td>
                            <td className="px-3 py-2.5 text-center font-bold text-amber-700">{s['SL Remaining']} left</td>
                            <td className="px-3 py-2.5 text-center font-bold text-rose-700">{s['LWP Used'] || 0}</td>
                            <td className="px-3 py-2.5 text-center font-mono font-bold text-slate-900">{s['Attendance %']}%</td>
                          </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>

      {/* --- HR CONFIG & RULES MODAL --- */}
      <AnimatePresence>
        {showSettings && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            transition={{ duration: 0.15 }} 
            className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ opacity: 0, y: 12 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: 12 }} 
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }} 
              className="bg-white rounded-[28px] max-w-[650px] w-full border border-slate-200 shadow-2xl p-6 space-y-5 text-slate-800 gpu-layer"
            >
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
                    <Settings2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[15px] text-slate-900">HR Attendance Processing Rules</h3>
                    <p className="text-[11px] text-slate-500">Configure hours, late limits, weekoffs & holidays</p>
                  </div>
                </div>
                <button onClick={()=>setShowSettings(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-900"><X className="w-4 h-4" /></button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[12px]">
                {/* Company Name */}
                <div className="bg-slate-50 rounded-xl p-3 space-y-1 border border-slate-200">
                  <label className="text-[10px] text-slate-500 uppercase font-mono font-bold">Company Name</label>
                  <input 
                    value={config.company_name} 
                    onChange={e=>setConfig(prev=>({...prev, company_name: e.target.value}))}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 outline-none focus:border-blue-600"
                  />
                </div>

                {/* Target Month */}
                <div className="bg-slate-50 rounded-xl p-3 space-y-1 border border-slate-200">
                  <label className="text-[10px] text-slate-500 uppercase font-mono font-bold">Target Month</label>
                  <input 
                    type="month"
                    value={config.month} 
                    onChange={e=>{
                      const newM = e.target.value
                      setConfig(prev=>({...prev, month: newM}))
                      if (workbook) {
                        const res = processExcelInBrowser(workbook, {...config, month: newM}, customMappings)
                        setProcessed(res)
                      }
                    }}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 outline-none font-mono focus:border-blue-600"
                  />
                </div>

                {/* Full Day Hours */}
                <div className="bg-slate-50 rounded-xl p-3 space-y-1 border border-slate-200">
                  <label className="text-[10px] text-slate-500 uppercase font-mono font-bold">Full Day Working Hours</label>
                  <input 
                    type="number" step="0.5"
                    value={config.full_day_hours} 
                    onChange={e=>setConfig(prev=>({...prev, full_day_hours: Number(e.target.value)}))}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 outline-none font-mono focus:border-blue-600"
                  />
                </div>

                {/* Half Day Threshold */}
                <div className="bg-slate-50 rounded-xl p-3 space-y-1 border border-slate-200">
                  <label className="text-[10px] text-slate-500 uppercase font-mono font-bold">Half Day Hours Threshold</label>
                  <input 
                    type="number" step="0.5"
                    value={config.working_hours} 
                    onChange={e=>setConfig(prev=>({...prev, working_hours: Number(e.target.value)}))}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 outline-none font-mono focus:border-blue-600"
                  />
                </div>

                {/* Late Punch Threshold */}
                <div className="bg-slate-50 rounded-xl p-3 space-y-1 border border-slate-200">
                  <label className="text-[10px] text-slate-500 uppercase font-mono font-bold">Late Punch Cutoff Time</label>
                  <input 
                    type="time"
                    value={config.late_threshold} 
                    onChange={e=>setConfig(prev=>({...prev, late_threshold: e.target.value}))}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 outline-none font-mono focus:border-blue-600"
                  />
                </div>

                {/* Weekoff Selector */}
                <div className="bg-slate-50 rounded-xl p-3 space-y-1 border border-slate-200">
                  <label className="text-[10px] text-slate-500 uppercase font-mono font-bold">Company Week Offs</label>
                  <div className="flex gap-2 pt-1">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dName, dayIdx) => {
                      const isWO = (config.weekoff || []).includes(dayIdx)
                      return (
                        <button
                          key={dName}
                          onClick={() => {
                            const newWO = isWO ? config.weekoff.filter(w => w !== dayIdx) : [...(config.weekoff || []), dayIdx]
                            setConfig(prev=>({...prev, weekoff: newWO}))
                          }}
                          className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors ${
                            isWO ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                          }`}
                        >
                          {dName}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Holidays Manager */}
              <div className="bg-slate-50 rounded-xl p-3 space-y-2 border border-slate-200">
                <label className="text-[10px] text-slate-500 uppercase font-mono font-bold">Custom Company Holidays</label>
                <div className="flex gap-2">
                  <input 
                    type="date"
                    value={config.newHoliday || ''}
                    onChange={e=>setConfig(prev=>({...prev, newHoliday: e.target.value}))}
                    className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-[11px] text-slate-900 outline-none font-mono focus:border-blue-600"
                  />
                  <button 
                    onClick={() => {
                      if (!config.newHoliday) return
                      const updatedHols = [...(config.holidays || []), config.newHoliday]
                      setConfig(prev => ({...prev, holidays: updatedHols, newHoliday: ''}))
                      showToast(`Added holiday: ${config.newHoliday}`)
                    }}
                    className="material-btn-primary px-3 rounded-lg text-[11px] font-semibold"
                  >
                    + Add Holiday
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {(config.holidays || []).map((hol, idx) => (
                    <span key={idx} className="bg-amber-50 px-2 py-0.5 rounded-full text-[10px] text-amber-800 border border-amber-300 flex items-center gap-1 font-semibold">
                      {hol}
                      <button onClick={() => setConfig(prev => ({...prev, holidays: prev.holidays.filter((_, i) => i !== idx)}))} className="hover:text-rose-600">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Save & Apply */}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button onClick={()=>setShowSettings(false)} className="material-btn px-4 py-2 rounded-xl text-[12px]">Cancel</button>
                <button 
                  onClick={() => {
                    if (workbook) {
                      const res = processExcelInBrowser(workbook, config, customMappings)
                      setProcessed(res)
                      showToast("✅ Config applied and attendance re-evaluated!")
                    }
                    setShowSettings(false)
                  }}
                  className="material-btn-success px-5 py-2 rounded-xl text-[12px] font-semibold"
                >
                  Apply Config & Re-calculate
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>

    {/* Footer inside main content column */}
    <footer className="px-6 py-4 text-center border-t border-slate-200 bg-slate-100 text-[11px] text-slate-500">
      <span>Autocrat Engineers</span> • <span>Enterprise Attendance System v0.0.1</span>
    </footer>

      {/* --- DETAILED EMPLOYEE ATTENDANCE & LEAVE MODAL --- */}
      <AnimatePresence>
        {selectedEmployee && empDetails && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            transition={{ duration: 0.15 }} 
            className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ opacity: 0, y: 12 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: 12 }} 
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }} 
              className="bg-white rounded-[28px] max-w-[850px] w-full max-h-[90vh] overflow-y-auto border border-slate-200 shadow-2xl p-6 space-y-6 text-slate-800 gpu-layer"
            >
              
              {/* Modal Header */}
              <div className="flex items-start justify-between border-b border-slate-200 pb-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white p-0.5 shadow-md flex items-center justify-center font-bold text-xl">
                    {selectedEmployee.emp_name.split(' ').map(n=>n[0]).join('').slice(0,2)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold tracking-tight text-slate-900">{selectedEmployee.emp_name}</h2>
                      <span className="font-mono text-[11px] bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-slate-700 font-semibold">{selectedEmployee.emp_id}</span>
                    </div>
                    <p className="text-[12px] text-slate-500 mt-0.5 flex items-center gap-2">
                      <Briefcase className="w-3.5 h-3.5 text-slate-600" /> {selectedEmployee.department} Department
                      <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                      <span className="text-emerald-600 font-semibold">{empDetails.summaryRow['Attendance %'] || 100}% Monthly Attendance</span>
                    </p>
                  </div>
                </div>

                <button onClick={() => setSelectedEmployee(null)} className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* PRIORITY DEDUCTION BANNER */}
              <div className="bg-blue-50 rounded-2xl p-3.5 border border-blue-200 flex items-center justify-between gap-3 text-blue-900">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0">
                    <Layers3 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-[12px] text-blue-900">HR Leave Deduction Priority Rule Active</h4>
                    <p className="text-[11px] text-blue-700">
                      Absences ({empDetails.deduction.unassignedAbsenceTotal} days) auto-deducted in sequence: <strong className="text-emerald-700">PL ({empDetails.plUsed} used)</strong> → <strong className="text-purple-700">CL ({empDetails.clUsed} used)</strong> → <strong className="text-amber-700">SL ({empDetails.slUsed} used)</strong>
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-mono bg-white px-2.5 py-1 rounded-full text-blue-800 border border-blue-200 whitespace-nowrap font-bold shadow-xs">
                  Total Absences: {empDetails.deduction.unassignedAbsenceTotal} days
                </span>
              </div>

              {/* Leave Balances Grid (PL, CL, SL) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-[14px] flex items-center gap-2 text-slate-900">
                    <Award className="w-4 h-4 text-amber-600" /> HR Leave Balances & Remaining Allowance
                  </h3>
                  <span className="text-[11px] text-slate-500 font-mono">Priority: PL → CL → SL</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* PL (Privilege Leave) */}
                  <div className="bg-slate-50 rounded-[20px] p-4 space-y-2 relative overflow-hidden border border-slate-200">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-bold text-emerald-800 tracking-wider font-mono">PL • PRIVILEGE LEAVE</span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-mono font-bold">{empDetails.plRemaining} LEFT</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-extrabold text-slate-900">{empDetails.plRemaining}</span>
                      <span className="text-[12px] text-slate-500">/ {empDetails.plTotal} Days</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden border border-slate-300">
                      <div style={{ width: `${(empDetails.plRemaining / empDetails.plTotal)*100}%` }} className="h-full bg-emerald-500 rounded-full transition-all"></div>
                    </div>
                    <p className="text-[10px] text-slate-500">Total Used: <strong className="text-emerald-700 font-bold">{empDetails.plUsed} days</strong> (Remaining: {empDetails.plRemaining})</p>
                  </div>

                  {/* CL (Casual Leave) */}
                  <div className="bg-slate-50 rounded-[20px] p-4 space-y-2 relative overflow-hidden border border-slate-200">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-bold text-purple-800 tracking-wider font-mono">CL • CASUAL LEAVE</span>
                      <span className="text-[10px] bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full font-mono font-bold">{empDetails.clRemaining} LEFT</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-extrabold text-slate-900">{empDetails.clRemaining}</span>
                      <span className="text-[12px] text-slate-500">/ {empDetails.clTotal} Days</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden border border-slate-300">
                      <div style={{ width: `${(empDetails.clRemaining / empDetails.clTotal)*100}%` }} className="h-full bg-purple-500 rounded-full transition-all"></div>
                    </div>
                    <p className="text-[10px] text-slate-500">Total Used: <strong className="text-purple-700 font-bold">{empDetails.clUsed} days</strong> (Remaining: {empDetails.clRemaining})</p>
                  </div>

                  {/* SL (Sick Leave) */}
                  <div className="bg-slate-50 rounded-[20px] p-4 space-y-2 relative overflow-hidden border border-slate-200">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-bold text-amber-800 tracking-wider font-mono">SL • SICK LEAVE</span>
                      <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-mono font-bold">{empDetails.slRemaining} LEFT</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-extrabold text-slate-900">{empDetails.slRemaining}</span>
                      <span className="text-[12px] text-slate-500">/ {empDetails.slTotal} Days</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden border border-slate-300">
                      <div style={{ width: `${(empDetails.slRemaining / empDetails.slTotal)*100}%` }} className="h-full bg-amber-500 rounded-full transition-all"></div>
                    </div>
                    <p className="text-[10px] text-slate-500">Total Used: <strong className="text-amber-700 font-bold">{empDetails.slUsed} days</strong> (Remaining: {empDetails.slRemaining})</p>
                  </div>
                </div>
              </div>

              {/* INDIVIDUAL LEAVE HISTORY TABLE */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-[14px] flex items-center gap-2 text-slate-900">
                    <ClipboardList className="w-4 h-4 text-purple-600" /> Leave Records for {selectedEmployee.emp_name}
                  </h3>
                  <span className="text-[11px] text-slate-500 font-mono">{empDetails.empLeaveRecords.length} Leave Entries</span>
                </div>

                <div className="bg-white rounded-2xl overflow-hidden border border-slate-200">
                  <table className="w-full text-[12px]">
                    <thead className="bg-slate-100 border-b border-slate-200">
                      <tr>
                        <th className="text-left px-3 py-2 text-slate-700 font-mono">emp id</th>
                        <th className="text-left px-3 py-2 text-slate-700 font-mono">emplname</th>
                        <th className="text-center px-3 py-2 text-slate-700 font-mono">leave value</th>
                        <th className="text-center px-3 py-2 text-slate-700 font-mono">leave type</th>
                        <th className="text-center px-3 py-2 text-slate-700 font-mono">start date</th>
                        <th className="text-center px-3 py-2 text-slate-700 font-mono">end date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {empDetails.empLeaveRecords.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-6 text-slate-500">No leave records registered for this employee</td>
                        </tr>
                      ) : (
                        empDetails.empLeaveRecords.map((r, idx) => (
                          <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50 text-slate-800">
                            <td className="px-3 py-2 font-mono text-slate-900 font-semibold">{r['emp id']}</td>
                            <td className="px-3 py-2 font-medium">{r['emplname']}</td>
                            <td className="px-3 py-2 text-center font-mono font-bold text-amber-700">{r['leave value']}</td>
                            <td className="px-3 py-2 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                r['leave type'] === 'PL' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                                r['leave type'] === 'CL' ? 'bg-purple-100 text-purple-800 border-purple-300' :
                                'bg-amber-100 text-amber-800 border-amber-300'
                              }`}>
                                {r['leave type']}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-center font-mono text-slate-600">{r['start date']}</td>
                            <td className="px-3 py-2 text-center font-mono text-slate-600">{r['end date']}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Form to Log New Leave */}
                <div className="bg-slate-50 rounded-2xl p-4 space-y-3 border border-slate-200">
                  <h4 className="font-semibold text-[12px] flex items-center gap-1.5 text-emerald-800">
                    <PlusCircle className="w-3.5 h-3.5 text-emerald-600" /> Log / Add New Leave Record for Employee
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px]">
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-1 font-bold">Leave Type</label>
                      <select 
                        value={newLeaveForm.leaveType}
                        onChange={e => setNewLeaveForm({...newLeaveForm, leaveType: e.target.value})}
                        className="w-full bg-white border border-slate-300 rounded-xl px-2 py-1.5 text-slate-900 outline-none focus:border-blue-600"
                      >
                        <option value="PL" className="bg-white text-slate-900">PL (Privilege Leave)</option>
                        <option value="CL" className="bg-white text-slate-900">CL (Casual Leave)</option>
                        <option value="SL" className="bg-white text-slate-900">SL (Sick Leave)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-500 block mb-1 font-bold">Leave Value</label>
                      <select 
                        value={newLeaveForm.leaveValue}
                        onChange={e => setNewLeaveForm({...newLeaveForm, leaveValue: Number(e.target.value)})}
                        className="w-full bg-white border border-slate-300 rounded-xl px-2 py-1.5 text-slate-900 outline-none font-mono focus:border-blue-600"
                      >
                        <option value={1} className="bg-white text-slate-900">1 (Full Day)</option>
                        <option value={0.5} className="bg-white text-slate-900">0.5 (Half Day)</option>
                        <option value={0.25} className="bg-white text-slate-900">0.25 (Quarter Day)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-500 block mb-1 font-bold">Start Date</label>
                      <input 
                        type="date"
                        value={newLeaveForm.startDate}
                        onChange={e => setNewLeaveForm({...newLeaveForm, startDate: e.target.value, endDate: e.target.value})}
                        className="w-full bg-white border border-slate-300 rounded-xl px-2 py-1.5 text-slate-900 outline-none font-mono focus:border-blue-600"
                      />
                    </div>

                    <div className="flex items-end">
                      <button 
                        onClick={addManualLeaveEntry} 
                        className="w-full material-btn-success py-1.5 rounded-xl font-semibold flex items-center justify-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Save Leave Entry
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Monthly Attendance Calendar Grid */}
              <div className="space-y-3">
                <h3 className="font-semibold text-[14px] flex items-center gap-2 text-slate-900">
                  <Calendar className="w-4 h-4 text-slate-600" /> Daily Attendance Log for {selectedEmployee.emp_name}
                </h3>

                <div className="grid grid-cols-7 gap-2 text-center text-[11px]">
                  {processed.allDates.map(d => {
                    const status = selectedEmployee[d] || 'A'
                    const dayNum = parseInt(d.split('-')[2], 10)
                    const color = status==='P' ? 'bg-emerald-50 text-emerald-700 border-emerald-300' :
                                  status==='A' ? 'bg-rose-50 text-rose-700 border-rose-300' :
                                  status==='HD' ? 'bg-amber-50 text-amber-700 border-amber-300' :
                                  status==='PL' ? 'bg-emerald-100 text-emerald-800 border-emerald-400 font-bold' :
                                  status==='CL' ? 'bg-purple-100 text-purple-800 border-purple-400 font-bold' :
                                  status==='SL' ? 'bg-amber-100 text-amber-800 border-amber-400 font-bold' :
                                  status==='H' ? 'bg-blue-50 text-blue-700 border-blue-300' :
                                  'bg-slate-50 text-slate-400 border-slate-200'
                    return (
                      <div key={d} className={`bg-white rounded-xl p-2 border flex flex-col items-center justify-between h-14 shadow-xs ${color}`}>
                        <span className="text-[10px] font-mono opacity-70">{dayNum}</span>
                        <span className="font-bold text-[11px]">{status}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end pt-2">
                <button onClick={() => setSelectedEmployee(null)} className="material-btn px-5 py-2 rounded-xl text-[12px] font-medium">
                  Close Detail View
                </button>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast popup */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white rounded-full px-5 py-3 flex items-center gap-3 shadow-2xl border border-slate-800">
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center">
              {toast.type==='error' ? <AlertCircle className="w-4 h-4 text-rose-400" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            </div>
            <span className="text-[13px] font-medium max-w-[420px] truncate text-white">{toast.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>
      </motion.div>
    </div>
  )
}
