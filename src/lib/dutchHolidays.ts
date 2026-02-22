/**
 * Dutch holidays calculation using Gauss/Meeus Easter algorithm.
 * Covers fixed + Easter-based moveable holidays.
 */

interface Holiday {
  date: Date;
  name: string;
}

/** Gauss/Meeus algorithm to calculate Easter Sunday */
function getEasterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function getHolidaysForYear(year: number): Holiday[] {
  const easter = getEasterSunday(year);
  const holidays: Holiday[] = [
    { date: new Date(year, 0, 1), name: 'Nieuwjaar' },
    { date: addDays(easter, -2), name: 'Goede Vrijdag' },
    { date: easter, name: '1e Paasdag' },
    { date: addDays(easter, 1), name: '2e Paasdag' },
    { date: new Date(year, 3, 27), name: 'Koningsdag' },
    { date: addDays(easter, 39), name: 'Hemelvaart' },
    { date: addDays(easter, 49), name: '1e Pinksterdag' },
    { date: addDays(easter, 50), name: '2e Pinksterdag' },
    { date: new Date(year, 11, 25), name: '1e Kerstdag' },
    { date: new Date(year, 11, 26), name: '2e Kerstdag' },
  ];

  // Bevrijdingsdag only on lustrum years (divisible by 5)
  if (year % 5 === 0) {
    holidays.push({ date: new Date(year, 4, 5), name: 'Bevrijdingsdag' });
  }

  return holidays;
}

export function getHolidaysForMonth(year: number, month: number): Holiday[] {
  return getHolidaysForYear(year).filter(
    (h) => h.date.getFullYear() === year && h.date.getMonth() === month
  );
}

export function getHolidayForDate(date: Date): string | null {
  const holidays = getHolidaysForYear(date.getFullYear());
  const match = holidays.find(
    (h) =>
      h.date.getFullYear() === date.getFullYear() &&
      h.date.getMonth() === date.getMonth() &&
      h.date.getDate() === date.getDate()
  );
  return match?.name ?? null;
}
