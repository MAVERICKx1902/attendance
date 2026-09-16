import React from 'react'
import { Search, SlidersHorizontal, Download, Plus, FileSpreadsheet } from 'lucide-react'

export default function LeaveSummaryTable({
  leaveSummary,
  searchTerm,
  setSearchTerm,
  selectedDepartment,
  setSelectedDepartment,
  departments,
  exportToExcel,
  onOpenLeaveModal,
  onSelectEmployee,
  userRole
}: any) {
// @ts-ignore
  const filteredSummary = leaveSummary.filter((emp: any) => {
    const matchesSearch = !searchTerm || 
      (emp.emp_name && emp.emp_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (emp.emp_id && String(emp.emp_id).toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesDept = !selectedDepartment || emp.department === selectedDepartment
    return matchesSearch && matchesDept
  })

  const isReadOnly = userRole === 'Employee' || userRole === 'Viewer'

  return (
    <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 shadow-2xl space-y-6">
      {/* Table Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-indigo-400" />
            Employee Leave & Pay Days Summary
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Calculated according to company policy: Paid Leave (PL) → Casual Leave (CL) → Sick Leave (SL) auto-deduction.
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

          {/* Export Button */}
          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl transition-all border border-slate-700/50 hover:border-slate-600 shadow-md"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export XLSX</span>
          </button>

          {/* Apply Manual Leave Button */}
          {!isReadOnly && onOpenLeaveModal && (
            <button
              onClick={onOpenLeaveModal}
              className="flex items-center gap-2 px-3 me bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold py-2 rounded-xl transition-all shadow-lg shadow-indigo-600/25"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Apply Leave</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-800/80">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider text-[10px] font-semibold border-b border-slate-800">
            <tr>
              <th className="py-3 px-4">Emp ID</th>
              <th className="py-3 px-4">Employee Name</th>
              <th className="py-3 px-4">Department</th>
              <th className="py-3 px-4">DOJ</th>
              <th className="py-3 px-4 text-center text-emerald-400">Present</th>
              <th className="py-3 px-4 text-center text-blue-400">Paid Leave (PL)</th>
              <th className="py-3 px-4 text-center text-purple-400">Casual Leave (CL)</th>
              <th className="py-3 px-4 text-center text-amber-400">Sick Leave (SL)</th>
              <th className="py-3 px-4 text-center text-rose-400 font-bold">LOP</th>
              <th className="py-3 px-4 text-center text-cyan-400 font-bold">Total Pay Days</th>
              <th className="py-3 px-4 text-center">Bal PL</th>
              <th className="py-3 px-4 text-center">Bal CL</th>
              <th className="py-3 px-4 text-center">Bal SL</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50 bg-slate-900/30">
            {filteredSummary.length === 0 ? (
              <tr>
                <td colSpan={13} className="text-center py-8 text-slate-500 italic">
                  No employee summary data available.
                </td>
              </tr>
            ) : (
// @ts-ignore
              filteredSummary.map((emp, idx) => (
                <tr
                  key={emp.emp_id || idx}
                  className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                  onClick={() => onSelectEmployee && onSelectEmployee(emp)}
                >
                  <td className="py-3 px-4 font-mono text-slate-400 group-hover:text-indigo-300 transition-colors">
                    {emp.emp_id}
                  </td>
                  <td className="py-3 px-4 font-medium text-white group-hover:text-indigo-400 transition-colors">
                    {emp.emp_name}
                  </td>
                  <td className="py-3 px-4 text-slate-400">{emp.department || 'N/A'}</td>
                  <td className="py-3 px-4 text-slate-400 font-mono">{emp.doj || '-'}</td>
                  <td className="py-3 px-4 text-center font-bold text-emerald-400">{emp.present_days || 0}</td>
                  <td className="py-3 px-4 text-center font-semibold text-blue-400">{emp.pl_used || 0}</td>
                  <td className="py-3 px-4 text-center font-semibold text-purple-400">{emp.cl_used || 0}</td>
                  <td className="py-3 px-4 text-center font-semibold text-amber-400">{emp.sl_used || 0}</td>
                  <td className="py-3 px-4 text-center font-bold text-rose-400 bg-rose-950/20">{emp.lop || 0}</td>
                  <td className="py-3 px-4 text-center font-black text-cyan-300 bg-cyan-950/20 text-sm">
                    {emp.total_pay_days || 0}
                  </td>
                  <td className="py-3 px-4 text-center text-slate-400">{emp.pl_bal ?? 12}</td>
                  <td className="py-3 px-4 text-center text-slate-400">{emp.cl_bal ?? 6}</td>
                  <td className="py-3 px-4 text-center text-slate-400">{emp.sl_bal ?? 6}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
