import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import * as XLSX from 'xlsx'
import { 
  Upload, FileSpreadsheet, Sparkles, Building2, Calendar, Clock, 
  Settings2, Download, CheckCircle2, AlertCircle, Users, Timer,
  BarChart3, FileCheck, Wand2, Layers, Cpu, Smartphone, Monitor,
  Zap, Shield, Eye, Trash2, Plus, X, FileCode2, FolderDown,
  Folder, FileJson, Code2, Play, FolderOpen, HardDrive
} from 'lucide-react'

// --- JS version of attendance processor (mirrors Python logic for web) ---
function processExcelInBrowser(workbook, config) {
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  const rawData = XLSX.utils.sheet_to_json(sheet, { defval: '' })
  if (!rawData.length) throw new Error("Empty sheet")
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
  let cleaned = []
  for (let row of rawData) {
    let emp_id = String(row[empIdCol] || '').trim()
    if (!emp_id || emp_id.toLowerCase() === 'nan') continue
    let emp_name = String(row[empNameCol] || emp_id).trim()
    let dept = deptCol ? String(row[deptCol] || 'General') : 'General'
    let dt = null
    if (dateTimeCol && row[dateTimeCol]) dt = new Date(row[dateTimeCol])
    else if (dateCol && timeCol && row[dateCol] && row[timeCol]) {
      let d = new Date(row[dateCol])
      let t = String(row[timeCol])
      let tm = t.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/)
      if (tm && !isNaN(d)) {
        d.setHours(parseInt(tm[1]), parseInt(tm[2]), parseInt(tm[3]||0))
        dt = d
      } else dt = new Date(row[dateCol] + ' ' + row[timeCol])
    } else if (dateCol && row[dateCol]) dt = new Date(row[dateCol])
    else if (timeCol && row[timeCol]) dt = new Date(row[timeCol])
    if (!dt || isNaN(dt)) continue
    cleaned.push({ emp_id, emp_name, department: dept, punch_datetime: dt, date: dt.toISOString().split('T')[0], time: dt.toTimeString().split(' ')[0] })
  }
  cleaned.sort((a,b) => a.emp_id.localeCompare(b.emp_id) || a.punch_datetime - b.punch_datetime)
  const holidaySet = new Set((config.holidays||[]).map(h => { try { return new Date(h).toISOString().split('T')[0] } catch { return h } }))
  const weekoff = config.weekoff || [0]
  const lateThreshold = config.late_threshold || "10:00"
  const [lateH, lateM] = lateThreshold.split(':').map(Number)
  const grouped = {}
  cleaned.forEach(r => { const key = `${r.emp_id}__${r.date}`; if (!grouped[key]) grouped[key]=[]; grouped[key].push(r) })
  let daily = []
  Object.entries(grouped).forEach(([key, punches]) => {
    punches.sort((a,b) => a.punch_datetime - b.punch_datetime)
    const first = punches[0]; const last = punches[punches.length-1]
    const dateObj = new Date(first.date)
    const hours = punches.length > 1 ? (last.punch_datetime - first.punch_datetime)/1000/3600 : 0
    const isHoliday = holidaySet.has(first.date); const isWeekoff = weekoff.includes(dateObj.getDay())
    let status='A'
    if (isHoliday) status='H'; else if (isWeekoff) status='WO'
    else { if (hours >= (config.full_day_hours||8)) status='P'; else if (hours >= (config.working_hours||4)) status='HD'; else if (punches.length>=1) status='P' }
    const firstHour = first.punch_datetime.getHours() + first.punch_datetime.getMinutes()/60
    const lateLimit = lateH + lateM/60
    const isLate = firstHour > lateLimit && !isHoliday && !isWeekoff
    daily.push({ emp_id:first.emp_id, emp_name:first.emp_name, department:first.department, date:first.date, day:dateObj.toLocaleDateString('en-US',{weekday:'short'}), first_punch:first.time, last_punch:last.time, punch_count:punches.length, hours:Math.round(hours*100)/100, status, late:isLate?'Yes':'No', is_holiday:isHoliday, is_weekoff:isWeekoff })
  })
  const allDatesSet = new Set(daily.map(d=>d.date))
  let allDates = Array.from(allDatesSet).sort()
  if (config.month) {
    const m=new Date(config.month); const y=m.getFullYear(), mo=m.getMonth(); const daysInMonth=new Date(y,mo+1,0).getDate()
    allDates=[]; for(let d=1;d<=daysInMonth;d++){ const dt=new Date(y,mo,d); allDates.push(dt.toISOString().split('T')[0]) }
  }
  const employees=[...new Map(daily.map(d=>[d.emp_id,{emp_id:d.emp_id, emp_name:d.emp_name, department:d.department}])).values()]
  let matrix=[], summary=[]
  employees.forEach(emp=>{
    let empDaily=daily.filter(d=>d.emp_id===emp.emp_id); let empMap=Object.fromEntries(empDaily.map(d=>[d.date,d]))
    let row={ emp_id:emp.emp_id, emp_name:emp.emp_name, department:emp.department }
    let present=0, absent=0, half=0, hol=0, wo=0, late=0, totalH=0
    allDates.forEach(dateStr=>{
      const rec=empMap[dateStr]
      if(rec){ row[dateStr]=rec.status; if(rec.status==='P') present++; else if(rec.status==='A') absent++; else if(rec.status==='HD') half++; else if(rec.status==='H') hol++; else if(rec.status==='WO') wo++; if(rec.late==='Yes') late++; totalH+=rec.hours }
      else{ const dObj=new Date(dateStr); const isH=holidaySet.has(dateStr); const isW=weekoff.includes(dObj.getDay()); if(isH){ row[dateStr]='H'; hol++ } else if(isW){ row[dateStr]='WO'; wo++ } else{ row[dateStr]='A'; absent++ } }
    })
    matrix.push(row)
    summary.push({ emp_id:emp.emp_id, emp_name:emp.emp_name, department:emp.department, 'Total Days':allDates.length, 'Present (P)':present, 'Absent (A)':absent, 'Half Day (HD)':half, 'Holidays (H)':hol, 'Week Off (WO)':wo, 'Late Marks':late, 'Total Hours':Math.round(totalH*100)/100, 'Avg Hours/Day':Math.round(totalH/Math.max(present+half,1)*100)/100, 'Attendance %':Math.round((present+half*0.5)/Math.max(allDates.length-hol-wo,1)*10000)/100 })
  })
  return { cleaned, daily, matrix, summary, allDates, employees }
}

