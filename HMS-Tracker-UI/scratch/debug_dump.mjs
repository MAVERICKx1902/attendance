import * as fs from 'fs';
import * as XLSX from 'xlsx';

try {
    const buf = fs.readFileSync('public/HR Database.xlsx');
    const wb = XLSX.read(buf, { type: 'array' });
    const attSheet = wb.Sheets['AttendanceLogs'];
    
    if (!attSheet) {
        fs.writeFileSync('scratch/debug_output.txt', 'AttendanceLogs sheet not found!\n');
    } else {
        const ref = attSheet['!ref'];
        const rawLogs = XLSX.utils.sheet_to_json(attSheet, { header: 1, raw: true });
        
        let output = `!ref is: ${ref}\n`;
        output += `rawLogs.length: ${rawLogs.length}\n`;
        
        for (let i = 0; i < Math.min(10, rawLogs.length); i++) {
            output += `Row ${i}: ${JSON.stringify(rawLogs[i])}\n`;
        }
        
        fs.writeFileSync('scratch/debug_output.txt', output);
    }
} catch (err) {
    fs.writeFileSync('scratch/debug_output.txt', 'ERROR: ' + err.message);
}
