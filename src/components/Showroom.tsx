import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Settings, X, Volume2, ImagePlus, Box, Trash2 } from 'lucide-react';
import type { Goal, EarningEntry, ExhibitConfig, ExhibitKind } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { formatCurrency, getLastNDays, today } from '../utils/formatters';
import { createShowroom, playEngineSound, type ShowroomHandle } from '../lib/showroom3d';
import { saveAsset, loadAsset, deleteAsset } from '../lib/storage';
import PhotoExhibit from './PhotoExhibit';

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

interface ExhibitAssets { imgUrl?: string; glb?: Blob }

async function downscaleImage(file: File, maxDim = 1600): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob(b => b ? resolve(b) : reject(new Error('encode failed')), 'image/jpeg', 0.87)
  );
}

export default function Showroom({ goals, earnings }: Props) {
  const [exhibits, setExhibits] = useLocalStorage<ExhibitConfig[]>('empire_exhibits', DEFAULT_EXHIBITS);
  const [active, setActive] = useState(0);
  const [configFor, setConfigFor] = useState<ExhibitConfig | null>(null);
  const [assets, setAssets] = useState<Record<string, ExhibitAssets>>({});
  const [assetsVersion, setAssetsVersion] = useState(0);
  const canvasHost = useRef<HTMLDivElement>(null);
  const handleRef = useRef<ShowroomHandle | null>(null);
  const touchX = useRef<number | null>(null);

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

  // Load photos/models from the asset DB whenever flags change
  useEffect(() => {
    let stale = false;
    (async () => {
      const next: Record<string, ExhibitAssets> = {};
      for (const ex of exhibits) {
        const entry: ExhibitAssets = {};
        if (ex.hasImage) {
          const blob = await loadAsset(`exh-img-${ex.id}`);
          if (blob) entry.imgUrl = URL.createObjectURL(blob);
        }
        if (ex.hasModel) {
          const blob = await loadAsset(`exh-glb-${ex.id}`);
          if (blob) entry.glb = blob;
        }
        next[ex.id] = entry;
      }
      if (!stale) {
        setAssets(prev => {
          Object.values(prev).forEach(a => a.imgUrl && URL.revokeObjectURL(a.imgUrl));
          return next;
        });
      }
    })();
    return () => { stale = true; };
  }, [exhibits.map(e => `${e.id}:${e.hasImage ? 1 : 0}${e.hasModel ? 1 : 0}`).join('|'), assetsVersion]);

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
  const curAssets = current ? assets[current.id] : undefined;
  const usePhoto = !!curAssets?.imgUrl && !curAssets?.glb && current?.kind !== 'exitdoor';
  const use3D = !usePhoto;

  // Mount / remount the 3D scene when exhibit or its model changes
  useEffect(() => {
    if (!use3D || !canvasHost.current || !current) return;
    const handle = createShowroom(canvasHost.current, current.kind, curAssets?.glb);
    handleRef.current = handle;
    handle.setProgress(progressOf(current));
    return () => { handle.dispose(); handleRef.current = null; };
  }, [current?.id, use3D, curAssets?.glb]);

  useEffect(() => {
    handleRef.current?.setProgress(current ? progressOf(current) : 0);
  }, [progress, current?.id]);

  const go = (dir: 1 | -1) => setActive(a => (a + dir + gallery.length) % gallery.length);

  const saveConfig = (cfg: ExhibitConfig) => {
    setExhibits(exhibits.map(e => e.id === cfg.id ? cfg : e));
    setConfigFor(null);
  };

  const uploadPhoto = async (ex: ExhibitConfig, file: File) => {
    const blob = await downscaleImage(file);
    await saveAsset(`exh-img-${ex.id}`, blob);
    const next = { ...ex, hasImage: true };
    setExhibits(exhibits.map(e => e.id === ex.id ? next : e));
    setConfigFor(next);
    setAssetsVersion(v => v + 1);
  };

  const uploadModel = async (ex: ExhibitConfig, file: File) => {
    if (file.size > 60 * 1024 * 1024) { alert('Model too large (max 60MB).'); return; }
    await saveAsset(`exh-glb-${ex.id}`, file);
    const next = { ...ex, hasModel: true };
    setExhibits(exhibits.map(e => e.id === ex.id ? next : e));
    setConfigFor(next);
    setAssetsVersion(v => v + 1);
  };

  const removeAsset = async (ex: ExhibitConfig, which: 'img' | 'glb') => {
    await deleteAsset(`exh-${which}-${ex.id}`);
    const next = which === 'img' ? { ...ex, hasImage: false } : { ...ex, hasModel: false };
    setExhibits(exhibits.map(e => e.id === ex.id ? next : e));
    setConfigFor(next);
    setAssetsVersion(v => v + 1);
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
          {/* Stage: photo panel or 3D canvas */}
          <div
            style={{ height: 'min(52vh, 460px)', position: 'relative', touchAction: 'pan-y' }}
            onTouchStart={e => { touchX.current = e.touches[0].clientX; }}
            onTouchEnd={e => {
              if (touchX.current === null) return;
              const dx = e.changedTouches[0].clientX - touchX.current;
              if (Math.abs(dx) > 50 && gallery.length > 1) go(dx < 0 ? 1 : -1);
              touchX.current = null;
            }}
          >
            {usePhoto
              ? <PhotoExhibit src={curAssets!.imgUrl!} kind={current.kind} progress={progress} />
              : <div ref={canvasHost} style={{ position: 'absolute', inset: 0 }} />}
          </div>

          {/* Arrows */}
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
                  <button onClick={() => playEngineSound()} className="btn-gold" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
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
        💡 Open ⚙ on an exhibit to add a photo of YOUR exact dream machine — it becomes a spotlit exhibit with live reveals. Want it in full 3D? Generate a .glb from that photo with a free photo→3D tool (Meshy, Tripo, Luma) and upload it in the same menu.
      </div>

      {/* Config modal */}
      {configFor && (
        <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setConfigFor(null); }}>
          <div className="modal-box" style={{ maxWidth: 420 }}>
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

            {/* Visuals: photo + optional 3D model */}
            {configFor.kind !== 'exitdoor' && (
              <>
                <div style={{ fontSize: 10, color: '#D4AF37', letterSpacing: '0.1em', fontWeight: 700, margin: '14px 0 8px' }}>◆ EXHIBIT VISUALS</div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <label className="btn-ghost" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer', fontSize: 11 }}>
                    <ImagePlus size={13} /> {configFor.hasImage ? 'REPLACE PHOTO' : 'ADD PHOTO'}
                    <input type="file" accept="image/*" style={{ display: 'none' }}
                      onChange={e => { const f = e.target.files?.[0]; if (f) uploadPhoto(configFor, f); e.target.value = ''; }} />
                  </label>
                  {configFor.hasImage && (
                    <button onClick={() => removeAsset(configFor, 'img')} className="btn-ghost" style={{ color: '#FF4141', borderColor: 'rgba(255,65,65,0.3)' }}><Trash2 size={13} /></button>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <label className="btn-ghost" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer', fontSize: 11 }}>
                    <Box size={13} /> {configFor.hasModel ? 'REPLACE 3D MODEL' : 'UPLOAD 3D MODEL (.GLB)'}
                    <input type="file" accept=".glb,model/gltf-binary" style={{ display: 'none' }}
                      onChange={e => { const f = e.target.files?.[0]; if (f) uploadModel(configFor, f); e.target.value = ''; }} />
                  </label>
                  {configFor.hasModel && (
                    <button onClick={() => removeAsset(configFor, 'glb')} className="btn-ghost" style={{ color: '#FF4141', borderColor: 'rgba(255,65,65,0.3)' }}><Trash2 size={13} /></button>
                  )}
                </div>
                <div style={{ fontSize: 10, color: '#444', lineHeight: 1.6, marginBottom: 4 }}>
                  Photo = spotlit exhibit with live reveals. For true rotating 3D of your exact machine: feed the photo to a free photo→3D generator (Meshy / Tripo / Luma), download the .glb, upload it here. A 3D model overrides the photo.
                </div>
              </>
            )}

            <button onClick={() => saveConfig(configFor)} className="btn-gold" style={{ width: '100%', marginTop: 10 }}>SAVE EXHIBIT</button>
          </div>
        </div>
      )}
    </div>
  );
}
