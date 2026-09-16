import fs from 'fs';

const file = 'src/App.tsx';
let content = fs.readFileSync(file, 'utf-8');

// Fix useState
content = content.replace(/useState\(null\)/g, 'useState<any>(null)');
content = content.replace(/useState\(\[\]\)/g, 'useState<any[]>([])');
content = content.replace(/useState\(''\)/g, "useState<string>('')");

// Fix typical array method implicit anys in the remaining errors
content = content.replace(/\(d =>/g, '((d: any) =>');
content = content.replace(/\(r =>/g, '((r: any) =>');
content = content.replace(/\(s =>/g, '((s: any) =>');
content = content.replace(/\(e =>/g, '((e: any) =>');
content = content.replace(/\(n =>/g, '((n: any) =>');
content = content.replace(/\(row, i\)/g, '(row: any, i: any)');
content = content.replace(/\(p, i\)/g, '(p: any, i: any)');
content = content.replace(/\(emp, idx\)/g, '(emp: any, idx: any)');
content = content.replace(/\(e\)/g, '(e: any)');
content = content.replace(/\(log, idx\)/g, '(log: any, idx: any)');
content = content.replace(/\(dept\)/g, '(dept: any)');

// Fix specific missing properties
content = content.replace(/import React, \{ useState, useEffect/g, 'import React, { useState, useEffect, useRef');

fs.writeFileSync(file, content);

// Also fix components
const comps = [
  'src/components/attendance/AttendanceLogsTable.tsx',
  'src/components/attendance/DailyAttendanceMatrix.tsx',
  'src/components/attendance/EmployeeDetailModal.tsx',
  'src/components/attendance/LeaveSummaryTable.tsx',
  'src/components/attendance/ManualLeaveForm.tsx',
]
for (const comp of comps) {
  let c = fs.readFileSync(comp, 'utf-8');
  c = c.replace(/\(dept =>/g, '((dept: any) =>');
  c = c.replace(/\(n =>/g, '((n: any) =>');
  c = c.replace(/\(emp =>/g, '((emp: any) =>');
  c = c.replace(/\(log, idx\)/g, '(log: any, idx: any)');
  fs.writeFileSync(comp, c);
}

console.log("Replaced useState and arrow functions");
