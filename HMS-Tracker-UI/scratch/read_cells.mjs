import * as fs from 'fs';
import * as XLSX from 'xlsx';

try {
    const buf = fs.readFileSync('public/HR Database.xlsx');
    console.log("Reading workbook...");
    const wb = XLSX.read(buf, { type: 'buffer' });
    const attSheet = wb.Sheets['AttendanceLogs'];
    
    if (!attSheet) {
        console.log('AttendanceLogs sheet not found!');
    } else {
        const ref = attSheet['!ref'];
        console.log(`!ref is: ${ref}`);
        
        // Let's just print cells A1 to M5
        for (let R = 0; R < 5; ++R) {
            let row = [];
            for (let C = 0; C < 10; ++C) {
                const cell_address = {c:C, r:R};
                const cell_ref = XLSX.utils.encode_cell(cell_address);
                const cell = attSheet[cell_ref];
                row.push(cell ? cell.v : null);
            }
            console.log(`Row ${R}: ${JSON.stringify(row)}`);
        }
    }
} catch (err) {
    console.log('ERROR: ' + err.message);
}
