import React, { useState, useEffect, useMemo } from 'react';
import { Download, Sparkles } from 'lucide-react';
import type {
  Habit, EarningEntry, SleepEntry, JournalEntry, PomodoroSession, WrappedRecord,
} from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { formatCurrency } from '../utils/formatters';
import { getRank } from '../lib/points';
import { compileMissing, currentWeekSoFar } from '../lib/wrapped';

interface Props {
  habits: Habit[];
  earnings: EarningEntry[];
  sleep: SleepEntry[];
  journal: JournalEntry[];
  pomodoro: PomodoroSession[];
  userName: string;
}

const KIND_TAG: Record<WrappedRecord['kind'], { label: string; color: string }> = {
  weekly: { label: 'WEEKLY', color: '#D4AF37' },
  monthly: { label: 'MONTHLY', color: '#00D4FF' },
  yearly: { label: 'YEARLY', color: '#FF4141' },
};

interface CardData {
  label: string;
  kindTag: { label: string; color: string };
  stats: WrappedRecord['stats'];
  points: number;
  live?: boolean;
}

function WrappedCard({ data, userName }: { data: CardData; userName: string }) {
  const rank = getRank(data.points);
  const statRows = [
    { label: 'EARNED', value: formatCurrency(data.stats.earnings), color: '#00FF87' },
    { label: 'HABITS CRUSHED', value: String(data.stats.habitCompletions), color: '#FF6B35' },
    { label: 'FOCUS HOURS', value: `${data.stats.focusHours}H`, color: '#00D4FF' },
    { label: 'JOURNAL ENTRIES', value: String(data.stats.journalEntries), color: '#FF4141' },
    { label: 'SLEEP QUALITY', value: data.stats.sleepScore > 0 ? `${data.stats.sleepScore.toFixed(1)}/5` : '—', color: '#7B61FF' },
    { label: 'ACTIVE DAYS', value: String(data.stats.activeDays), color: '#D4AF37' },
  ];

  return (
    <div
      style={{
        maxWidth: 400, margin: '0 auto', borderRadius: 20, overflow: 'hidden',
        border: '1px solid rgba(212,175,55,0.4)',
        background: 'linear-gradient(165deg, #14100a 0%, #050505 45%, #0a0708 100%)',
        boxShadow: '0 0 50px rgba(212,175,55,0.12), 0 24px 60px rgba(0,0,0,0.7)',
        padding: '28px 26px',
        position: 'relative',
      }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, transparent, #D4AF37, transparent)' }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ fontSize: 11, letterSpacing: '0.22em', color: '#D4AF37', fontWeight: 800, fontFamily: 'JetBrains Mono, monospace' }}>⚡ EMPIRE WRAPPED</span>
        <span style={{ fontSize: 9, letterSpacing: '0.14em', color: data.kindTag.color, fontWeight: 800, border: `1px solid ${data.kindTag.color}40`, background: `${data.kindTag.color}12`, padding: '3px 9px', borderRadius: 20 }}>
          {data.live ? 'LIVE' : data.kindTag.label}
        </span>
      </div>
      <div style={{ fontSize: 11, color: '#555', letterSpacing: '0.1em', fontFamily: 'JetBrains Mono, monospace', marginBottom: 24 }}>
        {data.label}{data.live ? ' — IN PROGRESS' : ''}
      </div>

      {/* Big points + rank */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{
          fontSize: 64, fontWeight: 900, lineHeight: 1, fontFamily: 'JetBrains Mono, monospace',
          background: 'linear-gradient(135deg, #FFD700, #D4AF37 60%, #8a6d1f)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          filter: 'drop-shadow(0 0 18px rgba(212,175,55,0.35))',
        }}>
          {data.points.toLocaleString()}
        </div>
        <div style={{ fontSize: 10, color: '#555', letterSpacing: '0.2em', marginTop: 6 }}>EMPIRE POINTS</div>
        <div style={{ display: 'inline-block', marginTop: 12, fontSize: 13, fontWeight: 800, color: rank.color, border: `1px solid ${rank.color}45`, background: `${rank.color}12`, padding: '6px 18px', borderRadius: 22, letterSpacing: '0.1em' }}>
          {rank.icon} {rank.label}
        </div>
      </div>

      {/* Stat grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: data.stats.biggestWin ? 18 : 8 }}>
        {statRows.map(s => (
          <div key={s.label} style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid #191919', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: s.color, fontFamily: 'JetBrains Mono, monospace' }}>{s.value}</div>
            <div style={{ fontSize: 8.5, color: '#555', letterSpacing: '0.12em', marginTop: 3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {data.stats.biggestWin && (
        <div style={{ background: 'rgba(0,255,135,0.05)', border: '1px solid rgba(0,255,135,0.18)', borderRadius: 10, padding: '10px 14px', marginBottom: 8 }}>
          <div style={{ fontSize: 8.5, color: '#00FF87', letterSpacing: '0.14em', marginBottom: 3 }}>💰 BIGGEST WIN</div>
          <div style={{ fontSize: 13, color: '#ccc', fontWeight: 700 }}>
            {formatCurrency(data.stats.biggestWin.amount)} <span style={{ color: '#555', fontWeight: 400 }}>— {data.stats.biggestWin.source}</span>
          </div>
        </div>
      )}

      <div style={{ textAlign: 'center', marginTop: 16, fontSize: 9, color: '#3a3a3a', letterSpacing: '0.2em', fontFamily: 'JetBrains Mono, monospace' }}>
        {(userName || 'OPERATOR').toUpperCase()} · EMPIRE OS
      </div>
    </div>
  );
}

// Draw the card as a 1080×1920 story-format PNG — no DOM capture needed.
function downloadPNG(data: CardData, userName: string) {
  const rank = getRank(data.points);
  const c = document.createElement('canvas');
  c.width = 1080; c.height = 1920;
  const g = c.getContext('2d')!;

  const bg = g.createLinearGradient(0, 0, 300, 1920);
  bg.addColorStop(0, '#14100a'); bg.addColorStop(0.45, '#050505'); bg.addColorStop(1, '#0a0708');
  g.fillStyle = bg; g.fillRect(0, 0, 1080, 1920);
  const bar = g.createLinearGradient(0, 0, 1080, 0);
  bar.addColorStop(0, 'rgba(212,175,55,0)'); bar.addColorStop(0.5, '#D4AF37'); bar.addColorStop(1, 'rgba(212,175,55,0)');
  g.fillStyle = bar; g.fillRect(0, 0, 1080, 8);

  g.textAlign = 'center';
  g.fillStyle = '#D4AF37';
  g.font = '800 44px monospace';
  g.fillText('⚡ E M P I R E   W R A P P E D', 540, 190);
  g.fillStyle = '#777';
  g.font = '600 34px monospace';
  g.fillText(data.label + (data.live ? ' — IN PROGRESS' : ''), 540, 260);

  g.fillStyle = '#FFD700';
  g.shadowColor = 'rgba(212,175,55,0.55)'; g.shadowBlur = 60;
  g.font = '900 230px monospace';
  g.fillText(data.points.toLocaleString(), 540, 560);
  g.shadowBlur = 0;
  g.fillStyle = '#666';
  g.font = '600 32px monospace';
  g.fillText('E M P I R E   P O I N T S', 540, 640);

  g.fillStyle = rank.color;
  g.font = '800 52px sans-serif';
  g.fillText(`${rank.icon} ${rank.label}`, 540, 760);

  const rows: [string, string, string][] = [
    ['EARNED', formatCurrency(data.stats.earnings), '#00FF87'],
    ['HABITS CRUSHED', String(data.stats.habitCompletions), '#FF6B35'],
    ['FOCUS HOURS', `${data.stats.focusHours}H`, '#00D4FF'],
    ['JOURNAL ENTRIES', String(data.stats.journalEntries), '#FF4141'],
    ['SLEEP QUALITY', data.stats.sleepScore > 0 ? `${data.stats.sleepScore.toFixed(1)}/5` : '—', '#7B61FF'],
    ['ACTIVE DAYS', String(data.stats.activeDays), '#D4AF37'],
  ];
  rows.forEach(([label, value, color], i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = 90 + col * 460, y = 880 + row * 250, w = 440, h = 210;
    g.fillStyle = 'rgba(255,255,255,0.03)';
    g.strokeStyle = '#222';
    g.lineWidth = 2;
    g.beginPath(); g.roundRect(x, y, w, h, 18); g.fill(); g.stroke();
    g.textAlign = 'left';
    g.fillStyle = color;
    g.font = '900 72px monospace';
    g.fillText(value, x + 36, y + 105);
    g.fillStyle = '#666';
    g.font = '600 26px monospace';
    g.fillText(label, x + 36, y + 160);
  });

  if (data.stats.biggestWin) {
    g.textAlign = 'center';
    g.fillStyle = '#00FF87';
    g.font = '600 30px monospace';
    g.fillText('💰 BIGGEST WIN', 540, 1710);
    g.fillStyle = '#ccc';
    g.font = '800 44px monospace';
    g.fillText(`${formatCurrency(data.stats.biggestWin.amount)} — ${data.stats.biggestWin.source.slice(0, 24)}`, 540, 1770);
  }
  g.textAlign = 'center';
  g.fillStyle = '#4a4a4a';
  g.font = '600 30px monospace';
  g.fillText(`${(userName || 'OPERATOR').toUpperCase()} · EMPIRE OS`, 540, 1860);

  c.toBlob(blob => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `empire-wrapped-${data.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }, 'image/png');
}

export default function Wrapped({ habits, earnings, sleep, journal, pomodoro, userName }: Props) {
  const [records, setRecords] = useLocalStorage<WrappedRecord[]>('empire_wrappeds', []);
  const [selected, setSelected] = useState<WrappedRecord | null>(null);

  // Auto-compile completed weeks/months/years (append-only)
  useEffect(() => {
    const fresh = compileMissing(records, habits, earnings, sleep, journal, pomodoro);
    if (fresh.length > 0) setRecords([...records, ...fresh]);
  }, []);

  const live = useMemo(
    () => currentWeekSoFar(habits, earnings, sleep, journal, pomodoro),
    [habits, earnings, sleep, journal, pomodoro],
  );

  const shown: CardData = selected
    ? { label: selected.label, kindTag: KIND_TAG[selected.kind], stats: selected.stats, points: selected.points }
    : { label: live.label, kindTag: KIND_TAG.weekly, stats: live.stats, points: live.points, live: true };

  const past = [...records].sort((a, b) => b.startDate.localeCompare(a.startDate));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }} className="animate-fade-up">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: 11, color: '#555', letterSpacing: '0.12em', marginBottom: 4, fontFamily: 'JetBrains Mono, monospace' }}>YOUR STORY, COMPILED</div>
          <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0, color: '#fff' }}>EMPIRE WRAPPED</h1>
        </div>
        <button onClick={() => downloadPNG(shown, userName)} className="btn-gold" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Download size={14} /> DOWNLOAD
        </button>
      </div>

      {selected && (
        <button onClick={() => setSelected(null)} className="btn-ghost" style={{ alignSelf: 'center', fontSize: 11 }}>
          ← BACK TO CURRENT WEEK
        </button>
      )}

      <WrappedCard data={shown} userName={userName} />

      {/* Past wrappeds */}
      <div className="empire-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <Sparkles size={14} color="#D4AF37" />
          <span style={{ fontSize: 11, color: '#555', letterSpacing: '0.1em', fontWeight: 700 }}>PAST WRAPPEDS — {past.length} COMPILED</span>
        </div>
        {past.length === 0 ? (
          <div style={{ fontSize: 12, color: '#444', fontStyle: 'italic' }}>
            Your first weekly wrapped compiles automatically once a full week (Mon–Sun) with activity has ended. Monthly every calendar month, yearly every year.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {past.map(r => {
              const tag = KIND_TAG[r.kind];
              const isSel = selected?.id === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => setSelected(r)}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10,
                    padding: '11px 14px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                    background: isSel ? `${tag.color}10` : '#0d0d0d',
                    border: `1px solid ${isSel ? `${tag.color}45` : '#1a1a1a'}`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <span style={{ fontSize: 8.5, color: tag.color, fontWeight: 800, letterSpacing: '0.1em', border: `1px solid ${tag.color}40`, padding: '2px 8px', borderRadius: 20, flexShrink: 0 }}>{tag.label}</span>
                    <span style={{ fontSize: 12, color: '#ccc', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.label}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                    <span style={{ fontSize: 11, color: '#00FF87', fontFamily: 'JetBrains Mono, monospace' }}>{formatCurrency(r.stats.earnings)}</span>
                    <span style={{ fontSize: 13, color: '#D4AF37', fontWeight: 900, fontFamily: 'JetBrains Mono, monospace' }}>{r.points.toLocaleString()} PTS</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
