const fs = require('fs');
const XLSX = require('xlsx');

// Note: Using JS directly to emulate the parsing logic
function normalizeRow(row) {
    if (!row || typeof row !== 'object') return {};
    const norm = {};
    for (const key of Object.keys(row)) {
        const safeKey = String(key).toLowerCase().replace(/\s+/g, '');
        norm[safeKey] = row[key];
    }
    return norm;
}

function getSheet(wb, name) {
    const target = name.toLowerCase().replace(/\s+/g, '');
    const realName = wb.SheetNames.find(n => n.toLowerCase().replace(/\s+/g, '') === target);
    return realName ? wb.Sheets[realName] : undefined;
}

const file_path = 'public/HR Database.xlsx';
if (!fs.existsSync(file_path)) {
    console.error("File not found:", file_path);
    process.exit(1);
}

const buf = fs.readFileSync(file_path);
const wb = XLSX.read(buf, { cellDates: true, dateNF: 'yyyy-mm-dd hh:mm:ss', raw: true });

console.log("Sheet names detected:", wb.SheetNames);

const empSheet = getSheet(wb, 'Employees');
const attSheet = getSheet(wb, 'AttendanceLogs');

if (!empSheet || !attSheet) {
    console.error("Missing critical sheets.");
    process.exit(1);
}

const empRows = XLSX.utils.sheet_to_json(empSheet, { raw: false, dateNF: 'yyyy-mm-dd' });
console.log("Employees raw rows:", empRows.length);
if (empRows.length > 0) {
    console.log("First employee row normalized:", normalizeRow(empRows[0]));
}

const attRows = XLSX.utils.sheet_to_json(attSheet, { raw: false, dateNF: 'yyyy-mm-dd' });
console.log("Attendance logs raw rows:", attRows.length);
if (attRows.length > 0) {
    console.log("First att log normalized:", normalizeRow(attRows[0]));
}
