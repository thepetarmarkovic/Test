import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LineChart, Line, CartesianGrid } from 'recharts';
import { Moon, Plus, Star, Trash2, X } from 'lucide-react';
import type { SleepEntry } from '../types';
import { today, uid, formatDateShort, getLast30Days } from '../utils/formatters';

const QUALITY_LABELS: Record<number, string> = {
  1: 'NIGHTMARE', 2: 'ROUGH', 3: 'DECENT', 4: 'SOLID', 5: 'ELITE'
};
const QUALITY_COLORS: Record<number, string> = {
  1: '#FF4141', 2: '#FF6B35', 3: '#D4AF37', 4: '#00D4FF', 5: '#00FF87'
};

interface Props {
  sleep: SleepEntry[];
  onChange: (s: SleepEntry[]) => void;
}

export default function SleepTracker({ sleep, onChange }: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const [hours, setHours] = useState(7.5);
  const [quality, setQuality] = useState<1 | 2 | 3 | 4 | 5>(4);
  const [date, setDate] = useState(today());
  const [notes, setNotes] = useState('');

  const addEntry = () => {
    const entry: SleepEntry = {
      id: uid(), date, hours, quality, notes: notes.trim(),
    };
    const updated = [...sleep.filter(s => s.date !== date), entry].sort((a, b) => b.date.localeCompare(a.date));
    onChange(updated);
    setHours(7.5); setQuality(4); setNotes(''); setDate(today()); setShowAdd(false);
  };

  const deleteEntry = (id: string) => onChange(sleep.filter(s => s.id !== id));

  const last30 = getLast30Days();
  const chartData = last30.map(d => {
    const entry = sleep.find(s => s.date === d);
    return {
      date: d,
      day: new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      hours: entry?.hours ?? null,
      quality: entry?.quality ?? null,
    };
  });

  const tracked = sleep.filter(s => last30.includes(s.date));
  const avgHours = tracked.length > 0 ? tracked.reduce((s, e) => s + e.hours, 0) / tracked.length : 0;
  const avgQuality = tracked.length > 0 ? tracked.reduce((s, e) => s + e.quality, 0) / tracked.length : 0;
  const bestNight = tracked.length > 0 ? Math.max(...tracked.map(e => e.hours)) : 0;
  const optimalNights = tracked.filter(e => e.hours >= 7 && e.hours <= 9).length;

  const sleepDebt = tracked.length > 0
    ? Math.max(0, tracked.reduce((s, e) => s + (8 - e.hours), 0))
    : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }} className="animate-fade-up">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: 11, color: '#555', letterSpacing: '0.12em', marginBottom: 4, fontFamily: 'JetBrains Mono, monospace' }}>
            RECOVERY METRICS
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0, color: '#fff' }}>SLEEP LAB</h1>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-gold" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={14} /> LOG RECOVERY
        </button>
      </div>

      {/* Add Modal */}
      {showAdd && (
        <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setShowAdd(false); }}>
          <div className="modal-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#7B61FF', letterSpacing: '0.06em' }}>
                LOG RECOVERY
              </h3>
              <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <div className="label-upper" style={{ marginBottom: 8 }}>Date</div>
                <input className="empire-input" type="date" value={date} onChange={e => setDate(e.target.value)} />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div className="label-upper">Hours Slept</div>
                  <div style={{ fontSize: 36, fontWeight: 900, color: '#7B61FF', fontFamily: 'JetBrains Mono, monospace' }}>
                    {hours.toFixed(1)}h
                  </div>
                </div>
                <input
                  type="range"
                  min={3}
                  max={12}
                  step={0.5}
                  value={hours}
                  onChange={e => setHours(parseFloat(e.target.value))}
                  style={{
                    width: '100%', height: 6, appearance: 'none',
                    background: `linear-gradient(90deg, #7B61FF ${(hours - 3) / 9 * 100}%, #1f1f1f ${(hours - 3) / 9 * 100}%)`,
                    borderRadius: 999, outline: 'none', cursor: 'pointer',
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                  <span style={{ fontSize: 10, color: '#444' }}>3h</span>
                  <span style={{ fontSize: 10, color: '#555' }}>8h optimal</span>
                  <span style={{ fontSize: 10, color: '#444' }}>12h</span>
                </div>
              </div>
              <div>
                <div className="label-upper" style={{ marginBottom: 12 }}>Sleep Quality</div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
                  {([1, 2, 3, 4, 5] as const).map(q => (
                    <button
                      key={q}
                      onClick={() => setQuality(q)}
                      style={{
                        flex: 1, padding: '12px 8px', borderRadius: 8,
                        border: `2px solid ${quality === q ? QUALITY_COLORS[q] : '#1f1f1f'}`,
                        background: quality === q ? `${QUALITY_COLORS[q]}15` : 'transparent',
                        color: quality === q ? QUALITY_COLORS[q] : '#444',
                        cursor: 'pointer', transition: 'all 0.15s',
                        fontSize: 10, fontWeight: 700, letterSpacing: '0.05em',
                      }}
                    >
                      <div style={{ fontSize: 18, marginBottom: 4 }}>{'★'.repeat(q)}</div>
                      <div>{QUALITY_LABELS[q]}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="label-upper" style={{ marginBottom: 6 }}>Notes</div>
                <input className="empire-input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Supplements, environment, dreams..." />
              </div>
              <button onClick={addEntry} className="btn-gold">LOCK IN RECOVERY DATA</button>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        {[
          { label: 'AVG HOURS', value: avgHours > 0 ? `${avgHours.toFixed(1)}h` : '—', color: '#7B61FF' },
          { label: 'AVG QUALITY', value: avgQuality > 0 ? `${avgQuality.toFixed(1)}/5` : '—', color: '#00D4FF' },
          { label: 'BEST NIGHT', value: bestNight > 0 ? `${bestNight}h` : '—', color: '#00FF87' },
          { label: 'OPTIMAL NIGHTS', value: `${optimalNights}`, color: '#D4AF37', sub: '7-9h range' },
          { label: 'SLEEP DEBT', value: sleepDebt > 0 ? `${sleepDebt.toFixed(1)}h` : '0h', color: sleepDebt > 5 ? '#FF4141' : '#555' },
        ].map(s => (
          <div key={s.label} className="empire-card" style={{ flex: 1, minWidth: 100 }}>
            <div style={{ fontSize: 9, color: '#555', letterSpacing: '0.12em', marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: s.color, fontFamily: 'JetBrains Mono, monospace' }}>{s.value}</div>
            {s.sub && <div style={{ fontSize: 10, color: '#444', marginTop: 4 }}>{s.sub}</div>}
          </div>
        ))}
      </div>

      {/* Charts */}
      {sleep.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="empire-card">
            <div style={{ fontSize: 11, color: '#555', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 16 }}>
              30-NIGHT SLEEP LOG
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData} barCategoryGap="15%">
                <XAxis
                  dataKey="day"
                  tick={{ fill: '#444', fontSize: 9 }}
                  axisLine={false}
                  tickLine={false}
                  interval={4}
                />
                <YAxis hide domain={[0, 12]} />
                <CartesianGrid vertical={false} stroke="#111" />
                <Tooltip
                  contentStyle={{ background: '#0d0d0d', border: '1px solid rgba(123,97,255,0.3)', borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number | null) => v !== null ? [`${v}h`, 'Sleep'] : ['—', 'No data']}
                  labelStyle={{ color: '#888' }}
                />
                <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
                  {chartData.map((d, i) => (
                    <Cell
                      key={i}
                      fill={d.hours === null ? '#111'
                        : d.hours >= 7 && d.hours <= 9 ? '#00FF87'
                          : d.hours >= 6 ? '#D4AF37'
                            : '#FF4141'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            {/* Legend */}
            <div style={{ display: 'flex', gap: 16, marginTop: 8, justifyContent: 'center' }}>
              {[['#00FF87', 'Optimal (7-9h)'], ['#D4AF37', 'OK (6-7h)'], ['#FF4141', 'Under-slept']].map(([c, l]) => (
                <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: c }} />
                  <span style={{ fontSize: 10, color: '#555' }}>{l}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quality line */}
          <div className="empire-card">
            <div style={{ fontSize: 11, color: '#555', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 16 }}>
              QUALITY TREND
            </div>
            <ResponsiveContainer width="100%" height={100}>
              <LineChart data={chartData}>
                <XAxis dataKey="day" tick={{ fill: '#444', fontSize: 9 }} axisLine={false} tickLine={false} interval={4} />
                <YAxis hide domain={[0, 5]} />
                <Tooltip
                  contentStyle={{ background: '#0d0d0d', border: '1px solid rgba(0,212,255,0.3)', borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number | null) => v !== null ? [QUALITY_LABELS[v], 'Quality'] : ['—', 'Quality']}
                  labelStyle={{ color: '#888' }}
                />
                <Line type="monotone" dataKey="quality" stroke="#00D4FF" strokeWidth={2} dot={{ fill: '#00D4FF', r: 3 }} connectNulls={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Log */}
      <div className="empire-card">
        <div style={{ fontSize: 11, color: '#555', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 16 }}>
          RECOVERY LOG
        </div>
        {sleep.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#333', fontSize: 13 }}>
            <Moon size={32} color="#222" style={{ marginBottom: 12 }} />
            <div>No sleep data yet. Log your recovery above.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {[...sleep].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 14).map((e, i, arr) => (
              <div
                key={e.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 16, padding: '12px 0',
                  borderBottom: i < arr.length - 1 ? '1px solid #111' : 'none',
                }}
              >
                <div
                  style={{
                    width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                    background: `${QUALITY_COLORS[e.quality]}15`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Moon size={16} color={QUALITY_COLORS[e.quality]} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#ddd' }}>{formatDateShort(e.date)}</div>
                  <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>
                    {QUALITY_LABELS[e.quality]} · {'★'.repeat(e.quality)}{'☆'.repeat(5 - e.quality)}
                    {e.notes && ` · ${e.notes}`}
                  </div>
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: QUALITY_COLORS[e.quality], fontFamily: 'JetBrains Mono, monospace', flexShrink: 0 }}>
                  {e.hours}h
                </div>
                <button onClick={() => deleteEntry(e.id)} style={{ background: 'none', border: 'none', color: '#333', cursor: 'pointer' }}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
