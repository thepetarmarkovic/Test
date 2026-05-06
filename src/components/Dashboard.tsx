import React, { useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadialBarChart, RadialBar
} from 'recharts';
import { TrendingUp, Flame, Moon, Target, Zap, ArrowUpRight } from 'lucide-react';
import type { Habit, EarningEntry, SleepEntry, Goal, PomodoroSession } from '../types';
import { formatCurrency, greetingByTime, getLast7Days, dayOfWeekShort, today } from '../utils/formatters';

const QUOTES = [
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "Success is not final, failure is not fatal: It is the courage to continue that counts.", author: "Winston Churchill" },
  { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
  { text: "The only place where success comes before work is in the dictionary.", author: "Vidal Sassoon" },
  { text: "Hard work beats talent when talent doesn't work hard.", author: "Tim Notke" },
  { text: "Your time is limited, so don't waste it living someone else's life.", author: "Steve Jobs" },
  { text: "Discipline is the bridge between goals and accomplishment.", author: "Jim Rohn" },
  { text: "Success usually comes to those who are too busy to be looking for it.", author: "Henry David Thoreau" },
  { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
  { text: "Opportunities don't happen. You create them.", author: "Chris Grosser" },
  { text: "Do what you can, with what you have, where you are.", author: "Theodore Roosevelt" },
];

interface Props {
  habits: Habit[];
  earnings: EarningEntry[];
  sleep: SleepEntry[];
  goals: Goal[];
  pomodoro: PomodoroSession[];
  userName: string;
  onNavigate: (p: string) => void;
}

function StatCard({ label, value, sub, icon, color, onClick }: {
  label: string; value: string; sub?: string; icon: React.ReactNode;
  color: string; onClick?: () => void;
}) {
  return (
    <div
      className="empire-card"
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default', flex: 1, minWidth: 0 }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div
          style={{
            width: 36, height: 36, borderRadius: 10,
            background: `${color}22`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color
          }}
        >
          {icon}
        </div>
        {onClick && <ArrowUpRight size={14} color="#444" />}
      </div>
      <div style={{ fontSize: 32, fontWeight: 800, lineHeight: 1, marginBottom: 4, color: '#fff' }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: '#555', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 }}>
        {label}
      </div>
      {sub && <div style={{ fontSize: 12, color: color, marginTop: 6, fontWeight: 500 }}>{sub}</div>}
    </div>
  );
}

