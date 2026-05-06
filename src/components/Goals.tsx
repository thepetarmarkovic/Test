import React, { useState } from 'react';
import { RadialBarChart, RadialBar, ResponsiveContainer, Tooltip } from 'recharts';
import { Plus, Target, DollarSign, CheckCircle, Trash2, Edit2, X, Plus as PlusIcon } from 'lucide-react';
import type { Goal, Milestone } from '../types';
import { formatCurrency, formatDate, today, uid } from '../utils/formatters';

const TYPES: { id: Goal['type']; label: string; emoji: string; color: string }[] = [
  { id: 'money', label: 'Money', emoji: '💰', color: '#00FF87' },
  { id: 'career', label: 'Career', emoji: '💼', color: '#D4AF37' },
  { id: 'personal', label: 'Personal', emoji: '🧠', color: '#00D4FF' },
  { id: 'health', label: 'Health', emoji: '❤️', color: '#FF6B35' },
  { id: 'learning', label: 'Learning', emoji: '📚', color: '#7B61FF' },
];

const PRIORITIES: { id: Goal['priority']; label: string; color: string }[] = [
  { id: 'low', label: 'LOW', color: '#555' },
  { id: 'medium', label: 'MEDIUM', color: '#D4AF37' },
  { id: 'high', label: 'HIGH', color: '#FF6B35' },
  { id: 'critical', label: 'CRITICAL', color: '#FF4141' },
];

interface Props {
  goals: Goal[];
  onChange: (g: Goal[]) => void;
}

function GoalCard({ goal, onUpdate, onDelete }: { goal: Goal; onUpdate: (g: Goal) => void; onDelete: () => void }) {
  const [showProgress, setShowProgress] = useState(false);
  const [progressInput, setProgressInput] = useState('');
  const [newMilestone, setNewMilestone] = useState('');
  const [newMilestoneAmt, setNewMilestoneAmt] = useState('');

  const typeData = TYPES.find(t => t.id === goal.type)!;
  const priorityData = PRIORITIES.find(p => p.id === goal.priority)!;
  const pct = Math.min(Math.round(goal.currentAmount / goal.targetAmount * 100), 100);

  const addProgress = () => {
    const val = parseFloat(progressInput);
    if (isNaN(val)) return;
    const newAmount = Math.min(goal.currentAmount + val, goal.targetAmount);
    const updatedMilestones = goal.milestones.map(m => ({
      ...m,
      achieved: m.achieved || newAmount >= m.targetAmount,
    }));
    onUpdate({
      ...goal,
      currentAmount: newAmount,
      milestones: updatedMilestones,
      completed: newAmount >= goal.targetAmount,
    });
    setProgressInput(''); setShowProgress(false);
  };

  const addMilestone = () => {
    if (!newMilestone.trim() || !newMilestoneAmt) return;
    const m: Milestone = {
      id: uid(),
      label: newMilestone.trim(),
      targetAmount: parseFloat(newMilestoneAmt),
      achieved: goal.currentAmount >= parseFloat(newMilestoneAmt),
    };
    onUpdate({ ...goal, milestones: [...goal.milestones, m].sort((a, b) => a.targetAmount - b.targetAmount) });
    setNewMilestone(''); setNewMilestoneAmt('');
  };

  const formatValue = (v: number) => goal.type === 'money' ? formatCurrency(v) : `${v} ${goal.unit}`;

  return (
    <div
      className="empire-card"
      style={{
        borderColor: goal.completed ? 'rgba(0,255,135,0.2)' : `${typeData.color}22`,
        background: goal.completed ? 'rgba(0,255,135,0.02)' : '#0d0d0d',
        opacity: goal.completed ? 0.7 : 1,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 18 }}>{typeData.emoji}</span>
            <span style={{ fontSize: 15, fontWeight: 800, color: goal.completed ? '#555' : '#fff' }}>{goal.title}</span>
            {goal.completed && <CheckCircle size={16} color="#00FF87" />}
            <span
              style={{
                fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                border: `1px solid ${priorityData.color}44`,
                color: priorityData.color, letterSpacing: '0.08em',
              }}
            >
              {priorityData.label}
            </span>
          </div>
          {goal.description && <div style={{ fontSize: 12, color: '#555', marginBottom: 8 }}>{goal.description}</div>}
          <div style={{ fontSize: 11, color: '#444' }}>
            Deadline: {formatDate(goal.deadline)} · {goal.type.toUpperCase()}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button
            onClick={() => setShowProgress(!showProgress)}
            className="btn-ghost"
            style={{ fontSize: 10, padding: '5px 12px', borderColor: `${typeData.color}44`, color: typeData.color }}
          >
            +PROGRESS
          </button>
          <button onClick={onDelete} style={{ background: 'none', border: 'none', color: '#333', cursor: 'pointer' }}>
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Progress */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 11, color: '#555' }}>PROGRESS</span>
          <span style={{ fontSize: 13, fontWeight: 800, color: typeData.color, fontFamily: 'JetBrains Mono, monospace' }}>
            {formatValue(goal.currentAmount)} / {formatValue(goal.targetAmount)}
          </span>
        </div>
        <div className="progress-track" style={{ height: 8 }}>
          <div
            className="progress-fill"
            style={{
              width: `${pct}%`,
              background: `linear-gradient(90deg, ${typeData.color} 0%, ${typeData.color}aa 100%)`,
            }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
          <span style={{ fontSize: 10, color: '#444' }}>{pct}% COMPLETE</span>
          <span style={{ fontSize: 10, color: '#444' }}>{formatValue(goal.targetAmount - goal.currentAmount)} remaining</span>
        </div>
      </div>

      {/* Add Progress */}
      {showProgress && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 12, padding: '12px', background: '#111', borderRadius: 8 }}>
          <input
            className="empire-input"
            type="number"
            value={progressInput}
            onChange={e => setProgressInput(e.target.value)}
            placeholder={goal.type === 'money' ? "Amount to add ($)" : `Amount (${goal.unit})`}
            onKeyDown={e => e.key === 'Enter' && addProgress()}
            autoFocus
          />
          <button onClick={addProgress} className="btn-gold" style={{ whiteSpace: 'nowrap' }}>LOCK IN</button>
          <button onClick={() => setShowProgress(false)} className="btn-ghost" style={{ whiteSpace: 'nowrap' }}>CANCEL</button>
        </div>
      )}

      {/* Milestones */}
      {goal.milestones.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, color: '#444', letterSpacing: '0.08em', marginBottom: 8 }}>CHECKPOINTS</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {goal.milestones.map(m => (
              <div
                key={m.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px',
                  borderRadius: 20,
                  border: `1px solid ${m.achieved ? '#00FF87' : '#1f1f1f'}`,
                  background: m.achieved ? 'rgba(0,255,135,0.08)' : 'transparent',
                  fontSize: 11,
                  color: m.achieved ? '#00FF87' : '#444',
                }}
              >
                {m.achieved ? '✓' : '○'} {m.label} ({formatValue(m.targetAmount)})
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Milestone */}
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          className="empire-input"
          value={newMilestone}
          onChange={e => setNewMilestone(e.target.value)}
          placeholder="Checkpoint name..."
          style={{ flex: 2, fontSize: 12 }}
        />
        <input
          className="empire-input"
          type="number"
          value={newMilestoneAmt}
          onChange={e => setNewMilestoneAmt(e.target.value)}
          placeholder={goal.type === 'money' ? "$" : goal.unit}
          style={{ flex: 1, fontSize: 12 }}
          onKeyDown={e => e.key === 'Enter' && addMilestone()}
        />
        <button onClick={addMilestone} style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', padding: '0 8px' }}>
          <PlusIcon size={16} />
        </button>
      </div>
    </div>
  );
}

