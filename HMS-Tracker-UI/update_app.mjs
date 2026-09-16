import fs from 'fs';

const file = 'src/App.tsx';
let content = fs.readFileSync(file, 'utf-8');

// 1. Add Import for MonthNavigator
if (!content.includes('MonthNavigator')) {
  content = content.replace(
    /import \{ AttendanceProvider \}.*?;/,
    "import { AttendanceProvider } from './store/AttendanceStore';\nimport { MonthNavigator } from './components/shared/MonthNavigator';"
  );
}

// 2. Delete static processedPayload inside handleExcelFile and auto-detect month
const staticPayloadRegex = /const processedPayload = \{[\s\S]*?setProcessed\(processedPayload\);/m;
content = content.replace(staticPayloadRegex, `
        // Auto-detect most recent month
        const months = new Set(fullData.attendanceLogs.filter((l: any) => l.date).map((l: any) => l.date.substring(0, 7)));
        const sortedMonths = Array.from(months).sort();
        if (sortedMonths.length > 0) {
            store.setSelectedMonth(sortedMonths[sortedMonths.length - 1]);
        }
`);

// 3. Inject the dynamic useEffect just before handleExcelFile
const useEffectDynamic = `
  // Dynamic processedPayload regeneration for Relational HR Database
  useEffect(() => {
    if (store.isLoaded && store.attendanceLogs.length > 0 && store.selectedMonth) {
      const currentMonthLogs = store.attendanceLogs.filter((l: any) => l.date && l.date.startsWith(store.selectedMonth));
      const allDates = getFullMonthDates(store.selectedMonth);

      const processedPayload = {
          summary: store.employees.map((e: any) => {
            const empRecord: any = {
              emp_id: String(e.emp_id || '0'),
              emp_name: String(e.emp_name || 'Unknown Employee'),
              department: e.department,
              designation: e.designation,
              doj: e.doj
            };
            
            let present_days = 0, absent_days = 0;
            let pl_used = 0, cl_used = 0, sl_used = 0, lwp_used = 0, hd_count = 0;

            const empLogs = currentMonthLogs.filter((l: any) => l.emp_id === e.emp_id);
            empLogs.forEach((l: any) => {
              if (l.date) {
                const status = window.resolveAttendanceStatus ? window.resolveAttendanceStatus(l.detailed_status_code, l.date, e.doj || null) : l.status;
                empRecord[l.date] = status;
                
                if (status === 'P') present_days++;
                else if (status === '1/2P' || status === '3/4P') hd_count++;
                else if (status === 'A') absent_days++;
                else if (status === 'PL') pl_used++;
                else if (status === 'CL') cl_used++;
                else if (status === 'SL') sl_used++;
              }
            });
            empRecord.present_days = present_days + (hd_count * 0.5);
            empRecord['Present (P)'] = present_days;
            empRecord['Half Day (HD)'] = hd_count;
            empRecord['Absent (A)'] = absent_days;
            
            const balanceObj = store.leaveBalances.find((b: any) => b.emp_id === e.emp_id) || { pl: 0, cl: 0, sl: 0, lwp: 0 };
            empRecord['PL Remaining'] = balanceObj.pl;
            empRecord['CL Remaining'] = balanceObj.cl;
            empRecord['SL Remaining'] = balanceObj.sl;
            empRecord['LWP Used'] = balanceObj.lop || lwp_used;
            
            const totalWorkingDays = allDates.length;
            empRecord['Attendance %'] = Math.round((empRecord.present_days / (totalWorkingDays || 1)) * 100);

            return empRecord;
          }),
          leaveDetails: currentMonthLogs.filter((l: any) => {
            const status = window.resolveAttendanceStatus ? window.resolveAttendanceStatus(l.detailed_status_code, l.date, null) : l.status;
            return status !== 'P' && status !== 'H' && status !== 'WO' && status !== '-';
          }).map((l: any) => ({
             'emp id': l.emp_id,
             emplname: l.emp_name,
             department: l.department,
             'leave value': '1 (Full Day)',
             'leave type': l.detailed_status_code,
             'start date': l.date,
             'end date': l.date
          })),
          meta: { total_working_hours: 8402 },
          allDates: allDates,
          employees: store.employees,
          detectedCols: { emp_id: 'EmployeeId', emp_name: 'EmployeeName', date: 'AttendanceDate' },
          stats: { grandTotalHours: 8402 },
          matrix: store.employees.map((e: any) => {
            const rec: any = { emp_id: String(e.emp_id || '0'), emp_name: String(e.emp_name || 'Unknown Employee'), department: e.department };
            currentMonthLogs.filter((l: any) => l.emp_id === e.emp_id).forEach((l: any) => { 
                if (l.date) {
                    rec[l.date] = window.resolveAttendanceStatus ? window.resolveAttendanceStatus(l.detailed_status_code, l.date, e.doj || null) : l.status; 
                }
            });
            return rec;
          }),
          daily: []
      };

      setProcessed(processedPayload);
    }
  }, [store.isLoaded, store.selectedMonth, store.employees, store.attendanceLogs]);

  const handleExcelFile = async (f) => {
`;

if (!content.includes('// Dynamic processedPayload regeneration')) {
  content = content.replace(/const handleExcelFile = async \(f\) => \{/, useEffectDynamic);
}


// 4. Inject MonthNavigator into UI (Main Matrix)
const matrixHeaderRegex = /<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4 mb-4">/m;
if (content.includes('pb-4 mb-4">')) {
  content = content.replace(matrixHeaderRegex, `
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4 mb-4">
                {store.isLoaded && <MonthNavigator />}
`);
}

// 5. Inject MonthNavigator into UI (Employee Modal)
const employeeModalHeaderRegex = /<div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-5 z-20">/m;
content = content.replace(employeeModalHeaderRegex, `
          <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-5 z-20">
            <div className="flex justify-between items-center mb-4">
              {store.isLoaded && <MonthNavigator />}
            </div>
`);


fs.writeFileSync(file, content);
console.log("App.tsx dynamically updated!");
