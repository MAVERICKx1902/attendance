import React from 'react'
import {
  LayoutGrid, Calendar, FileText, FileSpreadsheet, Lock, Unlock, LogOut, Users, Settings
} from 'lucide-react'

export function Sidebar({
  activeTab,
  setActiveTab,
  userRole,
  setUserRole,
  isCollapsed,
  setIsCollapsed,
  user,
  onLogout
}: any) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
    { id: 'matrix', label: 'Attendance Matrix', icon: Calendar },
    { id: 'logs', label: 'Biometric Logs', icon: FileText }
  ]

  return (
    <aside
      className={`relative z-30 bg-slate-900/90 backdrop-blur-xl border-r border-slate-800 flex flex-col justify-between transition-all duration-300 ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      <div className="p-3">
        {/* Brand Header */}
        <div className="flex items-center justify-between mb-6 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-cyan-500 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/20">
              <span className="font-bold text-white text-lg">A</span>
            </div>
            {!isCollapsed && (
              <div className="flex flex-col whitespace-nowrap">
                <span className="font-bold text-white text-sm">Autocrat Engineers</span>
                <span className="text-[10px] text-indigo-400 font-mono">AMS Enterprise v2.0</span>
              </div>
            )}
          </div>
          <button
            onClick={() => setIsCollapsed && setIsCollapsed(!isCollapsed)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4 text-indigo-400" />}
          </button>
        </div>

        {/* Role Selector Badge */}
        {!isCollapsed && userRole && (
          <div className="mb-4 px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between">
            <span className="text-[10px] uppercase font-semibold text-slate-400">Current Role</span>
            <select
              value={userRole}
              onChange={(e) => setUserRole && setUserRole(e.target.value)}
              className="bg-transparent text-xs font-bold text-indigo-400 focus:outline-none cursor-pointer"
            >
              <option value="Boss">Boss</option>
              <option value="Admin">Admin</option>
              <option value="HR">HR</option>
              <option value="HOD">HOD</option>
              <option value="Employee">Employee</option>
              <option value="Viewer">Viewer</option>
            </select>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="space-y-1">
          {navItems.map(item => {
            const Icon = item.icon
            const isActive = activeTab === item.id
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab && setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 shadow-md shadow-indigo-600/10'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-indigo-400' : ''}`} />
                {!isCollapsed && <span className="whitespace-nowrap">{item.label}</span>}
              </button>
            )
          })}
        </nav>
      </div>

      {/* User Footer & Logout */}
      <div className="p-3 border-t border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-indigo-950 border border-indigo-500/30 flex items-center justify-center font-bold text-xs text-indigo-300 uppercase shrink-0">
              {user && user.username ? user.username[0] : 'A'}
            </div>
            {!isCollapsed && (
              <div className="flex flex-col overflow-hidden text-left">
                <span className="text-xs font-semibold text-white truncate max-w-[120px]">
                  {user ? user.name || user.username : 'Mervin Autocrat'}
                </span>
                <span className="text-[10px] text-indigo-400 uppercase font-mono">
                  {userRole || 'Admin'}
                </span>
              </div>
            )}
          </div>
          {!isCollapsed && onLogout && (
            <button
              onClick={onLogout}
              className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-950/30 transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  )
}

export default Sidebar
