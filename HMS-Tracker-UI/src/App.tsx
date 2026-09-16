// @ts-nocheck
import { parseFullHRDatabase } from './utils/fullHRParser';
import { resolveAttendanceStatus } from './utils/attendanceLogic';
import { useAttendanceStore } from './store/AttendanceStore';
import { MonthNavigator } from './components/shared/MonthNavigator';
import { LegacyMatrix } from './components/attendance/LegacyMatrix';
import { DayNightSwitch } from './components/shared/DayNightSwitch';
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
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
  Briefcase, CheckCircle, ChevronRight, ChevronDown, Edit3, Award, ClipboardList, PlusCircle,
  Info, ArrowDownRight, Layers3, Lock, Unlock, LogOut, LayoutGrid, Menu,
  Mail, LogIn, Key
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
function computeSequentialLeaveDeduction(absentCount, halfCount, explicitPL = 0, explicitCL = 0, explicitSL = 0, plTotal = 12, clTotal = 10, slTotal = 8) {
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
function buildLeaveDetailsList(matrix, allDates, leaveBalances = {}) {
  const leaveDetails = []
  matrix.forEach((row: any) => {
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
      } else if (val.includes('1/2') || val === 'HD' || val === 'HALF') {
        halfDates.push(dmyDate)
      } else if (val === 'A' || val === 'ABSENT' || val.includes('(LOP)') || (val.startsWith('A') && val.length < 3)) {
        absentDates.push(dmyDate)
      }
    })

    // Automatically generate leave deduction records for absent & half days in order PL -> CL -> SL
    const empBalances = leaveBalances[normalizeEmpId(row.emp_id)] || {}
    let plCap = Math.max((empBalances.pl !== undefined ? empBalances.pl : 12) - empExplicitPL, 0)
    let clCap = Math.max((empBalances.cl !== undefined ? empBalances.cl : 10) - empExplicitCL, 0)
    let slCap = Math.max((empBalances.sl !== undefined ? empBalances.sl : 8) - empExplicitSL, 0)

    const allAbsenceItems = [
      ...absentDates.map((d: any) => ({ date: d, value: 1.0 })),
      ...halfDates.map((d: any) => ({ date: d, value: 0.5 }))
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

// --- Monthly Basic Report Format Detection & Parser ---
// Handles files like calculations.xlsx with header on row 5, data from row 7
const MONTH_ABBR = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12
}

function parseDateHeader(s, yearHint) {
  if (!s) return null
  const str = String(s).trim()
  // '01-Aug' or '01-Aug-2026'
  const m1 = str.match(/^(\d{1,2})[-/]([A-Za-z]{3})(?:[-/](\d{2,4}))?$/)
  if (m1) {
    const day = parseInt(m1[1], 10)
    const mon = MONTH_ABBR[m1[2].toLowerCase()]
    let yr = m1[3] ? parseInt(m1[3], 10) : (yearHint || new Date().getFullYear())
    if (yr < 100) yr += 2000
    if (mon && day >= 1 && day <= 31) return new Date(yr, mon - 1, day)
  }
  // ISO 2026-08-01
  const m2 = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/)
  if (m2) return new Date(parseInt(m2[1]), parseInt(m2[2]) - 1, parseInt(m2[3]))
  return null
}

function normalizeEmpId(id) {
  if (id === null || id === undefined) return ''
  const s = String(id).trim()
  return s.replace(/^0+/, '').split('.')[0]
}

function parseLeaveSummary(XLSX, wb) {
  const sheetName = wb.SheetNames.find((n: any) => n.toLowerCase().replace(/[^a-z]/g, '').includes('leavesummary'))
  if (!sheetName) return null

  const sheet = wb.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null })
  if (!rows || rows.length === 0) return null

  let headerRowIdx = -1
  for (let ri = 0; ri < Math.min(100, rows.length); ri++) {
    const r = rows[ri] || []
    const hasCode = r.some(v => {
      const s = String(v).toLowerCase()
      return s.includes('code') || s.includes('id') || s.includes('emp')
    })
    if (hasCode) {
      headerRowIdx = ri
      break
    }
  }

  if (headerRowIdx === -1) return null

  const headerRow = rows[headerRowIdx]
  const cols = {}
  for (let ci = 0; ci < headerRow.length; ci++) {
    const val = String(headerRow[ci] || '').toLowerCase().replace(/[^a-z0-9]/g, '')
    if (val.includes('code') || val.includes('id') || val.includes('empcode') || val.includes('empid')) {
      if (cols.empCode === undefined && !val.includes('name')) cols.empCode = ci
    }
    if (val.includes('company')) cols.company = ci
    if (val.includes('dept') || val.includes('department')) cols.department = ci
    if (val.includes('rho')) cols.rho = ci
    if (val.includes('aecoff')) cols.ae_coff = ci
    else if (val.includes('coff')) cols.coff = ci
    if (val.includes('lop')) cols.lop = ci
    if (val.includes('pl-balance') || val.includes('privilege') || val.includes('earned')) cols.pl = ci
    if (val.includes('cl-balance') || val.includes('casual')) cols.cl = ci
    if (val.includes('sl-balance') || val.includes('sick') || val.includes('medical')) cols.sl = ci
  }

  if (cols.empCode === undefined) cols.empCode = 1
  if (cols.pl === undefined) cols.pl = 7
  if (cols.cl === undefined) cols.cl = 6
  if (cols.sl === undefined) cols.sl = 8

  const balances = {}
  for (let ri = headerRowIdx + 1; ri < rows.length; ri++) {
    const r = rows[ri] || []
    const empCode = r[cols.empCode]
    if (empCode === null || empCode === undefined || String(empCode).trim() === '') continue
    const empCodeStr = normalizeEmpId(empCode)

    balances[empCodeStr] = {
      pl: parseFloat(r[cols.pl]) || 0,
      cl: parseFloat(r[cols.cl]) || 0,
      sl: parseFloat(r[cols.sl]) || 0,
      rho: parseFloat(r[cols.rho]) || 0,
      coff: parseFloat(r[cols.coff]) || 0,
      ae_coff: parseFloat(r[cols.ae_coff]) || 0,
      lop: parseFloat(r[cols.lop]) || 0,
      company: r[cols.company] || '',
      department: r[cols.department] || ''
    }
  }

  return balances
}

