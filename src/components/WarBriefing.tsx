import React, { useMemo } from 'react';
import { Skull, Swords, Crosshair, TrendingUp } from 'lucide-react';
import type {
  Habit, EarningEntry, Goal, PomodoroSession, SleepEntry, JournalEntry,
  CompetitorProfile, MementoSettings, BriefingSnapshot,
} from '../types';
import { calcPoints, getRank, computeMyStats } from '../lib/points';
import { computeLifeMath, validateMemento } from '../lib/memento';
import { greetingByTime, today, getLastNDays } from '../utils/formatters';

interface Props {
  userName: string;
  habits: Habit[];
  earnings: EarningEntry[];
  goals: Goal[];
  pomodoro: PomodoroSession[];
  sleep: SleepEntry[];
  journal: JournalEntry[];
  competitors: CompetitorProfile[];
  memento: MementoSettings | null;
  previousSnapshot: BriefingSnapshot | null;
  onDismiss: (snap: BriefingSnapshot) => void;
}

interface Directive { text: string; color: string; icon: string }

function buildDirectives(
  habits: Habit[], sleep: SleepEntry[], journal: JournalEntry[], goals: Goal[],
  focusHours: number,
): Directive[] {
  const out: Directive[] = [];
  const t = today();
  const last3 = getLastNDays(3);
  const yesterday = getLastNDays(2)[0];

  if (habits.length > 0 && !habits.some(h => h.completions.includes(t))) {
    out.push({ text: `COMPLETE ${habits.length} HABIT CHECK-IN${habits.length > 1 ? 'S' : ''}`, color: '#FF6B35', icon: '🏃' });
  }
  if (!journal.some(j => last3.includes(j.date))) {
    out.push({ text: 'FILE A JOURNAL ENTRY — INTEL LOG IS COLD', color: '#FF4141', icon: '📓' });
  }
  if (!sleep.some(s => s.date === yesterday)) {
    out.push({ text: "LOG LAST NIGHT'S SLEEP", color: '#7B61FF', icon: '🌙' });
  }
  if (focusHours < 5) {
    out.push({ text: `RUN A FOCUS BLOCK — ${focusHours}H / 5H THIS WEEK`, color: '#00D4FF', icon: '⏱' });
  }
  const soonest = goals
    .filter(g => !g.completed && g.deadline)
    .map(g => {
      const [y, m, d] = g.deadline.split('-').map(Number);
      const [ty, tm, td] = t.split('-').map(Number);
      const days = Math.floor((Date.UTC(y, m - 1, d) - Date.UTC(ty, tm - 1, td)) / 86400000);
      return { g, days };
    })
    .filter(x => x.days >= 0 && x.days <= 14)
    .sort((a, b) => a.days - b.days)[0];
  if (soonest) {
    out.push({ text: `PUSH: ${soonest.g.title.toUpperCase()} — ${soonest.days}D TO DEADLINE`, color: '#D4AF37', icon: '🎯' });
  }
  return out.slice(0, 4);
}

