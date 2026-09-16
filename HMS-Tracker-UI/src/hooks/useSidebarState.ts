import { useState } from 'react'

export function useSidebarState() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [userRole, setUserRole] = useState('Admin') // 'Boss', 'Admin', 'HR', 'HOD', 'Employee', 'Viewer'
  const [user, setUser] = useState({
    username: 'mervin.autocrat',
    name: 'Mervin Autocrat',
    role: 'Admin',
    department: 'Engineering'
  })
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false)

  const setRoleAndSave = (newRole: string) => {
    setUserRole(newRole)
    setUser(prev => ({ ...prev, role: newRole }))
  }

  return {
    activeTab,
    setActiveTab,
    userRole,
    setUserRole: setRoleAndSave,
    user,
    setUser,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    isLeaveModalOpen,
    setIsLeaveModalOpen
  }
}
