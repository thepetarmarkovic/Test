import React, { useState, useEffect, useMemo } from 'react';
import type { Habit, EarningEntry, SleepEntry } from '../types';
import { formatCurrency, today, getLastNDays } from '../utils/formatters';

interface Props {
  userName: string;
  habits: Habit[];
  earnings: EarningEntry[];
  sleep: SleepEntry[];
  onDone: () => void;
}

const LINE_STAGGER = 160;   // ms between stat lines
const BOOT_TOTAL = 1600;    // ms before fade-out starts
const FADE_MS = 350;

export default function BootSequence({ userName, habits, earnings, sleep, onDone }: Props) {
  const [leaving, setLeaving] = useState(false);

  const lines = useMemo(() => {
    const t = today();
    const last30 = getLastNDays(30);
    const lastSleep = sleep[sleep.length - 1];
    const income30 = earnings.filter(e => last30.includes(e.date)).reduce((s, e) => s + e.amount, 0);
    const habitsToday = habits.filter(h => h.completions.includes(t)).length;

    // Current streak: consecutive days (ending today or yesterday) with ≥1 habit completion
    let streak = 0;
    if (habits.length > 0) {
      const d = new Date();
      if (!habits.some(h => h.completions.includes(t))) d.setDate(d.getDate() - 1);
      for (;;) {
        const iso = d.toISOString().split('T')[0];
        if (habits.some(h => h.completions.includes(iso))) { streak++; d.setDate(d.getDate() - 1); }
        else break;
      }
    }

    return [
      { label: 'SLEEP SYSTEM', value: lastSleep ? `${lastSleep.hours}H · Q${lastSleep.quality}/5` : 'NO DATA', ok: !!lastSleep },
      { label: 'REVENUE ENGINE · 30D', value: income30 > 0 ? formatCurrency(income30) : 'IDLE', ok: income30 > 0 },
      { label: 'DISCIPLINE STREAK', value: streak > 0 ? `${streak} DAY${streak > 1 ? 'S' : ''}` : 'COLD', ok: streak > 0 },
      { label: 'PROTOCOLS TODAY', value: `${habitsToday}/${habits.length || 0}`, ok: habitsToday > 0 },
    ];
  }, []);

  const finish = () => {
    if (leaving) return;
    setLeaving(true);
    setTimeout(onDone, FADE_MS);
  };

  useEffect(() => {
    const t = setTimeout(finish, BOOT_TOTAL);
    return () => clearTimeout(t);
  }, []);

  const osName = (userName ? `${userName.split(' ')[0]} OS` : 'EMPIRE OS').toUpperCase();

  return (
    <div
      onClick={finish}
      style={{
        position: 'fixed', inset: 0, zIndex: 200, background: '#020202',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', overflow: 'hidden',
        animation: leaving ? `bootFadeOut ${FADE_MS}ms ease-out both` : undefined,
      }}
    >
      {/* Scan line sweep */}
      <div style={{
        position: 'absolute', left: 0, right: 0, height: 2,
        background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.5), transparent)',
        animation: 'bootScan 1.4s linear both',
      }} />

      <div style={{ textAlign: 'center', maxWidth: 420, width: '100%', padding: '0 24px' }}>
        {/* HUD rings */}
        <div style={{ position: 'relative', width: 110, height: 110, margin: '0 auto 22px' }}>
          <svg width="110" height="110" viewBox="0 0 110 110" style={{ position: 'absolute', inset: 0, animation: 'rotate360 3s linear infinite' }}>
            <circle cx="55" cy="55" r="50" fill="none" stroke="#D4AF37" strokeWidth="1.5" strokeDasharray="60 30" opacity="0.7" />
          </svg>
          <svg width="110" height="110" viewBox="0 0 110 110" style={{ position: 'absolute', inset: 0, animation: 'rotate360rev 2s linear infinite' }}>
            <circle cx="55" cy="55" r="38" fill="none" stroke="#00D4FF" strokeWidth="1" strokeDasharray="20 14" opacity="0.5" />
          </svg>
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 30, filter: 'drop-shadow(0 0 14px rgba(212,175,55,0.6))',
          }}>⚡</div>
        </div>

        {/* OS name flicker */}
        <div style={{
          fontSize: 26, fontWeight: 900, letterSpacing: '0.22em',
          fontFamily: 'JetBrains Mono, monospace',
          background: 'linear-gradient(135deg, #D4AF37, #FFD700)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          animation: 'bootFlicker 0.9s steps(1, end) both',
          marginBottom: 4,
        }}>
          {osName}
        </div>
        <div style={{
          fontSize: 9, color: '#444', letterSpacing: '0.3em', fontFamily: 'JetBrains Mono, monospace',
          marginBottom: 26, animation: 'bootLine 0.3s ease-out 0.4s both',
        }}>
          INITIALIZING COMMAND SYSTEMS
        </div>

        {/* Stat lines */}
        <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 7 }}>
          {lines.map((l, i) => (
            <div
              key={l.label}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
                animation: `bootLine 0.25s ease-out ${450 + i * LINE_STAGGER}ms both`,
              }}
            >
              <span style={{ color: '#555' }}>▸ {l.label}</span>
              <span style={{ color: l.ok ? '#00FF87' : '#444', fontWeight: 700 }}>
                {l.value} {l.ok ? '●' : '○'}
              </span>
            </div>
          ))}
          <div style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 700,
            color: '#D4AF37', letterSpacing: '0.1em', marginTop: 10, textAlign: 'center',
            animation: `bootLine 0.25s ease-out ${450 + lines.length * LINE_STAGGER + 120}ms both`,
          }}>
            ⚡ ALL SYSTEMS OPERATIONAL
          </div>
        </div>

        <div style={{
          fontSize: 9, color: '#2a2a2a', letterSpacing: '0.15em', marginTop: 30,
          fontFamily: 'JetBrains Mono, monospace',
          animation: 'bootLine 0.3s ease-out 0.8s both',
        }}>
          TAP TO SKIP
        </div>
      </div>
    </div>
  );
}
