/* ===== FlowState App — Full Interactive Edition ===== */
'use strict';

// ── Storage ────────────────────────────────────────────────────────────────
const store = {
  get: (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

// ── State ──────────────────────────────────────────────────────────────────
let tasks       = store.get('fs_tasks', []);
let habits      = store.get('fs_habits', []);
let goals       = store.get('fs_goals', []);
let journal     = store.get('fs_journal', []);
let savedQuotes = store.get('fs_savedQuotes', []);
let dailyLog    = store.get('fs_dailyLog', []);
let settings    = store.get('fs_settings', { name: '', streak: 0, lastActive: '', focusMinToday: 0, sessionsToday: 0, lastSessionDate: '', soundOn: true, demoLoaded: false });

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
  { text: "Do something today that your future self will thank you for.", author: "Sean Patrick Flanery" },
  { text: "Don't stop when you're tired. Stop when you're done.", author: "Unknown" },
  { text: "Wake up with determination. Go to bed with satisfaction.", author: "Unknown" },
  { text: "Do what you have to do until you can do what you want to do.", author: "Oprah Winfrey" },
  { text: "The only limit to our realization of tomorrow will be our doubts of today.", author: "Franklin D. Roosevelt" },
  { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
  { text: "Discipline is the bridge between goals and accomplishment.", author: "Jim Rohn" },
  { text: "Motivation gets you going. Habit keeps you growing.", author: "John C. Maxwell" },
  { text: "Small daily improvements over time lead to stunning results.", author: "Robin Sharma" },
];

let currentQuoteIdx = Math.floor(Math.random() * QUOTES.length);

// ═══════════════════════════════════════════════════════════════════════════
// SOUND ENGINE (Web Audio API)
// ═══════════════════════════════════════════════════════════════════════════
let audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playTone(freq, type, duration, volume = 0.15, delay = 0) {
  if (!settings.soundOn) return;
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
    gain.gain.setValueAtTime(0, ctx.currentTime + delay);
    gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + delay + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + duration);
    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + duration);
  } catch {}
}

const sounds = {
  tick:     () => playTone(880, 'sine', 0.06, 0.08),
  complete: () => { playTone(523, 'sine', 0.12, 0.15); playTone(659, 'sine', 0.12, 0.15, 0.1); playTone(784, 'sine', 0.2, 0.15, 0.2); },
  habit:    () => { playTone(440, 'sine', 0.1, 0.12); playTone(554, 'sine', 0.15, 0.12, 0.08); },
  add:      () => playTone(660, 'sine', 0.08, 0.1),
  timer:    () => { [523,659,784,1047].forEach((f,i) => playTone(f,'sine',0.25,0.18,i*0.12)); },
  delete:   () => playTone(220, 'sawtooth', 0.06, 0.06),
  save:     () => { playTone(392, 'sine', 0.1, 0.1); playTone(494, 'sine', 0.12, 0.1, 0.1); },
};

// ═══════════════════════════════════════════════════════════════════════════
// CONFETTI ENGINE
// ═══════════════════════════════════════════════════════════════════════════
const confettiCanvas = document.getElementById('confettiCanvas');
const cCtx = confettiCanvas.getContext('2d');
let confettiParticles = [];
let confettiAnimId = null;

function resizeConfettiCanvas() {
  confettiCanvas.width  = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
}
resizeConfettiCanvas();
window.addEventListener('resize', resizeConfettiCanvas);

const CONFETTI_COLORS = ['#6c63ff','#a78bfa','#10b981','#f59e0b','#ef4444','#3b82f6','#ec4899','#fbbf24','#34d399','#60a5fa'];

function confettiBurst(x, y, count = 80) {
  for (let i = 0; i < count; i++) {
    const angle = (Math.random() * Math.PI * 2);
    const speed = 3 + Math.random() * 8;
    confettiParticles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - (Math.random() * 4),
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      size: 4 + Math.random() * 7,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.3,
      gravity: 0.25 + Math.random() * 0.15,
      life: 1,
      decay: 0.012 + Math.random() * 0.008,
      shape: Math.random() > 0.5 ? 'rect' : 'circle',
    });
  }
  if (!confettiAnimId) animateConfetti();
}

function animateConfetti() {
  cCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  confettiParticles = confettiParticles.filter(p => p.life > 0);
  confettiParticles.forEach(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += p.gravity;
    p.vx *= 0.99;
    p.rotation += p.rotationSpeed;
    p.life -= p.decay;
    cCtx.save();
    cCtx.globalAlpha = Math.max(0, p.life);
    cCtx.translate(p.x, p.y);
    cCtx.rotate(p.rotation);
    cCtx.fillStyle = p.color;
    if (p.shape === 'rect') {
      cCtx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
    } else {
      cCtx.beginPath();
      cCtx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
      cCtx.fill();
    }
    cCtx.restore();
  });
  if (confettiParticles.length > 0) {
    confettiAnimId = requestAnimationFrame(animateConfetti);
  } else {
    confettiAnimId = null;
    cCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  }
}

function confettiAt(el, count = 80) {
  const rect = el ? el.getBoundingClientRect() : { left: window.innerWidth/2, top: window.innerHeight/2, width: 0, height: 0 };
  confettiBurst(rect.left + rect.width / 2, rect.top + rect.height / 2, count);
}

// ═══════════════════════════════════════════════════════════════════════════
// ANIMATED COUNTER
// ═══════════════════════════════════════════════════════════════════════════
function animateCounter(el, from, to, duration = 600) {
  if (!el) return;
  const start = performance.now();
  const range = to - from;
  const step = (now) => {
    const t = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - t, 3);
    el.textContent = Math.round(from + range * ease);
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// ═══════════════════════════════════════════════════════════════════════════
// WIN POPUP
// ═══════════════════════════════════════════════════════════════════════════
function showWin(msg) {
  const el = document.getElementById('winPopup');
  el.textContent = msg;
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 900);
}

// ═══════════════════════════════════════════════════════════════════════════
// TOAST
// ═══════════════════════════════════════════════════════════════════════════
let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
}

// ═══════════════════════════════════════════════════════════════════════════
// MODAL
// ═══════════════════════════════════════════════════════════════════════════
function openModal(title, body, footer = '') {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = body;
  document.getElementById('modalFooter').innerHTML = footer;
  document.getElementById('modalOverlay').classList.add('open');
}
function closeModal() { document.getElementById('modalOverlay').classList.remove('open'); }

