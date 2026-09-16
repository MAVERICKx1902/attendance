export type StatusCode = 'P' | '3/4P' | '1/2P' | 'WO' | 'H' | 'PL' | 'CL' | 'SL' | 'A' | '-';

export interface Employee {
  empId: string;
  empCode: string;
  empName: string;
  departmentId: string;
  departmentName: string;
  designation: string;
  doj: Date | null;
  dojFormatted: string;
  email?: string;
  location?: string;
  managerId?: string | null;
  managerName?: string | null;
}

export interface AttendanceRecord {
  empId: string;
  attendanceDate: string; // YYYY-MM-DD
  inTime: string;
  outTime: string;
  durationMinutes: number;
  durationHours: number;
  statusCode: StatusCode;
  detailedStatusCode?: string;
}

export interface LeaveBalance {
  empId: string;
  year: number;
  plTotal: number;
  plUsed: number;
  clTotal: number;
  clUsed: number;
  slTotal: number;
  slUsed: number;
  lwpUsed: number;
}
