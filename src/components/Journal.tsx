import React, { useState, useMemo } from 'react';
import { BookOpen, Plus, Edit2, Trash2, X, Search, ChevronDown, ChevronUp } from 'lucide-react';
import type { JournalEntry } from '../types';
import { today, uid, formatDate } from '../utils/formatters';

const MOODS: { id: JournalEntry['mood']; label: string; emoji: string; color: string }[] = [
  { id: 'crushing', label: 'CRUSHING IT', emoji: '🔥', color: '#00FF87' },
  { id: 'focused', label: 'LOCKED IN', emoji: '⚡', color: '#00D4FF' },
  { id: 'neutral', label: 'STEADY', emoji: '🎯', color: '#D4AF37' },
  { id: 'off', label: 'OFF DAY', emoji: '🌧', color: '#888' },
  { id: 'rough', label: 'ROUGH', emoji: '💀', color: '#FF4141' },
];

const PROMPTS = [
  "What am I grateful for right now?",
  "What's the one thing I need to accomplish today?",
  "What's been holding me back lately?",
  "What did I win today?",
  "What would my future self tell me right now?",
  "Who do I need to become to achieve my goals?",
  "What am I avoiding that I need to face?",
  "What's one decision that will change my trajectory?",
];

interface Props {
  entries: JournalEntry[];
  onChange: (e: JournalEntry[]) => void;
}

