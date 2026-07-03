import React, { useState, useMemo } from 'react';
import { Skull, Edit2, X } from 'lucide-react';
import type { MementoSettings } from '../types';
import { validateMemento, computeLifeMath } from '../lib/memento';

interface Props {
  settings: MementoSettings | null;
  onChange: (s: MementoSettings) => void;
}

function LifeGrid({ weeksLived, totalWeeks, overtime }: { weeksLived: number; totalWeeks: number; overtime: boolean }) {
  const rows = useMemo(() => {
    const years = Math.ceil(totalWeeks / 52);
    const fill = Math.min(weeksLived, totalWeeks);
    const currentIdx = overtime || weeksLived >= totalWeeks ? -1 : weeksLived;
    const out: React.ReactNode[] = [];
    for (let y = 0; y < years; y++) {
      const cells: React.ReactNode[] = [];
      for (let w = 0; w < 52; w++) {
        const idx = y * 52 + w;
        if (idx === currentIdx) {
          cells.push(
            <div key={w} className="animate-pulse-gold" style={{ width: 9, height: 9, borderRadius: 2, background: '#FFD700', flexShrink: 0 }} />
          );
        } else if (idx < fill) {
          cells.push(
            <div key={w} style={{ width: 9, height: 9, borderRadius: 2, background: '#D4AF37', opacity: 0.8, flexShrink: 0 }} />
          );
        } else {
          cells.push(
            <div key={w} style={{ width: 9, height: 9, borderRadius: 2, background: '#111', border: '1px solid #1a1a1a', boxSizing: 'border-box', flexShrink: 0 }} />
          );
        }
      }
      out.push(
        <div key={y} style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <div style={{ width: 28, flexShrink: 0, fontSize: 9, color: '#444', fontFamily: 'JetBrains Mono, monospace', textAlign: 'right', paddingRight: 6 }}>
            {y % 10 === 0 ? y : ''}
          </div>
          {cells}
        </div>
      );
    }
    return out;
  }, [weeksLived, totalWeeks, overtime]);

  return <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>{rows}</div>;
}

