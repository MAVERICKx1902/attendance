import * as XLSX from 'xlsx';

function getSheet(wb: XLSX.WorkBook, name: string): XLSX.WorkSheet | undefined {
    const target = name.toLowerCase().replace(/\s+/g, '');
    const realName = wb.SheetNames.find(n => n.toLowerCase().replace(/\s+/g, '') === target);
    return realName ? wb.Sheets[realName] : undefined;
}

function normalizeRow(row: any): any {
    if (!row || typeof row !== 'object') return {};
    const norm: any = {};
    for (const key of Object.keys(row)) {
        const safeKey = String(key).toLowerCase().replace(/\s+/g, '');
        norm[safeKey] = row[key];
    }
    return norm;
}

function parseDateStrict(val: any): string | null {
    if (!val) return null;
    const str = String(val).trim();
    // If it already looks like YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

    // Check DD-MM-YYYY or DD/MM/YYYY
    const dmMatch = str.match(/^(\d{2})[-/](\d{2})[-/](\d{4})/);
    if (dmMatch) {
        return `${dmMatch[3]}-${dmMatch[2]}-${dmMatch[1]}`;
    }
    
    // Otherwise fallback to Date constructor
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }
    return null;
}

export async function parseFullHRDatabase(workbook: XLSX.WorkBook, onProgress?: (msg: string) => void) {
    // 1. Departments
    if (onProgress) onProgress("Parsing Departments...");
    const deptMap = new Map<string, string>();
    const deptSheet = getSheet(workbook, 'Departments');
    if (deptSheet) {
        const rows = XLSX.utils.sheet_to_json<any>(deptSheet, { raw: true });
        rows.forEach(r => {
            const deptId = String(r.DepartmentId || '');
            const deptName = r.DepartmentFName || r.DepartmentSName || 'General';
            if (deptId) deptMap.set(deptId, String(deptName));
        });
    }

    // 2. Designations
    if (onProgress) onProgress("Parsing Designations...");
    const desigMap = new Map<string, string>();
    const desigSheet = getSheet(workbook, 'Designations');
    if (desigSheet) {
        const rows = XLSX.utils.sheet_to_json<any>(desigSheet, { raw: true });
        rows.forEach(r => {
            const desigId = String(r.DesignationId || '');
            const desigName = r.DesignationsName || 'Staff';
            if (desigId) desigMap.set(desigId, String(desigName));
        });
    }

    // 3. Employees
    if (onProgress) onProgress("Parsing Employees...");
    const employees: any[] = [];
    const empMap = new Map<string, any>();
    const empSheet = getSheet(workbook, 'Employees');
    if (empSheet) {
        const rows = XLSX.utils.sheet_to_json<any>(empSheet, { raw: true });
        console.log("Parsed SheetJS Data (Employees):", rows.slice(0, 3));
        rows.forEach(r => {
            if (!r.EmployeeId && !r.EmployeeName) {
                console.warn("Skipping malformed employee row", r);
                return;
            }

            const empId = String(r.EmployeeId || '0');
            const empName = String(r.EmployeeName || 'Unknown Employee');
            const dojStr = parseDateStrict(r.DOJ);
            
            empMap.set(empId, {
                emp_id: empId,
                emp_code: String(r.EmployeeCode || empId),
                emp_name: empName,
                department: deptMap.get(String(r.DepartmentId)) || 'General',
                designation: desigMap.get(String(r.Designation)) || desigMap.get(String(r.DesignationId)) || 'Staff',
                doj: dojStr,
                report_to_id: String(r.ReportTo || '0')
            });
        });
        
        // Resolve managers
        empMap.forEach(emp => {
            if (emp.report_to_id && emp.report_to_id !== '0' && emp.report_to_id !== 'undefined' && emp.report_to_id !== 'nan' && emp.report_to_id !== emp.emp_id) {
                const manager = empMap.get(emp.report_to_id);
                emp.manager_name = manager ? manager.emp_name : 'None';
            } else {
                emp.manager_name = 'None';
            }
            employees.push(emp);
        });
    }

    // 4. Leave Balances
    if (onProgress) onProgress("Parsing Leave Balances...");
    const leaveBalances: any[] = [];
    const leaveSheet = getSheet(workbook, 'EmployeeLeave Balance') || getSheet(workbook, 'EmployeeLeaveBalance');
    if (leaveSheet) {
        const rows = XLSX.utils.sheet_to_json<any>(leaveSheet, { raw: true });
        const leaveMap = new Map<string, any>();
        rows.forEach(r => {
            if (!r.EmployeeId) return;

            const empId = String(r.EmployeeId);
            if (!leaveMap.has(empId)) {
                leaveMap.set(empId, { emp_id: empId, pl: 0, cl: 0, sl: 0, rho: 0, coff: 0, lop: 0 });
            }
            const bal = leaveMap.get(empId);
            const type = String(r.LeaveTypeId || '0');
            const val = parseFloat(r.LeaveBalance) || 0;
            
            // Mappings: 3=CL, 4=PL, 5=SL
            if (type === '4') bal.pl = val;
            else if (type === '3') bal.cl = val;
            else if (type === '5') bal.sl = val;
            else bal[`type_${type}`] = val;
        });
        leaveBalances.push(...Array.from(leaveMap.values()));
    }

    // 5. AttendanceLogs (Async Chunked)
    if (onProgress) onProgress("Reading AttendanceLogs...");
    let attendanceLogs: any[] = [];
    const attSheet = getSheet(workbook, 'AttendanceLogs');
    if (attSheet) {
        // Enforce !ref. If the file was exported from a cheap biometric system, it may lack dimensions.
        if (!attSheet['!ref']) {
            console.warn("WARNING: Sheet is missing !ref. Calculating dimensions dynamically...");
            let maxRow = 0;
            let maxCol = 0;
            for (const key of Object.keys(attSheet)) {
                if (key[0] === '!') continue;
                const match = key.match(/^([A-Z]+)(\d+)$/);
                if (match) {
                    const row = parseInt(match[2], 10);
                    const col = XLSX.utils.decode_col(match[1]);
                    if (row > maxRow) maxRow = row;
                    if (col > maxCol) maxCol = col;
                }
            }
            if (maxRow > 0) {
                const startCell = "A1";
                const endCell = XLSX.utils.encode_cell({ c: maxCol, r: maxRow - 1 });
                attSheet['!ref'] = `${startCell}:${endCell}`;
                console.log(`Dynamically resolved bounds to: ${attSheet['!ref']}`);
            }
        }
        
        const rawLogs = XLSX.utils.sheet_to_json<any[]>(attSheet, { header: 1, raw: true, defval: null });
        console.log("CRITICAL DEBUG -> rawLogs.length:", rawLogs.length);
        if (rawLogs.length > 1) {
            console.log("CRITICAL DEBUG -> rawLogs[0] (header):", rawLogs[0]);
            console.log("CRITICAL DEBUG -> rawLogs[1] (data):", rawLogs[1]);
        }
        
        attendanceLogs = await processLogsInChunks(rawLogs, empMap);
        if (attendanceLogs.length === 0) {
           console.error("ATTENDANCE LOGS IS EMPTY AFTER CHUNKS. rawLogs.length was:", rawLogs.length);
        }
    }

    return {
        departments: deptMap,
        designations: desigMap,
        employees,
        leaveBalances,
        attendanceLogs
    };
}

