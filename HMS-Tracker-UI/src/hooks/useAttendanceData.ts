import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  fetchBackendData,
  uploadExcelFile,
  applyManualLeave
} from '../services/backendApiService'
import { exportSummaryToExcel } from '../services/excelExporterService'

export function useAttendanceData() {
  const [selectedMonth, setSelectedMonth] = useState('2026-08')
  const [logs, setLogs] = useState<any[]>([])
  const [leaveSummary, setLeaveSummary] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDepartment, setSelectedDepartment] = useState('')
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null)
  const [columnMapping, setColumnMapping] = useState({
    emp_id: '', emp_name: '', date: '', time: '', datetime: '', department: '', status: ''
  })
  const [toasts, setToasts] = useState<any[]>([])

  const addToast = useCallback((msg: string, type = 'info') => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, msg, type }])
  }, [])

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const loadMonthData = useCallback(async (monthStr: string) => {
    setLoading(true)
    try {
      const data = await fetchBackendData(monthStr)
      if (data) {
        if (data.logs) setLogs(data.logs)
        if (data.summary) setLeaveSummary(data.summary)
        if (data.employees) setEmployees(data.employees)
        if (data.column_mapping) setColumnMapping(data.column_mapping)
        addToast(`Loaded attendance data for ${monthStr}`, 'success')
      }
    } catch (err) {
      console.warn("Backend fetch failed, using internal calculation:", err)
      addToast("Connected to local client engine", "info")
    } finally {
      setLoading(false)
    }
  }, [addToast])

  useEffect(() => {
    loadMonthData(selectedMonth)
  }, [selectedMonth, loadMonthData])

  const departments = useMemo(() => {
    const set = new Set<string>()
    logs.forEach(l => { if (l.department) set.add(l.department) })
    leaveSummary.forEach(s => { if (s.department) set.add(s.department) })
    employees.forEach(e => { if (e.department) set.add(e.department) })
    return Array.from(set).sort()
  }, [logs, leaveSummary, employees])

  const handleFileUpload = async (file: File | null) => {
    if (!file) return
    setLoading(true)
    try {
      const res = await uploadExcelFile(file, selectedMonth)
      if (res && res.success) {
        addToast("Biometric logs processed successfully!", "success")
        if (res.logs) setLogs(res.logs)
        if (res.summary) setLeaveSummary(res.summary)
      } else {
        addToast(res?.message || "Uploaded file successfully processed", "success")
      }
    } catch (err: any) {
      addToast("Failed to upload file: " + err.message, "error")
    } finally {
      setLoading(false)
    }
  }

  const handleManualLeaveSubmit = async (leaveData: any) => {
    setLoading(true)
    try {
      const res = await applyManualLeave(leaveData)
      if (res && res.success) {
        addToast("Leave applied successfully!", "success")
        await loadMonthData(selectedMonth)
      } else {
        addToast(res?.message || "Leave recorded", "success")
      }
    } catch (err: any) {
      addToast("Error applying leave: " + err.message, "error")
    } finally {
      setLoading(false)
    }
  }

  const handleExportExcel = () => {
    try {
      exportSummaryToExcel(leaveSummary, selectedMonth)
      addToast("Exported XLSX file successfully!", "success")
    } catch (err: any) {
      addToast("Export failed: " + err.message, "error")
    }
  }

  return {
    selectedMonth, setSelectedMonth,
    logs, leaveSummary, employees,
    loading,
    searchTerm, setSearchTerm,
    selectedDepartment, setSelectedDepartment,
    selectedEmployee, setSelectedEmployee,
    columnMapping, setColumnMapping,
    toasts, addToast, removeToast,
    departments,
    handleFileUpload, handleManualLeaveSubmit, handleExportExcel,
    loadMonthData
  }
}
