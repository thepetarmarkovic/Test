import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis } from 'recharts';
import { Trophy, Plus, Trash2, Crown, X, Edit2 } from 'lucide-react';
import type { CompetitorProfile, Habit, EarningEntry, Goal, PomodoroSession } from '../types';
import { formatCurrency, uid, today, getLast7Days } from '../utils/formatters';

const AVATARS = ['⚡', '🔱', '🦅', '🐉', '🏆', '⚔️', '🎯', '💎', '🦁', '🌪️'];

const calcPoints = (p: CompetitorProfile) =>
  p.weeklyHabits * 10 + Math.floor(p.weeklyEarnings / 100) + p.goalsCompleted * 50 + Math.floor(p.focusHours * 5);

interface Props {
  competitors: CompetitorProfile[];
  habits: Habit[];
  earnings: EarningEntry[];
  goals: Goal[];
  pomodoro: PomodoroSession[];
  myName: string;
  onChange: (c: CompetitorProfile[]) => void;
  onUpdateMe: (c: CompetitorProfile) => void;
}

export default function Competition({ competitors, habits, earnings, goals, pomodoro, myName, onChange, onUpdateMe }: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('⚡');
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<CompetitorProfile>>({});

  // Calculate my real stats
  const last7 = getLast7Days();
  const todayStr = today();

  const myWeeklyHabits = habits.reduce((s, h) => s + last7.filter(d => h.completions.includes(d)).length, 0);
  const myWeeklyEarnings = earnings.filter(e => last7.includes(e.date)).reduce((s, e) => s + e.amount, 0);
  const myGoalsCompleted = goals.filter(g => g.completed).length;
  const myFocusHours = pomodoro.filter(s => last7.includes(s.date) && s.completed && s.type === 'work').reduce((s, p) => s + p.duration, 0) / 60;

  const me: CompetitorProfile = {
    id: 'me',
    name: myName || 'YOU',
    avatar: '🔱',
    weeklyHabits: myWeeklyHabits,
    weeklyEarnings: myWeeklyEarnings,
    goalsCompleted: myGoalsCompleted,
    focusHours: parseFloat(myFocusHours.toFixed(1)),
    weeklyPoints: 0,
    achievements: [],
    isMe: true,
  };
  me.weeklyPoints = calcPoints(me);

  const allPlayers = [me, ...competitors].sort((a, b) => calcPoints(b) - calcPoints(a));

  const addCompetitor = () => {
    if (!name.trim()) return;
    const c: CompetitorProfile = {
      id: uid(),
      name: name.trim(),
      avatar,
      weeklyHabits: 0,
      weeklyEarnings: 0,
      goalsCompleted: 0,
      focusHours: 0,
      weeklyPoints: 0,
      achievements: [],
      isMe: false,
    };
    onChange([...competitors, c]);
    setName(''); setShowAdd(false);
  };

  const updateCompetitor = (id: string, data: Partial<CompetitorProfile>) => {
    onChange(competitors.map(c => c.id === id ? { ...c, ...data, weeklyPoints: calcPoints({ ...c, ...data } as CompetitorProfile) } : c));
    setEditId(null);
  };

  const deleteCompetitor = (id: string) => onChange(competitors.filter(c => c.id !== id));

  // Radar data for top 2
  const top2 = allPlayers.slice(0, 2);
  const radarData = [
    { stat: 'HABITS', [top2[0]?.name]: top2[0]?.weeklyHabits || 0, [top2[1]?.name]: top2[1]?.weeklyHabits || 0 },
    { stat: 'EARNINGS', [top2[0]?.name]: Math.min(Math.floor((top2[0]?.weeklyEarnings || 0) / 100), 100), [top2[1]?.name]: Math.min(Math.floor((top2[1]?.weeklyEarnings || 0) / 100), 100) },
    { stat: 'GOALS', [top2[0]?.name]: top2[0]?.goalsCompleted || 0, [top2[1]?.name]: top2[1]?.goalsCompleted || 0 },
    { stat: 'FOCUS', [top2[0]?.name]: top2[0]?.focusHours || 0, [top2[1]?.name]: top2[1]?.focusHours || 0 },
    { stat: 'POINTS', [top2[0]?.name]: Math.min(calcPoints(top2[0] || me), 100), [top2[1]?.name]: Math.min(calcPoints(top2[1] || me), 100) },
  ];

  const medalColors = ['#D4AF37', '#C0C0C0', '#CD7F32'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }} className="animate-fade-up">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: 11, color: '#555', letterSpacing: '0.12em', marginBottom: 4, fontFamily: 'JetBrains Mono, monospace' }}>
            COMPETITIVE INTELLIGENCE
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0, color: '#fff' }}>THE ARENA</h1>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-gold" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={14} /> ADD RIVAL
        </button>
      </div>

      {/* Add Competitor Modal */}
      {showAdd && (
        <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setShowAdd(false); }}>
          <div className="modal-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#D4AF37' }}>ADD RIVAL</h3>
              <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <div className="label-upper" style={{ marginBottom: 6 }}>Rival Name</div>
                <input className="empire-input" value={name} onChange={e => setName(e.target.value)} placeholder="Friend's name..." autoFocus />
              </div>
              <div>
                <div className="label-upper" style={{ marginBottom: 8 }}>Avatar</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {AVATARS.map(a => (
                    <button
                      key={a}
                      onClick={() => setAvatar(a)}
                      style={{
                        width: 40, height: 40, borderRadius: 10, fontSize: 20,
                        border: `2px solid ${avatar === a ? '#D4AF37' : '#1f1f1f'}`,
                        background: avatar === a ? 'rgba(212,175,55,0.1)' : '#111',
                        cursor: 'pointer',
                      }}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ background: '#111', borderRadius: 8, padding: 16 }}>
                <div style={{ fontSize: 11, color: '#555', marginBottom: 12, letterSpacing: '0.06em' }}>
                  ENTER THEIR WEEKLY STATS (ask them to share)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <div className="label-upper" style={{ marginBottom: 6 }}>Weekly Habits</div>
                    <input className="empire-input" type="number" placeholder="0" id="tmp-habits" min="0" />
                  </div>
                  <div>
                    <div className="label-upper" style={{ marginBottom: 6 }}>Weekly Earnings ($)</div>
                    <input className="empire-input" type="number" placeholder="0" id="tmp-earnings" min="0" />
                  </div>
                  <div>
                    <div className="label-upper" style={{ marginBottom: 6 }}>Goals Completed</div>
                    <input className="empire-input" type="number" placeholder="0" id="tmp-goals" min="0" />
                  </div>
                  <div>
                    <div className="label-upper" style={{ marginBottom: 6 }}>Focus Hours</div>
                    <input className="empire-input" type="number" step="0.5" placeholder="0" id="tmp-focus" min="0" />
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  const h = parseInt((document.getElementById('tmp-habits') as HTMLInputElement)?.value || '0');
                  const e = parseFloat((document.getElementById('tmp-earnings') as HTMLInputElement)?.value || '0');
                  const g = parseInt((document.getElementById('tmp-goals') as HTMLInputElement)?.value || '0');
                  const f = parseFloat((document.getElementById('tmp-focus') as HTMLInputElement)?.value || '0');
                  if (!name.trim()) return;
                  const c: CompetitorProfile = {
                    id: uid(), name: name.trim(), avatar, isMe: false,
                    weeklyHabits: h, weeklyEarnings: e, goalsCompleted: g, focusHours: f,
                    weeklyPoints: 0, achievements: [],
                  };
                  c.weeklyPoints = calcPoints(c);
                  onChange([...competitors, c]);
                  setName(''); setShowAdd(false);
                }}
                className="btn-gold"
              >
                ENTER THE ARENA
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editId && (
        <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setEditId(null); }}>
          <div className="modal-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#D4AF37' }}>UPDATE RIVAL STATS</h3>
              <button onClick={() => setEditId(null)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { key: 'weeklyHabits', label: 'WEEKLY HABITS', type: 'number' },
                { key: 'weeklyEarnings', label: 'WEEKLY EARNINGS ($)', type: 'number' },
                { key: 'goalsCompleted', label: 'GOALS COMPLETED', type: 'number' },
                { key: 'focusHours', label: 'FOCUS HOURS', type: 'number' },
              ].map(f => (
                <div key={f.key}>
                  <div className="label-upper" style={{ marginBottom: 6 }}>{f.label}</div>
                  <input
                    className="empire-input"
                    type={f.type}
                    value={(editData as Record<string, number>)[f.key] ?? 0}
                    onChange={e => setEditData(prev => ({ ...prev, [f.key]: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
              ))}
            </div>
            <button
              onClick={() => updateCompetitor(editId, editData)}
              className="btn-gold"
              style={{ marginTop: 14, width: '100%' }}
            >
              UPDATE
            </button>
          </div>
        </div>
      )}

      {/* My stats */}
      <div
        className="empire-card"
        style={{ borderColor: 'rgba(212,175,55,0.3)', background: 'linear-gradient(135deg, rgba(212,175,55,0.06), transparent)' }}
      >
        <div style={{ fontSize: 11, color: '#D4AF37', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 16 }}>
          ◆ YOUR WEEKLY PERFORMANCE
        </div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {[
            { label: 'WEEKLY HABITS', value: myWeeklyHabits, suffix: '' },
            { label: 'WEEKLY REVENUE', value: formatCurrency(myWeeklyEarnings), suffix: '' },
            { label: 'GOALS DONE', value: myGoalsCompleted, suffix: '' },
            { label: 'FOCUS HOURS', value: myFocusHours.toFixed(1), suffix: 'h' },
            { label: 'TOTAL POINTS', value: me.weeklyPoints, suffix: 'pts' },
          ].map(s => (
            <div key={s.label} style={{ flex: 1, minWidth: 80, textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#D4AF37', fontFamily: 'JetBrains Mono, monospace' }}>
                {s.value}{s.suffix}
              </div>
              <div style={{ fontSize: 9, color: '#555', letterSpacing: '0.08em', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Leaderboard */}
      <div className="empire-card">
        <div style={{ fontSize: 11, color: '#555', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 16 }}>
          WEEKLY LEADERBOARD
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {allPlayers.map((player, idx) => {
            const points = calcPoints(player);
            const maxPoints = calcPoints(allPlayers[0]);
            const pct = maxPoints > 0 ? (points / maxPoints) * 100 : 0;

            return (
              <div
                key={player.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px',
                  borderRadius: 10,
                  background: player.isMe ? 'rgba(212,175,55,0.06)' : '#0d0d0d',
                  border: `1px solid ${player.isMe ? 'rgba(212,175,55,0.2)' : '#1f1f1f'}`,
                }}
              >
                {/* Rank */}
                <div
                  style={{
                    width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                    background: idx < 3 ? `${medalColors[idx]}20` : '#111',
                    border: `2px solid ${idx < 3 ? medalColors[idx] : '#2a2a2a'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: idx === 0 ? 16 : 12,
                    color: idx < 3 ? medalColors[idx] : '#444',
                    fontWeight: 800,
                  }}
                >
                  {idx === 0 ? '👑' : idx + 1}
                </div>

                {/* Avatar + name */}
                <div style={{ fontSize: 22 }}>{player.avatar}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: player.isMe ? '#D4AF37' : '#ddd' }}>
                      {player.name.toUpperCase()}
                    </span>
                    {player.isMe && (
                      <span style={{ fontSize: 9, color: '#D4AF37', background: 'rgba(212,175,55,0.1)', padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>
                        YOU
                      </span>
                    )}
                  </div>
                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${pct}%`,
                        background: player.isMe
                          ? 'linear-gradient(90deg, #D4AF37, #FFD700)'
                          : idx === 1 ? 'linear-gradient(90deg, #C0C0C0, #e0e0e0)'
                            : 'linear-gradient(90deg, #555, #777)',
                      }}
                    />
                  </div>
                </div>

                {/* Stats */}
                <div style={{ display: 'flex', gap: 20, flexShrink: 0 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#888', fontFamily: 'JetBrains Mono, monospace' }}>{player.weeklyHabits}</div>
                    <div style={{ fontSize: 8, color: '#444', letterSpacing: '0.06em' }}>HABITS</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#00FF87', fontFamily: 'JetBrains Mono, monospace' }}>{formatCurrency(player.weeklyEarnings)}</div>
                    <div style={{ fontSize: 8, color: '#444', letterSpacing: '0.06em' }}>EARNED</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: idx < 3 ? medalColors[idx] : '#888', fontFamily: 'JetBrains Mono, monospace' }}>
                      {points}
                    </div>
                    <div style={{ fontSize: 8, color: '#444', letterSpacing: '0.06em' }}>POINTS</div>
                  </div>
                </div>

                {!player.isMe && (
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button
                      onClick={() => { setEditId(player.id); setEditData({ weeklyHabits: player.weeklyHabits, weeklyEarnings: player.weeklyEarnings, goalsCompleted: player.goalsCompleted, focusHours: player.focusHours }); }}
                      style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer' }}
                    >
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => deleteCompetitor(player.id)} style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bar Chart comparison */}
      {allPlayers.length > 1 && (
        <div className="empire-card">
          <div style={{ fontSize: 11, color: '#555', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 16 }}>
            HEAD-TO-HEAD — WEEKLY POINTS
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={allPlayers.map(p => ({ name: p.name.slice(0, 8), points: calcPoints(p), isMe: p.isMe }))} barCategoryGap="25%">
              <XAxis dataKey="name" tick={{ fill: '#555', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                contentStyle={{ background: '#0d0d0d', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 8, fontSize: 12 }}
                formatter={(v: number) => [v, 'Points']}
                labelStyle={{ color: '#888' }}
              />
              <Bar dataKey="points" radius={[6, 6, 0, 0]}>
                {allPlayers.map((p, i) => (
                  <Cell key={i} fill={p.isMe ? '#D4AF37' : i === 0 ? '#00D4FF' : '#333'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Points System */}
      <div className="empire-card" style={{ borderColor: '#1a1a1a' }}>
        <div style={{ fontSize: 11, color: '#555', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 16 }}>
          ◆ POINTS SYSTEM
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          {[
            { label: 'Habit check-in', value: '10 pts', color: '#FF6B35' },
            { label: '$100 earned', value: '1 pt', color: '#00FF87' },
            { label: 'Goal completed', value: '50 pts', color: '#D4AF37' },
            { label: 'Focus hour', value: '5 pts', color: '#00D4FF' },
          ].map(s => (
            <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#111', borderRadius: 8 }}>
              <span style={{ fontSize: 12, color: '#666' }}>{s.label}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: s.color }}>{s.value}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 12, padding: '10px', background: '#0a0a0a', borderRadius: 8, fontSize: 11, color: '#444', lineHeight: 1.6 }}>
          💡 Have your rival enter their stats manually each week. Share your weekly stats with them so they can keep their data updated in their own instance of Empire OS.
        </div>
      </div>
    </div>
  );
}
