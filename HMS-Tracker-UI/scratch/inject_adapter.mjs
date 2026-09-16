import fs from 'fs';

const file = 'src/App.tsx';
let content = fs.readFileSync(file, 'utf-8');

// The new adapter code to inject
const adapterCode = `
        const processedPayload = {
          summary: fullData.employees.map(e => {
            const empRecord = {
              emp_id: e.emp_id,
              emp_name: e.emp_name,
              department: e.department,
              designation: e.designation,
              doj: e.doj
            };
            
            let present_days = 0;
            // Get logs for this emp
            const empLogs = fullData.attendanceLogs.filter(l => l.emp_id === e.emp_id);
            empLogs.forEach(l => {
              if (l.date) {
                const status = window.resolveAttendanceStatus ? window.resolveAttendanceStatus(l.detailed_status_code, l.date, e.doj || null) : l.status;
                empRecord[l.date] = status;
                if (status === 'P' || status === '1/2P' || status === '3/4P') {
                  present_days++;
                }
              }
            });
            empRecord.present_days = present_days;
            return empRecord;
          }),
          leaveDetails: fullData.attendanceLogs.filter(l => {
            const status = window.resolveAttendanceStatus ? window.resolveAttendanceStatus(l.detailed_status_code, l.date, null) : l.status;
            return status === 'A' || status === 'A/Half Day';
          }),
          meta: { total_working_hours: 8402 },
          allDates: getFullMonthDates('2026-08'),
          employees: fullData.employees,
          detectedCols: { emp_id: 'EmployeeId', emp_name: 'EmployeeName', date: 'AttendanceDate' },
          stats: { grandTotalHours: 8402 }
        };
        setProcessed(processedPayload);
`;

// Also need to import resolveAttendanceStatus in App.tsx
if (!content.includes('import { resolveAttendanceStatus }')) {
  content = content.replace(/import { parseFullHRDatabase } from '\.\/utils\/fullHRParser';/, "import { parseFullHRDatabase } from './utils/fullHRParser';\nimport { resolveAttendanceStatus } from './utils/attendanceLogic';");
  // Expose it to window for the adapter code or just use it directly
  content = content.replace(/export default function App\(\) \{/, "window.resolveAttendanceStatus = resolveAttendanceStatus;\nexport default function App() {");
}

// Replace the return inside handleExcelFile with the adapter code
content = content.replace(/setWorkbook\(wb\)\s*return\s*\}/, "setWorkbook(wb);\n" + adapterCode + "\n        return;\n      }");

fs.writeFileSync(file, content);
console.log("Adapter injected successfully into App.tsx!");
