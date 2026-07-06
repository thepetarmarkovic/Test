import React, { useState, useEffect, useMemo } from 'react';
import type { EarningEntry } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { getLastNDays, formatCurrency } from '../utils/formatters';
import { OdoChar, SEC_30D } from './MoneyTicker';

interface Props {
  earnings: EarningEntry[];
}

// Pure pace counter: value = accrued + rate x elapsed. No real-income jumps —
// logging income only changes the RATE (slope), never the displayed value.
interface PaceAnchor {
  monthKey: string;   // 'YYYY-MM' (local)
  accrued: number;    // value locked in at anchor time
  anchorTs: number;   // epoch ms ticking resumes from
  rate: number;       // $/sec at anchor time
}

const monthKeyOf = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

const valueAt = (a: PaceAnchor, ts: number) =>
  a.accrued + a.rate * Math.max(0, (ts - a.anchorTs) / 1000);

export default function LiveAccrual({ earnings }: Props) {
  const [anchor, setAnchor] = useLocalStorage<PaceAnchor | null>('empire_paceMonth', null);
  const [now, setNow] = useState(() => Date.now());

  const nowDate = new Date(now);
  const mk = monthKeyOf(nowDate);
  const prevMk = monthKeyOf(new Date(nowDate.getFullYear(), nowDate.getMonth() - 1, 1));
  const startOfMonthMs = new Date(nowDate.getFullYear(), nowDate.getMonth(), 1).getTime();

  const { lastMonth, ratePerSec } = useMemo(() => {
    const last30 = getLastNDays(30);
    return {
      lastMonth: earnings.filter(e => e.date.startsWith(prevMk)).reduce((s, e) => s + e.amount, 0),
      ratePerSec: earnings.filter(e => last30.includes(e.date)).reduce((s, e) => s + e.amount, 0) / SEC_30D,
    };
  }, [earnings, prevMk]);

  // Anchor lifecycle: start at 0, tick at the current rate; when the rate
  // changes (new income or entries aging out), lock in the displayed value
  // and continue at the new slope — continuous, never a jump, never backward.
  useEffect(() => {
    const ts = Date.now();
    if (!anchor) {
      setAnchor({ monthKey: mk, accrued: 0, anchorTs: ts, rate: ratePerSec });
      return;
    }
    if (anchor.monthKey !== mk) {
      setAnchor({ monthKey: mk, accrued: 0, anchorTs: startOfMonthMs, rate: ratePerSec });
      return;
    }
    if (Math.abs(anchor.rate - ratePerSec) > 1e-9) {
      setAnchor({ monthKey: mk, accrued: valueAt(anchor, ts), anchorTs: ts, rate: ratePerSec });
    }
  }, [mk, ratePerSec, anchor, startOfMonthMs]);

  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(iv);
  }, []);

  const value = anchor && anchor.monthKey === mk ? valueAt(anchor, now) : 0;

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
        <span style={{ fontSize: 11, color: '#D4AF37', letterSpacing: '0.12em', fontWeight: 700 }}>◆ THIS MONTH — AT YOUR PACE</span>
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

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
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
        TICKING AT YOUR 30-DAY RATE — LOGGING INCOME CHANGES THE PACE, NOT THE NUMBER
      </div>
    </div>
  );
}
