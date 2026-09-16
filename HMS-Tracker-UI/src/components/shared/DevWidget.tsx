import React, { useState } from 'react'
import { Sparkles } from 'lucide-react'

export function DevWidget({ onSelectCredentials }: any) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2.5 rounded-full bg-slate-800/90 border border-slate-700 text-indigo-400 hover:text-white shadow-xl backdrop-blur-md transition-all hover:scale-105"
        title="Developer Quick Info"
      >
        <Sparkles className="w-5 h-5" />
      </button>

      {isOpen && (
        <div className="absolute bottom-12 right-0 w-64 bg-slate-900/95 backdrop-blur-2xl border border-slate-800 rounded-2xl p-3 shadow-2xl space-y-1.5 text-xs">
          <div className="font-semibold text-slate-400 px-2 py-1 uppercase tracking-wider text-[10px]">Autocrat System Accounts</div>
          <div className="px-2.5 py-1.5 rounded-lg bg-slate-950/60 text-slate-200 flex justify-between items-center">
            <span>Executive (Boss)</span>
            <span className="text-[10px] font-mono text-purple-400">boss@autocrat.com</span>
          </div>
          <div className="px-2.5 py-1.5 rounded-lg bg-slate-950/60 text-slate-200 flex justify-between items-center">
            <span>System Admin</span>
            <span className="text-[10px] font-mono text-indigo-400">admin@autocrat.com</span>
          </div>
          <div className="px-2.5 py-1.5 rounded-lg bg-slate-950/60 text-slate-200 flex justify-between items-center">
            <span>HR Manager</span>
            <span className="text-[10px] font-mono text-emerald-400">hr@autocrat.com</span>
          </div>
          <div className="px-2.5 py-1.5 rounded-lg bg-slate-950/60 text-slate-200 flex justify-between items-center">
            <span>HOD Engineering</span>
            <span className="text-[10px] font-mono text-amber-400">hod.eng@autocrat.com</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default DevWidget
