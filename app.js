/* ===== FlowState App ===== */
'use strict';

// ── SVG gradient defs ──────────────────────────────────────────────────────
document.body.insertAdjacentHTML('beforeend', `
<svg class="svg-defs"><defs>
  <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="0%">
    <stop offset="0%" stop-color="#6c63ff"/>
    <stop offset="100%" stop-color="#10b981"/>
  </linearGradient>
</defs></svg>`);

// ── Storage helpers ────────────────────────────────────────────────────────
const store = {
  get: (k, def) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch { return def; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

// ── State ──────────────────────────────────────────────────────────────────
let tasks      = store.get('fs_tasks', []);
let habits     = store.get('fs_habits', []);
let goals      = store.get('fs_goals', []);
let journal    = store.get('fs_journal', []);
let savedQuotes= store.get('fs_savedQuotes', []);
let settings   = store.get('fs_settings', { name: '', streak: 0, lastActive: '', focusMinToday: 0, sessionsToday: 0, lastSessionDate: '' });

const TODAY = new Date().toISOString().slice(0, 10);

// ── Quotes ─────────────────────────────────────────────────────────────────
const QUOTES = [
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
  { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
  { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "You are never too old to set another goal or to dream a new dream.", author: "C.S. Lewis" },
  { text: "Start where you are. Use what you have. Do what you can.", author: "Arthur Ashe" },
  { text: "Action is the foundational key to all success.", author: "Pablo Picasso" },
  { text: "Energy and persistence conquer all things.", author: "Benjamin Franklin" },
  { text: "What you get by achieving your goals is not as important as what you become by achieving them.", author: "Zig Ziglar" },
  { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
  { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
  { text: "Dream big and dare to fail.", author: "Norman Vaughan" },
  { text: "You miss 100% of the shots you don't take.", author: "Wayne Gretzky" },
  { text: "Whether you think you can or think you can't, you're right.", author: "Henry Ford" },
  { text: "The harder I work, the luckier I get.", author: "Samuel Goldwyn" },
  { text: "Opportunities don't happen. You create them.", author: "Chris Grosser" },
  { text: "Don't count the days, make the days count.", author: "Muhammad Ali" },
  { text: "Push yourself, because no one else is going to do it for you.", author: "Unknown" },
  { text: "Great things never come from comfort zones.", author: "Unknown" },
  { text: "Success doesn't just find you. You have to go out and get it.", author: "Unknown" },
  { text: "The key to success is to focus on goals, not obstacles.", author: "Unknown" },
  { text: "Do something today that your future self will thank you for.", author: "Sean Patrick Flanery" },
  { text: "Little things make big days.", author: "Unknown" },
  { text: "It's going to be hard, but hard does not mean impossible.", author: "Unknown" },
  { text: "Don't stop when you're tired. Stop when you're done.", author: "Unknown" },
  { text: "Wake up with determination. Go to bed with satisfaction.", author: "Unknown" },
  { text: "Do what you have to do until you can do what you want to do.", author: "Oprah Winfrey" },
  { text: "The only limit to our realization of tomorrow will be our doubts of today.", author: "Franklin D. Roosevelt" },
  { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
  { text: "Discipline is the bridge between goals and accomplishment.", author: "Jim Rohn" },
  { text: "Motivation gets you going. Habit keeps you growing.", author: "John C. Maxwell" },
  { text: "Small daily improvements over time lead to stunning results.", author: "Robin Sharma" },
  { text: "Your only limit is you.", author: "Unknown" },
];

let currentQuoteIdx = Math.floor(Math.random() * QUOTES.length);

// ── Background particles ───────────────────────────────────────────────────
function initParticles() {
  const container = document.getElementById('bgParticles');
  const colors = ['#6c63ff', '#a78bfa', '#10b981', '#3b82f6', '#f59e0b'];
  for (let i = 0; i < 18; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = 20 + Math.random() * 120;
    p.style.cssText = `
      width:${size}px; height:${size}px;
      left:${Math.random() * 100}%;
      background:${colors[i % colors.length]};
      animation-duration:${12 + Math.random() * 20}s;
      animation-delay:${Math.random() * 12}s;
    `;
    container.appendChild(p);
  }
}

// ── Navigation ─────────────────────────────────────────────────────────────
function navigate(section) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const sec = document.getElementById('section-' + section);
  if (sec) sec.classList.add('active');
  const nav = document.querySelector(`[data-section="${section}"]`);
  if (nav) nav.classList.add('active');
}

// ── Toast ──────────────────────────────────────────────────────────────────
let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}

// ── Modal ──────────────────────────────────────────────────────────────────
function openModal(title, body, footer = '') {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = body;
  document.getElementById('modalFooter').innerHTML = footer;
  document.getElementById('modalOverlay').classList.add('open');
}
function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
}

// ── Date / Greeting ────────────────────────────────────────────────────────
function updateGreeting() {
  const h = new Date().getHours();
  const name = settings.name ? `, ${settings.name}` : '';
  const greet = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  document.getElementById('greeting').textContent = `${greet}${name}! 👋`;
  const opts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  document.getElementById('dateDisplay').textContent = new Date().toLocaleDateString(undefined, opts);
  document.getElementById('journalDate').textContent = new Date().toLocaleDateString(undefined, opts);
}

// ── Quote ──────────────────────────────────────────────────────────────────
function showQuote(idx) {
  const q = QUOTES[idx];
  const el = document.getElementById('quoteText');
  const au = document.getElementById('quoteAuthor');
  el.style.opacity = 0;
  setTimeout(() => {
    el.textContent = `"${q.text}"`;
    au.textContent = `— ${q.author}`;
    el.style.transition = 'opacity .4s';
    el.style.opacity = 1;
  }, 200);
}

function nextQuote() {
  currentQuoteIdx = (currentQuoteIdx + 1) % QUOTES.length;
  showQuote(currentQuoteIdx);
}

function saveQuote() {
  const q = QUOTES[currentQuoteIdx];
  const already = savedQuotes.some(s => s.text === q.text);
  if (already) { showToast('Already saved!'); return; }
  savedQuotes.push(q);
  store.set('fs_savedQuotes', savedQuotes);
  renderSavedQuotes();
  showToast('Quote saved! 🤍');
  document.getElementById('favoriteQuoteBtn').textContent = '❤️ Saved';
  setTimeout(() => document.getElementById('favoriteQuoteBtn').textContent = '🤍 Save', 2000);
}

function renderSavedQuotes() {
  const card = document.getElementById('favQuotesCard');
  const list = document.getElementById('savedQuotesList');
  if (!savedQuotes.length) { card.style.display = 'none'; return; }
  card.style.display = '';
  list.innerHTML = savedQuotes.map((q, i) => `
    <li class="saved-quote-item">
      <span>"${q.text}" — <em>${q.author}</em></span>
      <button class="saved-quote-del" data-idx="${i}">✕</button>
    </li>`).join('');
  list.querySelectorAll('.saved-quote-del').forEach(btn => {
    btn.onclick = () => {
      savedQuotes.splice(+btn.dataset.idx, 1);
      store.set('fs_savedQuotes', savedQuotes);
      renderSavedQuotes();
    };
  });
}

// ── Progress ───────────────────────────────────────────────────────────────
function calcProgress() {
  const todayTasks  = tasks.filter(t => !t.archived);
  const doneTasks   = todayTasks.filter(t => t.done).length;
  const totalTasks  = todayTasks.length;

  const todayHabits = habits.length;
  const doneHabits  = habits.filter(h => (h.log || []).includes(TODAY)).length;

  const items = totalTasks + todayHabits;
  const done  = doneTasks + doneHabits;
  return items === 0 ? 0 : Math.round((done / items) * 100);
}

function updateProgress() {
  const pct = calcProgress();
  const circumference = 314;
  const offset = circumference - (circumference * pct / 100);

  document.getElementById('ringFill').style.strokeDashoffset = offset;
  document.getElementById('ringPct').textContent = pct + '%';
  document.getElementById('sidebarProgress').style.width = pct + '%';
  document.getElementById('sidebarProgressPct').textContent = pct + '%';

  const msgs = [
    [0,  'Start your day strong! 💪'],
    [10, "You've begun — momentum builds! 🚀"],
    [25, "You're making moves. Keep it up! ⚡"],
    [50, "Halfway there — incredible work! 🎯"],
    [75, "Almost done — finish strong! 🔥"],
    [90, "So close to perfect! One more push! 🌟"],
    [100,'Perfect day. You crushed it! 🏆'],
  ];
  const msg = msgs.reduce((a, m) => pct >= m[0] ? m : a, msgs[0]);
  document.getElementById('progressMessage').textContent = msg[1];
}

function updateStats() {
  const todayDone = tasks.filter(t => t.done && t.doneDate === TODAY).length;
  const habitsDone = habits.filter(h => (h.log || []).includes(TODAY)).length;

  if (settings.lastSessionDate !== TODAY) {
    settings.focusMinToday = 0;
    settings.sessionsToday = 0;
    settings.lastSessionDate = TODAY;
    store.set('fs_settings', settings);
  }

  document.getElementById('statTasksDone').textContent = todayDone;
  document.getElementById('statFocusMin').textContent  = settings.focusMinToday || 0;
  document.getElementById('statHabitsDone').textContent= habitsDone;
  document.getElementById('statStreakVal').textContent = settings.streak || 0;
  document.getElementById('sessionsToday').textContent = settings.sessionsToday || 0;
}

// ── Streak ─────────────────────────────────────────────────────────────────
function updateStreak() {
  const last = settings.lastActive;
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (last === TODAY) return;
  if (last === yesterday) {
    settings.streak = (settings.streak || 0) + 1;
  } else if (last && last !== TODAY) {
    settings.streak = 1;
  } else if (!last) {
    settings.streak = 1;
  }
  settings.lastActive = TODAY;
  store.set('fs_settings', settings);
}

// ── Tasks ──────────────────────────────────────────────────────────────────
function saveTasks() { store.set('fs_tasks', tasks); }

function addTask() {
  const input = document.getElementById('taskInput');
  const text = input.value.trim();
  if (!text) { input.focus(); return; }
  tasks.unshift({
    id: Date.now(),
    text,
    priority: document.getElementById('taskPriority').value,
    due: document.getElementById('taskDue').value,
    done: false,
    doneDate: null,
    created: TODAY,
  });
  input.value = '';
  saveTasks();
  renderTasks();
  renderDashTasks();
  updateProgress();
  updateStats();
  showToast('Task added! ✅');
}

function toggleTask(id) {
  const t = tasks.find(t => t.id === id);
  if (!t) return;
  t.done = !t.done;
  t.doneDate = t.done ? TODAY : null;
  saveTasks();
  renderTasks();
  renderDashTasks();
  updateProgress();
  updateStats();
  if (t.done) showToast('Task complete! 🎉');
}

function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  saveTasks();
  renderTasks();
  renderDashTasks();
  updateProgress();
  updateStats();
}

function renderTasks() {
  const filter = document.getElementById('taskFilter').value;
  let pending = tasks.filter(t => !t.done);
  let done    = tasks.filter(t => t.done);

  if (filter === 'pending') { done = []; }
  else if (filter === 'done') { pending = []; }
  else if (filter === 'high') { pending = pending.filter(t => t.priority === 'high'); }

  document.getElementById('pendingCount').textContent = pending.length || '';
  document.getElementById('doneCount').textContent    = done.length || '';

  document.getElementById('taskListPending').innerHTML = pending.length
    ? pending.map(taskHTML).join('')
    : '<li class="empty-state-mini">All clear! Add a task to get started.</li>';

  document.getElementById('taskListDone').innerHTML = done.length
    ? done.map(taskHTML).join('')
    : '<li class="empty-state-mini">No completed tasks yet.</li>';

  document.getElementById('taskBadge').textContent = pending.length || '';

  // Populate timer task select
  const sel = document.getElementById('timerTaskSelect');
  const cur = sel.value;
  sel.innerHTML = '<option value="">— select a task —</option>' +
    pending.map(t => `<option value="${t.id}">${t.text.slice(0,40)}</option>`).join('');
  if (cur) sel.value = cur;
}

function taskHTML(t) {
  const overdue = t.due && t.due < TODAY && !t.done;
  return `<li class="task-item ${t.done ? 'done' : ''} priority-${t.priority}" data-id="${t.id}">
    <div class="task-checkbox ${t.done ? 'checked' : ''}" data-check="${t.id}">${t.done ? '✓' : ''}</div>
    <span class="task-text">${escapeHtml(t.text)}</span>
    <div class="task-meta">
      <span class="priority-badge ${t.priority}">${t.priority}</span>
      ${t.due ? `<span class="task-due ${overdue ? 'overdue' : ''}">${overdue ? '⚠ ' : ''}${t.due}</span>` : ''}
    </div>
    <button class="task-delete" data-del="${t.id}">🗑</button>
  </li>`;
}

function renderDashTasks() {
  const list = document.getElementById('dashTaskList');
  const top = tasks.filter(t => !t.done).slice(0, 5);
  if (!top.length) {
    list.innerHTML = '<li class="empty-state-mini">No tasks yet — add some in Tasks!</li>';
    return;
  }
  list.innerHTML = top.map(t => `
    <li class="mini-task-item priority-${t.priority}">
      <div class="mini-task-dot"></div>
      <span>${escapeHtml(t.text.slice(0, 45))}${t.text.length > 45 ? '…' : ''}</span>
    </li>`).join('');
}

// ── Timer ──────────────────────────────────────────────────────────────────
let timerState = {
  running: false,
  totalSec: 25 * 60,
  remainSec: 25 * 60,
  mode: 'pomodoro',
  interval: null,
};

const TIMER_MODES = { pomodoro: 25, short: 5, long: 15, custom: 25 };
const TIMER_LABELS = { pomodoro: 'Focus', short: 'Short Break', long: 'Long Break', custom: 'Custom Focus' };

function setTimerMode(mode, minutes) {
  stopTimer();
  timerState.mode = mode;
  const mins = minutes || TIMER_MODES[mode] || 25;
  timerState.totalSec = mins * 60;
  timerState.remainSec = mins * 60;
  updateTimerDisplay();
  document.querySelectorAll('.mode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
  document.getElementById('timerModeLabel').textContent = TIMER_LABELS[mode] || 'Focus';
  const ring = document.getElementById('timerRing');
  ring.classList.toggle('break-mode', mode === 'short' || mode === 'long');
  document.getElementById('customTimeRow').style.display = mode === 'custom' ? 'flex' : 'none';
}

function updateTimerDisplay() {
  const m = String(Math.floor(timerState.remainSec / 60)).padStart(2, '0');
  const s = String(timerState.remainSec % 60).padStart(2, '0');
  document.getElementById('timerTime').textContent = `${m}:${s}`;
  const pct = timerState.remainSec / timerState.totalSec;
  const circumference = 603;
  document.getElementById('timerRing').style.strokeDashoffset = circumference * pct;
  document.title = timerState.running ? `${m}:${s} — FlowState` : 'FlowState';
}

function startTimer() {
  if (timerState.running) return;
  timerState.running = true;
  document.getElementById('timerToggle').textContent = 'Pause';
  timerState.interval = setInterval(() => {
    timerState.remainSec--;
    updateTimerDisplay();
    if (timerState.remainSec <= 0) {
      clearInterval(timerState.interval);
      timerState.running = false;
      onTimerComplete();
    }
  }, 1000);
}

function pauseTimer() {
  clearInterval(timerState.interval);
  timerState.running = false;
  document.getElementById('timerToggle').textContent = 'Resume';
}

function stopTimer() {
  clearInterval(timerState.interval);
  timerState.running = false;
  document.getElementById('timerToggle').textContent = 'Start';
}

function resetTimer() {
  stopTimer();
  timerState.remainSec = timerState.totalSec;
  updateTimerDisplay();
  document.getElementById('timerToggle').textContent = 'Start';
}

function onTimerComplete() {
  document.title = 'FlowState';
  document.getElementById('timerToggle').textContent = 'Start';
  const isBreak = timerState.mode === 'short' || timerState.mode === 'long';

  if (!isBreak) {
    const mins = Math.round(timerState.totalSec / 60);
    settings.focusMinToday = (settings.focusMinToday || 0) + mins;
    settings.sessionsToday = (settings.sessionsToday || 0) + 1;
    if (settings.lastSessionDate !== TODAY) { settings.sessionsToday = 1; settings.lastSessionDate = TODAY; }
    store.set('fs_settings', settings);
    updateStats();

    const task = document.getElementById('timerTaskSelect');
    const taskLabel = task.options[task.selectedIndex]?.text || '';
    addSessionLog(mins, taskLabel !== '— select a task —' ? taskLabel : '');
    renderSessionDots();
    showToast('Focus session complete! 🔥 Great work!');
  } else {
    showToast('Break over — back to work! 💪');
  }

  // Auto-reset
  timerState.remainSec = timerState.totalSec;
  updateTimerDisplay();
}

function addSessionLog(mins, task) {
  const log = document.getElementById('sessionLog');
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const empty = log.querySelector('.empty-state-mini');
  if (empty) empty.remove();
  const li = document.createElement('li');
  li.className = 'session-log-item';
  li.innerHTML = `<strong>${mins} min focus</strong>${task ? ` · ${escapeHtml(task)}` : ''}<div class="log-time">${time}</div>`;
  log.prepend(li);
}

function renderSessionDots() {
  const n = settings.sessionsToday || 0;
  document.getElementById('sessionDots').innerHTML =
    Array.from({ length: Math.min(n, 8) }, () => '<span class="session-dot"></span>').join('');
  document.getElementById('sessionsToday').textContent = n;
}

// ── Habits ─────────────────────────────────────────────────────────────────
function saveHabits() { store.set('fs_habits', habits); }

function addHabit() {
  const input = document.getElementById('habitInput');
  const name = input.value.trim();
  if (!name) { input.focus(); return; }
  habits.push({
    id: Date.now(),
    name,
    icon: document.getElementById('habitIcon').value,
    log: [],
    streak: 0,
    created: TODAY,
  });
  input.value = '';
  saveHabits();
  renderHabits();
  renderDashHabits();
  updateProgress();
  showToast('Habit added! 🌱');
}

function toggleHabit(id) {
  const h = habits.find(h => h.id === id);
  if (!h) return;
  const idx = (h.log || []).indexOf(TODAY);
  if (idx === -1) {
    h.log = [...(h.log || []), TODAY];
    h.streak = calcHabitStreak(h);
    showToast(`${h.icon} Habit done! Streak: ${h.streak} 🔥`);
  } else {
    h.log.splice(idx, 1);
    h.streak = calcHabitStreak(h);
  }
  saveHabits();
  renderHabits();
  renderDashHabits();
  updateProgress();
  updateStats();
}

function calcHabitStreak(h) {
  let streak = 0;
  let d = new Date();
  while (true) {
    const ds = d.toISOString().slice(0, 10);
    if ((h.log || []).includes(ds)) { streak++; d.setDate(d.getDate() - 1); }
    else break;
  }
  return streak;
}

function deleteHabit(id) {
  habits = habits.filter(h => h.id !== id);
  saveHabits();
  renderHabits();
  renderDashHabits();
  updateProgress();
  updateStats();
}

function getWeekDays() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 6 + i);
    return { date: d.toISOString().slice(0, 10), label: d.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 1) };
  });
}