function processLogsInChunks(rawLogs: any[], empMap: Map<string, any>): Promise<any[]> {
    return new Promise((resolve) => {
        if (!rawLogs || rawLogs.length === 0) return resolve([]);
        const result: any[] = [];
        
        let i = 0;
        // Skip header row if it exists and looks like a header array
        if (Array.isArray(rawLogs[0]) && String(rawLogs[0][0]).toLowerCase().includes('id')) {
            i = 1;
        }

        const chunkSize = 5000;

        function processChunk() {
            try {
                const end = Math.min(i + chunkSize, rawLogs.length);
                for (; i < end; i++) {
                    const r = rawLogs[i];
                    if (!r) continue;

                    let empId = '0';
                    let attDateStr: string | null = null;
                    let inTime = '', outTime = '', duration = '', statusCode = '', status = '';
                    
                    // Handle 2D Array format
                    if (Array.isArray(r)) {
                        // Aggressively find the Employee ID (usually a number like 255)
                        const idCol = r.findIndex(val => String(val).match(/^\d{1,5}$/));
                        const dateCol = r.findIndex(val => String(val).match(/^20\d{2}-|^\d{5}$/));
                        
                        empId = String(r[idCol !== -1 ? idCol : 2] || '0');
                        const rawDate = r[dateCol !== -1 ? dateCol : 1];
                        attDateStr = rawDate ? parseDateStrict(rawDate) : null;
                        
                        inTime = String(r[3] || '');
                        outTime = String(r[4] || '');
                        duration = String(r[5] || '');
                        statusCode = String(r[7] || '');
                        status = String(r[8] || '');
                    } 
                    // Handle Object format
                    else {
                        const keys = Object.keys(r);
                        const kEmp = keys.find(k => k.toLowerCase().includes('emp')) || keys[2];
                        const kDate = keys.find(k => k.toLowerCase().includes('date')) || keys[1];
                        
                        empId = String(r[kEmp] || '0');
                        attDateStr = r[kDate] ? parseDateStrict(r[kDate]) : null;
                        
                        inTime = String(r['InTime'] || r[keys[3]] || '');
                        outTime = String(r['OutTime'] || r[keys[4]] || '');
                        duration = String(r['Duration'] || r[keys[5]] || '');
                        statusCode = String(r['StatusCode'] || r[keys[7]] || '');
                        status = String(r['Status'] || r[keys[8]] || '');
                    }

                    // Collect into the result (raw entries — will be consolidated below)
                    if (empId !== '0' && empId !== 'undefined' && empId !== 'null') {
                        const emp = empMap.get(empId) || {};
                        result.push({
                            emp_id: empId,
                            emp_name: emp.emp_name || `Emp #${empId}`,
                            department: emp.department || 'General',
                            date: attDateStr || '2026-08-01',
                            in_time: inTime,
                            out_time: outTime,
                            duration: duration,
                            detailed_status_code: status,
                            status_code: statusCode,
                            status: status,
                            leave_type: '',
                            leave_status: ''
                        });
                    }
                }
                
                if (i < rawLogs.length) {
                    setTimeout(processChunk, 0); // yield to browser rendering
                } else {
                    // Consolidate multiple punches per day before resolving
                    resolve(consolidatePunchesPerDay(result));
                }
            } catch (err: any) {
                console.error("Error processing chunk:", err);
                (result as any).__parseError = err.message || String(err);
                resolve(consolidatePunchesPerDay(result));
            }
        }
        processChunk();
    });
}

