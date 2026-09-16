import React from 'react'
import { Search, SlidersHorizontal, FileText } from 'lucide-react'
import { formatHoursToHM, parseDurationToHours } from '../../utils/durationUtils'

export function AttendanceLogsTable({
  logs = [],
  searchTerm,
  setSearchTerm,
  selectedDepartment,
  setSelectedDepartment,
  departments,
  onSelectEmployee
}: any) {
  const filteredLogs = logs.filter((r: any) => {
    const matchesSearch = !searchTerm ||
      (r.emp_name && r.emp_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (r.emp_id && String(r.emp_id).toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesDept = !selectedDepartment || r.department === selectedDepartment
    return matchesSearch && matchesDept
  })

  return (
    <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-400" />
            Biometric Punch Logs & Duration
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Raw biometric logs displaying In/Out punches and duration computed in hours and minutes.
          </p>
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
// @ts-ignore
// @ts-ignore
                {departments.map((dept: any) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Logs Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-800/80 max-h-[65vh]">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/90 sticky top-0 z-20 text-slate-400 uppercase tracking-wider text-[10px] font-semibold">
              <th className="p-3">Date</th>
              <th className="p-3">Emp ID</th>
              <th className="p-3">Employee Name</th>
              <th className="p-3">Department</th>
              <th className="p-3 text-center">In Time</th>
              <th className="p-3 text-center">Out Time</th>
              <th className="p-3 text-center">Duration</th>
              <th className="p-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50 text-slate-300 bg-slate-900/30 font-mono">
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-8 text-slate-500 italic font-sans">
                  No biometric punch logs matching criteria.
                </td>
              </tr>
            ) : (
// @ts-ignore
              filteredLogs.map((log: any, idx: any) => {
                const hours = parseDurationToHours(log.duration || log.durationMins || log.durationStr)
                const durationFormatted = formatHoursToHM(hours)

                return (
                  <tr
                    key={idx}
                    onClick={() => onSelectEmployee && onSelectEmployee(log)}
                    className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                  >
                    <td className="p-3 text-slate-400">{log.date}</td>
                    <td className="p-3 font-bold text-indigo-400 group-hover:text-indigo-300">{log.emp_id}</td>
                    <td className="p-3 text-white font-sans font-medium group-hover:text-indigo-300">{log.emp_name}</td>
                    <td className="p-3 text-slate-400 font-sans">{log.department || 'N/A'}</td>
                    <td className="p-3 text-center text-emerald-400">{log.first_punch || log.in_time || '00:00:00'}</td>
                    <td className="p-3 text-center text-amber-400">{log.last_punch || log.out_time || '00:00:00'}</td>
                    <td className="p-3 text-center text-cyan-300 font-semibold">{durationFormatted}</td>
                    <td className="p-3 text-center font-sans">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        log.status === 'P' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                        log.status === '3/4P' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' :
                        log.status === '1/2P' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                        log.status === 'A' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                        'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      }`}>
                        {log.status || 'P'}
                      </span>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default AttendanceLogsTable
