import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { useAttendanceStore } from '../../store/AttendanceStore';

export function MonthNavigator() {
  const store = useAttendanceStore();

  const availableMonths = useMemo(() => {
    if (!store.attendanceLogs || store.attendanceLogs.length === 0) {
      return [store.selectedMonth];
    }
    const months = new Set<string>();
    store.attendanceLogs.forEach(l => {
      if (l.date && l.date.length >= 7) {
        months.add(l.date.substring(0, 7)); // YYYY-MM
      }
    });
    
    // Sort chronologically (oldest to newest)
    return Array.from(months).sort();
  }, [store.attendanceLogs, store.selectedMonth]);

  const currentIndex = availableMonths.indexOf(store.selectedMonth);

  const handlePrev = () => {
    if (currentIndex > 0) {
      store.setSelectedMonth(availableMonths[currentIndex - 1]);
    }
  };

  const handleNext = () => {
    if (currentIndex < availableMonths.length - 1) {
      store.setSelectedMonth(availableMonths[currentIndex + 1]);
    }
  };

  const formatMonthLabel = (yyyyMm: string) => {
    if (!yyyyMm || !yyyyMm.includes('-')) return yyyyMm;
    const [y, m] = yyyyMm.split('-');
    const date = new Date(parseInt(y), parseInt(m) - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  return (
    <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-1 shadow-sm h-10 w-fit">
      <button 
        onClick={handlePrev}
        disabled={currentIndex <= 0}
        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-slate-600"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      <div className="relative flex items-center min-w-[140px] justify-center">
        <Calendar className="w-4 h-4 text-slate-400 absolute left-2 pointer-events-none" />
        <select 
          value={store.selectedMonth}
          onChange={(e) => store.setSelectedMonth(e.target.value)}
          className="appearance-none bg-transparent pl-8 pr-6 py-1 text-[13px] font-bold text-slate-700 outline-none cursor-pointer w-full text-center hover:text-blue-600 transition-colors"
        >
          {availableMonths.map(m => (
            <option key={m} value={m}>{formatMonthLabel(m)}</option>
          ))}
        </select>
      </div>

      <button 
        onClick={handleNext}
        disabled={currentIndex === -1 || currentIndex >= availableMonths.length - 1}
        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-slate-600"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
}
