import * as fs from 'fs';
import * as path from 'path';
import ExcelJS from 'exceljs';

const EXCEL_PATH = path.join(process.cwd(), 'public', 'HR Database.xlsx');
const OUTPUT_PATH = path.join(process.cwd(), 'public', 'processed_hr_data.json');

function parseDateStrict(val: any): string | null {
    if (!val) return null;
    const str = String(val).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
    const dmMatch = str.match(/^(\d{2})[-/](\d{2})[-/](\d{4})/);
    if (dmMatch) return `${dmMatch[3]}-${dmMatch[2]}-${dmMatch[1]}`;
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }
    return null;
}

async function convertExcelToJson() {
    console.log(`Starting conversion of ${EXCEL_PATH}...`);
    if (!fs.existsSync(EXCEL_PATH)) {
        console.error(`ERROR: File not found at ${EXCEL_PATH}`);
        process.exit(1);
    }

    const workbook = new ExcelJS.Workbook();
    console.log("Loading massive Excel file into memory (this will take 10-30 seconds)...");
    await workbook.xlsx.readFile(EXCEL_PATH);

    const finalData = {
        employees: [] as any[],
        departments: [] as any[],
        designations: [] as any[],
        leaveBalances: [] as any[],
        attendanceLogs: [] as any[]
    };

    // 1. Employees
    console.log("Extracting Employees...");
    const empSheet = workbook.getWorksheet('Employees');
    if (empSheet) {
        empSheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return;
            const empId = String(row.getCell(1).text || row.getCell(1).value);
            const empName = String(row.getCell(2).text || row.getCell(2).value);
            if (!empId || empId === 'null' || empId === 'undefined') return;
            
            finalData.employees.push({
                emp_id: empId,
                emp_code: String(row.getCell(3).text) || empId,
                emp_name: empName,
                department: String(row.getCell(4).text) || 'General',
                designation: String(row.getCell(5).text) || 'Staff',
                doj: parseDateStrict(row.getCell(6).value),
            });
        });
    }

    // 2. Leave Balances
    console.log("Extracting Leave Balances...");
    const leaveSheet = workbook.getWorksheet('LeaveBalances') || workbook.getWorksheet('LeaveBalance');
    if (leaveSheet) {
        leaveSheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return;
            const empId = String(row.getCell(1).text || row.getCell(1).value);
            if (!empId || empId === 'null') return;
            
            finalData.leaveBalances.push({
                emp_id: empId,
                pl_total: Number(row.getCell(2).value) || 0,
                pl_remaining: Number(row.getCell(3).value) || 0,
                cl_total: Number(row.getCell(4).value) || 0,
                cl_remaining: Number(row.getCell(5).value) || 0,
                sl_total: Number(row.getCell(6).value) || 0,
                sl_remaining: Number(row.getCell(7).value) || 0,
            });
        });
    }

    // 3. Attendance Logs
    console.log("Extracting Attendance Logs...");
    const attSheet = workbook.getWorksheet('AttendanceLogs');
    if (attSheet) {
        let idCol = 3, dateCol = 2, inCol = 4, outCol = 6, durCol = 8, statusCol = 30;
        
        const headerRow = attSheet.getRow(1);
        headerRow.eachCell((cell, colNumber) => {
            const val = String(cell.value).toLowerCase().replace(/[^a-z]/g, '');
            if (val.includes('employeeid')) idCol = colNumber;
            else if (val === 'attendancedate' || val === 'date') dateCol = colNumber;
            else if (val === 'intime') inCol = colNumber;
            else if (val === 'outtime') outCol = colNumber;
            else if (val === 'status') statusCol = colNumber;
            else if (val === 'duration') durCol = colNumber;
        });

        console.log(`Detected exact columns: EmpID(${idCol}), Date(${dateCol})`);

        attSheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return;
            
            const empId = String(row.getCell(idCol).text || row.getCell(idCol).value);
            const rawDate = row.getCell(dateCol).value;
            
            if (!empId || empId === 'null' || empId === 'undefined' || !rawDate) return;
            
            const attDateStr = parseDateStrict(rawDate);
            if (!attDateStr) return;

            finalData.attendanceLogs.push({
                emp_id: empId,
                date: attDateStr,
                in_time: String(row.getCell(inCol).text),
                out_time: String(row.getCell(outCol).text),
                duration: String(row.getCell(durCol).text),
                detailed_status_code: String(row.getCell(statusCol).text),
                status: String(row.getCell(statusCol).text),
            });
        });
        
        console.log(`Successfully extracted ${finalData.attendanceLogs.length} attendance logs!`);
    } else {
        console.error("AttendanceLogs sheet not found! Extraction failed.");
    }

    // Write to JSON
    console.log(`Saving payload to ${OUTPUT_PATH}...`);
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(finalData, null, 2));
    console.log("DONE! The React Dashboard can now instantly fetch this JSON file.");
}

convertExcelToJson().catch(err => console.error("Fatal Error:", err));