export default function Dashboard({ habits, earnings, sleep, goals, pomodoro, userName, onNavigate }: Props) {
  const quoteIdx = useMemo(() => Math.floor(Date.now() / 86400000) % QUOTES.length, []);
  const quote = QUOTES[quoteIdx];

  const todayStr = today();
  const last7 = getLast7Days();

  const todayHabitsCompleted = habits.filter(h => h.completions.includes(todayStr)).length;
  const totalEarnings = earnings.reduce((s, e) => s + e.amount, 0);
  const recentSleep = sleep.slice(-1)[0];
  const activeGoals = goals.filter(g => !g.completed);
  const goalsProgress = activeGoals.length > 0
    ? Math.round(activeGoals.reduce((s, g) => s + Math.min(g.currentAmount / g.targetAmount, 1), 0) / activeGoals.length * 100)
    : 0;

  const todayPomodoro = pomodoro.filter(s => s.date === todayStr && s.completed && s.type === 'work');
  const todayFocusMin = todayPomodoro.reduce((s, p) => s + p.duration, 0);

  // 7-day earnings chart
  const earningsChart = last7.map(d => ({
    day: dayOfWeekShort(d),
    amount: earnings.filter(e => e.date === d).reduce((s, e) => s + e.amount, 0),
  }));

  // Habit completion last 7 days
  const habitChart = last7.map(d => ({
    day: dayOfWeekShort(d),
    pct: habits.length > 0
      ? Math.round(habits.filter(h => h.completions.includes(d)).length / habits.length * 100)
      : 0,
  }));

  const totalMoney = goals.filter(g => g.type === 'money').reduce((s, g) => s + g.targetAmount, 0);
  const earnedMoney = goals.filter(g => g.type === 'money').reduce((s, g) => s + g.currentAmount, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }} className="animate-fade-up">
      {/* Header */}
      <div>
        <div style={{ fontSize: 11, color: '#555', letterSpacing: '0.14em', marginBottom: 6, fontFamily: 'JetBrains Mono, monospace' }}>
          PROTOCOL ACTIVE — {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase()}
        </div>
        <h1
          style={{
            fontSize: 32, fontWeight: 900, letterSpacing: '-0.02em',
            background: 'linear-gradient(135deg, #ffffff 0%, #888 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            margin: 0,
          }}
        >
          {greetingByTime(userName || 'OPERATOR')}
        </h1>
      </div>

      {/* Quote */}
      <div
        className="empire-card"
        style={{
          background: 'linear-gradient(135deg, rgba(212,175,55,0.06) 0%, rgba(212,175,55,0.02) 100%)',
          borderColor: 'rgba(212,175,55,0.2)',
          padding: '20px 24px',
        }}
      >
        <div style={{ fontSize: 11, color: '#D4AF37', letterSpacing: '0.1em', marginBottom: 10, fontWeight: 700 }}>
          ◆ DAILY INTELLIGENCE
        </div>
        <blockquote style={{ margin: 0, fontSize: 15, color: '#ccc', fontStyle: 'italic', lineHeight: 1.6 }}>
          "{quote.text}"
        </blockquote>
        <cite style={{ display: 'block', marginTop: 8, fontSize: 12, color: '#D4AF37', fontStyle: 'normal', fontWeight: 600 }}>
          — {quote.author}
        </cite>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <StatCard
          label="Total Revenue"
          value={formatCurrency(totalEarnings)}
          icon={<TrendingUp size={18} />}
          color="#00FF87"
          onClick={() => onNavigate('earnings')}
          sub={`+${earnings.filter(e => e.date === todayStr).reduce((s, e) => s + e.amount, 0) > 0 ? formatCurrency(earnings.filter(e => e.date === todayStr).reduce((s, e) => s + e.amount, 0)) : '—'} today`}
        />
        <StatCard
          label="Habits Today"
          value={`${todayHabitsCompleted}/${habits.length}`}
          icon={<Flame size={18} />}
          color="#FF6B35"
          onClick={() => onNavigate('habits')}
          sub={habits.length > 0 ? `${Math.round(todayHabitsCompleted / habits.length * 100)}% complete` : 'Add habits'}
        />
        <StatCard
          label="Last Sleep"
          value={recentSleep ? `${recentSleep.hours}h` : '—'}
          icon={<Moon size={18} />}
          color="#7B61FF"
          onClick={() => onNavigate('sleep')}
          sub={recentSleep ? `Quality ${recentSleep.quality}/5` : 'Log sleep'}
        />
        <StatCard
          label="Goals Progress"
          value={`${goalsProgress}%`}
          icon={<Target size={18} />}
          color="#D4AF37"
          onClick={() => onNavigate('goals')}
          sub={`${activeGoals.length} active missions`}
        />
        <StatCard
          label="Focus Today"
          value={`${todayFocusMin}m`}
          icon={<Zap size={18} />}
          color="#00D4FF"
          onClick={() => onNavigate('pomodoro')}
          sub={`${todayPomodoro.length} sessions`}
        />
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Earnings Chart */}
        <div className="empire-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 11, color: '#555', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 2 }}>
                7-DAY REVENUE
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#00FF87' }}>
                {formatCurrency(earningsChart.reduce((s, d) => s + d.amount, 0))}
              </div>
            </div>
            <button
              onClick={() => onNavigate('earnings')}
              style={{ fontSize: 10, color: '#555', letterSpacing: '0.08em', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              VIEW ALL →
            </button>
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <AreaChart data={earningsChart} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="earningsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00FF87" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00FF87" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" tick={{ fill: '#555', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                contentStyle={{ background: '#0d0d0d', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 8, fontSize: 12 }}
                formatter={(v: number) => [formatCurrency(v), 'Revenue']}
                labelStyle={{ color: '#888' }}
              />
              <Area type="monotone" dataKey="amount" stroke="#00FF87" strokeWidth={2} fill="url(#earningsGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Habit Chart */}
        <div className="empire-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 11, color: '#555', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 2 }}>
                7-DAY HABIT RATE
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#D4AF37' }}>
                {habitChart.length > 0 ? `${Math.round(habitChart.reduce((s, d) => s + d.pct, 0) / 7)}%` : '—'}
              </div>
            </div>
            <button
              onClick={() => onNavigate('habits')}
              style={{ fontSize: 10, color: '#555', letterSpacing: '0.08em', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              VIEW ALL →
            </button>
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <AreaChart data={habitChart} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="habitGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" tick={{ fill: '#555', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis hide domain={[0, 100]} />
              <Tooltip
                contentStyle={{ background: '#0d0d0d', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 8, fontSize: 12 }}
                formatter={(v: number) => [`${v}%`, 'Completion']}
                labelStyle={{ color: '#888' }}
              />
              <Area type="monotone" dataKey="pct" stroke="#D4AF37" strokeWidth={2} fill="url(#habitGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Money Goal Progress */}
      {goals.filter(g => g.type === 'money' && !g.completed).length > 0 && (
        <div className="empire-card" style={{ borderColor: 'rgba(212,175,55,0.2)' }}>
          <div style={{ fontSize: 11, color: '#D4AF37', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 16 }}>
            ◆ MONEY MISSION STATUS
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {goals.filter(g => g.type === 'money' && !g.completed).slice(0, 3).map(g => {
              const pct = Math.min(Math.round(g.currentAmount / g.targetAmount * 100), 100);
              return (
                <div key={g.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#ccc' }}>{g.title}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#D4AF37' }}>
                      {formatCurrency(g.currentAmount)} / {formatCurrency(g.targetAmount)}
                    </span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <div style={{ fontSize: 10, color: '#555', marginTop: 4 }}>{pct}% COMPLETE</div>
                </div>
              );
            })}
          </div>
          <button onClick={() => onNavigate('goals')} className="btn-ghost" style={{ marginTop: 16, width: '100%', textAlign: 'center' }}>
            VIEW ALL MISSIONS →
          </button>
        </div>
      )}

      {/* Quick Actions */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {[
          { label: 'LOG EARNINGS', page: 'earnings', color: '#00FF87' },
          { label: 'CHECK HABITS', page: 'habits', color: '#FF6B35' },
          { label: 'FOCUS SESSION', page: 'pomodoro', color: '#00D4FF' },
          { label: 'JOURNAL ENTRY', page: 'journal', color: '#7B61FF' },
          { label: 'ENTER ARENA', page: 'competition', color: '#D4AF37' },
        ].map(a => (
          <button
            key={a.page}
            onClick={() => onNavigate(a.page)}
            className="btn-ghost"
            style={{ borderColor: `${a.color}33`, color: a.color, flex: 1, minWidth: 120 }}
          >
            {a.label}
          </button>
        ))}
      </div>
    </div>
  );
}
