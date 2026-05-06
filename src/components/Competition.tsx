import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Trophy, Plus, Trash2, Crown, X, Edit2, ChevronDown, ChevronUp, Info } from 'lucide-react';
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

function RivalIntelModal({ rival, onClose, onSave }: { rival: CompetitorProfile; onClose: () => void; onSave: (r: CompetitorProfile) => void }) {
  const [data, setData] = useState<CompetitorProfile>({ ...rival });
  const [newStatLabel, setNewStatLabel] = useState('');
  const [newStatValue, setNewStatValue] = useState('');

  const addCustomStat = () => {
    if (!newStatLabel.trim()) return;
    setData(prev => ({ ...prev, customStats: [...(prev.customStats || []), { label: newStatLabel.trim(), value: newStatValue.trim() }] }));
    setNewStatLabel(''); setNewStatValue('');
  };

  const removeCustomStat = (i: number) => {
    setData(prev => ({ ...prev, customStats: (prev.customStats || []).filter((_, idx) => idx !== i) }));
  };

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box" style={{ maxWidth: 520, maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#D4AF37' }}>
            {data.avatar} RIVAL INTEL — {data.name.toUpperCase()}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer' }}><X size={18} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Identity */}
          <div>
            <div style={{ fontSize: 10, color: '#D4AF37', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 10 }}>◆ IDENTITY</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <div className="label-upper" style={{ marginBottom: 6 }}>Name</div>
                <input className="empire-input" value={data.name} onChange={e => setData(d => ({ ...d, name: e.target.value }))} />
              </div>
              <div>
                <div className="label-upper" style={{ marginBottom: 6 }}>Age</div>
                <input className="empire-input" type="number" value={data.age ?? ''} onChange={e => setData(d => ({ ...d, age: parseInt(e.target.value) || undefined }))} placeholder="—" />
              </div>
              <div>
                <div className="label-upper" style={{ marginBottom: 6 }}>Occupation / Business</div>
                <input className="empire-input" value={data.occupation ?? ''} onChange={e => setData(d => ({ ...d, occupation: e.target.value }))} placeholder="Entrepreneur, dev..." />
              </div>
              <div>
                <div className="label-upper" style={{ marginBottom: 6 }}>Location</div>
                <input className="empire-input" value={data.location ?? ''} onChange={e => setData(d => ({ ...d, location: e.target.value }))} placeholder="City, country..." />
              </div>
              <div>
                <div className="label-upper" style={{ marginBottom: 6 }}>Instagram / Social</div>
                <input className="empire-input" value={data.instagram ?? ''} onChange={e => setData(d => ({ ...d, instagram: e.target.value }))} placeholder="@handle" />
              </div>
              <div>
                <div className="label-upper" style={{ marginBottom: 6 }}>Avatar</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {AVATARS.map(a => (
                    <button key={a} onClick={() => setData(d => ({ ...d, avatar: a }))} style={{ width: 34, height: 34, borderRadius: 8, fontSize: 16, border: `2px solid ${data.avatar === a ? '#D4AF37' : '#1f1f1f'}`, background: data.avatar === a ? 'rgba(212,175,55,0.1)' : '#111', cursor: 'pointer' }}>{a}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Weekly performance */}
          <div>
            <div style={{ fontSize: 10, color: '#00FF87', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 10 }}>◆ WEEKLY PERFORMANCE</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { key: 'weeklyHabits', label: 'WEEKLY HABITS', type: 'number', step: '1' },
                { key: 'weeklyEarnings', label: 'WEEKLY EARNINGS ($)', type: 'number', step: '0.01' },
                { key: 'goalsCompleted', label: 'GOALS COMPLETED', type: 'number', step: '1' },
                { key: 'focusHours', label: 'FOCUS HOURS', type: 'number', step: '0.5' },
              ].map(f => (
                <div key={f.key}>
                  <div className="label-upper" style={{ marginBottom: 6 }}>{f.label}</div>
                  <input className="empire-input" type={f.type} step={f.step} value={(data as unknown as Record<string, number>)[f.key] ?? 0} onChange={e => setData(prev => ({ ...prev, [f.key]: parseFloat(e.target.value) || 0 }))} />
                </div>
              ))}
            </div>
          </div>

          {/* Financial intel */}
          <div>
            <div style={{ fontSize: 10, color: '#D4AF37', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 10 }}>◆ FINANCIAL INTEL</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <div className="label-upper" style={{ marginBottom: 6 }}>Monthly Revenue ($)</div>
                <input className="empire-input" type="number" value={data.monthlyRevenue ?? ''} onChange={e => setData(d => ({ ...d, monthlyRevenue: parseFloat(e.target.value) || undefined }))} placeholder="0" />
              </div>
              <div>
                <div className="label-upper" style={{ marginBottom: 6 }}>Monthly Expenses ($)</div>
                <input className="empire-input" type="number" value={data.monthlyExpenses ?? ''} onChange={e => setData(d => ({ ...d, monthlyExpenses: parseFloat(e.target.value) || undefined }))} placeholder="0" />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <div className="label-upper" style={{ marginBottom: 6 }}>Estimated Net Worth ($)</div>
                <input className="empire-input" type="number" value={data.netWorth ?? ''} onChange={e => setData(d => ({ ...d, netWorth: parseFloat(e.target.value) || undefined }))} placeholder="0" />
              </div>
            </div>
          </div>

          {/* Habits / Schedule */}
          <div>
            <div style={{ fontSize: 10, color: '#00D4FF', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 10 }}>◆ SCHEDULE & HABITS</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <div className="label-upper" style={{ marginBottom: 6 }}>Wake Time</div>
                <input className="empire-input" type="time" value={data.wakeTime ?? ''} onChange={e => setData(d => ({ ...d, wakeTime: e.target.value }))} />
              </div>
              <div>
                <div className="label-upper" style={{ marginBottom: 6 }}>Sleep Time</div>
                <input className="empire-input" type="time" value={data.sleepTime ?? ''} onChange={e => setData(d => ({ ...d, sleepTime: e.target.value }))} />
              </div>
            </div>
          </div>

          {/* Custom stats */}
          <div>
            <div style={{ fontSize: 10, color: '#7B61FF', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 10 }}>◆ CUSTOM INTEL</div>
            {(data.customStats || []).map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                <div style={{ flex: 1, fontSize: 12, color: '#888', background: '#111', padding: '8px 12px', borderRadius: 8 }}>{s.label}</div>
                <div style={{ flex: 1, fontSize: 12, color: '#7B61FF', fontWeight: 700, background: '#111', padding: '8px 12px', borderRadius: 8 }}>{s.value}</div>
                <button onClick={() => removeCustomStat(i)} style={{ background: 'none', border: 'none', color: '#333', cursor: 'pointer' }}><X size={14} /></button>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="empire-input" value={newStatLabel} onChange={e => setNewStatLabel(e.target.value)} placeholder="Stat label..." style={{ flex: 1 }} />
              <input className="empire-input" value={newStatValue} onChange={e => setNewStatValue(e.target.value)} placeholder="Value..." style={{ flex: 1 }} />
              <button onClick={addCustomStat} style={{ padding: '8px 12px', background: 'rgba(123,97,255,0.15)', border: '1px solid #7B61FF', borderRadius: 8, color: '#7B61FF', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>+ ADD</button>
            </div>
          </div>

          {/* Notes */}
          <div>
            <div className="label-upper" style={{ marginBottom: 6 }}>INTEL NOTES</div>
            <textarea
              className="empire-input"
              value={data.notes ?? ''}
              onChange={e => setData(d => ({ ...d, notes: e.target.value }))}
              placeholder="Strengths, weaknesses, observations, context..."
              style={{ resize: 'vertical', minHeight: 80, fontFamily: 'inherit' }}
            />
          </div>

          <button onClick={() => { onSave(data); onClose(); }} className="btn-gold">SAVE INTEL</button>
        </div>
      </div>
    </div>
  );
}

export default function Competition({ competitors, habits, earnings, goals, pomodoro, myName, onChange, onUpdateMe }: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('⚡');
  const [intelRival, setIntelRival] = useState<CompetitorProfile | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const last7 = getLast7Days();
  const todayStr = today();

  const myWeeklyHabits = habits.reduce((s, h) => s + last7.filter(d => h.completions.includes(d)).length, 0);
  const myWeeklyEarnings = earnings.filter(e => last7.includes(e.date)).reduce((s, e) => s + e.amount, 0);
  const myGoalsCompleted = goals.filter(g => g.completed).length;
  const myFocusHours = pomodoro.filter(s => last7.includes(s.date) && s.completed && s.type === 'work').reduce((s, p) => s + p.duration, 0) / 60;

  const me: CompetitorProfile = {
    id: 'me', name: myName || 'YOU', avatar: '🔱',
    weeklyHabits: myWeeklyHabits, weeklyEarnings: myWeeklyEarnings,
    goalsCompleted: myGoalsCompleted, focusHours: parseFloat(myFocusHours.toFixed(1)),
    weeklyPoints: 0, achievements: [], isMe: true,
  };
  me.weeklyPoints = calcPoints(me);

  const allPlayers = [me, ...competitors].sort((a, b) => calcPoints(b) - calcPoints(a));

  const addCompetitor = () => {
    if (!name.trim()) return;
    const c: CompetitorProfile = {
      id: uid(), name: name.trim(), avatar, weeklyHabits: 0, weeklyEarnings: 0,
      goalsCompleted: 0, focusHours: 0, weeklyPoints: 0, achievements: [], isMe: false,
    };
    onChange([...competitors, c]);
    setName(''); setShowAdd(false);
    // Open intel immediately so they can fill details
    setIntelRival(c);
  };

  const saveRival = (updated: CompetitorProfile) => {
    if (updated.id === 'me') return;
    onChange(competitors.map(c => c.id === updated.id ? { ...updated, weeklyPoints: calcPoints(updated) } : c));
  };

  const deleteCompetitor = (id: string) => onChange(competitors.filter(c => c.id !== id));

  const medalColors = ['#D4AF37', '#C0C0C0', '#CD7F32'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }} className="animate-fade-up">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: 11, color: '#555', letterSpacing: '0.12em', marginBottom: 4, fontFamily: 'JetBrains Mono, monospace' }}>COMPETITIVE INTELLIGENCE</div>
          <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0, color: '#fff' }}>THE ARENA</h1>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-gold" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={14} /> ADD RIVAL
        </button>
      </div>

      {/* Add Rival Modal */}
      {showAdd && (
        <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setShowAdd(false); }}>
          <div className="modal-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#D4AF37' }}>ADD RIVAL</h3>
              <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <div className="label-upper" style={{ marginBottom: 6 }}>Rival Name</div>
                <input className="empire-input" value={name} onChange={e => setName(e.target.value)} placeholder="Friend's name..." autoFocus onKeyDown={e => e.key === 'Enter' && addCompetitor()} />
              </div>
              <div>
                <div className="label-upper" style={{ marginBottom: 8 }}>Avatar</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {AVATARS.map(a => (
                    <button key={a} onClick={() => setAvatar(a)} style={{ width: 40, height: 40, borderRadius: 10, fontSize: 20, border: `2px solid ${avatar === a ? '#D4AF37' : '#1f1f1f'}`, background: avatar === a ? 'rgba(212,175,55,0.1)' : '#111', cursor: 'pointer' }}>{a}</button>
                  ))}
                </div>
              </div>
              <div style={{ fontSize: 11, color: '#555', padding: '10px', background: '#0a0a0a', borderRadius: 8 }}>
                After adding, you'll be able to fill in detailed intel on this rival.
              </div>
              <button onClick={addCompetitor} className="btn-gold">ENTER THE ARENA</button>
            </div>
          </div>
        </div>
      )}

      {/* Rival Intel Modal */}
      {intelRival && (
        <RivalIntelModal
          rival={intelRival}
          onClose={() => setIntelRival(null)}
          onSave={updated => { saveRival(updated); setIntelRival(null); }}
        />
      )}

      {/* My stats */}
      <div className="empire-card" style={{ borderColor: 'rgba(212,175,55,0.3)', background: 'linear-gradient(135deg, rgba(212,175,55,0.06), transparent)' }}>
        <div style={{ fontSize: 11, color: '#D4AF37', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 16 }}>◆ YOUR WEEKLY PERFORMANCE</div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {[
            { label: 'WEEKLY HABITS', value: myWeeklyHabits, suffix: '' },
            { label: 'WEEKLY REVENUE', value: formatCurrency(myWeeklyEarnings), suffix: '' },
            { label: 'GOALS DONE', value: myGoalsCompleted, suffix: '' },
            { label: 'FOCUS HOURS', value: myFocusHours.toFixed(1), suffix: 'h' },
            { label: 'TOTAL POINTS', value: me.weeklyPoints, suffix: 'pts' },
          ].map(s => (
            <div key={s.label} style={{ flex: 1, minWidth: 80, textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#D4AF37', fontFamily: 'JetBrains Mono, monospace' }}>{s.value}{s.suffix}</div>
              <div style={{ fontSize: 9, color: '#555', letterSpacing: '0.08em', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Leaderboard */}
      <div className="empire-card">
        <div style={{ fontSize: 11, color: '#555', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 16 }}>WEEKLY LEADERBOARD</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {allPlayers.map((player, idx) => {
            const points = calcPoints(player);
            const maxPoints = calcPoints(allPlayers[0]);
            const pct = maxPoints > 0 ? (points / maxPoints) * 100 : 0;
            const isExpanded = expandedId === player.id;
            const rival = competitors.find(c => c.id === player.id);

            return (
              <div key={player.id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderRadius: isExpanded ? '10px 10px 0 0' : 10, background: player.isMe ? 'rgba(212,175,55,0.06)' : '#0d0d0d', border: `1px solid ${player.isMe ? 'rgba(212,175,55,0.2)' : '#1f1f1f'}`, borderBottom: isExpanded ? 'none' : undefined }}>
                  {/* Rank */}
                  <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, background: idx < 3 ? `${medalColors[idx]}20` : '#111', border: `2px solid ${idx < 3 ? medalColors[idx] : '#2a2a2a'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: idx === 0 ? 16 : 12, color: idx < 3 ? medalColors[idx] : '#444', fontWeight: 800 }}>
                    {idx === 0 ? '👑' : idx + 1}
                  </div>
                  <div style={{ fontSize: 22 }}>{player.avatar}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: player.isMe ? '#D4AF37' : '#ddd' }}>{player.name.toUpperCase()}</span>
                      {player.isMe && <span style={{ fontSize: 9, color: '#D4AF37', background: 'rgba(212,175,55,0.1)', padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>YOU</span>}
                      {rival?.occupation && <span style={{ fontSize: 10, color: '#555' }}>{rival.occupation}</span>}
                    </div>
                    <div className="progress-track">
                      <div className="progress-fill" style={{ width: `${pct}%`, background: player.isMe ? 'linear-gradient(90deg, #D4AF37, #FFD700)' : idx === 1 ? 'linear-gradient(90deg, #C0C0C0, #e0e0e0)' : 'linear-gradient(90deg, #555, #777)' }} />
                    </div>
                  </div>
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
                      <div style={{ fontSize: 16, fontWeight: 800, color: idx < 3 ? medalColors[idx] : '#888', fontFamily: 'JetBrains Mono, monospace' }}>{points}</div>
                      <div style={{ fontSize: 8, color: '#444', letterSpacing: '0.06em' }}>POINTS</div>
                    </div>
                  </div>
                  {!player.isMe && (
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button onClick={() => rival && setIntelRival(rival)} title="Edit Intel" style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer' }}><Info size={14} /></button>
                      <button onClick={() => setExpandedId(isExpanded ? null : player.id)} style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer' }}>
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                      <button onClick={() => deleteCompetitor(player.id)} style={{ background: 'none', border: 'none', color: '#333', cursor: 'pointer' }}><Trash2 size={14} /></button>
                    </div>
                  )}
                </div>

                {/* Expanded rival detail panel */}
                {isExpanded && rival && (
                  <div style={{ background: '#080808', border: '1px solid #1f1f1f', borderTop: 'none', borderRadius: '0 0 10px 10px', padding: '16px 18px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 14 }}>
                      {rival.age && (
                        <div style={{ background: '#111', borderRadius: 8, padding: '10px 12px' }}>
                          <div style={{ fontSize: 9, color: '#444', letterSpacing: '0.1em', marginBottom: 4 }}>AGE</div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: '#ddd' }}>{rival.age}</div>
                        </div>
                      )}
                      {rival.location && (
                        <div style={{ background: '#111', borderRadius: 8, padding: '10px 12px' }}>
                          <div style={{ fontSize: 9, color: '#444', letterSpacing: '0.1em', marginBottom: 4 }}>LOCATION</div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#ddd' }}>{rival.location}</div>
                        </div>
                      )}
                      {rival.instagram && (
                        <div style={{ background: '#111', borderRadius: 8, padding: '10px 12px' }}>
                          <div style={{ fontSize: 9, color: '#444', letterSpacing: '0.1em', marginBottom: 4 }}>SOCIAL</div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#7B61FF' }}>{rival.instagram}</div>
                        </div>
                      )}
                      {rival.monthlyRevenue !== undefined && rival.monthlyRevenue > 0 && (
                        <div style={{ background: '#111', borderRadius: 8, padding: '10px 12px' }}>
                          <div style={{ fontSize: 9, color: '#444', letterSpacing: '0.1em', marginBottom: 4 }}>MONTHLY REVENUE</div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: '#00FF87', fontFamily: 'JetBrains Mono, monospace' }}>{formatCurrency(rival.monthlyRevenue)}</div>
                        </div>
                      )}
                      {rival.monthlyExpenses !== undefined && rival.monthlyExpenses > 0 && (
                        <div style={{ background: '#111', borderRadius: 8, padding: '10px 12px' }}>
                          <div style={{ fontSize: 9, color: '#444', letterSpacing: '0.1em', marginBottom: 4 }}>MONTHLY EXPENSES</div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: '#FF6B35', fontFamily: 'JetBrains Mono, monospace' }}>{formatCurrency(rival.monthlyExpenses)}</div>
                        </div>
                      )}
                      {rival.netWorth !== undefined && rival.netWorth > 0 && (
                        <div style={{ background: '#111', borderRadius: 8, padding: '10px 12px' }}>
                          <div style={{ fontSize: 9, color: '#444', letterSpacing: '0.1em', marginBottom: 4 }}>NET WORTH</div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: '#D4AF37', fontFamily: 'JetBrains Mono, monospace' }}>{formatCurrency(rival.netWorth)}</div>
                        </div>
                      )}
                      {rival.wakeTime && (
                        <div style={{ background: '#111', borderRadius: 8, padding: '10px 12px' }}>
                          <div style={{ fontSize: 9, color: '#444', letterSpacing: '0.1em', marginBottom: 4 }}>WAKE TIME</div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: '#00D4FF' }}>{rival.wakeTime}</div>
                        </div>
                      )}
                      {rival.sleepTime && (
                        <div style={{ background: '#111', borderRadius: 8, padding: '10px 12px' }}>
                          <div style={{ fontSize: 9, color: '#444', letterSpacing: '0.1em', marginBottom: 4 }}>SLEEP TIME</div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: '#7B61FF' }}>{rival.sleepTime}</div>
                        </div>
                      )}
                      {(rival.customStats || []).map((s, i) => (
                        <div key={i} style={{ background: '#111', borderRadius: 8, padding: '10px 12px' }}>
                          <div style={{ fontSize: 9, color: '#444', letterSpacing: '0.1em', marginBottom: 4 }}>{s.label.toUpperCase()}</div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: '#ddd' }}>{s.value}</div>
                        </div>
                      ))}
                    </div>
                    {rival.notes && (
                      <div style={{ background: '#111', borderRadius: 8, padding: '12px', marginBottom: 10 }}>
                        <div style={{ fontSize: 9, color: '#444', letterSpacing: '0.1em', marginBottom: 6 }}>INTEL NOTES</div>
                        <div style={{ fontSize: 12, color: '#888', lineHeight: 1.6 }}>{rival.notes}</div>
                      </div>
                    )}
                    <button onClick={() => rival && setIntelRival(rival)} style={{ fontSize: 11, color: '#D4AF37', background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontWeight: 700, letterSpacing: '0.06em' }}>
                      ✎ EDIT INTEL
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
          <div style={{ fontSize: 11, color: '#555', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 16 }}>HEAD-TO-HEAD — WEEKLY POINTS</div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={allPlayers.map(p => ({ name: p.name.slice(0, 8), points: calcPoints(p), isMe: p.isMe }))} barCategoryGap="25%">
              <XAxis dataKey="name" tick={{ fill: '#555', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip contentStyle={{ background: '#0d0d0d', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [v, 'Points']} labelStyle={{ color: '#888' }} />
              <Bar dataKey="points" radius={[6, 6, 0, 0]}>
                {allPlayers.map((p, i) => <Cell key={i} fill={p.isMe ? '#D4AF37' : i === 0 ? '#00D4FF' : '#333'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Points System */}
      <div className="empire-card" style={{ borderColor: '#1a1a1a' }}>
        <div style={{ fontSize: 11, color: '#555', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 16 }}>◆ POINTS SYSTEM</div>
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
          💡 Use the intel panel (ℹ) on each rival to fill in detailed profile info. Click the chevron to expand their full dossier.
        </div>
      </div>
    </div>
  );
}
