import fs from 'fs';

const file = 'src/App.tsx';
let content = fs.readFileSync(file, 'utf-8');

// 1. Add matrix and daily to the payload
content = content.replace(
  /stats: \{ grandTotalHours: 8402 \}\n\s*\};/,
  "stats: { grandTotalHours: 8402 },\n          matrix: fullData.employees.map(e => {\n            const rec = { emp_id: String(e.emp_id || '0'), emp_name: String(e.emp_name || 'Unknown Employee'), department: e.department };\n            fullData.attendanceLogs.filter(l => l.emp_id === e.emp_id).forEach(l => { if (l.date) rec[l.date] = window.resolveAttendanceStatus ? window.resolveAttendanceStatus(l.detailed_status_code, l.date, e.doj || null) : l.status; });\n            return rec;\n          }),\n          daily: []\n        };"
);

// 2. Add defensive guards around .filter calls in UI rendering
content = content.replace(/processed\.matrix\.filter/g, "(processed.matrix || []).filter");
content = content.replace(/processed\.daily\.filter/g, "(processed.daily || []).filter");
content = content.replace(/processed\.summary\s*\n\s*\.filter/g, "(processed.summary || [])\n                .filter");
content = content.replace(/processed\?\.summary\?\.filter/g, "(processed?.summary || []).filter");

fs.writeFileSync(file, content);
console.log("App.tsx guards applied successfully!");
