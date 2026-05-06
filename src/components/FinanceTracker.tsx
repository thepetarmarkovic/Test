import React, { useState, useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';
import { Plus, Trash2, Edit2, X, TrendingUp, TrendingDown, DollarSign, AlertTriangle } from 'lucide-react';
import type { Asset, Liability, BudgetCategory, Subscription, PortfolioItem, NetWorthSnapshot, FireSettings } from '../types';
import { formatCurrency, formatCurrencyFull, uid, today, formatDateShort } from '../utils/formatters';

const ASSET_CATS: { id: Asset['category']; label: string; emoji: string; color: string }[] = [
  { id: 'cash', label: 'Cash & Bank', emoji: '🏦', color: '#00FF87' },
  { id: 'investment', label: 'Investments', emoji: '📈', color: '#D4AF37' },
  { id: 'crypto', label: 'Crypto', emoji: '₿', color: '#FF6B35' },
  { id: 'property', label: 'Property', emoji: '🏠', color: '#00D4FF' },
  { id: 'vehicle', label: 'Vehicles', emoji: '🚗', color: '#7B61FF' },
  { id: 'other', label: 'Other', emoji: '✦', color: '#888' },
];

const LIAB_CATS: { id: Liability['category']; label: string; color: string }[] = [
  { id: 'mortgage', label: 'Mortgage', color: '#FF4141' },
  { id: 'loan', label: 'Loan', color: '#FF6B35' },
  { id: 'credit', label: 'Credit Card', color: '#D4AF37' },
  { id: 'other', label: 'Other', color: '#888' },
];

const BUDGET_COLORS = ['#D4AF37', '#00FF87', '#00D4FF', '#FF6B35', '#7B61FF', '#FF4141', '#888', '#C0C0C0'];

interface Props {
  assets: Asset[];
  liabilities: Liability[];
  budget: BudgetCategory[];
  subscriptions: Subscription[];
  portfolio: PortfolioItem[];
  netWorthHistory: NetWorthSnapshot[];
  fireSettings: FireSettings;
  onAssetsChange: (a: Asset[]) => void;
  onLiabilitiesChange: (l: Liability[]) => void;
  onBudgetChange: (b: BudgetCategory[]) => void;
  onSubscriptionsChange: (s: Subscription[]) => void;
  onPortfolioChange: (p: PortfolioItem[]) => void;
  onNetWorthHistoryChange: (h: NetWorthSnapshot[]) => void;
  onFireSettingsChange: (f: FireSettings) => void;
}

type Tab = 'overview' | 'assets' | 'budget' | 'subscriptions' | 'portfolio' | 'fire';

export default function FinanceTracker({
  assets, liabilities, budget, subscriptions, portfolio,
  netWorthHistory, fireSettings,
  onAssetsChange, onLiabilitiesChange, onBudgetChange,
  onSubscriptionsChange, onPortfolioChange, onNetWorthHistoryChange, onFireSettingsChange,
}: Props) {
  const [tab, setTab] = useState<Tab>('overview');
  const [showAddAsset, setShowAddAsset] = useState(false);
  const [showAddLiab, setShowAddLiab] = useState(false);
  const [showAddBudget, setShowAddBudget] = useState(false);
  const [showAddSub, setShowAddSub] = useState(false);
  const [showAddPortfolio, setShowAddPortfolio] = useState(false);

  // Asset form
  const [aName, setAName] = useState(''); const [aCat, setACat] = useState<Asset['category']>('cash'); const [aVal, setAVal] = useState(''); const [aNotes, setANotes] = useState('');
  // Liability form
  const [lName, setLName] = useState(''); const [lCat, setLCat] = useState<Liability['category']>('loan'); const [lVal, setLVal] = useState('');
  // Budget form
  const [bName, setBName] = useState(''); const [bEmoji, setBEmoji] = useState('🛒'); const [bBudget, setBBudget] = useState(''); const [bSpent, setBSpent] = useState('');
  // Subscription form
  const [sName, setSName] = useState(''); const [sEmoji, setSEmoji] = useState('📱'); const [sAmt, setSAmt] = useState(''); const [sFreq, setSFreq] = useState<'monthly' | 'yearly'>('monthly'); const [sCat, setSCat] = useState('Entertainment');
  // Portfolio form
  const [pSymbol, setPSymbol] = useState(''); const [pName, setPName] = useState(''); const [pShares, setPShares] = useState(''); const [pAvg, setPAvg] = useState(''); const [pCurrent, setPCurrent] = useState(''); const [pCat, setPCat] = useState<PortfolioItem['category']>('stock');

  const totalAssets = assets.reduce((s, a) => s + a.value, 0);
  const totalLiabilities = liabilities.reduce((s, l) => s + l.value, 0);
  const netWorth = totalAssets - totalLiabilities;

  const monthlySubscriptions = subscriptions.filter(s => s.active).reduce((sum, s) => sum + (s.frequency === 'monthly' ? s.amount : s.amount / 12), 0);
  const annualSubscriptions = monthlySubscriptions * 12;

  const portfolioValue = portfolio.reduce((s, p) => s + p.shares * p.currentPrice, 0);
  const portfolioCost = portfolio.reduce((s, p) => s + p.shares * p.avgPrice, 0);
  const portfolioPnL = portfolioValue - portfolioCost;
  const portfolioPnLPct = portfolioCost > 0 ? (portfolioPnL / portfolioCost) * 100 : 0;

  // FIRE calculation
  const fireNumber = fireSettings.monthlyExpenses * 12 * 25;
  const annualSavings = fireSettings.monthlySavings * 12;
  const gap = Math.max(fireNumber - fireSettings.currentSavings, 0);
  const r = fireSettings.expectedReturn / 100;
  const yearsToFire = r > 0 && annualSavings > 0
    ? Math.log(1 + (gap * r) / annualSavings) / Math.log(1 + r)
    : gap / (annualSavings || 1);
  const fireDate = new Date();
  fireDate.setFullYear(fireDate.getFullYear() + Math.ceil(yearsToFire));

  // Snapshot net worth
  const snapshotNetWorth = () => {
    const snap: NetWorthSnapshot = {
      id: uid(), date: today(), netWorth, assets: totalAssets, liabilities: totalLiabilities,
    };
    onNetWorthHistoryChange([...netWorthHistory, snap].slice(-36));
  };

  const addAsset = () => {
    if (!aName || !aVal) return;
    onAssetsChange([...assets, { id: uid(), name: aName, category: aCat, value: parseFloat(aVal), date: today(), notes: aNotes }]);
    setAName(''); setAVal(''); setANotes(''); setShowAddAsset(false);
  };

  const addLiability = () => {
    if (!lName || !lVal) return;
    onLiabilitiesChange([...liabilities, { id: uid(), name: lName, category: lCat, value: parseFloat(lVal), date: today(), notes: '' }]);
    setLName(''); setLVal(''); setShowAddLiab(false);
  };

  const addBudget = () => {
    if (!bName || !bBudget) return;
    const color = BUDGET_COLORS[budget.length % BUDGET_COLORS.length];
    onBudgetChange([...budget, { id: uid(), name: bName, emoji: bEmoji, budgeted: parseFloat(bBudget), spent: parseFloat(bSpent) || 0, color }]);
    setBName(''); setBBudget(''); setBSpent(''); setShowAddBudget(false);
  };

  const addSub = () => {
    if (!sName || !sAmt) return;
    onSubscriptionsChange([...subscriptions, { id: uid(), name: sName, emoji: sEmoji, amount: parseFloat(sAmt), frequency: sFreq, category: sCat, active: true, color: BUDGET_COLORS[subscriptions.length % BUDGET_COLORS.length] }]);
    setSName(''); setSAmt(''); setShowAddSub(false);
  };

  const addPortfolio = () => {
    if (!pSymbol || !pShares || !pAvg || !pCurrent) return;
    onPortfolioChange([...portfolio, { id: uid(), symbol: pSymbol.toUpperCase(), name: pName || pSymbol.toUpperCase(), shares: parseFloat(pShares), avgPrice: parseFloat(pAvg), currentPrice: parseFloat(pCurrent), category: pCat }]);
    setPSymbol(''); setPName(''); setPShares(''); setPAvg(''); setPCurrent(''); setShowAddPortfolio(false);
  };

  const updateBudgetSpent = (id: string, spent: number) => {
    onBudgetChange(budget.map(b => b.id === id ? { ...b, spent } : b));
  };

  const updatePortfolioPrice = (id: string, price: number) => {
    onPortfolioChange(portfolio.map(p => p.id === id ? { ...p, currentPrice: price } : p));
  };

  const TABS: { id: Tab; label: string; color: string }[] = [
    { id: 'overview', label: 'OVERVIEW', color: '#D4AF37' },
    { id: 'assets', label: 'ASSETS', color: '#00FF87' },
    { id: 'budget', label: 'BUDGET', color: '#00D4FF' },
    { id: 'subscriptions', label: 'SUBSCRIPTIONS', color: '#FF6B35' },
    { id: 'portfolio', label: 'PORTFOLIO', color: '#7B61FF' },
    { id: 'fire', label: 'FIRE CALC', color: '#FF4141' },
  ];

  const assetPieData = ASSET_CATS.map(c => ({
    name: c.label,
    value: assets.filter(a => a.category === c.id).reduce((s, a) => s + a.value, 0),
    color: c.color,
  })).filter(d => d.value > 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }} className="animate-fade-up">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: 11, color: '#555', letterSpacing: '0.12em', marginBottom: 4, fontFamily: 'JetBrains Mono, monospace' }}>
            FINANCIAL INTELLIGENCE
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0, color: '#fff' }}>WEALTH MATRIX</h1>
        </div>
        <button onClick={snapshotNetWorth} className="btn-ghost" style={{ fontSize: 10 }}>
          📸 SNAPSHOT NET WORTH
        </button>
      </div>

      {/* Net Worth Hero */}
      <div
        className="empire-card"
        style={{
          background: 'linear-gradient(135deg, rgba(212,175,55,0.08) 0%, rgba(0,0,0,0) 100%)',
          borderColor: netWorth >= 0 ? 'rgba(212,175,55,0.3)' : 'rgba(255,65,65,0.3)',
          padding: '32px 28px',
        }}
      >
        <div style={{ fontSize: 11, color: '#555', letterSpacing: '0.14em', marginBottom: 12 }}>CURRENT NET WORTH</div>
        <div style={{
          fontSize: 56, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.03em',
          fontFamily: 'JetBrains Mono, monospace',
          background: netWorth >= 0
            ? 'linear-gradient(135deg, #D4AF37 0%, #FFD700 50%, #D4AF37 100%)'
            : 'linear-gradient(135deg, #FF4141, #FF6B35)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          marginBottom: 16,
        }}>
          {netWorth >= 0 ? '' : '-'}{formatCurrency(Math.abs(netWorth))}
        </div>
        <div style={{ display: 'flex', gap: 32 }}>
          <div>
            <div style={{ fontSize: 11, color: '#555', marginBottom: 4 }}>TOTAL ASSETS</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#00FF87', fontFamily: 'JetBrains Mono, monospace' }}>{formatCurrency(totalAssets)}</div>
          </div>
          <div style={{ width: 1, background: '#1f1f1f' }} />
          <div>
            <div style={{ fontSize: 11, color: '#555', marginBottom: 4 }}>TOTAL LIABILITIES</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#FF4141', fontFamily: 'JetBrains Mono, monospace' }}>-{formatCurrency(totalLiabilities)}</div>
          </div>
          <div style={{ width: 1, background: '#1f1f1f' }} />
          <div>
            <div style={{ fontSize: 11, color: '#555', marginBottom: 4 }}>PORTFOLIO</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#7B61FF', fontFamily: 'JetBrains Mono, monospace' }}>{formatCurrency(portfolioValue)}</div>
          </div>
          <div style={{ width: 1, background: '#1f1f1f' }} />
          <div>
            <div style={{ fontSize: 11, color: '#555', marginBottom: 4 }}>MONTHLY BURN</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#FF6B35', fontFamily: 'JetBrains Mono, monospace' }}>{formatCurrency(monthlySubscriptions)}</div>
          </div>
        </div>

        {/* Net worth history chart */}
        {netWorthHistory.length > 1 && (
          <div style={{ marginTop: 24 }}>
            <ResponsiveContainer width="100%" height={80}>
              <AreaChart data={netWorthHistory.map(s => ({ date: formatDateShort(s.date), nw: s.netWorth }))}>
                <defs>
                  <linearGradient id="nwGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" hide />
                <YAxis hide />
                <Tooltip contentStyle={{ background: '#0d0d0d', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 8, fontSize: 11 }} formatter={(v: number) => [formatCurrency(v), 'Net Worth'] as [string, string]} labelStyle={{ color: '#888' }} />
                <Area type="monotone" dataKey="nw" stroke="#D4AF37" strokeWidth={2} fill="url(#nwGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '8px 16px', borderRadius: 8, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
            border: `1px solid ${tab === t.id ? t.color : '#1f1f1f'}`,
            background: tab === t.id ? `${t.color}15` : 'transparent',
            color: tab === t.id ? t.color : '#555', cursor: 'pointer', transition: 'all 0.15s',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {tab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Asset breakdown pie */}
            <div className="empire-card">
              <div style={{ fontSize: 11, color: '#555', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 12 }}>ASSETS BREAKDOWN</div>
              {assetPieData.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#333', fontSize: 13 }}>Add assets to see breakdown</div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={140}>
                    <PieChart>
                      <Pie data={assetPieData} dataKey="value" cx="50%" cy="50%" innerRadius={35} outerRadius={60}>
                        {assetPieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: '#0d0d0d', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 8, fontSize: 11 }} formatter={(v: number) => [formatCurrency(v)] as [string]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {assetPieData.map(d => (
                      <div key={d.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.color }} />
                          <span style={{ fontSize: 11, color: '#888' }}>{d.name}</span>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: d.color }}>{formatCurrency(d.value)}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Budget overview */}
            <div className="empire-card">
              <div style={{ fontSize: 11, color: '#555', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 12 }}>MONTHLY BUDGET</div>
              {budget.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#333', fontSize: 13 }}>Add budget categories</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {budget.map(b => {
                    const pct = b.budgeted > 0 ? Math.min((b.spent / b.budgeted) * 100, 100) : 0;
                    const over = b.spent > b.budgeted;
                    return (
                      <div key={b.id}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 12, color: '#ccc' }}>{b.emoji} {b.name}</span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: over ? '#FF4141' : '#888', fontFamily: 'JetBrains Mono, monospace' }}>
                            {formatCurrency(b.spent)} / {formatCurrency(b.budgeted)}
                          </span>
                        </div>
                        <div className="progress-track">
                          <div style={{ height: '100%', borderRadius: 999, width: `${pct}%`, background: over ? '#FF4141' : b.color, transition: 'width 0.6s' }} />
                        </div>
                      </div>
                    );
                  })}
                  <div style={{ borderTop: '1px solid #111', paddingTop: 10, display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, color: '#555' }}>TOTAL SPENT</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#D4AF37', fontFamily: 'JetBrains Mono, monospace' }}>
                      {formatCurrency(budget.reduce((s, b) => s + b.spent, 0))} / {formatCurrency(budget.reduce((s, b) => s + b.budgeted, 0))}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Subscription burn rate alert */}
          {subscriptions.filter(s => s.active).length > 0 && (
            <div className="empire-card" style={{ borderColor: 'rgba(255,107,53,0.2)', background: 'rgba(255,107,53,0.03)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 11, color: '#FF6B35', letterSpacing: '0.1em', fontWeight: 700 }}>◆ SUBSCRIPTION BURN RATE</div>
                <div style={{ fontSize: 11, color: '#555' }}>{subscriptions.filter(s => s.active).length} active</div>
              </div>
              <div style={{ display: 'flex', gap: 32, marginTop: 12 }}>
                <div>
                  <div style={{ fontSize: 10, color: '#555', marginBottom: 4 }}>MONTHLY</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: '#FF6B35', fontFamily: 'JetBrains Mono, monospace' }}>{formatCurrency(monthlySubscriptions)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: '#555', marginBottom: 4 }}>ANNUAL</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: '#FF4141', fontFamily: 'JetBrains Mono, monospace' }}>{formatCurrency(annualSubscriptions)}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ASSETS */}
      {tab === 'assets' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={() => setShowAddAsset(true)} className="btn-gold" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Plus size={13} /> ADD ASSET</button>
            <button onClick={() => setShowAddLiab(true)} className="btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: 6, borderColor: 'rgba(255,65,65,0.3)', color: '#FF4141' }}><Plus size={13} /> ADD LIABILITY</button>
          </div>

          {showAddAsset && (
            <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setShowAddAsset(false); }}>
              <div className="modal-box">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#00FF87' }}>ADD ASSET</h3>
                  <button onClick={() => setShowAddAsset(false)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer' }}><X size={18} /></button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div><div className="label-upper" style={{ marginBottom: 6 }}>Asset Name</div><input className="empire-input" value={aName} onChange={e => setAName(e.target.value)} placeholder="e.g. Fidelity Portfolio, BTC, Home..." autoFocus /></div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <div style={{ flex: 1 }}><div className="label-upper" style={{ marginBottom: 6 }}>Value ($)</div><input className="empire-input" type="number" value={aVal} onChange={e => setAVal(e.target.value)} placeholder="0" style={{ color: '#00FF87', fontWeight: 700, fontSize: 18, fontFamily: 'JetBrains Mono, monospace' }} /></div>
                  </div>
                  <div><div className="label-upper" style={{ marginBottom: 8 }}>Category</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {ASSET_CATS.map(c => (
                        <button key={c.id} onClick={() => setACat(c.id)} style={{ padding: '6px 12px', borderRadius: 20, border: `1px solid ${aCat === c.id ? c.color : '#1f1f1f'}`, background: aCat === c.id ? `${c.color}15` : 'transparent', color: aCat === c.id ? c.color : '#555', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                          {c.emoji} {c.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div><div className="label-upper" style={{ marginBottom: 6 }}>Notes</div><input className="empire-input" value={aNotes} onChange={e => setANotes(e.target.value)} placeholder="Optional notes..." /></div>
                  <button onClick={addAsset} className="btn-gold">ADD TO PORTFOLIO</button>
                </div>
              </div>
            </div>
          )}

          {showAddLiab && (
            <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setShowAddLiab(false); }}>
              <div className="modal-box">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#FF4141' }}>ADD LIABILITY</h3>
                  <button onClick={() => setShowAddLiab(false)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer' }}><X size={18} /></button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div><div className="label-upper" style={{ marginBottom: 6 }}>Liability Name</div><input className="empire-input" value={lName} onChange={e => setLName(e.target.value)} placeholder="e.g. Student Loan, Mortgage..." autoFocus /></div>
                  <div><div className="label-upper" style={{ marginBottom: 6 }}>Amount Owed ($)</div><input className="empire-input" type="number" value={lVal} onChange={e => setLVal(e.target.value)} placeholder="0" style={{ color: '#FF4141', fontWeight: 700, fontSize: 18, fontFamily: 'JetBrains Mono, monospace' }} /></div>
                  <div><div className="label-upper" style={{ marginBottom: 8 }}>Category</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {LIAB_CATS.map(c => (
                        <button key={c.id} onClick={() => setLCat(c.id)} style={{ padding: '6px 12px', borderRadius: 20, border: `1px solid ${lCat === c.id ? c.color : '#1f1f1f'}`, background: lCat === c.id ? `${c.color}15` : 'transparent', color: lCat === c.id ? c.color : '#555', fontSize: 11, cursor: 'pointer' }}>
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button onClick={addLiability} className="btn-danger">ADD LIABILITY</button>
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="empire-card">
              <div style={{ fontSize: 11, color: '#00FF87', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 14 }}>◆ ASSETS — {formatCurrency(totalAssets)}</div>
              {assets.length === 0 ? <div style={{ color: '#333', fontSize: 13, textAlign: 'center', padding: 24 }}>No assets yet</div> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {assets.map(a => {
                    const cat = ASSET_CATS.find(c => c.id === a.category)!;
                    return (
                      <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #0d0d0d' }}>
                        <span style={{ fontSize: 18 }}>{cat.emoji}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#ddd' }}>{a.name}</div>
                          <div style={{ fontSize: 10, color: '#444' }}>{cat.label}</div>
                        </div>
                        <div style={{ fontSize: 15, fontWeight: 800, color: '#00FF87', fontFamily: 'JetBrains Mono, monospace' }}>{formatCurrency(a.value)}</div>
                        <button onClick={() => onAssetsChange(assets.filter(x => x.id !== a.id))} style={{ background: 'none', border: 'none', color: '#333', cursor: 'pointer' }}><Trash2 size={13} /></button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="empire-card">
              <div style={{ fontSize: 11, color: '#FF4141', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 14 }}>◆ LIABILITIES — {formatCurrency(totalLiabilities)}</div>
              {liabilities.length === 0 ? <div style={{ color: '#333', fontSize: 13, textAlign: 'center', padding: 24 }}>No liabilities</div> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {liabilities.map(l => {
                    const cat = LIAB_CATS.find(c => c.id === l.category)!;
                    return (
                      <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #0d0d0d' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#ddd' }}>{l.name}</div>
                          <div style={{ fontSize: 10, color: '#444' }}>{cat.label}</div>
                        </div>
                        <div style={{ fontSize: 15, fontWeight: 800, color: '#FF4141', fontFamily: 'JetBrains Mono, monospace' }}>-{formatCurrency(l.value)}</div>
                        <button onClick={() => onLiabilitiesChange(liabilities.filter(x => x.id !== l.id))} style={{ background: 'none', border: 'none', color: '#333', cursor: 'pointer' }}><Trash2 size={13} /></button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* BUDGET */}
      {tab === 'budget' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={() => setShowAddBudget(true)} className="btn-gold" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Plus size={13} /> ADD CATEGORY</button>
          </div>
          {showAddBudget && (
            <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setShowAddBudget(false); }}>
              <div className="modal-box">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#00D4FF' }}>ADD BUDGET CATEGORY</h3>
                  <button onClick={() => setShowAddBudget(false)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer' }}><X size={18} /></button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <div style={{ width: 60 }}><div className="label-upper" style={{ marginBottom: 6 }}>Icon</div><input className="empire-input" value={bEmoji} onChange={e => setBEmoji(e.target.value)} style={{ textAlign: 'center', fontSize: 20 }} /></div>
                    <div style={{ flex: 1 }}><div className="label-upper" style={{ marginBottom: 6 }}>Category Name</div><input className="empire-input" value={bName} onChange={e => setBName(e.target.value)} placeholder="Food, Rent, Entertainment..." autoFocus /></div>
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <div style={{ flex: 1 }}><div className="label-upper" style={{ marginBottom: 6 }}>Monthly Budget ($)</div><input className="empire-input" type="number" value={bBudget} onChange={e => setBBudget(e.target.value)} placeholder="0" /></div>
                    <div style={{ flex: 1 }}><div className="label-upper" style={{ marginBottom: 6 }}>Already Spent ($)</div><input className="empire-input" type="number" value={bSpent} onChange={e => setBSpent(e.target.value)} placeholder="0" /></div>
                  </div>
                  <button onClick={addBudget} className="btn-gold">ADD CATEGORY</button>
                </div>
              </div>
            </div>
          )}
          {budget.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', border: '1px dashed #1f1f1f', borderRadius: 12, color: '#333', fontSize: 13 }}>Add budget categories to track your monthly spending</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {budget.map(b => {
                const pct = b.budgeted > 0 ? Math.min((b.spent / b.budgeted) * 100, 100) : 0;
                const over = b.spent > b.budgeted;
                return (
                  <div key={b.id} className="empire-card" style={{ padding: '16px 20px', borderColor: over ? 'rgba(255,65,65,0.2)' : '#1f1f1f' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                      <span style={{ fontSize: 22 }}>{b.emoji}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#ddd' }}>{b.name}</div>
                      </div>
                      {over && <AlertTriangle size={14} color="#FF4141" />}
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 15, fontWeight: 800, color: over ? '#FF4141' : '#D4AF37', fontFamily: 'JetBrains Mono, monospace' }}>
                          {formatCurrency(b.spent)}
                        </div>
                        <div style={{ fontSize: 10, color: '#555' }}>of {formatCurrency(b.budgeted)}</div>
                      </div>
                      <button onClick={() => onBudgetChange(budget.filter(x => x.id !== b.id))} style={{ background: 'none', border: 'none', color: '#333', cursor: 'pointer' }}><Trash2 size={13} /></button>
                    </div>
                    <div className="progress-track">
                      <div style={{ height: '100%', borderRadius: 999, width: `${pct}%`, background: over ? '#FF4141' : b.color, transition: 'width 0.6s' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                      <span style={{ fontSize: 10, color: '#444' }}>{Math.round(pct)}% used</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 10, color: '#444' }}>Update spent:</span>
                        <input type="number" defaultValue={b.spent} onBlur={e => updateBudgetSpent(b.id, parseFloat(e.target.value) || 0)} style={{ width: 70, background: '#111', border: '1px solid #1f1f1f', color: '#fff', padding: '3px 8px', borderRadius: 6, fontSize: 11, outline: 'none' }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUBSCRIPTIONS */}
      {tab === 'subscriptions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 11, color: '#FF6B35', letterSpacing: '0.08em' }}>
              Burning <strong style={{ color: '#FF4141', fontSize: 16 }}>{formatCurrency(monthlySubscriptions)}/mo</strong> · {formatCurrency(annualSubscriptions)}/yr
            </div>
            <button onClick={() => setShowAddSub(true)} className="btn-gold" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Plus size={13} /> ADD SUBSCRIPTION</button>
          </div>
          {showAddSub && (
            <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setShowAddSub(false); }}>
              <div className="modal-box">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#FF6B35' }}>ADD SUBSCRIPTION</h3>
                  <button onClick={() => setShowAddSub(false)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer' }}><X size={18} /></button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <div style={{ width: 60 }}><div className="label-upper" style={{ marginBottom: 6 }}>Icon</div><input className="empire-input" value={sEmoji} onChange={e => setSEmoji(e.target.value)} style={{ textAlign: 'center', fontSize: 20 }} /></div>
                    <div style={{ flex: 1 }}><div className="label-upper" style={{ marginBottom: 6 }}>Service Name</div><input className="empire-input" value={sName} onChange={e => setSName(e.target.value)} placeholder="Netflix, Spotify, AWS..." autoFocus /></div>
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <div style={{ flex: 1 }}><div className="label-upper" style={{ marginBottom: 6 }}>Amount ($)</div><input className="empire-input" type="number" value={sAmt} onChange={e => setSAmt(e.target.value)} placeholder="0.00" /></div>
                    <div style={{ flex: 1 }}>
                      <div className="label-upper" style={{ marginBottom: 6 }}>Frequency</div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {(['monthly', 'yearly'] as const).map(f => (
                          <button key={f} onClick={() => setSFreq(f)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: `1px solid ${sFreq === f ? '#FF6B35' : '#1f1f1f'}`, background: sFreq === f ? 'rgba(255,107,53,0.1)' : 'transparent', color: sFreq === f ? '#FF6B35' : '#555', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
                            {f.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <button onClick={addSub} className="btn-gold">TRACK SUBSCRIPTION</button>
                </div>
              </div>
            </div>
          )}
          {subscriptions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', border: '1px dashed #1f1f1f', borderRadius: 12, color: '#333', fontSize: 13 }}>Track your subscriptions to see your burn rate</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {subscriptions.map(s => {
                const monthly = s.frequency === 'monthly' ? s.amount : s.amount / 12;
                return (
                  <div key={s.id} className="empire-card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, opacity: s.active ? 1 : 0.5 }}>
                    <span style={{ fontSize: 22 }}>{s.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#ddd' }}>{s.name}</div>
                      <div style={{ fontSize: 10, color: '#444' }}>{s.frequency} · {s.category}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#FF6B35', fontFamily: 'JetBrains Mono, monospace' }}>{formatCurrency(s.amount)}/{s.frequency === 'monthly' ? 'mo' : 'yr'}</div>
                      <div style={{ fontSize: 10, color: '#555' }}>{formatCurrency(monthly)}/mo</div>
                    </div>
                    <button onClick={() => onSubscriptionsChange(subscriptions.map(x => x.id === s.id ? { ...x, active: !x.active } : x))} style={{ fontSize: 9, padding: '4px 10px', borderRadius: 20, border: `1px solid ${s.active ? '#555' : '#1f1f1f'}`, background: 'transparent', color: s.active ? '#555' : '#333', cursor: 'pointer' }}>
                      {s.active ? 'ACTIVE' : 'PAUSED'}
                    </button>
                    <button onClick={() => onSubscriptionsChange(subscriptions.filter(x => x.id !== s.id))} style={{ background: 'none', border: 'none', color: '#333', cursor: 'pointer' }}><Trash2 size={13} /></button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* PORTFOLIO */}
      {tab === 'portfolio' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 11, color: '#555', marginBottom: 4 }}>TOTAL PORTFOLIO VALUE</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#7B61FF', fontFamily: 'JetBrains Mono, monospace' }}>{formatCurrency(portfolioValue)}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: portfolioPnL >= 0 ? '#00FF87' : '#FF4141', marginTop: 4 }}>
                {portfolioPnL >= 0 ? '+' : ''}{formatCurrency(portfolioPnL)} ({portfolioPnLPct.toFixed(1)}%)
              </div>
            </div>
            <button onClick={() => setShowAddPortfolio(true)} className="btn-gold" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Plus size={13} /> ADD POSITION</button>
          </div>
          {showAddPortfolio && (
            <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setShowAddPortfolio(false); }}>
              <div className="modal-box">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#7B61FF' }}>ADD POSITION</h3>
                  <button onClick={() => setShowAddPortfolio(false)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer' }}><X size={18} /></button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <div style={{ flex: 1 }}><div className="label-upper" style={{ marginBottom: 6 }}>Ticker/Symbol</div><input className="empire-input" value={pSymbol} onChange={e => setPSymbol(e.target.value.toUpperCase())} placeholder="AAPL, BTC..." autoFocus style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }} /></div>
                    <div style={{ flex: 2 }}><div className="label-upper" style={{ marginBottom: 6 }}>Full Name</div><input className="empire-input" value={pName} onChange={e => setPName(e.target.value)} placeholder="Apple Inc." /></div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                    <div><div className="label-upper" style={{ marginBottom: 6 }}>Shares</div><input className="empire-input" type="number" value={pShares} onChange={e => setPShares(e.target.value)} placeholder="0" /></div>
                    <div><div className="label-upper" style={{ marginBottom: 6 }}>Avg Price ($)</div><input className="empire-input" type="number" value={pAvg} onChange={e => setPAvg(e.target.value)} placeholder="0.00" /></div>
                    <div><div className="label-upper" style={{ marginBottom: 6 }}>Current Price ($)</div><input className="empire-input" type="number" value={pCurrent} onChange={e => setPCurrent(e.target.value)} placeholder="0.00" /></div>
                  </div>
                  <div><div className="label-upper" style={{ marginBottom: 8 }}>Type</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {(['stock', 'crypto', 'etf', 'other'] as const).map(c => (
                        <button key={c} onClick={() => setPCat(c)} style={{ flex: 1, padding: '8px', borderRadius: 8, border: `1px solid ${pCat === c ? '#7B61FF' : '#1f1f1f'}`, background: pCat === c ? 'rgba(123,97,255,0.1)' : 'transparent', color: pCat === c ? '#7B61FF' : '#555', fontSize: 10, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase' }}>{c}</button>
                      ))}
                    </div>
                  </div>
                  <button onClick={addPortfolio} className="btn-gold">ADD POSITION</button>
                </div>
              </div>
            </div>
          )}
          {portfolio.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', border: '1px dashed #1f1f1f', borderRadius: 12, color: '#333', fontSize: 13 }}>Track your stocks, crypto and ETFs</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {portfolio.map(p => {
                const value = p.shares * p.currentPrice;
                const cost = p.shares * p.avgPrice;
                const pnl = value - cost;
                const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0;
                return (
                  <div key={p.id} className="empire-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(123,97,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, color: '#7B61FF', fontFamily: 'JetBrains Mono, monospace' }}>
                      {p.symbol.slice(0, 4)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#ddd' }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: '#555' }}>{p.shares} shares · avg {formatCurrencyFull(p.avgPrice)}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', fontFamily: 'JetBrains Mono, monospace' }}>{formatCurrency(value)}</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: pnl >= 0 ? '#00FF87' : '#FF4141' }}>
                        {pnl >= 0 ? '+' : ''}{formatCurrency(pnl)} ({pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(1)}%)
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 9, color: '#444', marginBottom: 4 }}>CURRENT PRICE</div>
                      <input type="number" defaultValue={p.currentPrice} onBlur={e => updatePortfolioPrice(p.id, parseFloat(e.target.value) || p.currentPrice)} style={{ width: 80, background: '#111', border: '1px solid #1f1f1f', color: '#fff', padding: '4px 8px', borderRadius: 6, fontSize: 12, outline: 'none', fontFamily: 'JetBrains Mono, monospace' }} />
                    </div>
                    <button onClick={() => onPortfolioChange(portfolio.filter(x => x.id !== p.id))} style={{ background: 'none', border: 'none', color: '#333', cursor: 'pointer' }}><Trash2 size={13} /></button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* FIRE */}
      {tab === 'fire' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div
            className="empire-card"
            style={{ background: 'linear-gradient(135deg, rgba(255,65,65,0.06), transparent)', borderColor: 'rgba(255,65,65,0.2)', textAlign: 'center', padding: '40px 28px' }}
          >
            <div style={{ fontSize: 11, color: '#FF4141', letterSpacing: '0.14em', marginBottom: 12 }}>◆ FINANCIAL INDEPENDENCE NUMBER</div>
            <div style={{ fontSize: 64, fontWeight: 900, letterSpacing: '-0.03em', fontFamily: 'JetBrains Mono, monospace', background: 'linear-gradient(135deg, #FF4141, #FF6B35, #D4AF37)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 8 }}>
              {formatCurrency(fireNumber)}
            </div>
            <div style={{ fontSize: 13, color: '#555', marginBottom: 28 }}>25× your annual expenses (4% safe withdrawal rule)</div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, maxWidth: 500, margin: '0 auto', marginBottom: 32 }}>
              {[
                { label: 'Monthly Expenses ($)', key: 'monthlyExpenses', val: fireSettings.monthlyExpenses },
                { label: 'Monthly Savings ($)', key: 'monthlySavings', val: fireSettings.monthlySavings },
                { label: 'Current Savings ($)', key: 'currentSavings', val: fireSettings.currentSavings },
                { label: 'Expected Return (%)', key: 'expectedReturn', val: fireSettings.expectedReturn },
              ].map(f => (
                <div key={f.key} style={{ textAlign: 'left' }}>
                  <div className="label-upper" style={{ marginBottom: 6 }}>{f.label}</div>
                  <input className="empire-input" type="number" defaultValue={f.val}
                    onBlur={e => onFireSettingsChange({ ...fireSettings, [f.key]: parseFloat(e.target.value) || 0 })}
                    style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: 16, color: '#D4AF37' }} />
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap' }}>
              {[
                { label: 'YEARS TO FIRE', value: isFinite(yearsToFire) ? yearsToFire.toFixed(1) : '∞', color: '#D4AF37' },
                { label: 'TARGET DATE', value: isFinite(yearsToFire) ? fireDate.getFullYear().toString() : '—', color: '#00FF87' },
                { label: 'CURRENT SAVINGS', value: formatCurrency(fireSettings.currentSavings), color: '#00D4FF' },
                { label: 'GAP REMAINING', value: formatCurrency(gap), color: '#FF4141' },
                { label: 'SAVINGS RATE', value: fireSettings.monthlySavings + fireSettings.monthlyExpenses > 0 ? `${Math.round(fireSettings.monthlySavings / (fireSettings.monthlySavings + fireSettings.monthlyExpenses) * 100)}%` : '—', color: '#7B61FF' },
              ].map(s => (
                <div key={s.label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 28, fontWeight: 900, color: s.color, fontFamily: 'JetBrains Mono, monospace' }}>{s.value}</div>
                  <div style={{ fontSize: 9, color: '#555', letterSpacing: '0.1em', marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Progress to FIRE */}
            {fireNumber > 0 && (
              <div style={{ marginTop: 32, maxWidth: 500, margin: '32px auto 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 11, color: '#555' }}>PROGRESS TO FIRE</span>
                  <span style={{ fontSize: 11, color: '#D4AF37', fontWeight: 700 }}>
                    {Math.min(Math.round(fireSettings.currentSavings / fireNumber * 100), 100)}%
                  </span>
                </div>
                <div className="progress-track" style={{ height: 12 }}>
                  <div className="progress-fill" style={{ width: `${Math.min(fireSettings.currentSavings / fireNumber * 100, 100)}%`, background: 'linear-gradient(90deg, #FF4141, #FF6B35, #D4AF37)' }} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
