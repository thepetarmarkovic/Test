import React, { useState, useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, ComposedChart
} from 'recharts';
import { Plus, DollarSign, TrendingUp, TrendingDown, Trash2, Edit2, X, Layers } from 'lucide-react';
import type { EarningEntry, ExpenseEntry } from '../types';
import { formatCurrency, formatCurrencyFull, formatDateShort, today, uid, dayOfWeekShort, getLastNDays } from '../utils/formatters';

const EARN_CATEGORIES: EarningEntry['category'][] = ['salary', 'freelance', 'investment', 'business', 'other'];
const EARN_COLORS: Record<string, string> = {
  salary: '#D4AF37', freelance: '#00D4FF', investment: '#00FF87', business: '#FF6B35', other: '#7B61FF',
};
const EARN_LABELS: Record<string, string> = {
  salary: '💼 Salary', freelance: '⚡ Freelance', investment: '📈 Investment', business: '🏢 Business', other: '✦ Other',
};

const EXP_CATEGORIES: ExpenseEntry['category'][] = ['housing', 'food', 'transport', 'subscriptions', 'entertainment', 'health', 'business', 'other'];
const EXP_COLORS: Record<string, string> = {
  housing: '#FF4141', food: '#FF6B35', transport: '#D4AF37', subscriptions: '#7B61FF',
  entertainment: '#00D4FF', health: '#00FF87', business: '#FF9F00', other: '#888',
};
const EXP_LABELS: Record<string, string> = {
  housing: '🏠 Housing', food: '🍔 Food', transport: '🚗 Transport', subscriptions: '📱 Subscriptions',
  entertainment: '🎮 Entertainment', health: '💊 Health', business: '💼 Business', other: '✦ Other',
};

type Tab = 'revenue' | 'expenses' | 'wealth';
type Timeline = '7d' | '30d' | '60d' | '3m' | '6m' | '1y';
const TIMELINES: { key: Timeline; label: string; days: number }[] = [
  { key: '7d', label: '7D', days: 7 },
  { key: '30d', label: '30D', days: 30 },
  { key: '60d', label: '60D', days: 60 },
  { key: '3m', label: '3M', days: 90 },
  { key: '6m', label: '6M', days: 180 },
  { key: '1y', label: '1Y', days: 365 },
];

interface Props {
  earnings: EarningEntry[];
  onChange: (e: EarningEntry[]) => void;
  expenses: ExpenseEntry[];
  onExpensesChange: (e: ExpenseEntry[]) => void;
}

