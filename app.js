/* ===== FlowState — CEO Edition ===== */
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
let sleepLog    = store.get('fs_sleep', []);
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
  { text: "Start where you are. Use what you have. Do what you can.", author: "Arthur Ashe" },
  { text: "Action is the foundational key to all success.", author: "Pablo Picasso" },
  { text: "Energy and persistence conquer all things.", author: "Benjamin Franklin" },
  { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
  { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
  { text: "You miss 100% of the shots you don't take.", author: "Wayne Gretzky" },
  { text: "Whether you think you can or think you can't, you're right.", author: "Henry Ford" },
  { text: "Opportunities don't happen. You create them.", author: "Chris Grosser" },
  { text: "Don't count the days, make the days count.", author: "Muhammad Ali" },
  { text: "Do something today that your future self will thank you for.", author: "Sean Patrick Flanery" },
  { text: "Don't stop when you're tired. Stop when you're done.", author: "Unknown" },
  { text: "Wake up with determination. Go to bed with satisfaction.", author: "Unknown" },
  { text: "Do what you have to do until you can do what you want to do.", author: "Oprah Winfrey" },
  { text: "Discipline is the bridge between goals and accomplishment.", author: "Jim Rohn" },
  { text: "Small daily improvements over time lead to stunning results.", author: "Robin Sharma" },
  { text: "Motivation gets you going. Habit keeps you growing.", author: "John C. Maxwell" },
  { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
  { text: "The harder I work, the luckier I get.", author: "Samuel Goldwyn" },
  { text: "Dream big and dare to fail.", author: "Norman Vaughan" },
  { text: "The key to success is to focus on goals, not obstacles.", author: "Unknown" },
  { text: "Success usually comes to those who are too busy to be looking for it.", author: "Henry David Thoreau" },
  { text: "The way to get started is to quit talking and begin doing.", author: "Walt Disney" },
  { text: "Your time is limited, so don't waste it living someone else's life.", author: "Steve Jobs" },
  { text: "If you really look closely, most overnight successes took a long time.", author: "Steve Jobs" },
];

let currentQuoteIdx = Math.floor(Math.random() * QUOTES.length);

// ═══════════════════════════════════════════════════════════════════════════
// SOUND ENGINE
// ═══════════════════════════════════════════════════════════════════════════
let audioCtx = null;
function getAudioCtx() { if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); return audioCtx; }
function playTone(freq, type, duration, volume = 0.12, delay = 0) {
  if (!settings.soundOn) return;
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = type; osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
    gain.gain.setValueAtTime(0, ctx.currentTime + delay);
    gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + delay + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + duration);
    osc.start(ctx.currentTime + delay); osc.stop(ctx.currentTime + delay + duration);
  } catch {}
}
const sounds = {
  tick:     () => playTone(880, 'sine', 0.06, 0.07),
  complete: () => { playTone(523,'sine',0.12,0.14); playTone(659,'sine',0.12,0.14,0.1); playTone(784,'sine',0.2,0.14,0.2); },
  habit:    () => { playTone(440,'sine',0.1,0.11); playTone(554,'sine',0.14,0.11,0.08); },
  add:      () => playTone(660, 'sine', 0.07, 0.09),
  timer:    () => { [523,659,784,1047].forEach((f,i) => playTone(f,'sine',0.22,0.16,i*0.11)); },
  delete:   () => playTone(220, 'sawtooth', 0.05, 0.06),
  save:     () => { playTone(392,'sine',0.09,0.09); playTone(494,'sine',0.11,0.09,0.1); },
};

// ═══════════════════════════════════════════════════════════════════════════
// CONFETTI — gold/warm palette
// ═══════════════════════════════════════════════════════════════════════════
const confettiCanvas = document.getElementById('confettiCanvas');
const cCtx = confettiCanvas.getContext('2d');
let confettiParticles = [];
let confettiAnimId = null;
function resizeCC() { confettiCanvas.width = window.innerWidth; confettiCanvas.height = window.innerHeight; }
resizeCC(); window.addEventListener('resize', resizeCC);

const CONFETTI_COLORS = ['#c9a84c','#e8c97a','#f0ede8','#00c896','#a8862a','#ffffff','#f5e6c0','#d4af6a','#e8c97a','#c9a84c'];

function confettiBurst(x, y, count = 80) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 3 + Math.random() * 8;
    confettiParticles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - Math.random() * 4,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      size: 4 + Math.random() * 6,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.3,
      gravity: 0.22 + Math.random() * 0.14,
      life: 1, decay: 0.011 + Math.random() * 0.008,
      shape: Math.random() > 0.5 ? 'rect' : 'circle',
    });
  }
  if (!confettiAnimId) animateConfetti();
}
function animateConfetti() {
  cCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  confettiParticles = confettiParticles.filter(p => p.life > 0);
  confettiParticles.forEach(p => {
    p.x += p.vx; p.y += p.vy; p.vy += p.gravity; p.vx *= 0.99;
    p.rotation += p.rotationSpeed; p.life -= p.decay;
    cCtx.save(); cCtx.globalAlpha = Math.max(0, p.life);
    cCtx.translate(p.x, p.y); cCtx.rotate(p.rotation); cCtx.fillStyle = p.color;
    if (p.shape === 'rect') cCtx.fillRect(-p.size/2, -p.size/4, p.size, p.size/2);
    else { cCtx.beginPath(); cCtx.arc(0,0,p.size/2,0,Math.PI*2); cCtx.fill(); }
    cCtx.restore();
  });
  if (confettiParticles.length > 0) confettiAnimId = requestAnimationFrame(animateConfetti);
  else { confettiAnimId = null; cCtx.clearRect(0,0,confettiCanvas.width,confettiCanvas.height); }
}
function confettiAt(el, count = 70) {
  const rect = el ? el.getBoundingClientRect() : { left: window.innerWidth/2, top: window.innerHeight/2, width: 0, height: 0 };
  confettiBurst(rect.left + rect.width/2, rect.top + rect.height/2, count);
}

