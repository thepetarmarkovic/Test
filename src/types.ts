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

export interface CompetitorProfile {
  id: string;
  name: string;
  avatar: string;
  weeklyHabits: number;
  weeklyEarnings: number;
  goalsCompleted: number;
  focusHours: number;
  weeklyPoints: number;
  achievements: Achievement[];
  isMe: boolean;
}

export interface PomodoroSession {
  id: string;
  task: string;
  duration: number;
  date: string;
  completed: boolean;
  type: 'work' | 'break';
}

export type Page = 'dashboard' | 'habits' | 'earnings' | 'sleep' | 'journal' | 'goals' | 'competition' | 'pomodoro';