export default function MementoMori({ settings, onChange }: Props) {
  const [editing, setEditing] = useState(false);
  const [dobInput, setDobInput] = useState(settings?.birthDate ?? '');
  const [leInput, setLeInput] = useState(settings?.lifeExpectancy ?? 80);
  const [error, setError] = useState('');

  const showSetup = !settings || editing;

  const handleSave = () => {
    const err = validateMemento(dobInput, leInput);
    if (err) { setError(err); return; }
    setError('');
    onChange({ birthDate: dobInput, lifeExpectancy: leInput });
    setEditing(false);
  };

  if (showSetup) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }} className="animate-fade-up">
        <div>
          <div style={{ fontSize: 11, color: '#555', letterSpacing: '0.12em', marginBottom: 4, fontFamily: 'JetBrains Mono, monospace' }}>REMEMBER YOU MUST DIE</div>
          <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0, color: '#fff' }}>MEMENTO MORI</h1>
        </div>
        <div className="empire-card" style={{ maxWidth: 460, margin: '40px auto 0', width: '100%', textAlign: 'center', borderColor: 'rgba(255,65,65,0.2)' }}>
          <div style={{ padding: '10px 0 6px' }}>
            <Skull size={40} color="#FF4141" style={{ filter: 'drop-shadow(0 0 16px rgba(255,65,65,0.4))' }} />
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', letterSpacing: '0.06em', marginBottom: 6 }}>CALIBRATE YOUR CLOCK</div>
          <div style={{ fontSize: 12, color: '#555', lineHeight: 1.7, marginBottom: 22 }}>
            Your life, rendered week by week.<br />Most people never look. You will.
          </div>
          <div style={{ textAlign: 'left' }}>
            <div className="label-upper" style={{ marginBottom: 6 }}>Date of Birth</div>
            <input
              className="empire-input"
              type="date"
              value={dobInput}
              onChange={e => setDobInput(e.target.value)}
              style={{ marginBottom: 14, colorScheme: 'dark' }}
            />
            <div className="label-upper" style={{ marginBottom: 6 }}>Life Expectancy (years)</div>
            <input
              className="empire-input"
              type="number"
              min={1}
              max={120}
              value={leInput}
              onChange={e => setLeInput(parseInt(e.target.value) || 0)}
              style={{ marginBottom: 14 }}
            />
            {error && <div style={{ fontSize: 12, color: '#FF4141', marginBottom: 12, fontWeight: 700 }}>{error}</div>}
            <button onClick={handleSave} className="btn-gold" style={{ width: '100%', padding: '13px' }}>
              FACE THE CLOCK
            </button>
            {settings && (
              <button
                onClick={() => { setEditing(false); setError(''); setDobInput(settings.birthDate); setLeInput(settings.lifeExpectancy); }}
                style={{ width: '100%', marginTop: 10, padding: '9px', background: 'none', border: '1px solid #2a2a2a', borderRadius: 8, color: '#555', cursor: 'pointer', fontSize: 12 }}
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const m = computeLifeMath(settings);

  const stats = [
    { label: 'AGE', value: `${m.ageYears}Y ${m.ageDays}D`, color: '#D4AF37' },
    { label: 'WEEKS LIVED', value: m.weeksLived.toLocaleString(), color: '#FFD700' },
    { label: 'WEEKS REMAINING', value: m.weeksRemaining.toLocaleString(), color: '#00D4FF' },
    { label: 'MONDAYS REMAINING', value: m.mondaysRemaining.toLocaleString(), color: '#FF4141' },
    { label: 'SUMMERS LEFT', value: m.summersRemaining.toLocaleString(), color: '#FF6B35' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }} className="animate-fade-up">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: 11, color: '#555', letterSpacing: '0.12em', marginBottom: 4, fontFamily: 'JetBrains Mono, monospace' }}>REMEMBER YOU MUST DIE</div>
          <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0, color: '#fff' }}>MEMENTO MORI</h1>
        </div>
        <button
          onClick={() => { setEditing(true); setDobInput(settings.birthDate); setLeInput(settings.lifeExpectancy); setError(''); }}
          className="btn-ghost"
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Edit2 size={13} /> RECALIBRATE
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        {stats.map(s => (
          <div key={s.label} className="empire-card" style={{ flex: 1, minWidth: 150 }}>
            <div style={{ fontSize: 26, fontWeight: 900, color: s.color, fontFamily: 'JetBrains Mono, monospace', marginBottom: 4 }}>{s.value}</div>
            <div style={{ fontSize: 10, color: '#555', letterSpacing: '0.1em', fontWeight: 700 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Progress + poetic line */}
      <div className="empire-card" style={{ borderColor: 'rgba(255,65,65,0.15)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontSize: 11, color: '#FF4141', letterSpacing: '0.1em', fontWeight: 700 }}>◆ LIFE ELAPSED</span>
          <span style={{ fontSize: 18, fontWeight: 900, color: '#FF4141', fontFamily: 'JetBrains Mono, monospace' }}>{m.pctElapsed.toFixed(1)}%</span>
        </div>
        <div className="progress-track" style={{ height: 8, marginBottom: 14 }}>
          <div className="progress-fill" style={{ width: `${m.overtime ? 100 : m.pctElapsed}%`, background: 'linear-gradient(90deg, #D4AF37, #FF4141)' }} />
        </div>
        <div style={{ fontSize: 14, color: '#ccc', fontStyle: 'italic', lineHeight: 1.6 }}>
          {m.overtime
            ? 'You have outlived the projection. Every week now is a gift — spend it like one.'
            : <>This is week <strong style={{ color: '#FFD700', fontStyle: 'normal', fontFamily: 'JetBrains Mono, monospace' }}>{m.currentWeekNumber.toLocaleString()}</strong> of your life. It will not come again.</>
          }
        </div>
      </div>

      {/* Life grid */}
      <div className="empire-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontSize: 11, color: '#555', letterSpacing: '0.1em', fontWeight: 700 }}>YOUR LIFE IN WEEKS — {settings.lifeExpectancy} YEARS × 52</span>
          <div style={{ display: 'flex', gap: 14, fontSize: 10, color: '#555' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: '#D4AF37', display: 'inline-block' }} /> LIVED
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: '#FFD700', display: 'inline-block' }} /> NOW
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: '#111', border: '1px solid #222', display: 'inline-block' }} /> REMAINING
            </span>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <LifeGrid weeksLived={m.weeksLived} totalWeeks={m.totalWeeks} overtime={m.overtime} />
        </div>
      </div>
    </div>
  );
}