function renderHabits() {
  const grid = document.getElementById('habitsGrid');
  if (!habits.length) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-icon">🌱</div><p>No habits yet. Add your first one above!</p></div>`;
    return;
  }
  const week = getWeekDays();
  grid.innerHTML = habits.map(h => {
    const doneToday = (h.log || []).includes(TODAY);
    const streak = h.streak || 0;
    return `<div class="habit-card" data-id="${h.id}">
      <div class="habit-header">
        <span class="habit-icon">${h.icon}</span>
        <span class="habit-title">${escapeHtml(h.name)}</span>
        <span class="habit-streak">${streak > 0 ? '🔥 ' + streak : '0'}</span>
      </div>
      <div class="habit-week">
        ${week.map(w => `
          <div class="habit-day ${(h.log || []).includes(w.date) ? 'done' : ''} ${w.date === TODAY ? 'today' : ''}" title="${w.date}">
            ${w.label}
          </div>`).join('')}
      </div>
      <div class="habit-actions">
        <button class="btn ${doneToday ? 'btn-ghost habit-check-btn completed' : 'btn-primary habit-check-btn'}" data-toggle="${h.id}">
          ${doneToday ? '✓ Done Today' : 'Mark Done'}
        </button>
        <button class="habit-delete" data-del="${h.id}">🗑</button>
      </div>
    </div>`;
  }).join('');
}

