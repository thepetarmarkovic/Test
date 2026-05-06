import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Trophy, Plus, Trash2, Edit2, X, Share2, Copy, Check, Wifi, WifiOff, Settings, Zap } from 'lucide-react';
import type { CompetitorProfile, Habit, EarningEntry, Goal, PomodoroSession } from '../types';
import { formatCurrency, uid, today, getLast7Days } from '../utils/formatters';
import { useLocalStorage } from '../hooks/useLocalStorage';
import {
  initFirebase, isFirebaseReady, publishProfile, subscribeToOperator,
  type FirebaseConfig,
} from '../lib/firebaseSync';

const AVATARS = ['⚡', '🔱', '🦅', '🐉', '🏆', '⚔️', '🎯', '💎', '🦁', '🌪️'];
const medalColors = ['#D4AF37', '#C0C0C0', '#CD7F32'];

const calcPoints = (p: CompetitorProfile) =>
  p.weeklyHabits * 10 + Math.floor(p.weeklyEarnings / 100) + p.goalsCompleted * 50 + Math.floor(p.focusHours * 5);

function encodeProfile(profile: CompetitorProfile): string {
  return btoa(unescape(encodeURIComponent(JSON.stringify(profile))));
}

function decodeProfile(encoded: string): CompetitorProfile | null {
  try {
    return JSON.parse(decodeURIComponent(escape(atob(encoded))));
  } catch {
    return null;
  }
}

function generateShareLink(profile: CompetitorProfile): string {
  const base = window.location.href.split('#')[0];
  return `${base}#squad=${encodeProfile(profile)}`;
}

interface Props {
  competitors: CompetitorProfile[];
  habits: Habit[];
  earnings: EarningEntry[];
  goals: Goal[];
  pomodoro: PomodoroSession[];
  myName: string;
  onChange: (c: CompetitorProfile[]) => void;
  onUpdateMe: (c: CompetitorProfile) => void;
}

const BLANK_CONFIG: FirebaseConfig = {
  apiKey: '', authDomain: '', databaseURL: '', projectId: '',
  storageBucket: '', messagingSenderId: '', appId: '',
};

