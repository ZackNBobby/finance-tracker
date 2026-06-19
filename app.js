// app.js — Finance Tracker main application

const state = {
  theme: 'vibrant',
  allTransactions: [],
  currentMonth: null,
  availableMonths: [],
  donutChart: null,
  barChart: null,
  txnFilter: 'all',
};

// ─── theme ─────────────────────────────────────────────────────────────────

function setTheme(name) {
  document.body.className = `theme-${name}`;
  document.querySelectorAll('.theme-dot').forEach(b => b.classList.toggle('active', b.dataset.theme === name));
  state.theme = name;
  localStorage.setItem('ft-theme', name);
  if (state.donutChart) renderCharts();
}


// ─── screens ───────────────────────────────────────────────────────────────

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ─── upload ────────────────────────────────────────────────────────────────

function initUpload() {
  const dropZone  = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');

  document.getElementById('btn-browse').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', e => {
    const files = [...e.target.files].filter(f => f.type === 'application/pdf');
    if (files.length) processFiles(files);
  });

  dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const files = [...e.dataTransfer.files].filter(f => f.type === 'application/pdf');
    if (files.length) processFiles(files);
    else showToast('Please drop a PDF file', 'error');
  });

  document.getElementById('btn-sample').addEventListener('click', loadSampleData);
  document.getElementById('btn-reupload').addEventListener('click', () => {
    showScreen('upload-screen');
    fileInput.value = '';
  });
}

// ─── pdf processing ────────────────────────────────────────────────────────

async function processFiles(files) {
  showScreen('processing-screen');
  const allTxns = [];
  try {
    for (let i = 0; i < files.length; i++) {
      const label = files.length > 1 ? `[${i + 1}/${files.length}] ` : '';
      const result = await parseStatementPDF(files[i], msg => setProcessingLabel(label + msg));
      allTxns.push(...result.transactions);
    }
    if (!allTxns.length) {
      showToast('No transactions found — PDF format may not be supported yet.', 'error');
      showScreen('upload-screen');
      return;
    }
    loadTransactions(allTxns);
  } catch (err) {
    console.error(err);
    showToast(`Parse error: ${err.message}`, 'error');
    showScreen('upload-screen');
  }
}

function setProcessingLabel(text) {
  const el = document.getElementById('processing-label');
  if (el) el.textContent = text;
}

// ─── sample data ───────────────────────────────────────────────────────────

function loadSampleData() {
  const y = 2025, m = 11; // December 2025 (month index 11)
  const d = (day, desc, amt, type = 'debit') =>
    ({ date: new Date(y, m, day), description: desc, amount: amt, type, src: 'sample' });

  const txns = [
    d(1,  'GRAB* FOOD SG', 14.50),
    d(1,  'MCDONALD\'S SINGAPORE', 8.90),
    d(2,  'FAST PAYMENT TO JOHN TAN', 50.00),
    d(2,  'NTUC FAIRPRICE BISHAN', 67.30),
    d(3,  'SPOTIFY SINGAPORE', 9.99),
    d(3,  'GRAB RIDE SG', 12.00),
    d(4,  'STARBUCKS ORCHARD ROAD', 11.00),
    d(4,  'NETFLIX.COM', 17.98),
    d(5,  'COMFORT TAXI SG', 18.50),
    d(5,  'GUARDIAN PHARMACY NEX', 23.50),
    d(6,  'SHOPEE SG', 45.00),
    d(6,  'SINGTEL MOBILE GIRO', 35.00),
    d(7,  'FOOD PANDA SG', 22.60),
    d(8,  'GOLDEN VILLAGE MARINA SQ', 24.00),
    d(9,  'GRAB* FOOD SG', 19.80),
    d(10, 'COLD STORAGE BISHAN', 54.80),
    d(10, 'FAST PAYMENT TO MARY LIM', 150.00),
    d(11, 'STEAM PURCHASE', 29.90),
    d(12, 'SP SERVICES UTILITY', 95.40),
    d(13, 'BREAD TALK JUNCTION 8', 6.50),
    d(14, 'GRAB RIDE SG', 9.80),
    d(15, 'SALARY IBG CREDIT', 4500.00, 'credit'),
    d(15, 'UNIQLO JURONG POINT', 89.90),
    d(16, 'FAST PAYMENT TO JAMES', 200.00),
    d(17, 'KFC SINGAPORE NEX', 13.60),
    d(18, 'PARKWAY SHENTON CLINIC', 48.00),
    d(19, 'LAZADA SINGAPORE', 62.40),
    d(20, 'KOPITIAM HOUGANG MALL', 5.50),
    d(21, 'GRAB* FOOD SG', 16.90),
    d(22, 'GRAB RIDE SG', 22.00),
    d(23, 'SCOOT AIRLINES', 280.00),
    d(24, 'AMAZON SG', 38.50),
    d(25, 'STARBUCKS ION ORCHARD', 13.50),
    d(26, 'GREAT EASTERN INSURANCE', 210.00),
    d(27, 'GRAB* FOOD SG', 24.50),
    d(28, 'NTUC FAIRPRICE HOUGANG', 43.60),
    d(29, 'FAST PAYMENT TO ALICE', 80.00),
    d(30, 'TOAST BOX JUNCTION 8', 7.80),
  ];

  loadTransactions(txns);
}