function renderDashHabits() {
  const list = document.getElementById('dashHabitList');
  if (!habits.length) {
    list.innerHTML = '<li class="empty-state-mini">No habits yet — start building one!</li>';
    return;
  }
  list.innerHTML = habits.slice(0, 5).map(h => {
    const done = (h.log || []).includes(TODAY);
    const streak = h.streak || 0;
    return `<li class="mini-habit-item">
      <span>${h.icon}</span>
      <span style="${done ? 'text-decoration:line-through;opacity:.6' : ''}">${escapeHtml(h.name.slice(0, 30))}</span>
      ${streak > 0 ? `<span class="streak-chip">🔥 ${streak}</span>` : ''}
    </li>`;
  }).join('');
}

// ── Journal ────────────────────────────────────────────────────────────────
function saveJournal() { store.set('fs_journal', journal); }

function saveJournalEntry() {
  const text = document.getElementById('journalEntry').value.trim();
  if (!text) { showToast('Write something first!'); return; }
  const existing = journal.findIndex(e => e.date === TODAY);
  const entry = { date: TODAY, text, savedAt: new Date().toISOString() };
  if (existing !== -1) journal[existing] = entry;
  else journal.unshift(entry);
  saveJournal();
  renderJournalHistory();
  showToast('Entry saved! 📓');
}