export default function Competition({ competitors, habits, earnings, goals, pomodoro, myName, onChange }: Props) {
  const [operatorId] = useLocalStorage<string>('empire_operatorId', uid());
  const [fbConfig, setFbConfig] = useLocalStorage<FirebaseConfig>('empire_fbConfig', BLANK_CONFIG);
  const [fbReady, setFbReady] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [addMode, setAddMode] = useState<'link' | 'live'>('live');
  const [linkInput, setLinkInput] = useState('');
  const [rivalOpId, setRivalOpId] = useState('');
  const [rivalName, setRivalName] = useState('');
  const [rivalAvatar, setRivalAvatar] = useState('🦅');
  const [linkError, setLinkError] = useState('');
  const [copied, setCopied] = useState(false);
  const [copiedOpId, setCopiedOpId] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<CompetitorProfile>>({});
  const [showShareModal, setShowShareModal] = useState(false);
  const [showFbSetup, setShowFbSetup] = useState(false);
  const [configDraft, setConfigDraft] = useState<FirebaseConfig>(fbConfig);
  const [fbError, setFbError] = useState('');
  const [liveStatuses, setLiveStatuses] = useState<Record<string, boolean>>({});
  const unsubRefs = useRef<Record<string, () => void>>({});

  const last7 = getLast7Days();
  const myWeeklyHabits = habits.reduce((s, h) => s + last7.filter(d => h.completions.includes(d)).length, 0);
  const myWeeklyEarnings = earnings.filter(e => last7.includes(e.date)).reduce((s, e) => s + e.amount, 0);
  const myGoalsCompleted = goals.filter(g => g.completed).length;
  const myFocusHours = parseFloat((pomodoro.filter(s => last7.includes(s.date) && s.completed && s.type === 'work').reduce((s, p) => s + p.duration, 0) / 60).toFixed(1));

  const me: CompetitorProfile = {
    id: operatorId, name: myName || 'YOU', avatar: '🔱',
    weeklyHabits: myWeeklyHabits, weeklyEarnings: myWeeklyEarnings,
    goalsCompleted: myGoalsCompleted, focusHours: myFocusHours,
    weeklyPoints: 0, achievements: [], isMe: true, lastSync: today(),
  };
  me.weeklyPoints = calcPoints(me);

  // Init Firebase on load if config saved
  useEffect(() => {
    if (fbConfig.databaseURL) {
      const ok = initFirebase(fbConfig);
      setFbReady(ok);
    }
  }, []);

  // Auto-publish my stats to Firebase whenever they change
  useEffect(() => {
    if (!fbReady || !isFirebaseReady()) return;
    publishProfile(operatorId, me).catch(() => {});
  }, [fbReady, myWeeklyHabits, myWeeklyEarnings, myGoalsCompleted, myFocusHours]);

  // Subscribe to all live rivals
  const competitorsRef = useRef(competitors);
  competitorsRef.current = competitors;

  const subscribeRival = useCallback((rival: CompetitorProfile) => {
    if (!rival.operatorId || !isFirebaseReady()) return;
    if (unsubRefs.current[rival.id]) return;
    const rivalId = rival.id;
    const unsub = subscribeToOperator(rival.operatorId, (profile) => {
      if (!profile) return;
      setLiveStatuses(prev => ({ ...prev, [rivalId]: true }));
      onChange(
        competitorsRef.current.map(c =>
          c.id === rivalId
            ? { ...c, ...profile, weeklyPoints: calcPoints(profile), isMe: false, lastSync: new Date().toLocaleTimeString() }
            : c
        )
      );
    });
    unsubRefs.current[rivalId] = unsub;
  }, [onChange]);

  useEffect(() => {
    if (!fbReady) return;
    competitors.forEach(r => { if (r.operatorId) subscribeRival(r); });
    return () => {
      Object.values(unsubRefs.current).forEach(fn => fn());
      unsubRefs.current = {};
    };
  }, [fbReady, competitors.length]);

  // Check URL hash for incoming profile
  useEffect(() => {
    const hash = window.location.hash;
    const match = hash.match(/#squad=(.+)/);
    if (match) {
      const profile = decodeProfile(match[1]);
      if (profile && !profile.isMe) {
        profile.isMe = false;
        profile.lastSync = today();
        const exists = competitors.find(c => c.id === profile.id);
        if (!exists) {
          onChange([...competitors, { ...profile, weeklyPoints: calcPoints(profile) }]);
        } else {
          onChange(competitors.map(c => c.id === profile.id ? { ...profile, weeklyPoints: calcPoints(profile) } : c));
        }
        window.location.hash = '';
      }
    }
  }, []);

  const saveFirebaseConfig = () => {
    setFbError('');
    if (!configDraft.databaseURL.includes('firebaseio.com')) {
      setFbError('Database URL must end in .firebaseio.com');
      return;
    }
    const ok = initFirebase(configDraft);
    if (!ok) { setFbError('Failed to connect. Double-check your config.'); return; }
    setFbConfig(configDraft);
    setFbReady(true);
    setShowFbSetup(false);
    publishProfile(operatorId, me).catch(() => {});
  };

  const addLiveRival = () => {
    setLinkError('');
    if (!rivalOpId.trim()) { setLinkError('Enter your friend\'s Operator ID.'); return; }
    if (!rivalName.trim()) { setLinkError('Enter a name for your rival.'); return; }
    const id = rivalOpId.trim();
    if (competitors.find(c => c.operatorId === id)) { setLinkError('Already tracking this rival.'); return; }
    const newRival: CompetitorProfile = {
      id: uid(), name: rivalName.trim().toUpperCase(), avatar: rivalAvatar,
      operatorId: id, weeklyHabits: 0, weeklyEarnings: 0,
      goalsCompleted: 0, focusHours: 0, weeklyPoints: 0,
      achievements: [], isMe: false, lastSync: 'Pending first sync...',
    };
    onChange([...competitors, newRival]);
    subscribeRival(newRival);
    setRivalOpId(''); setRivalName(''); setShowAdd(false);
  };

  const importFromLink = () => {
    setLinkError('');
    try {
      const match = linkInput.match(/#squad=(.+)/);
      if (!match) { setLinkError('Invalid link — paste the full share link.'); return; }
      const profile = decodeProfile(match[1]);
      if (!profile) { setLinkError('Corrupted link. Ask your friend for a new one.'); return; }
      profile.isMe = false;
      profile.lastSync = today();
      const exists = competitors.find(c => c.id === profile.id);
      if (exists) {
        onChange(competitors.map(c => c.id === profile.id ? { ...profile, weeklyPoints: calcPoints(profile) } : c));
      } else {
        onChange([...competitors, { ...profile, weeklyPoints: calcPoints(profile) }]);
      }
      setLinkInput(''); setShowAdd(false);
    } catch {
      setLinkError('Something went wrong. Try again.');
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(generateShareLink(me)).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    });
  };

  const copyOpId = () => {
    navigator.clipboard.writeText(operatorId).then(() => {
      setCopiedOpId(true); setTimeout(() => setCopiedOpId(false), 2000);
    });
  };

  const deleteCompetitor = (id: string) => {
    if (unsubRefs.current[id]) { unsubRefs.current[id](); delete unsubRefs.current[id]; }
    onChange(competitors.filter(c => c.id !== id));
    setLiveStatuses(prev => { const n = { ...prev }; delete n[id]; return n; });
  };

  const updateCompetitor = (id: string, data: Partial<CompetitorProfile>) => {
    onChange(competitors.map(c => c.id === id ? { ...c, ...data, weeklyPoints: calcPoints({ ...c, ...data } as CompetitorProfile) } : c));
    setEditId(null);
  };

  const allPlayers = [me, ...competitors].sort((a, b) => calcPoints(b) - calcPoints(a));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }} className="animate-fade-up">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: 11, color: '#555', letterSpacing: '0.12em', marginBottom: 4, fontFamily: 'JetBrains Mono, monospace' }}>
            COMPETITIVE INTELLIGENCE
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0, color: '#fff' }}>THE ARENA</h1>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => setShowFbSetup(true)} className="btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: 6 }} title="Live sync settings">
            {fbReady
              ? <><Wifi size={13} color="#00FF87" /> <span style={{ color: '#00FF87' }}>LIVE</span></>
              : <><WifiOff size={13} /> SETUP LIVE</>}
          </button>
          <button onClick={() => setShowShareModal(true)} className="btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Share2 size={13} /> SHARE
          </button>
          <button onClick={() => setShowAdd(true)} className="btn-gold" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={14} /> ADD RIVAL
          </button>
        </div>
      </div>

      {/* Live status banner */}
      {fbReady ? (
        <div style={{ background: 'linear-gradient(135deg, rgba(0,255,135,0.06), rgba(0,255,135,0.02))', border: '1px solid rgba(0,255,135,0.15)', borderRadius: 12, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <Zap size={20} color="#00FF87" />
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#00FF87', marginBottom: 3 }}>LIVE SYNC ACTIVE — REAL-TIME MODE</div>
            <div style={{ fontSize: 11, color: '#555', lineHeight: 1.6 }}>
              Your stats broadcast automatically. Add rivals by their <strong style={{ color: '#ccc' }}>Operator ID</strong> and their stats update in real-time whenever they use the app.
            </div>
          </div>
        </div>
      ) : (
        <div style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.08), rgba(212,175,55,0.02))', border: '1px solid rgba(212,175,55,0.15)', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ fontSize: 24 }}>⚡</div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#D4AF37', marginBottom: 4 }}>ENABLE REAL-TIME SYNC</div>
              <div style={{ fontSize: 12, color: '#666', lineHeight: 1.6 }}>
                Connect Firebase (free) to see rival stats update live — no manual sharing. Or use share links for offline mode.
              </div>
            </div>
          </div>
          <button onClick={() => setShowFbSetup(true)} className="btn-gold" style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Settings size={13} /> CONNECT
          </button>
        </div>
      )}

      {/* Firebase setup modal */}
      {showFbSetup && (
        <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setShowFbSetup(false); }}>
          <div className="modal-box" style={{ maxWidth: 520 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#D4AF37' }}>
                <Wifi size={15} style={{ marginRight: 8, verticalAlign: 'middle' }} />LIVE SYNC SETUP
              </h3>
              <button onClick={() => setShowFbSetup(false)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div style={{ fontSize: 12, color: '#555', marginBottom: 18, lineHeight: 1.8 }}>
              Create a free Firebase project in <strong style={{ color: '#ccc' }}>2 minutes</strong>:<br />
              1. Go to <strong style={{ color: '#D4AF37' }}>console.firebase.google.com</strong> → Add project<br />
              2. Build → Realtime Database → Create database (test mode)<br />
              3. Project Settings ⚙️ → Your apps → Add web app → copy config<br />
              4. Paste each field below and click Connect.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
              {(Object.keys(BLANK_CONFIG) as Array<keyof FirebaseConfig>).map(key => (
                <div key={key}>
                  <div className="label-upper" style={{ marginBottom: 6 }}>{key}</div>
                  <input
                    className="empire-input"
                    value={configDraft[key]}
                    onChange={e => setConfigDraft(prev => ({ ...prev, [key]: e.target.value }))}
                    placeholder={key === 'databaseURL' ? 'https://xxx.firebaseio.com' : `Your ${key}`}
                    style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
                  />
                </div>
              ))}
            </div>
            {fbError && <div style={{ fontSize: 12, color: '#FF4141', marginBottom: 10 }}>{fbError}</div>}
            <button onClick={saveFirebaseConfig} className="btn-gold" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Wifi size={14} /> CONNECT & GO LIVE
            </button>
            {fbReady && (
              <button onClick={() => { setFbConfig(BLANK_CONFIG); setFbReady(false); setShowFbSetup(false); }}
                style={{ marginTop: 10, width: '100%', padding: '8px', background: 'none', border: '1px solid #2a2a2a', borderRadius: 8, color: '#555', cursor: 'pointer', fontSize: 12 }}>
                Disconnect
              </button>
            )}
          </div>
        </div>
      )}

      {/* Share modal */}
      {showShareModal && (
        <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setShowShareModal(false); }}>
          <div className="modal-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#D4AF37' }}>SHARE YOUR STATS</h3>
              <button onClick={() => setShowShareModal(false)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            {/* Operator ID section */}
            {fbReady && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: '#00FF87', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 10 }}>
                  ● LIVE MODE — OPERATOR ID
                </div>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 10, lineHeight: 1.7 }}>
                  Give your friend this ID. When they add you as a rival, your stats update <strong style={{ color: '#ccc' }}>automatically in real-time</strong> — no re-sharing needed.
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ flex: 1, background: '#0d0d0d', border: '1px solid rgba(0,255,135,0.2)', borderRadius: 8, padding: '12px 14px', fontSize: 12, color: '#00FF87', fontFamily: 'JetBrains Mono, monospace', wordBreak: 'break-all' }}>
                    {operatorId}
                  </div>
                  <button onClick={copyOpId} className="btn-gold" style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {copiedOpId ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            )}
            {/* Stats preview */}
            <div style={{ background: '#111', borderRadius: 10, padding: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 10, color: '#555', letterSpacing: '0.1em', marginBottom: 12 }}>YOUR CURRENT STATS</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  { label: 'Weekly Habits', value: myWeeklyHabits },
                  { label: 'Weekly Earnings', value: formatCurrency(myWeeklyEarnings) },
                  { label: 'Goals Completed', value: myGoalsCompleted },
                  { label: 'Focus Hours', value: `${myFocusHours}h` },
                  { label: 'Total Points', value: me.weeklyPoints },
                ].map(s => (
                  <div key={s.label}>
                    <div style={{ fontSize: 10, color: '#555' }}>{s.label}</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#D4AF37', fontFamily: 'JetBrains Mono, monospace' }}>{s.value}</div>
                  </div>
                ))}
              </div>
            </div>
            {/* Static link fallback */}
            <div style={{ fontSize: 11, color: '#555', marginBottom: 10, letterSpacing: '0.08em' }}>
              {fbReady ? 'OR — SHARE A STATIC LINK (one-time snapshot)' : 'SHARE LINK (one-time snapshot)'}
            </div>
            <button onClick={copyLink} className="btn-ghost" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {copied ? <><Check size={14} /> COPIED!</> : <><Copy size={14} /> COPY SHARE LINK</>}
            </button>
          </div>
        </div>
      )}

      {/* Add rival modal */}
      {showAdd && (
        <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setShowAdd(false); }}>
          <div className="modal-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#D4AF37' }}>ADD RIVAL</h3>
              <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            {/* Mode tabs */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#0d0d0d', padding: 4, borderRadius: 10 }}>
              {fbReady && (
                <button onClick={() => setAddMode('live')} style={{
                  flex: 1, padding: '8px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
                  background: addMode === 'live' ? 'rgba(0,255,135,0.12)' : 'transparent',
                  color: addMode === 'live' ? '#00FF87' : '#555',
                }}>
                  ● LIVE (OPERATOR ID)
                </button>
              )}
              <button onClick={() => setAddMode('link')} style={{
                flex: 1, padding: '8px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
                background: addMode === 'link' ? 'rgba(212,175,55,0.1)' : 'transparent',
                color: addMode === 'link' ? '#D4AF37' : '#555',
              }}>
                ⚡ SHARE LINK
              </button>
            </div>

            {addMode === 'live' && fbReady ? (
              <>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 16, lineHeight: 1.7 }}>
                  Ask your friend for their <strong style={{ color: '#00FF87' }}>Operator ID</strong> (found in their Arena → Share My Stats). Their stats sync live automatically.
                </div>
                <div className="label-upper" style={{ marginBottom: 6 }}>RIVAL'S OPERATOR ID</div>
                <input className="empire-input" value={rivalOpId} onChange={e => setRivalOpId(e.target.value)}
                  placeholder="Paste Operator ID..." style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, marginBottom: 12 }} />
                <div className="label-upper" style={{ marginBottom: 6 }}>RIVAL NAME</div>
                <input className="empire-input" value={rivalName} onChange={e => setRivalName(e.target.value)}
                  placeholder="e.g. ALEX" style={{ marginBottom: 12 }} />
                <div className="label-upper" style={{ marginBottom: 8 }}>AVATAR</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                  {AVATARS.map(a => (
                    <button key={a} onClick={() => setRivalAvatar(a)} style={{
                      width: 40, height: 40, borderRadius: 8, fontSize: 20, border: `2px solid ${rivalAvatar === a ? '#D4AF37' : '#222'}`,
                      background: rivalAvatar === a ? 'rgba(212,175,55,0.1)' : '#111', cursor: 'pointer',
                    }}>{a}</button>
                  ))}
                </div>
                {linkError && <div style={{ fontSize: 12, color: '#FF4141', marginBottom: 10 }}>{linkError}</div>}
                <button onClick={addLiveRival} className="btn-gold" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <Wifi size={14} /> CONNECT RIVAL (LIVE)
                </button>
              </>
            ) : (
              <>
                <div style={{ fontSize: 13, color: '#666', marginBottom: 16, lineHeight: 1.7 }}>
                  Ask your friend to open Arena → <strong style={{ color: '#D4AF37' }}>"Share My Stats"</strong> → copy the link → paste below.
                </div>
                <div className="label-upper" style={{ marginBottom: 8 }}>PASTE THEIR SHARE LINK</div>
                <textarea className="empire-input" value={linkInput} onChange={e => setLinkInput(e.target.value)}
                  placeholder="Paste the full link here..." style={{ height: 100, resize: 'vertical', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }} />
                {linkError && <div style={{ fontSize: 12, color: '#FF4141', marginTop: 8 }}>{linkError}</div>}
                <button onClick={importFromLink} className="btn-gold" style={{ marginTop: 14, width: '100%' }}>IMPORT RIVAL</button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editId && (
        <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setEditId(null); }}>
          <div className="modal-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#D4AF37' }}>UPDATE RIVAL STATS</h3>
              <button onClick={() => setEditId(null)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
              {[
                { key: 'weeklyHabits', label: 'WEEKLY HABITS' },
                { key: 'weeklyEarnings', label: 'WEEKLY EARNINGS ($)' },
                { key: 'goalsCompleted', label: 'GOALS COMPLETED' },
                { key: 'focusHours', label: 'FOCUS HOURS' },
              ].map(f => (
                <div key={f.key}>
                  <div className="label-upper" style={{ marginBottom: 6 }}>{f.label}</div>
                  <input className="empire-input" type="number"
                    value={(editData as Record<string, number>)[f.key] ?? 0}
                    onChange={e => setEditData(prev => ({ ...prev, [f.key]: parseFloat(e.target.value) || 0 }))} />
                </div>
              ))}
            </div>
            <button onClick={() => updateCompetitor(editId, editData)} className="btn-gold" style={{ width: '100%' }}>UPDATE</button>
          </div>
        </div>
      )}

      {/* My stats */}
      <div className="empire-card" style={{ borderColor: 'rgba(212,175,55,0.3)', background: 'linear-gradient(135deg, rgba(212,175,55,0.06), transparent)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: '#D4AF37', letterSpacing: '0.1em', fontWeight: 700 }}>◆ YOUR WEEKLY PERFORMANCE</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {fbReady && <span style={{ fontSize: 10, color: '#00FF87', fontFamily: 'JetBrains Mono, monospace' }}>● BROADCASTING LIVE</span>}
            <button onClick={() => setShowShareModal(true)} className="btn-ghost" style={{ fontSize: 10, display: 'flex', alignItems: 'center', gap: 5, borderColor: 'rgba(212,175,55,0.3)', color: '#D4AF37' }}>
              <Share2 size={11} /> SHARE
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {[
            { label: 'HABITS', value: myWeeklyHabits, color: '#FF6B35' },
            { label: 'REVENUE', value: formatCurrency(myWeeklyEarnings), color: '#00FF87' },
            { label: 'GOALS DONE', value: myGoalsCompleted, color: '#D4AF37' },
            { label: 'FOCUS HRS', value: `${myFocusHours}h`, color: '#00D4FF' },
            { label: 'POINTS', value: me.weeklyPoints, color: '#D4AF37' },
          ].map(s => (
            <div key={s.label} style={{ flex: 1, minWidth: 80, textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: s.color, fontFamily: 'JetBrains Mono, monospace' }}>{s.value}</div>
              <div style={{ fontSize: 9, color: '#555', letterSpacing: '0.08em', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Leaderboard */}
      <div className="empire-card">
        <div style={{ fontSize: 11, color: '#555', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 16 }}>WEEKLY LEADERBOARD</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {allPlayers.map((player, idx) => {
            const points = calcPoints(player);
            const maxPoints = calcPoints(allPlayers[0]);
            const pct = maxPoints > 0 ? (points / maxPoints) * 100 : 0;
            const isLive = !player.isMe && (fbReady && (liveStatuses[player.id] || player.operatorId));
            return (
              <div key={player.id} style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderRadius: 10,
                background: player.isMe ? 'rgba(212,175,55,0.06)' : '#0d0d0d',
                border: `1px solid ${player.isMe ? 'rgba(212,175,55,0.2)' : isLive ? 'rgba(0,255,135,0.15)' : '#1f1f1f'}`,
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                  background: idx < 3 ? `${medalColors[idx]}20` : '#111',
                  border: `2px solid ${idx < 3 ? medalColors[idx] : '#2a2a2a'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: idx === 0 ? 16 : 12, color: idx < 3 ? medalColors[idx] : '#444', fontWeight: 800,
                }}>
                  {idx === 0 ? '👑' : idx + 1}
                </div>
                <div style={{ fontSize: 22 }}>{player.avatar}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: player.isMe ? '#D4AF37' : '#ddd' }}>
                      {player.name.toUpperCase()}
                    </span>
                    {player.isMe && <span style={{ fontSize: 9, color: '#D4AF37', background: 'rgba(212,175,55,0.1)', padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>YOU</span>}
                    {isLive && <span style={{ fontSize: 9, color: '#00FF87', background: 'rgba(0,255,135,0.08)', padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>● LIVE</span>}
                    {player.lastSync && !player.isMe && !isLive && (
                      <span style={{ fontSize: 9, color: '#444', letterSpacing: '0.06em' }}>synced {player.lastSync}</span>
                    )}
                    {player.lastSync && !player.isMe && isLive && (
                      <span style={{ fontSize: 9, color: '#444', letterSpacing: '0.06em' }}>updated {player.lastSync}</span>
                    )}
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{
                      width: `${pct}%`,
                      background: player.isMe
                        ? 'linear-gradient(90deg, #D4AF37, #FFD700)'
                        : isLive ? 'linear-gradient(90deg, #00FF87, #00D4FF)'
                        : idx === 1 ? 'linear-gradient(90deg, #C0C0C0, #e0e0e0)'
                        : 'linear-gradient(90deg, #555, #777)',
                    }} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 20, flexShrink: 0 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#888', fontFamily: 'JetBrains Mono, monospace' }}>{player.weeklyHabits}</div>
                    <div style={{ fontSize: 8, color: '#444', letterSpacing: '0.06em' }}>HABITS</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#00FF87', fontFamily: 'JetBrains Mono, monospace' }}>{formatCurrency(player.weeklyEarnings)}</div>
                    <div style={{ fontSize: 8, color: '#444', letterSpacing: '0.06em' }}>EARNED</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: idx < 3 ? medalColors[idx] : '#888', fontFamily: 'JetBrains Mono, monospace' }}>{points}</div>
                    <div style={{ fontSize: 8, color: '#444', letterSpacing: '0.06em' }}>POINTS</div>
                  </div>
                </div>
                {!player.isMe && (
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    {!player.operatorId && (
                      <button onClick={() => { setEditId(player.id); setEditData({ weeklyHabits: player.weeklyHabits, weeklyEarnings: player.weeklyEarnings, goalsCompleted: player.goalsCompleted, focusHours: player.focusHours }); }}
                        style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer' }} title="Manual edit">
                        <Edit2 size={14} />
                      </button>
                    )}
                    <button onClick={() => deleteCompetitor(player.id)} style={{ background: 'none', border: 'none', color: '#333', cursor: 'pointer' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Chart */}
      {allPlayers.length > 1 && (
        <div className="empire-card">
          <div style={{ fontSize: 11, color: '#555', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 16 }}>HEAD-TO-HEAD — WEEKLY POINTS</div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={allPlayers.map(p => ({ name: p.name.slice(0, 10), points: calcPoints(p), isMe: p.isMe }))} barCategoryGap="25%">
              <XAxis dataKey="name" tick={{ fill: '#555', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip contentStyle={{ background: '#0d0d0d', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [v, 'Points'] as [number, string]} labelStyle={{ color: '#888' }} />
              <Bar dataKey="points" radius={[6, 6, 0, 0]}>
                {allPlayers.map((p, i) => <Cell key={i} fill={p.isMe ? '#D4AF37' : i === 0 ? '#00D4FF' : '#333'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Points system */}
      <div className="empire-card">
        <div style={{ fontSize: 11, color: '#555', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 14 }}>◆ POINTS SYSTEM</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          {[
            { label: 'Habit check-in', value: '10 pts', color: '#FF6B35' },
            { label: '$100 earned', value: '1 pt', color: '#00FF87' },
            { label: 'Goal completed', value: '50 pts', color: '#D4AF37' },
            { label: 'Focus hour', value: '5 pts', color: '#00D4FF' },
          ].map(s => (
            <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#111', borderRadius: 8 }}>
              <span style={{ fontSize: 12, color: '#666' }}>{s.label}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: s.color }}>{s.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