// ─── load & categorize ─────────────────────────────────────────────────────

function loadTransactions(txns) {
  state.allTransactions = txns.map(t => ({
    ...t,
    category: t.type === 'credit' ? '_income' : (categorize(t.description) ?? '_skip'),
  })).filter(t => t.category !== '_skip');

  const monthSet = new Set();
  for (const t of state.allTransactions) {
    monthSet.add(`${t.date.getFullYear()}-${String(t.date.getMonth() + 1).padStart(2, '0')}`);
  }
  state.availableMonths = [...monthSet].sort().reverse();
  state.currentMonth = state.availableMonths[0];
  state.txnFilter = 'all';

  showScreen('dashboard-screen');
  renderDashboard();
}

// ─── helpers ───────────────────────────────────────────────────────────────

function monthTxns()  { return state.allTransactions.filter(t => monthKey(t.date) === state.currentMonth); }
function debitTxns()  { return monthTxns().filter(t => t.type === 'debit'); }
function monthKey(d)  { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; }

function catTotals(txns) {
  const m = {};
  for (const t of txns) {
    if (t.category === '_income') continue;
    m[t.category] = (m[t.category] || 0) + t.amount;
  }
  return m;
}

// ─── dashboard ─────────────────────────────────────────────────────────────

function renderDashboard() {
  updateMonthSelector();
  updateHero();
  updateStatCards();
  renderCategoryList();
  renderCharts();
  renderTxnList();
}

function updateMonthSelector() {
  const [y, mo] = state.currentMonth.split('-').map(Number);
  document.getElementById('month-label').textContent =
    new Date(y, mo - 1, 1).toLocaleDateString('en-SG', { month: 'long', year: 'numeric' });
  const idx = state.availableMonths.indexOf(state.currentMonth);
  document.getElementById('month-prev').disabled = idx >= state.availableMonths.length - 1;
  document.getElementById('month-next').disabled = idx <= 0;
}

function updateHero() {
  const total = debitTxns().reduce((s, t) => s + t.amount, 0);
  animateCounter(document.getElementById('hero-amount'), 0, total, v => `S$${v.toFixed(2)}`);
  document.getElementById('hero-sub').textContent =
    `${debitTxns().length} expense transactions this month`;
}

