import React from 'react'
import { Users, CheckCircle, AlertCircle, Clock, Calendar, Sparkles } from 'lucide-react'
import { useAttendanceStore } from '../../store/AttendanceStore'
import { resolveAttendanceStatus } from '../../utils/attendanceLogic'

export function DashboardOverview({ onSelectEmployee }: any) {
  const store = useAttendanceStore()
  const { employees, attendanceLogs, leaveBalances, selectedMonth } = store

  const totalEmployees = employees.length || 0

  let totalPresent = 0
  let totalPL = 0
  let totalCL = 0
  let totalSL = 0
  let totalLOP = 0
  let unassignedAbsences = 0

  // We should aggregate based on the logs for the selectedMonth
  const targetPrefix = selectedMonth // e.g. "2026-08"
  
  attendanceLogs.forEach((log: any) => {
    if (log.date && log.date.startsWith(targetPrefix)) {
      const emp = employees.find(e => String(e.emp_id) === String(log.emp_id))
      const status = resolveAttendanceStatus(log.detailed_status_code, log.date, emp?.doj || null, log.duration)
      
      if (status === 'P' || status === '3/4P' || status === '1/2P') {
        totalPresent += (status === 'P' ? 1 : (status === '3/4P' ? 0.75 : 0.5))
      } else if (status === 'PL') {
        totalPL += 1
      } else if (status === 'CL') {
        totalCL += 1
      } else if (status === 'SL') {
        totalSL += 1
      } else if (status === 'A') {
        unassignedAbsences += 1
      }
    }
  })

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 p-5 rounded-2xl flex items-center gap-4 shadow-xl">
        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
          <Users className="w-6 h-6" />
        </div>
        <div>
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Employees</div>
          <div className="text-2xl font-bold text-white mt-0.5">{totalEmployees}</div>
        </div>
      </div>

      <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 p-5 rounded-2xl flex items-center gap-4 shadow-xl">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
          <CheckCircle className="w-6 h-6" />
        </div>
        <div>
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Present / Healthy</div>
          <div className="text-2xl font-bold text-emerald-400 mt-0.5">{Math.floor(totalPresent)}</div>
        </div>
      </div>

      <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 p-5 rounded-2xl flex items-center gap-4 shadow-xl">
        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
          <Calendar className="w-6 h-6" />
        </div>
        <div>
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Paid Leaves (PL)</div>
          <div className="text-2xl font-bold text-blue-400 mt-0.5">{totalPL}</div>
        </div>
      </div>

      <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 p-5 rounded-2xl flex items-center gap-4 shadow-xl">
        <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
          <Clock className="w-6 h-6" />
        </div>
        <div>
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">CL / SL Granted</div>
          <div className="text-2xl font-bold text-purple-300 mt-0.5">{totalCL + totalSL}</div>
        </div>
      </div>

      <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 p-5 rounded-2xl flex items-center gap-4 shadow-xl">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div>
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Absences</div>
          <div className="text-2xl font-bold text-rose-400 mt-0.5">{unassignedAbsences}</div>
        </div>
      </div>
    </div>
  )
}

export default DashboardOverview
