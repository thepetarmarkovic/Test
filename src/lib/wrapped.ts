import type {
  Habit, EarningEntry, SleepEntry, JournalEntry, PomodoroSession,
  WrappedRecord, WrappedStats,
} from '../types';
import { calcPoints } from './points';
import { today } from '../utils/formatters';

const fmt = (d: Date) => d.toISOString().split('T')[0];

function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return fmt(dt);
}

// Monday of the ISO week containing the given date
function weekStart(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const dow = (dt.getUTCDay() + 6) % 7; // Mon=0
  return addDays(iso, -dow);
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

function periodLabel(kind: WrappedRecord['kind'], start: string, end: string): string {
  const [sy, sm, sd] = start.split('-').map(Number);
  if (kind === 'weekly') {
    const [, em, ed] = end.split('-').map(Number);
    return `WEEK OF ${MONTHS[sm - 1]} ${sd}–${sm === em ? '' : MONTHS[em - 1] + ' '}${ed}, ${sy}`;
  }
  if (kind === 'monthly') return `${MONTHS[sm - 1]} ${sy}`;
  return `YEAR ${sy}`;
}

export function computeStats(
  start: string, end: string,
  habits: Habit[], earnings: EarningEntry[], sleep: SleepEntry[],
  journal: JournalEntry[], pomodoro: PomodoroSession[],
): WrappedStats {
  const inRange = (d: string) => d >= start && d <= end;

  const periodEarnings = earnings.filter(e => inRange(e.date));
  const earned = periodEarnings.reduce((s, e) => s + e.amount, 0);
  const biggest = periodEarnings.reduce<EarningEntry | null>(
    (best, e) => (!best || e.amount > best.amount) ? e : best, null);

  const habitCompletions = habits.reduce(
    (s, h) => s + h.completions.filter(inRange).length, 0);

  const focusMin = pomodoro
    .filter(s => inRange(s.date) && s.completed && s.type === 'work')
    .reduce((s, p) => s + p.duration, 0);

  const journalEntries = journal.filter(j => inRange(j.date)).length;

  const sleepInRange = sleep.filter(s => inRange(s.date));
  const sleepScore = sleepInRange.length > 0
    ? parseFloat((sleepInRange.reduce((s, e) => s + e.quality, 0) / sleepInRange.length).toFixed(2))
    : 0;

  const days = new Set<string>();
  periodEarnings.forEach(e => days.add(e.date));
  habits.forEach(h => h.completions.filter(inRange).forEach(d => days.add(d)));
  journal.filter(j => inRange(j.date)).forEach(j => days.add(j.date));
  pomodoro.filter(s => inRange(s.date) && s.completed).forEach(s => days.add(s.date));
  sleepInRange.forEach(s => days.add(s.date));

  return {
    earnings: earned,
    habitCompletions,
    focusHours: parseFloat((focusMin / 60).toFixed(1)),
    journalEntries,
    sleepScore,
    activeDays: days.size,
    biggestWin: biggest ? { amount: biggest.amount, source: biggest.source, date: biggest.date } : undefined,
  };
}

export function statsPoints(s: WrappedStats): number {
  return calcPoints({
    weeklyHabits: s.habitCompletions,
    weeklyEarnings: s.earnings,
    goalsCompleted: 0,
    focusHours: s.focusHours,
    sleepScore: s.sleepScore,
    weeklyJournals: s.journalEntries,
  });
}

const hasActivity = (s: WrappedStats) =>
  s.earnings > 0 || s.habitCompletions > 0 || s.focusHours > 0 || s.journalEntries > 0 || s.sleepScore > 0;

// Compile every COMPLETED period that is missing from `existing` and has
// activity. Weekly backfills up to 12 weeks, monthly 12 months, yearly 5 years.
// Append-only: existing records are never modified or removed.
export function compileMissing(
  existing: WrappedRecord[],
  habits: Habit[], earnings: EarningEntry[], sleep: SleepEntry[],
  journal: JournalEntry[], pomodoro: PomodoroSession[],
): WrappedRecord[] {
  const t = today();
  const have = new Set(existing.map(r => r.id));
  const fresh: WrappedRecord[] = [];

  const push = (kind: WrappedRecord['kind'], start: string, end: string) => {
    const id = `${kind}-${start}`;
    if (have.has(id) || end >= t) return;   // only fully-completed periods
    const stats = computeStats(start, end, habits, earnings, sleep, journal, pomodoro);
    if (!hasActivity(stats)) return;
    fresh.push({
      id, kind, startDate: start, endDate: end,
      label: periodLabel(kind, start, end),
      stats, points: statsPoints(stats), createdAt: t,
    });
  };

  // Weekly: last 12 completed ISO weeks
  let ws = weekStart(addDays(t, -7));
  for (let i = 0; i < 12; i++) {
    push('weekly', ws, addDays(ws, 6));
    ws = addDays(ws, -7);
  }

  // Monthly: last 12 completed calendar months
  const [ty, tm] = t.split('-').map(Number);
  for (let i = 1; i <= 12; i++) {
    const d = new Date(Date.UTC(ty, tm - 1 - i, 1));
    const start = fmt(d);
    const end = fmt(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)));
    push('monthly', start, end);
  }

  // Yearly: last 5 completed years
  for (let y = ty - 1; y >= ty - 5; y--) {
    push('yearly', `${y}-01-01`, `${y}-12-31`);
  }

  return fresh;
}

// Live (in-progress) period stats for the "current week so far" card.
export function currentWeekSoFar(
  habits: Habit[], earnings: EarningEntry[], sleep: SleepEntry[],
  journal: JournalEntry[], pomodoro: PomodoroSession[],
): { start: string; end: string; label: string; stats: WrappedStats; points: number } {
  const t = today();
  const start = weekStart(t);
  const stats = computeStats(start, t, habits, earnings, sleep, journal, pomodoro);
  return { start, end: t, label: periodLabel('weekly', start, addDays(start, 6)), stats, points: statsPoints(stats) };
}
