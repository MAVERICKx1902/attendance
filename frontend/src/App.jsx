import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import * as XLSX from 'xlsx'
import { 
  Upload, FileSpreadsheet, Sparkles, Building2, Calendar, Clock, 
  Settings2, Download, CheckCircle2, AlertCircle, Users, Timer,
  BarChart3, FileCheck, Wand2, Layers, Cpu, Smartphone, Monitor,
  Zap, Shield, Eye, Trash2, Plus, X
} from 'lucide-react'

// --- JS version of attendance processor (mirrors Python logic for web) ---
function processExcelInBrowser(workbook, config) {
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  const rawData = XLSX.utils.sheet_to_json(sheet, { defval: '' })
  
  if (!rawData.length) throw new Error("Empty sheet")

  // Detect columns
  const cols = Object.keys(rawData[0])
  const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
  const findCol = (aliases) => {
    for (let alias of aliases) {
      const na = norm(alias)
      for (let c of cols) {
        const nc = norm(c)
        if (nc.includes(na) || na.includes(nc)) return c
      }
    }
    return null
  }

  const empIdCol = findCol(['emp id','employee id','employee code','emp code','id','code','staff id']) || cols[0]
  const empNameCol = findCol(['emp name','employee name','name','staff name']) || empIdCol
  const dateCol = findCol(['date','punch date','attendance date'])
  const timeCol = findCol(['time','punch time','log time','in time'])
  const dateTimeCol = findCol(['datetime','date time','timestamp'])
  const deptCol = findCol(['department','dept','division'])

  // Parse
  let cleaned = []
  for (let row of rawData) {
    let emp_id = String(row[empIdCol] || '').trim()
    if (!emp_id || emp_id.toLowerCase() === 'nan') continue
    let emp_name = String(row[empNameCol] || emp_id).trim()
    let dept = deptCol ? String(row[deptCol] || 'General') : 'General'
    
    let dt = null
    if (dateTimeCol && row[dateTimeCol]) {
      dt = new Date(row[dateTimeCol])
    } else if (dateCol && timeCol && row[dateCol] && row[timeCol]) {
      // combine
      let d = new Date(row[dateCol])
      let t = String(row[timeCol])
      // parse time
      let tm = t.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/)
      if (tm && !isNaN(d)) {
        d.setHours(parseInt(tm[1]), parseInt(tm[2]), parseInt(tm[3]||0))
        dt = d
      } else {
        dt = new Date(row[dateCol] + ' ' + row[timeCol])
      }
    } else if (dateCol && row[dateCol]) {
      dt = new Date(row[dateCol])
    } else if (timeCol && row[timeCol]) {
      dt = new Date(row[timeCol])
    }
    if (!dt || isNaN(dt)) continue

    cleaned.push({
      emp_id,
      emp_name,
      department: dept,
      punch_datetime: dt,
      date: dt.toISOString().split('T')[0],
      time: dt.toTimeString().split(' ')[0]
    })
  }

  cleaned.sort((a,b) => a.emp_id.localeCompare(b.emp_id) || a.punch_datetime - b.punch_datetime)

  // Holidays set
  const holidaySet = new Set((config.holidays||[]).map(h => {
    try { return new Date(h).toISOString().split('T')[0] } catch { return h }
  }))
  const weekoff = config.weekoff || [0] // Sunday 0
  const lateThreshold = config.late_threshold || "10:00"
  const [lateH, lateM] = lateThreshold.split(':').map(Number)

  // Group by emp + date
  const grouped = {}
  cleaned.forEach(r => {
    const key = `${r.emp_id}__${r.date}`
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(r)
  })

  let daily = []
  Object.entries(grouped).forEach(([key, punches]) => {
    punches.sort((a,b) => a.punch_datetime - b.punch_datetime)
    const first = punches[0]
    const last = punches[punches.length-1]
    const dateObj = new Date(first.date)
    const hours = punches.length > 1 ? (last.punch_datetime - first.punch_datetime)/1000/3600 : 0
    const isHoliday = holidaySet.has(first.date)
    const isWeekoff = weekoff.includes(dateObj.getDay())
    let status = 'A'
    if (isHoliday) status = 'H'
    else if (isWeekoff) status = 'WO'
    else {
      if (hours >= (config.full_day_hours||8)) status = 'P'
      else if (hours >= (config.working_hours||4)) status = 'HD'
      else if (punches.length >=1) status = 'P'
    }
    const firstHour = first.punch_datetime.getHours() + first.punch_datetime.getMinutes()/60
    const lateLimit = lateH + lateM/60
    const isLate = firstHour > lateLimit && !isHoliday && !isWeekoff

    daily.push({
      emp_id: first.emp_id,
      emp_name: first.emp_name,
      department: first.department,
      date: first.date,
      day: dateObj.toLocaleDateString('en-US',{weekday:'short'}),
      first_punch: first.time,
      last_punch: last.time,
      punch_count: punches.length,
      hours: Math.round(hours*100)/100,
      status,
      late: isLate ? 'Yes' : 'No',
      is_holiday: isHoliday,
      is_weekoff: isWeekoff
    })
  })

  // Matrix
  const allDatesSet = new Set(daily.map(d => d.date))
  // if month filter, generate full month
  let allDates = Array.from(allDatesSet).sort()
  if (config.month) {
    const m = new Date(config.month)
    const y = m.getFullYear(), mo = m.getMonth()
    const daysInMonth = new Date(y, mo+1, 0).getDate()
    allDates = []
    for (let d=1; d<=daysInMonth; d++) {
      const dt = new Date(y, mo, d)
      allDates.push(dt.toISOString().split('T')[0])
    }
  }

  const employees = [...new Map(daily.map(d => [d.emp_id, {emp_id:d.emp_id, emp_name:d.emp_name, department:d.department}])).values()]

  let matrix = []
  let summary = []

  employees.forEach(emp => {
    let empDaily = daily.filter(d => d.emp_id === emp.emp_id)
    let empMap = Object.fromEntries(empDaily.map(d => [d.date, d]))
    let row = { emp_id: emp.emp_id, emp_name: emp.emp_name, department: emp.department }
    let present=0, absent=0, half=0, hol=0, wo=0, late=0, totalH=0
    allDates.forEach(dateStr => {
      const rec = empMap[dateStr]
      if (rec) {
        row[dateStr] = rec.status
        if (rec.status==='P') present++
        else if (rec.status==='A') absent++
        else if (rec.status==='HD') half++
        else if (rec.status==='H') hol++
        else if (rec.status==='WO') wo++
        if (rec.late==='Yes') late++
        totalH+= rec.hours
      } else {
        const dObj = new Date(dateStr)
        const isH = holidaySet.has(dateStr)
        const isW = weekoff.includes(dObj.getDay())
        if (isH) { row[dateStr]='H'; hol++ }
        else if (isW) { row[dateStr]='WO'; wo++ }
        else { row[dateStr]='A'; absent++ }
      }
    })
    matrix.push(row)
    summary.push({
      emp_id: emp.emp_id,
      emp_name: emp.emp_name,
      department: emp.department,
      'Total Days': allDates.length,
      'Present (P)': present,
      'Absent (A)': absent,
      'Half Day (HD)': half,
      'Holidays (H)': hol,
      'Week Off (WO)': wo,
      'Late Marks': late,
      'Total Hours': Math.round(totalH*100)/100,
      'Avg Hours/Day': Math.round(totalH/Math.max(present+half,1)*100)/100,
      'Attendance %': Math.round((present+half*0.5)/Math.max(allDates.length-hol-wo,1)*10000)/100
    })
  })

  return { cleaned, daily, matrix, summary, allDates, employees }
}