// Returns null if not a monthly-basic format, or a normalized rawData array + metadata
function tryParseMonthlyBasicSheet(XLSX, wb, sheetName) {
  const sheet = wb.Sheets[sheetName]
  if (!sheet) return null

  // Read raw without any header so we get 0-indexed rows as arrays
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: true })
  if (!rows || rows.length < 7) return null

  // Find the header row: first row with 4+ date-like values (e.g. '01-Aug')
  const DATE_RE = /^\d{1,2}[-/][A-Za-z]{3}([-/]\d{2,4})?$/
  let headerRowIdx = -1
  for (let ri = 0; ri < Math.min(10, rows.length); ri++) {
    const row = rows[ri] || []
    const dateCnt = row.filter(v => v && DATE_RE.test(String(v).trim())).length
    if (dateCnt >= 4) { headerRowIdx = ri; break }
  }
  if (headerRowIdx === -1) return null

  // Determine first date column index
  const headerRow = rows[headerRowIdx] || []
  const SUMMARY_LABELS = new Set(['P', 'A', 'LOP', 'CL', 'PL', 'SL', 'COFF', 'H', 'HP', 'WO', 'WOP'])
  let firstDateColIdx = -1
  const dateColMap = [] // [{colIdx, dateStr}]
  const yearHint = new Date().getFullYear()

  for (let ci = 0; ci < headerRow.length; ci++) {
    const v = headerRow[ci]
    if (!v) continue
    const vs = String(v).trim()
    if (SUMMARY_LABELS.has(vs.toUpperCase())) break  // reached summary section
    const dt = parseDateHeader(vs, yearHint)
    if (dt) {
      if (firstDateColIdx === -1) firstDateColIdx = ci
      const yyyy = dt.getFullYear()
      const mm = String(dt.getMonth() + 1).padStart(2, '0')
      const dd = String(dt.getDate()).padStart(2, '0')
      dateColMap.push({ colIdx: ci, dateStr: `${yyyy}-${mm}-${dd}`, dt })
    }
  }
  if (dateColMap.length < 4) return null

  // Determine column positions
  // In calculations.xlsx: col0=serial, col1=EmpCode, col2=EmpName, col3+=dates
  // firstDateColIdx tells us where dates start; emp cols are just before
  const empCodeColIdx = firstDateColIdx >= 2 ? firstDateColIdx - 2 : 0
  const empNameColIdx = firstDateColIdx >= 1 ? firstDateColIdx - 1 : 1

  // Data starts 2 rows after header row (skip day-label row)
  const dataStartRowIdx = headerRowIdx + 2

  const normalizeStatus = (raw) => {
    if (!raw) return ''
    const parts = String(raw)
      .split(/[\r\n]+/)
      .map(part => {
        let p = part.trim();
        const upperP = p.toUpperCase();
        if (upperP.includes('1/2P') || upperP.includes('½P')) {
          return '1/2P';
        }
        if (upperP.includes('3/4P') || upperP.includes('¾P')) {
          return '3/4P';
        }

        while (p.length > 0 && p.charCodeAt(0) > 127) {
          p = p.slice(1);
        }
        return p.toUpperCase().trim();
      })
      .filter(Boolean);

    if (parts.length === 0) return ''

    const hasMatch = (checker) => parts.some(p => checker(p))

    // 1. Half-day leave or Half-day attendance (priority 1)
    if (hasMatch(p => p === '1/2P' || p.includes('P(L)') || p.includes('HD') || p.includes('HALF') || p.includes('L)(C') || p.includes('L)'))) {
      return '1/2P'
    }

    // 1b. Three-quarter day attendance
    if (hasMatch(p => p === '3/4P')) {
      return '3/4P'
    }

    // 2. Explicit Leaves: PL, CL, SL (priority 2)
    if (hasMatch(p => p === 'PL' || p === 'L(PL)' || p.includes('PAIDLEAVE') || p.includes('PAID LEAVE'))) return 'PL'
    if (hasMatch(p => p === 'CL' || p === 'L(CL)' || p.includes('CASUALLEAVE') || p.includes('CASUAL LEAVE'))) return 'CL'
    if (hasMatch(p => p === 'SL' || p === 'L(SL)' || p.includes('SICKLEAVE') || p.includes('SICK LEAVE'))) return 'SL'

    // 3. Present / On duty (priority 3)
    if (hasMatch(p => p === 'P' || p === '1' || p === 'PRESENT' || p === 'P(OD)' || p === 'OD' || p.startsWith('P'))) return 'P'

    // 4. Weekoff / Holiday (priority 4)
    if (hasMatch(p => p === 'WO' || p === 'WEEKOFF' || p === 'OFF' || p === 'WOA')) return 'WO'
    if (hasMatch(p => p === 'H' || p === 'HO' || p === 'HOLIDAY' || p === 'HOA')) return 'H'

    // 5. Absent (priority 5)
    if (hasMatch(p => p === 'A' || p === '0' || p === 'ABSENT' || p.includes('LOP'))) return 'A'

    return parts[0] || ''
  }

  // Build normalized rawData rows keyed by dateStr (for processExcelInBrowser compatibility)
  const rawData = []
  const detectedMonth = dateColMap.length > 0
    ? `${dateColMap[0].dt.getFullYear()}-${String(dateColMap[0].dt.getMonth() + 1).padStart(2, '0')}`
    : '2026-08'

  for (let ri = dataStartRowIdx; ri < rows.length; ri++) {
    const row = rows[ri] || []
    const serial = row[empCodeColIdx - 1]  // col before empCode is serial
    if (serial === null || serial === undefined) continue  // no serial = not employee row
    const empCode = row[empCodeColIdx]
    if (!empCode) continue
    const empCodeStr = String(empCode).trim()
    if (!empCodeStr || ['code', 'employee code', 'emp code'].includes(empCodeStr.toLowerCase())) continue

    const empName = row[empNameColIdx] ? String(row[empNameColIdx]).trim() : empCodeStr
    const rowObj = { 'emp id': empCodeStr, 'name': empName }

    dateColMap.forEach(({ colIdx, dateStr }) => {
      const rawVal = row[colIdx]
      rowObj[dateStr] = normalizeStatus(rawVal)
    })

    rawData.push(rowObj)
  }

  // Build a fake workbook structure that processExcelInBrowser can consume
  const fakeWb = { SheetNames: [sheetName], Sheets: { [sheetName]: sheet }, __rawData__: rawData }
  fakeWb.__detectedMonth__ = detectedMonth
  fakeWb.__dateColKeys__ = dateColMap.map((d: any) => d.dateStr)

  return { rawData, detectedMonth, dateColMap, fakeWb }
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
    const Ymd = colStr.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/)
    if (dmY) {
      const dNum = parseInt(dmY[1], 10)
      const mNum = parseInt(dmY[2], 10)
      let yNum = parseInt(dmY[3], 10)
      if (yNum < 100) yNum += 2000
      const dateStr = getLocalDateString(yNum, mNum, dNum)
      detectedMonth = `${yNum}-${String(mNum).padStart(2, '0')}`
      dateColsInfo.push({ colKey, dateStr, dayNum: dNum })
    } else if (Ymd) {
      const yNum = parseInt(Ymd[1], 10)
      const mNum = parseInt(Ymd[2], 10)
      const dNum = parseInt(Ymd[3], 10)
      const dateStr = getLocalDateString(yNum, mNum, dNum)
      detectedMonth = `${yNum}-${String(mNum).padStart(2, '0')}`
      dateColsInfo.push({ colKey, dateStr, dayNum: dNum })
    } else {
      const dNum = parseInt(colStr, 10)
      if (!isNaN(dNum) && dNum >= 1 && dNum <= 31 && String(dNum) === colStr) {
        const [yStr, mStr] = (detectedMonth).split('-')
        const dateStr = getLocalDateString(parseInt(yStr, 10), parseInt(mStr, 10), dNum)
        dateColsInfo.push({ colKey, dateStr, dayNum: dNum })
      }
    }
  })

  const isDailySummaryLog = cols.some(c => c.toLowerCase().includes('attendance date')) && cols.some(c => c.toLowerCase().includes('punch records')) && cols.some(c => c.toLowerCase().includes('status'))
  const isMatrixSheet = !isDailySummaryLog && (dateColsInfo.length >= 4 || cols.length >= 25)

  if (isDailySummaryLog) {
    // --- BRANCH C: DAILY SUMMARY CSV LOGS ---
    // Find exact column keys
    const dateColKey = cols.find(c => c.toLowerCase().includes('attendance date'))
    const punchColKey = cols.find(c => c.toLowerCase().includes('punch records'))
    const statusColKey = cols.find(c => c.toLowerCase() === 'status code' || c.toLowerCase() === 'att status') || cols.find(c => c.toLowerCase().includes('status'))
    const empIdKey = cols.find(c => c.toLowerCase().includes('employee code') || c.toLowerCase().includes('emp id')) || cols[1]
    const empNameKey = cols.find(c => c.toLowerCase().includes('employee name')) || empIdKey
    const deptKey = cols.find(c => c.toLowerCase().includes('department'))
    const dojKey = cols.find(c => c.toLowerCase() === 'doj' || c.toLowerCase().includes('date of joining') || c.toLowerCase().includes('joining date'))
    const inTimeKey = cols.find(c => c.toLowerCase().includes('in time'))
    const outTimeKey = cols.find(c => c.toLowerCase().includes('out time'))

    const targetMonthStr = config.month || detectedMonth || '2026-08'
    let allDates = getFullMonthDates(targetMonthStr)
    const holidaySet = new Set((config.holidays || []).map((h: any) => { try { return new Date(h).toISOString().split('T')[0] } catch { return h } }))
    const weekoff = config.weekoff || [0]

    // Find the maximum date actually present in the file to stop processing early
    let maxDateMs = 0
    rawData.forEach((row: any) => {
      const dtStr = String(row[dateColKey] || '').trim()
      if (dtStr) {
        const ms = new Date(dtStr).getTime()
        if (!isNaN(ms) && ms > maxDateMs) maxDateMs = ms
      }
    })

    let processedDaysCount = 0
    if (maxDateMs > 0) {
      processedDaysCount = allDates.filter((d: any) => new Date(d + 'T00:00:00').getTime() <= maxDateMs).length
    } else {
      processedDaysCount = allDates.length
    }

    let matrix: any[] = []
    let summary: any[] = []
    let daily: any[] = []
    let cleaned = []
    let employees = []

    let totalPresent = 0, totalAbsent = 0, totalHalfDay = 0, totalHoliday = 0, totalWeekoff = 0, totalLate = 0, grandTotalHours = 0

    const grouped = {}
    rawData.forEach((row: any) => {
      let emp_id = String(row[empIdKey] || row[empNameKey] || '').trim()
      if (!emp_id || emp_id.toLowerCase() === 'nan') return
      if (!grouped[emp_id]) {
        grouped[emp_id] = {
          emp_id,
          emp_name: String(row[empNameKey] || emp_id).trim(),
          department: String(deptKey && row[deptKey] ? row[deptKey] : 'General').trim(),
          doj: dojKey && row[dojKey] ? parseFlexibleDate(row[dojKey]) : null,
          rows: []
        }
      }
      grouped[emp_id].rows.push(row)
    })

    const leaveBalances = workbook?.__leaveBalances__ || {}

    Object.values(grouped).forEach(emp => {
      employees.push({ emp_id: emp.emp_id, emp_name: emp.emp_name, department: emp.department, doj: emp.doj })
      let matrixRow = { emp_id: emp.emp_id, emp_name: emp.emp_name, department: emp.department, doj: emp.doj }

      let present = 0, absent = 0, half = 0, hol = 0, wo = 0, late = 0, totalH = 0
      let plCount = 0, clCount = 0, slCount = 0
      let unassignedAbsence = 0
      let deductibleUnassignedAbsence = 0, deductiblePlCount = 0, deductibleClCount = 0, deductibleSlCount = 0

      const dateMap = {}
      emp.rows.forEach((r: any) => {
        const dtStr = String(r[dateColKey] || '').trim()
        const dtObj = new Date(dtStr)
        if (isNaN(dtObj)) return
        const yStr = dtObj.getFullYear()
        const mStr = String(dtObj.getMonth() + 1).padStart(2, '0')
        const dStr = String(dtObj.getDate()).padStart(2, '0')
        const standardDate = `${yStr}-${mStr}-${dStr}`
        dateMap[standardDate] = r
      })

      allDates.forEach(dateStr => {
        const dObj = new Date(dateStr + 'T00:00:00')
        if (maxDateMs > 0 && dObj.getTime() > maxDateMs) {
          matrixRow[dateStr] = '-'
          return // Skip future dates but ensure they are marked as '-'
        }

        // Skip dates before Date of Joining
        if (emp.doj && !isNaN(emp.doj.getTime()) && dObj.getTime() < emp.doj.getTime()) {
          matrixRow[dateStr] = '-'
          return
        }

        const r = dateMap[dateStr]

        let status = 'A'
        let first_punch = '00:00:00'
        let last_punch = '00:00:00'
        let punch_count = 0

        if (r) {
          status = String(r[statusColKey] || '').trim().toUpperCase() || 'A'
          const punches = String(r[punchColKey] || '').trim()

          if (punches && punches !== '00:00') {
            const timeMatches = punches.match(/\d{2}:\d{2}(:\d{2})?/g)
            if (timeMatches && timeMatches.length > 0) {
              first_punch = timeMatches[0]
              last_punch = timeMatches[timeMatches.length - 1]
              punch_count = timeMatches.length
            }
          }
          if (punch_count === 0 && inTimeKey && outTimeKey) {
            const inT = String(r[inTimeKey] || '').trim()
            const outT = String(r[outTimeKey] || '').trim()
            if (inT && inT !== '00:00' && inT !== '00:00:00') {
              first_punch = inT; last_punch = outT || inT; punch_count = 2
            }
          }
        } else {
          const isDefaultWeekoff = weekoff.includes(dObj.getDay())
          const isHoliday = holidaySet.has(dateStr)
          if (isHoliday) status = 'H'
          else if (isDefaultWeekoff) status = 'WO'
        }

        let actualHours = 0
        if (first_punch !== '00:00:00' && last_punch !== '00:00:00') {
          const [h1, m1] = first_punch.split(':').map(Number)
          const [h2, m2] = last_punch.split(':').map(Number)
          if (!isNaN(h1) && !isNaN(h2)) {
            actualHours = (h2 + m2 / 60) - (h1 + m1 / 60)
            if (actualHours < 0) actualHours += 24
          }
        }

        const isDefaultWeekoff = weekoff.includes(dObj.getDay())
        const isHoliday = holidaySet.has(dateStr)
        if (isHoliday) {
          status = 'H'
        } else if (isDefaultWeekoff && actualHours === 0 && (status === 'A' || status === '0' || status === 'ABSENT' || status === '' || status === '-' || status.includes('WO') || status === 'PL' || status === 'CL' || status === 'SL' || status === 'LWP')) {
          status = 'WO'
        }

        if (actualHours > 0) {
          if (actualHours >= 8) {
            status = 'P'
          } else if (actualHours >= 5) {
            status = '3/4P'
          } else if (actualHours >= 4.5) {
            status = '1/2P'
          }
          // Less than 4.5 hours retains its original status (could be A, WO, H, etc.)
        }

        let displayStatus = 'A'
        if (status === 'P' || status.includes('PRESENT')) { present++; totalH += actualHours > 0 ? actualHours : (config.full_day_hours || 8); displayStatus = 'P' }
        else if (status.includes('1/2') || status === 'HD' || status.includes('HALF')) { half++; totalH += actualHours > 0 ? actualHours : (config.working_hours || 4); displayStatus = '1/2P'; unassignedAbsence += 0.5 }
        else if (status.includes('3/4')) { present++; totalH += actualHours > 0 ? actualHours : ((config.full_day_hours || 8) * 0.75); displayStatus = '3/4P'; unassignedAbsence += 0.25 }
        else if (status === 'WO' || status.includes('WEEKOFF') || status.includes('WOA')) { wo++; totalH += actualHours; displayStatus = 'WO' }
        else if (status === 'H' || status === 'HO' || status.includes('HOA') || status.includes('HOLIDAY')) { hol++; totalH += actualHours; displayStatus = 'H' }
        else if (status === 'PL') { plCount++; present++; totalH += actualHours > 0 ? actualHours : (config.full_day_hours || 8); displayStatus = 'PL' }
        else if (status === 'CL') { clCount++; present++; totalH += actualHours > 0 ? actualHours : (config.full_day_hours || 8); displayStatus = 'CL' }
        else if (status === 'SL') { slCount++; present++; totalH += actualHours > 0 ? actualHours : (config.full_day_hours || 8); displayStatus = 'SL' }
        else { absent++; totalH += actualHours; displayStatus = 'A'; unassignedAbsence += 1 }

        const isDeductible = dObj.getDate() >= (config.payroll_cutoff_date || 25)
        if (isDeductible) {
          if (displayStatus === '1/2P' || displayStatus === 'HD') deductibleUnassignedAbsence += 0.5
          else if (displayStatus === '3/4P') deductibleUnassignedAbsence += 0.25
          else if (displayStatus === 'A') deductibleUnassignedAbsence += 1
          else if (displayStatus === 'PL') deductiblePlCount += 1
          else if (displayStatus === 'CL') deductibleClCount += 1
          else if (displayStatus === 'SL') deductibleSlCount += 1
        }

        matrixRow[dateStr] = displayStatus

        daily.push({
          emp_id: emp.emp_id, emp_name: emp.emp_name, department: emp.department,
          date: dateStr,
          day: dObj.toLocaleDateString('en-US', { weekday: 'short' }),
          first_punch,
          last_punch,
          punch_count,
          hours: (status === 'P' ? (config.full_day_hours || 8) : (status.includes('1/2') ? (config.working_hours || 4) : 0)),
          status: displayStatus,
          late: 'No',
          is_holiday: status === 'H' || status.includes('HOA'),
          is_weekoff: status === 'WO' || status.includes('WOA')
        })
      })
      matrix.push(matrixRow)

      totalPresent += present
      totalAbsent += absent
      totalHalfDay += half
      totalHoliday += hol
      totalWeekoff += wo
      grandTotalHours += totalH

      const empBalances = leaveBalances[normalizeEmpId(emp.emp_id)] || {}
      const plTotal = empBalances.pl !== undefined ? empBalances.pl : 12
      const clTotal = empBalances.cl !== undefined ? empBalances.cl : 10
      const slTotal = empBalances.sl !== undefined ? empBalances.sl : 8

      const leaveCalc = computeSequentialLeaveDeduction(deductibleUnassignedAbsence, 0, deductiblePlCount, deductibleClCount, deductibleSlCount, plTotal, clTotal, slTotal)
      const trackedDaysCount = processedDaysCount

      summary.push({
        emp_id: emp.emp_id, emp_name: emp.emp_name, department: emp.department,
        'Total Days': trackedDaysCount,
        'Present (P)': present,
        'Absent (A)': absent,
        'Half Day (HD)': half,
        'Holidays (H)': hol,
        'Week Off (WO)': wo,
        'PL Total': plTotal,
        'CL Total': clTotal,
        'SL Total': slTotal,
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
        'Attendance %': round2((present + half * 0.5) / Math.max(trackedDaysCount - hol - wo, 1) * 100)
      })
    })

    const leaveDetails = buildLeaveDetailsList(matrix, allDates, leaveBalances)

    const stats = {
      totalEmployees: employees.length,
      totalPunches: daily.length,
      present: totalPresent,
      absent: totalAbsent,
      halfDay: totalHalfDay,
      holiday: totalHoliday,
      weekoff: totalWeekoff,
      lateMarks: totalLate,
      grandTotalHours: round2(grandTotalHours),
      avgHoursPerEmp: employees.length ? round2(grandTotalHours / employees.length) : 0,
      overallAttendancePct: summary.length ? round2(summary.reduce((a, s) => a + s['Attendance %'], 0) / summary.length) : 0
    }

    return { cleaned, daily, matrix, summary, leaveDetails, allDates, employees, detectedCols: detected, stats, leaveBalances: workbook?.__leaveBalances__ || {} }
  } else if (isMatrixSheet) {
    const empIdCol = mappings.emp_id || cols[0]
    const empNameCol = mappings.emp_name || (cols.length > 1 ? cols[1] : empIdCol)
    const deptCol = mappings.department || null

    const dataCols = cols.filter(c => c !== empIdCol && c !== empNameCol && c !== deptCol)
    const targetMonthStr = config.month || detectedMonth || '2026-08'
    const allDates = getFullMonthDates(targetMonthStr)

    const hasDateColumns = (workbook && workbook.__dateColKeys__ && workbook.__dateColKeys__.length > 0) || dateColsInfo.length > 0
    const datesPresentInExcel = new Set(
      (workbook && workbook.__dateColKeys__ && workbook.__dateColKeys__.length > 0)
        ? workbook.__dateColKeys__
        : dateColsInfo.map(info => info.dateStr)
    )

    let matrix: any[] = []
    let summary: any[] = []
    let daily: any[] = []
    let cleaned = []
    let employees = []

    let totalPresent = 0, totalAbsent = 0, totalHalfDay = 0, totalHoliday = 0, totalWeekoff = 0, totalLate = 0

    rawData.forEach((row: any) => {
      let emp_id = String(row[empIdCol] || '').trim()
      if (!emp_id || emp_id.toLowerCase() === 'nan' || emp_id.toLowerCase() === 'null') return
      if (emp_id === '1' || emp_id.toLowerCase() === 'emp id' || emp_id.toLowerCase().includes('employee')) return

      let emp_name = String(row[empNameCol] || emp_id).trim()
      let dept = deptCol ? String(row[deptCol] || 'General') : 'General'

      employees.push({ emp_id, emp_name, department: dept })

      let matrixRow = { emp_id, emp_name, department: dept }
      let present = 0, absent = 0, half = 0, hol = 0, wo = 0, late = 0, totalH = 0
      let plCount = 0, clCount = 0, slCount = 0
      let unassignedAbsence = 0
      let deductibleUnassignedAbsence = 0, deductiblePlCount = 0, deductibleClCount = 0, deductibleSlCount = 0

      allDates.forEach((dateStr, dayIndex) => {
        let rawVal = ''
        let hasCol = false
        const matchingColInfo = dateColsInfo.find(info => info.dayNum === (dayIndex + 1))
        if (matchingColInfo && row[matchingColInfo.colKey] !== undefined) {
          rawVal = String(row[matchingColInfo.colKey]).trim().toUpperCase()
          hasCol = true
        } else if (dayIndex < dataCols.length) {
          rawVal = String(row[dataCols[dayIndex]] || '').trim().toUpperCase()
          hasCol = true
        }

        let status = 'A'
        const isFutureDay = hasDateColumns && !datesPresentInExcel.has(dateStr)
        const dObj = new Date(dateStr + 'T00:00:00')
        const isDefaultWeekoff = (config.weekoff || [0]).includes(dObj.getDay())

        if (isDefaultWeekoff && !isFutureDay && (rawVal === 'A' || rawVal === '0' || rawVal === 'ABSENT' || rawVal.includes('WO') || rawVal === 'PL' || rawVal === 'CL' || rawVal === 'SL' || rawVal === 'LWP')) {
          rawVal = 'WO'
          hasCol = true
        }

        if (isFutureDay) {
          status = '-'
        } else if (hasCol && rawVal === '') {
          status = '-'
        } else if (rawVal === '3/4P' || rawVal.includes('3/4P') || rawVal === '¾P' || rawVal.includes('¾P')) {
          status = '3/4P'
          present++
          unassignedAbsence += 0.25
          totalH += (config.full_day_hours || 8) * 0.75
        } else if (rawVal === '1/2P' || rawVal.includes('1/2P') || rawVal === 'HD' || rawVal === 'HALF' || rawVal === '½P' || rawVal.includes('½P')) {
          status = '1/2P'
          half++
          totalH += (config.working_hours || 4)
          let explicitAssigned = false
          if (rawVal.includes('CL')) { clCount += 0.5; explicitAssigned = true }
          if (rawVal.includes('PL')) { plCount += 0.5; explicitAssigned = true }
          if (rawVal.includes('SL')) { slCount += 0.5; explicitAssigned = true }
          if (!explicitAssigned) unassignedAbsence += 0.5
        } else if (rawVal === 'P' || rawVal === '1' || rawVal === 'PRESENT') {
          status = 'P'
          present++
          totalH += (config.full_day_hours || 8)
        } else if (rawVal === 'WO' || rawVal === 'OFF' || rawVal === 'WEEKOFF') {
          status = 'WO'
          wo++
        } else if (rawVal === 'H' || rawVal === 'HO' || rawVal === 'HOLIDAY') {
          status = 'H'
          hol++
        } else if (rawVal === 'PL' || rawVal === 'PAID LEAVE') {
          status = 'PL'; plCount++
        } else if (rawVal === 'CL' || rawVal === 'CASUAL LEAVE') {
          status = 'CL'; clCount++
        } else if (rawVal === 'SL' || rawVal === 'SICK LEAVE') {
          status = 'SL'; slCount++
        } else {
          // If it's A, 0, ABSENT, or anything unrecognized, check if it's actually a holiday or weekoff first!
          const dObj = new Date(dateStr + 'T00:00:00')
          const isDefaultWeekoff = (config.weekoff || [0]).includes(dObj.getDay())
          const isHoliday = (config.holidays || []).includes(dateStr)

          if (isHoliday) {
            status = 'H'
            hol++
          } else if (isDefaultWeekoff) {
            status = 'WO'
            wo++
          } else if (rawVal === 'A' || rawVal === '0' || rawVal === 'ABSENT' || rawVal === '' || rawVal === '-') {
            status = 'A'
            absent++
            unassignedAbsence += 1
          } else {
            status = 'A'
            absent++
            unassignedAbsence += 1
          }
        }

        const isDeductible = dObj.getDate() >= (config.payroll_cutoff_date || 25)
        if (isDeductible) {
          if (status === '1/2P' || status === 'HD') { deductibleUnassignedAbsence += 0.5; if (rawVal.includes('PL')) deductiblePlCount += 0.5; else if (rawVal.includes('CL')) deductibleClCount += 0.5; else if (rawVal.includes('SL')) deductibleSlCount += 0.5; }
          else if (status === '3/4P') deductibleUnassignedAbsence += 0.25
          else if (status === 'A') deductibleUnassignedAbsence += 1
          else if (status === 'PL') deductiblePlCount += 1
          else if (status === 'CL') deductibleClCount += 1
          else if (status === 'SL') deductibleSlCount += 1
        }

        matrixRow[dateStr] = status

        if (status !== '-') {
          const dObj = new Date(dateStr + 'T00:00:00')
          daily.push({
            emp_id, emp_name, department: dept,
            date: dateStr,
            day: dObj.toLocaleDateString('en-US', { weekday: 'short' }),
            first_punch: (status === 'P' || status === '3/4P') ? '09:00:00' : '00:00:00',
            last_punch: (status === 'P' || status === '3/4P') ? '18:00:00' : '00:00:00',
            punch_count: (status === 'P' || status === '3/4P') ? 2 : 0,
            hours: status === 'P' ? (config.full_day_hours || 8) :
              (status === '3/4P' ? (config.full_day_hours || 8) * 0.75 :
                (status === '1/2P' || status === 'HD' ? (config.working_hours || 4) : 0)),
            status,
            late: 'No',
            is_holiday: status === 'H',
            is_weekoff: status === 'WO'
          })
        }
      })

      matrix.push(matrixRow)

      totalPresent += present
      totalAbsent += absent
      totalHalfDay += half
      totalHoliday += hol
      totalWeekoff += wo
      totalLate += late

      const leaveBalances = workbook?.__leaveBalances__ || {}
      const empBalances = leaveBalances[normalizeEmpId(emp_id)] || {}
      const plTotal = empBalances.pl !== undefined ? empBalances.pl : 12
      const clTotal = empBalances.cl !== undefined ? empBalances.cl : 10
      const slTotal = empBalances.sl !== undefined ? empBalances.sl : 8

      // Apply Sequential Priority Deduction Rule: PL -> CL -> SL -> LWP
      const leaveCalc = computeSequentialLeaveDeduction(deductibleUnassignedAbsence, 0, deductiblePlCount, deductibleClCount, deductibleSlCount, plTotal, clTotal, slTotal)

      const trackedDaysCount = allDates.filter((d: any) => matrixRow[d] !== '-').length
      summary.push({
        emp_id, emp_name, department: dept,
        'Total Days': trackedDaysCount,
        'Present (P)': present,
        'Absent (A)': absent,
        'Half Day (HD)': half,
        'Holidays (H)': hol,
        'Week Off (WO)': wo,
        'PL Total': plTotal,
        'CL Total': clTotal,
        'SL Total': slTotal,
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
        'Attendance %': round2((present + half * 0.5) / Math.max(trackedDaysCount - hol - wo, 1) * 100)
      })
    })

    const leaveDetails = buildLeaveDetailsList(matrix, allDates, workbook?.__leaveBalances__ || {})

    const stats = {
      totalEmployees: employees.length,
      totalPunches: daily.length,
      present: totalPresent,
      absent: totalAbsent,
      halfDay: totalHalfDay,
      holiday: totalHoliday,
      weekoff: totalWeekoff,
      lateMarks: totalLate,
      grandTotalHours: round2(summary.reduce((acc, s) => acc + (s['Total Hours'] || 0), 0)),
      avgHoursPerEmp: employees.length ? round2(summary.reduce((acc, s) => acc + (s['Total Hours'] || 0), 0) / employees.length) : 0,
      overallAttendancePct: summary.length ? round2(summary.reduce((a, s) => a + s['Attendance %'], 0) / summary.length) : 0
    }

    return { cleaned, daily, matrix, summary, leaveDetails, allDates, employees, detectedCols: detected, stats, leaveBalances: workbook?.__leaveBalances__ || {} }
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
      date: getLocalDateString(dt.getFullYear(), dt.getMonth() + 1, dt.getDate()),
      time: dt.toTimeString().split(' ')[0]
    })
  }

  cleaned.sort((a: any, b: any) => a.emp_id.localeCompare(b.emp_id) || a.punch_datetime - b.punch_datetime)

  const holidaySet = new Set((config.holidays || []).map((h: any) => { try { return new Date(h).toISOString().split('T')[0] } catch { return h } }))
  const weekoff = config.weekoff || [0]
  const lateThreshold = config.late_threshold || "10:00"
  const [lateH, lateM] = lateThreshold.split(':').map(Number)

  const grouped = {}
  cleaned.forEach((r: any) => { const key = `${r.emp_id}__${r.date}`; if (!grouped[key]) grouped[key] = []; grouped[key].push(r) })

  let daily: any[] = []
  Object.entries(grouped).forEach(([key, punches]) => {
    (punches as any).sort((a: any, b: any) => a.punch_datetime - b.punch_datetime)
    const first = (punches as any)[0]; const last = punches[(punches as any).length - 1]
    const dateObj = new Date(first.date)
    const hours = (punches as any).length > 1 ? (last.punch_datetime - first.punch_datetime) / 1000 / 3600 : 0
    const isHoliday = holidaySet.has(first.date)
    const isWeekoff = weekoff.includes(dateObj.getDay())

    let status = 'A'
    if (isHoliday) status = 'H'
    else if (isWeekoff) status = 'WO'
    else {
      if (hours >= (config.full_day_hours || 8)) status = 'P'
      else if (hours >= (config.working_hours || 4)) status = 'HD'
      else if ((punches as any).length >= 1) status = 'P'
    }

    const firstHour = first.punch_datetime.getHours() + first.punch_datetime.getMinutes() / 60
    const lateLimit = lateH + lateM / 60
    const isLate = firstHour > lateLimit && !isHoliday && !isWeekoff

    daily.push({
      emp_id: first.emp_id,
      emp_name: first.emp_name,
      department: first.department,
      date: first.date,
      day: dateObj.toLocaleDateString('en-US', { weekday: 'short' }),
      first_punch: first.time,
      last_punch: last.time,
      punch_count: (punches as any).length,
      hours: round2(hours),
      status,
      late: isLate ? 'Yes' : 'No',
      is_holiday: isHoliday,
      is_weekoff: isWeekoff
    })
  })

  const allDates = getFullMonthDates(config.month || detectedMonth)
  const employees = [...new Map(daily.map((d: any) => [d.emp_id, { emp_id: d.emp_id, emp_name: d.emp_name, department: d.department }])).values()]
  let matrix: any[] = [], summary = []

  let totalPresent = 0, totalAbsent = 0, totalHalfDay = 0, totalHoliday = 0, totalWeekoff = 0, totalLate = 0, grandTotalHours = 0

  employees.forEach(emp => {
    let empDaily = daily.filter((d: any) => d.emp_id === emp.emp_id)
    let empMap = Object.fromEntries(empDaily.map((d: any) => [d.date, d]))
    let row = { emp_id: emp.emp_id, emp_name: emp.emp_name, department: emp.department }
    let present = 0, absent = 0, half = 0, hol = 0, wo = 0, late = 0, totalH = 0

    allDates.forEach(dateStr => {
      const rec = empMap[dateStr]
      if (rec) {
        row[dateStr] = rec.status
        if (rec.status === 'P') present++
        else if (rec.status === 'A') absent++
        else if (rec.status === 'HD') half++
        else if (rec.status === 'H') hol++
        else if (rec.status === 'WO') wo++

        if (rec.late === 'Yes') late++
        totalH += rec.hours
      } else {
        const dObj = new Date(dateStr)
        const isH = holidaySet.has(dateStr)
        const isW = weekoff.includes(dObj.getDay())
        if (isH) { row[dateStr] = 'H'; hol++ }
        else if (isW) { row[dateStr] = 'WO'; wo++ }
        else { row[dateStr] = 'A'; absent++ }
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

    const leaveBalances = workbook?.__leaveBalances__ || {}
    const empBalances = leaveBalances[normalizeEmpId(emp.emp_id)] || {}
    const plTotal = empBalances.pl !== undefined ? empBalances.pl : 12
    const clTotal = empBalances.cl !== undefined ? empBalances.cl : 10
    const slTotal = empBalances.sl !== undefined ? empBalances.sl : 8

    // Apply Sequential Priority Deduction Rule: PL -> CL -> SL -> LWP
    const leaveCalc = computeSequentialLeaveDeduction(absent, half, 0, 0, 0, plTotal, clTotal, slTotal)

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
      'PL Total': plTotal,
      'CL Total': clTotal,
      'SL Total': slTotal,
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

  const leaveDetails = buildLeaveDetailsList(matrix, allDates, workbook?.__leaveBalances__ || {})

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
    avgHoursPerEmp: employees.length ? round2(grandTotalHours / employees.length) : 0,
    overallAttendancePct: summary.length
      ? round2(summary.reduce((acc, s) => acc + s['Attendance %'], 0) / summary.length)
      : 0
  }

  return { cleaned, daily, matrix, summary, leaveDetails, allDates, employees, detectedCols: detected, stats, leaveBalances: workbook?.__leaveBalances__ || {} }
}

function generateSampleWorkbook() {
  const empList = [
    { id: 'EMP1001', name: 'James Smith', dept: 'Engineering' },
    { id: 'EMP1002', name: 'Sophia Chen', dept: 'Product' },
    { id: 'EMP1003', name: 'Marcus Vance', dept: 'Design' },
    { id: 'EMP1004', name: 'Elena Rostova', dept: 'HR & Ops' },
    { id: 'EMP1005', name: 'David Miller', dept: 'Engineering' }
  ]

  const sampleRows: any[] = []
  const year = 2026, month = 7
  const days = 31

  for (let day = 1; day <= days; day++) {
    const dStr = getLocalDateString(year, month + 1, day)
    const dateObj = new Date(year, month, day)
    const isSunday = dateObj.getDay() === 0

    if (isSunday) continue

    empList.forEach((emp, i) => {
      const isAbsent = (day === 3 && i === 0) || (day === 5 && i === 0) || (day === 13 && i === 0)
      if (isAbsent) return

      const isLate = (day % 4 === 0 && i === 0) || (day % 6 === 0 && i === 2)
      const inHour = isLate ? 10 : 9
      const inMinute = isLate ? Math.floor(Math.random() * 25) + 5 : Math.floor(Math.random() * 15)
      const inTime = `${String(inHour).padStart(2, '0')}:${String(inMinute).padStart(2, '0')}:00`

      const outHour = 17 + (Math.random() > 0.5 ? 1 : 0)
      const outMinute = Math.floor(Math.random() * 45)
      const outTime = `${String(outHour).padStart(2, '0')}:${String(outMinute).padStart(2, '0')}:00`

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

async function exportToExcel(data: any, config: any, fileName: any) {
  const XLSX = await getXLSX()
  const wb = XLSX.utils.book_new()

  // 1. Monthly_BasicReportForEmployee
  const matrixAoa = []
  const dateCols = data.allDates || []
  const totalCols = 3 + dateCols.length + 11

  // Row 1
  matrixAoa.push(new Array(totalCols).fill(null))
  // Row 2
  const r2 = new Array(totalCols).fill(null)
  r2[0] = config.company_name || "Plot 21 & 22"
  matrixAoa.push(r2)
  // Row 3
  const r3 = new Array(totalCols).fill(null)
  r3[0] = "Monthly Basic Attendance Report"
  matrixAoa.push(r3)
  // Row 4
  const r4 = new Array(totalCols).fill(null)
  if (dateCols.length > 0) {
    const formatD = (ds: any) => {
      const d = new Date(ds);
      return `${String(d.getDate()).padStart(2, '0')}-${d.toLocaleString('default', { month: 'short' })}-${d.getFullYear()}`
    }
    r4[0] = `${formatD(dateCols[0])} to ${formatD(dateCols[dateCols.length - 1])}`
  }
  matrixAoa.push(r4)
  // Row 5
  const r5 = new Array(totalCols).fill(null)
  dateCols.forEach((dc: any, i: any) => {
    const d = new Date(dc)
    r5[3 + i] = `${String(d.getDate()).padStart(2, '0')}-${d.toLocaleString('default', { month: 'short' })}`
  })
  const summaryHeaders = ['P', 'A', 'LOP', 'CL', 'PL', 'SL', 'COFF', 'H', 'HP', 'WO', 'WOP']
  const startSum = 3 + dateCols.length
  summaryHeaders.forEach((h, i) => { r5[startSum + i] = h })
  matrixAoa.push(r5)
  // Row 6
  const r6 = new Array(totalCols).fill(null)
  r6[0] = 'No'; r6[1] = 'Code'; r6[2] = 'Emp Name'
  dateCols.forEach((dc: any, i: any) => {
    const d = new Date(dc)
    r6[3 + i] = `${d.getDate()}-${d.toLocaleString('default', { weekday: 'short' })}`
  })
  matrixAoa.push(r6)

  // Data rows
  data.matrix.forEach((row: any, idx: any) => {
    const empSummary = data.summary.find((s: any) => s.emp_id === row.emp_id) || {}
    const dr = new Array(totalCols).fill(null)
    dr[0] = idx + 1
    dr[1] = row.emp_id
    dr[2] = row.emp_name
    dateCols.forEach((dc: any, i: any) => { dr[3 + i] = row[dc] || 'A' })
    dr[startSum + 0] = empSummary['Present (P)'] || 0
    dr[startSum + 1] = empSummary['Absent (A)'] || 0
    dr[startSum + 2] = 0 // LOP
    dr[startSum + 3] = 0 // CL
    dr[startSum + 4] = 0 // PL
    dr[startSum + 5] = 0 // SL
    dr[startSum + 6] = 0 // COFF
    dr[startSum + 7] = empSummary['Holidays (H)'] || 0
    dr[startSum + 8] = empSummary['Half Day (HD)'] || 0
    dr[startSum + 9] = empSummary['Week Off (WO)'] || 0
    dr[startSum + 10] = 0 // WOP
    matrixAoa.push(dr)
  })

  // 2. Attendance Export logs
  const dailyLogHeaders = ['Attendance Date', 'Employee Code', 'Employee Name', 'Department', 'Designation', 'DOJ', 'Shift Code', 'Begin Time', 'End Time', 'In Time', 'Out Time', 'Duration', 'LateBy', 'EarlyBy', 'LeaveType', 'Leave Status', 'Att Status', 'Status Code', 'TotalDuration', 'Punch Records', 'Location', 'Unnamed: 21']
  const dailyAoa = [dailyLogHeaders]
  data.daily.forEach((row: any) => {
    dailyAoa.push([
      row.date, row.emp_id, row.emp_name, row.department || 'Security', '', '', 'NS', '00:00:00', '00:00:00',
      row.first_punch || '00:00:00', row.last_punch || '00:00:00', row.hours || 0, 0, 0, '',
      row.status === 'A' ? 'Absent' : (row.status === 'WO' ? 'WeekOff' : 'Present'),
      row.status, '', row.hours || 0, '', 'Unit 1', ''
    ])
  })

  // 3. Leave Summary
  const lsHeaders = ['Employee Name', 'Employee Code', 'Company', 'Department', 'RHO-Balance', 'COFF-Balance', 'CL-Balance', 'PL-Balance', 'SL-Balance', 'AE-COFF-Balance', 'LOP-Balance']
  const lsAoa = [lsHeaders]
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

  // 4. File format to upload
  const ffuHeaders = ['EmployeeCode', 'LeaveStatus', 'LeaveCode', 'FromDate', 'ToDate', 'IsApproved', 'ApprovedBy', 'Remarks', 'Reason', 'Session']
  const ffuAoa = [
    ffuHeaders,
    [null, null, null, null, null, 1.0, 'Smart', 'test', 'test', null],
    [], [],
    ['Leave status \nNo. of days leave applied\nLeave code\nSL, PL, CL']
  ]

  // 5. Leave rules
  const lrHeaders = ['Unnamed: 0', 'Unnamed: 1', 'Unnamed: 2']
  const lrAoa = [
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

  XLSX.writeFile(wb, fileName)
}

function HelicalWaterBackground() {
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        background: `
          radial-gradient(circle at 20% 30%, rgba(40, 38, 127, 0.45) 0%, transparent 60%),
          radial-gradient(circle at 80% 70%, rgba(30, 27, 75, 0.5) 0%, transparent 70%),
          linear-gradient(135deg, #090d16 0%, #0f172a 100%)
        `
      }}
    />
  )
}

window.resolveAttendanceStatus = resolveAttendanceStatus;
export default function App() {
  const store = useAttendanceStore();
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem('app-theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const toggleTheme = useCallback((val: boolean) => {
    document.documentElement.classList.add('theme-transition-lock');
    if (val) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('app-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('app-theme', 'light');
    }
    setIsDark(val);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.documentElement.classList.remove('theme-transition-lock');
      });
    });
  }, []);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('app-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('app-theme', 'light');
    }
  }, [isDark]);

  const [user, setUser] = useState<any>(null)
  const [isPageLoading, setIsPageLoading] = useState(false)
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })

  const navigateWithLoader = (callback: any) => {
    setIsPageLoading(true)
    setTimeout(() => {
      callback()
      setTimeout(() => {
        setIsPageLoading(false)
      }, 400) // Keep loader visible briefly for smooth transition
    }, 50)
  }
  const [loginError, setLoginError] = useState<string>('')
  const [showPassword, setShowPassword] = useState(false)
  const [showDevWidget, setShowDevWidget] = useState(false)

  const [excelFile, setExcelFile] = useState<any>(null)
  const [pythonFile, setPythonFile] = useState<any>(null)
  const [pythonContent, setPythonContent] = useState<string>('')
  const [workbook, setWorkbook] = useState<any>(null)
  const [rawPreview, setRawPreview] = useState<any[]>([])
  const [availableCols, setAvailableCols] = useState<any[]>([])
  const [customMappings, setCustomMappings] = useState({})

  const [processed, setProcessed] = useState<any>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [dragActiveExcel, setDragActiveExcel] = useState(false)
  const [dragActivePy, setDragActivePy] = useState(false)

  // Filters & Selected Employee Modal
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [selectedDept, setSelectedDept] = useState('ALL')
  const [activeTab, setActiveTab] = useState('matrix')

  useEffect(() => {
    if (!store.isInitializing && !store.isLoaded) {
      console.log("Fetching pre-compiled JSON data...");
      fetch('/processed_hr_data.json')
        .then(res => {
          if (!res.ok) throw new Error("processed_hr_data.json not found yet");
          return res.json();
        })
        .then(fullData => {
          store.setGlobalData({
            employees: fullData.employees || [],
            attendanceLogs: fullData.attendanceLogs || [],
            leaveBalances: fullData.leaveBalances || [],
            departments: fullData.departments || [],
            isLoaded: true
          });

          // Auto-detect most recent month
          const months = new Set(fullData.attendanceLogs.filter((l: any) => l.date).map((l: any) => l.date.substring(0, 7)));
          const sortedMonths = Array.from(months).sort();
          if (sortedMonths.length > 0) {
            store.setSelectedMonth(sortedMonths[sortedMonths.length - 1]);
          }
        })
        .catch(err => console.warn('No fallback HR Database.xlsx found', err));
    }
  }, [store.isInitializing, store.isLoaded]);
  // matrix | leave_details | summary
  const [mainView, setMainView] = useState('dashboard') // dashboard | import_export
  const [slideDirection, setSlideDirection] = useState(1) // 1 = right (next), -1 = left (prev)
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null)
  const handleSelectEmployee = useCallback((emp: any) => setSelectedEmployee(emp), [])

  // Sidebar Lock, Hover Expand & Mobile Drawer States
  const [isSidebarLocked, setIsSidebarLocked] = useState(() => {
    return localStorage.getItem('autocrat_sidebar_locked') === 'true'
  })
  const [isSidebarHovered, setIsSidebarHovered] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isMobileScreen, setIsMobileScreen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobileScreen(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const toggleSidebarLock = () => {
    setIsSidebarLocked((prev: any) => {
      const next = !prev
      localStorage.setItem('autocrat_sidebar_locked', String(next))
      return next
    })
  }

  const isSidebarExpanded = isSidebarLocked || isSidebarHovered

  const TAB_ORDER = ['matrix', 'leave_details', 'summary']

  const changeTabWithDirection = (targetTab: any) => {
    navigateWithLoader(() => {
      setMainView('dashboard')
      const currentIndex = TAB_ORDER.indexOf(activeTab)
      const targetIndex = TAB_ORDER.indexOf(targetTab)
      if (targetIndex !== currentIndex) {
        setSlideDirection(targetIndex > currentIndex ? 1 : -1)
        setActiveTab(targetTab)
      }
    })
  }

  const handleSwipeEnd = (event: any, info: any) => {
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
  const [outputFolder, setOutputFolder] = useState<string>('')
  const [outputFileName, setOutputFileName] = useState<string>('')

  const excelInputRef = useRef(null)
  const pyInputRef = useRef(null)
  const leaveBalancesInputRef = useRef(null)

  const [leaveBalancesFile, setLeaveBalancesFile] = useState<any>(null)
  const [leaveBalancesMap, setLeaveBalancesMap] = useState({})

  const [config, setConfig] = useState({
    company_name: "Autocrat Engineers",
    month: "",
    working_hours: 4.0,
    full_day_hours: 8.0,
    late_threshold: "10:00",
    payroll_cutoff_date: 25,
    holidays: [
      "2026-01-14",
      "2026-01-26",
      "2026-03-19",
      "2026-05-01",
      "2026-08-15",
      "2026-09-14",
      "2026-10-02",
      "2026-10-21",
      "2026-11-01",
      "2026-11-09"
    ],
    weekoff: [0],
    newHoliday: "",
    python_file_name: "",
    output_folder: ""
  })

  const [showSettings, setShowSettings] = useState(false)
  const [showMappingPanel, setShowMappingPanel] = useState(false)
  const [showPyPreview, setShowPyPreview] = useState(false)
  const [toast, setToast] = useState<any>(null)

  const showToast = (msg: any, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 4000) }

  const handleLogin = () => {
    const { email, password } = loginForm
    const cleanEmail = email.trim().toLowerCase()
    const cleanPass = password.trim()

    if (!cleanEmail || !cleanPass) {
      setLoginError('Please fill in both email and password.')
      return
    }

    if (cleanEmail === 'mvp@autocratengineers.in' && cleanPass === '1234') {
      setUser({ email: 'mvp@autocratengineers.in', role: 'hr', name: 'Mervin Ezekiel V' })
      setLoginError('')
      showToast('Logged in as HR Administrator', 'success')
    } else if (cleanEmail === 'hod@autocratengineers.in' && cleanPass === '1234') {
      setUser({ email: 'hod@autocratengineers.in', role: 'hod', name: 'HOD Supervisor' })
      setLoginError('')
      showToast('Logged in as Department Supervisor', 'success')
    } else if (cleanEmail === 'employee@autocratengineers.in' && cleanPass === '1234') {
      setUser({ email: 'employee@autocratengineers.in', role: 'employee', name: 'Jeevan Jena' })
      setLoginError('')
      showToast('Logged in as Employee', 'success')
    } else {
      setLoginError('Invalid email or password.')
    }
  }

  useEffect(() => {
    if (user?.role === 'employee' && processed?.summary) {
      const match = processed.summary.find((e: any) => normalizeEmpId(e.emp_id) === '182020017' || e.emp_name.toLowerCase().includes('jeevan'))
      if (match) setSelectedEmployee(match)
    }
  }, [user, processed])

  useEffect(() => {
    if (store.isInitializing) return;

    const loadRealData = async () => {
      try {
        // Fetch the compiled JSON from the Python pipeline instead of heavy browser XLSX parsing
        const response = await fetch('/processed_hr_data.json');
        if (!response.ok) return;

        const fullData = await response.json();

        store.setGlobalData({
          employees: fullData.employees || [],
          attendanceLogs: fullData.attendanceLogs || [],
          departments: fullData.departments || [],
          leaveBalances: fullData.leaveBalances || []
        });
      } catch (err) {
        console.error("Failed to load processed JSON data:", err);
      }
    }

    // Always fetch latest compiled JSON from backend on load
    loadRealData();
  }, [store.isInitializing]);


  // Dynamic processedPayload regeneration for Relational HR Database
  useEffect(() => {
    if (store.isLoaded && store.attendanceLogs.length > 0 && store.selectedMonth) {
      try {
        const currentMonthLogs = store.attendanceLogs.filter((l: any) => l.date && l.date.startsWith(store.selectedMonth));
        const allDates = getFullMonthDates(store.selectedMonth);

        const lastRecordedDateStr = store.attendanceLogs.length > 0
          ? store.attendanceLogs.reduce((max: string, log: any) => log.date > max ? log.date : max, store.attendanceLogs[0].date)
          : null;

        const processedPayload = {
          summary: store.employees.map((e: any) => {
            const empRecord: any = {
              emp_id: String(e.emp_id || '0'),
              emp_name: String(e.emp_name || 'Unknown Employee'),
              department: e.department,
              designation: e.designation,
              doj: e.doj
            };

            let present_days = 0, absent_days = 0;
            let pl_used = 0, cl_used = 0, sl_used = 0, lwp_used = 0, hd_count = 0;

            const empLogs = currentMonthLogs.filter((l: any) => String(l.emp_id) === String(e.emp_id));
            const empLogMap = new Map();
            empLogs.forEach((l: any) => empLogMap.set(l.date, l));

            let validWorkingDays = 0;
            allDates.forEach((d: string) => {
              if (lastRecordedDateStr && d > lastRecordedDateStr) return;

              const l = empLogMap.get(d);
              const status = resolveAttendanceStatus(l?.detailed_status_code, d, e.doj || null, l?.duration, lastRecordedDateStr);
              empRecord[d] = status;

              if (status === '-') return;
              validWorkingDays++;

              if (status === 'P') present_days++;
              else if (status === '1/2P' || status === '3/4P' || status === 'HD') hd_count++;
              else if (status === 'A') absent_days++;
              else if (status === 'PL') pl_used++;
              else if (status === 'CL') cl_used++;
              else if (status === 'SL') sl_used++;
            });

            empRecord.present_days = present_days + (hd_count * 0.5);
            empRecord['Present (P)'] = present_days;
            empRecord['Half Day (HD)'] = hd_count;
            empRecord['Absent (A)'] = absent_days;

            const balanceObj = store.leaveBalances.find((b: any) => b.emp_id === e.emp_id) || { pl: 0, cl: 0, sl: 0, lwp: 0 };
            empRecord['PL Remaining'] = balanceObj.pl;
            empRecord['CL Remaining'] = balanceObj.cl;
            empRecord['SL Remaining'] = balanceObj.sl;
            empRecord['LWP Used'] = balanceObj.lop || lwp_used;

            empRecord['Attendance %'] = Math.round((empRecord.present_days / (validWorkingDays || 1)) * 100);

            return empRecord;
          }),
          leaveDetails: currentMonthLogs.filter((l: any) => {
            const status = resolveAttendanceStatus(l.detailed_status_code, l.date, null, l.duration);
            return status !== 'P' && status !== 'H' && status !== 'WO' && status !== '-';
          }).map((l: any) => ({
            'emp id': l.emp_id,
            emplname: l.emp_name,
            department: l.department,
            'leave value': '1 (Full Day)',
            'leave type': l.detailed_status_code,
            'start date': l.date,
            'end date': l.date
          })),
          meta: { total_working_hours: 8402 },
          allDates: allDates,
          employees: store.employees,
          detectedCols: { emp_id: 'EmployeeId', emp_name: 'EmployeeName', date: 'AttendanceDate' },
          stats: { grandTotalHours: 8402 },
          matrix: store.employees.map((e: any) => {
            const rec: any = { 
              emp_id: String(e.emp_id || '0'), 
              emp_name: String(e.emp_name || 'Unknown Employee'), 
              department: e.department,
              doj: e.doj || null 
            };
            const empLogs = currentMonthLogs.filter((l: any) => String(l.emp_id) === String(e.emp_id));
            const empLogMap = new Map();
            empLogs.forEach((l: any) => empLogMap.set(l.date, l));

            allDates.forEach((d: string) => {
              const l = empLogMap.get(d);
              rec[d] = resolveAttendanceStatus(l?.detailed_status_code, d, e.doj || null, l?.duration, lastRecordedDateStr);
            });
            return rec;
          }),
          matrix_raw: store.employees.map((e: any) => {
            const rec: any = { 
              emp_id: String(e.emp_id || '0'),
              emp_name: String(e.emp_name || 'Unknown Employee'),
              department: e.department,
              doj: e.doj || null 
            };
            const empLogs = currentMonthLogs.filter((l: any) => String(l.emp_id) === String(e.emp_id));
            const empLogMap = new Map();
            empLogs.forEach((l: any) => empLogMap.set(l.date, l));

            allDates.forEach((d: string) => {
              const l = empLogMap.get(d);
              rec[d] = l?.detailed_status_code || resolveAttendanceStatus(l?.detailed_status_code, d, e.doj || null, l?.duration, lastRecordedDateStr);
            });
            return rec;
          }),
          daily: currentMonthLogs.map((l: any) => ({
            emp_id: String(l.emp_id),
            date: l.date,
            first_punch: l.in_time,
            last_punch: l.out_time,
            duration: l.duration
          })),
          lastRecordedDateStr
        };

        setProcessed(processedPayload);
      } catch (err: any) {
        console.error("Payload generator crashed:", err);
        showToast(`Dashboard generator error: ${err.message}`, 'error');
      }
    }
  }, [store.isLoaded, store.selectedMonth, store.employees, store.attendanceLogs]);

  const handleExcelFile = async (f) => {

    if (!f) return
    setExcelFile(f)
    setOutputFileName(`${config.company_name.replace(/\s+/g, '_')}_Attendance_${config.month}.xlsx`)
    try {
      const XLSX = await getXLSX()
      const buf = await f.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array', cellDates: true });
      const normalizedSheets = wb.SheetNames.map((n: any) => String(n).toLowerCase().replace(/\s+/g, ''));
      if (normalizedSheets.includes('employees') && normalizedSheets.includes('attendancelogs')) {
        showToast('Massive HR Database Detected. Loading pre-compiled Python output to bypass browser memory limits...', 'info')

        try {
          const res = await fetch('/processed_hr_data.json');
          if (!res.ok) throw new Error("Please run `python process_hr_data.py` first!");
          const fullData = await res.json();
          store.setGlobalData({
            employees: fullData.employees || [],
            departments: fullData.departments || [],
            designations: fullData.designations || [],
            leaveBalances: fullData.leaveBalances || [],
            attendanceLogs: fullData.attendanceLogs || [],
            isLoaded: true
          })
          if ((fullData.attendanceLogs as any).__parseError) {
            showToast(`Parser Error: ${(fullData.attendanceLogs as any).__parseError}`, 'error');
          } else if (!fullData.attendanceLogs || fullData.attendanceLogs.length === 0) {
            showToast(`Warning: 0 logs extracted. Did you run the Python script?`, 'error');
          } else {
            showToast(`Successfully loaded ${fullData.attendanceLogs.length} logs from pre-compiled payload!`, 'success');

            // Auto-detect the most recent month just like in auto-load
            const months = new Set(fullData.attendanceLogs.filter((l: any) => l.date).map((l: any) => l.date.substring(0, 7)));
            const sortedMonths = Array.from(months).sort();
            if (sortedMonths.length > 0) {
              store.setSelectedMonth(sortedMonths[sortedMonths.length - 1]);
            }
          }
        } catch (fetchErr: any) {
          setError(fetchErr.message);
          showToast(fetchErr.message, 'error');
        }

        setMainView('dashboard')
        setWorkbook(wb);

        return;
      }

      const PREFERRED = ['Monthly_BasicReportForEmployee', 'Attendance Export logs', 'Sheet1', 'Attendance', 'Sheet']
      const sheetToTry = PREFERRED.find((n: any) => wb.SheetNames.includes(n)) || wb.SheetNames[0]

      // --- Try Monthly Basic format (calculations.xlsx style) first ---
      let parsed = tryParseMonthlyBasicSheet(XLSX, wb, sheetToTry)
      let json, finalWb, monthOverride

      if (parsed && parsed.rawData.length > 0) {
        json = parsed.rawData
        finalWb = parsed.fakeWb
        monthOverride = parsed.detectedMonth
        showToast(`Detected Monthly Basic Report — ${parsed.rawData.length} employee rows, sheet: "${sheetToTry}"`, 'success')
      } else {
        // Standard path: read the chosen sheet with default header
        const sheet = wb.Sheets[sheetToTry]
        json = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false })
        finalWb = wb
        finalWb.__rawData__ = json
      }

      const parsedBalances = parseLeaveSummary(XLSX, wb) || {}
      finalWb.__originalLeaveBalances__ = parsedBalances
      const balances = Object.keys(leaveBalancesMap).length > 0 ? leaveBalancesMap : parsedBalances
      finalWb.__leaveBalances__ = balances

      setWorkbook(finalWb)
      if (json.length > 0) {
        const cols = Object.keys(json[0])
        setAvailableCols(cols)
        setRawPreview(json.slice(0, 20))
        const detected = autoDetectColumns(cols)
        setCustomMappings(detected)

        const cfgOverride = monthOverride ? { ...config, month: monthOverride } : config
        const result = processExcelInBrowser(finalWb, cfgOverride, detected, json)
        setProcessed(result)
        showToast(`Processed ${result.employees.length} employees from ${f.name}`)
      } else {
        showToast('Excel sheet contains no data rows', 'error')
      }
    } catch (e: any) {
      showToast('Failed to read Excel file: ' + e.message, 'error')
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
    setConfig((prev: any) => ({ ...prev, python_file_name: "" }))
    if (pyInputRef.current) pyInputRef.current.value = ''
    showToast("Python converter file detached — using built-in processor", 'success')
  }

  const handleLeaveBalancesFile = async (f) => {
    if (!f) return
    setLeaveBalancesFile(f)
    try {
      const XLSX = await getXLSX()
      const buf = await f.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array', cellDates: true });

      const balances = parseLeaveSummary(XLSX, wb)
      if (balances && Object.keys(balances).length > 0) {
        setLeaveBalancesMap(balances)
        showToast(`Loaded leave balances for ${Object.keys(balances).length} employees`, 'success')

        if (workbook && config) {
          workbook.__leaveBalances__ = balances
          const result = processExcelInBrowser(workbook, config, customMappings, workbook.__rawData__)
          setProcessed(result)
        }
      } else {
        showToast('Could not find or parse "Leave summary" sheet in the file', 'error')
        setLeaveBalancesFile(null)
        setLeaveBalancesMap({})
      }
    } catch (e: any) {
      showToast('Failed to read file: ' + e.message, 'error')
      setLeaveBalancesFile(null)
      setLeaveBalancesMap({})
    }
  }

  const removeLeaveBalancesFile = () => {
    setLeaveBalancesFile(null)
    setLeaveBalancesMap({})
    if (leaveBalancesInputRef.current) leaveBalancesInputRef.current.value = ''

    if (workbook && config) {
      workbook.__leaveBalances__ = workbook.__originalLeaveBalances__ || {}
      const result = processExcelInBrowser(workbook, config, customMappings, workbook.__rawData__)
      setProcessed(result)
    }
    showToast("Leave balances file detached", 'success')
  }

  const handleSelectLeaveBalancesFile = async () => {
    leaveBalancesInputRef.current?.click()
  }

  const loadSampleData = (silent = false) => {
    try {
      const { wb, sampleRows } = generateSampleWorkbook()
      setWorkbook(wb)
      setExcelFile({ name: 'sample.xlsx (Demo)', size: 12673 })
      setOutputFileName(`${config.company_name.replace(/\s+/g, '_')}_Attendance_${config.month}.xlsx`)
      const cols = Object.keys(sampleRows[0])
      setAvailableCols(cols)
      setRawPreview(sampleRows.slice(0, 20))
      const detected = autoDetectColumns(cols)
      setCustomMappings(detected)

      const result = processExcelInBrowser(wb, config, detected)

      setProcessed(result)
      if (!silent) showToast("⚡ Loaded Attendance Data with Priority Leave Deduction Rule (PL -> CL -> SL)", 'success')
    } catch (e: any) {
      if (!silent) showToast("Sample generation failed: " + e.message, 'error')
    }
  }

  const handleSelectPyFile = async () => {
    if ((window as any).pywebview?.api?.select_python_file) {
      try {
        const filePath = await (window as any).pywebview.api.select_python_file()
        if (filePath) {
          const fileName = filePath.split(/[\\/]/).pop()
          setPythonFile({ name: fileName, path: filePath, size: 2048 })
          setConfig((prev: any) => ({ ...prev, python_file_name: fileName, python_path: filePath }))
          const readRes = await (window as any).pywebview.api.read_python_file(filePath)
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
    if ((window as any).pywebview?.api?.select_excel_file) {
      try {
        const filePath = await (window as any).pywebview.api.select_excel_file()
        if (filePath) {
          const fileName = filePath.split(/[\\/]/).pop()
          showToast(`📊 Selected Excel File: ${fileName}`)
          setConfig((prev: any) => ({ ...prev, excel_path: filePath }))
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
    setConfig((prev: any) => ({ ...prev, python_file_name: f.name }))
    try {
      const text = await f.text()
      setPythonContent(text.slice(0, 15000))
      setShowPyPreview(false)
      showToast(`🐍 Attached Python Converter: ${f.name} (Code preview hidden by default)`)
    } catch (e: any) {
      showToast("Failed to read Python file: " + e.message, 'error')
    }
  }

  const onDropExcel = (e: any) => { e.preventDefault(); setDragActiveExcel(false); const f = e.dataTransfer.files?.[0]; if (f) handleExcelFile(f) }
  const onDropPy = (e: any) => { e.preventDefault(); setDragActivePy(false); const f = e.dataTransfer.files?.[0]; if (f) handlePythonFile(f) }
  const onDropLeave = (e: any) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleLeaveBalancesFile(f) }

  const selectOutputFolder = async () => {
    if ((window as any).pywebview?.api?.select_folder) {
      try {
        const folder = await (window as any).pywebview.api.select_folder()
        if (folder) {
          setOutputFolder(folder)
          setConfig((prev: any) => ({ ...prev, output_folder: folder }))
          showToast(`📁 Output folder set: ${folder}`)
          return
        }
      } catch (e: any) {
        console.warn("PyWebView folder selection:", e)
      }
    }

    if ((window as any).showDirectoryPicker) {
      try {
        const handle = await (window as any).showDirectoryPicker()
        if (handle && handle.name) {
          setOutputFolder(handle.name)
          setConfig((prev: any) => ({ ...prev, output_folder: handle.name }))
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
    input.onchange = (e: any) => {
      if (e.target.files! && e.target.files!.length > 0) {
        const folderPath = e.target.files![0].webkitRelativePath.split('/')[0]
        setOutputFolder(folderPath)
        setConfig((prev: any) => ({ ...prev, output_folder: folderPath }))
        showToast(`📁 Output folder set: ${folderPath}`)
      }
    }
    input.click()
  }

  const selectSaveLocation = async () => {
    const defaultName = outputFileName || `${config.company_name.replace(/\s+/g, '_')}_Attendance_${config.month || 'Output'}.xlsx`
    if ((window as any).pywebview?.api?.select_save) {
      try {
        const fullPath = await (window as any).pywebview.api.select_save(defaultName)
        if (fullPath) {
          const sep = fullPath.includes('\\') ? '\\' : '/'
          const parts = fullPath.split(sep)
          const fileName = parts.pop()
          const folderPath = parts.join(sep)

          if (folderPath) setOutputFolder(folderPath)
          if (fileName) setOutputFileName(fileName)
          setConfig((prev: any) => ({ ...prev, output_folder: folderPath, output_file_name: fileName }))
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
    if ((window as any).pywebview && (window as any).pywebview.api && (window as any).pywebview.api.open_output_folder) {
      try {
        const res = await (window as any).pywebview.api.open_output_folder(outputFolder)
        if (res.success) showToast(`📂 Opened folder: ${res.path}`)
        else showToast(`Folder error: ${res.error}`, 'error')
      } catch (e: any) {
        showToast(`Failed to open folder: ${e.message}`, 'error')
      }
    } else {
      showToast(`📁 Output folder: ${outputFolder || 'Downloads'}`, 'success')
    }
  }

  const processNow = async () => {
    if (!workbook && !(config as any).excel_path) { showToast("Upload or select an Excel file first (Input 1)", 'error'); return }

    const targetFileName = (outputFileName && outputFileName.trim())
      ? (outputFileName.trim().endsWith('.xlsx') ? outputFileName.trim() : `${outputFileName.trim()}.xlsx`)
      : `${config.company_name.replace(/\s+/g, '_')}_Attendance_${config.month || 'Output'}.xlsx`

    setIsProcessing(true)
    try {
      // If Python backend is available via PyWebView
      if ((window as any).pywebview?.api?.process_with_custom_python && (config as any).excel_path) {
        const pyRes = await (window as any).pywebview.api.process_with_custom_python({
          excel_path: (config as any).excel_path,
          python_path: (config as any).python_path,
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
        await new Promise((r: any) => setTimeout(r, 300))
        const result = processExcelInBrowser(workbook, { ...config, python_file_name: pythonFile?.name || 'Built-in', output_folder: outputFolder || 'Downloads' }, customMappings)
        setProcessed(result)
        exportToExcel(result, { ...config, python_file_name: pythonFile?.name || 'Built-in' }, targetFileName)
        showToast(`✅ Processed & Saved: ${targetFileName} to ${outputFolder || 'Downloads folder'}!`, 'success')
      }
    } catch (e: any) {
      showToast("Processing failed: " + e.message, 'error')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleEmployeeClick = (empId: string) => {
    if (!processed) return
    const summaryData = processed.summary.find((r: any) => String(r.emp_id) === String(empId))
    // We use matrix_raw so the drawer calendar shows the EXACT biometric code
    const matrixRawData = processed.matrix_raw ? processed.matrix_raw.find((r: any) => String(r.emp_id) === String(empId)) : processed.matrix.find((r: any) => String(r.emp_id) === String(empId))
    if (summaryData) {
      setSelectedEmployee({ ...summaryData, ...(matrixRawData || {}) })
    }
  }

  const downloadResult = () => {
    if (!processed) return
    const finalFileName = outputFileName || `${config.company_name.replace(/\s+/g, '_')}_Attendance_${config.month || 'Full'}.xlsx`
    exportToExcel(processed, { ...config, python_file_name: pythonFile?.name || 'Built-in', output_folder: outputFolder || 'Downloads' }, finalFileName)
    showToast(`💾 Generated & Downloaded ${finalFileName} (5 Sheets including Leave Details)`)
  }

  const filteredMatrix = useMemo(() => {
    if (!processed) return []
    return (processed.matrix || []).filter((row: any) => {
      const matchSearch = searchQuery === '' ||
        String(row.emp_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(row.emp_id || '').toLowerCase().includes(searchQuery.toLowerCase())
      const matchDept = selectedDept === 'ALL' || row.department === selectedDept
      return matchSearch && matchDept
    })
  }, [processed, searchQuery, selectedDept])

  const filteredLeaveDetails = useMemo(() => {
    if (!processed || !processed.leaveDetails) return []
    return processed.leaveDetails.filter((r: any) => {
      const matchSearch = searchQuery === '' ||
        String(r['emplname'] || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(r['emp id'] || '').toLowerCase().includes(searchQuery.toLowerCase())
      const matchDept = selectedDept === 'ALL' || r['department'] === selectedDept
      return matchSearch && matchDept
    })
  }, [processed, searchQuery, selectedDept])

  const departments = useMemo(() => {
    if (!processed) return ['ALL']
    const set = new Set(processed.employees.map((e: any) => e.department))
    return ['ALL', ...Array.from(set)]
  }, [processed])

  // Get employee detailed statistics — Direct Authoritative Single Source of Truth
  const empDetails = useMemo(() => {
    if (!selectedEmployee || !processed) return null
    const summaryRow = processed.summary.find((s: any) => s.emp_id === selectedEmployee.emp_id) || {}
    const empDaily = (processed.daily || []).filter((d: any) => d.emp_id === selectedEmployee.emp_id)
    const empLeaveRecords = (processed.leaveDetails || []).filter((r: any) => r['emp id'] === selectedEmployee.emp_id)

    const plTotal = summaryRow['PL Total'] !== undefined ? summaryRow['PL Total'] : 12
    const clTotal = summaryRow['CL Total'] !== undefined ? summaryRow['CL Total'] : 10
    const slTotal = summaryRow['SL Total'] !== undefined ? summaryRow['SL Total'] : 8

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

    const updatedMatrix = processed.matrix.map((row: any) => {
      if (row.emp_id === selectedEmployee.emp_id) {
        return { ...row, [startDate]: leaveType }
      }
      return row
    })

    setProcessed((prev: any) => {
      const nextMatrix = updatedMatrix
      const nextLeaveDetails = buildLeaveDetailsList(nextMatrix, prev.allDates, workbook?.__leaveBalances__ || {})

      // Update summary for selected employee
      const nextSummary = prev.summary.map((s: any) => {
        if (s.emp_id === selectedEmployee.emp_id) {
          let plCount = s['PL Used'], clCount = s['CL Used'], slCount = s['SL Used']
          if (leaveType === 'PL') plCount += Number(leaveValue)
          else if (leaveType === 'CL') clCount += Number(leaveValue)
          else if (leaveType === 'SL') slCount += Number(leaveValue)

          const plTotal = s['PL Total'] !== undefined ? s['PL Total'] : 12
          const clTotal = s['CL Total'] !== undefined ? s['CL Total'] : 10
          const slTotal = s['SL Total'] !== undefined ? s['SL Total'] : 8

          return {
            ...s,
            'PL Used': plCount,
            'CL Used': clCount,
            'SL Used': slCount,
            'PL Remaining': Math.max(plTotal - plCount, 0),
            'CL Remaining': Math.max(clTotal - clCount, 0),
            'SL Remaining': Math.max(slTotal - slCount, 0),
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

  const tabOptions = [{ id: 'matrix', label: 'Daily Matrix' }]

  const tablesJSX = useMemo(() => {
    if (!processed) return null;
    return (
      <>
        <div className={activeTab === 'matrix' ? 'block' : 'hidden'}>
          <div className="mb-4">
            {store.isLoaded && <MonthNavigator />}
          </div>
          <table className="w-full text-[12px]">
            <thead className="sticky top-0 bg-slate-100 z-20 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-slate-700 sticky left-0 bg-slate-100 border-r border-slate-200 z-30 min-w-[260px] w-[260px]">
                  Employee & Details
                </th>
                {processed.allDates.map((d: any) => (
                  <th key={d} className="text-center px-2 py-3 font-medium text-slate-600 whitespace-nowrap min-w-[36px]">
                    <div className="text-[11px] font-mono font-bold text-slate-800">{parseInt(d.split('-')[2], 10)}</div>
                    <div className="text-[9px] text-slate-400 uppercase">{new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' })[0]}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredMatrix.map((row: any, i: any) => (
                <tr
                  key={i}
                  onClick={() => setSelectedEmployee(row)}
                  className="hover:bg-slate-50 border-b border-slate-100 cursor-pointer transition-colors group"
                >
                  <td className="px-4 py-3 sticky left-0 bg-white group-hover:bg-slate-50 border-r border-slate-200 whitespace-nowrap z-10 min-w-[260px] w-[260px]">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[11px] flex-shrink-0">
                        {row.emp_name.split(' ').map((n: any) => n[0]).join('').slice(0, 2)}
                      </div>
                      <div className="overflow-hidden">
                        <div className="font-semibold text-[13px] text-slate-900 flex items-center gap-2">
                          <span className="truncate max-w-[140px]">{row.emp_name}</span>
                          <span className="font-mono text-[10px] bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-slate-700 font-normal flex-shrink-0">{row.emp_id}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <div className="text-[10px] text-slate-500 truncate max-w-[80px]">{row.department}</div>
                          {(() => {
                            const summary = processed.summary.find((s: any) => s.emp_id === row.emp_id);
                            if (!summary) return null;
                            return (
                              <div className="flex gap-1 items-center">
                                {summary['PL Remaining'] !== undefined && (
                                  <span className="text-[8.5px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-[1px] rounded uppercase tracking-tight" title={`Used: ${summary['PL Used']}`}>PL {summary['PL Remaining']}</span>
                                )}
                                {summary['CL Remaining'] !== undefined && (
                                  <span className="text-[8.5px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-[1px] rounded uppercase tracking-tight" title={`Used: ${summary['CL Used']}`}>CL {summary['CL Remaining']}</span>
                                )}
                                {summary['SL Remaining'] !== undefined && (
                                  <span className="text-[8.5px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-[1px] rounded uppercase tracking-tight" title={`Used: ${summary['SL Used']}`}>SL {summary['SL Remaining']}</span>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </td>
                  {processed.allDates.map((d: any) => {
                    const val = row[d] || '-'
                    const color = val === 'P' ? 'bg-emerald-50 text-emerald-700 border-emerald-300' :
                      val === '3/4P' ? 'bg-emerald-50/80 text-emerald-800 border-emerald-400 font-bold' :
                        val === '1/2P' || val === 'HD' ? 'bg-amber-50 text-amber-700 border-amber-300' :
                          val === 'A' ? 'bg-rose-50 text-rose-700 border-rose-300' :
                            val === 'H' ? 'bg-blue-50 text-blue-700 border-blue-300' :
                              val === 'PL' ? 'bg-emerald-100 text-emerald-800 border-emerald-400 font-black' :
                                val === 'CL' ? 'bg-purple-100 text-purple-800 border-purple-400 font-black' :
                                  val === 'SL' ? 'bg-amber-100 text-amber-800 border-amber-400 font-black' :
                                    'bg-slate-50 text-slate-400 border-slate-200'
                    return (
                      <td key={d} className="px-1 py-1 text-center min-w-[36px]">
                        <span className={`inline-flex w-6 h-6 items-center justify-center rounded-lg text-[9px] font-bold border ${color}`}>
                          {val === '1/2P' ? '½P' : (val === '3/4P' ? '¾P' : val)}
                        </span>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className={activeTab === 'leave_details' ? 'block' : 'hidden'}>
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
                filteredLeaveDetails.map((rec: any, i: any) => {
                  const typeColor = rec['leave type'] === 'PL' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                    rec['leave type'] === 'CL' ? 'bg-purple-100 text-purple-800 border-purple-300' :
                      'bg-amber-100 text-amber-800 border-amber-300'
                  return (
                    <tr
                      key={i}
                      onClick={() => {
                        const emp = (processed?.summary || []).find((s: any) => String(s.emp_id) === String(rec['emp id']) || s.emp_name === rec['emplname'])
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
        </div>
        <div className={activeTab === 'summary' ? 'block' : 'hidden'}>
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
              {(processed.summary || [])
                .filter((s: any) => searchQuery === '' || (s.emp_name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (s.emp_id || '').toLowerCase().includes(searchQuery.toLowerCase()))
                .map((s: any, i: any) => (
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
        </div>
      </>
    )
  }, [processed, activeTab, filteredMatrix, filteredLeaveDetails, searchQuery])

  if (!user) {
    return (
      <div className="min-h-screen w-full flex flex-col md:flex-row bg-white font-sans selection:bg-[#c23126]/20 selection:text-[#c23126]">

        {/* Left Side: Dynamic Helical Water Splash (60% width on md+, hidden on mobile) */}
        <div className="relative hidden md:flex md:w-[60%] lg:w-[62%] xl:w-[65%] flex-col justify-between p-12 lg:p-16 text-white overflow-hidden bg-gradient-to-tr from-[#030712] via-[#090d1a] to-[#0e162e]">
          {/* Dynamic Helical Water Animation */}
          <HelicalWaterBackground />

          {/* Top spacer */}
          <div className="relative z-10"></div>

          {/* Core Info */}
          <div className="relative z-10 max-w-2xl space-y-6 my-auto">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-4xl lg:text-5xl xl:text-6xl font-extrabold tracking-tight leading-[1.1] text-white"
            >
              Autocrat<br />
              Leave Tracker
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="text-sm lg:text-base text-slate-300 font-medium leading-relaxed max-w-lg"
            >
              Enterprise-grade leave tracking, attendance processing, and shift management for manufacturing excellence.
            </motion.p>

            {/* Badges/Pills */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-wrap gap-2.5 pt-2"
            >
              {['Leave Tracker', 'Attendance Logs', 'Roster Management'].map((badge) => (
                <span
                  key={badge}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-white/10 backdrop-blur-md border border-white/20 text-white/90 tracking-wide hover:bg-white/15 transition-all duration-300"
                >
                  {badge}
                </span>
              ))}
            </motion.div>
          </div>

          {/* Bottom decorative trademark / spacer */}
          <div className="relative z-10 text-xs text-slate-500 font-medium"></div>
        </div>

        {/* Right Side: Login Form (40% width on md+, full width on mobile) */}
        <div className="w-full md:w-[40%] lg:w-[38%] xl:w-[35%] flex flex-col justify-between bg-white p-8 sm:p-12 md:p-8 lg:p-12 xl:p-16 min-h-screen shadow-2xl z-10 relative">
          <div className="absolute top-4 right-4 z-20">
            <DayNightSwitch checked={isDark} onChange={toggleTheme} id="login-theme-switch" />
          </div>
          {/* Top Logo and Header */}
          <div className="flex flex-col items-center text-center mt-4 sm:mt-8 md:mt-4 space-y-6">
            {/* Logo Container */}
            <div className="h-16 px-4 py-2 rounded-xl border border-slate-100 flex items-center justify-center shadow-sm overflow-hidden bg-white">
              <img src="/autocrat-official-logo.jpg" alt="Autocrat Engineers Logo" className="h-10 w-auto object-contain" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl lg:text-2xl font-bold tracking-tight text-slate-900 leading-tight">
                Autocrat Leave Tracker
              </h2>
              <p className="text-[11px] lg:text-xs text-slate-500 font-medium tracking-wide">
                Your Leading Partner in Precision Manufacturing Excellence
              </p>
              <p className="text-[10px] lg:text-[11px] text-slate-400 italic pt-1">
                "Precision in attendance, excellence in execution"
              </p>
            </div>
          </div>

          {/* Login Form Box */}
          <div className="my-auto py-8 max-w-sm w-full mx-auto space-y-6">
            <div className="text-center">
              <p className="text-[11px] text-slate-400 font-medium tracking-wide">
                Enter your login credentials to access the System
              </p>
            </div>

            <form onSubmit={e => { e.preventDefault(); handleLogin() }} className="space-y-5">
              {/* Email Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 tracking-wide block">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    placeholder="you@company.com"
                    value={loginForm.email}
                    onChange={e => setLoginForm({ ...loginForm, email: e.target.value })}
                    className="w-full pl-10 pr-3.5 py-3 text-sm text-slate-900 bg-white border border-slate-200 rounded-xl outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 placeholder:text-slate-400 font-medium transition-all duration-200 shadow-sm"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 tracking-wide block">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={loginForm.password}
                    onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
                    className="w-full pl-10 pr-10 py-3 text-sm text-slate-900 bg-white border border-slate-200 rounded-xl outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 placeholder:text-slate-400 font-medium transition-all duration-200 shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {loginError && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-50 border border-red-200 text-red-700 text-xs font-semibold py-2.5 px-3.5 rounded-xl flex items-center gap-2"
                >
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <span>{loginError}</span>
                </motion.div>
              )}

              {/* Login Button - Crimson Red color matching exactly (#c23126) */}
              <button
                type="submit"
                className="w-full bg-[#c23126] hover:bg-[#a6261d] active:scale-[0.98] text-white font-bold py-3.5 rounded-xl transition-all duration-200 shadow-md flex items-center justify-center gap-2 text-sm tracking-wide mt-2"
              >
                <LogIn className="w-4 h-4" /> Login to System
              </button>
            </form>

            <div className="text-center pt-2">
              <p className="text-[11px] text-slate-400 font-medium tracking-wide">
                Contact your administrator if you need access credentials
              </p>
            </div>
          </div>

          {/* Bottom Footer */}
          <div className="text-center mt-4 sm:mt-8 md:mt-4">
            <span className="text-[10px] text-slate-400 font-medium tracking-wide">
              © 2026 Autocrat Engineers. All rights reserved.
            </span>
          </div>
        </div>

        {/* Floating Developer / Demo Role Launcher Widget */}
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2 font-sans">
          <AnimatePresence>
            {showDevWidget && (
              <motion.div
                initial={{ opacity: 0, y: 15, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-4 w-72 mb-1 flex flex-col gap-2.5"
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-bold text-slate-200 tracking-wide uppercase">Quick Demo Logins</span>
                  <span className="text-[9px] bg-amber-400/25 text-amber-300 font-bold px-1.5 py-0.5 rounded font-mono">DEV MODE</span>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => { setLoginForm({ email: 'mvp@autocratengineers.in', password: '1234' }); setLoginError(''); setShowDevWidget(false); showToast('Admin (HR) credentials filled. Click Login!', 'info') }}
                    className="px-3 py-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-800 text-left text-xs text-slate-200 transition-all duration-200 flex items-center justify-between group"
                  >
                    <span>🔑 Admin (HR) role</span>
                    <span className="font-mono text-[9px] bg-slate-700 px-1.5 py-0.5 rounded text-slate-300 font-bold group-hover:bg-slate-600 transition-colors">HR</span>
                  </button>

                  <button
                    onClick={() => { setLoginForm({ email: 'hod@autocratengineers.in', password: '1234' }); setLoginError(''); setShowDevWidget(false); showToast('Supervisor (HOD) credentials filled. Click Login!', 'info') }}
                    className="px-3 py-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-800 text-left text-xs text-slate-200 transition-all duration-200 flex items-center justify-between group"
                  >
                    <span>🔑 Supervisor (HOD) role</span>
                    <span className="font-mono text-[9px] bg-slate-700 px-1.5 py-0.5 rounded text-slate-300 font-bold group-hover:bg-slate-600 transition-colors">HOD</span>
                  </button>

                  <button
                    onClick={() => { setLoginForm({ email: 'employee@autocratengineers.in', password: '1234' }); setLoginError(''); setShowDevWidget(false); showToast('Employee credentials filled. Click Login!', 'info') }}
                    className="px-3 py-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-800 text-left text-xs text-slate-200 transition-all duration-200 flex items-center justify-between group"
                  >
                    <span>🔑 Employee profile view</span>
                    <span className="font-mono text-[9px] bg-slate-700 px-1.5 py-0.5 rounded text-slate-300 font-bold group-hover:bg-slate-600 transition-colors">Employee</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={() => setShowDevWidget(!showDevWidget)}
            className="flex items-center justify-center w-11 h-11 rounded-full bg-slate-900 hover:bg-slate-800 text-white shadow-xl hover:shadow-2xl border border-slate-800 transition-all duration-300 hover:scale-105 active:scale-95"
            title="Developer / Demo Quick Logins"
          >
            <Key className="w-5 h-5 text-amber-400 animate-pulse duration-1000" />
          </button>
        </div>

        {/* Global Toast inside Login */}
        <AnimatePresence>
          {toast && (
            <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white rounded-full px-5 py-3 flex items-center gap-3 shadow-2xl border border-slate-800">
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center">
                {toast.type === 'error' ? <AlertCircle className="w-4 h-4 text-rose-400" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              </div>
              <span className="text-[13px] font-medium max-w-[420px] truncate text-white">{toast.msg}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }



  if (user?.role === 'employee') {
    const emp = selectedEmployee
    return (
      <div className="erp-bg min-h-screen flex flex-col text-slate-800 font-sans bg-[#f8fafc]">
        {/* Header */}
        <header className="px-6 py-4 flex items-center justify-between bg-[#28267f] text-white shadow-md">
          <div className="flex items-center gap-3">
            <div className="h-9 px-2.5 rounded-lg bg-white flex items-center justify-center shadow-sm overflow-hidden">
              <img src="/autocrat-official-logo.jpg" alt="Logo" className="h-7 w-auto object-contain" />
            </div>
            <span className="font-extrabold text-[15px] hidden sm:inline">Autocrat Leave Tracker</span>
          </div>
          <div className="flex items-center gap-3">
            <DayNightSwitch checked={isDark} onChange={toggleTheme} id="employee-portal-theme-switch" />
            <div className="text-right">
              <div className="text-[12px] font-bold">{user.name}</div>
              <div className="text-[10px] text-blue-200">Employee Profile</div>
            </div>
            <button
              onClick={() => { setUser(null); setSelectedEmployee(null); setLoginForm({ email: '', password: '' }); showToast("Logged out successfully", "success") }}
              className="px-3 py-1.5 rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 text-[11px] font-bold flex items-center gap-1.5 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign Out
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="p-4 sm:p-8 max-w-[850px] mx-auto w-full space-y-6 flex-1">
          {!emp ? (
            <div className="material-card p-12 text-center space-y-3 bg-white border border-slate-200 shadow-sm">
              <FileSpreadsheet className="w-10 h-10 text-slate-400 mx-auto" />
              <p className="text-[13px] text-slate-600 font-medium">No Attendance Data Loaded Yet</p>
            </div>
          ) : (
            <>
              {/* Employee Summary Card */}
              <div className="material-card p-6 bg-gradient-to-r from-blue-900 to-[#28267f] text-white shadow-lg space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-4 gap-3">
                  <div>
                    <h2 className="text-[20px] font-extrabold tracking-tight">{emp.emp_name}</h2>
                    <p className="text-[12px] text-blue-200 font-mono mt-0.5">ID: {emp.emp_id} | Dept: {emp.department}</p>
                  </div>
                  <div className="bg-amber-400 text-slate-900 px-4 py-2 rounded-2xl flex flex-col items-center justify-center flex-shrink-0 shadow-md">
                    <span className="text-[10px] uppercase font-bold tracking-wider leading-none">Attendance %</span>
                    <span className="text-[20px] font-mono font-extrabold mt-0.5">{emp['Attendance %']}%</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                  <div className="bg-white/10 rounded-2xl p-3 border border-white/10">
                    <div className="text-[10px] text-blue-200 font-bold uppercase tracking-wider">Days Tracked</div>
                    <div className="text-[22px] font-bold mt-0.5">{empDetails?.trackedDaysCount || 0}</div>
                  </div>
                  <div className="bg-white/10 rounded-2xl p-3 border border-white/10">
                    <div className="text-[10px] text-blue-200 font-bold uppercase tracking-wider">Present Days</div>
                    <div className="text-[22px] font-bold text-emerald-300 mt-0.5">{emp['Present (P)'] + emp['Half Day (HD)'] * 0.5}</div>
                  </div>
                  <div className="bg-white/10 rounded-2xl p-3 border border-white/10">
                    <div className="text-[10px] text-blue-200 font-bold uppercase tracking-wider">Absences</div>
                    <div className="text-[22px] font-bold text-rose-300 mt-0.5">{emp['Absent (A)']}</div>
                  </div>
                  <div className="bg-white/10 rounded-2xl p-3 border border-white/10">
                    <div className="text-[10px] text-blue-200 font-bold uppercase tracking-wider">LWP Days</div>
                    <div className="text-[22px] font-bold text-amber-300 mt-0.5">{emp['LWP Used'] || 0}</div>
                  </div>
                </div>
              </div>

              {/* Leave Balances Card */}
              <div className="material-card p-6 bg-white border border-slate-200 shadow-sm space-y-4">
                <h3 className="font-bold text-[14px] text-slate-800 border-b border-slate-100 pb-2">Leave Summary Balances</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* PL */}
                  <div className="bg-emerald-50/50 border border-emerald-200 rounded-2xl p-4 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                      <span>Privilege Leave (PL)</span>
                      <span className="text-[12px] font-mono">{emp['PL Remaining']} / {empDetails?.limits?.pl || 12} left</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden border border-slate-300/40">
                      <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${(emp['PL Remaining'] / (empDetails?.limits?.pl || 12)) * 100}%` }}></div>
                    </div>
                    <div className="text-[10px] text-emerald-700 font-medium">Used this month: {emp['PL Used'] || 0}</div>
                  </div>

                  {/* CL */}
                  <div className="bg-purple-50/50 border border-purple-200 rounded-2xl p-4 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-purple-800 uppercase tracking-wider">
                      <span>Casual Leave (CL)</span>
                      <span className="text-[12px] font-mono">{emp['CL Remaining']} / {empDetails?.limits?.cl || 10} left</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden border border-slate-300/40">
                      <div className="bg-purple-500 h-full rounded-full transition-all duration-500" style={{ width: `${(emp['CL Remaining'] / (empDetails?.limits?.cl || 10)) * 100}%` }}></div>
                    </div>
                    <div className="text-[10px] text-purple-700 font-medium">Used this month: {emp['CL Used'] || 0}</div>
                  </div>

                  {/* SL */}
                  <div className="bg-amber-50/50 border border-amber-200 rounded-2xl p-4 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-amber-800 uppercase tracking-wider">
                      <span>Sick Leave (SL)</span>
                      <span className="text-[12px] font-mono">{emp['SL Remaining']} / {empDetails?.limits?.sl || 8} left</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden border border-slate-300/40">
                      <div className="bg-amber-500 h-full rounded-full transition-all duration-500" style={{ width: `${(emp['SL Remaining'] / (empDetails?.limits?.sl || 8)) * 100}%` }}></div>
                    </div>
                    <div className="text-[10px] text-amber-700 font-medium">Used this month: {emp['SL Used'] || 0}</div>
                  </div>
                </div>
              </div>

              {/* Monthly Attendance Calendar Grid */}
              <div className="material-card p-6 bg-white border border-slate-200 shadow-sm space-y-4">
                <h3 className="font-bold text-[14px] flex items-center gap-2 text-slate-800 border-b border-slate-100 pb-2">
                  <Calendar className="w-4 h-4 text-slate-500" /> Daily Attendance Log
                </h3>

                {/* Day of Week Headers - Monday to Sunday */}
                <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <div>Mon</div>
                  <div>Tue</div>
                  <div>Wed</div>
                  <div>Thu</div>
                  <div>Fri</div>
                  <div className="text-slate-600 font-extrabold">Sat</div>
                  <div className="text-rose-600 font-extrabold">Sun</div>
                </div>

                <div className="grid grid-cols-7 gap-2 text-center text-[11px]">
                  {/* Padding Days for Monday-start week format */}
                  {(() => {
                    if (!processed.allDates || processed.allDates.length === 0) return null
                    const firstDateStr = processed.allDates[0]
                    const firstDObj = new Date(firstDateStr + 'T00:00:00')
                    const paddingDays = (firstDObj.getDay() + 6) % 7
                    return Array.from({ length: paddingDays }).map((_: any, i: any) => (
                      <div key={`pad-${i}`} className="bg-slate-50/30 border border-dashed border-slate-200 rounded-xl h-14"></div>
                    ))
                  })()}

                  {processed.allDates.map((d: any) => {
                    const status = emp[d] || 'A'
                    const dayNum = parseInt(d.split('-')[2], 10)
                    const color = status === 'P' ? 'bg-emerald-50 text-emerald-700 border-emerald-300' :
                      status === '3/4P' ? 'bg-emerald-50/70 text-emerald-800 border-emerald-400 font-bold' :
                        status === '1/2P' || status === 'HD' ? 'bg-amber-50 text-amber-700 border-amber-300' :
                          status === 'A' ? 'bg-rose-50 text-rose-700 border-rose-300' :
                            status === 'PL' ? 'bg-emerald-100 text-emerald-800 border-emerald-400 font-bold' :
                              status === 'CL' ? 'bg-purple-100 text-purple-800 border-purple-400 font-bold' :
                                status === 'SL' ? 'bg-amber-100 text-amber-800 border-amber-400 font-bold' :
                                  status === 'H' ? 'bg-blue-50 text-blue-700 border-blue-300' :
                                    'bg-slate-50 text-slate-400 border-slate-200'
                    return (
                      <div key={d} className={`bg-white rounded-xl p-2 border flex flex-col items-center justify-between h-14 shadow-xs ${color}`}>
                        <span className="text-[10px] font-mono opacity-70">{dayNum}</span>
                        <span className="font-bold text-[11px]">{status === '1/2P' ? '½P' : (status === '3/4P' ? '¾P' : status)}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Leave History List */}
              <div className="material-card p-6 bg-white border border-slate-200 shadow-sm space-y-4">
                <h3 className="font-bold text-[14px] text-slate-800 border-b border-slate-100 pb-2">Leave Allocation Records</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[12px]">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                        <th className="py-2">Date</th>
                        <th className="py-2 text-center">Type</th>
                        <th className="py-2 text-center">Value</th>
                        <th className="py-2 text-right">Method</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {(empDetails as any)?.leavesList?.length > 0 ? (
                        (empDetails as any).leavesList.map((l: any, i: any) => (
                          <tr key={i}>
                            <td className="py-2.5 font-mono">{l.date}</td>
                            <td className="py-2.5 text-center font-bold text-slate-900">{l.type}</td>
                            <td className="py-2.5 text-center font-bold text-slate-800">{l.value}</td>
                            <td className="py-2.5 text-right">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${l.method === 'Auto Priority' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                                }`}>{l.method}</span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="py-4 text-center text-slate-400 font-normal">No leaves allocated yet</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </main>

        {/* Footer */}
        <footer className="px-6 py-4 text-center border-t border-slate-200 bg-slate-100 text-[11px] text-slate-500">
          <span>Autocrat Engineers</span> • <span>Autocrat Leave Tracker v1.0.0</span>
        </footer>
      </div>
    )
  }


  return (
    <div className="min-h-screen flex text-slate-800 dark:text-slate-100 font-sans selection:bg-blue-600/30 selection:text-blue-200 bg-slate-50 dark:bg-[#0B0F19] overflow-x-hidden transition-colors duration-200">
      {/* Page Transition Loader */}
      <AnimatePresence>
        {isPageLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-[#0f172a]"
          >
            <div className="loader">
              <div className="text"><span>Loading</span></div>
              <div className="text"><span>Loading</span></div>
              <div className="text"><span>Loading</span></div>
              <div className="text"><span>Loading</span></div>
              <div className="text"><span>Loading</span></div>
              <div className="text"><span>Loading</span></div>
              <div className="text"><span>Loading</span></div>
              <div className="text"><span>Loading</span></div>
              <div className="text"><span>Loading</span></div>
              <div className="line"></div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* --- DESKTOP COLLAPSIBLE SIDEBAR (MD Screens & Up) --- */}
      <aside
        onMouseEnter={() => setIsSidebarHovered(true)}
        onMouseLeave={() => setIsSidebarHovered(false)}
        className={`hidden md:flex fixed top-0 left-0 bottom-0 z-40 bg-white dark:bg-[#131826] border-r border-slate-200/80 dark:border-white/5 flex-col justify-between shadow-lg dark:shadow-2xl dark:shadow-black/50 overflow-hidden text-slate-700 dark:text-slate-300 transition-[width,background-color,border-color] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-[width] ${isSidebarExpanded ? 'w-[260px]' : 'w-[72px]'}`}
      >
        <div>
          {/* Centered Top Brand Header */}
          <div className="bg-slate-100/90 dark:bg-[#0B0F19]/90 backdrop-blur-md p-3 flex flex-col items-center justify-center min-h-[92px] border-b border-slate-200/80 dark:border-white/5 relative overflow-hidden text-center transition-colors duration-200">
            <div className="h-10 px-2.5 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center shadow-sm overflow-hidden mx-auto flex-shrink-0 relative z-10">
              <img src="/autocrat-official-logo.jpg" alt="Autocrat Engineers Logo" className="h-7 w-auto object-contain brightness-105" />
            </div>
            <div className={`transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] flex flex-col items-center mt-1.5 gap-1.5 overflow-hidden ${isSidebarExpanded ? 'opacity-100 max-h-16' : 'opacity-0 max-h-0 pointer-events-none'}`}>
              <p className="text-[11px] text-blue-600 dark:text-blue-400 font-bold tracking-wider uppercase text-center leading-none whitespace-nowrap">
                Leave Tracker
              </p>
              <button
                onClick={toggleSidebarLock}
                className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] shadow-sm ${isSidebarLocked
                  ? 'bg-blue-600 text-white border border-blue-400'
                  : 'bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-white hover:bg-slate-300 dark:hover:bg-white/20 border border-slate-300 dark:border-white/20'
                  }`}
                title={isSidebarLocked ? "Sidebar Locked Open (Click to unlock)" : "Lock Sidebar Open (Pin expanded)"}
              >
                {isSidebarLocked ? <Lock className="w-3.5 h-3.5 text-white" /> : <Unlock className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Navigation Menu List */}
          <nav className="py-3 space-y-1">
            {/* 1. Dashboard (Matrix) */}
            <button
              onClick={() => changeTabWithDirection('matrix')}
              className={`w-full flex items-center gap-3.5 px-4 py-3 text-left transition-colors duration-150 ${activeTab === 'matrix' && mainView === 'dashboard' ? 'erp-nav-item active' : 'erp-nav-item'}`}
              title="Dashboard & Attendance Matrix"
            >
              <div className="w-6 flex items-center justify-center flex-shrink-0">
                <LayoutGrid className="w-5 h-5" />
              </div>
              <div className={`flex-1 min-w-0 flex items-center justify-between overflow-hidden transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${isSidebarExpanded ? 'opacity-100 max-w-[180px] translate-x-0' : 'opacity-0 max-w-0 -translate-x-2 pointer-events-none'}`}>
                <div>
                  <div className="text-[13px] font-semibold leading-none text-slate-800 dark:text-slate-200">Dashboard</div>
                  <div className="text-[10px] text-slate-400 mt-1 font-normal">Attendance Matrix & Logs</div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 opacity-60 flex-shrink-0" />
              </div>
            </button>

            {/* 2. Import & Export */}
            <button
              onClick={() => navigateWithLoader(() => setMainView('import_export'))}
              className={`w-full flex items-center gap-3.5 px-4 py-3 text-left transition-colors duration-150 ${mainView === 'import_export' ? 'erp-nav-item active' : 'erp-nav-item'}`}
              title="Import Data & Export Reports"
            >
              <div className="w-6 flex items-center justify-center flex-shrink-0">
                <FileJson className="w-5 h-5" />
              </div>
              <div className={`flex-1 min-w-0 flex items-center justify-between overflow-hidden transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${isSidebarExpanded ? 'opacity-100 max-w-[180px] translate-x-0' : 'opacity-0 max-w-0 -translate-x-2 pointer-events-none'}`}>
                <div>
                  <div className="text-[13px] font-semibold leading-none text-slate-800 dark:text-slate-200">Import & Export</div>
                  <div className="text-[10px] text-slate-400 mt-1 font-normal">Manage Files</div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 opacity-60 flex-shrink-0" />
              </div>
            </button>

            {user.role === 'hr' && (
              <>
                <div className="my-2 border-t border-slate-200 dark:border-white/5 mx-3"></div>

                {/* 3. Column Mapping */}
                <button
                  onClick={() => setShowMappingPanel(!showMappingPanel)}
                  className={`w-full flex items-center gap-3.5 px-4 py-3 text-left transition-colors duration-150 ${showMappingPanel ? 'erp-nav-item active' : 'erp-nav-item'}`}
                  title="Configure Column Mapping"
                >
                  <div className="w-6 flex items-center justify-center flex-shrink-0">
                    <SlidersHorizontal className="w-5 h-5" />
                  </div>
                  <div className={`flex-1 min-w-0 flex items-center justify-between overflow-hidden transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${isSidebarExpanded ? 'opacity-100 max-w-[180px] translate-x-0' : 'opacity-0 max-w-0 -translate-x-2 pointer-events-none'}`}>
                    <div>
                      <div className="text-[13px] font-semibold leading-none text-slate-800 dark:text-slate-200">Column Mapping</div>
                      <div className="text-[10px] text-slate-400 mt-1 font-normal">Auto-detect & Presets</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 opacity-60 flex-shrink-0" />
                  </div>
                </button>

                {/* 4. HR Config & Rules */}
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className={`w-full flex items-center gap-3.5 px-4 py-3 text-left transition-colors duration-150 ${showSettings ? 'erp-nav-item active' : 'erp-nav-item'}`}
                  title="Configure HR Rules & Working Hours"
                >
                  <div className="w-6 flex items-center justify-center flex-shrink-0">
                    <Settings2 className="w-5 h-5" />
                  </div>
                  <div className={`flex-1 min-w-0 flex items-center justify-between overflow-hidden transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${isSidebarExpanded ? 'opacity-100 max-w-[180px] translate-x-0' : 'opacity-0 max-w-0 -translate-x-2 pointer-events-none'}`}>
                    <div>
                      <div className="text-[13px] font-semibold leading-none text-slate-800 dark:text-slate-200">Config & Rules</div>
                      <div className="text-[10px] text-slate-400 mt-1 font-normal">HR Policies & Holidays</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 opacity-60 flex-shrink-0" />
                  </div>
                </button>
              </>
            )}

            {/* 5. Open Folder */}
            <button
              onClick={openFolderNative}
              className="w-full flex items-center gap-3.5 px-4 py-3 text-left erp-nav-item"
              title="Open Output Destination Folder"
            >
              <div className="w-6 flex items-center justify-center flex-shrink-0">
                <FolderOpen className="w-5 h-5" />
              </div>
              <div className={`flex-1 min-w-0 flex items-center justify-between overflow-hidden transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${isSidebarExpanded ? 'opacity-100 max-w-[180px] translate-x-0' : 'opacity-0 max-w-0 -translate-x-2 pointer-events-none'}`}>
                <div>
                  <div className="text-[13px] font-semibold leading-none text-slate-800 dark:text-slate-200">Open Folder</div>
                  <div className="text-[10px] text-slate-400 mt-1 font-normal">Explore Output Files</div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 opacity-60 flex-shrink-0" />
              </div>
            </button>
          </nav>
        </div>

        {/* Bottom Profile Section */}
        <div className="border-t border-slate-200/80 dark:border-white/5 p-3 bg-slate-50 dark:bg-[#0d121f] transition-colors duration-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/10 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400 border border-blue-500/20 dark:border-blue-500/30 flex items-center justify-center font-extrabold text-[13px] shadow-sm flex-shrink-0">
              {user?.name?.[0] || 'U'}
            </div>
            <div className={`overflow-hidden min-w-0 flex-1 transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${isSidebarExpanded ? 'opacity-100 max-w-[150px]' : 'opacity-0 max-w-0 pointer-events-none'}`}>
              <div className="text-[12px] font-semibold text-slate-800 dark:text-slate-200 truncate">{user?.email}</div>
              <div className="text-[10px] text-amber-500 font-semibold uppercase tracking-wider">{user?.role}</div>
            </div>
          </div>
        </div>
      </aside>

      {/* --- MOBILE OVERLAY DRAWER (< md Screens) --- */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="md:hidden fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="md:hidden fixed top-0 left-0 bottom-0 z-50 w-[270px] bg-white dark:bg-[#131826] border-r border-slate-200 dark:border-white/10 flex flex-col justify-between shadow-2xl overflow-y-auto transition-colors duration-200"
            >
              <div>
                <div className="bg-gradient-to-tr from-[#030712]/90 via-[#090d1a]/90 to-[#0e162e]/90 backdrop-blur-md text-white p-3 flex items-center justify-between min-h-[72px] border-b border-white/10 relative overflow-hidden">
                  <HelicalWaterBackground />
                  <div className="flex-1 flex flex-col items-center justify-center text-center relative z-10">
                    <div className="h-9 px-2.5 rounded-xl bg-white flex items-center justify-center shadow-md overflow-hidden mx-auto">
                      <img src="/autocrat-official-logo.jpg" alt="Autocrat Engineers Logo" className="h-6 w-auto object-contain" />
                    </div>
                    <p className="text-[10px] text-blue-200 font-bold uppercase tracking-wider mt-1 text-center">Attendance System</p>
                  </div>
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center flex-shrink-0 relative z-10"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>

                <nav className="py-3 space-y-1">
                  <button
                    onClick={() => { changeTabWithDirection('matrix'); setIsMobileMenuOpen(false) }}
                    className={`w-full flex items-center gap-3.5 px-4 py-3 text-left ${activeTab === 'matrix' && mainView === 'dashboard' ? 'erp-nav-item active' : 'erp-nav-item'}`}
                  >
                    <LayoutGrid className="w-5 h-5 flex-shrink-0" />
                    <div>
                      <div className="text-[13px] font-semibold">Dashboard</div>
                      <div className="text-[10px] text-slate-400">Attendance Matrix & Logs</div>
                    </div>
                  </button>

                  <button
                    onClick={() => { changeTabWithDirection('leave_details'); setIsMobileMenuOpen(false) }}
                    className={`w-full flex items-center gap-3.5 px-4 py-3 text-left ${activeTab === 'leave_details' && mainView === 'dashboard' ? 'erp-nav-item active' : 'erp-nav-item'}`}
                  >
                    <Clock className="w-5 h-5 flex-shrink-0" />
                    <div className="flex-1 flex items-center justify-between">
                      <div>
                        <div className="text-[13px] font-semibold flex items-center gap-1.5">
                          <span>Leave Details</span>
                          {processed?.leaveDetails?.length > 0 && (
                            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-400 text-slate-900 font-extrabold">
                              {processed.leaveDetails.length}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400">HR Leave Records & Deductions</div>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => { changeTabWithDirection('summary'); setIsMobileMenuOpen(false) }}
                    className={`w-full flex items-center gap-3.5 px-4 py-3 text-left ${activeTab === 'summary' && mainView === 'dashboard' ? 'erp-nav-item active' : 'erp-nav-item'}`}
                  >
                    <Users className="w-5 h-5 flex-shrink-0" />
                    <div>
                      <div className="text-[13px] font-semibold">Summary Stats</div>
                      <div className="text-[10px] text-slate-400">Employee Totals & Pct</div>
                    </div>
                  </button>

                  <button
                    onClick={() => navigateWithLoader(() => { setMainView('import_export'); setIsMobileMenuOpen(false) })}
                    className={`w-full flex items-center gap-3.5 px-4 py-3 text-left ${mainView === 'import_export' ? 'erp-nav-item active' : 'erp-nav-item'}`}
                  >
                    <FileJson className="w-5 h-5 flex-shrink-0" />
                    <div>
                      <div className="text-[13px] font-semibold">Import & Export</div>
                      <div className="text-[10px] text-slate-400">Manage Files</div>
                    </div>
                  </button>

                  {user.role === 'hr' && (
                    <>
                      <div className="my-2 border-t border-slate-100 dark:border-white/5 mx-3"></div>

                      <button
                        onClick={() => { setShowMappingPanel(!showMappingPanel); setIsMobileMenuOpen(false) }}
                        className={`w-full flex items-center gap-3.5 px-4 py-3 text-left ${showMappingPanel ? 'erp-nav-item active' : 'erp-nav-item'}`}
                      >
                        <SlidersHorizontal className="w-5 h-5 flex-shrink-0" />
                        <div>
                          <div className="text-[13px] font-semibold">Column Mapping</div>
                          <div className="text-[10px] text-slate-400">Auto-detect & Presets</div>
                        </div>
                      </button>

                      <button
                        onClick={() => { setShowSettings(!showSettings); setIsMobileMenuOpen(false) }}
                        className={`w-full flex items-center gap-3.5 px-4 py-3 text-left ${showSettings ? 'erp-nav-item active' : 'erp-nav-item'}`}
                      >
                        <Settings2 className="w-5 h-5 flex-shrink-0" />
                        <div>
                          <div className="text-[13px] font-semibold">Config & Rules</div>
                          <div className="text-[10px] text-slate-400">HR Policies & Holidays</div>
                        </div>
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => { openFolderNative(); setIsMobileMenuOpen(false) }}
                    className="w-full flex items-center gap-3.5 px-4 py-3 text-left erp-nav-item"
                  >
                    <FolderOpen className="w-5 h-5 flex-shrink-0" />
                    <div>
                      <div className="text-[13px] font-semibold">Open Folder</div>
                      <div className="text-[10px] text-slate-400">Explore Output Files</div>
                    </div>
                  </button>
                </nav>
              </div>

              <div className="border-t border-slate-200 dark:border-white/10 p-3 bg-slate-50 dark:bg-slate-900/50 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-9 h-9 rounded-full bg-[#28267f] text-white flex items-center justify-center font-extrabold text-[12px] flex-shrink-0">
                      {user?.name?.[0] || 'U'}
                    </div>
                    <div className="overflow-hidden">
                      <div className="text-[11px] font-bold text-slate-900 dark:text-slate-100 truncate">{user?.email}</div>
                      <div className="text-[10px] text-amber-600 font-semibold uppercase">{user?.role}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => { setUser(null); setIsMobileMenuOpen(false); setLoginForm({ email: '', password: '' }); showToast("Logged out successfully", "success") }}
                    className="p-1.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 transition-colors flex-shrink-0"
                    title="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-white/10">
                  <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                    {isDark ? 'Night Mode' : 'Day Mode'}
                  </span>
                  <DayNightSwitch checked={isDark} onChange={toggleTheme} id="mobile-theme-switch" />
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* --- MAIN WORKSPACE CONTAINER WITH RESPONSIVE MARGIN --- */}
      <div
        className={`flex-1 flex flex-col min-w-0 min-h-screen w-full bg-slate-50 dark:bg-[#0B0F19] transition-[margin-left,background-color] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isMobileScreen ? 'ml-0' : isSidebarLocked ? 'ml-[260px]' : 'ml-[72px]'
        }`}
      >
        {/* Top Header Action Bar */}
        <header className="sticky top-0 z-30 px-4 sm:px-6 py-3 flex items-center justify-between border-b border-slate-200/80 dark:border-white/5 bg-white/90 dark:bg-[#0B0F19]/90 backdrop-blur-md shadow-sm dark:shadow-lg text-slate-800 dark:text-slate-200 transition-colors duration-200">
          <div className="flex items-center gap-3">
            {/* Hamburger Button for Mobile (< md) */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 flex items-center justify-center border border-slate-200 dark:border-white/10"
              title="Open Navigation Menu"
            >
              <Menu className="w-4 h-4" />
            </button>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Attendance</h1>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            {/* Main & Only Search Bar in the application */}
            <div className="relative w-48 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search"
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 rounded-full pl-9 pr-4 py-1.5 text-xs outline-none focus:border-blue-500/50 transition-colors duration-200 ease-out"
              />
            </div>

            {/* Department Filter Dropdown */}
            {departments && departments.length > 1 && (
              <div className="relative flex items-center">
                <select
                  value={selectedDept}
                  onChange={e => setSelectedDept(e.target.value)}
                  className="appearance-none bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 rounded-full pl-3 pr-7 py-1.5 text-xs outline-none cursor-pointer focus:border-blue-500/50 transition-colors duration-200 ease-out"
                >
                  {departments.map(dept => (
                    <option key={dept as any} value={dept as any} className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                      {dept === 'ALL' ? 'All Departments' : dept}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 pointer-events-none absolute right-2" />
              </div>
            )}

            {/* User Profile Pill — click to open profile panel */}
            <button
              onClick={() => setIsProfileOpen(true)}
              className="flex items-center gap-2 pl-2 rounded-xl px-2 py-1 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors duration-150 group"
              title="Open Profile"
            >
              <span className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white transition-colors duration-150">
                {user?.name || 'Mervin Ezekiel V'}
              </span>
              <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-white/10 flex items-center justify-center text-slate-600 dark:text-slate-300 group-hover:border-blue-400/50 dark:group-hover:border-blue-500/40 transition-colors duration-150">
                <User className="w-4 h-4" />
              </div>
            </button>
          </div>
        </header>

        {/* ===== PROFILE PANEL (slide-in from right) ===== */}
        {isProfileOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-50 bg-black/20 dark:bg-black/50 backdrop-blur-[2px]"
              onClick={() => setIsProfileOpen(false)}
            />
            {/* Panel */}
            <div className="fixed top-0 right-0 bottom-0 z-50 w-80 bg-white dark:bg-[#131826] border-l border-slate-200 dark:border-white/5 shadow-2xl flex flex-col" style={{ animation: 'profileSlideIn 0.22s cubic-bezier(0.16,1,0.3,1) both' }}>
              {/* Panel Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/5">
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">My Profile</span>
                <button
                  onClick={() => setIsProfileOpen(false)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors duration-150"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>
              </div>

              {/* Avatar + Name Block */}
              <div className="flex flex-col items-center gap-3 px-5 py-8 border-b border-slate-100 dark:border-white/5">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-blue-500/20">
                  {(user?.name || 'Mervin Ezekiel V').split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
                </div>
                <div className="text-center">
                  <div className="text-base font-semibold text-slate-900 dark:text-slate-100">{user?.name || 'Mervin Ezekiel V'}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 capitalize">{user?.role || 'Administrator'}</div>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">Active</span>
                </div>
              </div>

              {/* Info Rows */}
              <div className="flex-1 px-5 py-4 space-y-3 overflow-y-auto">
                <div className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Account Details</div>

                <div className="flex items-center justify-between py-2.5 border-b border-slate-100 dark:border-white/5">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Full Name</span>
                  <span className="text-xs font-medium text-slate-800 dark:text-slate-200">{user?.name || 'Mervin Ezekiel V'}</span>
                </div>
                <div className="flex items-center justify-between py-2.5 border-b border-slate-100 dark:border-white/5">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Role</span>
                  <span className="text-xs font-medium text-slate-800 dark:text-slate-200 capitalize">{user?.role || 'Administrator'}</span>
                </div>
                <div className="flex items-center justify-between py-2.5 border-b border-slate-100 dark:border-white/5">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Email</span>
                  <span className="text-xs font-medium text-slate-800 dark:text-slate-200">{user?.email || '—'}</span>
                </div>
                <div className="flex items-center justify-between py-2.5 border-b border-slate-100 dark:border-white/5">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Session</span>
                  <span className="text-xs font-medium text-slate-800 dark:text-slate-200">Active</span>
                </div>

                {/* Theme Toggle */}
                <div className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider pt-2 mb-1">Preferences</div>
                <div className="flex items-center justify-between py-2.5">
                  <span className="text-xs text-slate-500 dark:text-slate-400">{isDark ? 'Night Mode' : 'Day Mode'}</span>
                  <DayNightSwitch checked={isDark} onChange={toggleTheme} id="profile-theme-switch" />
                </div>
              </div>

              {/* Footer */}
              <div className="px-5 py-4 border-t border-slate-100 dark:border-white/5">
                <button
                  onClick={() => { setIsProfileOpen(false); setUser(null); setLoginForm({ email: '', password: '' }); showToast("Logged out successfully", "success"); }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-red-50 dark:hover:bg-red-500/10 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 border border-transparent hover:border-red-200 dark:hover:border-red-500/20 text-xs font-semibold transition-all duration-150"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
                  Sign Out
                </button>
              </div>
            </div>
          </>
        )}

        <main className="p-4 sm:p-6 space-y-5 sm:space-y-6 w-full flex-1 min-w-0 min-h-screen bg-slate-50 dark:bg-[#0B0F19] transition-colors duration-200">
          {mainView === 'dashboard' && (
            <>
              {/* 4 Metric KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div
                  onClick={() => changeTabWithDirection('summary')}
                  className="kpi-card bg-white dark:bg-[#131826] rounded-2xl p-5 border border-slate-200/80 dark:border-white/5 shadow-sm dark:shadow-2xl dark:shadow-black/50 cursor-pointer"
                >
                  <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">TOTAL EMPLOYEES</div>
                  <div className="text-[28px] font-bold text-slate-900 dark:text-slate-100 mt-1">{processed?.summary?.length || 620}</div>
                </div>

                <div
                  onClick={() => changeTabWithDirection('leave_details')}
                  className="kpi-card bg-white dark:bg-[#131826] rounded-2xl p-5 border border-blue-500/40 shadow-sm dark:shadow-2xl dark:shadow-black/50 cursor-pointer"
                >
                  <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">LEAVE ANOMALIES</div>
                  <div className="text-[28px] font-bold text-slate-900 dark:text-slate-100 mt-1">{processed?.leaveDetails?.length || 25}</div>
                </div>

                <div
                  onClick={() => changeTabWithDirection('matrix')}
                  className="kpi-card bg-white dark:bg-[#131826] rounded-2xl p-5 border border-slate-200/80 dark:border-white/5 shadow-sm dark:shadow-2xl dark:shadow-black/50 cursor-pointer"
                >
                  <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">PRESENT / HEALTHY</div>
                  <div className="text-[28px] font-bold text-slate-900 dark:text-slate-100 mt-1">{(processed?.summary || []).filter((e: any) => e.present_days > 0)?.length || 595}</div>
                </div>

                <div
                  onClick={() => changeTabWithDirection('matrix')}
                  className="kpi-card bg-white dark:bg-[#131826] rounded-2xl p-5 border border-slate-200/80 dark:border-white/5 shadow-sm dark:shadow-2xl dark:shadow-black/50 cursor-pointer"
                >
                  <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">TOTAL WORKING HOURS</div>
                  <div className="text-[28px] font-bold text-slate-900 dark:text-slate-100 mt-1">{processed?.meta?.total_working_hours || "8402"}</div>
                </div>
              </div>
            </>
          )}

          {mainView === 'import_export' && (
            <>
              {/* Quick Access & Output Folder Selection Cards */}
              {user.role === 'hod' ? (
                <div className="bg-blue-50 rounded-2xl p-5 border border-blue-200 flex items-center gap-4 text-blue-900 shadow-sm">
                  <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center border border-blue-200 flex-shrink-0">
                    <Shield className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[14px]">Head of Department (HOD) View Active</h4>
                    <p className="text-[12px] text-blue-700 mt-1">
                      You have read-only access to department records. File uploads, rules configurations, and manual leave adjustments are restricted to HR administrators.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {/* Card 1: Input 1 Excel */}
                  <div className="rounded-2xl p-5 space-y-4 bg-white border border-slate-200 shadow-sm text-slate-800 dark:bg-slate-900 dark:border-white/5 dark:text-slate-100 transition-colors duration-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-[12px] font-bold flex items-center justify-center">1</span>
                        <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-[14px]">Excel / CSV Attendance Input</h3>
                      </div>
                      <span className="text-[10px] bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded text-slate-600 dark:text-slate-400 font-mono">.XLSX / .CSV</span>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/5 text-center space-y-3 transition-colors duration-200">
                      {excelFile ? (
                        <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-300 text-[12px]">
                          <div className="flex items-center gap-2 truncate">
                            <FileSpreadsheet className="w-4 h-4 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
                            <span className="truncate font-medium">{excelFile.name}</span>
                          </div>
                          <button onClick={removeExcelFile} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="text-slate-500 dark:text-slate-400 text-[12px]">No file loaded (Sample active)</div>
                      )}

                      <button
                        onClick={handleSelectExcelFile}
                        className="w-full py-2.5 px-4 rounded-xl text-[12px] font-semibold flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 shadow-xs dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-700 dark:shadow-black/50 transition-colors duration-200 cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> Select File in Explorer
                      </button>
                      <input ref={excelInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={e => handleExcelFile(e.target.files![0])} />
                    </div>
                  </div>

                  {/* Card 2: Input Leave Balances */}
                  <div
                    className="rounded-2xl p-5 space-y-4 bg-white border border-slate-200 shadow-sm text-slate-800 dark:bg-slate-900 dark:border-white/5 dark:text-slate-100 transition-colors duration-200"
                    onDragOver={e => e.preventDefault()}
                    onDrop={onDropLeave}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-amber-500 text-white text-[12px] font-bold flex items-center justify-center">2</span>
                        <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-[14px]">Leave Balances (Optional)</h3>
                      </div>
                      <span className="text-[10px] bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded text-slate-600 dark:text-slate-400 font-mono">.XLSX</span>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/5 text-center space-y-3 transition-colors duration-200">
                      {leaveBalancesFile ? (
                        <div className="flex items-center justify-between p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 text-amber-800 dark:text-amber-300 text-[12px]">
                          <div className="flex items-center gap-2 truncate">
                            <FileSpreadsheet className="w-4 h-4 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                            <span className="truncate font-medium">{leaveBalancesFile.name}</span>
                          </div>
                          <button onClick={removeLeaveBalancesFile} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="text-slate-500 dark:text-slate-400 text-[12px]">Optional (overrides internal limits)</div>
                      )}

                      <button
                        onClick={handleSelectLeaveBalancesFile}
                        className="w-full py-2.5 px-4 rounded-xl text-[12px] font-semibold flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 shadow-xs dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-700 dark:shadow-black/50 transition-colors duration-200 cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" /> Select File in Explorer
                      </button>
                      <input ref={leaveBalancesInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={e => handleLeaveBalancesFile(e.target.files![0])} />
                    </div>
                  </div>

                  {/* Card 3: Output Storage Location & File Name */}
                  <div className="rounded-2xl p-5 space-y-4 border-l-4 border-l-blue-600 bg-white border border-slate-200 shadow-sm text-slate-800 dark:bg-slate-900 dark:border-white/5 dark:text-slate-100 transition-colors duration-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-[12px] font-bold flex items-center justify-center">3</span>
                        <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-[14px]">Output File Name</h3>
                      </div>
                      <span className="text-[10px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 px-2 py-0.5 rounded font-mono font-bold">EXPLORER</span>
                    </div>

                    <div className="space-y-3">
                      {/* Single Combined Save As Destination & File Name Picker */}
                      <div className="space-y-1">
                        <label className="text-[11px] text-slate-600 dark:text-slate-400 font-medium flex items-center justify-between">
                          <span>Target Output File (.xlsx):</span>
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-bold">Native Save As</span>
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={outputFileName || `${config.company_name.replace(/\s+/g, '_')}_Attendance_${config.month}.xlsx`}
                            onChange={e => setOutputFileName(e.target.value)}
                            className="flex-1 text-[12px] font-mono text-emerald-800 dark:text-emerald-300 font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 outline-none focus:border-blue-500 transition-colors duration-200"
                            placeholder="e.g. Attendance_August_Report.xlsx"
                          />
                          <button
                            onClick={selectSaveLocation}
                            title="Choose Save Folder & File Name in Windows Explorer"
                            className="px-4 py-2.5 rounded-xl text-[12px] font-semibold flex items-center gap-1.5 whitespace-nowrap bg-blue-600 hover:bg-blue-700 text-white border border-blue-500 shadow-sm dark:bg-blue-600 dark:hover:bg-blue-500 dark:border-blue-500/50 dark:shadow-black/50 transition-colors duration-200 cursor-pointer"
                          >
                            <Save className="w-4 h-4" /> Save As...
                          </button>
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate pt-0.5">
                          📁 Destination: <span className="text-slate-800 dark:text-slate-200 font-semibold">{outputFolder ? `${outputFolder}\\${outputFileName || 'output.xlsx'}` : `Default Directory\\${outputFileName || 'output.xlsx'}`}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-3 pt-1">
                        <button
                          onClick={openFolderNative}
                          className="flex-1 py-2.5 px-4 rounded-xl text-[12px] font-semibold flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 shadow-xs dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-700 dark:shadow-black/50 transition-colors duration-200 cursor-pointer"
                        >
                          <FolderOpen className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" /> Open Folder
                        </button>

                        <button
                          onClick={processNow}
                          disabled={(!workbook && !(config as any).excel_path) || isProcessing}
                          className="flex-1 py-2.5 px-4 rounded-xl text-[12px] font-semibold flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-500 shadow-sm dark:bg-emerald-600 dark:hover:bg-emerald-500 dark:border-emerald-500/50 dark:shadow-black/50 transition-colors duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" /> Process & Save
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

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
                        onClick={() => setShowPyPreview(false)}
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
            </>
          )}

          {/* Column Mapping Drawer / Modal */}
          <AnimatePresence>
            {showMappingPanel && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-white dark:bg-slate-900 rounded-[24px] p-5 space-y-4 border border-slate-200 dark:border-white/5 shadow-lg text-slate-800 dark:text-slate-100 transition-colors duration-200">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/5 pb-3">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <h3 className="font-semibold text-[14px] text-slate-900 dark:text-slate-100">Excel Column Mapping Auto-Detection</h3>
                  </div>
                  <button onClick={() => setShowMappingPanel(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"><X className="w-4 h-4" /></button>
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
                        onChange={(e: any) => {
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

          {/* Main Attendance Matrix Display Table */}
          {mainView === 'dashboard' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="w-full">
              {!processed ? (
                <div className="bg-[#131826] rounded-2xl p-12 text-center space-y-3 border border-white/5 shadow-2xl shadow-black/50">
                  <FileSpreadsheet className="w-10 h-10 text-slate-500 mx-auto" />
                  <p className="text-[13px] text-slate-400">No Attendance File Loaded Yet</p>
                  <button onClick={() => loadSampleData(false)} className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]">
                    ⚡ Load Demo Sample Dataset
                  </button>
                </div>
              ) : (
                <LegacyMatrix data={filteredMatrix} onRowClick={handleSelectEmployee} />
              )}
            </motion.div>
          )}

          {/* --- HR CONFIG & RULES MODAL --- */}
          <AnimatePresence>
            {showSettings && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4"
              >
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 12 }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                  className="bg-white dark:bg-slate-900 rounded-[28px] max-w-[650px] w-full border border-slate-200 dark:border-white/5 shadow-2xl p-6 space-y-5 text-slate-800 dark:text-slate-100 gpu-layer transition-colors duration-200"
                >
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/5 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200 dark:border-amber-800/50">
                        <Settings2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-[15px] text-slate-900 dark:text-slate-100">HR Attendance Processing Rules</h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">Configure hours, late limits, weekoffs & holidays</p>
                      </div>
                    </div>
                    <button onClick={() => setShowSettings(false)} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"><X className="w-4 h-4" /></button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[12px]">
                    {/* Company Name */}
                    <div className="bg-slate-50 rounded-xl p-3 space-y-1 border border-slate-200">
                      <label className="text-[10px] text-slate-500 uppercase font-mono font-bold">Company Name</label>
                      <input
                        value={config.company_name}
                        onChange={e => setConfig((prev: any) => ({ ...prev, company_name: e.target.value }))}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 outline-none focus:border-blue-600"
                      />
                    </div>

                    {/* Target Month */}
                    <div className="bg-slate-50 rounded-xl p-3 space-y-1 border border-slate-200">
                      <label className="text-[10px] text-slate-500 uppercase font-mono font-bold">Target Month</label>
                      <input
                        type="month"
                        value={config.month}
                        onChange={e => {
                          const newM = e.target.value
                          setConfig((prev: any) => ({ ...prev, month: newM }))
                          if (workbook) {
                            const res = processExcelInBrowser(workbook, { ...config, month: newM }, customMappings)
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
                        value={config.full_day_hours as any}
                        onChange={e => setConfig((prev: any) => ({ ...prev, full_day_hours: Number(e.target.value) }))}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 outline-none font-mono focus:border-blue-600"
                      />
                    </div>

                    {/* Half Day Threshold */}
                    <div className="bg-slate-50 rounded-xl p-3 space-y-1 border border-slate-200">
                      <label className="text-[10px] text-slate-500 uppercase font-mono font-bold">Half Day Hours Threshold</label>
                      <input
                        type="number" step="0.5"
                        value={config.working_hours as any}
                        onChange={e => setConfig((prev: any) => ({ ...prev, working_hours: Number(e.target.value) }))}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 outline-none font-mono focus:border-blue-600"
                      />
                    </div>

                    {/* Late Punch Threshold */}
                    <div className="bg-slate-50 rounded-xl p-3 space-y-1 border border-slate-200">
                      <label className="text-[10px] text-slate-500 uppercase font-mono font-bold">Late Punch Cutoff Time</label>
                      <input
                        type="time"
                        value={config.late_threshold}
                        onChange={e => setConfig((prev: any) => ({ ...prev, late_threshold: e.target.value }))}
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
                                setConfig((prev: any) => ({ ...prev, weekoff: newWO }))
                              }}
                              className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors ${isWO ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
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
                        onChange={e => setConfig((prev: any) => ({ ...prev, newHoliday: e.target.value }))}
                        className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-[11px] text-slate-900 outline-none font-mono focus:border-blue-600"
                      />
                      <button
                        onClick={() => {
                          if (!config.newHoliday) return
                          const updatedHols = [...(config.holidays || []), config.newHoliday]
                          setConfig((prev: any) => ({ ...prev, holidays: updatedHols, newHoliday: '' }))
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
                          <button onClick={() => setConfig((prev: any) => ({ ...prev, holidays: prev.holidays.filter((_: any, i: any) => i !== idx) }))} className="hover:text-rose-600">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Save & Apply */}
                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                    <button onClick={() => setShowSettings(false)} className="material-btn px-4 py-2 rounded-xl text-[12px]">Cancel</button>
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
        <footer className="px-6 py-4 text-center border-t border-slate-200/80 dark:border-white/5 bg-slate-100 dark:bg-[#0E131F] text-[11px] text-slate-500 dark:text-slate-400 transition-colors duration-200">
          <span>Autocrat Engineers</span> • <span>Autocrat Leave Tracker v1.0.0</span>
        </footer>

        {/* --- DETAILED EMPLOYEE ATTENDANCE & LEAVE MODAL --- */}
        <AnimatePresence>
          {selectedEmployee && empDetails && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                className="bg-white dark:bg-slate-900 rounded-[28px] max-w-[850px] w-full max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-white/5 shadow-2xl p-6 space-y-6 text-slate-800 dark:text-slate-100 gpu-layer transition-colors duration-200"
              >

                {/* Modal Header */}
                <div className="flex items-start justify-between border-b border-slate-200 dark:border-white/5 pb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white p-0.5 shadow-md flex items-center justify-center font-bold text-xl">
                      {selectedEmployee.emp_name.split(' ').map((n: any) => n[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{selectedEmployee.emp_name}</h2>
                        <span className="font-mono text-[11px] bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 px-2 py-0.5 rounded text-slate-700 dark:text-slate-300 font-semibold">{selectedEmployee.emp_id}</span>
                      </div>
                      <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
                        <Briefcase className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" /> {selectedEmployee.department} Department
                        <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{empDetails.summaryRow['Attendance %'] || 100}% Monthly Attendance</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {store.isLoaded && <MonthNavigator />}
                    <button onClick={() => setSelectedEmployee(null)} className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* PRIORITY DEDUCTION BANNER */}
                <div className="bg-blue-50 dark:bg-blue-950/40 rounded-2xl p-3.5 border border-blue-200 dark:border-blue-900/40 flex items-center justify-between gap-3 text-blue-900 dark:text-blue-200">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0">
                      <Layers3 className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-[12px] text-blue-900 dark:text-blue-200">HR Leave Deduction Priority Rule Active</h4>
                      <p className="text-[11px] text-blue-700 dark:text-blue-300">
                        Absences ({empDetails.deduction.unassignedAbsenceTotal} days) auto-deducted in sequence: <strong className="text-emerald-700 dark:text-emerald-400">PL ({empDetails.plUsed} used)</strong> → <strong className="text-purple-700 dark:text-purple-400">CL ({empDetails.clUsed} used)</strong> → <strong className="text-amber-700 dark:text-amber-400">SL ({empDetails.slUsed} used)</strong>
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono bg-white dark:bg-blue-900/50 px-2.5 py-1 rounded-full text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-700/50 whitespace-nowrap font-bold shadow-xs">
                    Total Absences: {empDetails.deduction.unassignedAbsenceTotal} days
                  </span>
                </div>

                {/* Leave Balances Grid (PL, CL, SL) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-[14px] flex items-center gap-2 text-slate-900 dark:text-slate-100">
                      <Award className="w-4 h-4 text-amber-600 dark:text-amber-400" /> HR Leave Balances & Remaining Allowance
                    </h3>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">Priority: PL → CL → SL</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* PL (Privilege Leave) */}
                    <div className="bg-slate-50 dark:bg-slate-800/40 rounded-[20px] p-4 space-y-2 relative overflow-hidden border border-slate-200 dark:border-white/5">
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] font-bold text-emerald-800 dark:text-emerald-400 tracking-wider font-mono">PL • PRIVILEGE LEAVE</span>
                        <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40 px-2 py-0.5 rounded-full font-mono font-bold">{empDetails.plRemaining} LEFT</span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">{empDetails.plRemaining}</span>
                        <span className="text-[12px] text-slate-500 dark:text-slate-400">/ {empDetails.plTotal} Days</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden border border-slate-300 dark:border-white/10">
                        <div style={{ width: `${(empDetails.plRemaining / empDetails.plTotal) * 100}%` }} className="h-full bg-emerald-500 rounded-full transition-all"></div>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">Total Used: <strong className="text-emerald-700 dark:text-emerald-400 font-bold">{empDetails.plUsed} days</strong> (Remaining: {empDetails.plRemaining})</p>
                    </div>

                    {/* CL (Casual Leave) */}
                    <div className="bg-slate-50 dark:bg-slate-800/40 rounded-[20px] p-4 space-y-2 relative overflow-hidden border border-slate-200 dark:border-white/5">
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] font-bold text-purple-800 dark:text-purple-400 tracking-wider font-mono">CL • CASUAL LEAVE</span>
                        <span className="text-[10px] bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800/40 px-2 py-0.5 rounded-full font-mono font-bold">{empDetails.clRemaining} LEFT</span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">{empDetails.clRemaining}</span>
                        <span className="text-[12px] text-slate-500 dark:text-slate-400">/ {empDetails.clTotal} Days</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden border border-slate-300 dark:border-white/10">
                        <div style={{ width: `${(empDetails.clRemaining / empDetails.clTotal) * 100}%` }} className="h-full bg-purple-500 rounded-full transition-all"></div>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">Total Used: <strong className="text-purple-700 dark:text-purple-400 font-bold">{empDetails.clUsed} days</strong> (Remaining: {empDetails.clRemaining})</p>
                    </div>

                    {/* SL (Sick Leave) */}
                    <div className="bg-slate-50 dark:bg-slate-800/40 rounded-[20px] p-4 space-y-2 relative overflow-hidden border border-slate-200 dark:border-white/5">
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] font-bold text-amber-800 dark:text-amber-400 tracking-wider font-mono">SL • SICK LEAVE</span>
                        <span className="text-[10px] bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40 px-2 py-0.5 rounded-full font-mono font-bold">{empDetails.slRemaining} LEFT</span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">{empDetails.slRemaining}</span>
                        <span className="text-[12px] text-slate-500 dark:text-slate-400">/ {empDetails.slTotal} Days</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden border border-slate-300 dark:border-white/10">
                        <div style={{ width: `${(empDetails.slRemaining / empDetails.slTotal) * 100}%` }} className="h-full bg-amber-500 rounded-full transition-all"></div>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">Total Used: <strong className="text-amber-700 dark:text-amber-400 font-bold">{empDetails.slUsed} days</strong> (Remaining: {empDetails.slRemaining})</p>
                    </div>
                  </div>
                </div>

                {/* INDIVIDUAL LEAVE HISTORY TABLE */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-[14px] flex items-center gap-2 text-slate-900 dark:text-slate-100">
                      <ClipboardList className="w-4 h-4 text-purple-600 dark:text-purple-400" /> Leave Records for {selectedEmployee.emp_name}
                    </h3>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">{empDetails.empLeaveRecords.length} Leave Entries</span>
                  </div>

                  <div className="bg-white dark:bg-slate-900/60 rounded-2xl overflow-hidden border border-slate-200 dark:border-white/5 shadow-sm">
                    <table className="w-full text-[12px]">
                      <thead className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="text-left px-3 py-2.5 text-slate-700 dark:text-slate-300 font-mono text-[11px] font-semibold uppercase tracking-wider">emp id</th>
                          <th className="text-left px-3 py-2.5 text-slate-700 dark:text-slate-300 font-mono text-[11px] font-semibold uppercase tracking-wider">emplname</th>
                          <th className="text-center px-3 py-2.5 text-slate-700 dark:text-slate-300 font-mono text-[11px] font-semibold uppercase tracking-wider">leave value</th>
                          <th className="text-center px-3 py-2.5 text-slate-700 dark:text-slate-300 font-mono text-[11px] font-semibold uppercase tracking-wider">leave type</th>
                          <th className="text-center px-3 py-2.5 text-slate-700 dark:text-slate-300 font-mono text-[11px] font-semibold uppercase tracking-wider">start date</th>
                          <th className="text-center px-3 py-2.5 text-slate-700 dark:text-slate-300 font-mono text-[11px] font-semibold uppercase tracking-wider">end date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                        {empDetails.empLeaveRecords.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="text-center py-6 text-slate-500 dark:text-slate-400">No leave records registered for this employee</td>
                          </tr>
                        ) : (
                          empDetails.empLeaveRecords.map((r: any, idx: any) => (
                            <tr key={idx} className="border-b border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-slate-800/30 text-slate-800 dark:text-slate-200 transition-colors">
                              <td className="px-3 py-2 font-mono text-slate-900 dark:text-slate-100 font-semibold">{r['emp id']}</td>
                              <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-200">{r['emplname']}</td>
                              <td className="px-3 py-2 text-center font-mono font-bold text-amber-600 dark:text-amber-400">{r['leave value']}</td>
                              <td className="px-3 py-2 text-center">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                  r['leave type'] === 'PL' ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800/40' :
                                  r['leave type'] === 'CL' ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-800/40' :
                                  'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800/40'
                                }`}>
                                  {r['leave type']}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-center font-mono text-slate-600 dark:text-slate-400">{r['start date']}</td>
                              <td className="px-3 py-2 text-center font-mono text-slate-600 dark:text-slate-400">{r['end date']}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Form to Log New Leave */}
                  {user.role === 'hr' ? (
                    <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-4 space-y-3 border border-slate-200 dark:border-white/5">
                      <h4 className="font-semibold text-[12px] flex items-center gap-1.5 text-emerald-800 dark:text-emerald-400">
                        <PlusCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Log / Add New Leave Record for Employee
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px]">
                        <div>
                          <label className="text-[10px] text-slate-500 dark:text-slate-400 block mb-1 font-bold">Leave Type</label>
                          <select
                            value={newLeaveForm.leaveType}
                            onChange={e => setNewLeaveForm({ ...newLeaveForm, leaveType: e.target.value })}
                            className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-2 py-1.5 text-slate-900 dark:text-slate-100 outline-none focus:border-blue-600"
                          >
                            <option value="PL" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">PL (Privilege Leave)</option>
                            <option value="CL" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">CL (Casual Leave)</option>
                            <option value="SL" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">SL (Sick Leave)</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-500 dark:text-slate-400 block mb-1 font-bold">Leave Value</label>
                          <select
                            value={newLeaveForm.leaveValue}
                            onChange={e => setNewLeaveForm({ ...newLeaveForm, leaveValue: Number(e.target.value) })}
                            className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-2 py-1.5 text-slate-900 dark:text-slate-100 outline-none font-mono focus:border-blue-600"
                          >
                            <option value={1} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">1 (Full Day)</option>
                            <option value={0.5} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">0.5 (Half Day)</option>
                            <option value={0.25} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">0.25 (Quarter Day)</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-500 dark:text-slate-400 block mb-1 font-bold">Start Date</label>
                          <input
                            type="date"
                            value={newLeaveForm.startDate}
                            onChange={e => setNewLeaveForm({ ...newLeaveForm, startDate: e.target.value, endDate: e.target.value })}
                            className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-2 py-1.5 text-slate-900 dark:text-slate-100 outline-none font-mono focus:border-blue-600"
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
                  ) : (
                    <div className="bg-blue-50/50 dark:bg-blue-950/30 rounded-2xl p-3 border border-blue-100 dark:border-blue-900/30 text-blue-800 dark:text-blue-300 text-[11px] font-medium text-center">
                      ℹ️ Manual leave override logging is locked in View-Only mode.
                    </div>
                  )}
                </div>

                {/* Monthly Attendance Calendar Grid */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-[14px] flex items-center gap-2 text-slate-900 dark:text-slate-100">
                    <Calendar className="w-4 h-4 text-slate-600 dark:text-slate-400" /> Daily Attendance Log for {selectedEmployee.emp_name}
                  </h3>

                  {/* Day of Week Headers - Monday to Sunday */}
                  <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <div>Mon</div>
                    <div>Tue</div>
                    <div>Wed</div>
                    <div>Thu</div>
                    <div>Fri</div>
                    <div className="text-slate-600 dark:text-slate-300 font-extrabold">Sat</div>
                    <div className="text-slate-600 dark:text-slate-300 font-extrabold">Sun</div>
                  </div>

                  <div className="grid grid-cols-7 gap-2 text-center text-[11px]">
                    {/* Padding Days for Monday-start week format */}
                    {(() => {
                      if (!processed.allDates || processed.allDates.length === 0) return null
                      const firstDateStr = processed.allDates[0]
                      const firstDObj = new Date(firstDateStr + 'T00:00:00')
                      const paddingDays = (firstDObj.getDay() + 6) % 7
                      return Array.from({ length: paddingDays }).map((_: any, i: any) => (
                        <div key={`pad-${i}`} className="bg-slate-50/30 dark:bg-white/5 border border-dashed border-slate-200 dark:border-white/5 rounded-xl h-14"></div>
                      ))
                    })()}

                    {processed.allDates.map((d: any) => {
                      const rawStatus = selectedEmployee[d] || 'A'
                      const dayLog = processed.daily ? processed.daily.find((r: any) => String(r.emp_id) === String(selectedEmployee.emp_id) && r.date === d) : null
                      const empObj = (processed?.employees || store.employees || []).find((e: any) => String(e.emp_id) === String(selectedEmployee.emp_id));
                      const empDoj = selectedEmployee.doj || empObj?.doj || null;
                      // Convert raw status to semantic color using logic
                      const semanticStatus = resolveAttendanceStatus(rawStatus, d, empDoj, dayLog?.duration, processed?.lastRecordedDateStr)

                      const dayNum = parseInt(d.split('-')[2], 10)
                      const color = semanticStatus === 'P' ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40' :
                        semanticStatus === '3/4P' ? 'bg-emerald-50/70 text-emerald-800 border-emerald-400 font-bold dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-700/50' :
                          semanticStatus === '1/2P' || semanticStatus === 'HD' ? 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40' :
                            semanticStatus === 'A' ? 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/40' :
                              semanticStatus === 'PL' ? 'bg-emerald-100 text-emerald-800 border-emerald-400 font-bold dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700/40' :
                                semanticStatus === 'CL' ? 'bg-purple-100 text-purple-800 border-purple-400 font-bold dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-700/40' :
                                  semanticStatus === 'SL' ? 'bg-amber-100 text-amber-800 border-amber-400 font-bold dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700/40' :
                                    semanticStatus === 'H' ? 'bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/40' :
                                      'bg-slate-50 text-slate-400 border-slate-200 dark:bg-slate-800/40 dark:text-slate-500 dark:border-white/5'

                      const dayDObj = new Date(d + 'T00:00:00')

                      const displayStatus = (rawStatus === 'A' || rawStatus === 'P' || rawStatus === 'nan' || !rawStatus)
                        ? (semanticStatus === '-' ? '-' : (semanticStatus === '1/2P' ? '½P' : (semanticStatus === '3/4P' ? '¾P' : (semanticStatus === 'WO' ? 'WO' : (semanticStatus === 'P' ? 'P' : 'A')))))
                        : rawStatus;

                      return (
                        <div key={d} className={`group relative rounded-xl p-2 border flex flex-col items-center justify-between h-14 shadow-xs ${color} hover:ring-2 hover:ring-offset-1 hover:ring-opacity-40 transition-all cursor-default`}>
                          <span className="text-[10px] font-mono opacity-70">{dayNum}</span>
                          <span className="font-bold text-[10px] leading-tight flex-1 flex items-center justify-center text-center">{displayStatus === '1/2P' ? '½P' : (displayStatus === '3/4P' ? '¾P' : (displayStatus === 'H' ? 'HO' : displayStatus))}</span>

                          {semanticStatus !== '-' && (
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center z-50 w-max bg-slate-800 text-white text-[11px] px-3 py-2 rounded-xl shadow-2xl pointer-events-none ring-1 ring-white/10 backdrop-blur-md">
                              <div className="font-semibold mb-1 text-slate-200 border-b border-white/10 pb-1 w-full text-center">{dayDObj.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</div>
                              {dayLog && dayLog.first_punch && dayLog.first_punch !== '00:00:00' ? (
                                dayLog.all_punches && dayLog.all_punches.length > 2 ? (
                                  <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center max-w-[200px] font-mono mt-0.5 font-medium text-[10px]">
                                    {dayLog.all_punches.map((p: any, i: any) => (
                                      <span key={i} className={i % 2 === 0 ? "text-emerald-400" : "text-amber-400"}>
                                        {i % 2 === 0 ? 'In' : 'Out'}: {p.substring(0, 5)}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="flex gap-3 font-mono mt-0.5 font-medium">
                                    <span className="text-emerald-400">In: {dayLog.first_punch.substring(0, 5)}</span>
                                    <span className="text-slate-500">|</span>
                                    <span className="text-amber-400">Out: {dayLog.last_punch.substring(0, 5)}</span>
                                  </div>
                                )
                              ) : (
                                <div className="opacity-70 italic font-medium mt-0.5">{status === 'WO' ? 'Week Off' : status === 'H' ? 'Holiday' : status === 'A' ? 'Absent (No punches)' : 'No punch records'}</div>
                              )}
                              <div className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-slate-800"></div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="flex justify-end pt-2">
                  <button onClick={() => setSelectedEmployee(null)} className="material-btn dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-700 px-5 py-2 rounded-xl text-[12px] font-medium">
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
                {toast.type === 'error' ? <AlertCircle className="w-4 h-4 text-rose-400" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              </div>
              <span className="text-[13px] font-medium max-w-[420px] truncate text-white">{toast.msg}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
