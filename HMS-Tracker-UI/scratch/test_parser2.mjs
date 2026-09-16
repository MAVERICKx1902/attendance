import * as XLSX from 'xlsx';
import fs from 'fs';

function getSheet(wb, name) {
    const target = name.toLowerCase().replace(/\s+/g, '');
    const realName = wb.SheetNames.find(n => n.toLowerCase().replace(/\s+/g, '') === target);
    return realName ? wb.Sheets[realName] : undefined;
}

const file_path = 'public/HR Database.xlsx';
const buf = fs.readFileSync(file_path);
const wb = XLSX.read(buf, { cellDates: true, dateNF: 'yyyy-mm-dd hh:mm:ss', raw: true });

const attSheet = getSheet(wb, 'AttendanceLogs');
const rawLogs = XLSX.utils.sheet_to_json(attSheet, { raw: false, dateNF: 'yyyy-mm-dd' });
console.log("Raw logs:", rawLogs.length);

if (rawLogs.length > 0) {
    const first = rawLogs[0];
    const norm = {};
    for (const key of Object.keys(first)) {
        norm[String(key).toLowerCase().replace(/\s+/g, '')] = first[key];
    }
    console.log("Normalized first log:", norm);
    console.log("has employeeid:", 'employeeid' in norm);
    console.log("has attendancedate:", 'attendancedate' in norm);
}
