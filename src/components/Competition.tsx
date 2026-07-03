import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Plus, Trash2, Edit2, X, Share2, Copy, Check, Wifi, WifiOff, Settings, Zap, ChevronDown, ChevronUp, Info, Edit3 } from 'lucide-react';
import type { CompetitorProfile, Habit, EarningEntry, Goal, PomodoroSession, SleepEntry, JournalEntry } from '../types';
import { formatCurrency, uid, today } from '../utils/formatters';
import { useLocalStorage } from '../hooks/useLocalStorage';
import {
  initFirebase, isFirebaseReady, publishProfile, subscribeToOperator,
  type FirebaseConfig,
} from '../lib/firebaseSync';
import { RANKS, getRank, CATEGORIES, calcBreakdown, calcPoints, computeMyStats } from '../lib/points';

const AVATARS = ['⚡', '🔱', '🦅', '🐉', '🏆', '⚔️', '🎯', '💎', '🦁', '🌪️'];
const medalColors = ['#D4AF37', '#C0C0C0', '#CD7F32'];

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
  sleep: SleepEntry[];
  journal: JournalEntry[];
  myName: string;
  onChange: (c: CompetitorProfile[]) => void;
  onUpdateMe: (c: CompetitorProfile) => void;
  onChangeName: (name: string) => void;
}

const BLANK_CONFIG: FirebaseConfig = {
  apiKey: '', authDomain: '', databaseURL: '', projectId: '',
  storageBucket: '', messagingSenderId: '', appId: '',
};