/**
 * Consolidates multiple punch records for the same employee on the same day
 * into a single canonical record.
 *
 * Rule: The FIRST punch of the day = clock-in (in_time).
 *       The LAST punch of the day  = clock-out (out_time).
 *       Duration is computed from that gross span.
 *       Status code is taken from the last (most authoritative) row.
 *
 * This correctly handles employees who punch out for breaks and back in
 * during the day, which would otherwise produce multiple rows per day and
 * cause the attendance matrix to show incorrect/missing attendance.
 */
function consolidatePunchesPerDay(rawEntries: any[]): any[] {
    // Group all raw entries by emp_id + date
    const dayMap = new Map<string, any[]>();
    for (const entry of rawEntries) {
        const key = `${entry.emp_id}__${entry.date}`;
        if (!dayMap.has(key)) dayMap.set(key, []);
        dayMap.get(key)!.push(entry);
    }

    const consolidated: any[] = [];

    dayMap.forEach((entries) => {
        if (entries.length === 1) {
            // Single punch per day — use as-is
            consolidated.push(entries[0]);
            return;
        }

        // Sort chronologically by in_time so first = earliest, last = latest
        entries.sort((a, b) => {
            const tA = punchTimeToMinutes(a.in_time);
            const tB = punchTimeToMinutes(b.in_time);
            return tA - tB;
        });

        const first = entries[0];
        const last = entries[entries.length - 1];

        // Compute gross duration: first clock-in → last clock-out
        const inMin = punchTimeToMinutes(first.in_time);
        // Use the last record's out_time; fall back to its in_time if out is missing
        const outMin = punchTimeToMinutes(last.out_time || last.in_time);
        let grossHours = 0;
        if (inMin >= 0 && outMin >= 0 && outMin > inMin) {
            grossHours = (outMin - inMin) / 60;
        }

        const durationStr = grossHours > 0
            ? `${String(Math.floor(grossHours)).padStart(2, '0')}:${String(Math.round((grossHours % 1) * 60)).padStart(2, '0')}`
            : (first.duration || '');

        consolidated.push({
            ...first,
            // in_time = first punch (clock-in, earliest in the day)
            in_time: first.in_time,
            // out_time = LAST punch (final clock-out, after all breaks)
            out_time: last.out_time || last.in_time,
            // Gross duration from first-in to last-out
            duration: durationStr,
            // Status from the last row (most authoritative biometric status)
            detailed_status_code: last.detailed_status_code || first.detailed_status_code,
            status_code: last.status_code || first.status_code,
            status: last.status || first.status,
            // Punch count for transparency in the employee detail modal
            punch_count: entries.length
        });
    });

    return consolidated;
}

/**
 * Converts a time string (HH:MM or HH:MM:SS) to total minutes since midnight.
 * Returns -1 for empty, zero, or invalid strings.
 */
function punchTimeToMinutes(timeStr: string): number {
    if (!timeStr || timeStr === '00:00:00' || timeStr === '00:00') return -1;
    const parts = timeStr.split(':').map(Number);
    if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return -1;
    return parts[0] * 60 + parts[1];
}
