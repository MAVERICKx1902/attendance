import React, { useRef } from 'react'
import {
  Calendar, Upload, ChevronLeft, ChevronRight, Shield, Zap
} from 'lucide-react'

export function DashboardHeader({
  selectedMonth,
  setSelectedMonth,
  onFileUpload,
  userRole,
  setUserRole,
  loading
}: any) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const monthNames = [
    { key: '2026-01', label: 'Jan 2026' },
    { key: '2026-02', label: 'Feb 2026' },
    { key: '2026-03', label: 'Mar 2026' },
    { key: '2026-04', label: 'Apr 2026' },
    { key: '2026-05', label: 'May 2026' },
    { key: '2026-06', label: 'Jun 2026' },
    { key: '2026-07', label: 'Jul 2026' },
    { key: '2026-08', label: 'Aug 2026' },
    { key: '2026-09', label: 'Sep 2026' }
  ]

  const handleFileChange = (e: any) => {
    const file = e.target.files?.[0]
    if (file && onFileUpload) {
      onFileUpload(file)
    }
  }

  return (
    <header className="sticky top-0 z-20 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
      {/* Month Navigation Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
        <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 rounded-2xl p-1 shadow-inner">
          <Calendar className="w-4 h-4 text-indigo-400 ml-2 mr-1" />
          {monthNames.map(m => (
            <button
              key={m.key}
              onClick={() => setSelectedMonth && setSelectedMonth(m.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedMonth === m.key
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Upload & Actions */}
      <div className="flex items-center gap-3 shrink-0">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".xlsx,.xls,.csv"
          className="hidden"
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-indigo-600/20 transition-all border border-indigo-500/30 disabled:opacity-50"
        >
          <Upload className="w-4 h-4" />
          <span>{loading ? 'Processing...' : 'Upload Excel'}</span>
        </button>
      </div>
    </header>
  )
}

export default DashboardHeader