function renderJournalHistory() {
  const list = document.getElementById('journalHistory');
  if (!journal.length) {
    list.innerHTML = '<li class="empty-state-mini">Your entries will appear here.</li>';
    return;
  }
  list.innerHTML = journal.map((e, i) => `
    <li class="journal-entry-item" data-idx="${i}">
      <div class="je-date">${formatDate(e.date)}</div>
      <div class="je-preview">${escapeHtml(e.text)}</div>
    </li>`).join('');

  list.querySelectorAll('.journal-entry-item').forEach(item => {
    item.onclick = () => {
      const e = journal[+item.dataset.idx];
      openModal(formatDate(e.date), `<p style="white-space:pre-wrap;line-height:1.7">${escapeHtml(e.text)}</p>`,
        `<button class="btn btn-ghost" onclick="closeModal()">Close</button>
         <button class="btn btn-danger" onclick="deleteJournalEntry(${item.dataset.idx});closeModal()">Delete</button>`);
    };
  });
}

function deleteJournalEntry(idx) {
  journal.splice(idx, 1);
  saveJournal();
  renderJournalHistory();
}

// Load today's journal entry if exists
function loadTodayJournal() {
  const e = journal.find(e => e.date === TODAY);
  if (e) document.getElementById('journalEntry').value = e.text;
}