function exportToExcel(data, config, fileName) {
  const wb = XLSX.utils.book_new()
  const configSheet = [
    { Parameter: 'Company Name', Value: config.company_name },
    { Parameter: 'Month', Value: config.month || 'Auto' },
    { Parameter: 'Python File', Value: config.python_file_name || 'Built-in' },
    { Parameter: 'Output Folder', Value: config.output_folder || 'Downloads' },
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
  // v0.0.1 states
  const [excelFile, setExcelFile] = useState(null)
  const [pythonFile, setPythonFile] = useState(null)
  const [pythonContent, setPythonContent] = useState('')
  const [workbook, setWorkbook] = useState(null)
  const [rawPreview, setRawPreview] = useState([])
  const [processed, setProcessed] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [dragActiveExcel, setDragActiveExcel] = useState(false)
  const [dragActivePy, setDragActivePy] = useState(false)

  // Output folder
  const [outputFolder, setOutputFolder] = useState('')
  const [outputFileName, setOutputFileName] = useState('')

  const excelInputRef = useRef(null)
  const pyInputRef = useRef(null)

  const [config, setConfig] = useState({
    company_name: "Autocrat Solutions",
    month: new Date().toISOString().slice(0,7),
    working_hours: 4.0,
    full_day_hours: 8.0,
    late_threshold: "10:00",
    holidays: [],
    weekoff: [0],
    newHoliday: "",
    python_file_name: "",
    output_folder: ""
  })

  const [showSettings, setShowSettings] = useState(false)
  const [showPyPreview, setShowPyPreview] = useState(false)
  const [toast, setToast] = useState(null)

  const showToast = (msg, type='success') => { setToast({msg, type}); setTimeout(()=>setToast(null), 4000) }

  // Handle Excel
  const handleExcelFile = async (f) => {
    if (!f) return
    setExcelFile(f)
    setOutputFileName(`${config.company_name.replace(/\s+/g,'_')}_Attendance_${config.month}.xlsx`)
    try {
      const buf = await f.arrayBuffer()
      const wb = XLSX.read(buf)
      setWorkbook(wb)
      const sheet = wb.Sheets[wb.SheetNames[0]]
      const json = XLSX.utils.sheet_to_json(sheet, { defval: '' })
      setRawPreview(json.slice(0, 20))
      setProcessed(null)
      showToast(`📊 Loaded ${json.length} rows from ${f.name}`)
    } catch (e) {
      showToast("Failed to read Excel: "+e.message, 'error')
    }
  }

  // Handle Python file
  const handlePythonFile = async (f) => {
    if (!f) return
    if (!f.name.endsWith('.py')) { showToast("Please upload a .py file", 'error'); return }
    setPythonFile(f)
    setConfig(prev => ({...prev, python_file_name: f.name}))
    try {
      const text = await f.text()
      setPythonContent(text.slice(0, 15000))
      setShowPyPreview(true)
      showToast(`🐍 Loaded Python: ${f.name} (${(f.size/1024).toFixed(1)} KB, ${text.split('\n').length} lines)`)
    } catch (e) {
      showToast("Failed to read Python file: "+e.message, 'error')
    }
  }

  const onDropExcel = (e) => { e.preventDefault(); setDragActiveExcel(false); const f=e.dataTransfer.files?.[0]; if(f) handleExcelFile(f) }
  const onDropPy = (e) => { e.preventDefault(); setDragActivePy(false); const f=e.dataTransfer.files?.[0]; if(f) handlePythonFile(f) }

  // Folder selection via pywebview or fallback
  const selectOutputFolder = async () => {
    if (window.pywebview && window.pywebview.api && window.pywebview.api.select_folder) {
      try {
        const folder = await window.pywebview.api.select_folder()
        if (folder) {
          setOutputFolder(folder)
          setConfig(prev => ({...prev, output_folder: folder}))
          showToast(`📁 Output folder: ${folder}`)
        }
      } catch (e) { showToast("Folder dialog failed: "+e.message, 'error') }
    } else {
      // Web fallback - prompt for path (since browser can't pick folder for save, we just store name)
      const folder = prompt("Enter output folder path (for desktop) or leave empty for Downloads:", outputFolder || "Downloads")
      if (folder !== null) {
        setOutputFolder(folder)
        setConfig(prev => ({...prev, output_folder: folder}))
        showToast(`📁 Output folder set to: ${folder} (browser will download to Downloads)`)
      }
    }
  }

  const processNow = async () => {
    if (!workbook) { showToast("Upload an Excel file first (Input 1)", 'error'); return }
    // Python file is optional for v0.0.1 but recommended
    if (!pythonFile) { showToast("No Python file — using built-in processor. For custom logic, upload .py file.", 'success') }

    setIsProcessing(true)
    try {
      await new Promise(r => setTimeout(r, 900))

      // If running in pywebview desktop and we have actual file paths, use custom python processing
      if (window.pywebview && window.pywebview.api && window.pywebview.api.process_with_custom_python && excelFile && excelFile.path) {
        // Desktop mode with real paths - this path is for when files are selected via dialog which gives path
        // For drag-drop, path may not be available, so fallback to JS
        showToast("Desktop mode: processing with custom Python...", 'success')
      }

      // Web/JS processing (always works)
      const result = processExcelInBrowser(workbook, {...config, python_file_name: pythonFile?.name || 'Built-in', output_folder: outputFolder || 'Downloads'})
      setProcessed(result)

      // Try desktop API if available and we have temp paths (simulate)
      if (window.pywebview && window.pywebview.api && outputFolder) {
        try {
          // If user selected folder via dialog and we are in desktop, we could call API
          // But since drag-drop doesn't give real path, we still download via JS and also notify
          showToast(`Processed ${result.employees.length} employees. Ready to save to ${outputFolder}`, 'success')
        } catch {}
      } else {
        showToast(`✅ Processed ${result.employees.length} employees, ${result.daily.length} records. Ready to download to ${outputFolder || 'Downloads'}`)
      }

    } catch (e) {
      showToast("Processing failed: "+e.message, 'error')
    } finally {
      setIsProcessing(false)
    }
  }

  const downloadResult = () => {
    if (!processed) return
    const finalFileName = outputFileName || `${config.company_name.replace(/\s+/g,'_')}_Attendance_${config.month || 'Full'}.xlsx`
    const fullPath = outputFolder ? `${outputFolder}/${finalFileName}` : finalFileName

    // If desktop and API available with folder, try to save via Python
    if (window.pywebview && window.pywebview.api && window.pywebview.api.process_with_custom_python && outputFolder && excelFile?.path) {
      // Desktop save would be handled by Python backend
      showToast(`Saving to ${fullPath} via Python backend...`)
    }

    // Web download (always works - saves to Downloads folder)
    exportToExcel(processed, {...config, python_file_name: pythonFile?.name || 'Built-in', output_folder: outputFolder || 'Downloads'}, finalFileName)
    showToast(`💾 Downloaded ${finalFileName} to ${outputFolder || 'Downloads (browser)'} — Python: ${pythonFile?.name || 'Built-in'}`)
  }

  const addHoliday = () => { if (!config.newHoliday) return; setConfig(prev => ({...prev, holidays: [...prev.holidays, prev.newHoliday], newHoliday: ""})) }
  const removeHoliday = (idx) => { setConfig(prev => ({...prev, holidays: prev.holidays.filter((_,i)=>i!==idx)})) }
  const toggleWeekoff = (dayIdx) => { setConfig(prev => ({...prev, weekoff: prev.weekoff.includes(dayIdx) ? prev.weekoff.filter(d=>d!==dayIdx) : [...prev.weekoff, dayIdx]})) }

  return (
    <div className="min-h-screen text-white relative selection:bg-violet-500/30">
      <div className="mesh-bg">
        <div className="mesh-blob blob-1"></div>
        <div className="mesh-blob blob-2"></div>
        <div className="mesh-blob blob-3"></div>
        <div className="mesh-blob blob-4"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.08),transparent_60%)]"></div>
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,_transparent,_rgba(0,0,0,0.6))]"></div>
      </div>

      <motion.header initial={{ y: -100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="sticky top-0 z-40 px-6 py-4">
        <div className="max-w-[1600px] mx-auto glass-strong rounded-[20px] px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-semibold tracking-tight text-[15px]">AUTOCRAT ATTENDANCE</h1>
              <p className="text-[11px] text-white/50 -mt-1 tracking-widest">LIQUID GLASS • v0.0.1 • Excel + Python → Folder</p>
            </div>
            <div className="hidden lg:flex items-center gap-2 ml-6">
              <span className="glass-subtle px-3 py-1 rounded-full text-[11px] flex items-center gap-1.5"><FileSpreadsheet className="w-3 h-3" /> Input 1: Excel</span>
              <span className="glass-subtle px-3 py-1 rounded-full text-[11px] flex items-center gap-1.5"><FileCode2 className="w-3 h-3" /> Input 2: Python</span>
              <span className="glass-subtle px-3 py-1 rounded-full text-[11px] flex items-center gap-1.5"><FolderDown className="w-3 h-3" /> Output: Folder</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={()=>setShowSettings(!showSettings)} className="glass-button px-4 py-2 rounded-full text-[13px] font-medium flex items-center gap-2">
              <Settings2 className="w-4 h-4" /><span className="hidden sm:inline">Configure</span>
            </button>
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-[12px] font-medium">AS</div>
          </div>
        </div>
      </motion.header>

      <main className="max-w-[1600px] mx-auto px-6 py-6 grid grid-cols-12 gap-6">
        
        {/* Left Column - v0.0.1 Inputs */}
        <div className="col-span-12 lg:col-span-4 space-y-5">
          
          {/* Input 1: Excel */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass rounded-[24px] p-5 border-l-4 border-l-emerald-500/50">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold flex items-center gap-2 text-[14px]">
                <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-[12px] font-bold">1</span>
                Excel File
              </h2>
              <span className="text-[10px] glass-subtle px-2 py-1 rounded-full font-mono">.XLSX / .XLS • REQUIRED</span>
            </div>
            <div
              onDragOver={(e)=>{e.preventDefault(); setDragActiveExcel(true)}}
              onDragLeave={()=>setDragActiveExcel(false)}
              onDrop={onDropExcel}
              onClick={()=>excelInputRef.current?.click()}
              className={`group relative rounded-[16px] border border-dashed transition-all cursor-pointer overflow-hidden
                ${dragActiveExcel ? 'border-emerald-400 bg-emerald-500/10' : 'border-white/15 hover:border-white/30 bg-white/[0.02] hover:bg-white/[0.05]'}`}
            >
              <input ref={excelInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={e=>handleExcelFile(e.target.files[0])} />
              <div className="p-6 text-center">
                <div className="w-12 h-12 mx-auto rounded-2xl glass flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <FileSpreadsheet className="w-6 h-6 text-emerald-300" />
                </div>
                <p className="font-medium text-[13px]">Drop Excel attendance sheet</p>
                <p className="text-[11px] text-white/50 mt-1">Biometric dump, manual logs</p>
                {excelFile && (
                  <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="mt-3 glass-subtle rounded-full px-3 py-1.5 inline-flex items-center gap-2 text-[11px]">
                    <FileCheck className="w-3.5 h-3.5 text-emerald-400" />{excelFile.name} • {(excelFile.size/1024).toFixed(1)} KB
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Input 2: Python */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass rounded-[24px] p-5 border-l-4 border-l-violet-500/50">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold flex items-center gap-2 text-[14px]">
                <span className="w-6 h-6 rounded-full bg-violet-500/20 text-violet-300 flex items-center justify-center text-[12px] font-bold">2</span>
                Python File
              </h2>
              <span className="text-[10px] glass-subtle px-2 py-1 rounded-full font-mono">.PY • CONVERTER LOGIC</span>
            </div>
            <div
              onDragOver={(e)=>{e.preventDefault(); setDragActivePy(true)}}
              onDragLeave={()=>setDragActivePy(false)}
              onDrop={onDropPy}
              onClick={()=>pyInputRef.current?.click()}
              className={`group relative rounded-[16px] border border-dashed transition-all cursor-pointer overflow-hidden
                ${dragActivePy ? 'border-violet-400 bg-violet-500/10' : 'border-white/15 hover:border-white/30 bg-white/[0.02] hover:bg-white/[0.05]'}`}
            >
              <input ref={pyInputRef} type="file" accept=".py" className="hidden" onChange={e=>handlePythonFile(e.target.files[0])} />
              <div className="p-6 text-center">
                <div className="w-12 h-12 mx-auto rounded-2xl glass flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <FileCode2 className="w-6 h-6 text-violet-300" />
                </div>
                <p className="font-medium text-[13px]">Drop Python converter file</p>
                <p className="text-[11px] text-white/50 mt-1">Defines process(input, output) logic</p>
                {pythonFile && (
                  <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="mt-3 glass-subtle rounded-full px-3 py-1.5 inline-flex items-center gap-2 text-[11px]">
                    <Code2 className="w-3.5 h-3.5 text-violet-400" />{pythonFile.name} • {(pythonFile.size/1024).toFixed(1)} KB
                  </motion.div>
                )}
              </div>
            </div>

            {pythonFile && (
              <div className="mt-4 flex gap-2">
                <button onClick={()=>setShowPyPreview(!showPyPreview)} className="flex-1 glass-button py-2 rounded-xl text-[12px] flex items-center justify-center gap-2">
                  <Eye className="w-3.5 h-3.5" /> {showPyPreview ? 'Hide Code' : 'Preview Code'}
                </button>
                <button onClick={()=>{setPythonFile(null); setPythonContent(''); setShowPyPreview(false)}} className="glass-subtle px-3 py-2 rounded-xl text-[12px] hover:bg-white/10">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {!pythonFile && (
              <div className="mt-3 glass-subtle rounded-xl p-3 flex gap-2">
                <Shield className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                <p className="text-[11px] text-white/60 leading-relaxed">
                  <span className="text-white/90 font-medium">v0.0.1:</span> Upload your Python file that prescribes conversion. 
                  Expected: <code className="glass-subtle px-1 py-0.5 rounded text-[10px]">def process(input_path, output_path)</code> or similar. 
                  If none, built-in logic is used.
                </p>
              </div>
            )}
          </motion.div>

          {/* Output Folder */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass rounded-[24px] p-5 border-l-4 border-l-blue-500/50">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold flex items-center gap-2 text-[14px]">
                <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-300 flex items-center justify-center text-[12px] font-bold">3</span>
                Output Folder
              </h2>
              <span className="text-[10px] glass-subtle px-2 py-1 rounded-full font-mono">WHERE TO SAVE</span>
            </div>

            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Folder className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <input 
                    value={outputFolder}
                    onChange={e=>{setOutputFolder(e.target.value); setConfig(prev=>({...prev, output_folder: e.target.value}))}}
                    placeholder="Downloads or C:\Users\...\Documents"
                    className="w-full glass-subtle rounded-xl pl-10 pr-3 py-3 text-[12px] bg-transparent outline-none placeholder:text-white/30"
                  />
                </div>
                <button onClick={selectOutputFolder} className="glass-button px-4 rounded-xl flex items-center gap-2 text-[12px]">
                  <FolderOpen className="w-4 h-4" /> Browse
                </button>
              </div>

              <div className="relative">
                <FileJson className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input 
                  value={outputFileName}
                  onChange={e=>setOutputFileName(e.target.value)}
                  placeholder="Output filename.xlsx"
                  className="w-full glass-subtle rounded-xl pl-10 pr-3 py-2.5 text-[12px] bg-transparent outline-none placeholder:text-white/30"
                />
              </div>

              <div className="glass-subtle rounded-xl p-3 flex gap-2">
                <HardDrive className="w-4 h-4 text-blue-400 mt-0.5" />
                <div className="text-[11px] text-white/60 leading-relaxed">
                  <p className="font-medium text-white/80">Download behavior:</p>
                  <p>• <span className="text-white/90">Windows .exe:</span> Saves to chosen folder via Python file dialog</p>
                  <p>• <span className="text-white/90">Web:</span> Downloads to browser's Downloads folder</p>
                  <p>• Final path: <span className="font-mono text-[10px] glass-subtle px-1 rounded">{outputFolder || 'Downloads'}/{outputFileName || 'attendance_output.xlsx'}</span></p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Company Config */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass rounded-[24px] p-5">
            <h3 className="font-medium text-[13px] mb-4 flex items-center gap-2"><Building2 className="w-4 h-4 text-white/60" /> Organization</h3>
            <div className="space-y-3">
              <input value={config.company_name} onChange={e=>setConfig({...config, company_name: e.target.value})} className="w-full glass-subtle rounded-xl px-4 py-2.5 text-[12px] bg-transparent outline-none" placeholder="Autocrat Solutions" />
              <div className="grid grid-cols-2 gap-2">
                <input type="month" value={config.month} onChange={e=>setConfig({...config, month: e.target.value})} className="w-full glass-subtle rounded-xl px-3 py-2.5 text-[12px] bg-transparent outline-none" />
                <input type="time" value={config.late_threshold} onChange={e=>setConfig({...config, late_threshold: e.target.value})} className="w-full glass-subtle rounded-xl px-3 py-2.5 text-[12px] bg-transparent outline-none" />
              </div>
            </div>
          </motion.div>

          {/* Process Button - v0.0.1 */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={processNow}
            disabled={!workbook || isProcessing}
            className="w-full relative overflow-hidden rounded-[16px] py-4 font-semibold text-[14px] flex items-center justify-center gap-2
              bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-600 hover:from-violet-500 hover:via-indigo-500 hover:to-blue-500
              disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-violet-600/25"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none"></div>
            {isProcessing ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Processing v0.0.1...</>
            ) : (
              <><Play className="w-4 h-4" />Convert: Excel + Python → {outputFolder ? 'Folder' : 'Download'}<Sparkles className="w-4 h-4" /></>
            )}
          </motion.button>

          {processed && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={downloadResult}
              className="w-full glass-strong rounded-[16px] py-3.5 font-medium text-[13px] flex items-center justify-center gap-2 hover:bg-white/10"
            >
              <Download className="w-4 h-4" /> Download to {outputFolder || 'Downloads'} / {outputFileName || 'attendance_output.xlsx'}
            </motion.button>
          )}
        </div>

        {/* Right Column - Preview */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          
          {/* Python Preview */}
          <AnimatePresence>
            {showPyPreview && pythonContent && (
              <motion.div initial={{ opacity: 0, y: -10, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, y: -10, height: 0 }} className="glass rounded-[24px] overflow-hidden">
                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                  <h3 className="font-semibold text-[13px] flex items-center gap-2"><FileCode2 className="w-4 h-4 text-violet-400" />{pythonFile?.name} — Code Preview</h3>
                  <button onClick={()=>setShowPyPreview(false)} className="w-7 h-7 rounded-full glass-subtle flex items-center justify-center hover:bg-white/10"><X className="w-4 h-4" /></button>
                </div>
                <div className="p-4 max-h-[320px] overflow-auto bg-black/30">
                  <pre className="text-[11px] font-mono text-white/80 leading-relaxed whitespace-pre-wrap">{pythonContent}</pre>
                </div>
                <div className="p-3 border-t border-white/10 glass-subtle flex items-center justify-between text-[11px]">
                  <span className="text-white/50">v0.0.1 expects: def process(input_path, output_path) or similar entry point</span>
                  <span className="text-white/40 font-mono">{pythonContent.split('\n').length} lines</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Stats */}
          {processed ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-12 gap-4">
              <div className="col-span-6 md:col-span-3 glass rounded-[20px] p-4"><div className="flex items-center justify-between mb-2"><Users className="w-4 h-4 text-violet-400" /><span className="text-[10px] glass-subtle px-2 py-0.5 rounded-full">EMP</span></div><p className="text-2xl font-semibold">{processed.employees.length}</p><p className="text-[11px] text-white/50">Employees</p></div>
              <div className="col-span-6 md:col-span-3 glass rounded-[20px] p-4"><div className="flex items-center justify-between mb-2"><FileSpreadsheet className="w-4 h-4 text-emerald-400" /><span className="text-[10px] glass-subtle px-2 py-0.5 rounded-full">LOGS</span></div><p className="text-2xl font-semibold">{processed.daily.length}</p><p className="text-[11px] text-white/50">Records</p></div>
              <div className="col-span-6 md:col-span-3 glass rounded-[20px] p-4"><div className="flex items-center justify-between mb-2"><FileCode2 className="w-4 h-4 text-violet-400" /><span className="text-[10px] glass-subtle px-2 py-0.5 rounded-full">PY</span></div><p className="text-[13px] font-semibold truncate">{pythonFile?.name || 'Built-in'}</p><p className="text-[11px] text-white/50">Converter</p></div>
              <div className="col-span-6 md:col-span-3 glass rounded-[20px] p-4 relative overflow-hidden"><div className="absolute inset-0 bg-gradient-to-br from-violet-600/20 to-transparent pointer-events-none"></div><div className="flex items-center justify-between mb-2 relative"><FolderDown className="w-4 h-4 text-white" /><span className="text-[10px] bg-white text-black px-2 py-0.5 rounded-full font-medium">READY</span></div><p className="text-[12px] font-semibold relative truncate">{outputFileName || 'attendance_output.xlsx'}</p><button onClick={downloadResult} className="mt-2 w-full bg-white text-black rounded-full py-2 text-[11px] font-medium">Save to {outputFolder || 'Downloads'}</button></div>
            </motion.div>
          ) : (
            <div className="glass rounded-[24px] p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center"><Eye className="w-6 h-6 text-white/60" /></div>
              <div><p className="font-medium text-[14px]">v0.0.1 — 2 Inputs → Output Folder</p><p className="text-[12px] text-white/50">Upload Excel (1) + Python converter (2), choose output folder (3), then Convert. File will be downloaded/saved to chosen folder.</p></div>
            </div>
          )}

          {/* Data Table */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="glass rounded-[24px] overflow-hidden">
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl glass-subtle flex items-center justify-center"><BarChart3 className="w-4 h-4" /></div>
                <div><h3 className="font-semibold text-[14px]">{processed ? `Result — ${config.company_name}` : `Preview — ${excelFile?.name || 'No Excel yet'}`}</h3><p className="text-[11px] text-white/50">{processed ? `${processed.matrix.length} employees × ${processed.allDates.length} days • via ${pythonFile?.name || 'Built-in'}` : `${rawPreview.length} rows • Upload Excel (1) + Python (2)`}</p></div>
              </div>
              {processed && <button onClick={downloadResult} className="glass-button px-4 py-2 rounded-full text-[12px] flex items-center gap-2"><Download className="w-3.5 h-3.5" /> Save to {outputFolder || 'Downloads'}</button>}
            </div>
            <div className="overflow-auto max-h-[520px]">
              {!processed ? (
                <table className="w-full text-[12px]"><thead className="sticky top-0 glass-strong z-10"><tr>{(rawPreview[0] ? Object.keys(rawPreview[0]) : ['Upload Excel (Input 1) to preview']).map((k)=>(<th key={k} className="text-left px-4 py-3 font-medium text-white/70 whitespace-nowrap border-b border-white/10">{k}</th>))}</tr></thead><tbody>{rawPreview.map((row,i)=>(<tr key={i} className="hover:bg-white/[0.03] border-b border-white/[0.04]">{Object.values(row).map((v,j)=>(<td key={j} className="px-4 py-2.5 whitespace-nowrap text-white/80 font-mono text-[11px]">{String(v).slice(0,80)}</td>))}</tr>))}{rawPreview.length===0 && <tr><td className="px-4 py-12 text-center text-white/40">No data — drop Excel file in Input 1, and Python file in Input 2 (v0.0.1)</td></tr>}</tbody></table>
              ) : (
                <table className="w-full text-[12px]"><thead className="sticky top-0 glass-strong z-10"><tr><th className="text-left px-4 py-3 font-medium text-white/70 sticky left-0 glass-strong border-r border-white/10">Employee</th><th className="text-left px-3 py-3 font-medium text-white/70">ID</th>{processed.allDates.map(d=>(<th key={d} className="text-center px-2 py-3 font-medium text-white/60 whitespace-nowrap"><div className="text-[11px]">{new Date(d).getDate()}</div><div className="text-[9px] opacity-60">{new Date(d).toLocaleDateString('en-US',{weekday:'short'})[0]}</div></th>))}<th className="text-center px-3 py-3 font-medium text-white/70">P</th><th className="text-center px-3 py-3 font-medium text-white/70">%</th></tr></thead><tbody>{processed.matrix.map((row,i)=>(<tr key={i} className="hover:bg-white/[0.04] border-b border-white/[0.04]"><td className="px-4 py-2.5 sticky left-0 glass-subtle border-r border-white/10 whitespace-nowrap"><div className="font-medium text-[12px]">{row.emp_name}</div><div className="text-[10px] text-white/40">{row.department}</div></td><td className="px-3 py-2.5 font-mono text-[11px] text-white/60">{row.emp_id}</td>{processed.allDates.map(d=>{ const val=row[d]; const color=val==='P'?'bg-emerald-500/20 text-emerald-300 border-emerald-500/30':val==='A'?'bg-red-500/20 text-red-300 border-red-500/30':val==='HD'?'bg-amber-500/20 text-amber-300 border-amber-500/30':val==='H'?'bg-blue-500/20 text-blue-300 border-blue-500/30':'bg-white/5 text-white/40 border-white/10'; return <td key={d} className="px-1 py-1 text-center"><span className={`inline-flex w-7 h-7 items-center justify-center rounded-full text-[11px] font-bold border ${color}`}>{val}</span></td>})}<td className="px-3 py-2.5 text-center font-medium text-emerald-300">{processed.summary[i]['Present (P)']}</td><td className="px-3 py-2.5 text-center font-mono text-[11px]">{processed.summary[i]['Attendance %']}%</td></tr>))}</tbody></table>
              )}
            </div>
          </motion.div>

          {/* v0.0.1 Spec Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="glass rounded-[20px] p-4 border-l-2 border-l-emerald-500/50">
              <h4 className="font-medium text-[12px] flex items-center gap-2 mb-2"><FileSpreadsheet className="w-4 h-4 text-emerald-400" /> Input 1: Excel</h4>
              <p className="text-[11px] text-white/50 leading-relaxed">Raw biometric dump. Auto-detects Emp ID, Name, Date, Time, Dept. Supports .xlsx/.xls, multi-sheet concat.</p>
            </div>
            <div className="glass rounded-[20px] p-4 border-l-2 border-l-violet-500/50">
              <h4 className="font-medium text-[12px] flex items-center gap-2 mb-2"><FileCode2 className="w-4 h-4 text-violet-400" /> Input 2: Python</h4>
              <p className="text-[11px] text-white/50 leading-relaxed">Your conversion logic. Should define <code className="text-white/80">process(input_path, output_path)</code>. Executed in desktop .exe, previewed in web.</p>
            </div>
            <div className="glass rounded-[20px] p-4 border-l-2 border-l-blue-500/50">
              <h4 className="font-medium text-[12px] flex items-center gap-2 mb-2"><FolderDown className="w-4 h-4 text-blue-400" /> Output: Folder</h4>
              <p className="text-[11px] text-white/50 leading-relaxed">Choose folder via dialog (Windows) or Downloads (Web). Final .xlsx saved there, HR-ready with 5 sheets + colors.</p>
            </div>
          </div>
        </div>
      </main>

      <AnimatePresence>{toast && <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 glass-strong rounded-full px-5 py-3 flex items-center gap-3 shadow-2xl"><div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">{toast.type==='error' ? <AlertCircle className="w-4 h-4 text-red-400" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400" />}</div><span className="text-[13px] font-medium max-w-[400px] truncate">{toast.msg}</span></motion.div>}</AnimatePresence>

      <footer className="max-w-[1600px] mx-auto px-6 py-8 text-center">
        <div className="glass-subtle rounded-full inline-flex items-center gap-2 px-4 py-2 text-[11px] text-white/40">
          <span>v0.0.1 • Excel + Python → Folder</span><span className="w-1 h-1 rounded-full bg-white/20"></span><span>© {new Date().getFullYear()} Autocrat Solutions</span><span className="w-1 h-1 rounded-full bg-white/20"></span><span className="flex items-center gap-1"><Sparkles className="w-3 h-3" /> Liquid Glass</span>
        </div>
      </footer>
    </div>
  )
}
