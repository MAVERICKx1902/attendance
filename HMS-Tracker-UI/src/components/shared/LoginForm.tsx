import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Shield, Mail, Key, Eye, EyeOff, LogIn } from 'lucide-react'
import { loginUserApi } from '../../services/backendApiService'

export function LoginForm({ onLogin }: any) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    setLoginError('')
    setLoading(true)

    try {
      const res = await loginUserApi(email, password)
      if (res && res.success) {
        if (onLogin) onLogin(res.user)
      } else {
        setLoginError(res?.error || 'Invalid email or password')
      }
    } catch (err) {
// @ts-ignore
      setLoginError('Login failed: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md bg-slate-900/80 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl z-10"
      >
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Autocrat Attendance</h1>
          <p className="text-sm text-slate-400 mt-1">Sign in to access Employee Attendance Engine</p>
        </div>

        {loginError && (
          <div className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-medium leading-relaxed">
            {loginError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@autocrat.com"
                className="w-full bg-slate-950/60 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">Password</label>
            <div className="relative">
              <Key className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950/60 border border-white/10 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50"
          >
            <LogIn className="w-4 h-4" />
            <span>{loading ? 'Authenticating...' : 'Login to System'}</span>
          </button>
        </form>
      </motion.div>
    </div>
  )
}

export default LoginForm