export default function EarningsTracker({ earnings, onChange, expenses, onExpensesChange }: Props) {
  const [tab, setTab] = useState<Tab>('revenue');
  const [timeline, setTimeline] = useState<Timeline>('30d');
  const [showAdd, setShowAdd] = useState(false);
  const [showAddExp, setShowAddExp] = useState(false);

  // Revenue form
  const [amount, setAmount] = useState('');
  const [source, setSource] = useState('');
  const [category, setCategory] = useState<EarningEntry['category']>('freelance');
  const [date, setDate] = useState(today());
  const [notes, setNotes] = useState('');
  const [editEntry, setEditEntry] = useState<EarningEntry | null>(null);

  // Expense form
  const [expAmount, setExpAmount] = useState('');
  const [expDesc, setExpDesc] = useState('');
  const [expCat, setExpCat] = useState<ExpenseEntry['category']>('food');
  const [expDate, setExpDate] = useState(today());
  const [expNotes, setExpNotes] = useState('');
  const [editExp, setEditExp] = useState<ExpenseEntry | null>(null);

  const addEntry = () => {
    if (!amount || isNaN(parseFloat(amount))) return;
    const entry: EarningEntry = { id: uid(), amount: parseFloat(amount), source: source.trim() || 'Unlabeled', category, date, notes: notes.trim() };
    onChange([...earnings, entry].sort((a, b) => b.date.localeCompare(a.date)));
    setAmount(''); setSource(''); setNotes(''); setShowAdd(false);
  };

  const saveEdit = () => {
    if (!editEntry) return;
    onChange(earnings.map(e => e.id === editEntry.id ? editEntry : e).sort((a, b) => b.date.localeCompare(a.date)));
    setEditEntry(null);
  };

  const deleteEntry = (id: string) => onChange(earnings.filter(e => e.id !== id));

  const addExpense = () => {
    if (!expAmount || isNaN(parseFloat(expAmount))) return;
    const entry: ExpenseEntry = { id: uid(), amount: parseFloat(expAmount), description: expDesc.trim() || 'Unlabeled', category: expCat, date: expDate, notes: expNotes.trim() };
    onExpensesChange([...expenses, entry].sort((a, b) => b.date.localeCompare(a.date)));
    setExpAmount(''); setExpDesc(''); setExpNotes(''); setShowAddExp(false);
  };

  const saveEditExp = () => {
    if (!editExp) return;
    onExpensesChange(expenses.map(e => e.id === editExp.id ? editExp : e).sort((a, b) => b.date.localeCompare(a.date)));
    setEditExp(null);
  };

  const deleteExpense = (id: string) => onExpensesChange(expenses.filter(e => e.id !== id));

  const todayStr = today();
  const currentMonthKey = new Date().toISOString().slice(0, 7);

  const totalAll = earnings.reduce((s, e) => s + e.amount, 0);
  const totalThisMonth = earnings.filter(e => e.date.startsWith(currentMonthKey)).reduce((s, e) => s + e.amount, 0);
  const totalToday = earnings.filter(e => e.date === todayStr).reduce((s, e) => s + e.amount, 0);
  const totalThisWeek = (() => {
    const start = new Date(); start.setDate(start.getDate() - start.getDay());
    return earnings.filter(e => e.date >= start.toISOString().split('T')[0]).reduce((s, e) => s + e.amount, 0);
  })();

  const totalExpThisMonth = expenses.filter(e => e.date.startsWith(currentMonthKey)).reduce((s, e) => s + e.amount, 0);
  const netThisMonth = totalThisMonth - totalExpThisMonth;

  // Timeline chart data
  const timelineDays = useMemo(() => getLastNDays(TIMELINES.find(t => t.key === timeline)!.days), [timeline]);

  const chartData = useMemo(() => {
    const days = timelineDays.length;
    if (days <= 60) {
      return timelineDays.map(d => ({
        label: dayOfWeekShort(d),
        date: d,
        amount: earnings.filter(e => e.date === d).reduce((s, e) => s + e.amount, 0),
      }));
    }
    // Group by week for longer timelines
    const weeks: { label: string; date: string; amount: number }[] = [];
    for (let i = 0; i < timelineDays.length; i += 7) {
      const chunk = timelineDays.slice(i, i + 7);
      weeks.push({
        label: chunk[0].slice(5),
        date: chunk[0],
        amount: chunk.reduce((s, d) => s + earnings.filter(e => e.date === d).reduce((ss, e) => ss + e.amount, 0), 0),
      });
    }
    return weeks;
  }, [timelineDays, earnings]);

  // Pie by category (earnings)
  const catTotals = EARN_CATEGORIES.map(c => ({
    name: c, value: earnings.filter(e => e.category === c).reduce((s, e) => s + e.amount, 0),
  })).filter(c => c.value > 0);

  // Expense totals by category
  const expCatTotals = EXP_CATEGORIES.map(c => ({
    name: c, value: expenses.filter(e => e.category === c).reduce((s, e) => s + e.amount, 0),
  })).filter(c => c.value > 0);

  const totalAllExpenses = expenses.reduce((s, e) => s + e.amount, 0);

  // Wealth Matrix: last 12 months
  const wealthData = useMemo(() => {
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      const key = d.toISOString().slice(0, 7);
      const rev = earnings.filter(e => e.date.startsWith(key)).reduce((s, e) => s + e.amount, 0);
      const exp = expenses.filter(e => e.date.startsWith(key)).reduce((s, e) => s + e.amount, 0);
      months.push({
        month: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        key,
        revenue: rev,
        expenses: exp,
        savings: rev - exp,
      });
    }
    return months;
  }, [earnings, expenses]);

  const recent = [...earnings].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20);
  const recentExp = [...expenses].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20);

  const tabs: { key: Tab; label: string; color: string }[] = [
    { key: 'revenue', label: 'REVENUE', color: '#00FF87' },
    { key: 'expenses', label: 'EXPENSES', color: '#FF6B35' },
    { key: 'wealth', label: 'WEALTH MATRIX', color: '#D4AF37' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }} className="animate-fade-up">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: 11, color: '#555', letterSpacing: '0.12em', marginBottom: 4, fontFamily: 'JetBrains Mono, monospace' }}>
            FINANCIAL INTELLIGENCE
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0, color: '#fff' }}>EARNINGS VAULT</h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {tab === 'expenses' ? (
            <button onClick={() => setShowAddExp(true)} className="btn-gold" style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,107,53,0.15)', borderColor: '#FF6B35', color: '#FF6B35' }}>
              <Plus size={14} /> LOG EXPENSE
            </button>
          ) : (
            <button onClick={() => setShowAdd(true)} className="btn-gold" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={14} /> LOG REVENUE
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, background: '#0d0d0d', borderRadius: 10, padding: 4 }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700,
              letterSpacing: '0.08em', transition: 'all 0.15s',
              background: tab === t.key ? `${t.color}18` : 'transparent',
              color: tab === t.key ? t.color : '#444',
              borderBottom: tab === t.key ? `2px solid ${t.color}` : '2px solid transparent',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Add Revenue Modal */}
      {showAdd && (
        <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setShowAdd(false); }}>
          <div className="modal-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#00FF87', letterSpacing: '0.06em' }}>LOG REVENUE</h3>
              <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div className="label-upper" style={{ marginBottom: 6 }}>Amount ($)</div>
                  <input className="empire-input" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" min="0" step="0.01" autoFocus style={{ fontSize: 20, fontWeight: 700, color: '#00FF87', fontFamily: 'JetBrains Mono, monospace' }} />
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
                  {EARN_CATEGORIES.map(c => (
                    <button key={c} onClick={() => setCategory(c)} style={{ padding: '6px 14px', borderRadius: 20, border: `1px solid ${category === c ? EARN_COLORS[c] : '#2a2a2a'}`, background: category === c ? `${EARN_COLORS[c]}22` : 'transparent', color: category === c ? EARN_COLORS[c] : '#555', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}>
                      {EARN_LABELS[c]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="label-upper" style={{ marginBottom: 6 }}>Notes (optional)</div>
                <input className="empire-input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Context, deal terms..." />
              </div>
              <button onClick={addEntry} className="btn-gold" style={{ marginTop: 4 }}>SECURE THE BAG</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Expense Modal */}
      {showAddExp && (
        <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setShowAddExp(false); }}>
          <div className="modal-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#FF6B35', letterSpacing: '0.06em' }}>LOG EXPENSE</h3>
              <button onClick={() => setShowAddExp(false)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div className="label-upper" style={{ marginBottom: 6 }}>Amount ($)</div>
                  <input className="empire-input" type="number" value={expAmount} onChange={e => setExpAmount(e.target.value)} placeholder="0.00" min="0" step="0.01" autoFocus style={{ fontSize: 20, fontWeight: 700, color: '#FF6B35', fontFamily: 'JetBrains Mono, monospace' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div className="label-upper" style={{ marginBottom: 6 }}>Date</div>
                  <input className="empire-input" type="date" value={expDate} onChange={e => setExpDate(e.target.value)} />
                </div>
              </div>
              <div>
                <div className="label-upper" style={{ marginBottom: 6 }}>Description</div>
                <input className="empire-input" value={expDesc} onChange={e => setExpDesc(e.target.value)} placeholder="Rent, groceries, Netflix..." />
              </div>
              <div>
                <div className="label-upper" style={{ marginBottom: 6 }}>Category</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {EXP_CATEGORIES.map(c => (
                    <button key={c} onClick={() => setExpCat(c)} style={{ padding: '6px 14px', borderRadius: 20, border: `1px solid ${expCat === c ? EXP_COLORS[c] : '#2a2a2a'}`, background: expCat === c ? `${EXP_COLORS[c]}22` : 'transparent', color: expCat === c ? EXP_COLORS[c] : '#555', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}>
                      {EXP_LABELS[c]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="label-upper" style={{ marginBottom: 6 }}>Notes (optional)</div>
                <input className="empire-input" value={expNotes} onChange={e => setExpNotes(e.target.value)} placeholder="Recurring, one-time, necessary..." />
              </div>
              <button onClick={addExpense} className="btn-gold" style={{ marginTop: 4, background: 'rgba(255,107,53,0.15)', borderColor: '#FF6B35', color: '#FF6B35' }}>LOG EXPENSE</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Revenue Modal */}
      {editEntry && (
        <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setEditEntry(null); }}>
          <div className="modal-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#D4AF37' }}>EDIT ENTRY</h3>
              <button onClick={() => setEditEntry(null)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div className="label-upper" style={{ marginBottom: 6 }}>Amount ($)</div>
                  <input className="empire-input" type="number" value={editEntry.amount} onChange={e => setEditEntry({ ...editEntry, amount: parseFloat(e.target.value) || 0 })} style={{ fontSize: 20, fontWeight: 700, color: '#00FF87', fontFamily: 'JetBrains Mono, monospace' }} />
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
                  {EARN_CATEGORIES.map(c => <option key={c} value={c}>{EARN_LABELS[c]}</option>)}
                </select>
              </div>
              <button onClick={saveEdit} className="btn-gold">SAVE CHANGES</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Expense Modal */}
      {editExp && (
        <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setEditExp(null); }}>
          <div className="modal-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#FF6B35' }}>EDIT EXPENSE</h3>
              <button onClick={() => setEditExp(null)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div className="label-upper" style={{ marginBottom: 6 }}>Amount ($)</div>
                  <input className="empire-input" type="number" value={editExp.amount} onChange={e => setEditExp({ ...editExp, amount: parseFloat(e.target.value) || 0 })} style={{ fontSize: 20, fontWeight: 700, color: '#FF6B35', fontFamily: 'JetBrains Mono, monospace' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div className="label-upper" style={{ marginBottom: 6 }}>Date</div>
                  <input className="empire-input" type="date" value={editExp.date} onChange={e => setEditExp({ ...editExp, date: e.target.value })} />
                </div>
              </div>
              <div>
                <div className="label-upper" style={{ marginBottom: 6 }}>Description</div>
                <input className="empire-input" value={editExp.description} onChange={e => setEditExp({ ...editExp, description: e.target.value })} />
              </div>
              <div>
                <div className="label-upper" style={{ marginBottom: 6 }}>Category</div>
                <select className="empire-select" value={editExp.category} onChange={e => setEditExp({ ...editExp, category: e.target.value as ExpenseEntry['category'] })}>
                  {EXP_CATEGORIES.map(c => <option key={c} value={c}>{EXP_LABELS[c]}</option>)}
                </select>
              </div>
              <button onClick={saveEditExp} className="btn-gold" style={{ background: 'rgba(255,107,53,0.15)', borderColor: '#FF6B35', color: '#FF6B35' }}>SAVE CHANGES</button>
            </div>
          </div>
        </div>
      )}

      {/* ── REVENUE TAB ── */}
      {tab === 'revenue' && (
        <>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            {[
              { label: 'ALL TIME', value: formatCurrency(totalAll), color: '#D4AF37', sub: 'total revenue' },
              { label: 'THIS MONTH', value: formatCurrency(totalThisMonth), color: '#00FF87', sub: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) },
              { label: 'THIS WEEK', value: formatCurrency(totalThisWeek), color: '#00D4FF', sub: 'current week' },
              { label: 'TODAY', value: formatCurrency(totalToday), color: '#FF6B35', sub: new Date().toLocaleDateString('en-US', { weekday: 'long' }) },
            ].map(s => (
              <div key={s.label} className="empire-card" style={{ flex: 1, minWidth: 120 }}>
                <div style={{ fontSize: 9, color: '#555', letterSpacing: '0.12em', marginBottom: 8 }}>{s.label}</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: s.color, fontFamily: 'JetBrains Mono, monospace' }}>{s.value}</div>
                <div style={{ fontSize: 10, color: '#444', marginTop: 4 }}>{s.sub}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
            <div className="empire-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: '#555', letterSpacing: '0.1em', fontWeight: 700 }}>REVENUE FLOW</div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {TIMELINES.map(t => (
                    <button key={t.key} onClick={() => setTimeline(t.key)} style={{ padding: '4px 10px', borderRadius: 6, border: `1px solid ${timeline === t.key ? '#00FF87' : '#1f1f1f'}`, background: timeline === t.key ? 'rgba(0,255,135,0.1)' : 'transparent', color: timeline === t.key ? '#00FF87' : '#444', fontSize: 10, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' }}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00FF87" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#00FF87" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="label" tick={{ fill: '#444', fontSize: 9 }} axisLine={false} tickLine={false} interval={Math.floor(chartData.length / 8)} />
                  <YAxis hide />
                  <Tooltip contentStyle={{ background: '#0d0d0d', border: '1px solid rgba(0,255,135,0.3)', borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [formatCurrencyFull(v), 'Revenue']} labelFormatter={(l: string, p: { payload?: { date: string } }[]) => p?.[0]?.payload?.date || l} labelStyle={{ color: '#888' }} />
                  <Area type="monotone" dataKey="amount" stroke="#00FF87" strokeWidth={2} fill="url(#revGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="empire-card">
              <div style={{ fontSize: 11, color: '#555', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 10 }}>BY SOURCE</div>
              {catTotals.length === 0 ? (
                <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#333', fontSize: 13 }}>No data yet</div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={120}>
                    <PieChart>
                      <Pie data={catTotals} dataKey="value" cx="50%" cy="50%" innerRadius={30} outerRadius={55}>
                        {catTotals.map(e => <Cell key={e.name} fill={EARN_COLORS[e.name]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: '#0d0d0d', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [formatCurrency(v)]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {catTotals.map(c => (
                      <div key={c.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: EARN_COLORS[c.name] }} />
                          <span style={{ fontSize: 10, color: '#888' }}>{EARN_LABELS[c.name]}</span>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: EARN_COLORS[c.name] }}>{formatCurrency(c.value)}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="empire-card">
            <div style={{ fontSize: 11, color: '#555', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 16 }}>REVENUE LEDGER</div>
            {recent.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#333', fontSize: 13 }}>No entries yet. Log your first revenue above.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {recent.map((e, i) => (
                  <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 0', borderBottom: i < recent.length - 1 ? '1px solid #111' : 'none' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: `${EARN_COLORS[e.category]}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <DollarSign size={14} color={EARN_COLORS[e.category]} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#ddd' }}>{e.source}</div>
                      <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>{EARN_LABELS[e.category]} · {formatDateShort(e.date)}{e.notes && ` · ${e.notes}`}</div>
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#00FF87', fontFamily: 'JetBrains Mono, monospace', flexShrink: 0 }}>+{formatCurrencyFull(e.amount)}</div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button onClick={() => setEditEntry(e)} style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer' }}><Edit2 size={14} /></button>
                      <button onClick={() => deleteEntry(e.id)} style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer' }}><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── EXPENSES TAB ── */}
      {tab === 'expenses' && (
        <>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            {[
              { label: 'ALL TIME', value: formatCurrency(totalAllExpenses), color: '#FF4141', sub: 'total spent' },
              { label: 'THIS MONTH', value: formatCurrency(totalExpThisMonth), color: '#FF6B35', sub: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) },
              { label: 'NET THIS MONTH', value: formatCurrency(netThisMonth), color: netThisMonth >= 0 ? '#00FF87' : '#FF4141', sub: netThisMonth >= 0 ? 'surplus' : 'deficit' },
            ].map(s => (
              <div key={s.label} className="empire-card" style={{ flex: 1, minWidth: 120 }}>
                <div style={{ fontSize: 9, color: '#555', letterSpacing: '0.12em', marginBottom: 8 }}>{s.label}</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: s.color, fontFamily: 'JetBrains Mono, monospace' }}>{s.value}</div>
                <div style={{ fontSize: 10, color: '#444', marginTop: 4 }}>{s.sub}</div>
              </div>
            ))}
          </div>

          {expCatTotals.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
              <div className="empire-card">
                <div style={{ fontSize: 11, color: '#555', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 16 }}>EXPENSES BY CATEGORY</div>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={expCatTotals.map(c => ({ name: EXP_LABELS[c.name].split(' ')[1], value: c.value, color: EXP_COLORS[c.name] }))} barCategoryGap="20%">
                    <XAxis dataKey="name" tick={{ fill: '#555', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip contentStyle={{ background: '#0d0d0d', border: '1px solid rgba(255,107,53,0.3)', borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [formatCurrencyFull(v), 'Expense']} labelStyle={{ color: '#888' }} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {expCatTotals.map((c, i) => <Cell key={i} fill={EXP_COLORS[c.name]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="empire-card">
                <div style={{ fontSize: 11, color: '#555', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 10 }}>BREAKDOWN</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {expCatTotals.map(c => (
                    <div key={c.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: EXP_COLORS[c.name] }} />
                        <span style={{ fontSize: 10, color: '#888' }}>{EXP_LABELS[c.name]}</span>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: EXP_COLORS[c.name] }}>{formatCurrency(c.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="empire-card">
            <div style={{ fontSize: 11, color: '#555', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 16 }}>EXPENSE LEDGER</div>
            {recentExp.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#333', fontSize: 13 }}>No expenses logged. Track what you spend.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {recentExp.map((e, i) => (
                  <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 0', borderBottom: i < recentExp.length - 1 ? '1px solid #111' : 'none' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: `${EXP_COLORS[e.category]}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <TrendingDown size={14} color={EXP_COLORS[e.category]} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#ddd' }}>{e.description}</div>
                      <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>{EXP_LABELS[e.category]} · {formatDateShort(e.date)}{e.notes && ` · ${e.notes}`}</div>
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#FF6B35', fontFamily: 'JetBrains Mono, monospace', flexShrink: 0 }}>-{formatCurrencyFull(e.amount)}</div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button onClick={() => setEditExp(e)} style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer' }}><Edit2 size={14} /></button>
                      <button onClick={() => deleteExpense(e.id)} style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer' }}><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── WEALTH MATRIX TAB ── */}
      {tab === 'wealth' && (
        <>
          {/* Current month summary */}
          <div className="empire-card" style={{ borderColor: 'rgba(212,175,55,0.3)', background: 'linear-gradient(135deg, rgba(212,175,55,0.06), transparent)' }}>
            <div style={{ fontSize: 11, color: '#D4AF37', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 16 }}>◆ {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase()} SNAPSHOT</div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {[
                { label: 'REVENUE IN', value: formatCurrency(totalThisMonth), color: '#00FF87', icon: <TrendingUp size={14} /> },
                { label: 'EXPENSES OUT', value: formatCurrency(totalExpThisMonth), color: '#FF6B35', icon: <TrendingDown size={14} /> },
                { label: 'NET SAVINGS', value: formatCurrency(netThisMonth), color: netThisMonth >= 0 ? '#D4AF37' : '#FF4141', icon: <Layers size={14} /> },
                { label: 'SAVINGS RATE', value: totalThisMonth > 0 ? `${Math.round((netThisMonth / totalThisMonth) * 100)}%` : '—', color: '#00D4FF' },
              ].map(s => (
                <div key={s.label} style={{ flex: 1, minWidth: 100, textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: s.color, fontFamily: 'JetBrains Mono, monospace' }}>{s.value}</div>
                  <div style={{ fontSize: 9, color: '#555', letterSpacing: '0.1em', marginTop: 6 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 12-month bar chart */}
          <div className="empire-card">
            <div style={{ fontSize: 11, color: '#555', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 16 }}>12-MONTH WEALTH FLOW</div>
            <ResponsiveContainer width="100%" height={200}>
              <ComposedChart data={wealthData} barCategoryGap="20%">
                <XAxis dataKey="month" tick={{ fill: '#444', fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ background: '#0d0d0d', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number, name: string) => [formatCurrencyFull(v), name === 'revenue' ? 'Revenue' : name === 'expenses' ? 'Expenses' : 'Net Savings']}
                  labelStyle={{ color: '#888' }}
                />
                <Bar dataKey="revenue" fill="rgba(0,255,135,0.6)" radius={[3, 3, 0, 0]} name="revenue" />
                <Bar dataKey="expenses" fill="rgba(255,107,53,0.6)" radius={[3, 3, 0, 0]} name="expenses" />
                <Area type="monotone" dataKey="savings" stroke="#D4AF37" strokeWidth={2} fill="rgba(212,175,55,0.1)" name="savings" dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 8 }}>
              {[['rgba(0,255,135,0.6)', 'Revenue'], ['rgba(255,107,53,0.6)', 'Expenses'], ['#D4AF37', 'Net Savings']].map(([c, l]) => (
                <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: c }} />
                  <span style={{ fontSize: 10, color: '#555' }}>{l}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Monthly breakdown table */}
          <div className="empire-card">
            <div style={{ fontSize: 11, color: '#555', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 16 }}>MONTHLY BREAKDOWN</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <div style={{ display: 'flex', gap: 12, padding: '0 0 10px', borderBottom: '1px solid #1a1a1a' }}>
                {['MONTH', 'REVENUE', 'EXPENSES', 'NET', 'RATE'].map((h, i) => (
                  <div key={h} style={{ flex: i === 0 ? 1.2 : 1, fontSize: 9, color: '#444', letterSpacing: '0.1em', fontWeight: 700, textAlign: i > 0 ? 'right' : 'left' }}>{h}</div>
                ))}
              </div>
              {[...wealthData].reverse().filter(m => m.revenue > 0 || m.expenses > 0).map((m, i, arr) => {
                const rate = m.revenue > 0 ? Math.round((m.savings / m.revenue) * 100) : 0;
                return (
                  <div key={m.key} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: i < arr.length - 1 ? '1px solid #0d0d0d' : 'none' }}>
                    <div style={{ flex: 1.2, fontSize: 12, fontWeight: 600, color: '#888' }}>{m.month}</div>
                    <div style={{ flex: 1, fontSize: 12, fontWeight: 700, color: '#00FF87', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace' }}>{formatCurrency(m.revenue)}</div>
                    <div style={{ flex: 1, fontSize: 12, fontWeight: 700, color: '#FF6B35', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace' }}>{formatCurrency(m.expenses)}</div>
                    <div style={{ flex: 1, fontSize: 12, fontWeight: 700, color: m.savings >= 0 ? '#D4AF37' : '#FF4141', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace' }}>{formatCurrency(m.savings)}</div>
                    <div style={{ flex: 1, fontSize: 12, fontWeight: 700, color: rate >= 30 ? '#00FF87' : rate >= 0 ? '#D4AF37' : '#FF4141', textAlign: 'right' }}>{m.revenue > 0 ? `${rate}%` : '—'}</div>
                  </div>
                );
              })}
              {wealthData.filter(m => m.revenue > 0 || m.expenses > 0).length === 0 && (
                <div style={{ textAlign: 'center', padding: '30px', color: '#333', fontSize: 13 }}>Log revenue and expenses to see your monthly breakdown.</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