function updateStatCards() {
  const txns = debitTxns();
  const totals = catTotals(txns);

  // Biggest category
  const biggest = Object.entries(totals).sort((a, b) => b[1] - a[1])[0];
  if (biggest) {
    const cat = getCategoryById(biggest[0]);
    document.getElementById('stat-biggest-icon').textContent = cat.icon;
    animateCounter(document.getElementById('stat-biggest-val'), 0, biggest[1], v => `S$${v.toFixed(0)}`);
    document.getElementById('stat-biggest-name').textContent = cat.name;
  }

  // Daily average
  const [y, mo] = state.currentMonth.split('-').map(Number);
  const today = new Date();
  const isCurrent = today.getFullYear() === y && today.getMonth() + 1 === mo;
  const days = isCurrent ? today.getDate() : new Date(y, mo, 0).getDate();
  const total = txns.reduce((s, t) => s + t.amount, 0);
  animateCounter(document.getElementById('stat-daily-val'), 0, total / days, v => `S$${v.toFixed(2)}`);

  // Transaction count
  animateCounter(document.getElementById('stat-count-val'), 0, txns.length, v => Math.round(v).toString());

  // PayNow out / in
  const pOut = txns.filter(t => t.category === 'paynow').reduce((s, t) => s + t.amount, 0);
  const pIn  = monthTxns().filter(t => t.type === 'credit' && categorize(t.description) === 'paynow').reduce((s, t) => s + t.amount, 0);
  animateCounter(document.getElementById('stat-paynow-out'), 0, pOut, v => `S$${v.toFixed(0)}`);
  animateCounter(document.getElementById('stat-paynow-in'),  0, pIn,  v => `S$${v.toFixed(0)}`);
}

// ─── category list ─────────────────────────────────────────────────────────

function renderCategoryList() {
  const txns   = debitTxns();
  const totals = catTotals(txns);
  const counts = {};
  for (const t of txns) counts[t.category] = (counts[t.category] || 0) + 1;

  const grandTotal = Object.values(totals).reduce((s, v) => s + v, 0);
  const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);

  const container = document.getElementById('category-list');
  container.innerHTML = '';

  sorted.forEach(([catId, amount]) => {
    const cat = getCategoryById(catId);
    const pct = grandTotal > 0 ? (amount / grandTotal * 100) : 0;

    const el = document.createElement('div');
    el.className = 'cat-item';
    el.dataset.cat = catId;
    el.innerHTML = `
      <div class="cat-header" onclick="toggleCat('${catId}')">
        <div class="cat-icon-name">
          <span class="cat-icon">${cat.icon}</span>
          <span class="cat-name">${cat.name}</span>
          <span class="cat-count">${counts[catId]}</span>
        </div>
        <div class="cat-right">
          <div class="cat-bar-wrap">
            <div class="cat-bar" style="width:0%;background:${cat.color}" data-pct="${pct}"></div>
          </div>
          <span class="cat-pct">${pct.toFixed(0)}%</span>
          <span class="cat-amt">S$${amount.toFixed(2)}</span>
          <span class="cat-chevron">›</span>
        </div>
      </div>
      <div class="cat-detail" id="cat-detail-${catId}">
        ${buildCatTxns(catId, txns)}
      </div>`;
    container.appendChild(el);
  });

  // Animate bars after insertion
  requestAnimationFrame(() => {
    document.querySelectorAll('.cat-bar[data-pct]').forEach(bar => {
      setTimeout(() => { bar.style.width = bar.dataset.pct + '%'; }, 100);
    });
  });
}

function buildCatTxns(catId, txns) {
  const list = txns.filter(t => t.category === catId).sort((a, b) => b.amount - a.amount);
  if (!list.length) return '<p class="cat-empty">No transactions</p>';
  return list.map(t => `
    <div class="cat-txn-row">
      <div>
        <div class="cat-txn-desc">${esc(t.description)}</div>
        <div class="cat-txn-date">${t.date.toLocaleDateString('en-SG',{day:'numeric',month:'short'})}</div>
      </div>
      <div class="cat-txn-amt">S$${t.amount.toFixed(2)}</div>
    </div>`).join('');
}