// ═══════════════════════════════════════════════════════════════════════════
// ANIMATED COUNTER
// ═══════════════════════════════════════════════════════════════════════════
function animateCounter(el, from, to, duration = 600) {
  if (!el) return;
  const start = performance.now();
  const step = now => {
    const t = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - t, 3);
    el.textContent = Math.round(from + (to - from) * ease);
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// ═══════════════════════════════════════════════════════════════════════════
// WIN POPUP / TOAST
// ═══════════════════════════════════════════════════════════════════════════
function showWin(msg) {
  const el = document.getElementById('winPopup');
  el.textContent = msg; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 900);
}
let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
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
// PARTICLES
// ═══════════════════════════════════════════════════════════════════════════
function initParticles() {
  const container = document.getElementById('bgParticles');
  const colors = ['#c9a84c','#e8c97a','#a8862a','#3d3a42','#c9a84c'];
  for (let i = 0; i < 12; i++) {
    const p = document.createElement('div'); p.className = 'particle';
    const size = 30 + Math.random() * 140;
    p.style.cssText = `width:${size}px;height:${size}px;left:${Math.random()*100}%;background:${colors[i%colors.length]};animation-duration:${14+Math.random()*22}s;animation-delay:${Math.random()*14}s;`;
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
// GREETING / DATE
// ═══════════════════════════════════════════════════════════════════════════
function updateGreeting() {
  const h = new Date().getHours();
  const name = settings.name ? `, ${settings.name}` : '';
  const greet = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  document.getElementById('greeting').textContent = `${greet}${name}.`;
  const opts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  document.getElementById('dateDisplay').textContent = new Date().toLocaleDateString(undefined, opts);
  document.getElementById('journalDate').textContent = new Date().toLocaleDateString(undefined, opts);
}

// ═══════════════════════════════════════════════════════════════════════════
// QUOTE
// ═══════════════════════════════════════════════════════════════════════════
function showQuote(idx) {
  const q = QUOTES[idx]; const el = document.getElementById('quoteText');
  el.style.opacity = 0;
  setTimeout(() => {
    el.textContent = `"${q.text}"`;
    document.getElementById('quoteAuthor').textContent = `— ${q.author}`;
    el.style.transition = 'opacity .4s'; el.style.opacity = 1;
  }, 200);
}
function nextQuote() { currentQuoteIdx = (currentQuoteIdx + 1) % QUOTES.length; showQuote(currentQuoteIdx); }
function saveQuote() {
  const q = QUOTES[currentQuoteIdx];
  if (savedQuotes.some(s => s.text === q.text)) { showToast('Already saved!'); return; }
  savedQuotes.push(q); store.set('fs_savedQuotes', savedQuotes);
  renderSavedQuotes(); sounds.save(); showToast('Quote saved. 🤍');
  document.getElementById('favoriteQuoteBtn').textContent = '❤️ Saved';
  setTimeout(() => document.getElementById('favoriteQuoteBtn').textContent = '🤍 Save', 2000);
}
function renderSavedQuotes() {
  const card = document.getElementById('favQuotesCard'); const list = document.getElementById('savedQuotesList');
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
// DAILY LOG
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
  if (idx !== -1) dailyLog[idx] = entry; else dailyLog.push(entry);
  store.set('fs_dailyLog', dailyLog);
}
function getLogForDate(date) { return dailyLog.find(e => e.date === date) || { date, tasks:0, focusMin:0, habits:0, journal:0 }; }
function getLast(n) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (n-1-i));
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
    const d = new Date(); d.setDate(d.getDate() - i);
    const ds = d.toISOString().slice(0, 10);
    if (existing.find(e => e.date === ds)) continue;
    const active = Math.random() > 0.15;
    demo.push({ date:ds, tasks: active?Math.floor(Math.random()*8)+1:0, focusMin: active?Math.floor(Math.random()*120)+10:0, habits: active?Math.floor(Math.random()*4)+1:0, journal: active&&Math.random()>.5?Math.floor(Math.random()*300)+50:0, _demo:true });
  }
  dailyLog = [...existing, ...demo];
  store.set('fs_dailyLog', dailyLog);

  // Sleep demo
  const existSleep = sleepLog.filter(e => !e._demo);
  const demoSleep = [];
  for (let i = 59; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const ds = d.toISOString().slice(0, 10);
    if (existSleep.find(e => e.date === ds)) continue;
    demoSleep.push({ date:ds, hours: Math.round((6 + Math.random()*3)*2)/2, quality: 2+Math.floor(Math.random()*4), _demo:true });
  }
  sleepLog = [...existSleep, ...demoSleep];
  store.set('fs_sleep', sleepLog);

  settings.demoLoaded = true; store.set('fs_settings', settings);
  document.getElementById('demoDataBtn').style.display = 'none';
  document.getElementById('clearDemoBtn').style.display = '';
  renderAnalytics(); showToast('Demo data loaded! 🎲');
}
function clearDemoData() {
  dailyLog = dailyLog.filter(e => !e._demo); store.set('fs_dailyLog', dailyLog);
  sleepLog = sleepLog.filter(e => !e._demo); store.set('fs_sleep', sleepLog);
  settings.demoLoaded = false; store.set('fs_settings', settings);
  document.getElementById('demoDataBtn').style.display = '';
  document.getElementById('clearDemoBtn').style.display = 'none';
  renderAnalytics(); showToast('Demo data cleared.');
}

// ═══════════════════════════════════════════════════════════════════════════
// PROGRESS & STATS
// ═══════════════════════════════════════════════════════════════════════════
function calcProgress() {
  const totalT = tasks.filter(t => !t.archived).length, doneT = tasks.filter(t => t.done).length;
  const totalH = habits.length, doneH = habits.filter(h => (h.log||[]).includes(TODAY)).length;
  const items = totalT + totalH;
  return items === 0 ? 0 : Math.round(((doneT + doneH) / items) * 100);
}
function updateProgress() {
  const pct = calcProgress();
  document.getElementById('ringFill').style.strokeDashoffset = 314 - (314 * pct / 100);
  document.getElementById('ringPct').textContent = pct + '%';
  document.getElementById('sidebarProgress').style.width = pct + '%';
  document.getElementById('sidebarProgressPct').textContent = pct + '%';
  const msgs = [[0,'Start your day strong.'],[10,"You've begun — momentum builds."],[25,"Making moves. Keep it up."],[50,"Halfway there. Respect."],[75,"Almost done — finish strong."],[90,"So close. One more push."],[100,'Perfect day. You crushed it.']];
  document.getElementById('progressMessage').textContent = msgs.reduce((a,m) => pct >= m[0] ? m : a, msgs[0])[1];
  updateDailyLog();
}
function updateStats(animate = false) {
  if (settings.lastSessionDate !== TODAY) { settings.focusMinToday = 0; settings.sessionsToday = 0; settings.lastSessionDate = TODAY; store.set('fs_settings', settings); }
  const vals = [tasks.filter(t=>t.done&&t.doneDate===TODAY).length, settings.focusMinToday||0, habits.filter(h=>(h.log||[]).includes(TODAY)).length, settings.streak||0];
  ['statTasksDone','statFocusMin','statHabitsDone','statStreakVal'].forEach((id,i) => {
    const el = document.getElementById(id); if (!el) return;
    if (animate) animateCounter(el, parseInt(el.textContent)||0, vals[i]); else el.textContent = vals[i];
  });
  document.getElementById('sessionsToday').textContent = settings.sessionsToday || 0;
}
function updateStreak() {
  const last = settings.lastActive, yesterday = new Date(Date.now()-86400000).toISOString().slice(0,10);
  if (last === TODAY) return;
  settings.streak = last === yesterday ? (settings.streak||0)+1 : 1;
  settings.lastActive = TODAY; store.set('fs_settings', settings);
}

// ═══════════════════════════════════════════════════════════════════════════
// TASKS
// ═══════════════════════════════════════════════════════════════════════════
function saveTasks() { store.set('fs_tasks', tasks); }
function addTask() {
  const input = document.getElementById('taskInput'); const text = input.value.trim();
  if (!text) { input.focus(); return; }
  tasks.unshift({ id:Date.now(), text, priority:document.getElementById('taskPriority').value, due:document.getElementById('taskDue').value, done:false, doneDate:null, created:TODAY });
  input.value = ''; saveTasks(); renderTasks(); renderDashTasks(); updateProgress(); updateStats(true); sounds.add(); showToast('Task added.');
}
function toggleTask(id, el) {
  const t = tasks.find(t => t.id === id); if (!t) return;
  t.done = !t.done; t.doneDate = t.done ? TODAY : null;
  saveTasks(); renderTasks(); renderDashTasks(); updateProgress(); updateStats(true);
  if (t.done) { sounds.complete(); confettiAt(el, 55); showWin('Task Done. ✓'); updateDailyLog(); } else sounds.tick();
}
function deleteTask(id) { tasks = tasks.filter(t => t.id !== id); saveTasks(); renderTasks(); renderDashTasks(); updateProgress(); updateStats(true); sounds.delete(); }
function renderTasks() {
  const filter = document.getElementById('taskFilter').value;
  let pending = tasks.filter(t => !t.done), done = tasks.filter(t => t.done);
  if (filter === 'pending') done = [];
  else if (filter === 'done') pending = [];
  else if (filter === 'high') pending = pending.filter(t => t.priority === 'high');
  document.getElementById('pendingCount').textContent = pending.length || '';
  document.getElementById('doneCount').textContent    = done.length || '';
  document.getElementById('taskBadge').textContent    = pending.length || '';
  const pList = document.getElementById('taskListPending'), dList = document.getElementById('taskListDone');
  pList.innerHTML = pending.length ? pending.map(taskHTML).join('') : '<li class="empty-state-mini">All clear. Add a task to get going.</li>';
  dList.innerHTML = done.length    ? done.map(taskHTML).join('')    : '<li class="empty-state-mini">No completed tasks yet.</li>';
  initTaskDragDrop(pList);
  const sel = document.getElementById('timerTaskSelect'), cur = sel.value;
  sel.innerHTML = '<option value="">— select a task —</option>' + pending.map(t => `<option value="${t.id}">${escapeHtml(t.text.slice(0,40))}</option>`).join('');
  if (cur) sel.value = cur;
}
function taskHTML(t) {
  const overdue = t.due && t.due < TODAY && !t.done;
  return `<li class="task-item ${t.done?'done':''} priority-${t.priority}" data-id="${t.id}" draggable="true">
    <div class="task-checkbox ${t.done?'checked':''}" data-check="${t.id}">${t.done?'✓':''}</div>
    <span class="task-text">${escapeHtml(t.text)}</span>
    <div class="task-meta">
      <span class="priority-badge ${t.priority}">${t.priority}</span>
      ${t.due?`<span class="task-due ${overdue?'overdue':''}">${overdue?'⚠ ':''}${t.due}</span>`:''}
    </div>
    <button class="task-delete" data-del="${t.id}">🗑</button>
  </li>`;
}
function renderDashTasks() {
  const list = document.getElementById('dashTaskList'), top = tasks.filter(t => !t.done).slice(0,5);
  list.innerHTML = top.length
    ? top.map(t=>`<li class="mini-task-item priority-${t.priority}"><div class="mini-task-dot"></div><span>${escapeHtml(t.text.slice(0,45))}${t.text.length>45?'…':''}</span></li>`).join('')
    : '<li class="empty-state-mini">No tasks yet — add some in Tasks!</li>';
}

