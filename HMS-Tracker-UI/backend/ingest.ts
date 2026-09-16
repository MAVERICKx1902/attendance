import * as fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as ExcelJS from 'exceljs';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const EXCEL_PATH = process.env.EXCEL_FILE_PATH || '../public/HR Database.xlsx';

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

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

async function ingestData() {
    console.log("Starting ingestion from:", EXCEL_PATH);
    if (!fs.existsSync(EXCEL_PATH)) {
        console.error("File not found!");
        process.exit(1);
    }

    const workbook = new ExcelJS.Workbook();
    console.log("Loading Excel file into memory (this may take 10-30 seconds for 128k rows)...");
    await workbook.xlsx.readFile(EXCEL_PATH);

    // 1. Ingest Employees
    console.log("Parsing Employees...");
    const empSheet = workbook.getWorksheet('Employees');
    const employees: any[] = [];
    if (empSheet) {
        empSheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return; // skip header
            const empId = row.getCell(1).text; // assuming EmployeeId is Col A
            const empName = row.getCell(2).text;
            if (!empId) return;
            
            employees.push({
                emp_id: empId,
                emp_code: row.getCell(3).text || empId,
                emp_name: empName,
                department: row.getCell(4).text || 'General',
                designation: row.getCell(5).text || 'Staff',
                doj: parseDateStrict(row.getCell(6).value),
            });
        });
        
        console.log(`Uploading ${employees.length} employees to Supabase...`);
        const { error } = await supabase.from('employees').upsert(employees, { onConflict: 'emp_id' });
        if (error) console.error("Employee Upload Error:", error);
    }

    // 2. Ingest Leave Balances
    console.log("Parsing Leave Balances...");
    const leaveSheet = workbook.getWorksheet('LeaveBalances') || workbook.getWorksheet('LeaveBalance');
    if (leaveSheet) {
        const balances: any[] = [];
        leaveSheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return;
            const empId = row.getCell(1).text;
            if (!empId) return;
            balances.push({
                emp_id: empId,
                pl_total: Number(row.getCell(2).value) || 0,
                pl_remaining: Number(row.getCell(3).value) || 0,
                cl_total: Number(row.getCell(4).value) || 0,
                cl_remaining: Number(row.getCell(5).value) || 0,
                sl_total: Number(row.getCell(6).value) || 0,
                sl_remaining: Number(row.getCell(7).value) || 0,
            });
        });
        console.log(`Uploading ${balances.length} leave balances to Supabase...`);
        const { error } = await supabase.from('leave_balances').upsert(balances, { onConflict: 'emp_id' });
        if (error) console.error("Leave Balance Upload Error:", error);
    }

    // 3. Ingest Attendance Logs in Batches
    console.log("Parsing Attendance Logs...");
    const attSheet = workbook.getWorksheet('AttendanceLogs');
    if (attSheet) {
        let logs: any[] = [];
        let totalCount = 0;
        
        // Find column indices from header
        let idCol = 3; // Fallbacks
        let dateCol = 2;
        let inCol = 4;
        let outCol = 6;
        let statusCol = 30;
        
        const headerRow = attSheet.getRow(1);
        headerRow.eachCell((cell, colNumber) => {
            const val = String(cell.value).toLowerCase().replace(/[^a-z]/g, '');
            if (val.includes('employeeid')) idCol = colNumber;
            else if (val === 'attendancedate' || val === 'date') dateCol = colNumber;
            else if (val === 'intime') inCol = colNumber;
            else if (val === 'outtime') outCol = colNumber;
            else if (val === 'status') statusCol = colNumber;
        });

        console.log(`Headers detected: EmpID(Col ${idCol}), Date(Col ${dateCol})`);

        // Iterate all rows safely
        const BATCH_SIZE = 5000;
        
        attSheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return; // skip header
            
            const empId = row.getCell(idCol).text;
            const rawDate = row.getCell(dateCol).value;
            
            if (!empId || !rawDate) return;
            
            const attDateStr = parseDateStrict(rawDate);
            if (!attDateStr) return;

            logs.push({
                emp_id: empId,
                attendance_date: attDateStr,
                in_time: row.getCell(inCol).text,
                out_time: row.getCell(outCol).text,
                status: row.getCell(statusCol).text,
            });

            if (logs.length >= BATCH_SIZE) {
                totalCount += logs.length;
                uploadBatch(logs, totalCount);
                logs = []; // clear batch
            }
        });
        
        // Final batch
        if (logs.length > 0) {
            totalCount += logs.length;
            await uploadBatch(logs, totalCount);
        }
        
        console.log(`Successfully completed ingestion of ${totalCount} attendance logs!`);
    } else {
        console.error("AttendanceLogs sheet not found!");
    }
}

async function uploadBatch(batch: any[], totalCount: number) {
    console.log(`Uploading batch... (Total uploaded: ${totalCount})`);
    const { error } = await supabase.from('attendance_logs').upsert(batch, { onConflict: 'emp_id, attendance_date' });
    if (error) console.error("Batch upload error:", error.message);
}

ingestData().catch(err => {
    console.error("Unhandled Fatal Error:", err);
});
