import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, Volume2, VolumeX, Gem } from 'lucide-react';
import type { EarningEntry, PomodoroSession, Goal, JournalEntry, ExhibitConfig } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { formatCurrency, formatDate, today } from '../utils/formatters';

interface Props {
  earnings: EarningEntry[];
  pomodoro: PomodoroSession[];
  goals: Goal[];
  onClose: () => void;
}

// Subtle synthesized ambient drone — no audio assets.
function startAmbience(): () => void {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const master = ctx.createGain();
    master.gain.value = 0.0001;
    master.connect(ctx.destination);
    master.gain.exponentialRampToValueAtTime(0.05, ctx.currentTime + 3);

    const oscs = [55, 82.4, 110].map((f, i) => {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.value = i === 0 ? 0.5 : 0.22;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.05 + i * 0.03;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.08;
      lfo.connect(lfoGain); lfoGain.connect(g.gain);
      o.connect(g); g.connect(master);
      o.start(); lfo.start();
      return o;
    });

    return () => {
      try {
        master.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.8);
        setTimeout(() => { oscs.forEach(o => o.stop()); ctx.close(); }, 1000);
      } catch { /* already closed */ }
    };
  } catch { return () => {}; }
}

const MARBLE_BG = `
  radial-gradient(ellipse 80% 45% at 22% 8%, rgba(212,175,55,0.05), transparent 60%),
  radial-gradient(ellipse 60% 35% at 80% 90%, rgba(212,175,55,0.03), transparent 60%),
  repeating-linear-gradient(112deg, transparent 0px, transparent 90px, rgba(255,255,255,0.012) 92px, transparent 96px),
  repeating-linear-gradient(68deg, transparent 0px, transparent 130px, rgba(212,175,55,0.02) 132px, transparent 138px),
  linear-gradient(160deg, #0a0908 0%, #030303 55%, #0b0a08 100%)
`;

