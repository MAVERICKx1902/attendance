import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import localforage from 'localforage';

export interface AppState {
  employees: any[];
  attendanceLogs: any[];
  leaveBalances: any[];
  departments: Map<string, string>;
  selectedMonth: string;
  isLoaded: boolean;
}

interface AttendanceContextType extends AppState {
  setGlobalData: (data: Partial<AppState>) => void;
  setSelectedMonth: (month: string) => void;
  clearData: () => void;
  isInitializing: boolean;
}

const defaultState: AppState = {
  employees: [],
  attendanceLogs: [],
  leaveBalances: [],
  departments: new Map(),
  selectedMonth: '2026-08',
  isLoaded: false
};

const AttendanceContext = createContext<AttendanceContextType | undefined>(undefined);

export function AttendanceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(defaultState);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    async function loadCache() {
      try {
        const stored: any = await localforage.getItem('__autocrat_hms_state');
        if (stored) {
          if (stored.departments && Array.isArray(stored.departments)) {
            stored.departments = new Map(stored.departments);
          } else {
            stored.departments = new Map();
          }
          setState({ ...defaultState, ...stored });
        }
      } catch (e) {
        console.warn('Failed to parse cached state from IndexedDB', e);
      } finally {
        setIsInitializing(false);
      }
    }
    loadCache();
  }, []);

  useEffect(() => {
    if (isInitializing) return;
    async function saveCache() {
      try {
        const serialized = {
          ...state,
          departments: Array.from(state.departments.entries())
        };
        await localforage.setItem('__autocrat_hms_state', serialized);
      } catch (e) {
        console.warn('Failed to save state to IndexedDB', e);
      }
    }
    saveCache();
  }, [state, isInitializing]);

  const setGlobalData = (data: Partial<AppState>) => {
    setState(prev => ({ ...prev, ...data, isLoaded: true }));
  };

  const setSelectedMonth = (month: string) => {
    setState(prev => ({ ...prev, selectedMonth: month }));
  };

  const clearData = async () => {
    setState(defaultState);
    await localforage.removeItem('__autocrat_hms_state');
  };

  return (
    <AttendanceContext.Provider value={{ ...state, setGlobalData, setSelectedMonth, clearData, isInitializing }}>
      {children}
    </AttendanceContext.Provider>
  );
}

export function useAttendanceStore() {
  const context = useContext(AttendanceContext);
  if (!context) {
    throw new Error('useAttendanceStore must be used within an AttendanceProvider');
  }
  return context;
}
