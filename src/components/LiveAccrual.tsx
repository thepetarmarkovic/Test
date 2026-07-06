import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { EarningEntry } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { getLastNDays, formatCurrency } from '../utils/formatters';
import { OdoChar, SEC_30D } from './MoneyTicker';

interface Props {
  earnings: EarningEntry[];
}

// THIS MONTH — LIVE PACE
// Big number = trailing-30-day $/sec rate x seconds elapsed this month.
// Fully derived from real income + the clock (no drifting anchors):
// - climbs every tick, resets on the 1st
// - logging income raises the rate -> the whole month re-values upward
// - a per-month high-water mark keeps it from ever ticking backward
//   when old entries age out of the 30-day window
const monthKeyOf = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

interface HighWater { monthKey: string; value: number }

export default function LiveAccrual({ earnings }: Props) {
  const [hiWater, setHiWater] = useLocalStorage<HighWater | null>('empire_paceHigh', null);
  const [now, setNow] = useState(() => Date.now());

  const nowDate = new Date(now);
  const mk = monthKeyOf(nowDate);
  const prevMk = monthKeyOf(new Date(nowDate.getFullYear(), nowDate.getMonth() - 1, 1));
  const startOfMonthMs = new Date(nowDate.getFullYear(), nowDate.getMonth(), 1).getTime();

  const { realMonth, lastMonth, ratePerSec } = useMemo(() => {
    const last30 = getLastNDays(30);
    return {
      realMonth: earnings.filter(e => e.date.startsWith(mk)).reduce((s, e) => s + e.amount, 0),
      lastMonth: earnings.filter(e => e.date.startsWith(prevMk)).reduce((s, e) => s + e.amount, 0),
      ratePerSec: earnings.filter(e => last30.includes(e.date)).reduce((s, e) => s + e.amount, 0) / SEC_30D,
    };
  }, [earnings, mk, prevMk]);

  // Record the high-water mark whenever the rate changes (that's the only
  // moment the derived value can fall — entries aging out of the window).
  const prevRate = useRef(ratePerSec);
  useEffect(() => {
    if (prevRate.current !== ratePerSec) {
      const atOldRate = prevRate.current * Math.max(0, (Date.now() - startOfMonthMs) / 1000);
      prevRate.current = ratePerSec;
      if (!hiWater || hiWater.monthKey !== mk || atOldRate > hiWater.value) {
        setHiWater({ monthKey: mk, value: atOldRate });
      }
    }
  }, [ratePerSec, mk, startOfMonthMs, hiWater]);

  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(iv);
  }, []);

  const raw = ratePerSec * Math.max(0, (now - startOfMonthMs) / 1000);
  const floor = hiWater && hiWater.monthKey === mk ? hiWater.value : 0;
  const value = Math.max(raw, floor);

  const mainStr = '$' + (Math.floor(value * 100) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const micro = Math.floor((value * 1_000_000) % 10_000).toString().padStart(4, '0');
  const beatingLastMonth = lastMonth > 0 && value >= lastMonth;

  return (
    <div
      className="empire-card"
      style={{
        borderColor: 'rgba(0,255,135,0.2)',
        background: 'linear-gradient(135deg, rgba(0,255,135,0.04), rgba(212,175,55,0.02))',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <span style={{ fontSize: 11, color: '#D4AF37', letterSpacing: '0.12em', fontWeight: 700 }}>◆ THIS MONTH — LIVE PACE</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="status-dot status-dot-success animate-blink" />
          <span style={{ fontSize: 10, color: '#00FF87', letterSpacing: '0.12em', fontWeight: 800, fontFamily: 'JetBrains Mono, monospace' }}>RUNNING</span>
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', whiteSpace: 'nowrap' }}>
        <span
          style={{
            fontSize: 'clamp(28px, 6vw, 44px)', fontWeight: 900, lineHeight: 1,
            fontFamily: 'JetBrains Mono, monospace', color: '#FFD700',
            textShadow: '0 0 24px rgba(212,175,55,0.35)', letterSpacing: '0.02em',
          }}
        >
          {mainStr.split('').map((ch, i) => <OdoChar key={mainStr.length - i} ch={ch} />)}
        </span>
        <span
          style={{
            fontSize: 'clamp(14px, 2.6vw, 20px)', fontWeight: 700, lineHeight: 1,
            fontFamily: 'JetBrains Mono, monospace', color: 'rgba(0,255,135,0.55)',
            fontVariantNumeric: 'tabular-nums', marginLeft: 6, letterSpacing: '0.06em',
          }}
        >
          {micro}
        </span>
      </div>

      {/* reality check + the race */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: '#00FF87', letterSpacing: '0.08em', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>
          LOGGED: {formatCurrency(realMonth)}
        </span>
        <span style={{ fontSize: 11, color: '#777', letterSpacing: '0.08em', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>
          LAST MONTH: {formatCurrency(lastMonth)}
        </span>
        {beatingLastMonth && (
          <span style={{ fontSize: 9, color: '#00FF87', fontWeight: 800, letterSpacing: '0.08em', background: 'rgba(0,255,135,0.08)', border: '1px solid rgba(0,255,135,0.25)', padding: '2px 8px', borderRadius: 20 }}>
            ⚑ BEATEN
          </span>
        )}
      </div>

      <div style={{ fontSize: 10, color: '#444', letterSpacing: '0.08em', marginTop: 8 }}>
        YOUR REAL 30-DAY INCOME, REPLAYED AS A LIVE MONTHLY PACE — MORE INCOME = FASTER CLIMB
      </div>
    </div>
  );
}
