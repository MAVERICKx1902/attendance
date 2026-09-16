import React, { useState, useMemo } from 'react'
import { Search, SlidersHorizontal, Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { getFullMonthDates } from '../../utils/dateUtils'
import { useAttendanceStore } from '../../store/AttendanceStore'
import { resolveAttendanceStatus } from '../../utils/attendanceLogic'

export function DailyAttendanceMatrix({ onSelectEmployee }: any) {
  const store = useAttendanceStore()
  const { employees, attendanceLogs, selectedMonth, setSelectedMonth, leaveBalances } = store

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDepartment, setSelectedDepartment] = useState('')
  
  // Drill-down Modal state
  const [modalEmployee, setModalEmployee] = useState<any>(null)

  const dates = getFullMonthDates(selectedMonth)

  // Departments list for filter
  const departments = useMemo(() => {
    return Array.from(new Set(employees.map(e => e.department))).filter(Boolean).sort()
  }, [employees])

  // Find the last recorded date in the database to use as a cutoff for future dates
  const lastRecordedDateStr = useMemo(() => {
    if (!attendanceLogs || attendanceLogs.length === 0) return null;
    let max = attendanceLogs[0].date;
    for (let i = 1; i < attendanceLogs.length; i++) {
      if (attendanceLogs[i].date > max) max = attendanceLogs[i].date;
    }
    return max;
  }, [attendanceLogs]);

  // Build matrix rows
  const matrixRows = useMemo(() => {
    return employees.filter((emp: any) => {
      const matchesSearch = !searchTerm || 
        (emp.emp_name && emp.emp_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (emp.emp_id && String(emp.emp_id).toLowerCase().includes(searchTerm.toLowerCase()))
      const matchesDept = !selectedDepartment || emp.department === selectedDepartment
      return matchesSearch && matchesDept
    })
  }, [employees, searchTerm, selectedDepartment])

  // Pre-index logs for the selected month to speed up matrix rendering
  const logMap = useMemo(() => {
    const map = new Map<string, any>()
    attendanceLogs.forEach(l => {
      if (l.date && l.date.startsWith(selectedMonth)) {
        map.set(`${String(l.emp_id)}_${l.date}`, l)
      }
    })
    return map
  }, [attendanceLogs, selectedMonth])

  // Pre-index DOJ for all employees
  const dojMap = useMemo(() => {
    const map = new Map<string, any>()
    (employees || []).forEach((e: any) => {
      const rawId = String(e.emp_id || '')
      const normId = rawId.replace(/^0+/, '').split('.')[0]
      const dojVal = e.doj || null
      if (dojVal) {
        if (rawId) map.set(rawId, dojVal)
        if (normId) map.set(normId, dojVal)
        if (e.emp_code) map.set(String(e.emp_code), dojVal)
        if (e.emp_name) map.set(String(e.emp_name).trim().toUpperCase(), dojVal)
      }
    })
    return map
  }, [employees])

  const handlePrevMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number)
    let newM = m - 1
    let newY = y
    if (newM < 1) { newM = 12; newY -= 1 }
    setSelectedMonth(`${newY}-${String(newM).padStart(2, '0')}`)
  }

  const handleNextMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number)
    let newM = m + 1
    let newY = y
    if (newM > 12) { newM = 1; newY += 1 }
    setSelectedMonth(`${newY}-${String(newM).padStart(2, '0')}`)
  }

  const handleRowClick = (emp: any) => {
    setModalEmployee(emp)
    if (onSelectEmployee) onSelectEmployee(emp)
  }

  return (
    <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6 relative">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-indigo-400" />
            Daily Attendance Matrix
          </h2>
          <div className="flex items-center gap-3 mt-2">
            <button onClick={handlePrevMonth} className="p-1 hover:bg-slate-800 rounded text-slate-400"><ChevronLeft className="w-4 h-4"/></button>
            <span className="text-indigo-300 font-bold text-sm">{selectedMonth}</span>
            <button onClick={handleNextMonth} className="p-1 hover:bg-slate-800 rounded text-slate-400"><ChevronRight className="w-4 h-4"/></button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Search */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search employee..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950/60 border border-slate-800 text-slate-200 text-xs rounded-xl pl-9 pr-4 py-2 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Department Filter */}
          {departments && departments.length > 0 && (
            <div className="relative">
              <SlidersHorizontal className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="bg-slate-950/60 border border-slate-800 text-slate-200 text-xs rounded-xl pl-8 pr-4 py-2 focus:outline-none focus:border-indigo-500 appearance-none cursor-pointer"
              >
                <option value="">All Departments</option>
                {departments.map((dept: any) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Matrix Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-800/80 max-h-[65vh]">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/90 sticky top-0 z-20 text-slate-400 uppercase tracking-wider text-[10px]">
              <th className="p-3 font-semibold min-w-[80px] sticky left-0 bg-slate-950/95 z-30">Emp ID</th>
              <th className="p-3 font-semibold min-w-[160px] sticky left-[80px] bg-slate-950/95 z-30">Employee Name</th>
              <th className="p-3 font-semibold min-w-[120px]">Department</th>
              {dates.map(d => (
                <th key={d} className="p-2 text-center font-mono font-medium min-w-[36px]">
                  {d.split('-')[2]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50 text-slate-300 bg-slate-900/30">
            {matrixRows.length === 0 ? (
              <tr>
                <td colSpan={dates.length + 3} className="text-center py-8 text-slate-500 italic">
                  No attendance records found for this view.
                </td>
              </tr>
            ) : (
              matrixRows.map(row => {
                const rawId = String(row.emp_id || '')
                const normId = rawId.replace(/^0+/, '').split('.')[0]
                const nameKey = String(row.emp_name || '').trim().toUpperCase()
                const empDoj = row.doj || dojMap.get(rawId) || dojMap.get(normId) || dojMap.get(nameKey) || null
                
                return (
                  <tr
                    key={row.emp_id}
                    onClick={() => handleRowClick(row)}
                    className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                  >
                    <td className="p-3 font-mono font-bold text-indigo-400 sticky left-0 bg-slate-900/95 group-hover:bg-slate-800/95 z-10">{row.emp_id}</td>
                    <td className="p-3 font-semibold text-white sticky left-[80px] bg-slate-900/95 group-hover:bg-slate-800/95 z-10 whitespace-nowrap">{row.emp_name}</td>
                    <td className="p-3 text-slate-400 whitespace-nowrap">{row.department || 'N/A'}</td>
                    {dates.map(d => {
                      const punchDateStr = d
                      const log = logMap.get(`${String(row.emp_id)}_${d}`)
                      
                      const status = resolveAttendanceStatus(log?.detailed_status_code, punchDateStr, empDoj, log?.duration, lastRecordedDateStr)

                      let badgeStyle = 'bg-slate-800/50 text-slate-400'
                      if (status === 'P') badgeStyle = 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30'
                      else if (status === '3/4P') badgeStyle = 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30'
                      else if (status === '1/2P') badgeStyle = 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30'
                      else if (status === 'A') badgeStyle = 'bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30'
                      else if (status === 'WO' || status === 'H') badgeStyle = 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      else if (['PL', 'CL', 'SL'].includes(status)) badgeStyle = 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                      else if (status === '-') badgeStyle = 'bg-slate-800/30 text-slate-500 font-medium'

                      return (
                        <td key={d} className="p-1 text-center">
                          <span className={`inline-block px-1 py-0.5 rounded text-[10px] min-w-[22px] ${badgeStyle}`}>
                            {status === '1/2P' ? '½P' : (status === '3/4P' ? '¾P' : status)}
                          </span>
                        </td>
                      )
                    })}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Drill Down Modal */}
      {modalEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
              <div>
                <h3 className="text-lg font-bold text-white">{modalEmployee.emp_name} <span className="text-slate-400 text-sm ml-2">({modalEmployee.emp_id})</span></h3>
                <p className="text-xs text-slate-400 mt-1">{modalEmployee.department} | {modalEmployee.designation}</p>
              </div>
              <button onClick={() => setModalEmployee(null)} className="text-slate-400 hover:text-white transition-colors p-2 rounded-full hover:bg-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 bg-slate-900 flex items-center gap-4 justify-center border-b border-slate-800">
              <button onClick={handlePrevMonth} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors"><ChevronLeft className="w-5 h-5" /></button>
              <div className="text-lg font-bold text-indigo-400 min-w-[120px] text-center">{selectedMonth}</div>
              <button onClick={handleNextMonth} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors"><ChevronRight className="w-5 h-5" /></button>
            </div>

            <div className="overflow-y-auto p-4 flex-1 bg-slate-950">
              <table className="w-full text-left border-collapse text-sm text-slate-300">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="py-2 px-3 font-semibold">Date</th>
                    <th className="py-2 px-3 font-semibold">In Time</th>
                    <th className="py-2 px-3 font-semibold">Out Time</th>
                    <th className="py-2 px-3 font-semibold">Duration</th>
                    <th className="py-2 px-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {dates.map(d => {
                    const punchDateStr = d
                    const rawModalId = String(modalEmployee.emp_id || '')
                    const normModalId = rawModalId.replace(/^0+/, '').split('.')[0]
                    const nameModalKey = String(modalEmployee.emp_name || '').trim().toUpperCase()
                    const empDoj = modalEmployee.doj || dojMap.get(rawModalId) || dojMap.get(normModalId) || dojMap.get(nameModalKey) || null
                    const log = logMap.get(`${String(modalEmployee.emp_id)}_${d}`)
                    const status = resolveAttendanceStatus(log?.detailed_status_code, punchDateStr, empDoj, log?.duration, lastRecordedDateStr)

                    let badgeStyle = 'bg-slate-800/50 text-slate-400'
                    if (status === 'P') badgeStyle = 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30'
                    else if (status === '3/4P') badgeStyle = 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30'
                    else if (status === '1/2P') badgeStyle = 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30'
                    else if (status === 'A') badgeStyle = 'bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30'
                    else if (status === 'WO' || status === 'H') badgeStyle = 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    else if (['PL', 'CL', 'SL'].includes(status)) badgeStyle = 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                    else if (status === '-') badgeStyle = 'bg-slate-800/30 text-slate-500 font-medium'

                    return (
                      <tr key={d} className="hover:bg-slate-900/50 transition-colors">
                        <td className="py-2 px-3 font-mono text-slate-400">{d}</td>
                        <td className="py-2 px-3">{log?.in_time || '--:--'}</td>
                        <td className="py-2 px-3">{log?.out_time || '--:--'}</td>
                        <td className="py-2 px-3 font-mono">{log?.duration || '0:00'}</td>
                        <td className="py-2 px-3">
                          <span className={`inline-block px-2 py-1 rounded text-xs min-w-[28px] text-center ${badgeStyle}`}>
                            {status === '1/2P' ? '½P' : (status === '3/4P' ? '¾P' : status)}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DailyAttendanceMatrix
