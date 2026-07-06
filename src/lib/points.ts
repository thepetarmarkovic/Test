import type {
  CompetitorProfile, Habit, EarningEntry, Goal,
  PomodoroSession, SleepEntry, JournalEntry,
} from '../types';
import { getLast7Days } from '../utils/formatters';

export const RANKS = [
  { label: 'RECRUIT',   min: 0,    color: '#555',    icon: '🎯' },
  { label: 'HUSTLER',   min: 100,  color: '#FF6B35', icon: '🔥' },
  { label: 'OPERATOR',  min: 250,  color: '#00D4FF', icon: '⚡' },
  { label: 'COMMANDER', min: 500,  color: '#7B61FF', icon: '⚔️' },
  { label: 'WARLORD',   min: 900,  color: '#FF4141', icon: '🦁' },
  { label: 'EMPEROR',   min: 1500, color: '#D4AF37', icon: '👑' },
];

export const getRank = (pts: number) =>
  [...RANKS].reverse().find(r => pts >= r.min) || RANKS[0];

export const CATEGORIES = [
  { key: 'habits',   label: 'HABITS',   icon: '🏃', color: '#FF6B35' },
  { key: 'earnings', label: 'EARNED',   icon: '💰', color: '#00FF87' },
  { key: 'goals',    label: 'GOALS',    icon: '🎯', color: '#D4AF37' },
  { key: 'focus',    label: 'FOCUS',    icon: '⏱',  color: '#00D4FF' },
  { key: 'sleep',    label: 'SLEEP',    icon: '🌙', color: '#7B61FF' },
  { key: 'journal',  label: 'JOURNAL',  icon: '📓', color: '#FF4141' },
] as const;

export type CategoryKey = typeof CATEGORIES[number]['key'];

export interface Breakdown { habits: number; earnings: number; goals: number; focus: number; sleep: number; journal: number }

export type PointsInput = Pick<CompetitorProfile,
  'weeklyHabits' | 'weeklyEarnings' | 'goalsCompleted' | 'focusHours' | 'sleepScore' | 'weeklyJournals'>;

export const calcBreakdown = (p: PointsInput): Breakdown => ({
  habits:   p.weeklyHabits * 10,
  earnings: Math.floor(p.weeklyEarnings / 100),
  goals:    p.goalsCompleted * 50,
  focus:    Math.floor(p.focusHours * 5),
  sleep:    Math.floor((p.sleepScore ?? 0) * 15),
  journal:  (p.weeklyJournals ?? 0) * 15,
});

export const calcPoints = (p: PointsInput): number => {
  const b = calcBreakdown(p);
  return b.habits + b.earnings + b.goals + b.focus + b.sleep + b.journal;
};

export interface MyStats {
  weeklyHabits: number;
  weeklyEarnings: number;
  goalsCompleted: number;
  focusHours: number;
  weeklyJournals: number;
  sleepScore: number;
}

export function computeMyStats(
  habits: Habit[], earnings: EarningEntry[], goals: Goal[],
  pomodoro: PomodoroSession[], sleep: SleepEntry[], journal: JournalEntry[],
): MyStats {
  const last7 = getLast7Days();
  const weeklyHabits = habits.reduce((s, h) => s + last7.filter(d => h.completions.includes(d)).length, 0);
  const weeklyEarnings = earnings.filter(e => last7.includes(e.date)).reduce((s, e) => s + e.amount, 0);
  const goalsCompleted = goals.filter(g => g.completed).length;
  const focusHours = parseFloat((pomodoro.filter(s => last7.includes(s.date) && s.completed && s.type === 'work').reduce((s, p) => s + p.duration, 0) / 60).toFixed(1));
  const weeklyJournals = journal.filter(j => last7.includes(j.date)).length;
  const sleepEntries = sleep.filter(s => last7.includes(s.date));
  const sleepScore = sleepEntries.length > 0
    ? parseFloat((sleepEntries.reduce((s, e) => s + e.quality, 0) / sleepEntries.length).toFixed(2))
    : 0;
  return { weeklyHabits, weeklyEarnings, goalsCompleted, focusHours, weeklyJournals, sleepScore };
}
