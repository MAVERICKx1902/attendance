import * as fs from 'fs';
import * as XLSX from 'xlsx';
import { parseFullHRDatabase } from '../src/utils/fullHRParser';

async function main() {
    const buf = fs.readFileSync('public/HR Database.xlsx');
    const wb = XLSX.read(buf, { cellDates: true, raw: false, dateNF: 'yyyy-mm-dd' });
    const fullData = await parseFullHRDatabase(wb, (msg) => console.log("Progress:", msg));
    console.log("Employees Count:", fullData.employees.length);
    console.log("AttendanceLogs Count:", fullData.attendanceLogs.length);
}

main().catch(console.error);