// ═══════════════════════════════════════════════════════════════════════════
// BACKGROUND PARTICLES
// ═══════════════════════════════════════════════════════════════════════════
function initParticles() {
  const container = document.getElementById('bgParticles');
  const colors = ['#6c63ff','#a78bfa','#10b981','#3b82f6','#f59e0b'];
  for (let i = 0; i < 18; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = 20 + Math.random() * 120;
    p.style.cssText = `width:${size}px;height:${size}px;left:${Math.random()*100}%;background:${colors[i%colors.length]};animation-duration:${12+Math.random()*20}s;animation-delay:${Math.random()*12}s;`;
    container.appendChild(p);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════════════════════════════════
function navigate(section) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const sec = document.getElementById('section-' + section);
  if (sec) sec.classList.add('active');
  const nav = document.querySelector(`[data-section="${section}"]`);
  if (nav) nav.classList.add('active');
  if (section === 'analytics') renderAnalytics();
}

// ═══════════════════════════════════════════════════════════════════════════
// DATE / GREETING
// ═══════════════════════════════════════════════════════════════════════════
function updateGreeting() {
  const h = new Date().getHours();
  const name = settings.name ? `, ${settings.name}` : '';
  const greet = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  document.getElementById('greeting').textContent = `${greet}${name}! 👋`;
  const opts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  document.getElementById('dateDisplay').textContent = new Date().toLocaleDateString(undefined, opts);
  document.getElementById('journalDate').textContent = new Date().toLocaleDateString(undefined, opts);
}

// ═══════════════════════════════════════════════════════════════════════════
// QUOTE
// ═══════════════════════════════════════════════════════════════════════════
function showQuote(idx) {
  const q = QUOTES[idx];
  const el = document.getElementById('quoteText');
  el.style.opacity = 0;
  setTimeout(() => {
    el.textContent = `"${q.text}"`;
    document.getElementById('quoteAuthor').textContent = `— ${q.author}`;
    el.style.transition = 'opacity .4s';
    el.style.opacity = 1;
  }, 200);
}
function nextQuote() { currentQuoteIdx = (currentQuoteIdx + 1) % QUOTES.length; showQuote(currentQuoteIdx); }
function saveQuote() {
  const q = QUOTES[currentQuoteIdx];
  if (savedQuotes.some(s => s.text === q.text)) { showToast('Already saved!'); return; }
  savedQuotes.push(q);
  store.set('fs_savedQuotes', savedQuotes);
  renderSavedQuotes();
  showToast('Quote saved! 🤍');
  sounds.save();
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
      <span>"${escapeHtml(q.text)}" — <em>${escapeHtml(q.author)}</em></span>
      <button class="saved-quote-del" data-idx="${i}">✕</button>
    </li>`).join('');
  list.querySelectorAll('.saved-quote-del').forEach(btn => {
    btn.onclick = () => { savedQuotes.splice(+btn.dataset.idx, 1); store.set('fs_savedQuotes', savedQuotes); renderSavedQuotes(); };
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// DAILY LOG — for charts
// ═══════════════════════════════════════════════════════════════════════════
function updateDailyLog() {
  const idx = dailyLog.findIndex(e => e.date === TODAY);
  const entry = {
    date: TODAY,
    tasks:    tasks.filter(t => t.done && t.doneDate === TODAY).length,
    focusMin: settings.lastSessionDate === TODAY ? (settings.focusMinToday || 0) : 0,
    habits:   habits.filter(h => (h.log || []).includes(TODAY)).length,
    journal:  (() => { const j = journal.find(e => e.date === TODAY); return j ? j.text.trim().split(/\s+/).filter(Boolean).length : 0; })(),
  };
  if (idx !== -1) dailyLog[idx] = entry;
  else dailyLog.push(entry);
  store.set('fs_dailyLog', dailyLog);
}

function getLogForDate(date) {
  return dailyLog.find(e => e.date === date) || { date, tasks: 0, focusMin: 0, habits: 0, journal: 0 };
}

function getLast(n) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (n - 1 - i));
    return getLogForDate(d.toISOString().slice(0, 10));
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// DEMO DATA
// ═══════════════════════════════════════════════════════════════════════════
function loadDemoData() {
  const existing = dailyLog.filter(e => !e._demo);
  const demo = [];
  for (let i = 83; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    if (existing.find(e => e.date === dateStr)) continue;
    const active = Math.random() > 0.15;
    demo.push({
      date: dateStr,
      tasks:    active ? Math.floor(Math.random() * 8) + 1 : 0,
      focusMin: active ? Math.floor(Math.random() * 120) + 10 : 0,
      habits:   active ? Math.floor(Math.random() * 4) + 1 : 0,
      journal:  active && Math.random() > 0.5 ? Math.floor(Math.random() * 300) + 50 : 0,
      _demo: true,
    });
  }
  dailyLog = [...existing, ...demo];
  store.set('fs_dailyLog', dailyLog);
  settings.demoLoaded = true;
  store.set('fs_settings', settings);
  document.getElementById('demoDataBtn').style.display = 'none';
  document.getElementById('clearDemoBtn').style.display = '';
  renderAnalytics();
  showToast('Demo data loaded! 🎲');
}

function clearDemoData() {
  dailyLog = dailyLog.filter(e => !e._demo);
  store.set('fs_dailyLog', dailyLog);
  settings.demoLoaded = false;
  store.set('fs_settings', settings);
  document.getElementById('demoDataBtn').style.display = '';
  document.getElementById('clearDemoBtn').style.display = 'none';
  renderAnalytics();
  showToast('Demo data cleared.');
}

// ═══════════════════════════════════════════════════════════════════════════
// PROGRESS & STATS
// ═══════════════════════════════════════════════════════════════════════════
function calcProgress() {
  const totalTasks  = tasks.filter(t => !t.archived).length;
  const doneTasks   = tasks.filter(t => t.done).length;
  const totalHabits = habits.length;
  const doneHabits  = habits.filter(h => (h.log || []).includes(TODAY)).length;
  const items = totalTasks + totalHabits;
  const done  = doneTasks + doneHabits;
  return items === 0 ? 0 : Math.round((done / items) * 100);
}

function updateProgress() {
  const pct = calcProgress();
  const offset = 314 - (314 * pct / 100);
  document.getElementById('ringFill').style.strokeDashoffset = offset;
  document.getElementById('ringPct').textContent = pct + '%';
  document.getElementById('sidebarProgress').style.width = pct + '%';
  document.getElementById('sidebarProgressPct').textContent = pct + '%';
  const msgs = [[0,'Start your day strong! 💪'],[10,"You've begun — momentum builds! 🚀"],[25,"You're making moves. Keep it up! ⚡"],[50,"Halfway there — incredible work! 🎯"],[75,"Almost done — finish strong! 🔥"],[90,"So close to perfect! One more push! 🌟"],[100,'Perfect day. You crushed it! 🏆']];
  document.getElementById('progressMessage').textContent = msgs.reduce((a, m) => pct >= m[0] ? m : a, msgs[0])[1];
  updateDailyLog();
}

function updateStats(animate = false) {
  if (settings.lastSessionDate !== TODAY) {
    settings.focusMinToday = 0;
    settings.sessionsToday = 0;
    settings.lastSessionDate = TODAY;
    store.set('fs_settings', settings);
  }
  const todayDone  = tasks.filter(t => t.done && t.doneDate === TODAY).length;
  const habitsDone = habits.filter(h => (h.log || []).includes(TODAY)).length;
  const focusMin   = settings.focusMinToday || 0;
  const streak     = settings.streak || 0;

  const ids = ['statTasksDone','statFocusMin','statHabitsDone','statStreakVal'];
  const vals = [todayDone, focusMin, habitsDone, streak];
  ids.forEach((id, i) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (animate) {
      const prev = parseInt(el.textContent) || 0;
      animateCounter(el, prev, vals[i]);
    } else {
      el.textContent = vals[i];
    }
  });
  document.getElementById('sessionsToday').textContent = settings.sessionsToday || 0;
}

function updateStreak() {
  const last = settings.lastActive;
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (last === TODAY) return;
  settings.streak = last === yesterday ? (settings.streak || 0) + 1 : 1;
  settings.lastActive = TODAY;
  store.set('fs_settings', settings);
}

// ═══════════════════════════════════════════════════════════════════════════
// TASKS
// ═══════════════════════════════════════════════════════════════════════════
function saveTasks() { store.set('fs_tasks', tasks); }

function addTask() {
  const input = document.getElementById('taskInput');
  const text = input.value.trim();
  if (!text) { input.focus(); return; }
  tasks.unshift({ id: Date.now(), text, priority: document.getElementById('taskPriority').value, due: document.getElementById('taskDue').value, done: false, doneDate: null, created: TODAY });
  input.value = '';
  saveTasks();
  renderTasks();
  renderDashTasks();
  updateProgress();
  updateStats(true);
  sounds.add();
  showToast('Task added! ✅');
}

function toggleTask(id, el) {
  const t = tasks.find(t => t.id === id);
  if (!t) return;
  const wasDone = t.done;
  t.done = !t.done;
  t.doneDate = t.done ? TODAY : null;
  saveTasks();
  renderTasks();
  renderDashTasks();
  updateProgress();
  updateStats(true);
  if (t.done) {
    sounds.complete();
    confettiAt(el, 60);
    showWin('Task Complete! 🎉');
    updateDailyLog();
  } else {
    sounds.tick();
  }
}

function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  saveTasks();
  renderTasks();
  renderDashTasks();
  updateProgress();
  updateStats(true);
  sounds.delete();
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
  document.getElementById('taskBadge').textContent    = pending.length || '';

  const pendingList = document.getElementById('taskListPending');
  const doneList    = document.getElementById('taskListDone');

  pendingList.innerHTML = pending.length ? pending.map(taskHTML).join('') : '<li class="empty-state-mini">All clear! Add a task to get started.</li>';
  doneList.innerHTML    = done.length    ? done.map(taskHTML).join('')    : '<li class="empty-state-mini">No completed tasks yet.</li>';

  initTaskDragDrop(pendingList);

  const sel = document.getElementById('timerTaskSelect');
  const cur = sel.value;
  sel.innerHTML = '<option value="">— select a task —</option>' + pending.map(t => `<option value="${t.id}">${escapeHtml(t.text.slice(0, 40))}</option>`).join('');
  if (cur) sel.value = cur;
}

function taskHTML(t) {
  const overdue = t.due && t.due < TODAY && !t.done;
  return `<li class="task-item ${t.done ? 'done' : ''} priority-${t.priority}" data-id="${t.id}" draggable="true">
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
  list.innerHTML = top.length
    ? top.map(t => `<li class="mini-task-item priority-${t.priority}"><div class="mini-task-dot"></div><span>${escapeHtml(t.text.slice(0, 45))}${t.text.length > 45 ? '…' : ''}</span></li>`).join('')
    : '<li class="empty-state-mini">No tasks yet — add some in Tasks!</li>';
}

// ── Drag & Drop ────────────────────────────────────────────────────────────
let dragSrcId = null;

function initTaskDragDrop(list) {
  list.addEventListener('dragstart', e => {
    const li = e.target.closest('.task-item');
    if (!li) return;
    dragSrcId = +li.dataset.id;
    setTimeout(() => li.classList.add('dragging'), 0);
  });
  list.addEventListener('dragend', e => {
    const li = e.target.closest('.task-item');
    if (li) li.classList.remove('dragging');
    list.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
  });
  list.addEventListener('dragover', e => {
    e.preventDefault();
    const li = e.target.closest('.task-item');
    if (!li || +li.dataset.id === dragSrcId) return;
    list.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    li.classList.add('drag-over');
  });
  list.addEventListener('drop', e => {
    e.preventDefault();
    const li = e.target.closest('.task-item');
    if (!li || +li.dataset.id === dragSrcId) return;
    const srcIdx  = tasks.findIndex(t => t.id === dragSrcId);
    const destIdx = tasks.findIndex(t => t.id === +li.dataset.id);
    if (srcIdx === -1 || destIdx === -1) return;
    const [removed] = tasks.splice(srcIdx, 1);
    tasks.splice(destIdx, 0, removed);
    saveTasks();
    renderTasks();
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// FOCUS TIMER
// ═══════════════════════════════════════════════════════════════════════════
const timerState = { running: false, totalSec: 25*60, remainSec: 25*60, mode: 'pomodoro', interval: null };
const TIMER_LABELS = { pomodoro: 'Focus', short: 'Short Break', long: 'Long Break', custom: 'Custom' };

function setTimerMode(mode, minutes) {
  stopTimer();
  timerState.mode = mode;
  const mins = minutes || 25;
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
  document.getElementById('timerRing').style.strokeDashoffset = 603 * pct;
  document.title = timerState.running ? `${m}:${s} — FlowState` : 'FlowState';
}

function startTimer() {
  if (timerState.running) return;
  timerState.running = true;
  document.getElementById('timerToggle').textContent = 'Pause';
  document.getElementById('timerRing').classList.add('running');
  sounds.tick();
  timerState.interval = setInterval(() => {
    timerState.remainSec--;
    updateTimerDisplay();
    if (timerState.remainSec <= 0) { clearInterval(timerState.interval); timerState.running = false; onTimerComplete(); }
  }, 1000);
}

function pauseTimer() {
  clearInterval(timerState.interval);
  timerState.running = false;
  document.getElementById('timerToggle').textContent = 'Resume';
  document.getElementById('timerRing').classList.remove('running');
}

function stopTimer() {
  clearInterval(timerState.interval);
  timerState.running = false;
  document.getElementById('timerToggle').textContent = 'Start';
  document.getElementById('timerRing').classList.remove('running');
}

function resetTimer() {
  stopTimer();
  timerState.remainSec = timerState.totalSec;
  updateTimerDisplay();
}

function onTimerComplete() {
  document.title = 'FlowState';
  document.getElementById('timerRing').classList.remove('running');
  const isBreak = timerState.mode === 'short' || timerState.mode === 'long';
  if (!isBreak) {
    const mins = Math.round(timerState.totalSec / 60);
    if (settings.lastSessionDate !== TODAY) { settings.focusMinToday = 0; settings.sessionsToday = 0; }
    settings.focusMinToday  = (settings.focusMinToday || 0) + mins;
    settings.sessionsToday  = (settings.sessionsToday || 0) + 1;
    settings.lastSessionDate = TODAY;
    store.set('fs_settings', settings);
    updateStats(true);
    updateDailyLog();
    const task = document.getElementById('timerTaskSelect');
    const lbl  = task.options[task.selectedIndex]?.text || '';
    addSessionLog(mins, lbl !== '— select a task —' ? lbl : '');
    renderSessionDots();
    sounds.timer();
    confettiBurst(window.innerWidth / 2, window.innerHeight / 3, 120);
    showWin(`🔥 ${mins} min focus done!`);
    showToast(`Focus session complete! Great work! 🔥`);
  } else {
    sounds.tick();
    showToast('Break over — back to it! 💪');
  }
  timerState.remainSec = timerState.totalSec;
  updateTimerDisplay();
}

function addSessionLog(mins, task) {
  const log  = document.getElementById('sessionLog');
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
  document.getElementById('sessionDots').innerHTML = Array.from({ length: Math.min(n, 8) }, () => '<span class="session-dot"></span>').join('');
  document.getElementById('sessionsToday').textContent = n;
}

// ═══════════════════════════════════════════════════════════════════════════
// HABITS
// ═══════════════════════════════════════════════════════════════════════════
function saveHabits() { store.set('fs_habits', habits); }

function addHabit() {
  const input = document.getElementById('habitInput');
  const name = input.value.trim();
  if (!name) { input.focus(); return; }
  habits.push({ id: Date.now(), name, icon: document.getElementById('habitIcon').value, log: [], streak: 0, created: TODAY });
  input.value = '';
  saveHabits();
  renderHabits();
  renderDashHabits();
  sounds.add();
  showToast('Habit added! 🌱');
}

function toggleHabit(id, el) {
  const h = habits.find(h => h.id === id);
  if (!h) return;
  const idx = (h.log || []).indexOf(TODAY);
  if (idx === -1) {
    h.log = [...(h.log || []), TODAY];
    h.streak = calcHabitStreak(h);
    sounds.habit();
    confettiAt(el, 50);
    showWin(`${h.icon} Streak: ${h.streak}! 🔥`);
    if (el) { const card = el.closest('.habit-card'); if (card) { card.classList.remove('just-done'); void card.offsetWidth; card.classList.add('just-done'); } }
  } else {
    h.log.splice(idx, 1);
    h.streak = calcHabitStreak(h);
  }
  saveHabits();
  renderHabits();
  renderDashHabits();
  updateProgress();
  updateStats(true);
  updateDailyLog();
}

function calcHabitStreak(h) {
  let streak = 0;
  const d = new Date();
  while (true) {
    if ((h.log || []).includes(d.toISOString().slice(0, 10))) { streak++; d.setDate(d.getDate() - 1); }
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
  updateStats(true);
  sounds.delete();
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
  if (!habits.length) { grid.innerHTML = `<div class="empty-state"><div class="empty-icon">🌱</div><p>No habits yet. Add your first one above!</p></div>`; return; }
  const week = getWeekDays();
  grid.innerHTML = habits.map(h => {
    const doneToday = (h.log || []).includes(TODAY);
    return `<div class="habit-card" data-id="${h.id}">
      <div class="habit-header">
        <span class="habit-icon">${h.icon}</span>
        <span class="habit-title">${escapeHtml(h.name)}</span>
        <span class="habit-streak">${(h.streak||0) > 0 ? '🔥 ' + h.streak : '0'}</span>
      </div>
      <div class="habit-week">
        ${week.map(w => `<div class="habit-day ${(h.log||[]).includes(w.date)?'done':''} ${w.date===TODAY?'today':''}" title="${w.date}">${w.label}</div>`).join('')}
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
  if (!habits.length) { list.innerHTML = '<li class="empty-state-mini">No habits yet — start building one!</li>'; return; }
  list.innerHTML = habits.slice(0, 5).map(h => {
    const done = (h.log || []).includes(TODAY);
    return `<li class="mini-habit-item">
      <span>${h.icon}</span>
      <span style="${done ? 'text-decoration:line-through;opacity:.6' : ''}">${escapeHtml(h.name.slice(0, 30))}</span>
      ${(h.streak||0) > 0 ? `<span class="streak-chip">🔥 ${h.streak}</span>` : ''}
    </li>`;
  }).join('');
}

// ═══════════════════════════════════════════════════════════════════════════
// JOURNAL
// ═══════════════════════════════════════════════════════════════════════════
function saveJournalEntry() {
  const text = document.getElementById('journalEntry').value.trim();
  if (!text) { showToast('Write something first!'); return; }
  const existing = journal.findIndex(e => e.date === TODAY);
  const entry = { date: TODAY, text, savedAt: new Date().toISOString() };
  if (existing !== -1) journal[existing] = entry;
  else journal.unshift(entry);
  store.set('fs_journal', journal);
  renderJournalHistory();
  updateDailyLog();
  sounds.save();
  showToast('Entry saved! 📓');
}

function renderJournalHistory() {
  const list = document.getElementById('journalHistory');
  if (!journal.length) { list.innerHTML = '<li class="empty-state-mini">Your entries will appear here.</li>'; return; }
  list.innerHTML = journal.map((e, i) => `
    <li class="journal-entry-item" data-idx="${i}">
      <div class="je-date">${formatDate(e.date)}</div>
      <div class="je-preview">${escapeHtml(e.text)}</div>
    </li>`).join('');
  list.querySelectorAll('.journal-entry-item').forEach(item => {
    item.onclick = () => {
      const e = journal[+item.dataset.idx];
      openModal(formatDate(e.date), `<p style="white-space:pre-wrap;line-height:1.7">${escapeHtml(e.text)}</p>`,
        `<button class="btn btn-ghost" onclick="closeModal()">Close</button><button class="btn btn-danger" onclick="deleteJournalEntry(${item.dataset.idx});closeModal()">Delete</button>`);
    };
  });
}

function deleteJournalEntry(idx) { journal.splice(idx, 1); store.set('fs_journal', journal); renderJournalHistory(); }
function loadTodayJournal() { const e = journal.find(e => e.date === TODAY); if (e) document.getElementById('journalEntry').value = e.text; }

// ═══════════════════════════════════════════════════════════════════════════
// GOALS
// ═══════════════════════════════════════════════════════════════════════════
function saveGoals() { store.set('fs_goals', goals); }
const CAT_LABELS = { personal:'🧠 Personal', career:'💼 Career', health:'❤️ Health', finance:'💰 Finance', learning:'📚 Learning', relationships:'🤝 Relationships' };

function addGoal() {
  const title = document.getElementById('goalTitle').value.trim();
  if (!title) { document.getElementById('goalTitle').focus(); return; }
  goals.unshift({ id: Date.now(), title, description: document.getElementById('goalDescription').value.trim(), category: document.getElementById('goalCategory').value, deadline: document.getElementById('goalDeadline').value, progress: 0, created: TODAY });
  ['goalTitle','goalDescription','goalDeadline'].forEach(id => document.getElementById(id).value = '');
  saveGoals();
  renderGoals();
  sounds.add();
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
  if (+val === 100) {
    sounds.complete();
    const el = document.querySelector(`[data-goal-bar="${id}"]`);
    confettiAt(el, 100);
    showWin('Goal Achieved! 🏆');
    showToast('Goal achieved! 🏆🎉');
  }
}

function deleteGoal(id) { goals = goals.filter(g => g.id !== id); saveGoals(); renderGoals(); sounds.delete(); }

function renderGoals() {
  const grid = document.getElementById('goalsGrid');
  if (!goals.length) { grid.innerHTML = `<div class="empty-state"><div class="empty-icon">🎯</div><p>Dream big. Set your first goal above!</p></div>`; return; }
  grid.innerHTML = goals.map(g => {
    let dlClass = '', dlText = '';
    if (g.deadline) {
      const days = Math.ceil((new Date(g.deadline) - new Date()) / 86400000);
      if (days < 0) { dlClass = 'overdue'; dlText = `⚠ Overdue by ${Math.abs(days)} days`; }
      else if (days <= 7) { dlClass = 'soon'; dlText = `⚡ ${days} days left`; }
      else dlText = `📅 Due ${g.deadline}`;
    }
    return `<div class="goal-card" data-category="${g.category}" data-id="${g.id}">
      <div class="goal-cat-badge">${CAT_LABELS[g.category]||g.category}</div>
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

// ═══════════════════════════════════════════════════════════════════════════
// ── ANALYTICS & CHARTS ────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
const CHART_COLORS = { accent: '#6c63ff', gold: '#f59e0b', green: '#10b981', blue: '#3b82f6', border: '#2e3650', text2: '#9aa3be', text3: '#5c667a', surface2: '#252b3b', bg3: '#1a1f2e' };

function setupHiDPI(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.parentElement.getBoundingClientRect();
  const w = rect.width || 600;
  const h = canvas.parentElement.classList.contains('heatmap-wrap') ? 130 : (rect.height || 240);
  canvas.width  = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width  = w + 'px';
  canvas.style.height = h + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  return { ctx, w, h };
}

function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
function animateChart(duration, draw) {
  const t0 = performance.now();
  const frame = now => { const t = Math.min((now - t0) / duration, 1); draw(easeOut(t)); if (t < 1) requestAnimationFrame(frame); };
  requestAnimationFrame(frame);
}

// ── Heatmap ────────────────────────────────────────────────────────────────
function drawHeatmap() {
  const canvas = document.getElementById('heatmapCanvas');
  if (!canvas) return;

  const CELL = 14, GAP = 3, WEEKS = 12, DAYS = 7;
  const LEFT_PAD = 28, TOP_PAD = 22;
  const totalW = LEFT_PAD + WEEKS * (CELL + GAP);
  const totalH = TOP_PAD + DAYS * (CELL + GAP) + 10;
  const dpr = window.devicePixelRatio || 1;
  canvas.width  = totalW * dpr;
  canvas.height = totalH * dpr;
  canvas.style.width  = totalW + 'px';
  canvas.style.height = totalH + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const days = getLast(WEEKS * DAYS);
  const maxScore = Math.max(1, ...days.map(d => d.tasks + d.habits + Math.floor(d.focusMin / 10)));

  const LEVELS = ['#1e2438', '#2e3a6e', '#5b4cb5', '#6c63ff', '#a78bfa'];
  function scoreColor(d) {
    const s = d.tasks + d.habits + Math.floor(d.focusMin / 10);
    if (s === 0) return LEVELS[0];
    const lvl = Math.ceil((s / maxScore) * 4);
    return LEVELS[Math.min(lvl, 4)];
  }

  const DAY_LABELS = ['M','T','W','T','F','S','S'];
  ctx.font = '10px Inter, sans-serif';
  ctx.fillStyle = CHART_COLORS.text3;
  DAY_LABELS.forEach((l, i) => ctx.fillText(l, 8, TOP_PAD + i * (CELL + GAP) + CELL - 3));

  let prevMonth = '';
  for (let w = 0; w < WEEKS; w++) {
    const firstDay = days[w * DAYS];
    if (firstDay) {
      const mo = new Date(firstDay.date + 'T00:00').toLocaleDateString(undefined, { month: 'short' });
      if (mo !== prevMonth) {
        ctx.fillStyle = CHART_COLORS.text2;
        ctx.fillText(mo, LEFT_PAD + w * (CELL + GAP), 13);
        prevMonth = mo;
      }
    }
    for (let d = 0; d < DAYS; d++) {
      const entry = days[w * DAYS + d];
      const x = LEFT_PAD + w * (CELL + GAP);
      const y = TOP_PAD + d * (CELL + GAP);
      ctx.fillStyle = entry ? scoreColor(entry) : LEVELS[0];
      ctx.beginPath();
      ctx.roundRect(x, y, CELL, CELL, 3);
      ctx.fill();
      if (entry?.date === TODAY) {
        ctx.strokeStyle = '#ffffff50';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(x, y, CELL, CELL, 3);
        ctx.stroke();
      }
    }
  }

  // Build legend
  const legendWrap = document.getElementById('heatmapLegend');
  legendWrap.innerHTML = LEVELS.map(c => `<div class="heatmap-legend-cell" style="background:${c}"></div>`).join('');

  // Tooltip on hover
  canvas.onmousemove = e => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const col = Math.floor((mx - LEFT_PAD) / (CELL + GAP));
    const row = Math.floor((my - TOP_PAD)  / (CELL + GAP));
    const tip = document.getElementById('chartTooltip');
    if (col >= 0 && col < WEEKS && row >= 0 && row < DAYS) {
      const entry = days[col * DAYS + row];
      if (entry) {
        const score = entry.tasks + entry.habits + Math.floor(entry.focusMin / 10);
        tip.innerHTML = `<strong>${entry.date}</strong><br>Tasks: ${entry.tasks} · Habits: ${entry.habits} · Focus: ${entry.focusMin}min<br>Activity score: ${score}`;
        tip.style.left = (e.clientX + 12) + 'px';
        tip.style.top  = (e.clientY - 60) + 'px';
        tip.classList.add('visible');
        return;
      }
    }
    tip.classList.remove('visible');
  };
  canvas.onmouseleave = () => document.getElementById('chartTooltip').classList.remove('visible');
}

// ── Bar Chart ──────────────────────────────────────────────────────────────
function drawBarChart() {
  const canvas = document.getElementById('barCanvas');
  if (!canvas) return;
  const { ctx, w, h } = setupHiDPI(canvas);
  const data = getLast(14);

  const PAD = { top: 20, right: 16, bottom: 48, left: 40 };
  const chartW = w - PAD.left - PAD.right;
  const chartH = h - PAD.top  - PAD.bottom;
  const maxVal = Math.max(1, ...data.map(d => Math.max(d.tasks, d.habits, Math.floor(d.focusMin / 10))));
  const GROUP = chartW / data.length;
  const BAR_W = Math.max(4, (GROUP - 6) / 3);

  ctx.clearRect(0, 0, w, h);

  // Grid lines
  for (let i = 0; i <= 4; i++) {
    const y = PAD.top + chartH - (chartH * i / 4);
    ctx.strokeStyle = CHART_COLORS.border;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(PAD.left, y);
    ctx.lineTo(PAD.left + chartW, y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = CHART_COLORS.text3;
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(Math.round(maxVal * i / 4), PAD.left - 6, y + 4);
  }

  // Axes
  ctx.strokeStyle = CHART_COLORS.border;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD.left, PAD.top);
  ctx.lineTo(PAD.left, PAD.top + chartH);
  ctx.lineTo(PAD.left + chartW, PAD.top + chartH);
  ctx.stroke();

  // Bars (animated)
  const COLORS = [CHART_COLORS.accent, CHART_COLORS.gold, CHART_COLORS.green];
  const keys   = ['tasks', 'habits', 'focusDiv'];

  animateChart(700, progress => {
    ctx.clearRect(PAD.left, PAD.top, chartW, chartH + 1);
    // Redraw grid
    for (let i = 0; i <= 4; i++) {
      const y = PAD.top + chartH - (chartH * i / 4);
      ctx.strokeStyle = CHART_COLORS.border;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(PAD.left, y);
      ctx.lineTo(PAD.left + chartW, y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    data.forEach((d, gi) => {
      const vals = [d.tasks, d.habits, Math.floor(d.focusMin / 10)];
      vals.forEach((val, bi) => {
        const barH = ((val / maxVal) * chartH) * progress;
        const x = PAD.left + gi * GROUP + 3 + bi * (BAR_W + 2);
        const y = PAD.top + chartH - barH;
        ctx.fillStyle = COLORS[bi];
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.roundRect(x, y, BAR_W, barH, [3, 3, 0, 0]);
        ctx.fill();
        ctx.globalAlpha = 1;
      });
    });

    // X labels (after animation)
    if (progress === 1) {
      ctx.fillStyle = CHART_COLORS.text3;
      ctx.font = '9px Inter, sans-serif';
      ctx.textAlign = 'center';
      data.forEach((d, gi) => {
        if (gi % 2 === 0) {
          const label = d.date.slice(5);
          ctx.fillText(label, PAD.left + gi * GROUP + GROUP / 2, PAD.top + chartH + 16);
        }
      });
    }
  });
}

// ── Line / Area Chart ──────────────────────────────────────────────────────
function drawLineChart() {
  const canvas = document.getElementById('lineCanvas');
  if (!canvas) return;
  const { ctx, w, h } = setupHiDPI(canvas);
  const data = getLast(30);

  const PAD = { top: 20, right: 16, bottom: 36, left: 44 };
  const chartW = w - PAD.left - PAD.right;
  const chartH = h - PAD.top  - PAD.bottom;
  const maxVal = Math.max(1, ...data.map(d => d.focusMin));

  ctx.clearRect(0, 0, w, h);

  // Grid
  for (let i = 0; i <= 4; i++) {
    const y = PAD.top + chartH - (chartH * i / 4);
    ctx.strokeStyle = CHART_COLORS.border;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(PAD.left, y);
    ctx.lineTo(PAD.left + chartW, y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = CHART_COLORS.text3;
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(Math.round(maxVal * i / 4), PAD.left - 6, y + 4);
  }

  function ptX(i) { return PAD.left + (i / (data.length - 1)) * chartW; }
  function ptY(v) { return PAD.top + chartH - (v / maxVal) * chartH; }

  // Animated line draw
  animateChart(800, progress => {
    ctx.clearRect(PAD.left - 1, PAD.top - 1, chartW + 2, chartH + 2);
    // Redraw grid
    for (let i = 0; i <= 4; i++) {
      const y = PAD.top + chartH - (chartH * i / 4);
      ctx.strokeStyle = CHART_COLORS.border;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(PAD.left, y);
      ctx.lineTo(PAD.left + chartW, y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    const cutoff = Math.floor(data.length * progress);

    // Gradient fill
    const grad = ctx.createLinearGradient(0, PAD.top, 0, PAD.top + chartH);
    grad.addColorStop(0, 'rgba(108,99,255,0.35)');
    grad.addColorStop(1, 'rgba(108,99,255,0)');

    ctx.beginPath();
    ctx.moveTo(ptX(0), PAD.top + chartH);
    data.slice(0, cutoff + 1).forEach((d, i) => ctx.lineTo(ptX(i), ptY(d.focusMin)));
    ctx.lineTo(ptX(cutoff), PAD.top + chartH);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Line
    ctx.beginPath();
    ctx.strokeStyle = CHART_COLORS.accent;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    data.slice(0, cutoff + 1).forEach((d, i) => { if (i === 0) ctx.moveTo(ptX(i), ptY(d.focusMin)); else ctx.lineTo(ptX(i), ptY(d.focusMin)); });
    ctx.stroke();

    // Dots
    data.slice(0, cutoff + 1).forEach((d, i) => {
      if (d.focusMin > 0) {
        ctx.beginPath();
        ctx.arc(ptX(i), ptY(d.focusMin), 3.5, 0, Math.PI * 2);
        ctx.fillStyle = CHART_COLORS.accent;
        ctx.fill();
        ctx.strokeStyle = '#0d0f14';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    });
  });

  // X labels
  ctx.fillStyle = CHART_COLORS.text3;
  ctx.font = '9px Inter, sans-serif';
  ctx.textAlign = 'center';
  [0, 6, 13, 20, 29].forEach(i => {
    if (data[i]) ctx.fillText(data[i].date.slice(5), ptX(i), PAD.top + chartH + 20);
  });

  // Tooltip
  canvas.onmousemove = e => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const tip = document.getElementById('chartTooltip');
    const dpr = window.devicePixelRatio || 1;
    const idx = Math.round(((mx - PAD.left) / chartW) * (data.length - 1));
    if (idx >= 0 && idx < data.length) {
      const d = data[idx];
      tip.innerHTML = `<strong>${d.date}</strong><br>Focus: ${d.focusMin} min`;
      tip.style.left = (e.clientX + 12) + 'px';
      tip.style.top  = (e.clientY - 40) + 'px';
      tip.classList.add('visible');
    } else {
      tip.classList.remove('visible');
    }
  };
  canvas.onmouseleave = () => document.getElementById('chartTooltip').classList.remove('visible');
}

// ── Habit Donut Rings ──────────────────────────────────────────────────────
function drawHabitRings() {
  const container = document.getElementById('habitRingsRow');
  if (!container) return;
  if (!habits.length) { container.innerHTML = '<p class="empty-state-mini">Add habits to see your completion rings!</p>'; return; }

  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const monthStr = now.toISOString().slice(0, 7);

  container.innerHTML = habits.map(h => {
    const doneThisMonth = (h.log || []).filter(d => d.startsWith(monthStr)).length;
    const pct = Math.round((doneThisMonth / daysInMonth) * 100);
    return `<div class="habit-ring-wrap">
      <canvas id="ring_${h.id}" width="100" height="100"></canvas>
      <span class="habit-ring-name">${h.icon} ${escapeHtml(h.name)}</span>
      <span class="habit-ring-streak">${(h.streak||0) > 0 ? '🔥 ' + h.streak + ' day streak' : 'Start your streak!'}</span>
    </div>`;
  }).join('');

  habits.forEach(h => {
    const canvas = document.getElementById(`ring_${h.id}`);
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width  = 100 * dpr;
    canvas.height = 100 * dpr;
    canvas.style.width  = '100px';
    canvas.style.height = '100px';
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const doneThisMonth = (h.log || []).filter(d => d.startsWith(monthStr)).length;
    const pct = doneThisMonth / daysInMonth;

    animateChart(900, t => {
      ctx.clearRect(0, 0, 100, 100);
      // BG ring
      ctx.beginPath();
      ctx.arc(50, 50, 38, 0, Math.PI * 2);
      ctx.strokeStyle = CHART_COLORS.border;
      ctx.lineWidth = 10;
      ctx.stroke();

      if (pct > 0) {
        const grad = ctx.createLinearGradient(0, 0, 100, 100);
        grad.addColorStop(0, CHART_COLORS.accent);
        grad.addColorStop(1, '#10b981');
        ctx.beginPath();
        ctx.arc(50, 50, 38, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * pct * t));
        ctx.strokeStyle = grad;
        ctx.lineWidth = 10;
        ctx.lineCap = 'round';
        ctx.stroke();
      }

      // Center text
      ctx.fillStyle = '#e8eaf0';
      ctx.font = `bold 18px Inter, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(Math.round(pct * 100 * t) + '%', 50, 50);
    });
  });
}

// ── Analytics Summary ──────────────────────────────────────────────────────
function renderAnalyticsSummary() {
  const allData = dailyLog.filter(e => !e._demo || settings.demoLoaded);
  const realData = dailyLog;
  const totalTasks  = realData.reduce((s, e) => s + (e.tasks || 0), 0);
  const totalFocus  = realData.reduce((s, e) => s + (e.focusMin || 0), 0);
  const totalHabits = realData.reduce((s, e) => s + (e.habits || 0), 0);
  const bestStreak  = settings.streak || 0;

  animateCounter(document.getElementById('asummTotal'),  0, totalTasks);
  animateCounter(document.getElementById('asummFocus'),  0, Math.round(totalFocus / 60));
  animateCounter(document.getElementById('asummHabits'), 0, totalHabits);
  animateCounter(document.getElementById('asummBestDay'),0, bestStreak);

  document.querySelector('#asummFocus + .asumm-label').textContent   = 'Total Focus Hours';
  document.querySelector('#asummBestDay + .asumm-label').textContent = 'Day Streak';
}

function renderAnalytics() {
  renderAnalyticsSummary();
  // Small delay so the DOM/canvas elements are visible and sized
  requestAnimationFrame(() => {
    drawHeatmap();
    drawBarChart();
    drawLineChart();
    drawHabitRings();
    // demo button state
    const hasDemoData = dailyLog.some(e => e._demo);
    document.getElementById('demoDataBtn').style.display  = hasDemoData ? 'none' : '';
    document.getElementById('clearDemoBtn').style.display = hasDemoData ? ''     : 'none';
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// FAB
// ═══════════════════════════════════════════════════════════════════════════
function initFAB() {
  const wrap = document.getElementById('fabWrap');
  const main = document.getElementById('fabMain');
  let open = false;

  main.onclick = e => {
    e.stopPropagation();
    open = !open;
    wrap.classList.toggle('expanded', open);
    main.classList.toggle('open', open);
  };

  document.addEventListener('click', () => {
    if (open) { open = false; wrap.classList.remove('expanded'); main.classList.remove('open'); }
  });

  wrap.querySelectorAll('.fab-action').forEach(btn => {
    btn.onclick = e => {
      e.stopPropagation();
      open = false;
      wrap.classList.remove('expanded');
      main.classList.remove('open');
      const action = btn.dataset.action;
      if (action === 'task')   { navigate('tasks');  setTimeout(() => document.getElementById('taskInput')?.focus(), 300); }
      if (action === 'habit')  { navigate('habits'); setTimeout(() => document.getElementById('habitInput')?.focus(), 300); }
      if (action === 'timer')  { navigate('timer');  setTimeout(() => document.getElementById('timerToggle')?.click(), 300); }
      if (action === 'journal'){ navigate('journal');setTimeout(() => document.getElementById('journalEntry')?.focus(), 300); }
    };
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// KEYBOARD SHORTCUTS
// ═══════════════════════════════════════════════════════════════════════════
function initKeyboardShortcuts() {
  document.addEventListener('keydown', e => {
    const tag = document.activeElement.tagName.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') {
      if (e.key === 'Escape') { document.activeElement.blur(); closeModal(); }
      return;
    }
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    const map = { d:'dashboard', t:'tasks', f:'timer', h:'habits', j:'journal', g:'goals', a:'analytics' };
    if (map[e.key]) { e.preventDefault(); navigate(map[e.key]); return; }

    if (e.key === 'n') {
      e.preventDefault();
      navigate('tasks');
      setTimeout(() => document.getElementById('taskInput')?.focus(), 200);
    }
    if (e.key === ' ') {
      const timerSection = document.getElementById('section-timer');
      if (timerSection.classList.contains('active')) {
        e.preventDefault();
        if (timerState.running) pauseTimer(); else startTimer();
      }
    }
    if (e.key === 's') {
      e.preventDefault();
      settings.soundOn = !settings.soundOn;
      store.set('fs_settings', settings);
      updateSoundToggle();
      showToast(settings.soundOn ? '🔊 Sound on' : '🔇 Sound off');
    }
    if (e.key === '?') {
      e.preventDefault();
      document.getElementById('shortcutsOverlay').classList.toggle('open');
    }
    if (e.key === 'Escape') {
      closeModal();
      document.getElementById('shortcutsOverlay').classList.remove('open');
    }
  });

  document.getElementById('shortcutsClose').onclick = () => document.getElementById('shortcutsOverlay').classList.remove('open');
  document.getElementById('shortcutsOverlay').addEventListener('click', e => {
    if (e.target === document.getElementById('shortcutsOverlay')) document.getElementById('shortcutsOverlay').classList.remove('open');
  });
}

function updateSoundToggle() {
  const btn = document.getElementById('soundToggle');
  btn.textContent = settings.soundOn ? '🔊' : '🔇';
  btn.classList.toggle('muted', !settings.soundOn);
}

// ═══════════════════════════════════════════════════════════════════════════
// NAME MODAL
// ═══════════════════════════════════════════════════════════════════════════
function showNameModal() {
  openModal('What\'s your name?',
    `<input type="text" class="text-input" id="nameInput" value="${escapeHtml(settings.name||'')}" placeholder="Enter your name" style="width:100%" maxlength="30" />`,
    `<button class="btn btn-ghost" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveName()">Save</button>`);
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

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════
function escapeHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function formatDate(d) { return new Date(d + 'T00:00').toLocaleDateString(undefined, { weekday:'short', year:'numeric', month:'short', day:'numeric' }); }

// ═══════════════════════════════════════════════════════════════════════════
// EVENT LISTENERS
// ═══════════════════════════════════════════════════════════════════════════
function attachEvents() {
  // Navigation
  document.querySelectorAll('.nav-item').forEach(item => item.addEventListener('click', e => { e.preventDefault(); navigate(item.dataset.section); }));
  document.querySelectorAll('[data-nav]').forEach(btn  => btn.addEventListener('click', () => navigate(btn.dataset.nav)));

  // Quote
  document.getElementById('newQuoteBtn').addEventListener('click', nextQuote);
  document.getElementById('favoriteQuoteBtn').addEventListener('click', saveQuote);

  // Name
  document.getElementById('nameBtn').addEventListener('click', showNameModal);

  // Sound toggle
  document.getElementById('soundToggle').addEventListener('click', () => {
    settings.soundOn = !settings.soundOn;
    store.set('fs_settings', settings);
    updateSoundToggle();
    showToast(settings.soundOn ? '🔊 Sound on' : '🔇 Sound off');
  });

  // Tasks
  document.getElementById('addTaskBtn').addEventListener('click', addTask);
  document.getElementById('taskInput').addEventListener('keydown', e => { if (e.key === 'Enter') addTask(); });
  document.getElementById('taskFilter').addEventListener('change', renderTasks);
  document.getElementById('doneHeader').addEventListener('click', () => {
    const list = document.getElementById('taskListDone');
    list.classList.toggle('collapsed');
    document.querySelector('#doneHeader .chevron').style.transform = list.classList.contains('collapsed') ? 'rotate(-90deg)' : 'rotate(0)';
  });
  document.querySelectorAll('#taskListPending, #taskListDone').forEach(list => {
    list.addEventListener('click', e => {
      const check = e.target.closest('[data-check]');
      const del   = e.target.closest('[data-del]');
      if (check) toggleTask(+check.dataset.check, check);
      if (del)   deleteTask(+del.dataset.del);
    });
  });

  // Timer
  document.querySelectorAll('.mode-btn').forEach(btn => btn.addEventListener('click', () => setTimerMode(btn.dataset.mode, +btn.dataset.minutes)));
  document.getElementById('applyCustom').addEventListener('click', () => setTimerMode('custom', Math.max(1, Math.min(180, +document.getElementById('customMinutes').value || 25))));
  document.getElementById('timerToggle').addEventListener('click', () => { if (timerState.running) pauseTimer(); else startTimer(); });
  document.getElementById('timerReset').addEventListener('click', resetTimer);
  document.getElementById('timerSkip').addEventListener('click',  () => { stopTimer(); timerState.remainSec = 0; onTimerComplete(); });

  // Habits
  document.getElementById('addHabitBtn').addEventListener('click', addHabit);
  document.getElementById('habitInput').addEventListener('keydown', e => { if (e.key === 'Enter') addHabit(); });
  document.getElementById('habitsGrid').addEventListener('click', e => {
    const toggle = e.target.closest('[data-toggle]');
    const del    = e.target.closest('[data-del]');
    if (toggle) toggleHabit(+toggle.dataset.toggle, toggle);
    if (del)    deleteHabit(+del.dataset.del);
  });

  // Journal
  document.querySelectorAll('.prompt-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const ta = document.getElementById('journalEntry');
      ta.value = ta.value ? ta.value + '\n\n' + chip.dataset.prompt + '\n' : chip.dataset.prompt + '\n';
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

  // Analytics
  document.getElementById('demoDataBtn').addEventListener('click', loadDemoData);
  document.getElementById('clearDemoBtn').addEventListener('click', clearDemoData);

  // Modal close
  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('modalOverlay').addEventListener('click', e => { if (e.target === document.getElementById('modalOverlay')) closeModal(); });

  // Redraw charts on resize
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (document.getElementById('section-analytics').classList.contains('active')) renderAnalytics();
    }, 200);
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// AUTO-SAVE JOURNAL
// ═══════════════════════════════════════════════════════════════════════════
let journalAutoSave;
function initJournalAutoSave() {
  document.getElementById('journalEntry')?.addEventListener('input', () => {
    clearTimeout(journalAutoSave);
    journalAutoSave = setTimeout(() => {
      const text = document.getElementById('journalEntry').value.trim();
      if (text) saveJournalEntry();
    }, 3000);
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════════════════
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
  updateStats(true);
  updateSoundToggle();
  updateDailyLog();
  attachEvents();
  initFAB();
  initKeyboardShortcuts();
  initJournalAutoSave();

  // Quote rotates every 30s
  setInterval(nextQuote, 30000);
  setInterval(updateGreeting, 60000);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