// ── Goals ──────────────────────────────────────────────────────────────────
function saveGoals() { store.set('fs_goals', goals); }

function addGoal() {
  const title = document.getElementById('goalTitle').value.trim();
  if (!title) { document.getElementById('goalTitle').focus(); return; }
  goals.unshift({
    id: Date.now(),
    title,
    description: document.getElementById('goalDescription').value.trim(),
    category: document.getElementById('goalCategory').value,
    deadline: document.getElementById('goalDeadline').value,
    progress: 0,
    created: TODAY,
  });
  document.getElementById('goalTitle').value = '';
  document.getElementById('goalDescription').value = '';
  document.getElementById('goalDeadline').value = '';
  saveGoals();
  renderGoals();
  showToast('Goal added! 🎯');
}

function updateGoalProgress(id, val) {
  const g = goals.find(g => g.id === id);
  if (!g) return;
  g.progress = +val;
  saveGoals();
  const bar = document.querySelector(`[data-goal-bar="${id}"]`);
  const pct = document.querySelector(`[data-goal-pct="${id}"]`);
  if (bar) bar.style.width = val + '%';
  if (pct) pct.textContent = val + '%';
  if (+val === 100) showToast('Goal achieved! 🏆🎉');
}

function deleteGoal(id) {
  goals = goals.filter(g => g.id !== id);
  saveGoals();
  renderGoals();
}