function toggleCat(catId) {
  const detail  = document.getElementById(`cat-detail-${catId}`);
  const item    = detail.closest('.cat-item');
  const chevron = item.querySelector('.cat-chevron');
  const isOpen  = item.classList.contains('open');

  document.querySelectorAll('.cat-item.open').forEach(el => {
    el.classList.remove('open');
    el.querySelector('.cat-detail').style.maxHeight = '0';
    el.querySelector('.cat-chevron').textContent = '›';
  });

  if (!isOpen) {
    item.classList.add('open');
    detail.style.maxHeight = detail.scrollHeight + 'px';
    chevron.textContent = '⌄';
    item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

// ─── charts ────────────────────────────────────────────────────────────────

function getCSSVar(name) {
  return getComputedStyle(document.body).getPropertyValue(name).trim();
}

function renderCharts() {
  renderDonut();
  renderBar();
}

function renderDonut() {
  const txns   = debitTxns();
  const totals = catTotals(txns);
  const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);

  const labels = sorted.map(([id]) => getCategoryById(id).name);
  const data   = sorted.map(([, v]) => v);
  const colors = sorted.map(([id]) => getCategoryById(id).color);
  const total  = data.reduce((s, v) => s + v, 0);

  document.getElementById('donut-center-val').textContent = `S$${total.toFixed(2)}`;
  document.getElementById('donut-center-lbl').textContent = 'Total Spent';

  const ctx = document.getElementById('donut-chart').getContext('2d');
  if (state.donutChart) state.donutChart.destroy();

  state.donutChart = new Chart(ctx, {
    type: 'doughnut',
    data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 0, hoverOffset: 14 }] },
    options: {
      cutout: '68%',
      animation: { animateRotate: true, duration: 900, easing: 'easeOutQuart' },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(0,0,0,0.8)',
          titleFont: { size: 12 },
          bodyFont: { size: 13, weight: 'bold' },
          callbacks: {
            label: ctx => `  S$${ctx.parsed.toFixed(2)}  (${(ctx.parsed / total * 100).toFixed(1)}%)`,
          },
        },
      },
      onHover: (e, elements) => {
        if (elements.length) {
          const i = elements[0].index;
          document.getElementById('donut-center-lbl').textContent = labels[i];
          document.getElementById('donut-center-val').textContent = `S$${data[i].toFixed(2)}`;
        } else {
          document.getElementById('donut-center-lbl').textContent = 'Total Spent';
          document.getElementById('donut-center-val').textContent = `S$${total.toFixed(2)}`;
        }
      },
    },
  });
}

function renderBar() {
  const txns = debitTxns();
  const [y, mo] = state.currentMonth.split('-').map(Number);
  const days = new Date(y, mo, 0).getDate();

  const daily = {};
  for (let d = 1; d <= days; d++) daily[d] = 0;
  for (const t of txns) daily[t.date.getDate()] += t.amount;

  const accent1 = getCSSVar('--accent-1') || '#7c3aed';
  const accent2 = getCSSVar('--accent-2') || '#ec4899';

  const ctx = document.getElementById('bar-chart').getContext('2d');
  if (state.barChart) state.barChart.destroy();

  state.barChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: Object.keys(daily),
      datasets: [{
        data: Object.values(daily),
        backgroundColor: Object.values(daily).map((v, i) =>
          v > 0 ? (i % 2 === 0 ? accent1 + 'cc' : accent2 + 'aa') : 'transparent'),
        borderRadius: 5,
        borderSkipped: false,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 700, easing: 'easeOutQuart' },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(0,0,0,0.8)',
          callbacks: {
            title: ctx => `${ctx[0].label} ${new Date(y, mo - 1).toLocaleDateString('en-SG', { month: 'short', year: 'numeric' })}`,
            label: ctx => `  S$${ctx.parsed.y.toFixed(2)}`,
          },
        },
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: getCSSVar('--text-2'), font: { size: 10 } } },
        y: {
          grid: { color: getCSSVar('--border') || 'rgba(255,255,255,0.06)' },
          ticks: { color: getCSSVar('--text-2'), callback: v => `$${v}` },
        },
      },
    },
  });
}

// ─── transaction list ──────────────────────────────────────────────────────

