import type { MementoSettings } from '../types';

const DAY = 86400000;

// All math on UTC day numbers built from LOCAL calendar components — immune to DST.
const toUtcDay = (y: number, m: number, d: number) => Math.floor(Date.UTC(y, m, d) / DAY);

const parseDay = (s: string): number | null => {
  const parts = s.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return null;
  return toUtcDay(parts[0], parts[1] - 1, parts[2]);
};

const todayDay = (now: Date = new Date()) =>
  toUtcDay(now.getFullYear(), now.getMonth(), now.getDate());

// Epoch day 0 = Thu 1970-01-01, so Monday ⇔ day % 7 === 4. Counts inclusive of both ends.
const mondaysInclusive = (from: number, to: number) =>
  to < from ? 0 : Math.floor((to - 4) / 7) - Math.floor((from - 5) / 7);

export function validateMemento(birthDate: string, lifeExpectancy: number): string | null {
  const birth = parseDay(birthDate);
  if (birth === null) return 'ENTER A VALID DATE OF BIRTH';
  const t = todayDay();
  if (birth > t) return 'YOU ARE NOT BORN YET';
  if (t - birth > 120 * 366) return 'NOBODY IS THAT OLD';
  if (!Number.isFinite(lifeExpectancy) || lifeExpectancy < 1 || lifeExpectancy > 120) {
    return 'LIFE EXPECTANCY MUST BE 1–120 YEARS';
  }
  return null;
}

export interface LifeMath {
  ageYears: number;
  ageDays: number;
  daysLived: number;
  weeksLived: number;
  currentWeekNumber: number;  // 1-based — "week 1,247 of your life"
  totalWeeks: number;
  weeksRemaining: number;
  pctElapsed: number;         // 0–100
  mondaysRemaining: number;
  summersRemaining: number;
  overtime: boolean;          // living past the projected end
}

export function computeLifeMath(s: MementoSettings, now: Date = new Date()): LifeMath {
  const [by, bm, bd] = s.birthDate.split('-').map(Number);
  const birthDay = toUtcDay(by, bm - 1, bd);
  const t = todayDay(now);
  const endDay = toUtcDay(by + s.lifeExpectancy, bm - 1, bd);

  const daysLived = Math.max(0, t - birthDay);
  const weeksLived = Math.floor(daysLived / 7);
  const totalWeeks = s.lifeExpectancy * 52;

  let ageYears = now.getFullYear() - by;
  if (toUtcDay(now.getFullYear(), bm - 1, bd) > t) ageYears--;
  const ageDays = t - toUtcDay(by + ageYears, bm - 1, bd);

  const totalDays = endDay - birthDay;
  const pctElapsed = Math.min(100, Math.max(0, (daysLived / totalDays) * 100));

  const mondaysRemaining = mondaysInclusive(t, endDay);

  let summersRemaining = 0;
  for (let y = now.getFullYear(); y <= by + s.lifeExpectancy; y++) {
    const solstice = toUtcDay(y, 5, 21);
    if (solstice >= t && solstice <= endDay) summersRemaining++;
  }

  return {
    ageYears,
    ageDays,
    daysLived,
    weeksLived,
    currentWeekNumber: weeksLived + 1,
    totalWeeks,
    weeksRemaining: Math.max(0, totalWeeks - weeksLived),
    pctElapsed,
    mondaysRemaining,
    summersRemaining,
    overtime: t > endDay,
  };
}
