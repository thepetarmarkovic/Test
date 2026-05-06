import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Plus, Flame, Check, RotateCcw, Edit2, Trash2, X } from 'lucide-react';
import type { Habit } from '../types';
import { today, getLast7Days, dayOfWeekShort, uid } from '../utils/formatters';

const EMOJIS = ['💪', '📚', '🧘', '💧', '🥗', '😴', '🎯', '✍️', '🌿', '🏃', '🧠', '💼', '🎸', '🌅', '⚡'];
const CATEGORIES = ['Health', 'Learning', 'Mindset', 'Fitness', 'Business', 'Creativity', 'Wellness'];

interface Props {
  habits: Habit[];
  onChange: (habits: Habit[]) => void;
}

export default function HabitTracker({ habits, onChange }: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmoji, setNewEmoji] = useState('💪');
  const [newCategory, setNewCategory] = useState('Health');
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmoji, setEditEmoji] = useState('');

  const todayStr = today();
  const last7 = getLast7Days();

  const toggleCompletion = (id: string) => {
    onChange(habits.map(h => {
      if (h.id !== id) return h;
      const done = h.completions.includes(todayStr);
      return {
        ...h,
        completions: done
          ? h.completions.filter(d => d !== todayStr)
          : [...h.completions, todayStr],
      };
    }));
  };

  const addHabit = () => {
    if (!newName.trim()) return;
    const h: Habit = {
      id: uid(),
      name: newName.trim(),
      emoji: newEmoji,
      category: newCategory,
      completions: [],
      createdAt: todayStr,
    };
    onChange([...habits, h]);
    setNewName('');
    setShowAdd(false);
  };

  const deleteHabit = (id: string) => onChange(habits.filter(h => h.id !== id));

  const resetHabit = (id: string) => {
    onChange(habits.map(h => h.id === id ? { ...h, completions: [] } : h));
  };

  const saveEdit = (id: string) => {
    onChange(habits.map(h => h.id === id ? { ...h, name: editName, emoji: editEmoji } : h));
    setEditId(null);
  };

  const getStreak = (h: Habit): number => {
    let streak = 0;
    const d = new Date();
    while (true) {
      const ds = d.toISOString().split('T')[0];
      if (h.completions.includes(ds)) {
        streak++;
        d.setDate(d.getDate() - 1);
      } else break;
    }
    return streak;
  };

  const chartData = last7.map(d => {
    const done = habits.filter(h => h.completions.includes(d)).length;
    return { day: dayOfWeekShort(d), done, total: habits.length };
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }} className="animate-fade-up">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: 11, color: '#555', letterSpacing: '0.12em', marginBottom: 4, fontFamily: 'JetBrains Mono, monospace' }}>
            DAILY DISCIPLINES
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0, color: '#fff' }}>HABIT SYSTEM</h1>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-gold" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={14} /> NEW DISCIPLINE
        </button>
      </div>

      {/* Add modal */}
      {showAdd && (
        <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setShowAdd(false); }}>
          <div className="modal-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#D4AF37', letterSpacing: '0.06em' }}>
                NEW DISCIPLINE
              </h3>
              <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <div className="label-upper" style={{ marginBottom: 6 }}>Habit Name</div>
                <input
                  className="empire-input"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. Cold shower, Read 30 min..."
                  onKeyDown={e => e.key === 'Enter' && addHabit()}
                  autoFocus
                />
              </div>
              <div>
                <div className="label-upper" style={{ marginBottom: 8 }}>Icon</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {EMOJIS.map(em => (
                    <button
                      key={em}
                      onClick={() => setNewEmoji(em)}
                      style={{
                        width: 36, height: 36, borderRadius: 8, border: `2px solid ${newEmoji === em ? '#D4AF37' : '#1f1f1f'}`,
                        background: newEmoji === em ? 'rgba(212,175,55,0.1)' : '#111',
                        fontSize: 18, cursor: 'pointer', transition: 'all 0.1s',
                      }}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="label-upper" style={{ marginBottom: 6 }}>Category</div>
                <select className="empire-select" value={newCategory} onChange={e => setNewCategory(e.target.value)}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <button onClick={addHabit} className="btn-gold" style={{ marginTop: 4 }}>
                ACTIVATE DISCIPLINE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7-Day Chart */}
      {habits.length > 0 && (
        <div className="empire-card">
          <div style={{ fontSize: 11, color: '#555', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 16 }}>
            7-DAY PERFORMANCE
          </div>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={chartData} barCategoryGap="20%">
              <XAxis dataKey="day" tick={{ fill: '#555', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis hide domain={[0, Math.max(habits.length, 1)]} />
              <Tooltip
                contentStyle={{ background: '#0d0d0d', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 8, fontSize: 12 }}
                formatter={(v: number) => [`${v}/${habits.length}`, 'Completed']}
                labelStyle={{ color: '#888' }}
              />
              <Bar dataKey="done" radius={[4, 4, 0, 0]}>
                {chartData.map((d, i) => (
                  <Cell
                    key={i}
                    fill={d.day === dayOfWeekShort(todayStr)
                      ? '#D4AF37'
                      : d.done === d.total && d.total > 0
                        ? '#00FF87'
                        : 'rgba(212,175,55,0.25)'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Today's habits */}
      {habits.length === 0 ? (
        <div
          style={{
            textAlign: 'center', padding: '60px 20px',
            border: '1px dashed #1f1f1f', borderRadius: 12,
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔥</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#555', marginBottom: 8 }}>No disciplines yet</div>
          <div style={{ fontSize: 13, color: '#333' }}>Build the habits that will define your empire</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 11, color: '#555', letterSpacing: '0.1em', fontWeight: 700 }}>
            TODAY'S DISCIPLINES — {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase()}
          </div>
          {habits.map(h => {
            const done = h.completions.includes(todayStr);
            const streak = getStreak(h);
            const weekDone = last7.filter(d => h.completions.includes(d)).length;
            const isEditing = editId === h.id;

            return (
              <div
                key={h.id}
                className="empire-card"
                style={{
                  borderColor: done ? 'rgba(0,255,135,0.2)' : 'rgba(31,31,31,1)',
                  background: done ? 'rgba(0,255,135,0.03)' : '#0d0d0d',
                  transition: 'all 0.2s ease',
                  padding: '16px 20px',
                }}
              >
                {isEditing ? (
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <select
                      className="empire-select"
                      style={{ width: 60 }}
                      value={editEmoji}
                      onChange={e => setEditEmoji(e.target.value)}
                    >
                      {EMOJIS.map(em => <option key={em} value={em}>{em}</option>)}
                    </select>
                    <input
                      className="empire-input"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && saveEdit(h.id)}
                      autoFocus
                    />
                    <button onClick={() => saveEdit(h.id)} className="btn-gold" style={{ whiteSpace: 'nowrap' }}>SAVE</button>
                    <button onClick={() => setEditId(null)} className="btn-ghost">CANCEL</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    {/* Checkbox */}
                    <button
                      onClick={() => toggleCompletion(h.id)}
                      style={{
                        width: 36, height: 36, borderRadius: '50%',
                        border: `2px solid ${done ? '#00FF87' : '#2a2a2a'}`,
                        background: done ? 'rgba(0,255,135,0.15)' : 'transparent',
                        color: done ? '#00FF87' : '#333',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', transition: 'all 0.2s ease', flexShrink: 0,
                      }}
                    >
                      {done && <Check size={16} />}
                    </button>

                    {/* Emoji */}
                    <span style={{ fontSize: 22, flexShrink: 0 }}>{h.emoji}</span>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: done ? '#ccc' : '#fff', marginBottom: 4 }}>
                        {h.name}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 10, color: '#555', letterSpacing: '0.06em' }}>{h.category.toUpperCase()}</span>
                        {streak > 0 && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: '#FF6B35', fontWeight: 700 }}>
                            <Flame size={11} /> {streak} DAY STREAK
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Week dots */}
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      {last7.map(d => (
                        <div
                          key={d}
                          style={{
                            width: 8, height: 8, borderRadius: '50%',
                            background: h.completions.includes(d) ? '#D4AF37' : '#1f1f1f',
                          }}
                          title={d}
                        />
                      ))}
                    </div>

                    <div style={{ fontSize: 11, color: '#555', width: 40, textAlign: 'center', flexShrink: 0 }}>
                      {weekDone}/7
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button
                        onClick={() => { setEditId(h.id); setEditName(h.name); setEditEmoji(h.emoji); }}
                        style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', padding: 4 }}
                        title="Edit"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => resetHabit(h.id)}
                        style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', padding: 4 }}
                        title="Reset streak"
                      >
                        <RotateCcw size={14} />
                      </button>
                      <button
                        onClick={() => deleteHabit(h.id)}
                        style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', padding: 4 }}
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Summary */}
      {habits.length > 0 && (
        <div style={{ display: 'flex', gap: 12 }}>
          {[
            { label: 'ACTIVE', value: habits.length, color: '#D4AF37' },
            { label: 'DONE TODAY', value: habits.filter(h => h.completions.includes(todayStr)).length, color: '#00FF87' },
            { label: 'BEST STREAK', value: Math.max(...habits.map(h => getStreak(h)), 0), color: '#FF6B35' },
            { label: 'TOTAL CHECK-INS', value: habits.reduce((s, h) => s + h.completions.length, 0), color: '#00D4FF' },
          ].map(s => (
            <div key={s.label} className="empire-card" style={{ flex: 1, textAlign: 'center', padding: '14px' }}>
              <div style={{ fontSize: 26, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 9, color: '#555', letterSpacing: '0.1em', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
