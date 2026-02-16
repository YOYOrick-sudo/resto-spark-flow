// ============================================
// Temporary pacing mock data
// Extracted from data/reservations.ts for settings pages
// Will be replaced when pacing settings move to database
// ============================================

export interface PacingSettings {
  defaultLimitPerQuarter: number;
  shiftOverrides?: {
    lunch?: number;
    dinner?: number;
  };
  shiftTimes?: {
    lunch?: { start: string; end: string };
    dinner?: { start: string; end: string };
  };
}

export let mockPacingSettings: PacingSettings = {
  defaultLimitPerQuarter: 12,
  shiftOverrides: {
    lunch: 10,
    dinner: 14,
  },
  shiftTimes: {
    lunch: { start: "11:00", end: "15:00" },
    dinner: { start: "17:00", end: "23:00" },
  },
};

export function updatePacingSettings(newSettings: Partial<PacingSettings>): void {
  mockPacingSettings = {
    ...mockPacingSettings,
    ...newSettings,
    shiftOverrides: {
      ...mockPacingSettings.shiftOverrides,
      ...newSettings.shiftOverrides,
    },
    shiftTimes: {
      ...mockPacingSettings.shiftTimes,
      ...newSettings.shiftTimes,
    },
  };
}

export function getPacingLimitForTime(time: string): number {
  const hour = parseInt(time.split(':')[0]);
  const minute = parseInt(time.split(':')[1] || '0');
  const timeMinutes = hour * 60 + minute;

  const lunchStart = mockPacingSettings.shiftTimes?.lunch?.start || "11:00";
  const lunchEnd = mockPacingSettings.shiftTimes?.lunch?.end || "15:00";
  const dinnerStart = mockPacingSettings.shiftTimes?.dinner?.start || "17:00";
  const dinnerEnd = mockPacingSettings.shiftTimes?.dinner?.end || "23:00";

  const [lsH, lsM] = lunchStart.split(':').map(Number);
  const [leH, leM] = lunchEnd.split(':').map(Number);
  const [dsH, dsM] = dinnerStart.split(':').map(Number);
  const [deH, deM] = dinnerEnd.split(':').map(Number);

  const lunchStartMin = lsH * 60 + lsM;
  const lunchEndMin = leH * 60 + leM;
  const dinnerStartMin = dsH * 60 + dsM;
  const dinnerEndMin = deH * 60 + deM;

  if (timeMinutes >= lunchStartMin && timeMinutes < lunchEndMin && mockPacingSettings.shiftOverrides?.lunch) {
    return mockPacingSettings.shiftOverrides.lunch;
  }
  if (timeMinutes >= dinnerStartMin && timeMinutes < dinnerEndMin && mockPacingSettings.shiftOverrides?.dinner) {
    return mockPacingSettings.shiftOverrides.dinner;
  }
  return mockPacingSettings.defaultLimitPerQuarter;
}

// Mock tables for pacing capacity calculations
export interface MockTable {
  id: string;
  number: number;
  minCapacity: number;
  maxCapacity: number;
  isActive: boolean;
}

export const mockTables: MockTable[] = [
  { id: 'table-1', number: 1, minCapacity: 2, maxCapacity: 2, isActive: true },
  { id: 'table-2', number: 2, minCapacity: 2, maxCapacity: 4, isActive: true },
  { id: 'table-3', number: 3, minCapacity: 4, maxCapacity: 6, isActive: true },
  { id: 'table-4', number: 4, minCapacity: 2, maxCapacity: 2, isActive: true },
  { id: 'table-5', number: 5, minCapacity: 6, maxCapacity: 8, isActive: true },
  { id: 'table-6', number: 6, minCapacity: 2, maxCapacity: 4, isActive: true },
  { id: 'table-100', number: 100, minCapacity: 2, maxCapacity: 2, isActive: true },
  { id: 'table-101', number: 101, minCapacity: 2, maxCapacity: 2, isActive: true },
  { id: 'table-102', number: 102, minCapacity: 2, maxCapacity: 2, isActive: true },
  { id: 'table-103', number: 103, minCapacity: 2, maxCapacity: 2, isActive: true },
  { id: 'table-200', number: 200, minCapacity: 2, maxCapacity: 2, isActive: true },
  { id: 'table-201', number: 201, minCapacity: 2, maxCapacity: 4, isActive: true },
  { id: 'table-202', number: 202, minCapacity: 2, maxCapacity: 2, isActive: true },
  { id: 'table-300', number: 300, minCapacity: 2, maxCapacity: 4, isActive: true },
  { id: 'table-301', number: 301, minCapacity: 4, maxCapacity: 6, isActive: true },
  { id: 'table-302', number: 302, minCapacity: 2, maxCapacity: 2, isActive: true },
  { id: 'table-303', number: 303, minCapacity: 2, maxCapacity: 4, isActive: true },
  { id: 'table-304', number: 304, minCapacity: 6, maxCapacity: 8, isActive: true },
];
