import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { EarningEntry } from '../types';
import { getLastNDays } from '../utils/formatters';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface Props {
  earnings: EarningEntry[];
}

const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

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

export default function MoneyTicker({ earnings }: Props) {
  // Baseline: everything ever recorded. Accrual: projected earnings since the
  // baseline last changed, at the trailing-30-day rate — persists across closes.
  const [anchor, setAnchor] = useLocalStorage<number>('empire_tickerAnchor', Date.now());

  const { totalEarned, ratePerSec } = useMemo(() => {
    const total = earnings.reduce((s, e) => s + e.amount, 0);
    const last30 = getLastNDays(30);
    const sum30 = earnings.filter(e => last30.includes(e.date)).reduce((s, e) => s + e.amount, 0);
    return { totalEarned: total, ratePerSec: sum30 / (30 * 86400) };
  }, [earnings]);

  // When a new entry is recorded the baseline jumps by the real amount, so the
  // projected accrual restarts from zero to avoid double counting.
  const prevTotal = useRef(totalEarned);
  useEffect(() => {
    if (prevTotal.current !== totalEarned) {
      prevTotal.current = totalEarned;
      setAnchor(Date.now());
    }
  }, [totalEarned]);

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 150);
    return () => clearInterval(iv);
  }, []);

  const value = totalEarned + ratePerSec * Math.max(0, (now - anchor) / 1000);
  const display = '$' + value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (earnings.length === 0) {
    return (
      <div className="empire-card" style={{ borderColor: 'rgba(212,175,55,0.25)', textAlign: 'center' }}>
        <div style={{ fontSize: 11, color: '#D4AF37', letterSpacing: '0.12em', fontWeight: 700, marginBottom: 10 }}>◆ LIVE EMPIRE VALUE</div>
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="status-dot status-dot-gold animate-blink" />
          <span style={{ fontSize: 11, color: '#D4AF37', letterSpacing: '0.12em', fontWeight: 700 }}>LIVE EMPIRE VALUE</span>
        </div>
        <span style={{ fontSize: 10, color: '#00FF87', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>
          +${ratePerSec < 0.01 ? ratePerSec.toFixed(6) : ratePerSec.toFixed(4)}/SEC
        </span>
      </div>
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
      <div style={{ fontSize: 10, color: '#444', letterSpacing: '0.08em', marginTop: 10 }}>
        LIFETIME EARNED + PROJECTED ACCRUAL AT YOUR TRAILING 30-DAY RATE — ACCRUES EVEN WHILE YOU'RE GONE
      </div>
    </div>
  );
}
