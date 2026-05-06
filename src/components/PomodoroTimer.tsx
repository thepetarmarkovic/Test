import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Play, Pause, RotateCcw, SkipForward, Timer, Zap, Coffee } from 'lucide-react';
import type { PomodoroSession } from '../types';
import { today, uid, getLast7Days, dayOfWeekShort } from '../utils/formatters';

const MODES = [
  { id: 'work', label: 'FOCUS', minutes: 25, color: '#00D4FF', icon: <Zap size={14} /> },
  { id: 'short', label: 'SHORT BREAK', minutes: 5, color: '#00FF87', icon: <Coffee size={14} /> },
  { id: 'long', label: 'LONG BREAK', minutes: 15, color: '#7B61FF', icon: <Coffee size={14} /> },
];

interface Props {
  sessions: PomodoroSession[];
  onChange: (s: PomodoroSession[]) => void;
}

export default function PomodoroTimer({ sessions, onChange }: Props) {
  const [modeIdx, setModeIdx] = useState(0);
  const [customMins, setCustomMins] = useState(25);
  const [useCustom, setUseCustom] = useState(false);
  const [seconds, setSeconds] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [task, setTask] = useState('');
  const [completedToday, setCompletedToday] = useState(0);
  const [sessionTask, setSessionTask] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const totalSeconds = useCustom ? customMins * 60 : MODES[modeIdx].minutes * 60;
  const mode = MODES[modeIdx];
  const color = mode.color;

  useEffect(() => {
    const todayStr = today();
    setCompletedToday(sessions.filter(s => s.date === todayStr && s.completed && s.type === 'work').length);
  }, [sessions]);

  useEffect(() => {
    setSeconds(totalSeconds);
    setIsRunning(false);
  }, [modeIdx, customMins, useCustom]);

  const completeSession = useCallback(() => {
    const todayStr = today();
    const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000 / 60);
    const session: PomodoroSession = {
      id: uid(),
      task: sessionTask || task || 'Deep work',
      duration: elapsed > 0 ? elapsed : MODES[modeIdx].minutes,
      date: todayStr,
      completed: true,
      type: modeIdx === 0 ? 'work' : 'break',
    };
    onChange(prev => [session, ...prev]);
    setIsRunning(false);
    setSeconds(totalSeconds);
  }, [sessionTask, task, modeIdx, totalSeconds, onChange]);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setSeconds(s => {
          if (s <= 1) {
            clearInterval(intervalRef.current!);
            completeSession();
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning, completeSession]);

  const toggle = () => {
    if (!isRunning) {
      startTimeRef.current = Date.now();
      setSessionTask(task);
    }
    setIsRunning(r => !r);
  };

  const reset = () => {
    setIsRunning(false);
    setSeconds(totalSeconds);
  };

  const skip = () => {
    setIsRunning(false);
    setModeIdx(i => (i + 1) % MODES.length);
  };

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const progress = 1 - seconds / totalSeconds;
  const dashOffset = circumference * (1 - progress);

  // Chart data
  const last7 = getLast7Days();
  const chartData = last7.map(d => ({
    day: dayOfWeekShort(d),
    sessions: sessions.filter(s => s.date === d && s.type === 'work' && s.completed).length,
    minutes: sessions.filter(s => s.date === d && s.type === 'work' && s.completed).reduce((sum, s) => sum + s.duration, 0),
  }));

  const todayStr = today();
  const todaySessions = sessions.filter(s => s.date === todayStr && s.type === 'work' && s.completed);
  const todayMinutes = todaySessions.reduce((s, p) => s + p.duration, 0);
  const allTimeSessions = sessions.filter(s => s.type === 'work' && s.completed).length;
  const allTimeHours = Math.floor(sessions.filter(s => s.type === 'work' && s.completed).reduce((s, p) => s + p.duration, 0) / 60);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }} className="animate-fade-up">
      {/* Header */}
      <div>
        <div style={{ fontSize: 11, color: '#555', letterSpacing: '0.12em', marginBottom: 4, fontFamily: 'JetBrains Mono, monospace' }}>
          DEEP WORK ENGINE
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0, color: '#fff' }}>FOCUS PROTOCOL</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Timer */}
        <div className="empire-card" style={{ textAlign: 'center', padding: '32px 24px', borderColor: isRunning ? `${color}33` : '#1f1f1f' }}>
          {/* Mode selector */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 28, justifyContent: 'center' }}>
            {MODES.map((m, i) => (
              <button
                key={m.id}
                onClick={() => { setModeIdx(i); setUseCustom(false); }}
                style={{
                  padding: '6px 12px', borderRadius: 20, fontSize: 10, fontWeight: 700,
                  border: `1px solid ${modeIdx === i && !useCustom ? m.color : '#1f1f1f'}`,
                  background: modeIdx === i && !useCustom ? `${m.color}15` : 'transparent',
                  color: modeIdx === i && !useCustom ? m.color : '#444',
                  cursor: 'pointer', letterSpacing: '0.06em', transition: 'all 0.15s',
                }}
              >
                {m.label}
              </button>
            ))}
            <button
              onClick={() => setUseCustom(true)}
              style={{
                padding: '6px 12px', borderRadius: 20, fontSize: 10, fontWeight: 700,
                border: `1px solid ${useCustom ? '#D4AF37' : '#1f1f1f'}`,
                background: useCustom ? 'rgba(212,175,55,0.15)' : 'transparent',
                color: useCustom ? '#D4AF37' : '#444',
                cursor: 'pointer', letterSpacing: '0.06em', transition: 'all 0.15s',
              }}
            >
              CUSTOM
            </button>
          </div>

          {useCustom && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 20 }}>
              <input
                type="number"
                value={customMins}
                min={1}
                max={180}
                onChange={e => setCustomMins(parseInt(e.target.value) || 25)}
                className="empire-input"
                style={{ width: 80, textAlign: 'center', fontSize: 18, fontWeight: 700 }}
              />
              <span style={{ color: '#555', fontSize: 13 }}>minutes</span>
            </div>
          )}

          {/* SVG Timer */}
          <div style={{ position: 'relative', display: 'inline-block', marginBottom: 24 }}>
            <svg width={220} height={220} viewBox="0 0 220 220">
              {/* Glow filter */}
              <defs>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <linearGradient id="timerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={color} />
                  <stop offset="100%" stopColor={color + '99'} />
                </linearGradient>
              </defs>

              {/* Background dots */}
              {Array.from({ length: 12 }).map((_, i) => {
                const angle = (i * 30 - 90) * (Math.PI / 180);
                const x = 110 + 105 * Math.cos(angle);
                const y = 110 + 105 * Math.sin(angle);
                return <circle key={i} cx={x} cy={y} r={2} fill="#1a1a1a" />;
              })}

              {/* Track */}
              <circle cx={110} cy={110} r={radius} fill="none" stroke="#111" strokeWidth={10} />

              {/* Progress */}
              <circle
                cx={110}
                cy={110}
                r={radius}
                fill="none"
                stroke="url(#timerGrad)"
                strokeWidth={10}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                transform="rotate(-90 110 110)"
                style={{ transition: 'stroke-dashoffset 0.9s ease', filter: isRunning ? 'url(#glow)' : 'none' }}
              />

              {/* Tip dot */}
              {progress > 0.01 && (
                (() => {
                  const angle = (progress * 360 - 90) * (Math.PI / 180);
                  const x = 110 + radius * Math.cos(angle);
                  const y = 110 + radius * Math.sin(angle);
                  return <circle cx={x} cy={y} r={6} fill={color} style={{ filter: 'url(#glow)' }} />;
                })()
              )}
            </svg>

            {/* Time display */}
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
            }}>
              <div
                style={{
                  fontSize: 44, fontWeight: 900, color: isRunning ? color : '#fff',
                  fontFamily: 'JetBrains Mono, monospace', lineHeight: 1,
                  letterSpacing: '-0.02em',
                  transition: 'color 0.3s',
                  textShadow: isRunning ? `0 0 20px ${color}66` : 'none',
                }}
              >
                {timeStr}
              </div>
              <div style={{ fontSize: 10, color: '#555', letterSpacing: '0.1em', marginTop: 6 }}>
                {useCustom ? 'CUSTOM' : mode.label}
              </div>
            </div>
          </div>

          {/* Task input */}
          <input
            className="empire-input"
            value={task}
            onChange={e => setTask(e.target.value)}
            placeholder="What are you building right now?"
            style={{ marginBottom: 20, textAlign: 'center' }}
          />

          {/* Controls */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
            <button
              onClick={reset}
              style={{
                width: 44, height: 44, borderRadius: '50%',
                border: '1px solid #2a2a2a', background: 'transparent',
                color: '#555', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#D4AF37')}
              onMouseLeave={e => (e.currentTarget.style.color = '#555')}
            >
              <RotateCcw size={16} />
            </button>

            <button
              onClick={toggle}
              style={{
                width: 72, height: 72, borderRadius: '50%',
                background: isRunning ? 'transparent' : `linear-gradient(135deg, ${color}, ${color}99)`,
                border: `2px solid ${color}`,
                color: isRunning ? color : '#000',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, transition: 'all 0.2s',
                boxShadow: isRunning ? `0 0 30px ${color}44` : 'none',
              }}
            >
              {isRunning ? <Pause size={24} /> : <Play size={24} fill={color} />}
            </button>

            <button
              onClick={skip}
              style={{
                width: 44, height: 44, borderRadius: '50%',
                border: '1px solid #2a2a2a', background: 'transparent',
                color: '#555', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#D4AF37')}
              onMouseLeave={e => (e.currentTarget.style.color = '#555')}
            >
              <SkipForward size={16} />
            </button>
          </div>

          {/* Session dots */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 20, alignItems: 'center' }}>
            {Array.from({ length: Math.min(completedToday + 1, 8) }).map((_, i) => (
              <div
                key={i}
                style={{
                  width: i < completedToday ? 10 : 10,
                  height: i < completedToday ? 10 : 10,
                  borderRadius: '50%',
                  background: i < completedToday ? color : '#111',
                  border: `2px solid ${i < completedToday ? color : '#1f1f1f'}`,
                  boxShadow: i < completedToday ? `0 0 8px ${color}66` : 'none',
                }}
              />
            ))}
            {completedToday > 8 && <span style={{ fontSize: 11, color: '#555' }}>+{completedToday - 8}</span>}
          </div>
          <div style={{ fontSize: 10, color: '#444', marginTop: 8, letterSpacing: '0.06em' }}>
            {completedToday} SESSIONS TODAY · {todayMinutes}min FOCUSED
          </div>
        </div>

        {/* Right panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { label: 'TODAY SESSIONS', value: todaySessions.length, color: '#00D4FF' },
              { label: 'TODAY FOCUS', value: `${todayMinutes}m`, color: '#D4AF37' },
              { label: 'ALL TIME SESSIONS', value: allTimeSessions, color: '#00FF87' },
              { label: 'ALL TIME HOURS', value: `${allTimeHours}h`, color: '#7B61FF' },
            ].map(s => (
              <div key={s.label} className="empire-card" style={{ textAlign: 'center', padding: '14px' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: s.color, fontFamily: 'JetBrains Mono, monospace' }}>{s.value}</div>
                <div style={{ fontSize: 9, color: '#555', letterSpacing: '0.08em', marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* 7-day chart */}
          <div className="empire-card">
            <div style={{ fontSize: 11, color: '#555', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 12 }}>
              7-DAY FOCUS SESSIONS
            </div>
            <ResponsiveContainer width="100%" height={100}>
              <BarChart data={chartData} barCategoryGap="25%">
                <XAxis dataKey="day" tick={{ fill: '#555', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ background: '#0d0d0d', border: '1px solid rgba(0,212,255,0.3)', borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number, name: string) => [name === 'sessions' ? `${v} sessions` : `${v}min`, name === 'sessions' ? 'Sessions' : 'Minutes']}
                  labelStyle={{ color: '#888' }}
                />
                <Bar dataKey="sessions" radius={[4, 4, 0, 0]}>
                  {chartData.map((d, i) => (
                    <Cell key={i} fill={d.day === dayOfWeekShort(todayStr) ? '#00D4FF' : 'rgba(0,212,255,0.25)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Session log */}
          <div className="empire-card" style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: '#555', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 12 }}>
              SESSION LOG
            </div>
            {sessions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: '#333', fontSize: 13 }}>
                <Timer size={24} color="#222" style={{ marginBottom: 8 }} />
                <div>No sessions yet. Start your first focus block.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 280, overflowY: 'auto' }}>
                {[...sessions].slice(0, 15).map((s, i) => (
                  <div
                    key={s.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 0', borderBottom: i < Math.min(sessions.length, 14) ? '1px solid #0d0d0d' : 'none',
                    }}
                  >
                    <div
                      style={{
                        width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                        background: s.type === 'work' ? 'rgba(0,212,255,0.1)' : 'rgba(0,255,135,0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      {s.type === 'work' ? <Zap size={12} color="#00D4FF" /> : <Coffee size={12} color="#00FF87" />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#ccc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {s.task}
                      </div>
                      <div style={{ fontSize: 10, color: '#444' }}>{s.date}</div>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: s.type === 'work' ? '#00D4FF' : '#00FF87', flexShrink: 0, fontFamily: 'JetBrains Mono, monospace' }}>
                      {s.duration}m
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
