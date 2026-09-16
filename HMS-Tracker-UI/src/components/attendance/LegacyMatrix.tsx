import React, { useMemo, useState } from 'react';
import { useAttendanceStore } from '../../store/AttendanceStore';
import { resolveAttendanceStatus } from '../../utils/attendanceLogic';
import { getFullMonthDates } from '../../utils/dateUtils';
import { ChevronLeft, ChevronRight, ChevronDown, Calendar as CalendarIcon } from 'lucide-react';

/**
 * Converts a time string (HH:MM or HH:MM:SS) to total minutes since midnight.
 * Returns -1 for empty, midnight-zero, or invalid strings.
 */
function logTimeToMin(timeStr: string): number {
  if (!timeStr || timeStr === '00:00:00' || timeStr === '00:00') return -1;
  const parts = timeStr.split(':').map(Number);
  if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return -1;
  return parts[0] * 60 + parts[1];
}


export const LegacyMatrix = React.memo(function LegacyMatrix({ data, onRowClick }: { data?: any[], onRowClick?: (emp: any) => void }) {
  const store = useAttendanceStore();
  const { employees, attendanceLogs, selectedMonth, leaveBalances, setSelectedMonth } = store;

  const traverseMonth = (dir: 1 | -1) => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + dir, 1);
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    if (selectedMonth) months.add(selectedMonth);

    if (attendanceLogs && attendanceLogs.length > 0) {
      attendanceLogs.forEach((l: any) => {
        if (l.date && l.date.length >= 7) {
          months.add(l.date.substring(0, 7));
        }
      });
    }

    const years = new Set<number>();
    months.forEach((m) => {
      const y = parseInt(m.split('-')[0], 10);
      if (!isNaN(y)) years.add(y);
    });
    if (years.size === 0) {
      years.add(new Date().getFullYear());
    }
    years.forEach((yr) => {
      for (let m = 1; m <= 12; m++) {
        months.add(`${yr}-${String(m).padStart(2, '0')}`);
      }
    });

    return Array.from(months).sort();
  }, [attendanceLogs, selectedMonth]);

  const formatMonthLabel = (yyyyMm: string) => {
    if (!yyyyMm || !yyyyMm.includes('-')) return yyyyMm;
    const [y, m] = yyyyMm.split('-');
    const date = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const filteredEmployees = useMemo(() => {
    return data || employees;
  }, [data, employees]);

  const dates = getFullMonthDates(selectedMonth);

  const lastRecordedDateStr = useMemo(() => {
    if (!attendanceLogs || attendanceLogs.length === 0) return null;
    let max = attendanceLogs[0].date;
    for (let i = 1; i < attendanceLogs.length; i++) {
      if (attendanceLogs[i].date > max) max = attendanceLogs[i].date;
    }
    return max;
  }, [attendanceLogs]);

  // Pre-index logs — consolidate multiple punches per employee per day.
  // The FIRST punch of the day is the clock-in; the LAST punch is the clock-out.
  // This handles employees who punch out for lunch/breaks and back in later.
  const logMap = useMemo(() => {
    // Accumulate all punch times per key before picking the canonical record
    const raw = new Map<string, any[]>();
    attendanceLogs.forEach(l => {
      if (l.date && l.date.startsWith(selectedMonth)) {
        const key = `${String(l.emp_id)}_${l.date}`;
        if (!raw.has(key)) raw.set(key, []);
        raw.get(key)!.push(l);
      }
    });

    const map = new Map<string, any>();
    raw.forEach((entries, key) => {
      if (entries.length === 1) {
        map.set(key, entries[0]);
        return;
      }

      // Sort by in_time ascending so entries[0] is the first clock-in
      entries.sort((a, b) => {
        const tA = logTimeToMin(a.in_time);
        const tB = logTimeToMin(b.in_time);
        return tA - tB;
      });

      const first = entries[0];
      const last = entries[entries.length - 1];

      // Recompute gross duration from first-in → last-out
      const inMin = logTimeToMin(first.in_time);
      const outMin = logTimeToMin(last.out_time || last.in_time);
      let durationStr = first.duration || '';
      if (inMin >= 0 && outMin > inMin) {
        const h = Math.floor((outMin - inMin) / 60);
        const m = Math.round((outMin - inMin) % 60);
        durationStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      }

      map.set(key, {
        ...first,
        in_time: first.in_time,
        out_time: last.out_time || last.in_time,
        duration: durationStr,
        // Use status from the last record (most authoritative biometric status)
        detailed_status_code: last.detailed_status_code || first.detailed_status_code,
        status: last.status || first.status,
        punch_count: entries.length
      });
    });

    return map;
  }, [attendanceLogs, selectedMonth]);


  // Build summary for leaves
  const summaryMap = useMemo(() => {
    const map = new Map<string, any>();
    leaveBalances.forEach(lb => {
      map.set(String(lb.emp_id), {
        pl: lb.pl || 0,
        cl: lb.cl || 0,
        sl: lb.sl || 0
      });
    });
    return map;
  }, [leaveBalances]);

  // Pre-index DOJ for all employees (by raw ID, normalized ID, employee code, and employee name)
  const dojMap = useMemo(() => {
    const map = new Map<string, any>();
    (employees || []).forEach((e: any) => {
      const rawId = String(e.emp_id || '');
      const normId = rawId.replace(/^0+/, '').split('.')[0];
      const dojVal = e.doj || null;
      if (dojVal) {
        if (rawId) map.set(rawId, dojVal);
        if (normId) map.set(normId, dojVal);
        if (e.emp_code) map.set(String(e.emp_code), dojVal);
        if (e.emp_name) map.set(String(e.emp_name).trim().toUpperCase(), dojVal);
      }
    });
    return map;
  }, [employees]);

  // Apply these classes based on status and theme:
  const getBadgeClasses = (status: string) => {
    const base = "w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold border";
    
    switch (status) {
      case 'P':
        return `${base} bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20`;
      case 'A':
        return `${base} bg-red-100 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20`;
      case '1/2P':
      case '3/4P':
      case '½P':
      case '¾P':
      case 'HD':
        return `${base} bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20`;
      case 'PL':
      case 'CL':
      case 'SL':
      case 'PLD':
      case 'CLD':
      case 'SLD':
      case '½PLD':
      case '¾PLD':
        return `${base} bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20`;
      case 'WO':
      case 'H':
      case '-':
        return `${base} bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700/50`;
      default:
        return `${base} bg-slate-50 text-slate-400 border-transparent dark:bg-transparent dark:text-slate-600 dark:border-transparent`;
    }
  };

  return (
    <div className="bg-white dark:bg-[#131826] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-2xl dark:shadow-black/50 overflow-hidden transition-colors duration-200">
      <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131826] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-blue-500 dark:text-blue-400" />
            Attendance Record
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {/* Today / Month Dropdown */}
          <div className="relative flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="appearance-none bg-transparent hover:bg-black/5 dark:hover:bg-white/5 text-slate-800 dark:text-slate-200 font-medium text-xs pr-6 py-0.5 rounded-lg outline-none cursor-pointer border-none transition-colors duration-200 ease-out"
            >
              {availableMonths.map((m) => (
                <option key={m} value={m} className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                  {formatMonthLabel(m)}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 pointer-events-none absolute right-2" />
          </div>

          {/* Month Chevron Controls */}
          <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-0.5">
            <button
              onClick={() => traverseMonth(-1)}
              title="Previous Month"
              className="p-1.5 hover:bg-black/5 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white rounded-lg text-slate-500 dark:text-slate-400 transition-opacity duration-200 ease-out"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => traverseMonth(1)}
              title="Next Month"
              className="p-1.5 hover:bg-black/5 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white rounded-lg text-slate-500 dark:text-slate-400 transition-opacity duration-200 ease-out"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto relative w-full h-[600px] overflow-y-auto">
        <table className="w-full text-[12px] border-collapse">
          <thead className="sticky top-0 bg-slate-50 text-slate-500 dark:bg-slate-900 dark:text-slate-400 z-20 border-b border-slate-200 dark:border-slate-800">
            <tr className="bg-slate-50 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
              <th className="text-left px-5 py-3.5 font-semibold text-slate-700 dark:text-slate-300 sticky left-0 bg-white border-r border-slate-200 dark:bg-[#131826] dark:border-r dark:border-slate-800 z-30 min-w-[260px] w-[260px] uppercase text-[11px] tracking-wider">
                EMPLOYEE
              </th>
              {dates.map((d: any) => (
                <th key={d} className="text-center px-1.5 py-3 font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap min-w-[44px]">
                  <div className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300">{parseInt(d.split('-')[2], 10)}</div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase">{new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' })[0]}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.map((row: any, i: any) => {
              const summary = summaryMap.get(String(row.emp_id));

              return (
                <tr
                  key={i}
                  onClick={() => onRowClick && onRowClick(row)}
                  className="matrix-row contain-content hover:bg-slate-50 dark:hover:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800/60 cursor-pointer group"
                  style={{ contentVisibility: 'auto', containIntrinsicSize: '0 52px' }}
                >
                  <td className="px-5 py-3 sticky left-0 bg-white border-r border-slate-200 dark:bg-[#131826] dark:border-r dark:border-slate-800 group-hover:bg-slate-50 dark:group-hover:bg-[#182033] whitespace-nowrap z-10 min-w-[260px] w-[260px] transition-colors duration-200 ease-out">
                    <div className="flex flex-col justify-center text-left">
                      <div className="text-slate-900 dark:text-slate-100 font-medium text-[13px] tracking-wide truncate max-w-[220px]">
                        {row.emp_name}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-mono text-[11px] text-slate-400 dark:text-slate-400">{row.emp_id}</span>
                        {row.department && (
                          <>
                            <span className="text-slate-300 dark:text-slate-600">•</span>
                            <span className="truncate max-w-[100px]">{row.department}</span>
                          </>
                        )}
                        {summary && (summary.pl > 0 || summary.cl > 0 || summary.sl > 0) && (
                          <span className="text-[10px] text-purple-600 dark:text-purple-400/80 font-mono ml-auto">
                            {[
                              summary.pl ? `PL:${summary.pl}` : null,
                              summary.cl ? `CL:${summary.cl}` : null,
                              summary.sl ? `SL:${summary.sl}` : null,
                            ].filter(Boolean).join(' ')}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  {dates.map((d: any) => {
                    const log = logMap.get(`${String(row.emp_id)}_${d}`);
                    const rawId = String(row.emp_id || '');
                    const normId = rawId.replace(/^0+/, '').split('.')[0];
                    const nameKey = String(row.emp_name || '').trim().toUpperCase();
                    const empDoj = row.doj || dojMap.get(rawId) || dojMap.get(normId) || dojMap.get(nameKey) || null;
                    const val = resolveAttendanceStatus(log?.detailed_status_code, d, empDoj, log?.duration, lastRecordedDateStr);

                    return (
                      <td key={d} className="px-1.5 py-2 text-center min-w-[44px]">
                        <span className={`mx-auto transition-transform duration-200 ease-out hover:scale-110 will-change-transform ${getBadgeClasses(val)}`}>
                          {val === '1/2P' ? '½P' : (val === '3/4P' ? '¾P' : val)}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
});