export default function Goals({ goals, onChange }: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<Goal['type']>('money');
  const [target, setTarget] = useState('');
  const [unit, setUnit] = useState('$');
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState<Goal['priority']>('high');
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('active');

  const addGoal = () => {
    if (!title.trim() || !target || !deadline) return;
    const g: Goal = {
      id: uid(), title: title.trim(), description: description.trim(),
      type, targetAmount: parseFloat(target), currentAmount: 0,
      unit: type === 'money' ? '$' : unit,
      deadline, priority, milestones: [], completed: false,
      createdAt: today(),
    };
    onChange([...goals, g]);
    setTitle(''); setDescription(''); setTarget(''); setDeadline('');
    setType('money'); setPriority('high'); setShowAdd(false);
  };

  const updateGoal = (updated: Goal) => onChange(goals.map(g => g.id === updated.id ? updated : g));
  const deleteGoal = (id: string) => onChange(goals.filter(g => g.id !== id));

  const filtered = goals.filter(g => {
    if (filter === 'active') return !g.completed;
    if (filter === 'completed') return g.completed;
    return true;
  });

  const totalMoney = goals.filter(g => g.type === 'money').reduce((s, g) => s + g.targetAmount, 0);
  const earnedMoney = goals.filter(g => g.type === 'money').reduce((s, g) => s + g.currentAmount, 0);
  const moneyPct = totalMoney > 0 ? Math.round(earnedMoney / totalMoney * 100) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }} className="animate-fade-up">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: 11, color: '#555', letterSpacing: '0.12em', marginBottom: 4, fontFamily: 'JetBrains Mono, monospace' }}>
            MISSION CONTROL
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0, color: '#fff' }}>MISSION GOALS</h1>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-gold" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={14} /> NEW MISSION
        </button>
      </div>

      {/* Money overview */}
      {goals.filter(g => g.type === 'money').length > 0 && (
        <div
          className="empire-card"
          style={{ borderColor: 'rgba(0,255,135,0.2)', background: 'linear-gradient(135deg, rgba(0,255,135,0.04) 0%, rgba(0,255,135,0.01) 100%)' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: '#00FF87', letterSpacing: '0.1em', fontWeight: 700 }}>◆ MONEY MISSION OVERVIEW</div>
            <div style={{ fontSize: 10, color: '#555' }}>{goals.filter(g => g.type === 'money').length} TARGETS</div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: '#555', marginBottom: 4 }}>TOTAL PROGRESS</div>
              <div style={{ fontSize: 36, fontWeight: 900, color: '#00FF87', fontFamily: 'JetBrains Mono, monospace' }}>
                {formatCurrency(earnedMoney)}
              </div>
              <div style={{ fontSize: 13, color: '#555', marginTop: 2 }}>of {formatCurrency(totalMoney)} target</div>
            </div>
            <div style={{ fontSize: 48, fontWeight: 900, color: '#00FF87', opacity: 0.2, fontFamily: 'JetBrains Mono, monospace' }}>
              {moneyPct}%
            </div>
          </div>
          <div className="progress-track" style={{ height: 10 }}>
            <div className="progress-fill progress-fill-success" style={{ width: `${moneyPct}%` }} />
          </div>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'flex', gap: 12 }}>
        {[
          { label: 'ACTIVE', value: goals.filter(g => !g.completed).length, color: '#D4AF37' },
          { label: 'COMPLETED', value: goals.filter(g => g.completed).length, color: '#00FF87' },
          { label: 'CRITICAL', value: goals.filter(g => g.priority === 'critical' && !g.completed).length, color: '#FF4141' },
          { label: 'MONEY GOALS', value: goals.filter(g => g.type === 'money').length, color: '#00FF87' },
        ].map(s => (
          <div key={s.label} className="empire-card" style={{ flex: 1, textAlign: 'center', padding: 14 }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 9, color: '#555', letterSpacing: '0.1em', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: 8 }}>
        {(['all', 'active', 'completed'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={filter === f ? 'btn-gold' : 'btn-ghost'}
            style={{ fontSize: 11 }}
          >
            {f.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Add Modal */}
      {showAdd && (
        <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setShowAdd(false); }}>
          <div className="modal-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#D4AF37', letterSpacing: '0.06em' }}>
                DEFINE YOUR MISSION
              </h3>
              <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <div className="label-upper" style={{ marginBottom: 6 }}>Mission Title</div>
                <input className="empire-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Hit $100K revenue" autoFocus />
              </div>
              <div>
                <div className="label-upper" style={{ marginBottom: 6 }}>Why it matters</div>
                <input className="empire-input" value={description} onChange={e => setDescription(e.target.value)} placeholder="The reason this goal exists..." />
              </div>
              <div>
                <div className="label-upper" style={{ marginBottom: 8 }}>Type</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {TYPES.map(t => (
                    <button
                      key={t.id}
                      onClick={() => { setType(t.id); setUnit(t.id === 'money' ? '$' : ''); }}
                      style={{
                        padding: '8px 14px', borderRadius: 8,
                        border: `2px solid ${type === t.id ? t.color : '#1f1f1f'}`,
                        background: type === t.id ? `${t.color}15` : 'transparent',
                        color: type === t.id ? t.color : '#444',
                        fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                      }}
                    >
                      {t.emoji} {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div className="label-upper" style={{ marginBottom: 6 }}>Target {type === 'money' ? '($)' : ''}</div>
                  <input className="empire-input" type="number" value={target} onChange={e => setTarget(e.target.value)} placeholder="0" />
                </div>
                {type !== 'money' && (
                  <div style={{ flex: 1 }}>
                    <div className="label-upper" style={{ marginBottom: 6 }}>Unit</div>
                    <input className="empire-input" value={unit} onChange={e => setUnit(e.target.value)} placeholder="hours, pages, kg..." />
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <div className="label-upper" style={{ marginBottom: 6 }}>Deadline</div>
                  <input className="empire-input" type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />
                </div>
              </div>
              <div>
                <div className="label-upper" style={{ marginBottom: 8 }}>Priority</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {PRIORITIES.map(p => (
                    <button
                      key={p.id}
                      onClick={() => setPriority(p.id)}
                      style={{
                        flex: 1, padding: '8px', borderRadius: 8,
                        border: `2px solid ${priority === p.id ? p.color : '#1f1f1f'}`,
                        background: priority === p.id ? `${p.color}15` : 'transparent',
                        color: priority === p.id ? p.color : '#444',
                        fontSize: 10, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.06em', transition: 'all 0.15s',
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={addGoal} className="btn-gold" style={{ marginTop: 4 }}>
                DEPLOY MISSION
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Goal list */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', border: '1px dashed #1f1f1f', borderRadius: 12 }}>
          <Target size={32} color="#222" style={{ marginBottom: 12 }} />
          <div style={{ fontSize: 16, fontWeight: 700, color: '#444' }}>
            {filter === 'completed' ? 'No completed missions yet' : 'No active missions. Deploy your first above.'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(g => (
            <GoalCard key={g.id} goal={g} onUpdate={updateGoal} onDelete={() => deleteGoal(g.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
