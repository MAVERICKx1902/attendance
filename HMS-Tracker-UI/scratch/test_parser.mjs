import fs from 'fs';
import * as XLSX from 'xlsx';

// mock getSheet and processLogsInChunks for quick test
function getSheet(workbook, sheetName) {
    const target = sheetName.toLowerCase().replace(/\s+/g, '');
    const realName = workbook.SheetNames.find(n => n.toLowerCase().replace(/\s+/g, '') === target);
    return realName ? workbook.Sheets[realName] : null;
}

const buf = fs.readFileSync('public/HR Database.xlsx');
const wb = XLSX.read(buf, { cellDates: true, raw: false, dateNF: 'yyyy-mm-dd' });
const attSheet = getSheet(wb, 'AttendanceLogs');
if (attSheet) {
    const rawLogs = XLSX.utils.sheet_to_json(attSheet, { raw: false, dateNF: 'yyyy-mm-dd', defval: null });
    console.log("Parsed SheetJS Data (Attendance Logs):", JSON.stringify(rawLogs.slice(0, 3), null, 2));
} else {
    console.log("No AttendanceLogs sheet found");
}
