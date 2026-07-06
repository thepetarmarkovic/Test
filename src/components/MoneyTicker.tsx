import React, { useState, useMemo } from 'react';
import { X, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { EarningEntry } from '../types';
import { getLastNDays, formatCurrencyFull, formatCurrency } from '../utils/formatters';

interface Props {
  earnings: EarningEntry[];
}

const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
const SEC_30D = 30 * 86400;

function OdoChar({ ch }: { ch: string }) {
  const d = DIGITS.indexOf(ch);
  if (d === -1) {
    return <span style={{ display: 'inline-block' }}>{ch}</span>;
  }
  return (
    <span className="odo-digit">
      <span className="odo-strip" style={{ transform: `translateY(-${d}em)` }}>
        {DIGITS.map(n => <span key={n}>{n}</span>)}
      </span>
    </span>
  );
}

const LADDER = [10, 50, 100, 250, 500, 1000, 2500, 5000]; // $/day rungs

function VelocityPanel({ ratePerSec, daily30, onClose }: {
  ratePerSec: number;
  daily30: { date: string; amount: number }[];
  onClose: () => void;
}) {
  const perHour = ratePerSec * 3600;
  const perDay = ratePerSec * 86400;
  const perMonth = ratePerSec * SEC_30D;

  // sparkline geometry
  const W = 440, H = 56;
  const max = Math.max(...daily30.map(d => d.amount), 1);
  const pts = daily30.map((d, i) =>
    `${(i / (daily30.length - 1)) * W},${H - (d.amount / max) * (H - 6) - 2}`).join(' ');

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box" style={{ maxWidth: 500 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#00FF87', letterSpacing: '0.06em' }}>⚡ EARNING VELOCITY</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer' }}><X size={18} /></button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
          {[
            { label: 'PER SECOND', value: `$${ratePerSec < 0.01 ? ratePerSec.toFixed(6) : ratePerSec.toFixed(4)}` },
            { label: 'PER HOUR', value: formatCurrencyFull(perHour) },
            { label: 'PER DAY', value: formatCurrencyFull(perDay) },
            { label: 'PER MONTH (30D)', value: formatCurrency(perMonth) },
          ].map(s => (
            <div key={s.label} style={{ background: '#0d0d0d', border: '1px solid #1a1a1a', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 17, fontWeight: 900, color: '#00FF87', fontFamily: 'JetBrains Mono, monospace' }}>{s.value}</div>
              <div style={{ fontSize: 8.5, color: '#555', letterSpacing: '0.12em', marginTop: 3 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* 30-day sparkline */}
        <div style={{ background: '#0d0d0d', border: '1px solid #1a1a1a', borderRadius: 10, padding: '12px 14px', marginBottom: 18 }}>
          <div style={{ fontSize: 8.5, color: '#555', letterSpacing: '0.12em', marginBottom: 8 }}>DAILY INCOME — LAST 30 DAYS</div>
          <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 56, display: 'block' }}>
            <polyline points={pts} fill="none" stroke="#00FF87" strokeWidth={1.5} strokeLinejoin="round" opacity={0.9} />
            <polyline points={`0,${H} ${pts} ${W},${H}`} fill="rgba(0,255,135,0.06)" stroke="none" />
          </svg>
        </div>

        {/* Milestone ladder */}
        <div style={{ fontSize: 8.5, color: '#555', letterSpacing: '0.12em', marginBottom: 8 }}>VELOCITY LADDER — $/DAY</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[...LADDER].reverse().map(rung => {
            const hit = perDay >= rung;
            const next = !hit && LADDER.find(r => perDay < r) === rung;
            return (
              <div key={rung} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 12px', borderRadius: 8,
                background: hit ? 'rgba(0,255,135,0.07)' : next ? 'rgba(212,175,55,0.06)' : '#0d0d0d',
                border: `1px solid ${hit ? 'rgba(0,255,135,0.25)' : next ? 'rgba(212,175,55,0.3)' : '#161616'}`,
              }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: hit ? '#00FF87' : next ? '#D4AF37' : '#444', fontFamily: 'JetBrains Mono, monospace' }}>
                  {hit ? '✓' : next ? '▸' : '·'} ${rung.toLocaleString()}/DAY
                </span>
                {next && (
                  <span style={{ fontSize: 9, color: '#D4AF37', fontFamily: 'JetBrains Mono, monospace' }}>
                    {Math.floor((perDay / rung) * 100)}% THERE
                  </span>
                )}
                {hit && <span style={{ fontSize: 9, color: '#0a5' }}>CONQUERED</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function MoneyTicker({ earnings }: Props) {
  const [showVelocity, setShowVelocity] = useState(false);

  const { totalEarned, ratePerSec, prevRatePerSec, daily30 } = useMemo(() => {
    const total = earnings.reduce((s, e) => s + e.amount, 0);
    const last37 = getLastNDays(37);
    const last30 = last37.slice(7);              // 30-day window ending today
    const prev30 = last37.slice(0, 30);          // 30-day window ending 7 days ago
    const sumIn = (days: string[]) => earnings.filter(e => days.includes(e.date)).reduce((s, e) => s + e.amount, 0);
    return {
      totalEarned: total,
      ratePerSec: sumIn(last30) / SEC_30D,
      prevRatePerSec: sumIn(prev30) / SEC_30D,
      daily30: last30.map(d => ({ date: d, amount: earnings.filter(e => e.date === d).reduce((s, e) => s + e.amount, 0) })),
    };
  }, [earnings]);

  const display = '$' + totalEarned.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const trend = ratePerSec > prevRatePerSec * 1.001 ? 'up' : ratePerSec < prevRatePerSec * 0.999 ? 'down' : 'flat';

  if (earnings.length === 0) {
    return (
      <div className="empire-card" style={{ borderColor: 'rgba(212,175,55,0.25)', textAlign: 'center' }}>
        <div style={{ fontSize: 11, color: '#D4AF37', letterSpacing: '0.12em', fontWeight: 700, marginBottom: 10 }}>◆ LIFETIME EARNED</div>
        <div style={{ fontSize: 34, fontWeight: 900, color: '#333', fontFamily: 'JetBrains Mono, monospace' }}>$0.00</div>
        <div style={{ fontSize: 11, color: '#555', marginTop: 8 }}>Log your first income to start the engine.</div>
      </div>
    );
  }

  return (
    <div
      className="empire-card"
      style={{
        borderColor: 'rgba(212,175,55,0.3)',
        background: 'linear-gradient(135deg, rgba(212,175,55,0.06), rgba(212,175,55,0.01))',
      }}
    >
      <div style={{ fontSize: 11, color: '#D4AF37', letterSpacing: '0.12em', fontWeight: 700, marginBottom: 12 }}>
        ◆ LIFETIME EARNED
      </div>

      {/* Real lifetime total — rolls only when income changes */}
      <div
        style={{
          fontSize: 'clamp(28px, 6vw, 44px)', fontWeight: 900, lineHeight: 1,
          fontFamily: 'JetBrains Mono, monospace', color: '#FFD700',
          textShadow: '0 0 24px rgba(212,175,55,0.35)',
          letterSpacing: '0.02em', whiteSpace: 'nowrap',
        }}
      >
        {display.split('').map((ch, i) => <OdoChar key={display.length - i} ch={ch} />)}
      </div>

      {/* Velocity — the live element; tap for the full panel */}
      <button
        onClick={() => setShowVelocity(true)}
        title="Open velocity panel"
        style={{
          display: 'flex', alignItems: 'center', gap: 8, marginTop: 12,
          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
        }}
      >
        <span className="status-dot status-dot-success animate-blink" />
        <span style={{ fontSize: 16, fontWeight: 800, color: '#00FF87', fontFamily: 'JetBrains Mono, monospace' }}>
          +${ratePerSec < 0.01 ? ratePerSec.toFixed(6) : ratePerSec.toFixed(4)}/SEC
        </span>
        {trend === 'up' && <TrendingUp size={15} color="#00FF87" />}
        {trend === 'down' && <TrendingDown size={15} color="#FF4141" />}
        {trend === 'flat' && <Minus size={15} color="#555" />}
      </button>

      <div style={{ fontSize: 10, color: '#444', letterSpacing: '0.08em', marginTop: 10 }}>
        LIFETIME EARNED — VELOCITY BASED ON TRAILING 30 DAYS · TAP THE RATE FOR THE FULL BREAKDOWN
      </div>

      {showVelocity && (
        <VelocityPanel ratePerSec={ratePerSec} daily30={daily30} onClose={() => setShowVelocity(false)} />
      )}
    </div>
  );
}
