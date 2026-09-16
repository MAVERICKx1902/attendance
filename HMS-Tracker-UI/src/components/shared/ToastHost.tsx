import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'

export function ToastHost({ toasts = [], removeToast }: { toasts?: any[], removeToast?: (id: number) => void }) {
  if (!toasts || toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full">
      <AnimatePresence>
        {toasts.map(toast => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-xl border text-xs font-medium ${
              toast.type === 'error'
                ? 'bg-rose-950/90 border-rose-500/40 text-rose-200'
                : toast.type === 'info'
                ? 'bg-blue-950/90 border-blue-500/40 text-blue-200'
                : 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {toast.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              ) : toast.type === 'info' ? (
                <Info className="w-4 h-4 text-blue-400 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              )}
              <span>{toast.msg}</span>
            </div>
            {removeToast && (
              <button
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

export default ToastHost