export default function FlexRoom({ earnings, pomodoro, goals, onClose }: Props) {
  const [dayOne, setDayOne] = useLocalStorage<string>('empire_dayOne', '');
  const [originStone] = useLocalStorage<JournalEntry | null>('empire_originStone', null);
  const [exhibits] = useLocalStorage<ExhibitConfig[]>('empire_exhibits', []);
  const [ambient, setAmbient] = useState(false);
  const [editingDayOne, setEditingDayOne] = useState(false);
  const stopRef = useRef<() => void>(() => {});

  useEffect(() => () => stopRef.current(), []);
  const toggleAmbience = () => {
    if (ambient) { stopRef.current(); setAmbient(false); }
    else { stopRef.current = startAmbience(); setAmbient(true); }
  };

  const { lifetimeEarned, lifetimeFocusH, firstEuro, daysSinceDayOne, kills } = useMemo(() => {
    const total = earnings.reduce((s, e) => s + e.amount, 0);
    const focusH = pomodoro.filter(p => p.completed && p.type === 'work').reduce((s, p) => s + p.duration, 0) / 60;
    const first = [...earnings].sort((a, b) => a.date.localeCompare(b.date))[0] ?? null;

    let days: number | null = null;
    if (dayOne) {
      const [y, m, d] = dayOne.split('-').map(Number);
      const [ty, tm, td] = today().split('-').map(Number);
      days = Math.max(0, Math.floor((Date.UTC(ty, tm - 1, td) - Date.UTC(y, m - 1, d)) / 86400000));
    }

    const killList: { title: string; date?: string }[] = [
      ...exhibits.filter(e => e.completedAt).map(e => ({ title: e.title, date: e.completedAt })),
      ...goals.filter(g => g.completed).map(g => ({ title: g.title.toUpperCase(), date: undefined })),
    ];

    return {
      lifetimeEarned: total,
      lifetimeFocusH: parseFloat(focusH.toFixed(1)),
      firstEuro: first,
      daysSinceDayOne: days,
      kills: killList,
    };
  }, [earnings, pomodoro, goals, exhibits, dayOne]);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 110, overflowY: 'auto',
        background: MARBLE_BG,
        animation: 'flexFadeIn 1.4s ease-out both',
      }}
    >
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '44px 20px 80px', display: 'flex', flexDirection: 'column', gap: 22 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 10, color: '#6b5a26', letterSpacing: '0.34em', fontFamily: 'JetBrains Mono, monospace', marginBottom: 6 }}>
              MEMBERS ONLY · POPULATION: 1
            </div>
            <h1 style={{
              fontSize: 30, fontWeight: 900, margin: 0, letterSpacing: '0.1em',
              background: 'linear-gradient(135deg, #FFD700, #D4AF37 50%, #8a6d1f)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              THE FLEX ROOM
            </h1>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={toggleAmbience} title="Ambience" style={{ background: 'none', border: '1px solid rgba(212,175,55,0.25)', borderRadius: 10, color: ambient ? '#D4AF37' : '#555', cursor: 'pointer', padding: 10 }}>
              {ambient ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
            <button onClick={onClose} style={{ background: 'none', border: '1px solid rgba(212,175,55,0.25)', borderRadius: 10, color: '#8a7a3a', cursor: 'pointer', padding: 10 }}>
              <X size={16} />
            </button>
          </div>
        </div>

        <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.4), transparent)' }} />

        {/* Lifetime totals — engraved */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          {[
            { label: 'LIFETIME EARNED', value: formatCurrency(lifetimeEarned) },
            { label: 'DEEP WORK · EVER', value: `${lifetimeFocusH}H` },
            { label: dayOne ? 'DAYS SINCE DAY ONE' : 'DAY ONE', value: daysSinceDayOne !== null ? daysSinceDayOne.toLocaleString() : 'NOT SET' },
          ].map((s, i) => (
            <div
              key={s.label}
              onClick={i === 2 ? () => setEditingDayOne(true) : undefined}
              style={{
                textAlign: 'center', padding: '22px 12px', borderRadius: 12,
                border: '1px solid rgba(212,175,55,0.18)',
                background: 'linear-gradient(180deg, rgba(212,175,55,0.04), rgba(0,0,0,0.25))',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
                cursor: i === 2 ? 'pointer' : 'default',
              }}
              title={i === 2 ? 'Tap to set your Day One' : undefined}
            >
              <div style={{ fontSize: 24, fontWeight: 900, fontFamily: 'JetBrains Mono, monospace', color: '#e9c766', textShadow: '0 0 18px rgba(212,175,55,0.25)' }}>{s.value}</div>
              <div style={{ fontSize: 8.5, color: '#6b5a26', letterSpacing: '0.2em', marginTop: 6 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {editingDayOne && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center' }}>
            <input
              type="date" className="empire-input" defaultValue={dayOne}
              onChange={e => setDayOne(e.target.value)}
              style={{ maxWidth: 200, colorScheme: 'dark', borderColor: 'rgba(212,175,55,0.3)' }}
            />
            <button onClick={() => setEditingDayOne(false)} className="btn-gold" style={{ fontSize: 11 }}>SET</button>
          </div>
        )}

        {/* The First Euro */}
        <div style={{
          border: '2px solid rgba(212,175,55,0.35)', borderRadius: 4, padding: 5,
          background: 'linear-gradient(135deg, rgba(212,175,55,0.1), rgba(212,175,55,0.02))',
        }}>
          <div style={{ border: '1px solid rgba(212,175,55,0.2)', borderRadius: 2, padding: '26px 20px', textAlign: 'center', background: 'rgba(0,0,0,0.35)' }}>
            <div style={{ fontSize: 9, color: '#6b5a26', letterSpacing: '0.3em', marginBottom: 14 }}>— THE FIRST EURO —</div>
            {firstEuro ? (
              <>
                <div style={{
                  fontSize: 42, fontWeight: 900, fontFamily: 'JetBrains Mono, monospace',
                  background: 'linear-gradient(135deg, #FFD700, #b8962e)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  filter: 'drop-shadow(0 0 14px rgba(212,175,55,0.3))',
                }}>
                  {formatCurrency(firstEuro.amount)}
                </div>
                <div style={{ fontSize: 12, color: '#9a8a4a', marginTop: 8, fontWeight: 700, letterSpacing: '0.06em' }}>{firstEuro.source.toUpperCase()}</div>
                <div style={{ fontSize: 10, color: '#555', marginTop: 4, fontFamily: 'JetBrains Mono, monospace' }}>{formatDate(firstEuro.date)}</div>
                <div style={{ fontSize: 10, color: '#4a4433', marginTop: 14, fontStyle: 'italic' }}>Where it all began.</div>
              </>
            ) : (
              <div style={{ fontSize: 12, color: '#4a4433', fontStyle: 'italic', padding: '10px 0' }}>
                The frame awaits your first recorded income.
              </div>
            )}
          </div>
        </div>

        {/* Kill List */}
        <div style={{
          borderRadius: 12, border: '1px solid rgba(212,175,55,0.18)',
          background: 'linear-gradient(180deg, rgba(212,175,55,0.03), rgba(0,0,0,0.3))', padding: '20px 22px',
        }}>
          <div style={{ fontSize: 10, color: '#6b5a26', letterSpacing: '0.28em', textAlign: 'center', marginBottom: 16 }}>⚔ THE KILL LIST ⚔</div>
          {kills.length === 0 ? (
            <div style={{ fontSize: 12, color: '#4a4433', fontStyle: 'italic', textAlign: 'center' }}>
              Empty plaque. Complete a Showroom exhibit or a mission goal and its name gets engraved here — forever.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {kills.map((k, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '11px 16px', borderRadius: 8,
                  border: '1px solid rgba(212,175,55,0.14)',
                  background: 'rgba(0,0,0,0.3)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
                }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#d9b954', letterSpacing: '0.08em' }}>✓ {k.title}</span>
                  {k.date && <span style={{ fontSize: 9, color: '#555', fontFamily: 'JetBrains Mono, monospace' }}>{k.date}</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Origin Stone */}
        <div style={{
          borderRadius: 12, border: '1px solid rgba(212,175,55,0.22)',
          background: 'radial-gradient(ellipse 70% 90% at 50% 0%, rgba(212,175,55,0.07), rgba(0,0,0,0.35))',
          padding: '22px 24px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 14 }}>
            <Gem size={13} color="#D4AF37" />
            <span style={{ fontSize: 10, color: '#6b5a26', letterSpacing: '0.28em' }}>THE ORIGIN STONE</span>
          </div>
          {originStone ? (
            <>
              <div style={{ fontSize: 16, fontWeight: 900, color: '#e9c766', marginBottom: 4 }}>{originStone.title}</div>
              <div style={{ fontSize: 10, color: '#555', fontFamily: 'JetBrains Mono, monospace', marginBottom: 12 }}>{formatDate(originStone.date)}</div>
              <div style={{ fontSize: 13, color: '#9a8f6a', lineHeight: 1.8, fontStyle: 'italic', whiteSpace: 'pre-wrap' }}>
                {originStone.content.length > 600 ? originStone.content.slice(0, 600) + '…' : originStone.content}
              </div>
            </>
          ) : (
            <div style={{ fontSize: 12, color: '#4a4433', fontStyle: 'italic', textAlign: 'center' }}>
              No stone laid. Open a journal entry and press ◆ ENSHRINE to set the words this empire was built on.
            </div>
          )}
        </div>

        <div style={{ textAlign: 'center', fontSize: 9, color: '#3a3325', letterSpacing: '0.3em', fontFamily: 'JetBrains Mono, monospace', marginTop: 10 }}>
          NOTHING IN THIS ROOM CAN EVER DECREASE
        </div>
      </div>
    </div>
  );
}