export default function Journal({ entries, onChange }: Props) {
  const [view, setView] = useState<'write' | 'read'>('write');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mood, setMood] = useState<JournalEntry['mood']>('focused');
  const [tags, setTags] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterMood, setFilterMood] = useState<JournalEntry['mood'] | 'all'>('all');

  const save = () => {
    if (!content.trim()) return;
    const tagList = tags.split(',').map(t => t.trim()).filter(Boolean);

    if (editId) {
      onChange(entries.map(e => e.id === editId
        ? { ...e, title: title.trim() || untitled(), content, mood, tags: tagList }
        : e
      ));
      setEditId(null);
    } else {
      const entry: JournalEntry = {
        id: uid(),
        date: today(),
        title: title.trim() || untitled(),
        content,
        mood,
        tags: tagList,
      };
      onChange([entry, ...entries]);
    }
    setTitle(''); setContent(''); setTags(''); setMood('focused');
    setView('read');
  };

  const startEdit = (e: JournalEntry) => {
    setEditId(e.id);
    setTitle(e.title);
    setContent(e.content);
    setMood(e.mood);
    setTags(e.tags.join(', '));
    setView('write');
  };

  const deleteEntry = (id: string) => onChange(entries.filter(e => e.id !== id));

  const usePrompt = (p: string) => setContent(prev => prev ? `${prev}\n\n${p}\n` : `${p}\n`);

  const untitled = () => `Entry — ${formatDate(today())}`;

  const filtered = useMemo(() => {
    return entries.filter(e => {
      const matchMood = filterMood === 'all' || e.mood === filterMood;
      const matchSearch = !search || e.title.toLowerCase().includes(search.toLowerCase()) || e.content.toLowerCase().includes(search.toLowerCase());
      return matchMood && matchSearch;
    });
  }, [entries, filterMood, search]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }} className="animate-fade-up">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: 11, color: '#555', letterSpacing: '0.12em', marginBottom: 4, fontFamily: 'JetBrains Mono, monospace' }}>
            INTELLIGENCE ARCHIVE
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0, color: '#fff' }}>INTEL LOG</h1>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => setView('write')}
            className={view === 'write' ? 'btn-gold' : 'btn-ghost'}
          >
            <Plus size={12} style={{ marginRight: 4 }} /> WRITE
          </button>
          <button
            onClick={() => setView('read')}
            className={view === 'read' ? 'btn-gold' : 'btn-ghost'}
          >
            <BookOpen size={12} style={{ marginRight: 4 }} /> ALL ENTRIES ({entries.length})
          </button>
        </div>
      </div>

      {view === 'write' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Mood */}
          <div className="empire-card">
            <div className="label-upper" style={{ marginBottom: 12 }}>Current State</div>
            <div style={{ display: 'flex', gap: 10 }}>
              {MOODS.map(m => (
                <button
                  key={m.id}
                  onClick={() => setMood(m.id)}
                  style={{
                    flex: 1, padding: '12px 8px', borderRadius: 8,
                    border: `2px solid ${mood === m.id ? m.color : '#1f1f1f'}`,
                    background: mood === m.id ? `${m.color}12` : 'transparent',
                    color: mood === m.id ? m.color : '#444',
                    cursor: 'pointer', transition: 'all 0.15s',
                    fontSize: 10, fontWeight: 700, letterSpacing: '0.04em',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: 20, marginBottom: 4 }}>{m.emoji}</div>
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Prompts */}
          <div className="empire-card">
            <div className="label-upper" style={{ marginBottom: 10 }}>Intelligence Prompts</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {PROMPTS.map(p => (
                <button
                  key={p}
                  onClick={() => usePrompt(p)}
                  style={{
                    padding: '6px 12px', borderRadius: 20,
                    border: '1px solid #1f1f1f', background: 'transparent',
                    color: '#555', fontSize: 11, cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#D4AF37'; (e.currentTarget as HTMLElement).style.color = '#D4AF37'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#1f1f1f'; (e.currentTarget as HTMLElement).style.color = '#555'; }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Write area */}
          <div className="empire-card">
            <input
              className="empire-input"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Entry title (optional)..."
              style={{ marginBottom: 14, fontSize: 16, fontWeight: 600, background: 'transparent', border: 'none', borderBottom: '1px solid #1f1f1f', borderRadius: 0, padding: '8px 0' }}
            />
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Write freely. No judgment. No filters. Just truth..."
              style={{
                width: '100%', minHeight: 280, background: 'transparent',
                border: 'none', outline: 'none', color: '#ddd', fontSize: 15,
                lineHeight: 1.8, resize: 'vertical', fontFamily: 'Inter, sans-serif',
              }}
            />
            <div style={{ borderTop: '1px solid #111', paddingTop: 14, marginTop: 14 }}>
              <input
                className="empire-input"
                value={tags}
                onChange={e => setTags(e.target.value)}
                placeholder="Tags: hustle, reflection, gratitude..."
                style={{ marginBottom: 14 }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: '#444' }}>
                  {content.split(/\s+/).filter(w => w).length} words
                </span>
                <div style={{ display: 'flex', gap: 10 }}>
                  {editId && (
                    <button
                      onClick={() => { setEditId(null); setTitle(''); setContent(''); setTags(''); setMood('focused'); }}
                      className="btn-ghost"
                    >
                      CANCEL
                    </button>
                  )}
                  <button onClick={save} className="btn-gold">
                    {editId ? 'UPDATE ENTRY' : 'SEAL THE INTEL'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Filters */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
              <Search size={14} color="#555" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                className="empire-input"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search entries..."
                style={{ paddingLeft: 36 }}
              />
            </div>
            <select className="empire-select" value={filterMood} onChange={e => setFilterMood(e.target.value as JournalEntry['mood'] | 'all')}>
              <option value="all">All Moods</option>
              {MOODS.map(m => <option key={m.id} value={m.id}>{m.emoji} {m.label}</option>)}
            </select>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 12 }}>
            {[
              { label: 'TOTAL ENTRIES', value: entries.length, color: '#D4AF37' },
              { label: 'THIS MONTH', value: entries.filter(e => e.date.startsWith(new Date().toISOString().slice(0, 7))).length, color: '#00D4FF' },
              { label: 'CRUSHING DAYS', value: entries.filter(e => e.mood === 'crushing').length, color: '#00FF87' },
              { label: 'TOTAL WORDS', value: entries.reduce((s, e) => s + e.content.split(/\s+/).filter(w => w).length, 0), color: '#7B61FF' },
            ].map(s => (
              <div key={s.label} className="empire-card" style={{ flex: 1, textAlign: 'center', padding: 14 }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 9, color: '#555', letterSpacing: '0.1em', marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Entry list */}
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', border: '1px dashed #1f1f1f', borderRadius: 12 }}>
              <BookOpen size={32} color="#222" style={{ marginBottom: 12 }} />
              <div style={{ fontSize: 16, fontWeight: 700, color: '#444' }}>
                {entries.length === 0 ? 'No entries yet' : 'No entries match your filters'}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filtered.map(e => {
                const moodData = MOODS.find(m => m.id === e.mood)!;
                const isExpanded = expandedId === e.id;

                return (
                  <div key={e.id} className="empire-card" style={{ padding: '18px 20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                          <span style={{ fontSize: 16 }}>{moodData.emoji}</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#ddd', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {e.title}
                          </span>
                          <span style={{ fontSize: 10, color: moodData.color, fontWeight: 700, letterSpacing: '0.06em', flexShrink: 0 }}>
                            {moodData.label}
                          </span>
                        </div>
                        <div style={{ fontSize: 11, color: '#555', marginBottom: 8 }}>{formatDate(e.date)}</div>
                        <p style={{
                          fontSize: 13, color: '#777', lineHeight: 1.6, margin: 0,
                          overflow: 'hidden',
                          display: '-webkit-box',
                          WebkitLineClamp: isExpanded ? 'unset' : 3,
                          WebkitBoxOrient: 'vertical',
                        } as React.CSSProperties}>
                          {e.content}
                        </p>
                        {e.tags.length > 0 && (
                          <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                            {e.tags.map(t => (
                              <span key={t} className="tag-chip">{t}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                        <button onClick={() => setExpandedId(isExpanded ? null : e.id)} style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer' }}>
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                        <button onClick={() => startEdit(e)} style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer' }}>
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => deleteEntry(e.id)} style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer' }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