function exportToExcel(data, config, fileName) {
  const wb = XLSX.utils.book_new()
  
  // Config sheet
  const configSheet = [
    { Parameter: 'Company Name', Value: config.company_name },
    { Parameter: 'Month', Value: config.month || 'Auto' },
    { Parameter: 'Working Hours Threshold', Value: config.working_hours },
    { Parameter: 'Full Day Hours', Value: config.full_day_hours },
    { Parameter: 'Late Threshold', Value: config.late_threshold },
    { Parameter: 'WeekOff', Value: JSON.stringify(config.weekoff) },
    { Parameter: 'Holidays', Value: (config.holidays||[]).join(', ') },
    { Parameter: 'Generated On', Value: new Date().toLocaleString() },
    { Parameter: 'Total Employees', Value: data.employees.length },
    { Parameter: 'Date Range', Value: `${data.allDates[0]} to ${data.allDates[data.allDates.length-1]}` },
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(configSheet), "Config")

  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.summary), "Monthly Summary")
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.daily), "Daily Logs")
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.matrix), "Attendance Matrix")
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.cleaned), "Cleaned Raw")

  XLSX.writeFile(wb, fileName)
}

export default function App() {
  const [file, setFile] = useState(null)
  const [workbook, setWorkbook] = useState(null)
  const [rawPreview, setRawPreview] = useState([])
  const [processed, setProcessed] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef(null)

  // Config state - Liquid Glass controls
  const [config, setConfig] = useState({
    company_name: "Autocrat Solutions",
    month: new Date().toISOString().slice(0,7),
    working_hours: 4.0,
    full_day_hours: 8.0,
    late_threshold: "10:00",
    holidays: [],
    weekoff: [0], // Sunday
    newHoliday: ""
  })

  const [showSettings, setShowSettings] = useState(false)
  const [toast, setToast] = useState(null)

  const showToast = (msg, type='success') => {
    setToast({msg, type})
    setTimeout(()=>setToast(null), 3000)
  }

  const handleFile = async (f) => {
    if (!f) return
    setFile(f)
    try {
      const buf = await f.arrayBuffer()
      const wb = XLSX.read(buf)
      setWorkbook(wb)
      const sheet = wb.Sheets[wb.SheetNames[0]]
      const json = XLSX.utils.sheet_to_json(sheet, { defval: '' })
      setRawPreview(json.slice(0, 20))
      setProcessed(null)
      showToast(`Loaded ${json.length} rows from ${f.name}`)
    } catch (e) {
      showToast("Failed to read Excel: "+e.message, 'error')
    }
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragActive(false)
    const f = e.dataTransfer.files?.[0]
    if (f) handleFile(f)
  }

  const processNow = async () => {
    if (!workbook) {
      showToast("Upload an Excel file first", 'error')
      return
    }
    setIsProcessing(true)
    try {
      // Simulate processing delay for liquid glass effect
      await new Promise(r => setTimeout(r, 800))
      const result = processExcelInBrowser(workbook, config)
      setProcessed(result)
      showToast(`Processed ${result.employees.length} employees, ${result.daily.length} records`)

      // If running inside pywebview, also try Python backend
      if (window.pywebview && window.pywebview.api) {
        try {
          // For desktop, we would use Python processing with file paths
          // This is placeholder - web version already processed
        } catch {}
      }
    } catch (e) {
      showToast("Processing failed: "+e.message, 'error')
    } finally {
      setIsProcessing(false)
    }
  }

  const downloadResult = () => {
    if (!processed) return
    const fileName = `${config.company_name.replace(/\s+/g,'_')}_Attendance_${config.month || 'Full'}.xlsx`
    exportToExcel(processed, config, fileName)
    showToast(`Downloaded ${fileName}`)
  }

  const addHoliday = () => {
    if (!config.newHoliday) return
    setConfig(prev => ({
      ...prev,
      holidays: [...prev.holidays, prev.newHoliday],
      newHoliday: ""
    }))
  }

  const removeHoliday = (idx) => {
    setConfig(prev => ({
      ...prev,
      holidays: prev.holidays.filter((_,i)=>i!==idx)
    }))
  }

  const toggleWeekoff = (dayIdx) => {
    setConfig(prev => ({
      ...prev,
      weekoff: prev.weekoff.includes(dayIdx) 
        ? prev.weekoff.filter(d=>d!==dayIdx)
        : [...prev.weekoff, dayIdx]
    }))
  }

  return (
    <div className="min-h-screen text-white relative selection:bg-violet-500/30">
      {/* Mesh Gradient Background */}
      <div className="mesh-bg">
        <div className="mesh-blob blob-1"></div>
        <div className="mesh-blob blob-2"></div>
        <div className="mesh-blob blob-3"></div>
        <div className="mesh-blob blob-4"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.08),transparent_60%)]"></div>
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,_transparent,_rgba(0,0,0,0.6))]"></div>
      </div>

      {/* Header - Liquid Glass */}
      <motion.header 
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 z-40 px-6 py-4"
      >
        <div className="max-w-[1600px] mx-auto glass-strong rounded-[20px] px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-semibold tracking-tight text-[15px]">AUTOCRAT ATTENDANCE</h1>
              <p className="text-[11px] text-white/50 -mt-1 tracking-widest">LIQUID GLASS • v1.0</p>
            </div>
            <div className="hidden md:flex items-center gap-2 ml-6">
              <span className="glass-subtle px-3 py-1 rounded-full text-[11px] flex items-center gap-1.5">
                <Monitor className="w-3 h-3" /> Windows
              </span>
              <span className="glass-subtle px-3 py-1 rounded-full text-[11px] flex items-center gap-1.5">
                <Smartphone className="w-3 h-3" /> APK Ready
              </span>
              <span className="glass-subtle px-3 py-1 rounded-full text-[11px] flex items-center gap-1.5">
                <Cpu className="w-3 h-3" /> Python Core
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={()=>setShowSettings(!showSettings)}
              className="glass-button px-4 py-2 rounded-full text-[13px] font-medium flex items-center gap-2"
            >
              <Settings2 className="w-4 h-4" />
              <span className="hidden sm:inline">Configure</span>
            </button>
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-[12px] font-medium">
              AS
            </div>
          </div>
        </div>
      </motion.header>

      <main className="max-w-[1600px] mx-auto px-6 py-6 grid grid-cols-12 gap-6">
        
        {/* Left Column - Upload & Config */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          
          {/* Upload Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass rounded-[24px] p-6"
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold flex items-center gap-2">
                <Upload className="w-4 h-4 text-violet-400" /> Input Excel
              </h2>
              <span className="text-[11px] text-white/40 font-mono">.XLSX / .XLS</span>
            </div>

            <div
              onDragOver={(e)=>{e.preventDefault(); setDragActive(true)}}
              onDragLeave={()=>setDragActive(false)}
              onDrop={onDrop}
              onClick={()=>fileInputRef.current?.click()}
              className={`group relative rounded-[16px] border border-dashed transition-all cursor-pointer overflow-hidden
                ${dragActive ? 'border-violet-400 bg-violet-500/10' : 'border-white/15 hover:border-white/30 bg-white/[0.02] hover:bg-white/[0.05]'}`}
            >
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={e=>handleFile(e.target.files[0])} />
              
              <div className="p-8 text-center">
                <div className="w-14 h-14 mx-auto rounded-2xl glass flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <FileSpreadsheet className="w-7 h-7 text-white/80" />
                </div>
                <p className="font-medium text-[14px]">Drop attendance sheet here</p>
                <p className="text-[12px] text-white/50 mt-1">or click to browse • Biometric dump, manual logs</p>
                
                {file && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mt-4 glass-subtle rounded-full px-3 py-1.5 inline-flex items-center gap-2 text-[12px]"
                  >
                    <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
                    {file.name} • {(file.size/1024).toFixed(1)} KB
                  </motion.div>
                )}
              </div>

              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-transparent"></div>
              </div>
            </div>

            {/* Quick Stats */}
            {rawPreview.length > 0 && (
              <div className="mt-5 grid grid-cols-3 gap-2">
                <div className="glass-subtle rounded-xl p-3">
                  <p className="text-[11px] text-white/50">Rows</p>
                  <p className="font-semibold text-[14px]">{rawPreview.length}+</p>
                </div>
                <div className="glass-subtle rounded-xl p-3">
                  <p className="text-[11px] text-white/50">Columns</p>
                  <p className="font-semibold text-[14px]">{Object.keys(rawPreview[0]||{}).length}</p>
                </div>
                <div className="glass-subtle rounded-xl p-3">
                  <p className="text-[11px] text-white/50">Status</p>
                  <p className="font-semibold text-[14px] text-emerald-400">Ready</p>
                </div>
              </div>
            )}

            {/* Company Input */}
            <div className="mt-6 space-y-4">
              <div>
                <label className="text-[11px] uppercase tracking-widest text-white/50 mb-2 block">Company / Organization</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <input 
                    value={config.company_name}
                    onChange={e=>setConfig({...config, company_name: e.target.value})}
                    className="w-full glass-subtle rounded-xl pl-10 pr-4 py-3 text-[13px] bg-transparent outline-none focus:border-violet-400/50 placeholder:text-white/30"
                    placeholder="Autocrat Solutions"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] uppercase tracking-widest text-white/50 mb-2 block">Month</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <input 
                      type="month"
                      value={config.month}
                      onChange={e=>setConfig({...config, month: e.target.value})}
                      className="w-full glass-subtle rounded-xl pl-10 pr-3 py-3 text-[13px] bg-transparent outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] uppercase tracking-widest text-white/50 mb-2 block">Late After</label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <input 
                      type="time"
                      value={config.late_threshold}
                      onChange={e=>setConfig({...config, late_threshold: e.target.value})}
                      className="w-full glass-subtle rounded-xl pl-10 pr-3 py-3 text-[13px] bg-transparent outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Process Button */}
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={processNow}
              disabled={!workbook || isProcessing}
              className="mt-6 w-full relative overflow-hidden rounded-xl py-3.5 font-medium text-[14px] flex items-center justify-center gap-2
                bg-gradient-to-br from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500
                disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-violet-600/20"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none"></div>
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing Liquid Glass...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  Convert to HR Sheet
                  <Sparkles className="w-4 h-4" />
                </>
              )}
            </motion.button>

            <p className="text-[11px] text-white/30 text-center mt-3">
              Python core mirrors JS for offline Windows .exe & future APK via Antigravity
            </p>
          </motion.div>

          {/* Settings Panel - Glass */}
          <AnimatePresence>
            {showSettings && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.98 }}
                className="glass rounded-[24px] p-6"
              >
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-semibold flex items-center gap-2"><Settings2 className="w-4 h-4" /> Advanced Config</h3>
                  <button onClick={()=>setShowSettings(false)} className="w-7 h-7 rounded-full glass-subtle flex items-center justify-center hover:bg-white/10">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-white/50 block mb-1.5">Half-Day Threshold (hrs)</label>
                      <input type="number" step="0.5" value={config.working_hours} onChange={e=>setConfig({...config, working_hours: parseFloat(e.target.value)})}
                        className="w-full glass-subtle rounded-xl px-3 py-2.5 text-[13px] bg-transparent outline-none" />
                    </div>
                    <div>
                      <label className="text-[11px] text-white/50 block mb-1.5">Full-Day Hours</label>
                      <input type="number" step="0.5" value={config.full_day_hours} onChange={e=>setConfig({...config, full_day_hours: parseFloat(e.target.value)})}
                        className="w-full glass-subtle rounded-xl px-3 py-2.5 text-[13px] bg-transparent outline-none" />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] text-white/50 block mb-2">Week Off Days</label>
                    <div className="grid grid-cols-7 gap-1.5">
                      {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d,i)=>(
                        <button
                          key={i}
                          onClick={()=>toggleWeekoff(i)}
                          className={`py-2 rounded-xl text-[11px] font-medium transition-all
                            ${config.weekoff.includes(i) ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20' : 'glass-subtle text-white/60 hover:text-white'}`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] text-white/50 block mb-2">Holidays</label>
                    <div className="flex gap-2">
                      <input 
                        type="date"
                        value={config.newHoliday}
                        onChange={e=>setConfig({...config, newHoliday: e.target.value})}
                        className="flex-1 glass-subtle rounded-xl px-3 py-2.5 text-[13px] bg-transparent outline-none"
                      />
                      <button onClick={addHoliday} className="glass-button px-3 rounded-xl">
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    {config.holidays.length>0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {config.holidays.map((h,i)=>(
                          <span key={i} className="glass-subtle px-2.5 py-1 rounded-full text-[11px] flex items-center gap-1.5">
                            {h}
                            <button onClick={()=>removeHoliday(i)} className="hover:text-red-400"><X className="w-3 h-3" /></button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="glass-subtle rounded-xl p-3 flex gap-3">
                    <Shield className="w-4 h-4 text-violet-400 mt-0.5" />
                    <div>
                      <p className="text-[12px] font-medium">Python Mirror Logic</p>
                      <p className="text-[11px] text-white/50 leading-relaxed">attendance_processor.py uses identical logic. For Windows build: PyInstaller packs pywebview + this UI. For APK: use Capacitor/Antigravity to wrap /dist.</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Features */}
          <div className="glass rounded-[24px] p-5">
            <h3 className="text-[12px] uppercase tracking-widest text-white/50 mb-3">System</h3>
            <div className="space-y-2.5">
              {[
                { icon: Zap, title: "Auto column detection", desc: "Emp ID, Name, DateTime heuristics" },
                { icon: BarChart3, title: "4-sheet output", desc: "Matrix, Summary, Daily, Config" },
                { icon: FileCheck, title: "Styled Excel", desc: "P/HD/A color coded, HR-ready" },
              ].map((f,i)=>(
                <div key={i} className="flex gap-3">
                  <div className="w-8 h-8 rounded-xl glass-subtle flex items-center justify-center flex-shrink-0">
                    <f.icon className="w-4 h-4 text-white/70" />
                  </div>
                  <div>
                    <p className="text-[13px] font-medium">{f.title}</p>
                    <p className="text-[11px] text-white/50">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - Preview & Results */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          
          {/* Stats Overview */}
          {processed ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-12 gap-4"
            >
              <div className="col-span-6 md:col-span-3 glass rounded-[20px] p-4">
                <div className="flex items-center justify-between mb-2">
                  <Users className="w-4 h-4 text-violet-400" />
                  <span className="text-[10px] glass-subtle px-2 py-0.5 rounded-full">EMP</span>
                </div>
                <p className="text-2xl font-semibold tracking-tight">{processed.employees.length}</p>
                <p className="text-[11px] text-white/50">Total Employees</p>
              </div>
              <div className="col-span-6 md:col-span-3 glass rounded-[20px] p-4">
                <div className="flex items-center justify-between mb-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  <span className="text-[10px] glass-subtle px-2 py-0.5 rounded-full">LOGS</span>
                </div>
                <p className="text-2xl font-semibold tracking-tight">{processed.daily.length}</p>
                <p className="text-[11px] text-white/50">Daily Records</p>
              </div>
              <div className="col-span-6 md:col-span-3 glass rounded-[20px] p-4">
                <div className="flex items-center justify-between mb-2">
                  <Timer className="w-4 h-4 text-amber-400" />
                  <span className="text-[10px] glass-subtle px-2 py-0.5 rounded-full">HRS</span>
                </div>
                <p className="text-2xl font-semibold tracking-tight">{processed.daily.reduce((a,b)=>a+b.hours,0).toFixed(1)}</p>
                <p className="text-[11px] text-white/50">Total Hours</p>
              </div>
              <div className="col-span-6 md:col-span-3 glass rounded-[20px] p-4 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-600/20 to-transparent pointer-events-none"></div>
                <div className="flex items-center justify-between mb-2 relative">
                  <Download className="w-4 h-4 text-white" />
                  <span className="text-[10px] bg-white text-black px-2 py-0.5 rounded-full font-medium">READY</span>
                </div>
                <p className="text-[13px] font-semibold relative">Export Ready</p>
                <button onClick={downloadResult} className="mt-2 w-full bg-white text-black rounded-full py-2 text-[12px] font-medium hover:bg-white/90 transition">
                  Download .xlsx
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="glass rounded-[24px] p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center">
                <Eye className="w-6 h-6 text-white/60" />
              </div>
              <div>
                <p className="font-medium text-[14px]">Preview & Results</p>
                <p className="text-[12px] text-white/50">Upload an Excel file and hit Convert to see liquid glass transformed sheets here</p>
              </div>
            </div>
          )}

          {/* Data Tables - Glass */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="glass rounded-[24px] overflow-hidden"
          >
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl glass-subtle flex items-center justify-center">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-[14px]">
                    {processed ? `Attendance Matrix — ${config.company_name}` : `Raw Preview — ${file?.name || 'No file'}`}
                  </h3>
                  <p className="text-[11px] text-white/50">
                    {processed ? `${processed.matrix.length} employees × ${processed.allDates.length} days` : `${rawPreview.length} rows preview`}
                  </p>
                </div>
              </div>

              {processed && (
                <div className="flex items-center gap-2">
                  <span className="hidden md:flex items-center gap-1.5 text-[11px]">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span> P
                    <span className="w-2 h-2 rounded-full bg-amber-400 ml-2"></span> HD
                    <span className="w-2 h-2 rounded-full bg-red-400 ml-2"></span> A
                    <span className="w-2 h-2 rounded-full bg-blue-400 ml-2"></span> H
                    <span className="w-2 h-2 rounded-full bg-white/30 ml-2"></span> WO
                  </span>
                  <button onClick={downloadResult} className="glass-button px-4 py-2 rounded-full text-[12px] flex items-center gap-2">
                    <Download className="w-3.5 h-3.5" /> Export
                  </button>
                </div>
              )}
            </div>

            <div className="overflow-auto max-h-[520px] scrollbar-thin">
              {!processed ? (
                <table className="w-full text-[12px]">
                  <thead className="sticky top-0 glass-strong z-10">
                    <tr>
                      {(rawPreview[0] ? Object.keys(rawPreview[0]) : ['Upload file to preview']).map((k)=>(
                        <th key={k} className="text-left px-4 py-3 font-medium text-white/70 whitespace-nowrap border-b border-white/10">{k}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rawPreview.map((row,i)=>(
                      <tr key={i} className="hover:bg-white/[0.03] border-b border-white/[0.04]">
                        {Object.values(row).map((v,j)=>(
                          <td key={j} className="px-4 py-2.5 whitespace-nowrap text-white/80 font-mono text-[11px]">{String(v).slice(0,80)}</td>
                        ))}
                      </tr>
                    ))}
                    {rawPreview.length===0 && (
                      <tr><td className="px-4 py-12 text-center text-white/40">No data — drop your biometric Excel above</td></tr>
                    )}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-[12px]">
                  <thead className="sticky top-0 glass-strong z-10">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-white/70 sticky left-0 glass-strong border-r border-white/10">Employee</th>
                      <th className="text-left px-3 py-3 font-medium text-white/70 whitespace-nowrap">ID</th>
                      {processed.allDates.map(d=>(
                        <th key={d} className="text-center px-2 py-3 font-medium text-white/60 whitespace-nowrap">
                          <div className="text-[11px]">{new Date(d).getDate()}</div>
                          <div className="text-[9px] opacity-60">{new Date(d).toLocaleDateString('en-US',{weekday:'short'})[0]}</div>
                        </th>
                      ))}
                      <th className="text-center px-3 py-3 font-medium text-white/70">P</th>
                      <th className="text-center px-3 py-3 font-medium text-white/70">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {processed.matrix.map((row,i)=>(
                      <tr key={i} className="hover:bg-white/[0.04] border-b border-white/[0.04]">
                        <td className="px-4 py-2.5 sticky left-0 glass-subtle border-r border-white/10 whitespace-nowrap">
                          <div className="font-medium text-[12px]">{row.emp_name}</div>
                          <div className="text-[10px] text-white/40">{row.department}</div>
                        </td>
                        <td className="px-3 py-2.5 font-mono text-[11px] text-white/60">{row.emp_id}</td>
                        {processed.allDates.map(d=>{
                          const val = row[d]
                          const color = val==='P' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' :
                                       val==='A' ? 'bg-red-500/20 text-red-300 border-red-500/30' :
                                       val==='HD' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
                                       val==='H' ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' :
                                       'bg-white/5 text-white/40 border-white/10'
                          return (
                            <td key={d} className="px-1 py-1 text-center">
                              <span className={`inline-flex w-7 h-7 items-center justify-center rounded-full text-[11px] font-bold border ${color}`}>
                                {val}
                              </span>
                            </td>
                          )
                        })}
                        <td className="px-3 py-2.5 text-center font-medium text-emerald-300">{processed.summary[i]['Present (P)']}</td>
                        <td className="px-3 py-2.5 text-center font-mono text-[11px]">{processed.summary[i]['Attendance %']}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {processed && (
              <div className="p-4 border-t border-white/10 glass-subtle flex items-center justify-between">
                <p className="text-[11px] text-white/50">
                  Styled Excel contains 4 sheets: <span className="text-white/80">Config, Monthly Summary, Daily Logs, Attendance Matrix, Cleaned Raw</span> • HR-ready with colors
                </p>
                <button onClick={()=>setProcessed(null)} className="text-[11px] text-white/40 hover:text-white flex items-center gap-1">
                  <Trash2 className="w-3 h-3" /> Clear
                </button>
              </div>
            )}
          </motion.div>

          {/* Summary Cards */}
          {processed && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass rounded-[24px] p-6"
            >
              <h3 className="font-semibold text-[14px] mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-violet-400" /> Monthly Summary
              </h3>
              <div className="overflow-auto">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="border-b border-white/10 text-white/50">
                      <th className="text-left py-2 px-3">Employee</th>
                      <th className="text-center py-2">P</th>
                      <th className="text-center py-2">A</th>
                      <th className="text-center py-2">HD</th>
                      <th className="text-center py-2">Late</th>
                      <th className="text-center py-2">Hours</th>
                      <th className="text-center py-2">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {processed.summary.map((s,i)=>(
                      <tr key={i} className="border-b border-white/[0.04] hover:bg-white/[0.03]">
                        <td className="py-2.5 px-3">
                          <span className="font-medium">{s.emp_name}</span>
                          <span className="text-white/40 ml-2 font-mono text-[11px]">{s.emp_id}</span>
                        </td>
                        <td className="text-center py-2.5"><span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full text-[11px]">{s['Present (P)']}</span></td>
                        <td className="text-center py-2.5"><span className="bg-red-500/20 text-red-300 px-2 py-0.5 rounded-full text-[11px]">{s['Absent (A)']}</span></td>
                        <td className="text-center py-2.5"><span className="bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full text-[11px]">{s['Half Day (HD)']}</span></td>
                        <td className="text-center py-2.5 text-amber-300">{s['Late Marks']}</td>
                        <td className="text-center py-2.5 font-mono">{s['Total Hours']}</td>
                        <td className="text-center py-2.5">
                          <span className={`px-2 py-0.5 rounded-full text-[11px] ${s['Attendance %']>=80 ? 'bg-emerald-500/20 text-emerald-300' : s['Attendance %']>=60 ? 'bg-amber-500/20 text-amber-300' : 'bg-red-500/20 text-red-300'}`}>
                            {s['Attendance %']}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* Build Instructions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="glass rounded-[20px] p-5">
              <h4 className="font-medium text-[13px] flex items-center gap-2 mb-3">
                <Monitor className="w-4 h-4 text-violet-400" /> Build Windows .exe
              </h4>
              <div className="glass-subtle rounded-xl p-3 font-mono text-[11px] text-white/60 leading-relaxed">
                <div>pip install -r requirements.txt</div>
                <div>npm run build --prefix frontend</div>
                <div>pip install pyinstaller</div>
                <div>pyinstaller --noconfirm --windowed --add-data "frontend/dist:frontend/dist" app.py --name "AutocratAttendance"</div>
              </div>
              <p className="text-[11px] text-white/40 mt-2">Outputs single .exe with liquid glass UI + Python processor.</p>
            </div>
            <div className="glass rounded-[20px] p-5">
              <h4 className="font-medium text-[13px] flex items-center gap-2 mb-3">
                <Smartphone className="w-4 h-4 text-emerald-400" /> Build APK via Antigravity
              </h4>
              <div className="glass-subtle rounded-xl p-3 font-mono text-[11px] text-white/60 leading-relaxed">
                <div>npm run build --prefix frontend</div>
                <div>npx cap init AutocratAttendance com.autocrat.attendance</div>
                <div>npx cap add android</div>
                <div>npx cap copy android && npx cap open android</div>
              </div>
              <p className="text-[11px] text-white/40 mt-2">Same React dist works as PWA/APK. Use Capacitor or Antigravity wrapper.</p>
            </div>
          </div>

        </div>
      </main>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 glass-strong rounded-full px-5 py-3 flex items-center gap-3 shadow-2xl"
          >
            {toast.type==='error' ? <AlertCircle className="w-4 h-4 text-red-400" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            <span className="text-[13px] font-medium">{toast.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="max-w-[1600px] mx-auto px-6 py-8 text-center">
        <div className="glass-subtle rounded-full inline-flex items-center gap-2 px-4 py-2 text-[11px] text-white/40">
          <span>© {new Date().getFullYear()} Autocrat Solutions</span>
          <span className="w-1 h-1 rounded-full bg-white/20"></span>
          <span className="flex items-center gap-1"><Sparkles className="w-3 h-3" /> Liquid Glass Edition</span>
          <span className="w-1 h-1 rounded-full bg-white/20"></span>
          <span>Python • React • PyWebView • Capacitor</span>
        </div>
      </footer>
    </div>
  )
}
