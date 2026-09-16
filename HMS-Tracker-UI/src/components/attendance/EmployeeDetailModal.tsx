import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Calendar, Clock, ChevronLeft, ChevronRight, ChevronDown, CheckCircle, AlertCircle
} from 'lucide-react'
import { parseFlexibleDate, getFullMonthDates } from '../../utils/dateUtils'
import { formatHoursToHM, parseDurationToHours } from '../../utils/durationUtils'

export function EmployeeDetailModal({
  employee,
  monthStr = '2026-08',
  logs = [],
  onClose
}: any) {
  const [currentMonth, setCurrentMonth] = useState(monthStr)

  if (!employee) return null

  const dates = getFullMonthDates(currentMonth)
  const empId = employee.emp_id || employee.emp_no
  const empName = employee.emp_name || employee.name
  const empDept = employee.department || 'N/A'
  const empDoj = employee.doj || ''

  const empDojObj = empDoj ? parseFlexibleDate(empDoj) : null
  const empDojMs = empDojObj ? empDojObj.getTime() : null

  // Index logs by date for this employee
  const logMap = new Map()
// @ts-ignore
  logs.forEach(l => {
    if (String(l.emp_id).toLowerCase() === String(empId).toLowerCase() && l.date) {
      logMap.set(l.date, l)
    }
  })

  const availableMonths = React.useMemo(() => {
    const months = new Set<string>();
    if (currentMonth) months.add(currentMonth);

    if (logs && logs.length > 0) {
      logs.forEach((l: any) => {
        if (l.date && l.date.length >= 7) {
          months.add(l.date.substring(0, 7));
        }
      });
    }

    const years = new Set<number>();
    months.forEach((m) => {
      const y = parseInt(m.split('-')[0], 10);
      if (!isNaN(y)) years.add(y);
    });
    if (years.size === 0) {
      years.add(new Date().getFullYear());
    }
    years.forEach((yr) => {
      for (let m = 1; m <= 12; m++) {
        months.add(`${yr}-${String(m).padStart(2, '0')}`);
      }
    });

    return Array.from(months).sort();
  }, [logs, currentMonth]);

  const traverseMonth = (dir: 1 | -1) => {
    const [y, m] = currentMonth.split('-').map(Number)
    const d = new Date(y, m - 1 + dir, 1)
    setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 to-cyan-500 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-500/20">
                {empName ? empName.split(' ').map((n: any) => n[0]).join('').slice(0, 2) : 'EM'}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{empName}</h2>
                <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                  <span>ID: <strong className="text-indigo-400">{empId}</strong></span>
                  <span>•</span>
                  <span>Dept: <strong className="text-slate-200">{empDept}</strong></span>
                  <span>•</span>
                  <span>DOJ: <strong className="text-amber-400">{empDoj || '-'}</strong></span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-slate-800 rounded-xl p-1 mr-4 border border-slate-700">
                <button
                  onClick={() => traverseMonth(-1)}
                  title="Previous Month"
                  className="p-1 hover:bg-slate-700 rounded text-slate-300 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="relative flex items-center">
                  <select
                    value={currentMonth}
                    onChange={(e) => setCurrentMonth(e.target.value)}
                    className="appearance-none bg-transparent hover:bg-slate-700/50 text-xs font-semibold text-slate-200 pl-2 pr-6 py-1 rounded outline-none cursor-pointer"
                  >
                    {availableMonths.map((m) => (
                      <option key={m} value={m} className="bg-slate-900 text-white">
                        {m} ({new Date(`${m}-01T00:00:00`).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 pointer-events-none absolute right-1" />
                </div>
                <button
                  onClick={() => traverseMonth(1)}
                  title="Next Month"
                  className="p-1 hover:bg-slate-700 rounded text-slate-300 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Leave Balances Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">PL Balance</div>
              <div className="text-lg font-bold text-emerald-400 mt-1">
                {employee.pl_bal ?? 12} <span className="text-xs font-normal text-slate-500">/ 12</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Used: {employee.pl_used || 0}</div>
            </div>

            <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">CL Balance</div>
              <div className="text-lg font-bold text-cyan-400 mt-1">
                {employee.cl_bal ?? 6} <span className="text-xs font-normal text-slate-500">/ 6</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Used: {employee.cl_used || 0}</div>
            </div>

            <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">SL Balance</div>
              <div className="text-lg font-bold text-purple-400 mt-1">
                {employee.sl_bal ?? 6} <span className="text-xs font-normal text-slate-500">/ 6</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Used: {employee.sl_used || 0}</div>
            </div>

            <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Pay Days</div>
              <div className="text-lg font-bold text-cyan-300 mt-1">{employee.total_pay_days || 0}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">LOP: {employee.lop || 0}</div>
            </div>
          </div>

          {/* Month Navigation & Daily Log Cards */}
          <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <Calendar className="w-4 h-4 text-indigo-400" />
                <span>Daily Attendance Log for {empName} ({currentMonth})</span>
              </div>
            </div>

            {/* Calendar Days Grid */}
            <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-slate-400 mb-2">
              <span>MON</span><span>TUE</span><span>WED</span><span>THU</span><span>FRI</span><span>SAT</span><span className="text-rose-400">SUN</span>
            </div>

            <div className="grid grid-cols-7 gap-2">
              {dates.map(d => {
                const dayDObj = new Date(d + 'T00:00:00')
                const isPreJoining = empDojMs && dayDObj.getTime() < empDojMs
                const dayNum = dayDObj.getDate()
                const dayLog = logMap.get(d)
                const status = isPreJoining ? '-' : (dayLog ? dayLog.status : (dayDObj.getDay() === 0 ? 'WO' : 'A'))

                let color = 'bg-slate-900/40 border-slate-800 text-slate-400'
                if (status === 'P') color = 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                else if (status === '3/4P') color = 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
                else if (status === '1/2P') color = 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                else if (status === 'A') color = 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                else if (status === 'WO' || status === 'H') color = 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                else if (['PL', 'CL', 'SL'].includes(status)) color = 'bg-purple-500/10 border-purple-500/30 text-purple-300'

                const durationHours = dayLog ? parseDurationToHours(dayLog.duration || dayLog.durationMins || dayLog.durationStr) : 0
                const durationHM = formatHoursToHM(durationHours)

                return (
                  <div key={d} className={`group relative bg-slate-900/60 rounded-xl p-2 border flex flex-col items-center justify-between h-14 shadow-xs ${color} hover:ring-2 hover:ring-indigo-400/40 transition-all cursor-default`}>
                    <span className="text-[10px] font-mono opacity-70">{dayNum}</span>
                    <span className="font-bold text-[11px]">{status === '1/2P' ? '½P' : (status === '3/4P' ? '¾P' : status)}</span>

                    {status !== '-' && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center z-50 w-max bg-slate-800 text-white text-[11px] px-3 py-2 rounded-xl shadow-2xl pointer-events-none border border-slate-700 backdrop-blur-md">
                        <div className="font-semibold mb-1 text-slate-200 border-b border-slate-700 pb-1 w-full text-center">
                          {dayDObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </div>
                        {dayLog && dayLog.first_punch && dayLog.first_punch !== '00:00:00' ? (
                          <div className="flex gap-3 font-mono mt-0.5 font-medium">
                            <span className="text-emerald-400">In: {dayLog.first_punch.substring(0, 5)}</span>
                            <span className="text-slate-500">|</span>
                            <span className="text-amber-400">Out: {dayLog.last_punch.substring(0, 5)}</span>
                          </div>
                        ) : (
                          <div className="opacity-70 italic font-medium mt-0.5">{status === 'WO' ? 'Week Off' : status === 'A' ? 'Absent' : 'No punch record'}</div>
                        )}
                        {dayLog && durationHours > 0 && (
                          <div className="text-[10px] font-mono text-cyan-300 mt-1 font-semibold">
                            Duration: {durationHM} ({Math.round(durationHours * 60)} min)
                          </div>
                        )}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-slate-800"></div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

export default EmployeeDetailModal
