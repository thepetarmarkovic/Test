import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Settings, X, Volume2 } from 'lucide-react';
import type { Goal, EarningEntry, ExhibitConfig, ExhibitKind } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { formatCurrency, getLastNDays, today } from '../utils/formatters';
import { createShowroom, playEngineSound, type ShowroomHandle } from '../lib/showroom3d';

interface Props {
  goals: Goal[];
  earnings: EarningEntry[];
}

const KIND_LABELS: Record<ExhibitKind, string> = {
  panamera: 'PORSCHE PANAMERA',
  motorcycle: 'THE MOTORCYCLE',
  exitdoor: 'QUIT MY JOB',
};

const DEFAULT_EXHIBITS: ExhibitConfig[] = [
  { id: 'panamera', title: 'PORSCHE PANAMERA', kind: 'panamera', target: 120000, source: 'lifetime' },
  { id: 'moto', title: 'THE MOTORCYCLE', kind: 'motorcycle', target: 15000, source: 'lifetime' },
  { id: 'freedom', title: 'QUIT MY JOB', kind: 'exitdoor', target: 3000, source: 'monthly' },
];

export default function Showroom({ goals, earnings }: Props) {
  const [exhibits, setExhibits] = useLocalStorage<ExhibitConfig[]>('empire_exhibits', DEFAULT_EXHIBITS);
  const [active, setActive] = useState(0);
  const [configFor, setConfigFor] = useState<ExhibitConfig | null>(null);
  const canvasHost = useRef<HTMLDivElement>(null);
  const handleRef = useRef<ShowroomHandle | null>(null);
  const touchX = useRef<number | null>(null);
  const enginePlayed = useRef(false);

  const lifetime = useMemo(() => earnings.reduce((s, e) => s + e.amount, 0), [earnings]);
  const monthly = useMemo(() => {
    const last30 = getLastNDays(30);
    return earnings.filter(e => last30.includes(e.date)).reduce((s, e) => s + e.amount, 0);
  }, [earnings]);

  const progressOf = (ex: ExhibitConfig): number => {
    if (ex.source === 'goal' && ex.goalId) {
      const g = goals.find(x => x.id === ex.goalId);
      if (g && g.targetAmount > 0) return g.currentAmount / g.targetAmount;
      return 0;
    }
    if (ex.target <= 0) return 0;
    return (ex.source === 'monthly' ? monthly : lifetime) / ex.target;
  };

  const valueOf = (ex: ExhibitConfig): { current: number; target: number } => {
    if (ex.source === 'goal' && ex.goalId) {
      const g = goals.find(x => x.id === ex.goalId);
      return { current: g?.currentAmount ?? 0, target: g?.targetAmount ?? 0 };
    }
    return { current: ex.source === 'monthly' ? monthly : lifetime, target: ex.target };
  };

  // Append-only completion stamping — a completed exhibit never un-completes.
  useEffect(() => {
    const stamped = exhibits.map(ex =>
      !ex.completedAt && progressOf(ex) >= 1 ? { ...ex, completedAt: today() } : ex
    );
    if (stamped.some((ex, i) => ex.completedAt !== exhibits[i].completedAt)) setExhibits(stamped);
  }, [lifetime, monthly, goals]);

  const inGallery = exhibits.filter(ex => !ex.completedAt);
  const trophies = exhibits.filter(ex => ex.completedAt);
  const gallery = inGallery.length > 0 ? inGallery : exhibits;
  const idx = Math.min(active, gallery.length - 1);
  const current = gallery[idx];
  const progress = current ? Math.min(progressOf(current), 1) : 0;
  const vals = current ? valueOf(current) : { current: 0, target: 0 };

  // Mount / remount the 3D scene when the active exhibit kind changes
  useEffect(() => {
    if (!canvasHost.current || !current) return;
    const handle = createShowroom(canvasHost.current, current.kind);
    handleRef.current = handle;
    handle.setProgress(progressOf(current));
    enginePlayed.current = false;
    return () => { handle.dispose(); handleRef.current = null; };
  }, [current?.id]);

  useEffect(() => {
    handleRef.current?.setProgress(current ? progressOf(current) : 0);
  }, [progress, current?.id]);

  const go = (dir: 1 | -1) => setActive(a => (a + dir + gallery.length) % gallery.length);

  const saveConfig = (cfg: ExhibitConfig) => {
    setExhibits(exhibits.map(e => e.id === cfg.id ? cfg : e));
    setConfigFor(null);
  };

  const moneyGoals = goals.filter(g => g.type === 'money' && !g.completed);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }} className="animate-fade-up">
      {/* Header */}
      <div>
        <div style={{ fontSize: 11, color: '#555', letterSpacing: '0.12em', marginBottom: 4, fontFamily: 'JetBrains Mono, monospace' }}>WHAT YOU'RE BUILDING TOWARD</div>
        <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0, color: '#fff' }}>THE SHOWROOM</h1>
      </div>

      {current && (
        <div className="empire-card" style={{ padding: 0, overflow: 'hidden', borderColor: 'rgba(212,175,55,0.2)' }}>
          {/* 3D stage */}
          <div
            ref={canvasHost}
            style={{ height: 'min(52vh, 460px)', position: 'relative', touchAction: 'pan-y' }}
            onTouchStart={e => { touchX.current = e.touches[0].clientX; }}
            onTouchEnd={e => {
              if (touchX.current === null) return;
              const dx = e.changedTouches[0].clientX - touchX.current;
              if (Math.abs(dx) > 50 && gallery.length > 1) go(dx < 0 ? 1 : -1);
              touchX.current = null;
            }}
          />

          {/* Overlay: arrows */}
          {gallery.length > 1 && (
            <>
              <button onClick={() => go(-1)} style={{ position: 'absolute', left: 10, top: '40%', background: 'rgba(0,0,0,0.5)', border: '1px solid #2a2a2a', borderRadius: '50%', width: 36, height: 36, color: '#D4AF37', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ChevronLeft size={18} /></button>
              <button onClick={() => go(1)} style={{ position: 'absolute', right: 10, top: '40%', background: 'rgba(0,0,0,0.5)', border: '1px solid #2a2a2a', borderRadius: '50%', width: 36, height: 36, color: '#D4AF37', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ChevronRight size={18} /></button>
            </>
          )}

          {/* Info bar */}
          <div style={{ padding: '16px 20px', borderTop: '1px solid #151515' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 900, color: '#fff', letterSpacing: '0.06em' }}>{current.title}</div>
                <div style={{ fontSize: 11, color: '#555', fontFamily: 'JetBrains Mono, monospace', marginTop: 3 }}>
                  {formatCurrency(vals.current)} / {formatCurrency(vals.target)}
                  <span style={{ color: '#333' }}> · {current.source === 'monthly' ? '30-DAY REVENUE' : current.source === 'goal' ? 'LINKED GOAL' : 'LIFETIME EARNINGS'}</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {progress >= 1 && current.kind === 'panamera' && (
                  <button
                    onClick={() => { playEngineSound(); enginePlayed.current = true; }}
                    className="btn-gold"
                    style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}
                  >
                    <Volume2 size={13} /> START ENGINE
                  </button>
                )}
                <div style={{ fontSize: 26, fontWeight: 900, color: progress >= 1 ? '#00FF87' : '#D4AF37', fontFamily: 'JetBrains Mono, monospace' }}>
                  {Math.floor(progress * 100)}%
                </div>
                <button onClick={() => setConfigFor({ ...current })} style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer' }}><Settings size={15} /></button>
              </div>
            </div>
            <div className="progress-track" style={{ marginTop: 12 }}>
              <div className="progress-fill" style={{ width: `${Math.min(progress * 100, 100)}%` }} />
            </div>
            {/* Dots */}
            {gallery.length > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 12 }}>
                {gallery.map((ex, i) => (
                  <button key={ex.id} onClick={() => setActive(i)} style={{ width: 7, height: 7, borderRadius: '50%', border: 'none', cursor: 'pointer', background: i === idx ? '#D4AF37' : '#222', padding: 0 }} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Trophy wing */}
      {trophies.length > 0 && (
        <div className="empire-card" style={{ borderColor: 'rgba(212,175,55,0.35)', background: 'linear-gradient(135deg, rgba(212,175,55,0.07), rgba(212,175,55,0.01))' }}>
          <div style={{ fontSize: 11, color: '#D4AF37', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 12 }}>🏆 TROPHY WING — PERMANENTLY LIT</div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {trophies.map(t => (
              <div key={t.id} style={{ flex: '1 1 180px', background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 10, padding: '14px 16px', boxShadow: '0 0 18px rgba(212,175,55,0.12)' }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#FFD700', letterSpacing: '0.05em' }}>{t.title}</div>
                <div style={{ fontSize: 10, color: '#555', fontFamily: 'JetBrains Mono, monospace', marginTop: 4 }}>CONQUERED {t.completedAt}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ padding: '10px 14px', background: '#0a0a0a', borderRadius: 8, fontSize: 11, color: '#444', lineHeight: 1.6, border: '1px solid #111' }}>
        💡 Swipe or use the arrows to walk the showroom · Each exhibit reveals itself as your money grows · ⚙ to set targets or link a money goal
      </div>

      {/* Config modal */}
      {configFor && (
        <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setConfigFor(null); }}>
          <div className="modal-box" style={{ maxWidth: 400 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#D4AF37' }}>CONFIGURE — {KIND_LABELS[configFor.kind]}</h3>
              <button onClick={() => setConfigFor(null)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div className="label-upper" style={{ marginBottom: 6 }}>Exhibit Title</div>
            <input className="empire-input" value={configFor.title} onChange={e => setConfigFor({ ...configFor, title: e.target.value })} style={{ marginBottom: 12 }} />
            <div className="label-upper" style={{ marginBottom: 6 }}>Progress Source</div>
            <select
              className="empire-select"
              value={configFor.source}
              onChange={e => setConfigFor({ ...configFor, source: e.target.value as ExhibitConfig['source'] })}
              style={{ marginBottom: 12, width: '100%' }}
            >
              <option value="lifetime">Lifetime earnings</option>
              <option value="monthly">Trailing 30-day revenue</option>
              {moneyGoals.length > 0 && <option value="goal">Linked money goal</option>}
            </select>
            {configFor.source === 'goal' ? (
              <>
                <div className="label-upper" style={{ marginBottom: 6 }}>Linked Goal</div>
                <select
                  className="empire-select"
                  value={configFor.goalId ?? ''}
                  onChange={e => setConfigFor({ ...configFor, goalId: e.target.value || undefined })}
                  style={{ marginBottom: 12, width: '100%' }}
                >
                  <option value="">— choose a goal —</option>
                  {moneyGoals.map(g => <option key={g.id} value={g.id}>{g.title} ({formatCurrency(g.targetAmount)})</option>)}
                </select>
              </>
            ) : (
              <>
                <div className="label-upper" style={{ marginBottom: 6 }}>Target Amount ($)</div>
                <input className="empire-input" type="number" value={configFor.target} onChange={e => setConfigFor({ ...configFor, target: parseFloat(e.target.value) || 0 })} style={{ marginBottom: 12 }} />
              </>
            )}
            <button onClick={() => saveConfig(configFor)} className="btn-gold" style={{ width: '100%', marginTop: 6 }}>SAVE EXHIBIT</button>
          </div>
        </div>
      )}
    </div>
  );
}