export default function WarBriefing({
  userName, habits, earnings, goals, pomodoro, sleep, journal,
  competitors, memento, previousSnapshot, onDismiss,
}: Props) {
  const briefing = useMemo(() => {
    const stats = computeMyStats(habits, earnings, goals, pomodoro, sleep, journal);
    const myPoints = calcPoints(stats);
    const standings = [
      { id: 'me', name: userName || 'YOU', points: myPoints, isMe: true },
      ...competitors.map(c => ({ id: c.id, name: c.name, points: calcPoints(c), isMe: false })),
    ].sort((a, b) => b.points - a.points);
    const myPos = standings.findIndex(s => s.isMe) + 1;
    const rank = getRank(myPoints);

    const movement = previousSnapshot && competitors.length > 0
      ? competitors
          .map(c => {
            const prev = previousSnapshot.standings.find(s => s.id === c.id);
            return {
              name: c.name, avatar: c.avatar,
              delta: prev ? calcPoints(c) - prev.points : null,
            };
          })
          .sort((a, b) => (b.delta ?? -Infinity) - (a.delta ?? -Infinity))
      : null;

    const directives = buildDirectives(habits, sleep, journal, goals, stats.focusHours);

    const mondays = memento && !validateMemento(memento.birthDate, memento.lifeExpectancy)
      ? computeLifeMath(memento).mondaysRemaining
      : null;

    return { stats, myPoints, standings, myPos, rank, movement, directives, mondays };
  }, [habits, earnings, goals, pomodoro, sleep, journal, competitors, memento, previousSnapshot, userName]);

  const { myPoints, standings, myPos, rank, movement, directives, mondays } = briefing;
  const leader = standings[0];
  const runnerUp = standings[1];
  const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase();
  const yesterdayStr = getLastNDays(2)[0];
  const snapshotStale = previousSnapshot && previousSnapshot.date !== yesterdayStr && previousSnapshot.date !== today();

  const dismiss = () => {
    onDismiss({
      date: today(),
      standings: standings.map(({ id, name, points }) => ({ id, name, points })),
    });
  };

  return (
    <div
      className="dot-bg"
      style={{ position: 'fixed', inset: 0, zIndex: 100, background: '#050505', overflowY: 'auto' }}
    >
      <div className="animate-fade-up" style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px 64px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <div style={{ fontSize: 11, color: '#555', letterSpacing: '0.14em', fontFamily: 'JetBrains Mono, monospace', marginBottom: 8 }}>
            ⚔ WAR BRIEFING — {dateStr}
          </div>
          <h1 style={{
            fontSize: 30, fontWeight: 900, margin: 0,
            background: 'linear-gradient(135deg, #ffffff 0%, #888 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            {greetingByTime(userName || 'OPERATOR')}
          </h1>
        </div>

        {/* Arena standings */}
        <div className="empire-card" style={{ borderColor: `${rank.color}30` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Swords size={14} color={rank.color} />
            <span style={{ fontSize: 11, color: rank.color, letterSpacing: '0.1em', fontWeight: 700 }}>ARENA STANDINGS</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ fontSize: 36, fontWeight: 900, color: rank.color, fontFamily: 'JetBrains Mono, monospace' }}>
                #{myPos}
              </div>
              <div>
                <div style={{ fontSize: 10, color: '#555', letterSpacing: '0.08em' }}>OF {standings.length} IN THE ARENA</div>
                <span style={{ fontSize: 11, color: rank.color, background: `${rank.color}15`, padding: '3px 10px', borderRadius: 20, fontWeight: 700, border: `1px solid ${rank.color}30`, display: 'inline-block', marginTop: 4 }}>
                  {rank.icon} {rank.label} · {myPoints} PTS
                </span>
              </div>
            </div>
            {standings.length > 1 && (
              myPos === 1 ? (
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 18, fontWeight: 900, color: '#D4AF37', fontFamily: 'JetBrains Mono, monospace' }}>+{myPoints - runnerUp.points}</div>
                  <div style={{ fontSize: 9, color: '#555', letterSpacing: '0.08em' }}>LEAD MARGIN — DEFEND IT</div>
                </div>
              ) : (
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 18, fontWeight: 900, color: '#FF4141', fontFamily: 'JetBrains Mono, monospace' }}>{leader.points - myPoints} PTS</div>
                  <div style={{ fontSize: 9, color: '#555', letterSpacing: '0.08em' }}>BEHIND {leader.name.toUpperCase()}</div>
                </div>
              )
            )}
            {standings.length === 1 && (
              <div style={{ fontSize: 11, color: '#444', fontStyle: 'italic' }}>NO RIVALS TRACKED</div>
            )}
          </div>
        </div>

        {/* Overnight movement */}
        {movement && (
          <div className="empire-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <TrendingUp size={14} color="#00D4FF" />
              <span style={{ fontSize: 11, color: '#00D4FF', letterSpacing: '0.1em', fontWeight: 700 }}>
                OVERNIGHT MOVEMENT{snapshotStale ? ` (SINCE ${previousSnapshot!.date})` : ''}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {movement.map((mv, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#111', borderRadius: 8 }}>
                  <span style={{ fontSize: 12, color: '#ccc', fontWeight: 700 }}>{mv.avatar} {mv.name.toUpperCase()}</span>
                  {mv.delta === null ? (
                    <span style={{ fontSize: 11, color: '#7B61FF', fontWeight: 700 }}>NEW CONTENDER</span>
                  ) : mv.delta > 0 ? (
                    <span style={{ fontSize: 12, color: '#FF4141', fontWeight: 800, fontFamily: 'JetBrains Mono, monospace' }}>+{mv.delta} ▲</span>
                  ) : mv.delta < 0 ? (
                    <span style={{ fontSize: 12, color: '#00FF87', fontWeight: 800, fontFamily: 'JetBrains Mono, monospace' }}>{mv.delta} ▼</span>
                  ) : (
                    <span style={{ fontSize: 11, color: '#555', fontWeight: 700 }}>HOLDING</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Today's directives */}
        <div className="empire-card" style={{ borderColor: 'rgba(212,175,55,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Crosshair size={14} color="#D4AF37" />
            <span style={{ fontSize: 11, color: '#D4AF37', letterSpacing: '0.1em', fontWeight: 700 }}>TODAY'S DIRECTIVES</span>
          </div>
          {directives.length === 0 ? (
            <div style={{ fontSize: 13, color: '#00FF87', fontWeight: 700, padding: '8px 0' }}>
              ✓ ALL SYSTEMS GREEN — SET NEW OBJECTIVES
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {directives.map((d, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: `${d.color}0a`, border: `1px solid ${d.color}20`, borderRadius: 8 }}>
                  <span style={{ fontSize: 15 }}>{d.icon}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: d.color, letterSpacing: '0.04em' }}>{d.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Memento hook */}
        {mondays !== null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', background: 'rgba(255,65,65,0.05)', border: '1px solid rgba(255,65,65,0.15)', borderRadius: 10 }}>
            <Skull size={18} color="#FF4141" />
            <div style={{ fontSize: 12, color: '#888', lineHeight: 1.5 }}>
              MONDAYS REMAINING: <strong style={{ color: '#FF4141', fontFamily: 'JetBrains Mono, monospace', fontSize: 14 }}>{mondays.toLocaleString()}</strong>
              <span style={{ color: '#555' }}> — make this one count.</span>
            </div>
          </div>
        )}

        {/* CTA */}
        <button onClick={dismiss} className="btn-gold" style={{ width: '100%', padding: '16px', fontSize: 14, letterSpacing: '0.1em', marginTop: 8 }}>
          ⚡ BEGIN THE DAY
        </button>
      </div>
    </div>
  );
}
