import React, { useState } from 'react'
import { X, Calendar, User, FileText, CheckCircle2 } from 'lucide-react'

export default function ManualLeaveForm({ employees = [], onSubmit, onClose }: any) {
  const [empId, setEmpId] = useState('')
  const [leaveType, setLeaveType] = useState('PL')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    if (!empId || !startDate) return
    setSubmitting(true)
    try {
// @ts-ignore
      const selectedEmp = employees.find((emp: any) => String(emp.emp_id) === String(empId))
      await onSubmit({
        emp_id: empId,
        emp_name: selectedEmp ? selectedEmp.emp_name : '',
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate || startDate,
        reason
      })
      onClose()
    } catch (err) {
      console.error("Failed to submit manual leave", err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-400" />
            Apply Manual Leave
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Select Employee */}
          <div className="space-y-1">
            <label className="block text-slate-300 font-medium">Select Employee *</label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <select
                required
                value={empId}
                onChange={(e) => setEmpId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:border-indigo-500 appearance-none"
              >
                <option value="">-- Choose Employee --</option>
// @ts-ignore
// @ts-ignore
                {employees.map((emp: any) => (
                  <option key={emp.emp_id} value={emp.emp_id}>
                    {emp.emp_id} - {emp.emp_name} ({emp.department || 'N/A'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Leave Type */}
          <div className="space-y-1">
            <label className="block text-slate-300 font-medium">Leave Type *</label>
            <select
              value={leaveType}
              onChange={(e) => setLeaveType(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500"
            >
              <option value="PL">Paid Leave (PL)</option>
              <option value="CL">Casual Leave (CL)</option>
              <option value="SL">Sick Leave (SL)</option>
              <option value="LOP">Loss of Pay (LOP)</option>
            </select>
          </div>

          {/* Start & End Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-slate-300 font-medium">From Date *</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-slate-300 font-medium">To Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Reason */}
          <div className="space-y-1">
            <label className="block text-slate-300 font-medium">Reason / Remarks</label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Medical leave, emergency personal work..."
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold transition-all shadow-lg shadow-indigo-600/25 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{submitting ? 'Submitting...' : 'Submit Leave'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