const CAT_LABELS = { personal: '🧠 Personal', career: '💼 Career', health: '❤️ Health', finance: '💰 Finance', learning: '📚 Learning', relationships: '🤝 Relationships' };

function renderGoals() {
  const grid = document.getElementById('goalsGrid');
  if (!goals.length) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-icon">🎯</div><p>Dream big. Set your first goal above!</p></div>`;
    return;
  }
  grid.innerHTML = goals.map(g => {
    let dlClass = '', dlText = '';
    if (g.deadline) {
      const daysLeft = Math.ceil((new Date(g.deadline) - new Date()) / 86400000);
      if (daysLeft < 0) { dlClass = 'overdue'; dlText = `⚠ Overdue by ${Math.abs(daysLeft)} days`; }
      else if (daysLeft <= 7) { dlClass = 'soon'; dlText = `⚡ ${daysLeft} days left`; }
      else dlText = `📅 Due ${g.deadline}`;
    }
    return `<div class="goal-card" data-category="${g.category}" data-id="${g.id}">
      <div class="goal-cat-badge">${CAT_LABELS[g.category] || g.category}</div>
      <div class="goal-title">${escapeHtml(g.title)}</div>
      ${g.description ? `<div class="goal-desc">${escapeHtml(g.description)}</div>` : ''}
      ${dlText ? `<div class="goal-deadline ${dlClass}">${dlText}</div>` : ''}
      <div class="goal-progress-row">
        <div class="goal-progress-bar"><div class="goal-progress-fill" data-goal-bar="${g.id}" style="width:${g.progress}%"></div></div>
        <span class="goal-progress-pct" data-goal-pct="${g.id}">${g.progress}%</span>
      </div>
      <div class="goal-actions">
        <input type="range" class="goal-slider" min="0" max="100" value="${g.progress}" data-gslider="${g.id}" />
        <button class="btn btn-danger btn-sm" data-gdel="${g.id}">✕</button>
      </div>
    </div>`;
  }).join('');
}

