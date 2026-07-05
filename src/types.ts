export interface Habit {
  id: string;
  name: string;
  emoji: string;
  category: string;
  completions: string[];
  createdAt: string;
}

export interface EarningEntry {
  id: string;
  amount: number;
  source: string;
  category: 'salary' | 'freelance' | 'investment' | 'business' | 'other';
  date: string;
  notes: string;
}

export interface SleepEntry {
  id: string;
  date: string;
  hours: number;
  quality: 1 | 2 | 3 | 4 | 5;
  notes: string;
}

export interface JournalEntry {
  id: string;
  date: string;
  title: string;
  content: string;
  mood: 'crushing' | 'focused' | 'neutral' | 'off' | 'rough';
  tags: string[];
}

export interface Milestone {
  id: string;
  label: string;
  targetAmount: number;
  achieved: boolean;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  type: 'money' | 'career' | 'personal' | 'health' | 'learning';
  targetAmount: number;
  currentAmount: number;
  unit: string;
  deadline: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  milestones: Milestone[];
  completed: boolean;
  createdAt: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  date: string;
  category: string;
  icon: string;
}

export interface ExpenseEntry {
  id: string;
  amount: number;
  description: string;
  category: 'housing' | 'food' | 'transport' | 'subscriptions' | 'entertainment' | 'health' | 'business' | 'other';
  date: string;
  notes: string;
}

export interface CompetitorProfile {
  id: string;
  name: string;
  avatar: string;
  operatorId?: string;
  weeklyHabits: number;
  weeklyEarnings: number;
  goalsCompleted: number;
  focusHours: number;
  weeklyPoints: number;
  achievements: Achievement[];
  isMe: boolean;
  // Extended intel — identity
  occupation?: string;
  age?: number;
  location?: string;
  instagram?: string;
  twitter?: string;
  notes?: string;
  // Financial
  monthlyRevenue?: number;
  monthlyExpenses?: number;
  netWorth?: number;
  // Schedule & habits
  wakeTime?: string;
  sleepTime?: string;
  dailyActivities?: string[];   // e.g. ["Gym", "Cold shower", "Reading"]
  // Performance
  currentStreak?: number;
  bestWeekPoints?: number;
  allTimePoints?: number;
  monthlyHabits?: number;
  weeklyFocusHours?: number;
  // Goals & mindset
  currentGoals?: string;
  strengths?: string;
  weaknesses?: string;
  // Points history for chart  { week: "2025-W01", points: 340 }
  pointsHistory?: { week: string; points: number }[];
  // Freeform custom key-value
  customStats?: { label: string; value: string }[];
  lastSync?: string;
  // Tracked weekly stats (synced via Firebase)
  weeklyJournals?: number;
  sleepScore?: number;  // avg quality 0-5 over last 7 days
}

export interface PomodoroSession {
  id: string;
  task: string;
  duration: number;
  date: string;
  completed: boolean;
  type: 'work' | 'break';
}

// Finance types
export interface Asset {
  id: string;
  name: string;
  category: 'cash' | 'investment' | 'property' | 'crypto' | 'vehicle' | 'other';
  value: number;
  date: string;
  notes: string;
}

export interface Liability {
  id: string;
  name: string;
  category: 'mortgage' | 'loan' | 'credit' | 'other';
  value: number;
  date: string;
  notes: string;
}

export interface NetWorthSnapshot {
  id: string;
  date: string;
  netWorth: number;
  assets: number;
  liabilities: number;
}

export interface BudgetCategory {
  id: string;
  name: string;
  emoji: string;
  budgeted: number;
  spent: number;
  color: string;
}

export interface Subscription {
  id: string;
  name: string;
  emoji: string;
  amount: number;
  frequency: 'monthly' | 'yearly';
  category: string;
  active: boolean;
  color: string;
}

export interface PortfolioItem {
  id: string;
  symbol: string;
  name: string;
  shares: number;
  avgPrice: number;
  currentPrice: number;
  category: 'stock' | 'crypto' | 'etf' | 'other';
}

export interface FireSettings {
  monthlyExpenses: number;
  monthlySavings: number;
  currentSavings: number;
  expectedReturn: number;
}

export type Page = 'dashboard' | 'habits' | 'earnings' | 'sleep' | 'journal' | 'goals' | 'competition' | 'pomodoro' | 'finance' | 'memento' | 'showroom';

export type ExhibitKind = 'panamera' | 'motorcycle' | 'exitdoor';

export interface ExhibitConfig {
  id: string;
  title: string;
  kind: ExhibitKind;
  target: number;                             // amount that means 100%
  source: 'lifetime' | 'monthly' | 'goal';    // where progress is read from
  goalId?: string;                            // when source === 'goal'
  completedAt?: string;                       // set once, never removed
  hasImage?: boolean;                         // photo stored in asset DB under exh-img-<id>
  hasModel?: boolean;                         // .glb stored in asset DB under exh-glb-<id>
}

export interface MementoSettings {
  birthDate: string;       // 'yyyy-mm-dd'
  lifeExpectancy: number;  // years
}

export interface BriefingSnapshot {
  date: string;
  standings: { id: string; name: string; points: number }[];
}
