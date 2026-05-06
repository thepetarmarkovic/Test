import React, { useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';
import { Plus, DollarSign, TrendingUp, Trash2, Edit2, X } from 'lucide-react';
import type { EarningEntry } from '../types';
import { formatCurrency, formatCurrencyFull, formatDateShort, getLast30Days, today, uid, dayOfWeekShort } from '../utils/formatters';

const CATEGORIES: EarningEntry['category'][] = ['salary', 'freelance', 'investment', 'business', 'other'];
const CAT_COLORS: Record<string, string> = {
  salary: '#D4AF37',
  freelance: '#00D4FF',
  investment: '#00FF87',
  business: '#FF6B35',
  other: '#7B61FF',
};
const CAT_LABELS: Record<string, string> = {
  salary: '💼 Salary',
  freelance: '⚡ Freelance',
  investment: '📈 Investment',
  business: '🏢 Business',
  other: '✦ Other',
};

interface Props {
  earnings: EarningEntry[];
  onChange: (e: EarningEntry[]) => void;
}

export default function EarningsTracker({ earnings, onChange }: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const [amount, setAmount] = useState('');
  const [source, setSource] = useState('');
  const [category, setCategory] = useState<EarningEntry['category']>('freelance');
  const [date, setDate] = useState(today());
  const [notes, setNotes] = useState('');
  const [editEntry, setEditEntry] = useState<EarningEntry | null>(null);

  const addEntry = () => {
    if (!amount || isNaN(parseFloat(amount))) return;
    const entry: EarningEntry = {
      id: uid(),
      amount: parseFloat(amount),
      source: source.trim() || 'Unlabeled',
      category,
      date,
      notes: notes.trim(),
    };
    onChange([...earnings, entry].sort((a, b) => b.date.localeCompare(a.date)));
    setAmount(''); setSource(''); setNotes(''); setShowAdd(false);
  };

  const saveEdit = () => {
    if (!editEntry) return;
    onChange(earnings.map(e => e.id === editEntry.id ? editEntry : e).sort((a, b) => b.date.localeCompare(a.date)));
    setEditEntry(null);
  };

  const deleteEntry = (id: string) => onChange(earnings.filter(e => e.id !== id));

  const todayStr = today();
  const last30 = getLast30Days();

  const totalAll = earnings.reduce((s, e) => s + e.amount, 0);
  const totalThisMonth = earnings.filter(e => e.date.startsWith(new Date().toISOString().slice(0, 7))).reduce((s, e) => s + e.amount, 0);
  const totalToday = earnings.filter(e => e.date === todayStr).reduce((s, e) => s + e.amount, 0);
  const totalThisWeek = (() => {
    const start = new Date(); start.setDate(start.getDate() - start.getDay());
    return earnings.filter(e => e.date >= start.toISOString().split('T')[0]).reduce((s, e) => s + e.amount, 0);
  })();

  // 30-day chart
  const chartData = last30.map(d => ({
    day: dayOfWeekShort(d),
    date: d,
    amount: earnings.filter(e => e.date === d).reduce((s, e) => s + e.amount, 0),
  }));

  // Pie by category
  const catTotals = CATEGORIES.map(c => ({
    name: c,
    value: earnings.filter(e => e.category === c).reduce((s, e) => s + e.amount, 0),
  })).filter(c => c.value > 0);

  // Recent entries
  const recent = [...earnings].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }} className="animate-fade-up">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: 11, color: '#555', letterSpacing: '0.12em', marginBottom: 4, fontFamily: 'JetBrains Mono, monospace' }}>
            REVENUE INTELLIGENCE
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0, color: '#fff' }}>EARNINGS VAULT</h1>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-gold" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={14} /> LOG REVENUE
        </button>
      </div>

      {/* Add Modal */}
      {showAdd && (
        <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setShowAdd(false); }}>
          <div className="modal-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#00FF87', letterSpacing: '0.06em' }}>
                LOG REVENUE
              </h3>
              <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div className="label-upper" style={{ marginBottom: 6 }}>Amount ($)</div>
                  <input
                    className="empire-input"
                    type="number"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    autoFocus
                    style={{ fontSize: 20, fontWeight: 700, color: '#00FF87', fontFamily: 'JetBrains Mono, monospace' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <div className="label-upper" style={{ marginBottom: 6 }}>Date</div>
                  <input className="empire-input" type="date" value={date} onChange={e => setDate(e.target.value)} />
                </div>
              </div>
              <div>
                <div className="label-upper" style={{ marginBottom: 6 }}>Source</div>
                <input className="empire-input" value={source} onChange={e => setSource(e.target.value)} placeholder="Client name, project, stock..." />
              </div>
              <div>
                <div className="label-upper" style={{ marginBottom: 6 }}>Category</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {CATEGORIES.map(c => (
                    <button
                      key={c}
                      onClick={() => setCategory(c)}
                      style={{
                        padding: '6px 14px', borderRadius: 20,
                        border: `1px solid ${category === c ? CAT_COLORS[c] : '#2a2a2a'}`,
                        background: category === c ? `${CAT_COLORS[c]}22` : 'transparent',
                        color: category === c ? CAT_COLORS[c] : '#555',
                        fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                      }}
                    >
                      {CAT_LABELS[c]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="label-upper" style={{ marginBottom: 6 }}>Notes (optional)</div>
                <input className="empire-input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Context, deal terms..." />
              </div>
              <button onClick={addEntry} className="btn-gold" style={{ marginTop: 4 }}>
                SECURE THE BAG
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editEntry && (
        <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setEditEntry(null); }}>
          <div className="modal-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#D4AF37' }}>EDIT ENTRY</h3>
              <button onClick={() => setEditEntry(null)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div className="label-upper" style={{ marginBottom: 6 }}>Amount ($)</div>
                  <input
                    className="empire-input"
                    type="number"
                    value={editEntry.amount}
                    onChange={e => setEditEntry({ ...editEntry, amount: parseFloat(e.target.value) || 0 })}
                    style={{ fontSize: 20, fontWeight: 700, color: '#00FF87', fontFamily: 'JetBrains Mono, monospace' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <div className="label-upper" style={{ marginBottom: 6 }}>Date</div>
                  <input className="empire-input" type="date" value={editEntry.date} onChange={e => setEditEntry({ ...editEntry, date: e.target.value })} />
                </div>
              </div>
              <div>
                <div className="label-upper" style={{ marginBottom: 6 }}>Source</div>
                <input className="empire-input" value={editEntry.source} onChange={e => setEditEntry({ ...editEntry, source: e.target.value })} />
              </div>
              <div>
                <div className="label-upper" style={{ marginBottom: 6 }}>Category</div>
                <select className="empire-select" value={editEntry.category} onChange={e => setEditEntry({ ...editEntry, category: e.target.value as EarningEntry['category'] })}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
                </select>
              </div>
              <button onClick={saveEdit} className="btn-gold">SAVE CHANGES</button>
            </div>
          </div>
        </div>
      )}

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        {[
          { label: 'ALL TIME', value: formatCurrency(totalAll), color: '#D4AF37', sub: 'total revenue' },
          { label: 'THIS MONTH', value: formatCurrency(totalThisMonth), color: '#00FF87', sub: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) },
          { label: 'THIS WEEK', value: formatCurrency(totalThisWeek), color: '#00D4FF', sub: 'current week' },
          { label: 'TODAY', value: formatCurrency(totalToday), color: '#FF6B35', sub: new Date().toLocaleDateString('en-US', { weekday: 'long' }) },
        ].map(s => (
          <div key={s.label} className="empire-card" style={{ flex: 1, minWidth: 120 }}>
            <div style={{ fontSize: 9, color: '#555', letterSpacing: '0.12em', marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: s.color, fontFamily: 'JetBrains Mono, monospace' }}>
              {s.value}
            </div>
            <div style={{ fontSize: 10, color: '#444', marginTop: 4 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        {/* 30-day area */}
        <div className="empire-card">
          <div style={{ fontSize: 11, color: '#555', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 16 }}>
            30-DAY REVENUE FLOW
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00FF87" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#00FF87" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" tick={{ fill: '#444', fontSize: 9 }} axisLine={false} tickLine={false} interval={4} />
              <YAxis hide />
              <Tooltip
                contentStyle={{ background: '#0d0d0d', border: '1px solid rgba(0,255,135,0.3)', borderRadius: 8, fontSize: 12 }}
                formatter={(v: number) => [formatCurrencyFull(v), 'Revenue']}
                labelFormatter={(l: string, p: { payload?: { date: string } }[]) => p?.[0]?.payload?.date || l}
                labelStyle={{ color: '#888' }}
              />
              <Area type="monotone" dataKey="amount" stroke="#00FF87" strokeWidth={2} fill="url(#revGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Pie by category */}
        <div className="empire-card">
          <div style={{ fontSize: 11, color: '#555', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 10 }}>
            BY SOURCE
          </div>
          {catTotals.length === 0 ? (
            <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#333', fontSize: 13 }}>
              No data yet
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={120}>
                <PieChart>
                  <Pie data={catTotals} dataKey="value" cx="50%" cy="50%" innerRadius={30} outerRadius={55}>
                    {catTotals.map(e => (
                      <Cell key={e.name} fill={CAT_COLORS[e.name]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#0d0d0d', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 8, fontSize: 12 }}
                    formatter={(v: number) => [formatCurrency(v)]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {catTotals.map(c => (
                  <div key={c.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: CAT_COLORS[c.name] }} />
                      <span style={{ fontSize: 10, color: '#888' }}>{CAT_LABELS[c.name]}</span>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: CAT_COLORS[c.name] }}>{formatCurrency(c.value)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Ledger */}
      <div className="empire-card">
        <div style={{ fontSize: 11, color: '#555', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 16 }}>
          REVENUE LEDGER
        </div>
        {recent.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#333', fontSize: 13 }}>
            No entries yet. Log your first revenue above.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {recent.map((e, i) => (
              <div
                key={e.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 16, padding: '12px 0',
                  borderBottom: i < recent.length - 1 ? '1px solid #111' : 'none',
                }}
              >
                <div
                  style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: `${CAT_COLORS[e.category]}15`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <DollarSign size={14} color={CAT_COLORS[e.category]} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#ddd' }}>{e.source}</div>
                  <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>
                    {CAT_LABELS[e.category]} · {formatDateShort(e.date)}
                    {e.notes && ` · ${e.notes}`}
                  </div>
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#00FF87', fontFamily: 'JetBrains Mono, monospace', flexShrink: 0 }}>
                  +{formatCurrencyFull(e.amount)}
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button onClick={() => setEditEntry(e)} style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer' }}>
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => deleteEntry(e.id)} style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
