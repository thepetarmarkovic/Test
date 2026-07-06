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
// Rendered at 60fps via requestAnimationFrame: the odometer part updates
// through React only when the cents change; the 4-digit micro tail is
// written straight to the DOM every frame.
const monthKeyOf = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

interface HighWater { monthKey: string; value: number }

const SWEEP_MS = 1400;
const easeOutExpo = (p: number) => (p >= 1 ? 1 : 1 - Math.pow(2, -10 * p));

const fmtMain = (v: number) =>
  '$' + (Math.floor(v * 100) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function LiveAccrual({ earnings }: Props) {
  const [hiWater, setHiWater] = useLocalStorage<HighWater | null>('empire_paceHigh', null);
  const [mainStr, setMainStr] = useState('$0.00');
  const microRef = useRef<HTMLSpanElement>(null);
  const numRef = useRef<HTMLSpanElement>(null);
  const prevMain = useRef('$0.00');
  const mountTs = useRef(0);

  const renderDate = new Date();
  const mk = monthKeyOf(renderDate);
  const prevMk = monthKeyOf(new Date(renderDate.getFullYear(), renderDate.getMonth() - 1, 1));
  const startOfMonthMs = new Date(renderDate.getFullYear(), renderDate.getMonth(), 1).getTime();

  const { realMonth, lastMonth, ratePerSec } = useMemo(() => {
    const last30 = getLastNDays(30);
    return {
      realMonth: earnings.filter(e => e.date.startsWith(mk)).reduce((s, e) => s + e.amount, 0),
      lastMonth: earnings.filter(e => e.date.startsWith(prevMk)).reduce((s, e) => s + e.amount, 0),
      ratePerSec: earnings.filter(e => last30.includes(e.date)).reduce((s, e) => s + e.amount, 0) / SEC_30D,
    };
  }, [earnings, mk, prevMk]);

  // Live value, always derived fresh from the clock (month boundary included)
  const calcRef = useRef<() => number>(() => 0);
  calcRef.current = () => {
    const t = Date.now();
    const d = new Date(t);
    const som = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
    const raw = ratePerSec * Math.max(0, (t - som) / 1000);
    const floor = hiWater && hiWater.monthKey === monthKeyOf(d) ? hiWater.value : 0;
    return Math.max(raw, floor);
  };

  // High-water mark: record on rate changes so the value never ticks backward
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

  // 60fps render loop with a launch sweep from $0 on mount
  useEffect(() => {
    mountTs.current = Date.now();
    let raf = 0;
    const tick = () => {
      const p = Math.min(1, (Date.now() - mountTs.current) / SWEEP_MS);
      const v = calcRef.current() * easeOutExpo(p);
      if (microRef.current) {
        microRef.current.textContent = Math.floor((v * 1_000_000) % 10_000).toString().padStart(4, '0');
      }
      const next = fmtMain(v);
      if (next !== prevMain.current) {
        prevMain.current = next;
        setMainStr(next);
        // glow flare on cent advance (skip during the launch sweep)
        if (p >= 1 && numRef.current) {
          numRef.current.classList.remove('cent-pulse');
          void numRef.current.offsetWidth;
          numRef.current.classList.add('cent-pulse');
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const beatingLastMonth = lastMonth > 0 && calcRef.current() >= lastMonth;

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
          ref={numRef}
          className="money-glow"
          style={{
            fontSize: 'clamp(28px, 6vw, 44px)', fontWeight: 900, lineHeight: 1,
            fontFamily: 'JetBrains Mono, monospace',
            letterSpacing: '0.02em',
            filter: 'drop-shadow(0 0 6px rgba(212,175,55,0.35))',
          }}
        >
          {mainStr.split('').map((ch, i) => <OdoChar key={mainStr.length - i} ch={ch} />)}
        </span>
        <span
          ref={microRef}
          style={{
            fontSize: 'clamp(14px, 2.6vw, 20px)', fontWeight: 700, lineHeight: 1,
            fontFamily: 'JetBrains Mono, monospace', color: 'rgba(0,255,135,0.55)',
            fontVariantNumeric: 'tabular-nums', marginLeft: 6, letterSpacing: '0.06em',
          }}
        >
          0000
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
