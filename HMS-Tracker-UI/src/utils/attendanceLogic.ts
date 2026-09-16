export function normalizeToDateString(val: any): string | null {
  if (!val) return null;
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null;
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const s = String(val).trim();
  if (!s || s === 'null' || s === 'undefined' || s === '-' || s.toLowerCase() === 'nan') return null;

  // Match YYYY-MM-DD
  const matchIso = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (matchIso) {
    const y = matchIso[1];
    const m = String(matchIso[2]).padStart(2, '0');
    const d = String(matchIso[3]).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Match DD-MM-YYYY or DD/MM/YYYY
  const matchDmy = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (matchDmy) {
    const d = String(matchDmy[1]).padStart(2, '0');
    const m = String(matchDmy[2]).padStart(2, '0');
    const y = matchDmy[3];
    return `${y}-${m}-${d}`;
  }

  // Fallback to Date parser
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return null;
}

export function resolveAttendanceStatus(
  detailedCode: string | undefined | null,
  punchDateStr: string,         // "YYYY-MM-DD"
  employeeDojStr: any,          // "YYYY-MM-DD" or Date object or any date string
  durationStr?: string | null,   // "HH:MM"
  cutoffDateStr?: any           // "YYYY-MM-DD" or Date object
): 'P' | '3/4P' | '1/2P' | 'WO' | 'H' | 'PL' | 'CL' | 'SL' | 'A' | '-' {
  const normPunch = normalizeToDateString(punchDateStr) || punchDateStr;
  const normDoj = normalizeToDateString(employeeDojStr);

  // Universal Pre-DOJ Guard: If punch is before DOJ, strictly return '-'
  if (normDoj && normPunch < normDoj) {
    return '-'; 
  }

  // Future / Cutoff Guard: If punch is after data collection cutoff, strictly return '-'
  const normCutoff = normalizeToDateString(cutoffDateStr);
  if (normCutoff && normPunch > normCutoff) {
    return '-';
  }

  const code = String(detailedCode || '').trim().toUpperCase();

  // If it's a specified leave, respect it immediately
  if (code === 'WO' || code === 'WOA' || code.includes('WEEKLYOFF')) return 'WO';
  if (code === 'HO' || code === 'HOA' || code.includes('HOLIDAY')) return 'H';

  if (code === 'L(CL)' || code === 'ALD(CL)' || code === 'CL') return 'CL';
  if (code === 'L(PL)' || code === 'ALD(PL)' || code === 'PL') return 'PL';
  if (code === 'L(SL)' || code === 'ALD(SL)' || code === 'SL') return 'SL';

  if (code.includes('¾') || code.includes('3/4') || code.includes('¼') || code === '¾PLD') return '3/4P';
  if (code.includes('½') || code.includes('1/2') || code.startsWith('½P') || code.startsWith('½PLD') || code === 'HD') return '1/2P';

  // If we have duration, verify the half-day / 3/4 day / full day logic
  if (durationStr && durationStr !== 'nan') {
    let hours = 0;
    if (durationStr.includes(':')) {
      const parts = durationStr.split(':');
      hours = parseInt(parts[0] || '0') + parseInt(parts[1] || '0') / 60;
    } else {
      hours = parseFloat(durationStr) || 0;
    }

    if (hours >= 8.0) return 'P';
    if (hours >= 5.5) return '3/4P';
    if (hours >= 4.5) return '1/2P';
    if (hours > 0) return 'A'; // Anything less than 4.5 is absent
  }

  // Fallbacks if no duration is provided or duration is 0
  if (code === 'P' || code.includes('PRESENT')) return 'P';
  
  // If it's a Sunday and they didn't explicitly work (duration is 0), it's a Weekly Off
  if (new Date(punchDateStr + 'T00:00:00').getDay() === 0) return 'WO';

  if (code === 'A' || code === 'ALD' || code.includes('ABSENT')) return 'A';

  return 'A';
}

