import * as fs from 'fs';
import * as XLSX from 'xlsx';

async function main() {
    const buf = fs.readFileSync('public/HR Database.xlsx');
    console.log("Reading workbook...");
    const wb = XLSX.read(buf, { type: 'array' });
    
    const target = 'attendancelogs';
    const realName = wb.SheetNames.find(n => n.toLowerCase().replace(/\s+/g, '') === target);
    if (!realName) {
        console.log("No AttendanceLogs sheet found!");
        return;
    }
    
    console.log("Found AttendanceLogs sheet:", realName);
    const attSheet = wb.Sheets[realName];
    
    console.log("Sheet !ref is:", attSheet['!ref']);
    
    console.log("Running sheet_to_json...");
    const rawLogs = XLSX.utils.sheet_to_json(attSheet, { raw: true });
    
    console.log("rawLogs length:", rawLogs.length);
    if (rawLogs.length > 0) {
        console.log("First log:", rawLogs[0]);
        console.log("Second log:", rawLogs[1]);
        console.log("Third log:", rawLogs[2]);
    }
}

main().catch(console.error);
