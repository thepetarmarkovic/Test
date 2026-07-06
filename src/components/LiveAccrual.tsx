import React, { useState, useEffect, useMemo } from 'react';
import type { EarningEntry } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { getLastNDays } from '../utils/formatters';
import { OdoChar, SEC_30D } from './MoneyTicker';

interface Props {
  earnings: EarningEntry[];
}

interface AccrualAnchor {
  startTotal: number;   // value the counter climbs from
  startTs: number;      // epoch ms the climb started
  rate: number;         // $/sec at anchor time
  realTotal: number;    // real lifetime total at anchor time (to detect income changes)
}

const valueAt = (a: AccrualAnchor, ts: number) =>
  a.startTotal + a.rate * Math.max(0, (ts - a.startTs) / 1000);

export default function LiveAccrual({ earnings }: Props) {
  const [anchor, setAnchor] = useLocalStorage<AccrualAnchor | null>('empire_accrual', null);
  const [now, setNow] = useState(() => Date.now());

  const { totalEarned, ratePerSec } = useMemo(() => {
    const last30 = getLastNDays(30);
    return {
      totalEarned: earnings.reduce((s, e) => s + e.amount, 0),
      ratePerSec: earnings.filter(e => last30.includes(e.date)).reduce((s, e) => s + e.amount, 0) / SEC_30D,
    };
  }, [earnings]);

  // Anchor lifecycle: initialize once, then reconcile — never tick into state.
  useEffect(() => {
    const ts = Date.now();
    if (!anchor) {
      // first run: start climbing from the current real lifetime total
      setAnchor({ startTotal: totalEarned, startTs: ts, rate: ratePerSec, realTotal: totalEarned });
      return;
    }
    if (anchor.realTotal !== totalEarned) {
      // real income logged/edited — re-anchor to truth (odometer rolls the jump)
      setAnchor({ startTotal: totalEarned, startTs: ts, rate: ratePerSec, realTotal: totalEarned });
      return;
    }
    if (Math.abs(anchor.rate - ratePerSec) > 1e-9) {
      // rate drifted (entries aging out of the 30-day window) — freeze the
      // currently displayed value as the new start so the counter never
      // moves backward, then continue at the new rate
      setAnchor({ startTotal: valueAt(anchor, ts), startTs: ts, rate: ratePerSec, realTotal: totalEarned });
    }
  }, [totalEarned, ratePerSec, anchor]);

  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(iv);
  }, []);

  const value = anchor ? valueAt(anchor, now) : totalEarned;

  // "$1,234.56" rolls on the odometer; 4 extra decimals stream continuously
  const mainStr = '$' + (Math.floor(value * 100) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const micro = Math.floor((value * 1_000_000) % 10_000).toString().padStart(4, '0');

  return (
    <div
      className="empire-card"
      style={{
        borderColor: 'rgba(0,255,135,0.2)',
        background: 'linear-gradient(135deg, rgba(0,255,135,0.04), rgba(212,175,55,0.02))',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <span style={{ fontSize: 11, color: '#D4AF37', letterSpacing: '0.12em', fontWeight: 700 }}>◆ LIVE ACCRUAL</span>
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

      <div style={{ fontSize: 10, color: '#444', letterSpacing: '0.08em', marginTop: 10 }}>
        PROJECTED AT CURRENT VELOCITY — RECONCILES ON REAL INCOME
      </div>
    </div>
  );
}
