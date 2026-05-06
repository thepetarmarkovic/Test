import React, { useState } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import HabitTracker from './components/HabitTracker';
import EarningsTracker from './components/EarningsTracker';
import SleepTracker from './components/SleepTracker';
import Journal from './components/Journal';
import Goals from './components/Goals';
import Competition from './components/Competition';
import PomodoroTimer from './components/PomodoroTimer';
import { useLocalStorage } from './hooks/useLocalStorage';
import type {
  Page, Habit, EarningEntry, SleepEntry, JournalEntry, Goal,
  CompetitorProfile, PomodoroSession
} from './types';
import { X } from 'lucide-react';

export default function App() {
  const [page, setPage] = useState<Page>('dashboard');
  const [userName, setUserName] = useLocalStorage<string>('empire_username', '');
  const [habits, setHabits] = useLocalStorage<Habit[]>('empire_habits', []);
  const [earnings, setEarnings] = useLocalStorage<EarningEntry[]>('empire_earnings', []);
  const [sleep, setSleep] = useLocalStorage<SleepEntry[]>('empire_sleep', []);
  const [journal, setJournal] = useLocalStorage<JournalEntry[]>('empire_journal', []);
  const [goals, setGoals] = useLocalStorage<Goal[]>('empire_goals', []);
  const [competitors, setCompetitors] = useLocalStorage<CompetitorProfile[]>('empire_competitors', []);
  const [pomodoro, setPomodoro] = useLocalStorage<PomodoroSession[]>('empire_pomodoro', []);
  const [showNamePrompt, setShowNamePrompt] = useState(!userName);
  const [nameInput, setNameInput] = useState('');

  const handleSetName = () => {
    if (!nameInput.trim()) return;
    setUserName(nameInput.trim().toUpperCase());
    setShowNamePrompt(false);
  };

  return (
    <>
      {/* Name prompt */}
      {showNamePrompt && (
        <div className="modal-backdrop">
          <div className="modal-box" style={{ maxWidth: 420 }}>
            <div
              style={{
                textAlign: 'center',
                padding: '10px 0 20px',
              }}
            >
              <div
                style={{
                  fontSize: 48, marginBottom: 8,
                  filter: 'drop-shadow(0 0 20px rgba(212,175,55,0.5))',
                }}
              >
                ⚡
              </div>
              <div
                style={{
                  fontSize: 22, fontWeight: 900, letterSpacing: '0.08em',
                  background: 'linear-gradient(135deg, #D4AF37, #FFD700)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  marginBottom: 8,
                }}
              >
                EMPIRE OS INITIALIZED
              </div>
              <div style={{ fontSize: 13, color: '#555', marginBottom: 24, lineHeight: 1.6 }}>
                Your personal command center for building wealth,<br />
                discipline, and dominance.
              </div>
              <div className="label-upper" style={{ textAlign: 'left', marginBottom: 8 }}>
                Operator Callsign
              </div>
              <input
                className="empire-input"
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                placeholder="Enter your name..."
                onKeyDown={e => e.key === 'Enter' && handleSetName()}
                autoFocus
                style={{ textAlign: 'center', fontSize: 18, fontWeight: 700, letterSpacing: '0.04em' }}
              />
              <button
                onClick={handleSetName}
                className="btn-gold"
                style={{ width: '100%', marginTop: 16, padding: '14px', fontSize: 14 }}
              >
                ACTIVATE COMMAND CENTER
              </button>
            </div>
          </div>
        </div>
      )}

      <Layout currentPage={page} onNavigate={p => setPage(p as Page)} userName={userName}>
        {page === 'dashboard' && (
          <Dashboard
            habits={habits}
            earnings={earnings}
            sleep={sleep}
            goals={goals}
            pomodoro={pomodoro}
            userName={userName}
            onNavigate={p => setPage(p as Page)}
          />
        )}
        {page === 'habits' && (
          <HabitTracker habits={habits} onChange={setHabits} />
        )}
        {page === 'earnings' && (
          <EarningsTracker earnings={earnings} onChange={setEarnings} />
        )}
        {page === 'sleep' && (
          <SleepTracker sleep={sleep} onChange={setSleep} />
        )}
        {page === 'journal' && (
          <Journal entries={journal} onChange={setJournal} />
        )}
        {page === 'goals' && (
          <Goals goals={goals} onChange={setGoals} />
        )}
        {page === 'competition' && (
          <Competition
            competitors={competitors}
            habits={habits}
            earnings={earnings}
            goals={goals}
            pomodoro={pomodoro}
            myName={userName}
            onChange={setCompetitors}
            onUpdateMe={() => {}}
          />
        )}
        {page === 'pomodoro' && (
          <PomodoroTimer sessions={pomodoro} onChange={setPomodoro} />
        )}
      </Layout>
    </>
  );
}
