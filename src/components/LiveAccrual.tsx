import React, { useState, useEffect, useMemo } from 'react';
import type { EarningEntry } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { getLastNDays, formatCurrency } from '../utils/formatters';
import { OdoChar, SEC_30D } from './MoneyTicker';

interface Props {
  earnings: EarningEntry[];
}

interface MonthAnchor {
  monthKey: string;     // 'YYYY-MM' (local)
  baseline: number;     // monthly income that existed before the counter went live — excluded
  realTotal: number;    // real monthly sum at anchor time (jump detection)
  anchorTs: number;     // epoch ms accrual ticks from
}

const monthKeyOf = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

export default function LiveAccrual({ earnings }: Props) {
  const [anchor, setAnchor] = useLocalStorage<MonthAnchor | null>('empire_monthAccrual2', null);
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

  // Anchor lifecycle — the counter ALWAYS starts at $0:
  // - first ever run: baseline = whatever this month already holds
  // - new month: baseline = 0 (fresh race, every entry counts)
  // - new income: odometer jumps by the entry, ticking resumes from now
  useEffect(() => {
    if (!anchor) {
      setAnchor({ monthKey: mk, baseline: realMonth, realTotal: realMonth, anchorTs: Date.now() });
      return;
    }
    if (anchor.monthKey !== mk) {
      setAnchor({ monthKey: mk, baseline: 0, realTotal: realMonth, anchorTs: startOfMonthMs });
      return;
    }
    if (anchor.realTotal !== realMonth) {
      // entries deleted below the baseline: lower the baseline so the counter
      // never goes negative and future income still counts
      const baseline = Math.min(anchor.baseline, realMonth);
      setAnchor({ monthKey: mk, baseline, realTotal: realMonth, anchorTs: Date.now() });
    }
  }, [mk, realMonth, anchor, startOfMonthMs]);

  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(iv);
  }, []);

  const value = anchor && anchor.monthKey === mk
    ? Math.max(0, realMonth - anchor.baseline) + ratePerSec * Math.max(0, (now - anchor.anchorTs) / 1000)
    : 0;

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
        <span style={{ fontSize: 11, color: '#D4AF37', letterSpacing: '0.12em', fontWeight: 700 }}>◆ THIS MONTH</span>
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

      {/* the race against last month */}
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
        REAL INCOME THIS MONTH + LIVE ACCRUAL AT CURRENT PACE
      </div>
    </div>
  );
}