// ── Drag & Drop ────────────────────────────────────────────────────────────
let dragSrcId = null;
function initTaskDragDrop(list) {
  list.addEventListener('dragstart', e => { const li = e.target.closest('.task-item'); if (!li) return; dragSrcId = +li.dataset.id; setTimeout(() => li.classList.add('dragging'), 0); });
  list.addEventListener('dragend',   e => { const li = e.target.closest('.task-item'); if (li) li.classList.remove('dragging'); list.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over')); });
  list.addEventListener('dragover',  e => { e.preventDefault(); const li = e.target.closest('.task-item'); if (!li || +li.dataset.id === dragSrcId) return; list.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over')); li.classList.add('drag-over'); });
  list.addEventListener('drop', e => {
    e.preventDefault(); const li = e.target.closest('.task-item'); if (!li || +li.dataset.id === dragSrcId) return;
    const si = tasks.findIndex(t => t.id === dragSrcId), di = tasks.findIndex(t => t.id === +li.dataset.id);
    if (si===-1||di===-1) return; const [r] = tasks.splice(si,1); tasks.splice(di,0,r); saveTasks(); renderTasks();
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// FOCUS TIMER
// ═══════════════════════════════════════════════════════════════════════════
const timerState = { running:false, totalSec:25*60, remainSec:25*60, mode:'pomodoro', interval:null };
const TIMER_LABELS = { pomodoro:'Focus', short:'Short Break', long:'Long Break', custom:'Custom' };

function setTimerMode(mode, minutes) {
  stopTimer(); timerState.mode = mode; const mins = minutes || 25;
  timerState.totalSec = mins*60; timerState.remainSec = mins*60; updateTimerDisplay();
  document.querySelectorAll('.mode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
  document.getElementById('timerModeLabel').textContent = TIMER_LABELS[mode] || 'Focus';
  const ring = document.getElementById('timerRing'); ring.classList.toggle('break-mode', mode==='short'||mode==='long');
  document.getElementById('customTimeRow').style.display = mode==='custom' ? 'flex' : 'none';
}
function updateTimerDisplay() {
  const m = String(Math.floor(timerState.remainSec/60)).padStart(2,'0'), s = String(timerState.remainSec%60).padStart(2,'0');
  document.getElementById('timerTime').textContent = `${m}:${s}`;
  document.getElementById('timerRing').style.strokeDashoffset = 603 * (timerState.remainSec / timerState.totalSec);
  document.title = timerState.running ? `${m}:${s} — FlowState` : 'FlowState';
}
function startTimer() {
  if (timerState.running) return; timerState.running = true;
  document.getElementById('timerToggle').textContent = 'Pause';
  document.getElementById('timerRing').classList.add('running'); sounds.tick();
  timerState.interval = setInterval(() => { timerState.remainSec--; updateTimerDisplay(); if (timerState.remainSec<=0) { clearInterval(timerState.interval); timerState.running=false; onTimerComplete(); } }, 1000);
}
function pauseTimer() { clearInterval(timerState.interval); timerState.running=false; document.getElementById('timerToggle').textContent='Resume'; document.getElementById('timerRing').classList.remove('running'); }
function stopTimer()  { clearInterval(timerState.interval); timerState.running=false; document.getElementById('timerToggle').textContent='Start'; document.getElementById('timerRing').classList.remove('running'); }
function resetTimer() { stopTimer(); timerState.remainSec=timerState.totalSec; updateTimerDisplay(); }
function onTimerComplete() {
  document.title = 'FlowState'; document.getElementById('timerRing').classList.remove('running');
  const isBreak = timerState.mode==='short' || timerState.mode==='long';
  if (!isBreak) {
    const mins = Math.round(timerState.totalSec/60);
    if (settings.lastSessionDate !== TODAY) { settings.focusMinToday=0; settings.sessionsToday=0; }
    settings.focusMinToday = (settings.focusMinToday||0)+mins;
    settings.sessionsToday = (settings.sessionsToday||0)+1;
    settings.lastSessionDate = TODAY; store.set('fs_settings', settings);
    updateStats(true); updateDailyLog();
    const task = document.getElementById('timerTaskSelect'), lbl = task.options[task.selectedIndex]?.text||'';
    addSessionLog(mins, lbl !== '— select a task —' ? lbl : '');
    renderSessionDots(); sounds.timer();
    confettiBurst(window.innerWidth/2, window.innerHeight/3, 100);
    showWin(`🔥 ${mins}min session done`); showToast(`Focus session complete. Well done.`);
  } else { sounds.tick(); showToast('Break over — back to it.'); }
  timerState.remainSec = timerState.totalSec; updateTimerDisplay();
}
function addSessionLog(mins, task) {
  const log = document.getElementById('sessionLog'); const time = new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
  const empty = log.querySelector('.empty-state-mini'); if (empty) empty.remove();
  const li = document.createElement('li'); li.className = 'session-log-item';
  li.innerHTML = `<strong>${mins} min focus</strong>${task?` · ${escapeHtml(task)}`:''}<div class="log-time">${time}</div>`;
  log.prepend(li);
}
function renderSessionDots() {
  const n = settings.sessionsToday||0;
  document.getElementById('sessionDots').innerHTML = Array.from({length:Math.min(n,8)},()=>'<span class="session-dot"></span>').join('');
  document.getElementById('sessionsToday').textContent = n;
}

// ═══════════════════════════════════════════════════════════════════════════
// HABITS
// ═══════════════════════════════════════════════════════════════════════════
function saveHabits() { store.set('fs_habits', habits); }
function addHabit() {
  const input = document.getElementById('habitInput'); const name = input.value.trim();
  if (!name) { input.focus(); return; }
  habits.push({ id:Date.now(), name, icon:document.getElementById('habitIcon').value, log:[], streak:0, created:TODAY });
  input.value = ''; saveHabits(); renderHabits(); renderDashHabits(); sounds.add(); showToast('Habit added.');
}
function toggleHabit(id, el) {
  const h = habits.find(h => h.id===id); if (!h) return;
  const idx = (h.log||[]).indexOf(TODAY);
  if (idx===-1) {
    h.log = [...(h.log||[]), TODAY]; h.streak = calcHabitStreak(h);
    sounds.habit(); confettiAt(el, 45); showWin(`${h.icon} Streak: ${h.streak}`);
    const card = el?.closest('.habit-card'); if (card) { card.classList.remove('just-done'); void card.offsetWidth; card.classList.add('just-done'); }
  } else { h.log.splice(idx,1); h.streak = calcHabitStreak(h); }
  saveHabits(); renderHabits(); renderDashHabits(); updateProgress(); updateStats(true); updateDailyLog();
}
function calcHabitStreak(h) {
  let streak=0; const d=new Date();
  while ((h.log||[]).includes(d.toISOString().slice(0,10))) { streak++; d.setDate(d.getDate()-1); }
  return streak;
}
function deleteHabit(id) { habits=habits.filter(h=>h.id!==id); saveHabits(); renderHabits(); renderDashHabits(); updateProgress(); updateStats(true); sounds.delete(); }
function getWeekDays() {
  return Array.from({length:7},(_,i)=>{ const d=new Date(); d.setDate(d.getDate()-6+i); return {date:d.toISOString().slice(0,10),label:d.toLocaleDateString(undefined,{weekday:'short'}).slice(0,1)}; });
}
function renderHabits() {
  const grid = document.getElementById('habitsGrid');
  if (!habits.length) { grid.innerHTML=`<div class="empty-state"><div class="empty-icon">🌱</div><p>No habits yet. Add your first one above!</p></div>`; return; }
  const week = getWeekDays();
  grid.innerHTML = habits.map(h => {
    const doneToday = (h.log||[]).includes(TODAY);
    return `<div class="habit-card" data-id="${h.id}">
      <div class="habit-header">
        <span class="habit-icon">${h.icon}</span>
        <span class="habit-title">${escapeHtml(h.name)}</span>
        <span class="habit-streak">${(h.streak||0)>0?'🔥 '+h.streak:'—'}</span>
      </div>
      <div class="habit-week">
        ${week.map(w=>`<div class="habit-day ${(h.log||[]).includes(w.date)?'done':''} ${w.date===TODAY?'today':''}" title="${w.date}">${w.label}</div>`).join('')}
      </div>
      <div class="habit-actions">
        <button class="btn ${doneToday?'btn-ghost habit-check-btn completed':'btn-primary habit-check-btn'}" data-toggle="${h.id}">
          ${doneToday?'✓ Done Today':'Mark Done'}
        </button>
        <button class="habit-delete" data-del="${h.id}">🗑</button>
      </div>
    </div>`;
  }).join('');
}
function renderDashHabits() {
  const list = document.getElementById('dashHabitList');
  if (!habits.length) { list.innerHTML='<li class="empty-state-mini">No habits yet — start building one!</li>'; return; }
  list.innerHTML = habits.slice(0,5).map(h => {
    const done = (h.log||[]).includes(TODAY);
    return `<li class="mini-habit-item"><span>${h.icon}</span><span style="${done?'text-decoration:line-through;opacity:.4':''}">${escapeHtml(h.name.slice(0,30))}</span>${(h.streak||0)>0?`<span class="streak-chip">🔥 ${h.streak}</span>`:''}</li>`;
  }).join('');
}

// ═══════════════════════════════════════════════════════════════════════════
// JOURNAL
// ═══════════════════════════════════════════════════════════════════════════
function saveJournalEntry() {
  const text = document.getElementById('journalEntry').value.trim();
  if (!text) { showToast('Write something first.'); return; }
  const existing = journal.findIndex(e => e.date===TODAY);
  const entry = { date:TODAY, text, savedAt:new Date().toISOString() };
  if (existing!==-1) journal[existing]=entry; else journal.unshift(entry);
  store.set('fs_journal', journal); renderJournalHistory(); updateDailyLog(); sounds.save(); showToast('Entry saved.');
}
function renderJournalHistory() {
  const list = document.getElementById('journalHistory');
  if (!journal.length) { list.innerHTML='<li class="empty-state-mini">Your entries will appear here.</li>'; return; }
  list.innerHTML = journal.map((e,i)=>`
    <li class="journal-entry-item" data-idx="${i}">
      <div class="je-date">${formatDate(e.date)}</div>
      <div class="je-preview">${escapeHtml(e.text)}</div>
    </li>`).join('');
  list.querySelectorAll('.journal-entry-item').forEach(item => {
    item.onclick = () => {
      const e = journal[+item.dataset.idx];
      openModal(formatDate(e.date), `<p style="white-space:pre-wrap;line-height:1.75">${escapeHtml(e.text)}</p>`,
        `<button class="btn btn-ghost" onclick="closeModal()">Close</button><button class="btn btn-danger" onclick="deleteJournalEntry(${item.dataset.idx});closeModal()">Delete</button>`);
    };
  });
}
function deleteJournalEntry(idx) { journal.splice(idx,1); store.set('fs_journal',journal); renderJournalHistory(); }
function loadTodayJournal() { const e=journal.find(e=>e.date===TODAY); if (e) document.getElementById('journalEntry').value=e.text; }

// ═══════════════════════════════════════════════════════════════════════════
// GOALS
// ═══════════════════════════════════════════════════════════════════════════
function saveGoals() { store.set('fs_goals', goals); }
const CAT_LABELS = { personal:'🧠 Personal', career:'💼 Career', health:'❤️ Health', finance:'💰 Finance', learning:'📚 Learning', relationships:'🤝 Relationships' };

function addGoal() {
  const title = document.getElementById('goalTitle').value.trim();
  if (!title) { document.getElementById('goalTitle').focus(); return; }
  goals.unshift({ id:Date.now(), title, description:document.getElementById('goalDescription').value.trim(), category:document.getElementById('goalCategory').value, deadline:document.getElementById('goalDeadline').value, progress:0, created:TODAY });
  ['goalTitle','goalDescription','goalDeadline'].forEach(id => document.getElementById(id).value='');
  saveGoals(); renderGoals(); sounds.add(); showToast('Goal added.');
}
function updateGoalProgress(id, val) {
  const g = goals.find(g=>g.id===id); if (!g) return; g.progress = +val; saveGoals();
  const bar=document.querySelector(`[data-goal-bar="${id}"]`), pct=document.querySelector(`[data-goal-pct="${id}"]`);
  if (bar) bar.style.width = val+'%'; if (pct) pct.textContent = val+'%';
  if (+val===100) { sounds.complete(); confettiAt(bar, 90); showWin('Goal Achieved. 🏆'); showToast('Goal complete! 🏆'); }
}
function deleteGoal(id) { goals=goals.filter(g=>g.id!==id); saveGoals(); renderGoals(); sounds.delete(); }
function renderGoals() {
  const grid = document.getElementById('goalsGrid');
  if (!goals.length) { grid.innerHTML=`<div class="empty-state"><div class="empty-icon">🎯</div><p>Dream big. Set your first goal above!</p></div>`; return; }
  grid.innerHTML = goals.map(g => {
    let dlClass='', dlText='';
    if (g.deadline) { const days=Math.ceil((new Date(g.deadline)-new Date())/86400000); if (days<0){dlClass='overdue';dlText=`⚠ Overdue by ${Math.abs(days)}d`;}else if(days<=7){dlClass='soon';dlText=`⚡ ${days}d left`;}else dlText=`📅 ${g.deadline}`; }
    return `<div class="goal-card" data-category="${g.category}" data-id="${g.id}">
      <div class="goal-cat-badge">${CAT_LABELS[g.category]||g.category}</div>
      <div class="goal-title">${escapeHtml(g.title)}</div>
      ${g.description?`<div class="goal-desc">${escapeHtml(g.description)}</div>`:''}
      ${dlText?`<div class="goal-deadline ${dlClass}">${dlText}</div>`:''}
      <div class="goal-progress-row"><div class="goal-progress-bar"><div class="goal-progress-fill" data-goal-bar="${g.id}" style="width:${g.progress}%"></div></div><span class="goal-progress-pct" data-goal-pct="${g.id}">${g.progress}%</span></div>
      <div class="goal-actions"><input type="range" class="goal-slider" min="0" max="100" value="${g.progress}" data-gslider="${g.id}" /><button class="btn btn-danger btn-sm" data-gdel="${g.id}">✕</button></div>
    </div>`;
  }).join('');
}

// ═══════════════════════════════════════════════════════════════════════════
// SLEEP TRACKER
// ═══════════════════════════════════════════════════════════════════════════
let selectedSleepQuality = 0;

function initSleepWidget() {
  const sel = document.getElementById('sleepQualitySelector');
  if (!sel) return;
  sel.addEventListener('click', e => {
    const dot = e.target.closest('.sq-dot'); if (!dot) return;
    selectedSleepQuality = +dot.dataset.q; updateSleepQualityDots();
  });
  document.getElementById('logSleepBtn').addEventListener('click', logSleep);
  // Pre-fill today's entry quality dots
  const entry = sleepLog.find(e => e.date === TODAY);
  if (entry) { selectedSleepQuality = entry.quality; updateSleepQualityDots(); document.getElementById('sleepHours').value = entry.hours; }
  renderSleepTodayBadge();
}
function updateSleepQualityDots() {
  document.querySelectorAll('.sq-dot').forEach(dot => dot.classList.toggle('filled', +dot.dataset.q <= selectedSleepQuality));
}
function logSleep() {
  const hours = parseFloat(document.getElementById('sleepHours').value);
  if (!hours || hours < 1 || hours > 12) { showToast('Enter valid hours (1–12)'); return; }
  if (!selectedSleepQuality) { showToast('Select sleep quality'); return; }
  const entry = { date:TODAY, hours, quality:selectedSleepQuality };
  const idx = sleepLog.findIndex(e => e.date===TODAY);
  if (idx!==-1) sleepLog[idx]=entry; else sleepLog.push(entry);
  store.set('fs_sleep', sleepLog); renderSleepTodayBadge(); sounds.save(); showToast(`Sleep logged: ${hours}h ✓`);
}
function renderSleepTodayBadge() {
  const badge = document.getElementById('sleepTodayBadge'); if (!badge) return;
  const entry = sleepLog.find(e => e.date===TODAY);
  badge.textContent = entry ? `Today: ${entry.hours}h ${'★'.repeat(entry.quality)}` : '';
}

// ═══════════════════════════════════════════════════════════════════════════
// ── CHART ENGINE ──────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
const CC = {
  accent:  '#c9a84c', accent2: '#e8c97a', gold: '#c9a84c',
  green:   '#00c896', red:     '#ff4d6a', blue: '#4d9fff',
  border:  '#212124', text2:   '#7a7780', text3: '#3d3a42',
  surface: '#141416', surface2:'#1a1a1d', bg:   '#080809', bg3: '#111113',
};

function setupHiDPI(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.parentElement.getBoundingClientRect();
  const w = rect.width  || 600;
  const h = (canvas.parentElement.classList.contains('heatmap-wrap') || canvas.parentElement.classList.contains('habit-strip-canvas-wrap')) ? undefined : (rect.height || 240);
  if (h !== undefined) {
    canvas.width = w*dpr; canvas.height = h*dpr;
    canvas.style.width = w+'px'; canvas.style.height = h+'px';
  }
  const ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr);
  return { ctx, w, h: h || rect.height };
}

function easeOut(t) { return 1 - Math.pow(1-t, 3); }
function animateChart(duration, draw) {
  const t0 = performance.now();
  const frame = now => { const t = Math.min((now-t0)/duration,1); draw(easeOut(t)); if (t<1) requestAnimationFrame(frame); };
  requestAnimationFrame(frame);
}

// ── Heatmap ────────────────────────────────────────────────────────────────
function drawHeatmap() {
  const canvas = document.getElementById('heatmapCanvas'); if (!canvas) return;
  const CELL=13, GAP=3, WEEKS=12, DAYS=7, LEFT=28, TOP=22;
  const totalW = LEFT + WEEKS*(CELL+GAP), totalH = TOP + DAYS*(CELL+GAP)+8;
  const dpr = window.devicePixelRatio||1;
  canvas.width=totalW*dpr; canvas.height=totalH*dpr;
  canvas.style.width=totalW+'px'; canvas.style.height=totalH+'px';
  const ctx = canvas.getContext('2d'); ctx.scale(dpr,dpr);
  const days = getLast(WEEKS*DAYS);
  const maxScore = Math.max(1, ...days.map(d => d.tasks+d.habits+Math.floor(d.focusMin/10)));
  const LEVELS = ['#111113','#2a2100','#5a4500','#c9a84c','#e8c97a'];
  function scoreColor(d) { const s=d.tasks+d.habits+Math.floor(d.focusMin/10); if(!s) return LEVELS[0]; return LEVELS[Math.min(Math.ceil((s/maxScore)*4),4)]; }
  ctx.font = '10px Space Grotesk, Inter, sans-serif'; ctx.fillStyle = CC.text3;
  ['M','T','W','T','F','S','S'].forEach((l,i) => ctx.fillText(l, 6, TOP+i*(CELL+GAP)+CELL-2));
  let prevMonth='';
  for (let w=0;w<WEEKS;w++) {
    const first = days[w*DAYS];
    if (first) { const mo=new Date(first.date+'T00:00').toLocaleDateString(undefined,{month:'short'}); if(mo!==prevMonth){ctx.fillStyle=CC.text2;ctx.fillText(mo,LEFT+w*(CELL+GAP),12);prevMonth=mo;} }
    for (let d=0;d<DAYS;d++) {
      const entry=days[w*DAYS+d]; const x=LEFT+w*(CELL+GAP); const y=TOP+d*(CELL+GAP);
      ctx.fillStyle = entry ? scoreColor(entry) : LEVELS[0];
      ctx.beginPath(); ctx.roundRect(x,y,CELL,CELL,2); ctx.fill();
      if (entry?.date===TODAY) { ctx.strokeStyle='rgba(255,255,255,.4)'; ctx.lineWidth=1.5; ctx.beginPath(); ctx.roundRect(x,y,CELL,CELL,2); ctx.stroke(); }
    }
  }
  const legendWrap = document.getElementById('heatmapLegend');
  legendWrap.innerHTML = LEVELS.map(c=>`<div class="heatmap-legend-cell" style="background:${c}"></div>`).join('');
  canvas.onmousemove = e => {
    const rect=canvas.getBoundingClientRect(), mx=e.clientX-rect.left, my=e.clientY-rect.top;
    const col=Math.floor((mx-LEFT)/(CELL+GAP)), row=Math.floor((my-TOP)/(CELL+GAP));
    const tip=document.getElementById('chartTooltip');
    if (col>=0&&col<WEEKS&&row>=0&&row<DAYS) {
      const entry=days[col*DAYS+row];
      if (entry) { const s=entry.tasks+entry.habits+Math.floor(entry.focusMin/10); tip.innerHTML=`<strong>${entry.date}</strong><br>Tasks: ${entry.tasks} · Habits: ${entry.habits} · Focus: ${entry.focusMin}min<br>Score: ${s}`; tip.style.left=(e.clientX+12)+'px'; tip.style.top=(e.clientY-65)+'px'; tip.classList.add('visible'); return; }
    }
    tip.classList.remove('visible');
  };
  canvas.onmouseleave = () => document.getElementById('chartTooltip').classList.remove('visible');
}

// ── Bar Chart ──────────────────────────────────────────────────────────────
function drawBarChart() {
  const canvas = document.getElementById('barCanvas'); if (!canvas) return;
  const { ctx, w, h } = setupHiDPI(canvas);
  const data = getLast(14), PAD={top:18,right:14,bottom:44,left:38};
  const chartW=w-PAD.left-PAD.right, chartH=h-PAD.top-PAD.bottom;
  const maxVal = Math.max(1,...data.map(d=>Math.max(d.tasks,d.habits,Math.floor(d.focusMin/10))));
  const GROUP=chartW/data.length, BAR_W=Math.max(3,(GROUP-6)/3);
  const COLORS=[CC.accent,CC.accent2,CC.green];
  ctx.clearRect(0,0,w,h);
  function drawGrid() {
    for (let i=0;i<=4;i++) { const y=PAD.top+chartH-(chartH*i/4); ctx.strokeStyle=CC.border; ctx.lineWidth=1; ctx.setLineDash([3,4]); ctx.beginPath(); ctx.moveTo(PAD.left,y); ctx.lineTo(PAD.left+chartW,y); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle=CC.text3; ctx.font='9px Space Grotesk,Inter,sans-serif'; ctx.textAlign='right'; ctx.fillText(Math.round(maxVal*i/4),PAD.left-5,y+3); }
  }
  drawGrid();
  animateChart(700, progress => {
    ctx.clearRect(PAD.left,PAD.top,chartW,chartH+1); drawGrid();
    data.forEach((d,gi) => {
      [d.tasks, d.habits, Math.floor(d.focusMin/10)].forEach((val,bi) => {
        const barH=((val/maxVal)*chartH)*progress; const x=PAD.left+gi*GROUP+3+bi*(BAR_W+2); const y=PAD.top+chartH-barH;
        ctx.fillStyle=COLORS[bi]; ctx.globalAlpha=0.88; ctx.beginPath(); ctx.roundRect(x,y,BAR_W,barH,[2,2,0,0]); ctx.fill(); ctx.globalAlpha=1;
      });
    });
    if (progress===1) { ctx.fillStyle=CC.text3; ctx.font='9px Space Grotesk,Inter,sans-serif'; ctx.textAlign='center'; data.forEach((d,gi)=>{ if(gi%2===0) ctx.fillText(d.date.slice(5),PAD.left+gi*GROUP+GROUP/2,PAD.top+chartH+15); }); }
  });
}

// ── Line Chart ─────────────────────────────────────────────────────────────
function drawLineChart() {
  const canvas = document.getElementById('lineCanvas'); if (!canvas) return;
  const { ctx, w, h } = setupHiDPI(canvas);
  const data = getLast(30), PAD={top:18,right:14,bottom:34,left:42};
  const chartW=w-PAD.left-PAD.right, chartH=h-PAD.top-PAD.bottom;
  const maxVal = Math.max(1,...data.map(d=>d.focusMin));
  ctx.clearRect(0,0,w,h);
  function ptX(i) { return PAD.left+(i/(data.length-1))*chartW; }
  function ptY(v) { return PAD.top+chartH-(v/maxVal)*chartH; }
  function drawGrid() {
    for (let i=0;i<=4;i++) { const y=PAD.top+chartH-(chartH*i/4); ctx.strokeStyle=CC.border; ctx.lineWidth=1; ctx.setLineDash([3,4]); ctx.beginPath(); ctx.moveTo(PAD.left,y); ctx.lineTo(PAD.left+chartW,y); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle=CC.text3; ctx.font='9px Space Grotesk,Inter,sans-serif'; ctx.textAlign='right'; ctx.fillText(Math.round(maxVal*i/4),PAD.left-5,y+3); }
  }
  drawGrid();
  animateChart(800, progress => {
    ctx.clearRect(PAD.left-1,PAD.top-1,chartW+2,chartH+2); drawGrid();
    const cutoff = Math.floor(data.length*progress);
    const grad = ctx.createLinearGradient(0,PAD.top,0,PAD.top+chartH);
    grad.addColorStop(0,'rgba(201,168,76,0.28)'); grad.addColorStop(1,'rgba(201,168,76,0)');
    ctx.beginPath(); ctx.moveTo(ptX(0),PAD.top+chartH);
    data.slice(0,cutoff+1).forEach((d,i)=>ctx.lineTo(ptX(i),ptY(d.focusMin)));
    ctx.lineTo(ptX(cutoff),PAD.top+chartH); ctx.closePath(); ctx.fillStyle=grad; ctx.fill();
    ctx.beginPath(); ctx.strokeStyle=CC.accent; ctx.lineWidth=2; ctx.lineJoin='round';
    data.slice(0,cutoff+1).forEach((d,i)=>{ if(i===0)ctx.moveTo(ptX(i),ptY(d.focusMin));else ctx.lineTo(ptX(i),ptY(d.focusMin)); }); ctx.stroke();
    data.slice(0,cutoff+1).forEach((d,i)=>{ if(d.focusMin>0){ctx.beginPath();ctx.arc(ptX(i),ptY(d.focusMin),3,0,Math.PI*2);ctx.fillStyle=CC.accent;ctx.fill();ctx.strokeStyle=CC.bg;ctx.lineWidth=1.5;ctx.stroke();} });
  });
  ctx.fillStyle=CC.text3; ctx.font='9px Space Grotesk,Inter,sans-serif'; ctx.textAlign='center';
  [0,6,13,20,29].forEach(i=>{ if(data[i]) ctx.fillText(data[i].date.slice(5),ptX(i),PAD.top+chartH+18); });
  canvas.onmousemove = e => {
    const rect=canvas.getBoundingClientRect(), mx=e.clientX-rect.left, tip=document.getElementById('chartTooltip');
    const idx=Math.round(((mx-PAD.left)/chartW)*(data.length-1));
    if(idx>=0&&idx<data.length){const d=data[idx];tip.innerHTML=`<strong>${d.date}</strong><br>Focus: ${d.focusMin} min`;tip.style.left=(e.clientX+12)+'px';tip.style.top=(e.clientY-45)+'px';tip.classList.add('visible');}
    else tip.classList.remove('visible');
  };
  canvas.onmouseleave = ()=>document.getElementById('chartTooltip').classList.remove('visible');
}

// ── Habit Heat Strips ──────────────────────────────────────────────────────
function drawHabitHeatStrips() {
  const container = document.getElementById('habitRingsRow'); if (!container) return;
  if (!habits.length) { container.innerHTML='<p class="empty-state-mini">Add habits to see your consistency strips!</p>'; return; }
  const CELL=10, GAP=2, DAYS=90;
  const dates = Array.from({length:DAYS},(_,i)=>{ const d=new Date(); d.setDate(d.getDate()-(DAYS-1-i)); return d.toISOString().slice(0,10); });
  container.innerHTML='<div class="habit-strips-container" id="habitStripsContainer"></div>';
  const sc = document.getElementById('habitStripsContainer');
  habits.forEach(h => {
    const logSet = new Set(h.log||[]);
    const row = document.createElement('div'); row.className='habit-strip-row';
    const label = document.createElement('div'); label.className='habit-strip-label';
    label.innerHTML=`<span class="habit-strip-icon">${h.icon}</span><span class="habit-strip-name" title="${escapeHtml(h.name)}">${escapeHtml(h.name)}</span>`;
    row.appendChild(label);
    const canvasWrap = document.createElement('div'); canvasWrap.className='habit-strip-canvas-wrap';
    const canvas = document.createElement('canvas');
    const cW=DAYS*(CELL+GAP)-GAP, cH=CELL, dpr=window.devicePixelRatio||1;
    canvas.width=cW*dpr; canvas.height=cH*dpr; canvas.style.width=cW+'px'; canvas.style.height=cH+'px';
    const ctx=canvas.getContext('2d'); ctx.scale(dpr,dpr);
    dates.forEach((date,i)=>{
      if (date>TODAY) return;
      const x=i*(CELL+GAP), done=logSet.has(date), isToday=date===TODAY;
      ctx.fillStyle = done ? CC.gold : CC.surface2;
      ctx.beginPath(); ctx.roundRect(x,0,CELL,CELL,2); ctx.fill();
      if (isToday) { ctx.strokeStyle='rgba(255,255,255,.5)'; ctx.lineWidth=1; ctx.beginPath(); ctx.roundRect(x,0,CELL,CELL,2); ctx.stroke(); }
    });
    canvasWrap.appendChild(canvas); row.appendChild(canvasWrap); sc.appendChild(row);
    canvas.onmousemove = e => {
      const rect=canvas.getBoundingClientRect(), mx=e.clientX-rect.left, idx=Math.floor(mx/(CELL+GAP));
      if(idx<0||idx>=DAYS){document.getElementById('chartTooltip').classList.remove('visible');return;}
      const date=dates[idx]; if(!date||date>TODAY){document.getElementById('chartTooltip').classList.remove('visible');return;}
      let streak=0; const cd=new Date(date+'T00:00');
      while(logSet.has(cd.toISOString().slice(0,10))){streak++;cd.setDate(cd.getDate()-1);}
      const tip=document.getElementById('chartTooltip');
      tip.innerHTML=`<strong>${date}</strong><br>${escapeHtml(h.name)}: ${logSet.has(date)?'✓ Done':'✗ Missed'}${streak>0?`<br>Streak: ${streak}d`:''}`;
      tip.style.left=(e.clientX+12)+'px'; tip.style.top=(e.clientY-60)+'px'; tip.classList.add('visible');
    };
    canvas.onmouseleave = ()=>document.getElementById('chartTooltip').classList.remove('visible');
  });
}

// ── Goals Chart ────────────────────────────────────────────────────────────
function drawGoalsChart() {
  const wrap = document.getElementById('goalsChartWrap'); if (!wrap) return;
  if (!goals.length) { wrap.innerHTML='<p class="empty-state-mini" style="padding:20px 0">No goals yet — add some in Goals!</p>'; return; }
  let canvas = document.getElementById('goalsCanvas');
  if (!canvas) { canvas=document.createElement('canvas'); canvas.id='goalsCanvas'; wrap.innerHTML=''; wrap.appendChild(canvas); }
  const CAT_COLORS = { career:CC.blue, health:CC.red, finance:CC.gold, personal:CC.accent, learning:CC.green, relationships:'#d4739f' };
  const BAR_H=26, GAP=12, LABEL_W=190, RIGHT_W=110, PAD={top:12,bottom:12,left:LABEL_W,right:RIGHT_W};
  const totalH = PAD.top + goals.length*(BAR_H+GAP) - GAP + PAD.bottom;
  const dpr=window.devicePixelRatio||1, cW=wrap.getBoundingClientRect().width||600, chartBarW=cW-PAD.left-PAD.right;
  canvas.width=cW*dpr; canvas.height=totalH*dpr; canvas.style.width=cW+'px'; canvas.style.height=totalH+'px';
  const ctx=canvas.getContext('2d'); ctx.scale(dpr,dpr); ctx.clearRect(0,0,cW,totalH);
  animateChart(700, progress => {
    ctx.clearRect(0,0,cW,totalH);
    goals.forEach((g,i)=>{
      const y=PAD.top+i*(BAR_H+GAP), color=CAT_COLORS[g.category]||CC.accent;
      ctx.fillStyle=CC.surface2; ctx.beginPath(); ctx.roundRect(PAD.left,y,chartBarW,BAR_H,3); ctx.fill();
      const bW=Math.max(0,(g.progress/100)*chartBarW*progress);
      if(bW>0){ctx.fillStyle=color;ctx.globalAlpha=0.85;ctx.beginPath();ctx.roundRect(PAD.left,y,bW,BAR_H,3);ctx.fill();ctx.globalAlpha=1;}
      const lbl=g.title.length>26?g.title.slice(0,25)+'…':g.title;
      ctx.fillStyle=CC.text2; ctx.font='12px Space Grotesk,Inter,sans-serif'; ctx.textAlign='right'; ctx.textBaseline='middle';
      ctx.fillText(lbl,PAD.left-10,y+BAR_H/2);
      const dl=g.deadline?` · ${g.deadline.slice(5)}`:'';
      ctx.fillStyle=CC.text2; ctx.font='11px Space Grotesk,Inter,sans-serif'; ctx.textAlign='left';
      ctx.fillText(`${g.progress}%${dl}`,PAD.left+chartBarW+8,y+BAR_H/2);
    });
  });
  canvas.onmousemove = e => {
    const rect=canvas.getBoundingClientRect(), my=e.clientY-rect.top, tip=document.getElementById('chartTooltip');
    const idx=Math.floor((my-PAD.top)/(BAR_H+GAP));
    if(idx>=0&&idx<goals.length){const g=goals[idx];tip.innerHTML=`<strong>${escapeHtml(g.title)}</strong><br>Progress: ${g.progress}%${g.deadline?`<br>Due: ${g.deadline}`:''}`;tip.style.left=(e.clientX+12)+'px';tip.style.top=(e.clientY-55)+'px';tip.classList.add('visible');}
    else tip.classList.remove('visible');
  };
  canvas.onmouseleave = ()=>document.getElementById('chartTooltip').classList.remove('visible');
}

// ── Sleep Chart ────────────────────────────────────────────────────────────
function drawSleepChart() {
  const canvas = document.getElementById('sleepCanvas'); if (!canvas) return;
  const { ctx, w, h } = setupHiDPI(canvas);
  const PAD={top:18,right:56,bottom:36,left:40}, MAX_H=12, TARGET=8;
  const dates = Array.from({length:30},(_,i)=>{ const d=new Date(); d.setDate(d.getDate()-(29-i)); return d.toISOString().slice(0,10); });
  const data = dates.map(date => sleepLog.find(e=>e.date===date) || {date,hours:0,quality:0});
  const chartW=w-PAD.left-PAD.right, chartH=h-PAD.top-PAD.bottom;
  const BAR_W=Math.max(4,chartW/data.length-3);
  ctx.clearRect(0,0,w,h);
  function drawGrid() {
    for(let i=0;i<=4;i++){const val=(MAX_H/4)*i,y=PAD.top+chartH-(val/MAX_H)*chartH;ctx.strokeStyle=CC.border;ctx.lineWidth=1;ctx.setLineDash([3,4]);ctx.beginPath();ctx.moveTo(PAD.left,y);ctx.lineTo(PAD.left+chartW,y);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle=CC.text3;ctx.font='9px Space Grotesk,Inter,sans-serif';ctx.textAlign='right';ctx.fillText(val+'h',PAD.left-5,y+3);}
    // Target line
    const ty=PAD.top+chartH-(TARGET/MAX_H)*chartH;
    ctx.strokeStyle=CC.text3; ctx.lineWidth=1; ctx.setLineDash([5,4]);
    ctx.beginPath();ctx.moveTo(PAD.left,ty);ctx.lineTo(PAD.left+chartW,ty);ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle=CC.text3;ctx.font='9px Space Grotesk,Inter,sans-serif';ctx.textAlign='left';ctx.fillText('Target 8h',PAD.left+chartW+6,ty+3);
  }
  drawGrid();
  animateChart(700, progress=>{
    ctx.clearRect(PAD.left,PAD.top,chartW,chartH+1); drawGrid();
    data.forEach((d,i)=>{
      if(!d.hours) return;
      const barH=(d.hours/MAX_H)*chartH*progress, x=PAD.left+i*(chartW/data.length)+2, y=PAD.top+chartH-barH;
      ctx.fillStyle=d.hours>=TARGET?CC.green:d.hours>=6?CC.gold:CC.red;
      ctx.globalAlpha=0.88;ctx.beginPath();ctx.roundRect(x,y,BAR_W,barH,[2,2,0,0]);ctx.fill();ctx.globalAlpha=1;
    });
    if(progress===1){ctx.fillStyle=CC.text3;ctx.font='9px Space Grotesk,Inter,sans-serif';ctx.textAlign='center';data.forEach((d,i)=>{if(i%5===0)ctx.fillText(d.date.slice(5),PAD.left+i*(chartW/data.length)+BAR_W/2,PAD.top+chartH+17);});}
  });
  // Stats
  const cutoff=new Date();cutoff.setDate(cutoff.getDate()-29);
  const tracked=sleepLog.filter(e=>e.date>=cutoff.toISOString().slice(0,10)&&e.hours>0);
  const avg=tracked.length?(tracked.reduce((s,e)=>s+e.hours,0)/tracked.length).toFixed(1):'—';
  const best=tracked.length?Math.max(...tracked.map(e=>e.hours)):'—', worst=tracked.length?Math.min(...tracked.map(e=>e.hours)):'—';
  document.getElementById('sleepAvgHours').textContent=avg;
  document.getElementById('sleepNightsTracked').textContent=tracked.length||'—';
  document.getElementById('sleepBestNight').textContent=best+(best!=='—'?'h':'');
  document.getElementById('sleepWorstNight').textContent=worst+(worst!=='—'?'h':'');
  canvas.onmousemove=e=>{
    const rect=canvas.getBoundingClientRect(),mx=e.clientX-rect.left,idx=Math.floor((mx-PAD.left)/(chartW/data.length)),tip=document.getElementById('chartTooltip');
    if(idx>=0&&idx<data.length&&data[idx].hours>0){const d=data[idx],stars='★'.repeat(d.quality)+'☆'.repeat(5-d.quality);tip.innerHTML=`<strong>${d.date}</strong><br>${d.hours}h sleep · ${stars}`;tip.style.left=(e.clientX+12)+'px';tip.style.top=(e.clientY-55)+'px';tip.classList.add('visible');}
    else tip.classList.remove('visible');
  };
  canvas.onmouseleave=()=>document.getElementById('chartTooltip').classList.remove('visible');
}

// ── Analytics master render ────────────────────────────────────────────────
function renderAnalyticsSummary() {
  const total=dailyLog.reduce((s,e)=>s+(e.tasks||0),0);
  const focusH=Math.round(dailyLog.reduce((s,e)=>s+(e.focusMin||0),0)/60);
  const totalHabits=dailyLog.reduce((s,e)=>s+(e.habits||0),0);
  animateCounter(document.getElementById('asummTotal'),  0, total);
  animateCounter(document.getElementById('asummFocus'),  0, focusH);
  animateCounter(document.getElementById('asummHabits'), 0, totalHabits);
  animateCounter(document.getElementById('asummBestDay'),0, settings.streak||0);
}
function renderAnalytics() {
  renderAnalyticsSummary();
  requestAnimationFrame(() => {
    drawHeatmap(); drawBarChart(); drawLineChart();
    drawHabitHeatStrips(); drawGoalsChart(); drawSleepChart();
    const hasDemo=dailyLog.some(e=>e._demo)||sleepLog.some(e=>e._demo);
    document.getElementById('demoDataBtn').style.display = hasDemo?'none':'';
    document.getElementById('clearDemoBtn').style.display = hasDemo?'':'none';
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// FAB
// ═══════════════════════════════════════════════════════════════════════════
function initFAB() {
  const wrap=document.getElementById('fabWrap'), main=document.getElementById('fabMain'); let open=false;
  main.onclick=e=>{e.stopPropagation();open=!open;wrap.classList.toggle('expanded',open);main.classList.toggle('open',open);};
  document.addEventListener('click',()=>{if(open){open=false;wrap.classList.remove('expanded');main.classList.remove('open');}});
  wrap.querySelectorAll('.fab-action').forEach(btn=>{
    btn.onclick=e=>{e.stopPropagation();open=false;wrap.classList.remove('expanded');main.classList.remove('open');
      const a=btn.dataset.action;
      if(a==='task'){navigate('tasks');setTimeout(()=>document.getElementById('taskInput')?.focus(),300);}
      if(a==='habit'){navigate('habits');setTimeout(()=>document.getElementById('habitInput')?.focus(),300);}
      if(a==='timer'){navigate('timer');setTimeout(()=>document.getElementById('timerToggle')?.click(),300);}
      if(a==='journal'){navigate('journal');setTimeout(()=>document.getElementById('journalEntry')?.focus(),300);}
    };
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// KEYBOARD SHORTCUTS
// ═══════════════════════════════════════════════════════════════════════════
function initKeyboardShortcuts() {
  document.addEventListener('keydown', e => {
    const tag=document.activeElement.tagName.toLowerCase();
    if(tag==='input'||tag==='textarea'||tag==='select'){if(e.key==='Escape'){document.activeElement.blur();closeModal();}return;}
    if(e.metaKey||e.ctrlKey||e.altKey) return;
    const map={d:'dashboard',t:'tasks',f:'timer',h:'habits',j:'journal',g:'goals',a:'analytics'};
    if(map[e.key]){e.preventDefault();navigate(map[e.key]);return;}
    if(e.key==='n'){e.preventDefault();navigate('tasks');setTimeout(()=>document.getElementById('taskInput')?.focus(),200);}
    if(e.key===' '&&document.getElementById('section-timer').classList.contains('active')){e.preventDefault();if(timerState.running)pauseTimer();else startTimer();}
    if(e.key==='s'){e.preventDefault();settings.soundOn=!settings.soundOn;store.set('fs_settings',settings);updateSoundToggle();showToast(settings.soundOn?'🔊 Sound on':'🔇 Sound off');}
    if(e.key==='?'){e.preventDefault();document.getElementById('shortcutsOverlay').classList.toggle('open');}
    if(e.key==='Escape'){closeModal();document.getElementById('shortcutsOverlay').classList.remove('open');}
  });
  document.getElementById('shortcutsClose').onclick=()=>document.getElementById('shortcutsOverlay').classList.remove('open');
  document.getElementById('shortcutsOverlay').addEventListener('click',e=>{if(e.target===document.getElementById('shortcutsOverlay'))document.getElementById('shortcutsOverlay').classList.remove('open');});
}
function updateSoundToggle() { const btn=document.getElementById('soundToggle'); btn.textContent=settings.soundOn?'🔊':'🔇'; btn.classList.toggle('muted',!settings.soundOn); }

// ═══════════════════════════════════════════════════════════════════════════
// NAME MODAL
// ═══════════════════════════════════════════════════════════════════════════
function showNameModal() {
  openModal('What\'s your name?',`<input type="text" class="text-input" id="nameInput" value="${escapeHtml(settings.name||'')}" placeholder="Your name" style="width:100%" maxlength="30" />`,`<button class="btn btn-ghost" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveName()">Save</button>`);
  setTimeout(()=>document.getElementById('nameInput')?.focus(),100);
}
function saveName() { const v=document.getElementById('nameInput')?.value.trim()||''; settings.name=v; store.set('fs_settings',settings); updateGreeting(); closeModal(); showToast('Name saved.'); }

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════
function escapeHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function formatDate(d) { return new Date(d+'T00:00').toLocaleDateString(undefined,{weekday:'short',year:'numeric',month:'short',day:'numeric'}); }

// ═══════════════════════════════════════════════════════════════════════════
// EVENT LISTENERS
// ═══════════════════════════════════════════════════════════════════════════
function attachEvents() {
  document.querySelectorAll('.nav-item').forEach(item=>item.addEventListener('click',e=>{e.preventDefault();navigate(item.dataset.section);}));
  document.querySelectorAll('[data-nav]').forEach(btn=>btn.addEventListener('click',()=>navigate(btn.dataset.nav)));
  document.getElementById('newQuoteBtn').addEventListener('click',nextQuote);
  document.getElementById('favoriteQuoteBtn').addEventListener('click',saveQuote);
  document.getElementById('nameBtn').addEventListener('click',showNameModal);
  document.getElementById('soundToggle').addEventListener('click',()=>{settings.soundOn=!settings.soundOn;store.set('fs_settings',settings);updateSoundToggle();showToast(settings.soundOn?'🔊 Sound on':'🔇 Sound off');});
  // Tasks
  document.getElementById('addTaskBtn').addEventListener('click',addTask);
  document.getElementById('taskInput').addEventListener('keydown',e=>{if(e.key==='Enter')addTask();});
  document.getElementById('taskFilter').addEventListener('change',renderTasks);
  document.getElementById('doneHeader').addEventListener('click',()=>{const l=document.getElementById('taskListDone');l.classList.toggle('collapsed');document.querySelector('#doneHeader .chevron').style.transform=l.classList.contains('collapsed')?'rotate(-90deg)':'rotate(0)';});
  document.querySelectorAll('#taskListPending,#taskListDone').forEach(list=>{
    list.addEventListener('click',e=>{const check=e.target.closest('[data-check]'),del=e.target.closest('[data-del]');if(check)toggleTask(+check.dataset.check,check);if(del)deleteTask(+del.dataset.del);});
  });
  // Timer
  document.querySelectorAll('.mode-btn').forEach(btn=>btn.addEventListener('click',()=>setTimerMode(btn.dataset.mode,+btn.dataset.minutes)));
  document.getElementById('applyCustom').addEventListener('click',()=>setTimerMode('custom',Math.max(1,Math.min(180,+document.getElementById('customMinutes').value||25))));
  document.getElementById('timerToggle').addEventListener('click',()=>{if(timerState.running)pauseTimer();else startTimer();});
  document.getElementById('timerReset').addEventListener('click',resetTimer);
  document.getElementById('timerSkip').addEventListener('click',()=>{stopTimer();timerState.remainSec=0;onTimerComplete();});
  // Habits
  document.getElementById('addHabitBtn').addEventListener('click',addHabit);
  document.getElementById('habitInput').addEventListener('keydown',e=>{if(e.key==='Enter')addHabit();});
  document.getElementById('habitsGrid').addEventListener('click',e=>{const toggle=e.target.closest('[data-toggle]'),del=e.target.closest('[data-del]');if(toggle)toggleHabit(+toggle.dataset.toggle,toggle);if(del)deleteHabit(+del.dataset.del);});
  // Journal
  document.querySelectorAll('.prompt-chip').forEach(chip=>chip.addEventListener('click',()=>{const ta=document.getElementById('journalEntry');ta.value=ta.value?ta.value+'\n\n'+chip.dataset.prompt+'\n':chip.dataset.prompt+'\n';ta.focus();ta.setSelectionRange(ta.value.length,ta.value.length);}));
  document.getElementById('journalEntry').addEventListener('input',()=>{const w=document.getElementById('journalEntry').value.trim().split(/\s+/).filter(Boolean).length;document.getElementById('wordCount').textContent=w+(w===1?' word':' words');});
  document.getElementById('saveJournalBtn').addEventListener('click',saveJournalEntry);
  // Goals
  document.getElementById('addGoalBtn').addEventListener('click',addGoal);
  document.getElementById('goalTitle').addEventListener('keydown',e=>{if(e.key==='Enter')addGoal();});
  document.getElementById('goalsGrid').addEventListener('input',e=>{const s=e.target.closest('[data-gslider]');if(s)updateGoalProgress(+s.dataset.gslider,s.value);});
  document.getElementById('goalsGrid').addEventListener('click',e=>{const d=e.target.closest('[data-gdel]');if(d)deleteGoal(+d.dataset.gdel);});
  // Analytics
  document.getElementById('demoDataBtn').addEventListener('click',loadDemoData);
  document.getElementById('clearDemoBtn').addEventListener('click',clearDemoData);
  // Modal
  document.getElementById('modalClose').addEventListener('click',closeModal);
  document.getElementById('modalOverlay').addEventListener('click',e=>{if(e.target===document.getElementById('modalOverlay'))closeModal();});
  // Resize → redraw charts
  let rt; window.addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(()=>{if(document.getElementById('section-analytics').classList.contains('active'))renderAnalytics();},200);});
}

// ── Auto-save journal ──────────────────────────────────────────────────────
let journalAutoSave;
function initJournalAutoSave() {
  document.getElementById('journalEntry')?.addEventListener('input',()=>{clearTimeout(journalAutoSave);journalAutoSave=setTimeout(()=>{const t=document.getElementById('journalEntry').value.trim();if(t)saveJournalEntry();},3000);});
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
  initSleepWidget();
  setInterval(nextQuote, 30000);
  setInterval(updateGreeting, 60000);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