function RivalIntelModal({ rival, onClose, onSave }: { rival: CompetitorProfile; onClose: () => void; onSave: (r: CompetitorProfile) => void }) {
  const [data, setData] = useState<CompetitorProfile>({ ...rival });
  const [newStatLabel, setNewStatLabel] = useState('');
  const [newStatValue, setNewStatValue] = useState('');

  const addCustomStat = () => {
    if (!newStatLabel.trim()) return;
    setData(prev => ({ ...prev, customStats: [...(prev.customStats || []), { label: newStatLabel.trim(), value: newStatValue.trim() }] }));
    setNewStatLabel(''); setNewStatValue('');
  };

  const removeCustomStat = (i: number) => {
    setData(prev => ({ ...prev, customStats: (prev.customStats || []).filter((_, idx) => idx !== i) }));
  };

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box" style={{ maxWidth: 520, maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#D4AF37' }}>
            {data.avatar} RIVAL INTEL — {data.name.toUpperCase()}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer' }}><X size={18} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Identity */}
          <div>
            <div style={{ fontSize: 10, color: '#D4AF37', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 10 }}>◆ IDENTITY</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <div className="label-upper" style={{ marginBottom: 6 }}>Name</div>
                <input className="empire-input" value={data.name} onChange={e => setData(d => ({ ...d, name: e.target.value }))} />
              </div>
              <div>
                <div className="label-upper" style={{ marginBottom: 6 }}>Age</div>
                <input className="empire-input" type="number" value={data.age ?? ''} onChange={e => setData(d => ({ ...d, age: parseInt(e.target.value) || undefined }))} placeholder="—" />
              </div>
              <div>
                <div className="label-upper" style={{ marginBottom: 6 }}>Occupation / Business</div>
                <input className="empire-input" value={data.occupation ?? ''} onChange={e => setData(d => ({ ...d, occupation: e.target.value }))} placeholder="Entrepreneur, dev..." />
              </div>
              <div>
                <div className="label-upper" style={{ marginBottom: 6 }}>Location</div>
                <input className="empire-input" value={data.location ?? ''} onChange={e => setData(d => ({ ...d, location: e.target.value }))} placeholder="City, country..." />
              </div>
              <div>
                <div className="label-upper" style={{ marginBottom: 6 }}>Instagram / Social</div>
                <input className="empire-input" value={data.instagram ?? ''} onChange={e => setData(d => ({ ...d, instagram: e.target.value }))} placeholder="@handle" />
              </div>
              <div>
                <div className="label-upper" style={{ marginBottom: 6 }}>Avatar</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {AVATARS.map(a => (
                    <button key={a} onClick={() => setData(d => ({ ...d, avatar: a }))} style={{ width: 34, height: 34, borderRadius: 8, fontSize: 16, border: `2px solid ${data.avatar === a ? '#D4AF37' : '#1f1f1f'}`, background: data.avatar === a ? 'rgba(212,175,55,0.1)' : '#111', cursor: 'pointer' }}>{a}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Weekly performance */}
          <div>
            <div style={{ fontSize: 10, color: '#00FF87', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 10 }}>◆ WEEKLY PERFORMANCE</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { key: 'weeklyHabits', label: 'WEEKLY HABITS', step: '1' },
                { key: 'weeklyEarnings', label: 'WEEKLY EARNINGS ($)', step: '0.01' },
                { key: 'goalsCompleted', label: 'GOALS COMPLETED', step: '1' },
                { key: 'focusHours', label: 'FOCUS HOURS', step: '0.5' },
                { key: 'weeklyJournals', label: 'JOURNAL ENTRIES', step: '1' },
                { key: 'sleepScore', label: 'AVG SLEEP QUALITY (0-5)', step: '0.1' },
              ].map(f => (
                <div key={f.key}>
                  <div className="label-upper" style={{ marginBottom: 6 }}>{f.label}</div>
                  <input className="empire-input" type="number" step={f.step} value={(data as unknown as Record<string, number>)[f.key] ?? 0} onChange={e => setData(prev => ({ ...prev, [f.key]: parseFloat(e.target.value) || 0 }))} />
                </div>
              ))}
            </div>
          </div>

          {/* Financial intel */}
          <div>
            <div style={{ fontSize: 10, color: '#D4AF37', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 10 }}>◆ FINANCIAL INTEL</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <div className="label-upper" style={{ marginBottom: 6 }}>Monthly Revenue ($)</div>
                <input className="empire-input" type="number" value={data.monthlyRevenue ?? ''} onChange={e => setData(d => ({ ...d, monthlyRevenue: parseFloat(e.target.value) || undefined }))} placeholder="0" />
              </div>
              <div>
                <div className="label-upper" style={{ marginBottom: 6 }}>Monthly Expenses ($)</div>
                <input className="empire-input" type="number" value={data.monthlyExpenses ?? ''} onChange={e => setData(d => ({ ...d, monthlyExpenses: parseFloat(e.target.value) || undefined }))} placeholder="0" />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <div className="label-upper" style={{ marginBottom: 6 }}>Estimated Net Worth ($)</div>
                <input className="empire-input" type="number" value={data.netWorth ?? ''} onChange={e => setData(d => ({ ...d, netWorth: parseFloat(e.target.value) || undefined }))} placeholder="0" />
              </div>
            </div>
          </div>

          {/* Schedule */}
          <div>
            <div style={{ fontSize: 10, color: '#00D4FF', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 10 }}>◆ SCHEDULE & LIFESTYLE</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <div className="label-upper" style={{ marginBottom: 6 }}>Wake Time</div>
                <input className="empire-input" type="time" value={data.wakeTime ?? ''} onChange={e => setData(d => ({ ...d, wakeTime: e.target.value }))} />
              </div>
              <div>
                <div className="label-upper" style={{ marginBottom: 6 }}>Sleep Time</div>
                <input className="empire-input" type="time" value={data.sleepTime ?? ''} onChange={e => setData(d => ({ ...d, sleepTime: e.target.value }))} />
              </div>
              <div>
                <div className="label-upper" style={{ marginBottom: 6 }}>Current Streak (days)</div>
                <input className="empire-input" type="number" value={data.currentStreak ?? ''} onChange={e => setData(d => ({ ...d, currentStreak: parseInt(e.target.value) || undefined }))} placeholder="0" />
              </div>
              <div>
                <div className="label-upper" style={{ marginBottom: 6 }}>All-Time Points</div>
                <input className="empire-input" type="number" value={data.allTimePoints ?? ''} onChange={e => setData(d => ({ ...d, allTimePoints: parseInt(e.target.value) || undefined }))} placeholder="0" />
              </div>
            </div>
          </div>

          {/* Goals & Mindset */}
          <div>
            <div style={{ fontSize: 10, color: '#FF6B35', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 10 }}>◆ MINDSET INTEL</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <div className="label-upper" style={{ marginBottom: 6 }}>Current Goals</div>
                <input className="empire-input" value={data.currentGoals ?? ''} onChange={e => setData(d => ({ ...d, currentGoals: e.target.value }))} placeholder="What are they chasing?" />
              </div>
              <div>
                <div className="label-upper" style={{ marginBottom: 6 }}>Strengths</div>
                <input className="empire-input" value={data.strengths ?? ''} onChange={e => setData(d => ({ ...d, strengths: e.target.value }))} placeholder="Their edge..." />
              </div>
              <div>
                <div className="label-upper" style={{ marginBottom: 6 }}>Weaknesses</div>
                <input className="empire-input" value={data.weaknesses ?? ''} onChange={e => setData(d => ({ ...d, weaknesses: e.target.value }))} placeholder="Where they slip..." />
              </div>
            </div>
          </div>

          {/* Custom stats */}
          <div>
            <div style={{ fontSize: 10, color: '#7B61FF', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 10 }}>◆ CUSTOM INTEL</div>
            {(data.customStats || []).map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                <div style={{ flex: 1, fontSize: 12, color: '#888', background: '#111', padding: '8px 12px', borderRadius: 8 }}>{s.label}</div>
                <div style={{ flex: 1, fontSize: 12, color: '#7B61FF', fontWeight: 700, background: '#111', padding: '8px 12px', borderRadius: 8 }}>{s.value}</div>
                <button onClick={() => removeCustomStat(i)} style={{ background: 'none', border: 'none', color: '#333', cursor: 'pointer' }}><X size={14} /></button>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="empire-input" value={newStatLabel} onChange={e => setNewStatLabel(e.target.value)} placeholder="Stat label..." style={{ flex: 1 }} />
              <input className="empire-input" value={newStatValue} onChange={e => setNewStatValue(e.target.value)} placeholder="Value..." style={{ flex: 1 }} />
              <button onClick={addCustomStat} style={{ padding: '8px 12px', background: 'rgba(123,97,255,0.15)', border: '1px solid #7B61FF', borderRadius: 8, color: '#7B61FF', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>+ ADD</button>
            </div>
          </div>

          {/* Notes */}
          <div>
            <div className="label-upper" style={{ marginBottom: 6 }}>INTEL NOTES</div>
            <textarea
              className="empire-input"
              value={data.notes ?? ''}
              onChange={e => setData(d => ({ ...d, notes: e.target.value }))}
              placeholder="Observations, context, threats, patterns..."
              style={{ resize: 'vertical', minHeight: 80, fontFamily: 'inherit' }}
            />
          </div>

          <button onClick={() => { onSave(data); onClose(); }} className="btn-gold">SAVE INTEL</button>
        </div>
      </div>
    </div>
  );
}

export default function Competition({ competitors, habits, earnings, goals, pomodoro, sleep, journal, myName, onChange, onChangeName }: Props) {
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
  const [intelRival, setIntelRival] = useState<CompetitorProfile | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showRename, setShowRename] = useState(false);
  const [renameInput, setRenameInput] = useState('');
  const unsubRefs = useRef<Record<string, () => void>>({});

  const {
    weeklyHabits: myWeeklyHabits, weeklyEarnings: myWeeklyEarnings,
    goalsCompleted: myGoalsCompleted, focusHours: myFocusHours,
    weeklyJournals: myWeeklyJournals, sleepScore: mySleepScore,
  } = computeMyStats(habits, earnings, goals, pomodoro, sleep, journal);

  const me: CompetitorProfile = {
    id: operatorId, name: myName || 'YOU', avatar: '🔱',
    weeklyHabits: myWeeklyHabits, weeklyEarnings: myWeeklyEarnings,
    goalsCompleted: myGoalsCompleted, focusHours: myFocusHours,
    weeklyJournals: myWeeklyJournals, sleepScore: mySleepScore,
    weeklyPoints: 0, achievements: [], isMe: true, lastSync: today(),
  };
  me.weeklyPoints = calcPoints(me);

  useEffect(() => {
    if (fbConfig.databaseURL) {
      const ok = initFirebase(fbConfig);
      setFbReady(ok);
    }
  }, []);

  useEffect(() => {
    if (!fbReady || !isFirebaseReady()) return;
    publishProfile(operatorId, me).catch(() => {});
  }, [fbReady, myWeeklyHabits, myWeeklyEarnings, myGoalsCompleted, myFocusHours, myWeeklyJournals, mySleepScore]);

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
    if (!rivalOpId.trim()) { setLinkError("Enter your friend's Operator ID."); return; }
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

  const saveRival = (updated: CompetitorProfile) => {
    onChange(competitors.map(c => c.id === updated.id ? { ...updated, weeklyPoints: calcPoints(updated) } : c));
  };

  const handleRename = () => {
    if (!renameInput.trim()) return;
    onChangeName(renameInput.trim().toUpperCase());
    setShowRename(false);
    setRenameInput('');
  };

  const allPlayers = [me, ...competitors].sort((a, b) => calcPoints(b) - calcPoints(a));
  const myPoints = calcPoints(me);
  const myRank = getRank(myPoints);
  const myBreakdown = calcBreakdown(me);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }} className="animate-fade-up">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: 11, color: '#555', letterSpacing: '0.12em', marginBottom: 4, fontFamily: 'JetBrains Mono, monospace' }}>COMPETITIVE INTELLIGENCE</div>
          <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0, color: '#fff' }}>THE ARENA</h1>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => setShowFbSetup(true)} className="btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: 6 }} title="Live sync settings">
            {fbReady ? <><Wifi size={13} color="#00FF87" /> <span style={{ color: '#00FF87' }}>LIVE</span></> : <><WifiOff size={13} /> SETUP LIVE</>}
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
              Your stats broadcast automatically. Add rivals by their <strong style={{ color: '#ccc' }}>Operator ID</strong> and their stats update in real-time.
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
                Connect Firebase (free) to see rival stats update live. Or use share links for offline mode.
              </div>
            </div>
          </div>
          <button onClick={() => setShowFbSetup(true)} className="btn-gold" style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Settings size={13} /> CONNECT
          </button>
        </div>
      )}

      {/* Rename modal */}
      {showRename && (
        <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setShowRename(false); }}>
          <div className="modal-box" style={{ maxWidth: 360 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#D4AF37' }}>CHANGE CALLSIGN</h3>
              <button onClick={() => setShowRename(false)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div className="label-upper" style={{ marginBottom: 8 }}>New Callsign</div>
            <input
              className="empire-input"
              value={renameInput}
              onChange={e => setRenameInput(e.target.value)}
              placeholder={myName || 'Enter name...'}
              onKeyDown={e => e.key === 'Enter' && handleRename()}
              autoFocus
              style={{ marginBottom: 14 }}
            />
            <button onClick={handleRename} className="btn-gold" style={{ width: '100%' }}>CONFIRM</button>
          </div>
        </div>
      )}

      {/* Firebase setup modal */}
      {showFbSetup && (
        <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setShowFbSetup(false); }}>
          <div className="modal-box" style={{ maxWidth: 520 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#D4AF37' }}>LIVE SYNC SETUP</h3>
              <button onClick={() => setShowFbSetup(false)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div style={{ fontSize: 12, color: '#555', marginBottom: 18, lineHeight: 1.8 }}>
              Create a free Firebase project:<br />
              1. Go to <strong style={{ color: '#D4AF37' }}>console.firebase.google.com</strong> → Add project<br />
              2. Build → Realtime Database → Create database (test mode)<br />
              3. Project Settings → Your apps → Add web app → copy config<br />
              4. Paste each field below and click Connect.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
              {(Object.keys(BLANK_CONFIG) as Array<keyof FirebaseConfig>).map(key => (
                <div key={key}>
                  <div className="label-upper" style={{ marginBottom: 6 }}>{key}</div>
                  <input className="empire-input" value={configDraft[key]} onChange={e => setConfigDraft(prev => ({ ...prev, [key]: e.target.value }))} placeholder={key === 'databaseURL' ? 'https://xxx.firebaseio.com' : `Your ${key}`} style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }} />
                </div>
              ))}
            </div>
            {fbError && <div style={{ fontSize: 12, color: '#FF4141', marginBottom: 10 }}>{fbError}</div>}
            <button onClick={saveFirebaseConfig} className="btn-gold" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Wifi size={14} /> CONNECT & GO LIVE
            </button>
            {fbReady && (
              <button onClick={() => { setFbConfig(BLANK_CONFIG); setFbReady(false); setShowFbSetup(false); }} style={{ marginTop: 10, width: '100%', padding: '8px', background: 'none', border: '1px solid #2a2a2a', borderRadius: 8, color: '#555', cursor: 'pointer', fontSize: 12 }}>
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
            {fbReady && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: '#00FF87', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 10 }}>● LIVE MODE — OPERATOR ID</div>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 10, lineHeight: 1.7 }}>
                  Give your friend this ID. Their app will sync your stats in real-time automatically.
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ flex: 1, background: '#0d0d0d', border: '1px solid rgba(0,255,135,0.2)', borderRadius: 8, padding: '12px 14px', fontSize: 12, color: '#00FF87', fontFamily: 'JetBrains Mono, monospace', wordBreak: 'break-all' }}>{operatorId}</div>
                  <button onClick={copyOpId} className="btn-gold" style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {copiedOpId ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            )}
            <div style={{ background: '#111', borderRadius: 10, padding: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 10, color: '#555', letterSpacing: '0.1em', marginBottom: 12 }}>YOUR CURRENT STATS</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  { label: 'Weekly Habits', value: myWeeklyHabits },
                  { label: 'Weekly Earnings', value: formatCurrency(myWeeklyEarnings) },
                  { label: 'Goals Completed', value: myGoalsCompleted },
                  { label: 'Focus Hours', value: `${myFocusHours}h` },
                  { label: 'Journal Entries', value: myWeeklyJournals },
                  { label: 'Avg Sleep Quality', value: mySleepScore > 0 ? `${mySleepScore.toFixed(1)}/5` : '—' },
                  { label: 'Total Points', value: myPoints },
                  { label: 'Rank', value: `${myRank.icon} ${myRank.label}` },
                ].map(s => (
                  <div key={s.label}>
                    <div style={{ fontSize: 10, color: '#555' }}>{s.label}</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#D4AF37', fontFamily: 'JetBrains Mono, monospace' }}>{s.value}</div>
                  </div>
                ))}
              </div>
            </div>
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
            <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#0d0d0d', padding: 4, borderRadius: 10 }}>
              {fbReady && (
                <button onClick={() => setAddMode('live')} style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', background: addMode === 'live' ? 'rgba(0,255,135,0.12)' : 'transparent', color: addMode === 'live' ? '#00FF87' : '#555' }}>
                  ● LIVE (OPERATOR ID)
                </button>
              )}
              <button onClick={() => setAddMode('link')} style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', background: addMode === 'link' ? 'rgba(212,175,55,0.1)' : 'transparent', color: addMode === 'link' ? '#D4AF37' : '#555' }}>
                ⚡ SHARE LINK
              </button>
            </div>
            {addMode === 'live' && fbReady ? (
              <>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 16, lineHeight: 1.7 }}>
                  Ask your friend for their <strong style={{ color: '#00FF87' }}>Operator ID</strong> (found in Arena → Share). Their stats sync live automatically.
                </div>
                <div className="label-upper" style={{ marginBottom: 6 }}>RIVAL'S OPERATOR ID</div>
                <input className="empire-input" value={rivalOpId} onChange={e => setRivalOpId(e.target.value)} placeholder="Paste Operator ID..." style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, marginBottom: 12 }} />
                <div className="label-upper" style={{ marginBottom: 6 }}>RIVAL NAME</div>
                <input className="empire-input" value={rivalName} onChange={e => setRivalName(e.target.value)} placeholder="e.g. ALEX" style={{ marginBottom: 12 }} />
                <div className="label-upper" style={{ marginBottom: 8 }}>AVATAR</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                  {AVATARS.map(a => (
                    <button key={a} onClick={() => setRivalAvatar(a)} style={{ width: 40, height: 40, borderRadius: 8, fontSize: 20, border: `2px solid ${rivalAvatar === a ? '#D4AF37' : '#222'}`, background: rivalAvatar === a ? 'rgba(212,175,55,0.1)' : '#111', cursor: 'pointer' }}>{a}</button>
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
                  Ask your friend to open Arena → <strong style={{ color: '#D4AF37' }}>"Share"</strong> → copy the link → paste below.
                </div>
                <div className="label-upper" style={{ marginBottom: 8 }}>PASTE THEIR SHARE LINK</div>
                <textarea className="empire-input" value={linkInput} onChange={e => setLinkInput(e.target.value)} placeholder="Paste the full link here..." style={{ height: 100, resize: 'vertical', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }} />
                {linkError && <div style={{ fontSize: 12, color: '#FF4141', marginTop: 8 }}>{linkError}</div>}
                <button onClick={importFromLink} className="btn-gold" style={{ marginTop: 14, width: '100%' }}>IMPORT RIVAL</button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Edit stats modal */}
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
                { key: 'weeklyJournals', label: 'JOURNAL ENTRIES' },
                { key: 'sleepScore', label: 'AVG SLEEP QUALITY (0-5)' },
              ].map(f => (
                <div key={f.key}>
                  <div className="label-upper" style={{ marginBottom: 6 }}>{f.label}</div>
                  <input className="empire-input" type="number" value={(editData as Record<string, number>)[f.key] ?? 0} onChange={e => setEditData(prev => ({ ...prev, [f.key]: parseFloat(e.target.value) || 0 }))} />
                </div>
              ))}
            </div>
            <button onClick={() => updateCompetitor(editId, editData)} className="btn-gold" style={{ width: '100%' }}>UPDATE</button>
          </div>
        </div>
      )}

      {/* Rival Intel Modal */}
      {intelRival && (
        <RivalIntelModal
          rival={intelRival}
          onClose={() => setIntelRival(null)}
          onSave={updated => { saveRival(updated); setIntelRival(null); }}
        />
      )}

      {/* My Command Card */}
      <div className="empire-card" style={{ borderColor: `${myRank.color}40`, background: `linear-gradient(135deg, ${myRank.color}08, transparent)` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <div style={{ fontSize: 11, color: myRank.color, letterSpacing: '0.1em', fontWeight: 700 }}>◆ YOUR COMMAND STATION</div>
              {fbReady && <span style={{ fontSize: 10, color: '#00FF87', fontFamily: 'JetBrains Mono, monospace' }}>● BROADCASTING LIVE</span>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: 24 }}>🔱</div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: '0.04em' }}>{myName || 'YOU'}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                  <span style={{ fontSize: 11, color: myRank.color, fontWeight: 700 }}>{myRank.icon} {myRank.label}</span>
                  <span style={{ fontSize: 10, color: '#444' }}>·</span>
                  <span style={{ fontSize: 20, fontWeight: 900, color: myRank.color, fontFamily: 'JetBrains Mono, monospace' }}>{myPoints}</span>
                  <span style={{ fontSize: 10, color: '#555' }}>PTS THIS WEEK</span>
                </div>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => { setRenameInput(myName); setShowRename(true); }} className="btn-ghost" style={{ fontSize: 10, display: 'flex', alignItems: 'center', gap: 5, borderColor: 'rgba(212,175,55,0.3)', color: '#D4AF37' }}>
              <Edit3 size={11} /> CALLSIGN
            </button>
            <button onClick={() => setShowShareModal(true)} className="btn-ghost" style={{ fontSize: 10, display: 'flex', alignItems: 'center', gap: 5, borderColor: 'rgba(212,175,55,0.3)', color: '#D4AF37' }}>
              <Share2 size={11} /> SHARE
            </button>
          </div>
        </div>

        {/* 6-category breakdown */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
          {CATEGORIES.map(cat => {
            const pts = myBreakdown[cat.key];
            return (
              <div key={cat.key} style={{ background: `${cat.color}10`, border: `1px solid ${cat.color}25`, borderRadius: 10, padding: '10px 8px', textAlign: 'center' }}>
                <div style={{ fontSize: 16, marginBottom: 4 }}>{cat.icon}</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: cat.color, fontFamily: 'JetBrains Mono, monospace' }}>{pts}</div>
                <div style={{ fontSize: 8, color: '#444', letterSpacing: '0.06em', marginTop: 3 }}>{cat.label}</div>
              </div>
            );
          })}
        </div>

        {/* Rank progression */}
        {(() => {
          const currentRankIdx = RANKS.findIndex(r => r.label === myRank.label);
          const nextRank = RANKS[currentRankIdx + 1];
          if (!nextRank) return (
            <div style={{ marginTop: 12, textAlign: 'center', fontSize: 12, color: '#D4AF37', fontWeight: 700, letterSpacing: '0.08em' }}>
              👑 MAXIMUM RANK ACHIEVED — EMPEROR
            </div>
          );
          const progress = ((myPoints - myRank.min) / (nextRank.min - myRank.min)) * 100;
          return (
            <div style={{ marginTop: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 10, color: '#555' }}>{myRank.icon} {myRank.label}</span>
                <span style={{ fontSize: 10, color: '#555' }}>{nextRank.min - myPoints} pts to {nextRank.icon} {nextRank.label}</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${Math.min(progress, 100)}%`, background: `linear-gradient(90deg, ${myRank.color}, ${nextRank.color})` }} />
              </div>
            </div>
          );
        })()}
      </div>

      {/* Leaderboard */}
      <div className="empire-card">
        <div style={{ fontSize: 11, color: '#555', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 16 }}>⚔ ARENA LEADERBOARD</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {allPlayers.map((player, idx) => {
            const points = calcPoints(player);
            const breakdown = calcBreakdown(player);
            const maxPoints = calcPoints(allPlayers[0]);
            const pct = maxPoints > 0 ? (points / maxPoints) * 100 : 0;
            const rank = getRank(points);
            const isLive = !player.isMe && fbReady && (liveStatuses[player.id] || !!player.operatorId);
            const isExpanded = expandedId === player.id;
            const rival = competitors.find(c => c.id === player.id);

            return (
              <div key={player.id}>
                <div style={{
                  borderRadius: isExpanded ? '10px 10px 0 0' : 10,
                  background: player.isMe ? `${rank.color}08` : '#0d0d0d',
                  border: `1px solid ${player.isMe ? `${rank.color}30` : isLive ? 'rgba(0,255,135,0.15)' : '#1f1f1f'}`,
                  borderBottom: isExpanded ? 'none' : undefined,
                  overflow: 'hidden',
                }}>
                  {/* Card header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' }}>
                    {/* Position */}
                    <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, background: idx < 3 ? `${medalColors[idx]}20` : '#111', border: `2px solid ${idx < 3 ? medalColors[idx] : '#2a2a2a'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: idx === 0 ? 16 : 12, color: idx < 3 ? medalColors[idx] : '#444', fontWeight: 800 }}>
                      {idx === 0 ? '👑' : idx + 1}
                    </div>

                    {/* Avatar */}
                    <div style={{ fontSize: 24, flexShrink: 0 }}>{player.avatar}</div>

                    {/* Name + rank + badges */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                        <span style={{ fontSize: 14, fontWeight: 800, color: player.isMe ? rank.color : '#ddd' }}>{player.name.toUpperCase()}</span>
                        <span style={{ fontSize: 10, color: rank.color, background: `${rank.color}15`, padding: '2px 8px', borderRadius: 20, fontWeight: 700, border: `1px solid ${rank.color}30` }}>{rank.icon} {rank.label}</span>
                        {player.isMe && <span style={{ fontSize: 9, color: '#D4AF37', background: 'rgba(212,175,55,0.1)', padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>YOU</span>}
                        {isLive && <span style={{ fontSize: 9, color: '#00FF87', background: 'rgba(0,255,135,0.08)', padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>● LIVE</span>}
                        {rival?.occupation && <span style={{ fontSize: 10, color: '#555' }}>{rival.occupation}</span>}
                      </div>
                      <div className="progress-track" style={{ height: 4 }}>
                        <div className="progress-fill" style={{ width: `${pct}%`, background: player.isMe ? `linear-gradient(90deg, ${rank.color}, ${rank.color}aa)` : isLive ? 'linear-gradient(90deg, #00FF87, #00D4FF)' : idx === 1 ? 'linear-gradient(90deg, #C0C0C0, #e0e0e0)' : 'linear-gradient(90deg, #555, #777)' }} />
                      </div>
                    </div>

                    {/* Total points */}
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 22, fontWeight: 900, color: idx < 3 ? medalColors[idx] : '#888', fontFamily: 'JetBrains Mono, monospace' }}>{points}</div>
                      <div style={{ fontSize: 8, color: '#444', letterSpacing: '0.06em' }}>TOTAL PTS</div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      {!player.isMe && (
                        <>
                          <button onClick={() => rival && setIntelRival({ ...rival })} title="Rival Intel" style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer' }}><Info size={14} /></button>
                          {!player.operatorId && (
                            <button onClick={() => { setEditId(player.id); setEditData({ weeklyHabits: player.weeklyHabits, weeklyEarnings: player.weeklyEarnings, goalsCompleted: player.goalsCompleted, focusHours: player.focusHours, weeklyJournals: player.weeklyJournals, sleepScore: player.sleepScore }); }} title="Edit stats" style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer' }}>
                              <Edit2 size={14} />
                            </button>
                          )}
                          <button onClick={() => deleteCompetitor(player.id)} style={{ background: 'none', border: 'none', color: '#333', cursor: 'pointer' }}><Trash2 size={14} /></button>
                        </>
                      )}
                      <button onClick={() => setExpandedId(isExpanded ? null : player.id)} style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer' }}>
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    </div>
                  </div>

                  {/* Category breakdown row */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', borderTop: '1px solid #111', padding: '8px 16px', gap: 4 }}>
                    {CATEGORIES.map(cat => {
                      const pts = breakdown[cat.key];
                      return (
                        <div key={cat.key} style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 11, marginBottom: 1 }}>{cat.icon}</div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: pts > 0 ? cat.color : '#333', fontFamily: 'JetBrains Mono, monospace' }}>{pts}</div>
                          <div style={{ fontSize: 7, color: '#444', letterSpacing: '0.04em' }}>{cat.label}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Expanded dossier */}
                {isExpanded && rival && (
                  <div style={{ background: '#080808', border: '1px solid #1f1f1f', borderTop: 'none', borderRadius: '0 0 10px 10px', padding: '16px 18px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 12 }}>
                      {rival.age !== undefined && (
                        <div style={{ background: '#111', borderRadius: 8, padding: '10px 12px' }}>
                          <div style={{ fontSize: 9, color: '#444', letterSpacing: '0.1em', marginBottom: 4 }}>AGE</div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: '#ddd' }}>{rival.age}</div>
                        </div>
                      )}
                      {rival.location && (
                        <div style={{ background: '#111', borderRadius: 8, padding: '10px 12px' }}>
                          <div style={{ fontSize: 9, color: '#444', letterSpacing: '0.1em', marginBottom: 4 }}>LOCATION</div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#ddd' }}>{rival.location}</div>
                        </div>
                      )}
                      {rival.instagram && (
                        <div style={{ background: '#111', borderRadius: 8, padding: '10px 12px' }}>
                          <div style={{ fontSize: 9, color: '#444', letterSpacing: '0.1em', marginBottom: 4 }}>SOCIAL</div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#7B61FF' }}>{rival.instagram}</div>
                        </div>
                      )}
                      {rival.monthlyRevenue !== undefined && rival.monthlyRevenue > 0 && (
                        <div style={{ background: '#111', borderRadius: 8, padding: '10px 12px' }}>
                          <div style={{ fontSize: 9, color: '#444', letterSpacing: '0.1em', marginBottom: 4 }}>MONTHLY REVENUE</div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: '#00FF87', fontFamily: 'JetBrains Mono, monospace' }}>{formatCurrency(rival.monthlyRevenue)}</div>
                        </div>
                      )}
                      {rival.monthlyExpenses !== undefined && rival.monthlyExpenses > 0 && (
                        <div style={{ background: '#111', borderRadius: 8, padding: '10px 12px' }}>
                          <div style={{ fontSize: 9, color: '#444', letterSpacing: '0.1em', marginBottom: 4 }}>MONTHLY EXPENSES</div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: '#FF6B35', fontFamily: 'JetBrains Mono, monospace' }}>{formatCurrency(rival.monthlyExpenses)}</div>
                        </div>
                      )}
                      {rival.netWorth !== undefined && rival.netWorth > 0 && (
                        <div style={{ background: '#111', borderRadius: 8, padding: '10px 12px' }}>
                          <div style={{ fontSize: 9, color: '#444', letterSpacing: '0.1em', marginBottom: 4 }}>NET WORTH</div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: '#D4AF37', fontFamily: 'JetBrains Mono, monospace' }}>{formatCurrency(rival.netWorth)}</div>
                        </div>
                      )}
                      {rival.currentStreak !== undefined && rival.currentStreak > 0 && (
                        <div style={{ background: '#111', borderRadius: 8, padding: '10px 12px' }}>
                          <div style={{ fontSize: 9, color: '#444', letterSpacing: '0.1em', marginBottom: 4 }}>STREAK</div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: '#FF6B35' }}>🔥 {rival.currentStreak}d</div>
                        </div>
                      )}
                      {rival.wakeTime && (
                        <div style={{ background: '#111', borderRadius: 8, padding: '10px 12px' }}>
                          <div style={{ fontSize: 9, color: '#444', letterSpacing: '0.1em', marginBottom: 4 }}>WAKE TIME</div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: '#00D4FF' }}>{rival.wakeTime}</div>
                        </div>
                      )}
                      {rival.sleepTime && (
                        <div style={{ background: '#111', borderRadius: 8, padding: '10px 12px' }}>
                          <div style={{ fontSize: 9, color: '#444', letterSpacing: '0.1em', marginBottom: 4 }}>SLEEP TIME</div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: '#7B61FF' }}>{rival.sleepTime}</div>
                        </div>
                      )}
                      {rival.allTimePoints !== undefined && rival.allTimePoints > 0 && (
                        <div style={{ background: '#111', borderRadius: 8, padding: '10px 12px' }}>
                          <div style={{ fontSize: 9, color: '#444', letterSpacing: '0.1em', marginBottom: 4 }}>ALL-TIME PTS</div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: '#D4AF37', fontFamily: 'JetBrains Mono, monospace' }}>{rival.allTimePoints.toLocaleString()}</div>
                        </div>
                      )}
                      {(rival.customStats || []).map((s, i) => (
                        <div key={i} style={{ background: '#111', borderRadius: 8, padding: '10px 12px' }}>
                          <div style={{ fontSize: 9, color: '#444', letterSpacing: '0.1em', marginBottom: 4 }}>{s.label.toUpperCase()}</div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: '#ddd' }}>{s.value}</div>
                        </div>
                      ))}
                    </div>
                    {rival.currentGoals && (
                      <div style={{ background: '#111', borderRadius: 8, padding: '12px', marginBottom: 10 }}>
                        <div style={{ fontSize: 9, color: '#FF6B35', letterSpacing: '0.1em', marginBottom: 6 }}>CURRENT GOALS</div>
                        <div style={{ fontSize: 12, color: '#888', lineHeight: 1.6 }}>{rival.currentGoals}</div>
                      </div>
                    )}
                    {(rival.strengths || rival.weaknesses) && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                        {rival.strengths && (
                          <div style={{ background: 'rgba(0,255,135,0.05)', border: '1px solid rgba(0,255,135,0.12)', borderRadius: 8, padding: '10px 12px' }}>
                            <div style={{ fontSize: 9, color: '#00FF87', letterSpacing: '0.1em', marginBottom: 6 }}>STRENGTHS</div>
                            <div style={{ fontSize: 11, color: '#888', lineHeight: 1.6 }}>{rival.strengths}</div>
                          </div>
                        )}
                        {rival.weaknesses && (
                          <div style={{ background: 'rgba(255,65,65,0.05)', border: '1px solid rgba(255,65,65,0.12)', borderRadius: 8, padding: '10px 12px' }}>
                            <div style={{ fontSize: 9, color: '#FF4141', letterSpacing: '0.1em', marginBottom: 6 }}>WEAKNESSES</div>
                            <div style={{ fontSize: 11, color: '#888', lineHeight: 1.6 }}>{rival.weaknesses}</div>
                          </div>
                        )}
                      </div>
                    )}
                    {rival.notes && (
                      <div style={{ background: '#111', borderRadius: 8, padding: '12px', marginBottom: 12 }}>
                        <div style={{ fontSize: 9, color: '#444', letterSpacing: '0.1em', marginBottom: 6 }}>INTEL NOTES</div>
                        <div style={{ fontSize: 12, color: '#888', lineHeight: 1.6 }}>{rival.notes}</div>
                      </div>
                    )}
                    {!rival.age && !rival.location && !rival.instagram && !rival.monthlyRevenue && !rival.notes && !rival.currentGoals && (rival.customStats || []).length === 0 && (
                      <div style={{ fontSize: 12, color: '#333', fontStyle: 'italic', marginBottom: 10 }}>No intel filed yet.</div>
                    )}
                    <button onClick={() => setIntelRival({ ...rival })} style={{ fontSize: 11, color: '#D4AF37', background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontWeight: 700, letterSpacing: '0.06em' }}>
                      ✎ EDIT INTEL
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Category Domination */}
      {allPlayers.length > 1 && (
        <div className="empire-card">
          <div style={{ fontSize: 11, color: '#555', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 14 }}>🏆 CATEGORY DOMINATION — WHO OWNS EACH ARENA</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {CATEGORIES.map(cat => {
              const winner = allPlayers.reduce((best, p) => {
                const pts = calcBreakdown(p)[cat.key];
                const bestPts = calcBreakdown(best)[cat.key];
                return pts > bestPts ? p : best;
              }, allPlayers[0]);
              const winnerPts = calcBreakdown(winner)[cat.key];
              const secondPts = allPlayers
                .filter(p => p.id !== winner.id)
                .reduce((max, p) => Math.max(max, calcBreakdown(p)[cat.key]), 0);
              const gap = winnerPts - secondPts;

              return (
                <div key={cat.key} style={{ background: `${cat.color}08`, border: `1px solid ${cat.color}20`, borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                    <span style={{ fontSize: 16 }}>{cat.icon}</span>
                    <span style={{ fontSize: 9, color: cat.color, letterSpacing: '0.1em', fontWeight: 700 }}>{cat.label}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 18 }}>{winner.avatar}</span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: winner.isMe ? cat.color : '#ddd' }}>{winner.name.slice(0, 12)}</div>
                      <div style={{ fontSize: 16, fontWeight: 900, color: cat.color, fontFamily: 'JetBrains Mono, monospace' }}>{winnerPts} pts</div>
                    </div>
                  </div>
                  {gap > 0 && allPlayers.length > 1 && (
                    <div style={{ fontSize: 10, color: '#444' }}>+{gap} ahead</div>
                  )}
                  {winnerPts === 0 && (
                    <div style={{ fontSize: 10, color: '#333', fontStyle: 'italic' }}>No activity yet</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Head-to-head chart */}
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

      {/* Points system + Rank tiers */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="empire-card">
          <div style={{ fontSize: 11, color: '#555', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 14 }}>◆ POINTS FORMULA</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              { label: 'Habit check-in', value: '×10 pts', color: '#FF6B35', icon: '🏃' },
              { label: '$100 earned', value: '×1 pt', color: '#00FF87', icon: '💰' },
              { label: 'Goal completed', value: '×50 pts', color: '#D4AF37', icon: '🎯' },
              { label: 'Focus hour', value: '×5 pts', color: '#00D4FF', icon: '⏱' },
              { label: 'Sleep quality (avg)', value: '×15 pts', color: '#7B61FF', icon: '🌙' },
              { label: 'Journal entry', value: '×15 pts', color: '#FF4141', icon: '📓' },
            ].map(s => (
              <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#111', borderRadius: 8 }}>
                <span style={{ fontSize: 11, color: '#666' }}>{s.icon} {s.label}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: s.color, fontFamily: 'JetBrains Mono, monospace' }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="empire-card">
          <div style={{ fontSize: 11, color: '#555', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 14 }}>◆ RANK TIERS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {RANKS.map(r => {
              const isActive = myRank.label === r.label;
              return (
                <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: isActive ? `${r.color}15` : '#111', borderRadius: 8, border: `1px solid ${isActive ? `${r.color}40` : 'transparent'}` }}>
                  <span style={{ fontSize: 11, color: isActive ? r.color : '#555', fontWeight: isActive ? 700 : 400 }}>{r.icon} {r.label}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: isActive ? r.color : '#333', fontFamily: 'JetBrains Mono, monospace' }}>{r.min}+ pts</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ padding: '10px 14px', background: '#0a0a0a', borderRadius: 8, fontSize: 11, color: '#444', lineHeight: 1.6, border: '1px solid #111' }}>
        💡 Sleep quality auto-syncs from your Sleep Lab · Journal score from your journal entries · Use ℹ to file rival intel · Click ∨ to expand their full dossier
      </div>
    </div>
  );
}