// ── Helpers ────────────────────────────────────────────────────────────────
function escapeHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function formatDate(d) {
  return new Date(d + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
}

// ── Name modal ─────────────────────────────────────────────────────────────
function showNameModal() {
  openModal('What\'s your name?',
    `<input type="text" class="text-input" id="nameInput" value="${escapeHtml(settings.name || '')}" placeholder="Enter your name" style="width:100%" maxlength="30" />`,
    `<button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
     <button class="btn btn-primary" onclick="saveName()">Save</button>`);
  setTimeout(() => document.getElementById('nameInput')?.focus(), 100);
}

function saveName() {
  const val = document.getElementById('nameInput')?.value.trim() || '';
  settings.name = val;
  store.set('fs_settings', settings);
  updateGreeting();
  closeModal();
  showToast('Name saved! 👋');
}

// ── Event listeners ────────────────────────────────────────────────────────
function attachEvents() {
  // Navigation
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', e => { e.preventDefault(); navigate(item.dataset.section); });
  });
  document.querySelectorAll('[data-nav]').forEach(btn => {
    btn.addEventListener('click', () => navigate(btn.dataset.nav));
  });

  // Quote
  document.getElementById('newQuoteBtn').addEventListener('click', nextQuote);
  document.getElementById('favoriteQuoteBtn').addEventListener('click', saveQuote);

  // Name
  document.getElementById('nameBtn').addEventListener('click', showNameModal);

  // Tasks
  document.getElementById('addTaskBtn').addEventListener('click', addTask);
  document.getElementById('taskInput').addEventListener('keydown', e => { if (e.key === 'Enter') addTask(); });
  document.getElementById('taskFilter').addEventListener('change', renderTasks);

  document.getElementById('doneHeader').addEventListener('click', () => {
    const list = document.getElementById('taskListDone');
    list.classList.toggle('collapsed');
    document.querySelector('#doneHeader .chevron').style.transform =
      list.classList.contains('collapsed') ? 'rotate(-90deg)' : 'rotate(0)';
  });

  // Task delegation (check / delete)
  document.querySelectorAll('#taskListPending, #taskListDone').forEach(list => {
    list.addEventListener('click', e => {
      const check = e.target.closest('[data-check]');
      const del   = e.target.closest('[data-del]');
      if (check) toggleTask(+check.dataset.check);
      if (del)   deleteTask(+del.dataset.del);
    });
  });

  // Timer modes
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => setTimerMode(btn.dataset.mode, +btn.dataset.minutes));
  });
  document.getElementById('applyCustom').addEventListener('click', () => {
    const m = Math.max(1, Math.min(180, +document.getElementById('customMinutes').value || 25));
    setTimerMode('custom', m);
  });
  document.getElementById('timerToggle').addEventListener('click', () => {
    if (timerState.running) pauseTimer(); else startTimer();
  });
  document.getElementById('timerReset').addEventListener('click', resetTimer);
  document.getElementById('timerSkip').addEventListener('click', () => { stopTimer(); timerState.remainSec = 0; onTimerComplete(); });

  // Habits
  document.getElementById('addHabitBtn').addEventListener('click', addHabit);
  document.getElementById('habitInput').addEventListener('keydown', e => { if (e.key === 'Enter') addHabit(); });
  document.getElementById('habitsGrid').addEventListener('click', e => {
    const toggle = e.target.closest('[data-toggle]');
    const del    = e.target.closest('[data-del]');
    if (toggle) toggleHabit(+toggle.dataset.toggle);
    if (del)    deleteHabit(+del.dataset.del);
  });

  // Journal prompts
  document.querySelectorAll('.prompt-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const ta = document.getElementById('journalEntry');
      const cur = ta.value;
      ta.value = cur ? cur + '\n\n' + chip.dataset.prompt + '\n' : chip.dataset.prompt + '\n';
      ta.focus();
      ta.setSelectionRange(ta.value.length, ta.value.length);
    });
  });
  document.getElementById('journalEntry').addEventListener('input', () => {
    const words = document.getElementById('journalEntry').value.trim().split(/\s+/).filter(Boolean).length;
    document.getElementById('wordCount').textContent = words + (words === 1 ? ' word' : ' words');
  });
  document.getElementById('saveJournalBtn').addEventListener('click', saveJournalEntry);

  // Goals
  document.getElementById('addGoalBtn').addEventListener('click', addGoal);
  document.getElementById('goalTitle').addEventListener('keydown', e => { if (e.key === 'Enter') addGoal(); });
  document.getElementById('goalsGrid').addEventListener('input', e => {
    const slider = e.target.closest('[data-gslider]');
    if (slider) updateGoalProgress(+slider.dataset.gslider, slider.value);
  });
  document.getElementById('goalsGrid').addEventListener('click', e => {
    const del = e.target.closest('[data-gdel]');
    if (del) deleteGoal(+del.dataset.gdel);
  });

  // Modal close
  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('modalOverlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modalOverlay')) closeModal();
  });
}

// ── Auto-save journal on typing ────────────────────────────────────────────
let journalAutoSave;
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('journalEntry')?.addEventListener('input', () => {
    clearTimeout(journalAutoSave);
    journalAutoSave = setTimeout(() => {
      const text = document.getElementById('journalEntry').value.trim();
      if (text) saveJournalEntry();
    }, 3000);
  });
});

// ── Init ───────────────────────────────────────────────────────────────────
function init() {
  initParticles();
  updateStreak();
  updateGreeting();
  showQuote(currentQuoteIdx);
  renderSavedQuotes();
  renderTasks();
  renderDashTasks();
  renderHabits();
  renderDashHabits();
  renderJournalHistory();
  renderGoals();
  loadTodayJournal();
  updateTimerDisplay();
  renderSessionDots();
  updateProgress();
  updateStats();
  attachEvents();

  // Auto-rotate quote every 30s
  setInterval(nextQuote, 30000);

  // Refresh greeting every minute
  setInterval(updateGreeting, 60000);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