function renderTxnList(filter) {
  if (filter !== undefined) state.txnFilter = filter;
  const f = state.txnFilter;

  const txns = monthTxns()
    .filter(t => f === 'all' || t.category === f || (f === '_income' && t.type === 'credit'))
    .sort((a, b) => b.date - a.date);

  const container = document.getElementById('txn-list');
  if (!txns.length) {
    container.innerHTML = '<p class="empty-msg">No transactions match this filter.</p>';
    buildFilterBtns();
    return;
  }

  // Group by date
  const grouped = {};
  for (const t of txns) {
    const k = t.date.toDateString();
    if (!grouped[k]) grouped[k] = { date: t.date, txns: [] };
    grouped[k].txns.push(t);
  }

  container.innerHTML = Object.values(grouped).map(g => `
    <div class="txn-group">
      <p class="txn-date-label">${g.date.toLocaleDateString('en-SG',{weekday:'short',day:'numeric',month:'short'})}</p>
      ${g.txns.map(t => {
        const cat = t.type === 'credit'
          ? { icon: '💰', color: '#22c55e', name: 'Income' }
          : getCategoryById(t.category);
        return `
          <div class="txn-row">
            <div class="txn-left">
              <span class="txn-cat-dot" style="background:${cat.color}22;color:${cat.color}">${cat.icon}</span>
              <div class="txn-info">
                <span class="txn-desc">${esc(t.description)}</span>
                <span class="txn-cat">${cat.name}</span>
              </div>
            </div>
            <span class="txn-amt ${t.type === 'credit' ? 'amt-in' : ''}">${t.type === 'credit' ? '+' : '−'}S$${t.amount.toFixed(2)}</span>
          </div>`;
      }).join('')}
    </div>`).join('');

  buildFilterBtns();
}

function buildFilterBtns() {
  const f = state.txnFilter;
  const txns = debitTxns();
  const cats = getAllCategories().filter(c => txns.some(t => t.category === c.id));
  const hasIncome = monthTxns().some(t => t.type === 'credit');

  const container = document.getElementById('txn-filters');
  const btn = (val, label, color) => {
    const active = f === val;
    const style  = active && color ? `style="background:${color}33;border-color:${color};color:${color}"` : '';
    return `<button class="filter-btn${active ? ' active' : ''}" onclick="renderTxnList('${val}')" ${style}>${label}</button>`;
  };

  container.innerHTML =
    btn('all', 'All') +
    (hasIncome ? btn('_income', '💰 Income', '#22c55e') : '') +
    cats.map(c => btn(c.id, `${c.icon} ${c.name}`, c.color)).join('');
}

// ─── month navigation ──────────────────────────────────────────────────────

function initMonthNav() {
  document.getElementById('month-prev').addEventListener('click', () => {
    const idx = state.availableMonths.indexOf(state.currentMonth);
    if (idx < state.availableMonths.length - 1) {
      state.currentMonth = state.availableMonths[idx + 1];
      renderDashboard();
    }
  });
  document.getElementById('month-next').addEventListener('click', () => {
    const idx = state.availableMonths.indexOf(state.currentMonth);
    if (idx > 0) {
      state.currentMonth = state.availableMonths[idx - 1];
      renderDashboard();
    }
  });
}

// ─── utilities ─────────────────────────────────────────────────────────────

function animateCounter(el, from, to, fmt) {
  if (!el) return;
  const dur = 900, t0 = performance.now();
  const tick = now => {
    const p  = Math.min((now - t0) / dur, 1);
    const ep = 1 - Math.pow(1 - p, 3);
    el.textContent = fmt(from + (to - from) * ep);
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function esc(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function showToast(msg, type = 'info') {
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 400); }, 4500);
}

// ─── init ──────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  setTheme(localStorage.getItem('ft-theme') || 'vibrant');
  document.querySelectorAll('.theme-dot').forEach(b => b.addEventListener('click', () => setTheme(b.dataset.theme)));
  initUpload();
  initMonthNav();
});
