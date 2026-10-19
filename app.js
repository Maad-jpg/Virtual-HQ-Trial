(function () {
  'use strict';

  // ============================================================
  // CONFIG — the only block you need to edit before deploying
  // ============================================================
  var SUPABASE_URL = 'https://tihcglsblwryuuwtljmn.supabase.co';
  var SUPABASE_ANON_KEY = 'sb_publishable_gAGWQND9VzsmG1yVQ1tBew_P10I1_jx';
  var AI_PROXY_URL = '/api/chat';
  // The AI model and the maximum response size are set on the server (api/chat.js), not here.
  var WHO_NAMES = ['Michael', 'Alex', 'Cindy', 'Japs', 'JB'];
  // Per-company accent colors, from each company's own brand guide. Used as highlight
  // accents on top of the shared house theme (chart series, section borders, hero
  // chapter tints) - never as a full re-skin.
  var COMPANY_ACCENT = {
    'MAAD Solutions': '#0089A3',
    'Pulse Narrative': '#FF3B1F',
    'Alexander & Co.': '#D4A017'
  };
  var COMPANY_HERO_TINT = {
    'MAAD Solutions': 'rgba(0,137,163,0.78)',
    'Pulse Narrative': 'rgba(255,59,31,0.78)',
    'Alexander & Co.': 'rgba(27,58,43,0.88)'
  };
  var COMPANY_TAGLINE = {
    'MAAD Solutions': 'Tech consulting, internal tools, and the dashboards that keep the other two honest.',
    'Pulse Narrative': 'We find the pulse. We give it a narrative.',
    'Alexander & Co.': 'FILL IN - a one-line tagline for the hero chapter.'
  };
  function companyAccent(name) { return COMPANY_ACCENT[name] || 'var(--deep-aqua)'; }
  // Which company each person belongs to, for the Money privacy preview.
  var PERSON_COMPANY = {
    'Michael': 'MAAD Solutions',
    'Alex': 'Alexander & Co.',
    'Cindy': 'Alexander & Co.',
    'Japs': 'Pulse Narrative',
    'JB': 'Pulse Narrative'
  };
  // What the Assistant knows about each business and person going in, so it stops
  // being generic and starts actually understanding the three companies. Fill in
  // the "FILL IN" placeholders as that information comes in — each is a one-line
  // edit, nothing else needs to change.
  var BUSINESS_CONTEXT = {
    companies: {
      'MAAD Solutions': {
        whatWeDo: 'Tech consulting, internal tools, financial dashboards, and operational diagnostics for small businesses.',
        typicalWork: ['Internal dashboards and tools', 'Financial/operational diagnostics', 'AI agent and automation builds']
      },
      'Pulse Narrative': {
        whatWeDo: 'Marketing and creative agency — helps businesses tell their story through content, branding, and marketing strategy.',
        typicalWork: ['Social media management, strategy, and content planning', 'Video production, photography, and short-form content', 'Branding and positioning', 'UGC and creator network campaigns', 'Marketing strategy and business consulting', 'Event coverage', 'Event activations and brand experiences', 'Digital/tech solutions for marketing and operations']
      },
      'Alexander & Co.': {
        whatWeDo: 'FILL IN - Alexander & Co.\'s business description not yet provided.',
        typicalWork: []
      }
    },
    people: {
      'Michael': { company: 'MAAD Solutions', role: 'Founder' },
      'Alex': { company: 'Alexander & Co.', role: 'FILL IN' },
      'Cindy': { company: 'Alexander & Co.', role: 'FILL IN' },
      'Japs': { company: 'Pulse Narrative', role: 'Co-Founder' },
      'JB': { company: 'Pulse Narrative', role: 'Founder' }
    },
    // Recurring vendors, clients, or gear brands worth knowing by default, so the
    // Assistant doesn't have to ask every time. FILL IN as these come up.
    commonVendorsOrClients: [],
    // House shorthand - things the five of you say out loud that should map to a
    // specific real item, e.g. {term: 'the camera', meansGear: 'Sony ZV-E10 II'}.
    // FILL IN as these come up.
    shorthand: []
  };
  // Hero images for the Overview tab, one per company (plus an optional rotating
  // set of event photos). Paste a real image URL to replace the branded-gradient
  // placeholder - Supabase Storage is a natural home for these once you're ready
  // to upload (same project, no new account needed), but any public image URL works.
  var HERO_IMAGES = {
    'MAAD Solutions': '',
    'Pulse Narrative': '',
    'Alexander & Co.': ''
  };
  var EVENT_PHOTOS = {
    'MAAD Solutions': [],
    'Pulse Narrative': [],
    'Alexander & Co.': []
  }; // e.g. 'MAAD Solutions': ['https://.../event1.jpg', 'https://.../event2.jpg']
  // ============================================================

  var sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  var COMPANIES = [];
  var gearItems = [], contactItems = [], projectItems = [], calendarItems = [],
      todoItems = [], moneyItems = [], moneyGrants = [];

  var GEAR_CATEGORIES = ['Tech', 'Camera', 'Lighting', 'Podcast & Audio', 'Studio & Furniture'];
  var GEAR_STATUSES = ['available', 'in-use', 'needs-repair', 'missing'];
  var GEAR_STATUS_LABEL = { 'available': 'Available', 'in-use': 'In Use', 'needs-repair': 'Needs Repair', 'missing': 'Missing' };
  var CONTACT_TAGS = ['contact', 'client', 'vendor', 'collaborator'];
  var CONTACT_TAG_LABEL = { 'contact': 'Contact', 'client': 'Client', 'vendor': 'Vendor', 'collaborator': 'Collaborator' };
  var PROJECT_STATUSES = ['not-started', 'in-progress', 'blocked', 'done'];
  var PROJECT_STATUS_LABEL = { 'not-started': 'Not Started', 'in-progress': 'In Progress', 'blocked': 'Blocked', 'done': 'Done' };
  var MONEY_STATUSES = ['wishlist', 'researched', 'ordered', 'received'];
  var MONEY_STATUS_LABEL = { 'wishlist': 'Wishlist', 'researched': 'Researched', 'ordered': 'Ordered', 'received': 'Received' };
  var TODO_STATUSES = ['not-done', 'done'];
  var TODO_STATUS_LABEL = { 'not-done': 'Not Done', 'done': 'Done' };
  var WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var MONTH_LABELS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  var pendingGearDeleteId = null, pendingGearDeleteTimer = null;
  var pendingContactDeleteId = null, pendingContactDeleteTimer = null;
  var pendingProjectDeleteId = null, pendingProjectDeleteTimer = null;
  var editingProjectId = null;
  var editingContactId = null, contactCompanyFilter = '';
  var gearHistory = [], openGearHistoryId = null;
  var pendingCalDeleteId = null, pendingCalDeleteTimer = null;
  var pendingTodoDeleteId = null, pendingTodoDeleteTimer = null;
  var pendingMoneyDeleteId = null, pendingMoneyDeleteTimer = null;
  var openShareItemId = null;

  var chatTurns = [];
  var pendingActions = null;
  var asstBusy = false;
  var recognizer = null, listening = false;

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function currentPerson() { return document.getElementById('whoSelect').value; }
  // Empty string when nobody's picked a name yet - Money then shows only what's been
  // shared publicly, rather than silently falling back to one company's view.
  function currentPersonCompanyName() { return PERSON_COMPANY[currentPerson()] || ''; }
  function companyById(id) { return COMPANIES.find(function (c) { return c.id === id; }); }
  function companyByName(name) { return COMPANIES.find(function (c) { return c.name === name; }); }
  function todayISO() { var t = new Date(); return t.getFullYear() + '-' + pad2(t.getMonth() + 1) + '-' + pad2(t.getDate()); }
  function pad2(n) { return n < 10 ? '0' + n : '' + n; }
  function daysBetween(aISO, bISO) {
    var a = aISO.split('-').map(Number), b = bISO.split('-').map(Number);
    return Math.round((Date.UTC(b[0], b[1] - 1, b[2]) - Date.UTC(a[0], a[1] - 1, a[2])) / 86400000);
  }
  function plural(n, word) { return n + ' ' + word + (n === 1 ? '' : 's'); }
  function formatDateMed(iso) {
    var p = iso.split('-').map(Number);
    var label = MONTH_LABELS[p[1] - 1].slice(0, 3) + ' ' + p[2];
    return p[0] === new Date().getFullYear() ? label : label + ', ' + p[0];
  }
  // One line describing where a project sits in time. Duration counts both the
  // start day and the end day, so Oct 1 to Oct 10 is 10 days.
  function projectTimeline(p) {
    var start = p.start_date, end = p.end_date, t = todayISO(), parts = [], late = false;
    if (start && end) {
      parts.push(formatDateMed(start) + ' \u2192 ' + formatDateMed(end));
      parts.push(plural(daysBetween(start, end) + 1, 'day'));
      if (p.status !== 'done' && end < t) { parts.push(plural(daysBetween(end, t), 'day') + ' past end'); late = true; }
    } else if (start) {
      parts.push('Started ' + formatDateMed(start));
      if (start <= t) parts.push(plural(daysBetween(start, t) + 1, 'day') + ' in');
      else parts.push('starts in ' + plural(daysBetween(t, start), 'day'));
    } else if (end) {
      parts.push('Ends ' + formatDateMed(end));
      if (p.status !== 'done' && end < t) { parts.push(plural(daysBetween(end, t), 'day') + ' past end'); late = true; }
    }
    return { text: parts.join(' \u00b7 '), late: late };
  }
  function datesOk(start, end) {
    if (start && end && end < start) { showToast('The end date cannot be before the start date.'); return false; }
    return true;
  }
  function dateField(cls, label, value) {
    return '<label class="date-field"><span>' + label + '</span><input type="date" class="' + cls + '" value="' + (value || '') + '"></label>';
  }

  function setStatus(elId, msg) {
    var bar = document.getElementById(elId);
    if (bar) bar.textContent = msg;
  }

  // ============================================================
  // Generic Supabase helpers
  // ============================================================
  // Called whenever a save fails. A missing column or table means the database update
  // has not been run yet; anything else is most likely a connection problem.
  function saveFailed(table, err) {
    console.error(table, err);
    var msg = (err && err.message) || '';
    showToast(/column|relation|schema cache|does not exist/i.test(msg)
      ? 'That needs the latest database update - tell Michael.'
      : 'Could not save that. Check your connection and try again.');
  }

  async function sbSelect(table) {
    var res = await sb.from(table).select('*').order('created_at');
    if (res.error) { console.error(table, res.error); return []; }
    return res.data;
  }
  async function sbInsert(table, row) {
    var res = await sb.from(table).insert(row).select();
    if (res.error) { saveFailed(table, res.error); return null; }
    return res.data[0];
  }
  async function sbUpdate(table, id, patch) {
    var res = await sb.from(table).update(patch).eq('id', id);
    if (res.error) { saveFailed(table, res.error); return false; }
    return true;
  }
  async function sbDelete(table, id) {
    var res = await sb.from(table).delete().eq('id', id);
    if (res.error) { saveFailed(table, res.error); return false; }
    return true;
  }

  // ============================================================
  // WHO
  // ============================================================
  function showToast(msg) {
    var el = document.getElementById('toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(function () { el.classList.remove('show'); }, 2600);
  }

  function hasName() { return !!currentPerson(); }

  function promptForName() {
    var sel = document.getElementById('whoSelect');
    sel.classList.add('needs-name');
    sel.focus();
    showToast('Pick your name first (top right), so what you add carries it.');
    setTimeout(function () { sel.classList.remove('needs-name'); }, 2400);
  }

  // Until someone picks their name, block every add, edit, status change and delete.
  // Runs in the capture phase on the document, so it fires before any control's own
  // handler and can stop it - one guard instead of a check in 25 places.
  function initNameGuard() {
    var MUTATING = '.add-btn, .status-pill, .del-btn, .share-btn, .grant-add-btn, .revoke-grant-btn, .edit-btn, .save-edit-btn, .asst-confirm-btn';
    document.addEventListener('click', function (e) {
      if (hasName() || !e.target.closest) return;
      if (e.target.closest(MUTATING)) { e.stopPropagation(); e.preventDefault(); promptForName(); }
    }, true);
    document.addEventListener('change', function (e) {
      if (hasName() || !e.target.closest) return;
      if (e.target.closest('.item-cost')) { e.stopPropagation(); promptForName(); renderAll(); }
    }, true);
  }

  // ============================================================
  // EXPORT EVERYTHING (backup)
  // ============================================================
  // Every table the app uses, plus the older responsibilities table, so nothing
  // already stored is left out of a backup.
  var EXPORT_TABLES = ['companies', 'gear_items', 'gear_history', 'contacts', 'projects',
    'calendar_events', 'todos', 'money_items', 'money_grants', 'responsibilities'];

  // Reads a whole table 1000 rows at a time. The database returns at most 1000 rows per
  // request, and a backup must never quietly stop short.
  async function fetchAllRows(table) {
    var rows = [], from = 0, page = 1000;
    while (true) {
      var res = await sb.from(table).select('*').order('created_at').order('id').range(from, from + page - 1);
      if (res.error) throw res.error;
      rows = rows.concat(res.data || []);
      if (!res.data || res.data.length < page) return rows;
      from += page;
    }
  }

  async function exportEverything() {
    var btn = document.getElementById('exportBtn');
    btn.disabled = true;
    showToast('Preparing backup...');
    var tables = {}, failed = [], total = 0;
    for (var i = 0; i < EXPORT_TABLES.length; i++) {
      var t = EXPORT_TABLES[i];
      try { tables[t] = await fetchAllRows(t); total += tables[t].length; }
      catch (e) { failed.push(t); tables[t] = { error: (e && e.message) || 'could not be read' }; }
    }
    var payload = {
      app: 'Virtual HQ', exported_on: new Date().toISOString(),
      exported_by: currentPerson() || '', failed_tables: failed, tables: tables
    };
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = 'virtual-hq-backup-' + todayISO() + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    btn.disabled = false;
    showToast(failed.length
      ? 'Backup saved, but ' + failed.length + ' table(s) could not be read: ' + failed.join(', ')
      : 'Backup saved: ' + total + ' rows from ' + EXPORT_TABLES.length + ' tables.');
  }

  function initWho() {
    var sel = document.getElementById('whoSelect');
    // Each browser remembers its own pick, so people choose once per device, not on
    // every visit. A first visit (or a cleared browser) starts blank.
    var saved = localStorage.getItem('vhq-who');
    if (saved && WHO_NAMES.indexOf(saved) !== -1) sel.value = saved;
    sel.addEventListener('change', function () {
      localStorage.setItem('vhq-who', sel.value);
      renderMoney();
      renderContacts();
    });
    initNameGuard();
  }

  function renderAll() {
    renderGear(); renderContacts(); renderProjects(); renderCalendar(); renderTodos(); renderMoney();
  }

  // ============================================================
  // TABS
  // ============================================================
  function initTabs() {
    var panels = {
      overview: 'overviewPanel', money: 'moneyPanel', projects: 'projectsPanel',
      contacts: 'contactsPanel', gear: 'gearPanel', calendar: 'calendarPanel',
      todos: 'todosPanel'
    };
    document.querySelectorAll('#tabNav button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('#tabNav button').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        var tab = btn.getAttribute('data-tab');
        Object.keys(panels).forEach(function (key) {
          document.getElementById(panels[key]).style.display = (key === tab) ? '' : 'none';
        });
        if (tab === 'overview') renderOverview();
      });
    });
  }

  // ============================================================
  // GEAR
  // ============================================================
  // ============================================================
  // OVERVIEW (scroll-driven landing tab)
  // ============================================================
  // Per-company chart instances, keyed by company id, so each column's two
  // mini-charts can be destroyed and redrawn independently on re-render.
  var ovMoneyChartInstances = {}, ovProjectChartInstances = {}, ovGearChartInstance = null;

  function addDaysISO(dateStr, days) {
    var p = dateStr.split('-').map(Number);
    var d = new Date(p[0], p[1] - 1, p[2] + days);
    return isoDate(d.getFullYear(), d.getMonth(), d.getDate());
  }

  function colHeadHtml(co) {
    return '<div class="ov-col-head"><span class="ov-col-dot" style="background:' + companyAccent(co.name) + ';"></span><h4>' + escapeHtml(co.name) + '</h4></div>';
  }

  function renderOverviewHero() {
    var row = document.getElementById('ovHeroRow');
    var html = '';
    COMPANIES.forEach(function (co) {
      var tint = COMPANY_HERO_TINT[co.name] || 'rgba(11,32,39,0.8)';
      var photo = HERO_IMAGES[co.name];
      var bg = photo ? 'background-image: url(\'' + photo + '\');' : '';
      html += '<div class="ov-hero-chapter" style="--chapter-tint:' + tint + ';' + bg + '">' +
        '<div class="ov-hero-kicker">One of three studio companies</div>' +
        '<h1>' + escapeHtml(co.name) + '</h1>' +
        '<p>' + escapeHtml(COMPANY_TAGLINE[co.name] || '') + '</p>' +
        '</div>';
    });
    row.innerHTML = html;
  }

  function renderOverviewStats() {
    var monthPrefix = todayISO().slice(0, 7);
    var weekEnd = addDaysISO(todayISO(), 6);
    var visibleMoney = moneyItems.filter(isVisibleToCurrentPerson);
    var html = '';
    COMPANIES.forEach(function (co) {
      var coMoney = visibleMoney.filter(function (i) { return i.company_id === co.id; });
      var monthEst = coMoney.reduce(function (s, i) { return s + (Number(i.est_cost) || 0); }, 0);
      var coTodos = todoItems.filter(function (t) { return t.company_id === co.id; });
      var openTodos = coTodos.filter(function (t) { return t.status === 'not-done'; }).length;
      var overdueTodos = coTodos.filter(isOverdue).length;
      var coWeekEvents = calendarItems.filter(function (e) {
        return PERSON_COMPANY[e.who] === co.name && e.event_date >= todayISO() && e.event_date <= weekEnd;
      }).length;

      html += '<div class="ov-col">' + colHeadHtml(co) +
        '<div class="ov-stat-mini"><div class="label">Money this month (est.)</div><div class="value">₱' + monthEst.toLocaleString() + '</div></div>' +
        '<div class="ov-stat-mini"><div class="label">Open to-dos</div><div class="value">' + openTodos +
        (overdueTodos ? ' <span style="color:' + companyAccent(co.name) + ';font-size:13px;">(' + overdueTodos + ' overdue)</span>' : '') + '</div></div>' +
        '<div class="ov-stat-mini"><div class="label">This week on the calendar</div><div class="value">' + coWeekEvents + '</div></div>' +
        '</div>';
    });
    document.getElementById('ovStatsRow').innerHTML = html;
  }

  function renderOverviewShared() {
    var gearNeedsAttention = gearItems.filter(function (g) { return g.status === 'needs-repair' || g.status === 'missing'; }).length;
    document.getElementById('ovSharedRow').innerHTML =
      '<div class="ov-col"><div class="ov-stat-mini"><div class="label">Gear needing attention</div><div class="value">' + gearNeedsAttention + ' of ' + gearItems.length + '</div></div></div>' +
      '<div class="ov-col ov-chart-mini"><canvas id="ovGearChart"></canvas></div>';

    if (typeof Chart === 'undefined') return;
    var gearStatusColors = { 'available': '#71767A', 'in-use': '#9AA0A6', 'needs-repair': '#4A4D50', 'missing': '#18191B' };
    var gearCounts = GEAR_STATUSES.map(function (s) { return gearItems.filter(function (g) { return g.status === s; }).length; });
    if (ovGearChartInstance) ovGearChartInstance.destroy();
    ovGearChartInstance = new Chart(document.getElementById('ovGearChart'), {
      type: 'doughnut',
      data: {
        labels: GEAR_STATUSES.map(function (s) { return GEAR_STATUS_LABEL[s]; }),
        datasets: [{ data: gearCounts, backgroundColor: GEAR_STATUSES.map(function (s) { return gearStatusColors[s]; }) }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { boxWidth: 10, font: { size: 10.5 } } } } }
    });
  }

  function renderOverviewCharts() {
    var visibleMoney = moneyItems.filter(isVisibleToCurrentPerson);
    var html = '';
    COMPANIES.forEach(function (co) {
      html += '<div class="ov-col">' + colHeadHtml(co) +
        '<div class="ov-chart-mini" style="margin-bottom:16px;"><canvas id="ovMoneyChart-' + co.id + '"></canvas></div>' +
        '<div class="ov-chart-mini"><canvas id="ovProjChart-' + co.id + '"></canvas></div>' +
        '</div>';
    });
    document.getElementById('ovChartsRow').innerHTML = html;

    if (typeof Chart === 'undefined') return;
    COMPANIES.forEach(function (co) {
      var coMoney = visibleMoney.filter(function (i) { return i.company_id === co.id; });
      var moneyData = GEAR_CATEGORIES.map(function (cat) {
        return coMoney.filter(function (i) { return i.category === cat; }).reduce(function (s, i) { return s + (Number(i.est_cost) || 0); }, 0);
      });
      if (ovMoneyChartInstances[co.id]) ovMoneyChartInstances[co.id].destroy();
      ovMoneyChartInstances[co.id] = new Chart(document.getElementById('ovMoneyChart-' + co.id), {
        type: 'bar',
        data: { labels: GEAR_CATEGORIES.map(function (c) { return c.split(' ')[0]; }), datasets: [{ data: moneyData, backgroundColor: companyAccent(co.name) }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { font: { size: 9 } } }, x: { ticks: { font: { size: 9 } } } } }
      });

      var coProjects = projectItems.filter(function (p) { return p.company_id === co.id; });
      var statusCounts = PROJECT_STATUSES.map(function (s) { return coProjects.filter(function (p) { return p.status === s; }).length; });
      if (ovProjectChartInstances[co.id]) ovProjectChartInstances[co.id].destroy();
      ovProjectChartInstances[co.id] = new Chart(document.getElementById('ovProjChart-' + co.id), {
        type: 'doughnut',
        data: {
          labels: PROJECT_STATUSES.map(function (s) { return PROJECT_STATUS_LABEL[s]; }),
          datasets: [{ data: statusCounts, backgroundColor: [companyAccent(co.name) + '55', companyAccent(co.name) + '99', companyAccent(co.name) + 'CC', companyAccent(co.name)] }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { boxWidth: 8, font: { size: 9 } } } } }
      });
    });
  }

  function renderOverviewGallery() {
    var html = '';
    COMPANIES.forEach(function (co) {
      var photos = EVENT_PHOTOS[co.name] || [];
      html += '<div class="ov-col">' + colHeadHtml(co);
      if (!photos.length) {
        html += '<div class="ov-gallery-empty">Photos go here once you\'ve got them - drop URLs into EVENT_PHOTOS[\'' + escapeHtml(co.name) + '\'] in the config block.</div>';
      } else {
        html += '<div class="ov-gallery-col-grid">' + photos.map(function (url) {
          return '<div class="ov-gallery-photo" style="background-image:url(\'' + url + '\');"></div>';
        }).join('') + '</div>';
      }
      html += '</div>';
    });
    document.getElementById('ovGalleryRow').innerHTML = html;
  }

  function renderOverview() {
    renderOverviewHero();
    renderOverviewStats();
    renderOverviewShared();
    renderOverviewCharts();
    renderOverviewGallery();
  }

  function initScrollReveals() {
    if (!('IntersectionObserver' in window)) {
      document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('visible'); });
      return;
    }
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) entry.target.classList.add('visible');
      });
    }, { threshold: 0.2 });
    document.querySelectorAll('.reveal').forEach(function (el) { observer.observe(el); });
  }

  function renderGear() {
    var counts = { available: 0, 'in-use': 0, 'needs-repair': 0, missing: 0 };
    gearItems.forEach(function (g) { counts[g.status] = (counts[g.status] || 0) + 1; });
    document.getElementById('gearTotalsStrip').innerHTML =
      '<div class="cell grand"><div class="label">Total items</div><div class="value">' + gearItems.length + '</div></div>' +
      '<div class="cell"><div class="label">Available</div><div class="value">' + counts.available + '</div></div>' +
      '<div class="cell"><div class="label">In use</div><div class="value">' + counts['in-use'] + '</div></div>' +
      '<div class="cell"><div class="label">Needs attention</div><div class="value">' + (counts['needs-repair'] + counts.missing) + '</div></div>';

    var list = document.getElementById('gearCategoryList');
    var html = '';
    GEAR_CATEGORIES.forEach(function (cat) {
      var catItems = gearItems.filter(function (g) { return g.category === cat; });
      html += '<div class="cat-block"><div class="cat-head"><h2>' + cat + '</h2><span class="subtotal">' + catItems.length + '</span></div>';
      catItems.forEach(function (g) {
        var pendingConfirm = pendingGearDeleteId === g.id;
        html += '<div class="item-row" style="grid-template-columns: 1fr 140px 96px 28px;" data-id="' + g.id + '">';
        var hist = gearHistoryFor(g.id);
        html += '<div class="item-name">' + escapeHtml(g.name) + (g.note ? '<span class="note">' + escapeHtml(g.note) + '</span>' : '') +
          (g.created_by ? '<span class="note added-by">Added by ' + escapeHtml(g.created_by) + '</span>' : '') +
          (hist.length ? '<button class="link-btn gear-hist-link" data-id="' + g.id + '">History (' + hist.length + ')</button>' : '') + '</div>';
        html += '<input class="item-cost gear-holder-input" type="text" value="' + escapeHtml(g.holder || '') + '" placeholder="who has it" data-id="' + g.id + '" style="text-align:left;">';
        html += '<div class="status-pill gear-status-pill status-gear-' + g.status + '" data-id="' + g.id + '">' + GEAR_STATUS_LABEL[g.status] + '</div>';
        html += '<button class="del-btn gear-del-btn' + (pendingConfirm ? ' confirm' : '') + '" data-id="' + g.id + '">' + (pendingConfirm ? 'Sure?' : '×') + '</button>';
        html += '</div>';
        if (openGearHistoryId === g.id && hist.length) {
          html += '<div class="gear-history-panel">' + hist.map(gearHistoryLine).join('') + '</div>';
        }
      });
      html += '<div class="add-row"><input type="text" class="new-gear-name" placeholder="Item name" data-cat="' + cat + '">' +
        '<input type="text" class="new-gear-note" placeholder="Note (optional)" data-cat="' + cat + '">' +
        '<input type="text" class="new-gear-holder" placeholder="Who has it (optional)" data-cat="' + cat + '">' +
        '<button class="add-btn gear-add-btn" data-cat="' + cat + '">Add</button></div></div>';
    });
    list.innerHTML = html;
    attachGearHandlers();
  }
  function gearHistoryFor(gearId) {
    return gearHistory.filter(function (h) { return h.gear_id === gearId; })
      .sort(function (x, y) { return String(y.created_at).localeCompare(String(x.created_at)); });
  }
  function gearHistoryLine(h) {
    var who = h.changed_by || 'Someone';
    var when = new Date(h.created_at).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    var show = function (v) { return h.field === 'status' ? (GEAR_STATUS_LABEL[v] || v) : (v || 'nobody'); };
    return '<div class="hist-line"><span class="hist-when">' + escapeHtml(when) + '</span> ' + escapeHtml(who) +
      ' changed ' + h.field + ': ' + escapeHtml(show(h.old_value)) + ' \u2192 ' + escapeHtml(show(h.new_value)) + '</div>';
  }
  // Records who changed a gear item's holder or status, and when. Skips no-op edits.
  async function logGearChange(gearId, field, oldVal, newVal) {
    if ((oldVal || '') === (newVal || '')) return;
    var saved = await sbInsert('gear_history', {
      gear_id: gearId, field: field, old_value: oldVal || '', new_value: newVal || '', changed_by: currentPerson()
    });
    if (saved) gearHistory.push(saved);
  }
  function attachGearHandlers() {
    document.querySelectorAll('.gear-hist-link').forEach(function (el) {
      el.addEventListener('click', function () {
        var id = el.getAttribute('data-id');
        openGearHistoryId = (openGearHistoryId === id) ? null : id;
        renderGear();
      });
    });
    document.querySelectorAll('.gear-holder-input').forEach(function (el) {
      el.addEventListener('change', async function () {
        var g = gearItems.find(function (i) { return i.id === el.getAttribute('data-id'); });
        if (!g) return;
        var oldHolder = g.holder || '';
        g.holder = el.value.trim();
        setStatus('gearStatusBar', 'saving...');
        await sbUpdate('gear_items', g.id, { holder: g.holder });
        await logGearChange(g.id, 'holder', oldHolder, g.holder);
        setStatus('gearStatusBar', 'saved');
        if (g.holder !== oldHolder) renderGear();
      });
    });
    document.querySelectorAll('.gear-status-pill').forEach(function (el) {
      el.addEventListener('click', async function () {
        var g = gearItems.find(function (i) { return i.id === el.getAttribute('data-id'); });
        if (!g) return;
        var oldStatus = g.status;
        g.status = GEAR_STATUSES[(GEAR_STATUSES.indexOf(g.status) + 1) % GEAR_STATUSES.length];
        renderGear();
        await sbUpdate('gear_items', g.id, { status: g.status });
        await logGearChange(g.id, 'status', oldStatus, g.status);
        renderGear();
      });
    });
    document.querySelectorAll('.gear-del-btn').forEach(function (el) {
      el.addEventListener('click', async function () {
        var id = el.getAttribute('data-id');
        if (pendingGearDeleteId === id) {
          clearTimeout(pendingGearDeleteTimer); pendingGearDeleteId = null;
          await sbDelete('gear_items', id);
          gearItems = gearItems.filter(function (i) { return i.id !== id; });
          gearHistory = gearHistory.filter(function (h) { return h.gear_id !== id; });
          renderGear();
        } else {
          pendingGearDeleteId = id; renderGear();
          clearTimeout(pendingGearDeleteTimer);
          pendingGearDeleteTimer = setTimeout(function () { pendingGearDeleteId = null; renderGear(); }, 6000);
        }
      });
    });
    document.querySelectorAll('.gear-add-btn').forEach(function (el) {
      el.addEventListener('click', async function () {
        var cat = el.getAttribute('data-cat');
        var container = el.closest('.add-row');
        var nameInput = container.querySelector('.new-gear-name');
        var name = nameInput.value.trim();
        if (!name) { nameInput.focus(); return; }
        var row = {
          name: name, category: cat,
          note: container.querySelector('.new-gear-note').value.trim(),
          holder: container.querySelector('.new-gear-holder').value.trim(),
          status: 'available', created_by: currentPerson()
        };
        setStatus('gearStatusBar', 'saving...');
        var saved = await sbInsert('gear_items', row);
        if (saved) { gearItems.push(saved); renderGear(); setStatus('gearStatusBar', 'saved'); }
      });
    });
  }

  // ============================================================
  // CONTACTS
  // ============================================================
  var CONTACT_SECTION_ORDER = ['client', 'vendor', 'collaborator', 'contact'];
  var CONTACT_SECTION_LABEL = { client: 'Clients', vendor: 'Vendors', collaborator: 'Collaborators', contact: 'Other contacts' };

  function contactCompanyChip(coId) {
    var co = companyById(coId);
    if (!co) return '<span class="co-chip">\u2014</span>';
    return '<span class="co-chip"><i style="background:' + companyAccent(co.name) + ';"></i>' + escapeHtml(co.name) + '</span>';
  }
  function companyOptions(selectedId, placeholder) {
    return (placeholder ? '<option value="">' + placeholder + '</option>' : '') +
      COMPANIES.map(function (co) {
        return '<option value="' + co.id + '"' + (co.id === selectedId ? ' selected' : '') + '>' + escapeHtml(co.name) + '</option>';
      }).join('');
  }
  function myCompanyId() { var co = companyByName(currentPersonCompanyName()); return co ? co.id : ''; }

  function renderContacts() {
    var counts = { contact: 0, client: 0, vendor: 0, collaborator: 0 };
    contactItems.forEach(function (c) { counts[c.tag] = (counts[c.tag] || 0) + 1; });
    document.getElementById('contactsTotalsStrip').innerHTML =
      '<div class="cell grand"><div class="label">Total contacts</div><div class="value">' + contactItems.length + '</div></div>' +
      '<div class="cell"><div class="label">Clients</div><div class="value">' + counts.client + '</div></div>' +
      '<div class="cell"><div class="label">Vendors</div><div class="value">' + counts.vendor + '</div></div>' +
      '<div class="cell"><div class="label">Collaborators</div><div class="value">' + counts.collaborator + '</div></div>';

    var html = '<div class="filter-row"><span class="filter-label">Company</span>' +
      '<button class="filter-pill' + (!contactCompanyFilter ? ' active' : '') + '" data-co="">All</button>' +
      COMPANIES.map(function (co) {
        return '<button class="filter-pill' + (contactCompanyFilter === co.id ? ' active' : '') + '" data-co="' + co.id + '"><i style="background:' + companyAccent(co.name) + ';"></i>' + escapeHtml(co.name) + '</button>';
      }).join('') + '</div>';
    if (contactItems.length === 0) html += '<div class="empty-state">No contacts yet. Add the first one below.</div>';

    var shown = contactItems.filter(function (c) { return !contactCompanyFilter || c.company_id === contactCompanyFilter; });
    CONTACT_SECTION_ORDER.forEach(function (tag) {
      var secItems = shown.filter(function (c) { return c.tag === tag; });
      html += '<div class="cat-block"><div class="cat-head"><h2>' + CONTACT_SECTION_LABEL[tag] + '</h2><span class="subtotal">' + secItems.length + '</span></div>';
      secItems.forEach(function (c) {
        var pendingConfirm = pendingContactDeleteId === c.id;
        if (editingContactId === c.id) {
          html += '<div class="item-row edit-row contact-edit-row" data-id="' + c.id + '">' +
            '<input type="text" class="edit-contact-name" value="' + escapeHtml(c.name) + '" placeholder="Name">' +
            '<input type="text" class="edit-contact-org" value="' + escapeHtml(c.org || '') + '" placeholder="Organization">' +
            '<input type="text" class="edit-contact-role" value="' + escapeHtml(c.role || '') + '" placeholder="Role">' +
            '<input type="text" class="edit-contact-info" value="' + escapeHtml(c.info || '') + '" placeholder="Email or phone">' +
            '<select class="edit-contact-company">' + companyOptions(c.company_id) + '</select>' +
            '<select class="edit-contact-tag">' + CONTACT_TAGS.map(function (t) {
              return '<option value="' + t + '"' + (t === c.tag ? ' selected' : '') + '>' + CONTACT_TAG_LABEL[t] + '</option>';
            }).join('') + '</select>' +
            '<button class="add-btn save-edit-btn contact-save-btn" data-id="' + c.id + '">Save</button>' +
            '<button class="asst-cancel-btn contact-cancel-btn" data-id="' + c.id + '">Cancel</button></div>';
        } else {
          var sub = [c.org, c.role].filter(Boolean).map(function (v) { return escapeHtml(v); }).join(' \u00b7 ');
          html += '<div class="item-row contact-row" data-id="' + c.id + '">' +
            '<div class="item-name">' + escapeHtml(c.name) + (sub ? '<span class="note">' + sub + '</span>' : '') + '</div>' +
            contactCompanyChip(c.company_id) +
            '<input class="item-cost contact-info-input" type="text" value="' + escapeHtml(c.info || '') + '" placeholder="email or phone" data-id="' + c.id + '" style="text-align:left;">' +
            '<div class="status-pill contact-tag-pill status-contact-' + c.tag + '" data-id="' + c.id + '">' + CONTACT_TAG_LABEL[c.tag] + '</div>' +
            '<button class="del-btn edit-btn contact-edit-btn" data-id="' + c.id + '" title="Edit">\u270e</button>' +
            '<button class="del-btn contact-del-btn' + (pendingConfirm ? ' confirm' : '') + '" data-id="' + c.id + '">' + (pendingConfirm ? 'Sure?' : '\u00d7') + '</button></div>';
        }
      });
      html += '<div class="add-row contact-add-row">' +
        '<input type="text" class="new-contact-name" placeholder="Name" data-tag="' + tag + '">' +
        '<input type="text" class="new-contact-org" placeholder="Organization (optional)" data-tag="' + tag + '">' +
        '<input type="text" class="new-contact-role" placeholder="Role (optional)" data-tag="' + tag + '">' +
        '<input type="text" class="new-contact-info" placeholder="Email or phone" data-tag="' + tag + '">' +
        '<select class="new-contact-company">' + companyOptions(myCompanyId(), 'Which company...') + '</select>' +
        '<button class="add-btn contact-add-btn" data-tag="' + tag + '">Add</button></div></div>';
    });
    document.getElementById('contactsCategoryList').innerHTML = html;
    attachContactHandlers();
  }

  function attachContactHandlers() {
    document.querySelectorAll('.filter-pill').forEach(function (el) {
      el.addEventListener('click', function () { contactCompanyFilter = el.getAttribute('data-co'); renderContacts(); });
    });
    document.querySelectorAll('.contact-tag-pill').forEach(function (el) {
      el.addEventListener('click', async function () {
        var c = contactItems.find(function (i) { return i.id === el.getAttribute('data-id'); });
        if (!c) return;
        c.tag = CONTACT_TAGS[(CONTACT_TAGS.indexOf(c.tag) + 1) % CONTACT_TAGS.length];
        renderContacts();
        await sbUpdate('contacts', c.id, { tag: c.tag });
      });
    });
    document.querySelectorAll('.contact-info-input').forEach(function (el) {
      el.addEventListener('change', async function () {
        var c = contactItems.find(function (i) { return i.id === el.getAttribute('data-id'); });
        if (!c) return;
        c.info = el.value.trim();
        await sbUpdate('contacts', c.id, { info: c.info });
      });
    });
    document.querySelectorAll('.contact-edit-btn').forEach(function (el) {
      el.addEventListener('click', function () { editingContactId = el.getAttribute('data-id'); renderContacts(); });
    });
    document.querySelectorAll('.contact-cancel-btn').forEach(function (el) {
      el.addEventListener('click', function () { editingContactId = null; renderContacts(); });
    });
    document.querySelectorAll('.contact-save-btn').forEach(function (el) {
      el.addEventListener('click', async function () {
        var id = el.getAttribute('data-id');
        var c = contactItems.find(function (i) { return i.id === id; });
        var row = el.closest('.edit-row');
        if (!c || !row) return;
        var name = row.querySelector('.edit-contact-name').value.trim();
        if (!name) { row.querySelector('.edit-contact-name').focus(); return; }
        var role = row.querySelector('.edit-contact-role').value.trim();
        var patch = {
          name: name,
          org: row.querySelector('.edit-contact-org').value.trim(),
          info: row.querySelector('.edit-contact-info').value.trim(),
          company_id: row.querySelector('.edit-contact-company').value,
          tag: row.querySelector('.edit-contact-tag').value
        };
        // Only send role when it changed, so editing works even before the role column exists.
        if ((c.role || '') !== role) patch.role = role;
        Object.assign(c, patch);
        editingContactId = null;
        renderContacts();
        await sbUpdate('contacts', id, patch);
      });
    });
    document.querySelectorAll('.contact-del-btn').forEach(function (el) {
      el.addEventListener('click', async function () {
        var id = el.getAttribute('data-id');
        if (pendingContactDeleteId === id) {
          clearTimeout(pendingContactDeleteTimer); pendingContactDeleteId = null;
          await sbDelete('contacts', id);
          contactItems = contactItems.filter(function (i) { return i.id !== id; });
          renderContacts();
        } else {
          pendingContactDeleteId = id; renderContacts();
          clearTimeout(pendingContactDeleteTimer);
          pendingContactDeleteTimer = setTimeout(function () { pendingContactDeleteId = null; renderContacts(); }, 6000);
        }
      });
    });
    document.querySelectorAll('.contact-add-btn').forEach(function (el) {
      el.addEventListener('click', async function () {
        var container = el.closest('.add-row');
        var nameInput = container.querySelector('.new-contact-name');
        var name = nameInput.value.trim();
        if (!name) { nameInput.focus(); return; }
        var coSel = container.querySelector('.new-contact-company');
        if (!coSel.value) { showToast('Pick which company this contact belongs to.'); coSel.focus(); return; }
        var role = container.querySelector('.new-contact-role').value.trim();
        var row = {
          name: name, company_id: coSel.value,
          org: container.querySelector('.new-contact-org').value.trim(),
          info: container.querySelector('.new-contact-info').value.trim(),
          tag: el.getAttribute('data-tag'), created_by: currentPerson()
        };
        if (role) row.role = role;
        var saved = await sbInsert('contacts', row);
        if (saved) { contactItems.push(saved); renderContacts(); }
      });
    });
  }

  // ============================================================
  // PROJECTS
  // ============================================================
  function renderProjects() {
    var counts = { 'not-started': 0, 'in-progress': 0, blocked: 0, done: 0 };
    projectItems.forEach(function (p) { counts[p.status] = (counts[p.status] || 0) + 1; });
    document.getElementById('projectsTotalsStrip').innerHTML =
      '<div class="cell grand"><div class="label">Total projects</div><div class="value">' + projectItems.length + '</div></div>' +
      '<div class="cell"><div class="label">In progress</div><div class="value">' + counts['in-progress'] + '</div></div>' +
      '<div class="cell"><div class="label">Blocked</div><div class="value">' + counts.blocked + '</div></div>' +
      '<div class="cell"><div class="label">Done</div><div class="value">' + counts.done + '</div></div>';

    var list = document.getElementById('projectsCategoryList');
    var html = '';
    COMPANIES.forEach(function (co) {
      var secItems = projectItems.filter(function (p) { return p.company_id === co.id; });
      html += '<div class="cat-block"><div class="cat-head co-accent-bar" style="--co-color:' + companyAccent(co.name) + ';"><h2>' + co.name + '</h2><span class="subtotal">' + secItems.length + '</span></div>';
      secItems.forEach(function (p) {
        var pendingConfirm = pendingProjectDeleteId === p.id;
        var tl = projectTimeline(p);
        if (editingProjectId === p.id) {
          html += '<div class="item-row edit-row proj-edit-row" data-id="' + p.id + '">' +
            '<input type="text" class="edit-project-name" value="' + escapeHtml(p.name) + '" placeholder="Project name">' +
            '<input type="text" class="edit-project-owner" value="' + escapeHtml(p.owner || '') + '" placeholder="Owner">' +
            '<input type="text" class="edit-project-note" value="' + escapeHtml(p.note || '') + '" placeholder="Note (optional)">' +
            dateField('edit-project-start', 'Start', p.start_date) +
            dateField('edit-project-end', 'End', p.end_date) +
            '<button class="add-btn save-edit-btn project-save-btn" data-id="' + p.id + '">Save</button>' +
            '<button class="asst-cancel-btn project-cancel-btn" data-id="' + p.id + '">Cancel</button></div>';
        } else {
          html += '<div class="item-row" style="grid-template-columns: 1fr 160px 120px 30px 28px;" data-id="' + p.id + '">';
          html += '<div class="item-name">' + escapeHtml(p.name) + (p.note ? '<span class="note">' + escapeHtml(p.note) + '</span>' : '') +
            (tl.text ? '<span class="note timeline' + (tl.late ? ' late' : '') + '">' + escapeHtml(tl.text) + '</span>' : '') + '</div>';
          html += '<div class="item-name" style="font-size:13px;">' + escapeHtml(p.owner || '\u2014') + '</div>';
          html += '<div class="status-pill project-status-pill status-project-' + p.status + '" data-id="' + p.id + '">' + PROJECT_STATUS_LABEL[p.status] + '</div>';
          html += '<button class="del-btn edit-btn project-edit-btn" data-id="' + p.id + '" title="Edit">\u270e</button>';
          html += '<button class="del-btn project-del-btn' + (pendingConfirm ? ' confirm' : '') + '" data-id="' + p.id + '">' + (pendingConfirm ? 'Sure?' : '\u00d7') + '</button></div>';
        }
      });
      html += '<div class="add-row proj-add-row">' +
        '<input type="text" class="new-project-name" placeholder="Project name" data-co="' + co.id + '">' +
        '<input type="text" class="new-project-owner" placeholder="Owner" data-co="' + co.id + '">' +
        '<input type="text" class="new-project-note" placeholder="Note (optional)" data-co="' + co.id + '">' +
        dateField('new-project-start', 'Start', '') + dateField('new-project-end', 'End', '') +
        '<button class="add-btn project-add-btn" data-co="' + co.id + '">Add</button></div></div>';
    });
    list.innerHTML = html;
    attachProjectHandlers();
  }
  function attachProjectHandlers() {
    document.querySelectorAll('.project-edit-btn').forEach(function (el) {
      el.addEventListener('click', function () { editingProjectId = el.getAttribute('data-id'); renderProjects(); });
    });
    document.querySelectorAll('.project-cancel-btn').forEach(function (el) {
      el.addEventListener('click', function () { editingProjectId = null; renderProjects(); });
    });
    document.querySelectorAll('.project-save-btn').forEach(function (el) {
      el.addEventListener('click', async function () {
        var id = el.getAttribute('data-id');
        var p = projectItems.find(function (i) { return i.id === id; });
        var row = el.closest('.edit-row');
        if (!p || !row) return;
        var name = row.querySelector('.edit-project-name').value.trim();
        if (!name) { row.querySelector('.edit-project-name').focus(); return; }
        var start = row.querySelector('.edit-project-start').value || null;
        var end = row.querySelector('.edit-project-end').value || null;
        if (!datesOk(start, end)) return;
        var patch = {
          name: name,
          owner: row.querySelector('.edit-project-owner').value.trim(),
          note: row.querySelector('.edit-project-note').value.trim()
        };
        // Only send the dates when they actually changed.
        if ((p.start_date || null) !== start) patch.start_date = start;
        if ((p.end_date || null) !== end) patch.end_date = end;
        Object.assign(p, patch);
        editingProjectId = null;
        renderProjects();
        await sbUpdate('projects', id, patch);
      });
    });
    document.querySelectorAll('.project-status-pill').forEach(function (el) {
      el.addEventListener('click', async function () {
        var p = projectItems.find(function (i) { return i.id === el.getAttribute('data-id'); });
        if (!p) return;
        p.status = PROJECT_STATUSES[(PROJECT_STATUSES.indexOf(p.status) + 1) % PROJECT_STATUSES.length];
        renderProjects();
        await sbUpdate('projects', p.id, { status: p.status });
      });
    });
    document.querySelectorAll('.project-del-btn').forEach(function (el) {
      el.addEventListener('click', async function () {
        var id = el.getAttribute('data-id');
        if (pendingProjectDeleteId === id) {
          clearTimeout(pendingProjectDeleteTimer); pendingProjectDeleteId = null;
          await sbDelete('projects', id);
          projectItems = projectItems.filter(function (i) { return i.id !== id; });
          renderProjects();
        } else {
          pendingProjectDeleteId = id; renderProjects();
          clearTimeout(pendingProjectDeleteTimer);
          pendingProjectDeleteTimer = setTimeout(function () { pendingProjectDeleteId = null; renderProjects(); }, 6000);
        }
      });
    });
    document.querySelectorAll('.project-add-btn').forEach(function (el) {
      el.addEventListener('click', async function () {
        var coId = el.getAttribute('data-co');
        var container = el.closest('.add-row');
        var nameInput = container.querySelector('.new-project-name');
        var name = nameInput.value.trim();
        if (!name) { nameInput.focus(); return; }
        var start = container.querySelector('.new-project-start').value || null;
        var end = container.querySelector('.new-project-end').value || null;
        if (!datesOk(start, end)) return;
        var row = {
          name: name, company_id: coId,
          owner: container.querySelector('.new-project-owner').value.trim(),
          note: container.querySelector('.new-project-note').value.trim(),
          status: 'not-started', created_by: currentPerson()
        };
        if (start) row.start_date = start;
        if (end) row.end_date = end;
        var saved = await sbInsert('projects', row);
        if (saved) { projectItems.push(saved); renderProjects(); }
      });
    });
  }

  // ============================================================
  // CALENDAR
  // ============================================================
  var calViewYear, calViewMonth, calSelectedDate = null;
  function isoDate(y, m, d) { return y + '-' + pad2(m + 1) + '-' + pad2(d); }
  function timeToMinutes(t) { if (!t) return null; var p = t.split(':'); return parseInt(p[0], 10) * 60 + parseInt(p[1], 10); }
  function rangesOverlap(aS, aE, bS, bE) { return aS < bE && bS < aE; }
  function conflictIdsForDate(dateStr) {
    var dayEntries = calendarItems.filter(function (e) { return e.event_date === dateStr && e.start_time && e.end_time; });
    var ids = {};
    for (var i = 0; i < dayEntries.length; i++) {
      for (var j = i + 1; j < dayEntries.length; j++) {
        var a = dayEntries[i], b = dayEntries[j];
        if (rangesOverlap(timeToMinutes(a.start_time), timeToMinutes(a.end_time), timeToMinutes(b.start_time), timeToMinutes(b.end_time))) {
          ids[a.id] = true; ids[b.id] = true;
        }
      }
    }
    return ids;
  }
  function allConflictIds() {
    var ids = {}, dates = {};
    calendarItems.forEach(function (e) { dates[e.event_date] = true; });
    Object.keys(dates).forEach(function (d) {
      var c = conflictIdsForDate(d);
      Object.keys(c).forEach(function (id) { ids[id] = true; });
    });
    return ids;
  }
  function formatDateLong(dateStr) {
    var p = dateStr.split('-').map(Number);
    var d = new Date(p[0], p[1] - 1, p[2]);
    var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[d.getDay()] + ', ' + MONTH_LABELS[p[1] - 1] + ' ' + p[2] + ', ' + p[0];
  }
  function formatTimeRange(e) {
    if (!e.start_time && !e.end_time) return 'All day';
    if (e.start_time && e.end_time) return e.start_time.slice(0, 5) + '–' + e.end_time.slice(0, 5);
    return (e.start_time || e.end_time).slice(0, 5);
  }
  function renderCalendar() {
    if (calSelectedDate === null) calSelectedDate = todayISO();
    if (calViewYear === undefined) { var t = new Date(); calViewYear = t.getFullYear(); calViewMonth = t.getMonth(); }
    renderCalTotals(); renderCalHeader(); renderCalGrid(); renderCalDayPanel();
  }
  function renderCalTotals() {
    var monthPrefix = calViewYear + '-' + pad2(calViewMonth + 1);
    var thisMonthCount = calendarItems.filter(function (e) { return e.event_date.indexOf(monthPrefix) === 0; }).length;
    var todayCount = calendarItems.filter(function (e) { return e.event_date === todayISO(); }).length;
    var conflictCount = Object.keys(allConflictIds()).length;
    document.getElementById('calendarTotalsStrip').innerHTML =
      '<div class="cell grand"><div class="label">Total events</div><div class="value">' + calendarItems.length + '</div></div>' +
      '<div class="cell"><div class="label">This month</div><div class="value">' + thisMonthCount + '</div></div>' +
      '<div class="cell"><div class="label">Today</div><div class="value">' + todayCount + '</div></div>' +
      '<div class="cell"><div class="label">Conflicts</div><div class="value">' + conflictCount + '</div></div>';
  }
  function renderCalHeader() {
    var header = document.getElementById('calHeader');
    header.innerHTML = '<h2>' + MONTH_LABELS[calViewMonth] + ' ' + calViewYear + '</h2>' +
      '<div class="cal-nav"><button class="cal-today-btn" id="calTodayBtn">Today</button>' +
      '<button class="cal-nav-btn" id="calPrevBtn">‹</button><button class="cal-nav-btn" id="calNextBtn">›</button></div>';
    document.getElementById('calPrevBtn').addEventListener('click', function () {
      calViewMonth--; if (calViewMonth < 0) { calViewMonth = 11; calViewYear--; } renderCalHeader(); renderCalGrid();
    });
    document.getElementById('calNextBtn').addEventListener('click', function () {
      calViewMonth++; if (calViewMonth > 11) { calViewMonth = 0; calViewYear++; } renderCalHeader(); renderCalGrid();
    });
    document.getElementById('calTodayBtn').addEventListener('click', function () {
      var t = new Date(); calViewYear = t.getFullYear(); calViewMonth = t.getMonth(); calSelectedDate = todayISO();
      renderCalHeader(); renderCalGrid(); renderCalDayPanel();
    });
  }
  function renderCalGrid() {
    var grid = document.getElementById('calGrid');
    var html = '';
    WEEKDAY_LABELS.forEach(function (w) { html += '<div class="cal-weekday">' + w + '</div>'; });
    var firstWeekday = new Date(calViewYear, calViewMonth, 1).getDay();
    var daysInThisMonth = new Date(calViewYear, calViewMonth + 1, 0).getDate();
    var prevMonth = calViewMonth === 0 ? 11 : calViewMonth - 1;
    var prevYear = calViewMonth === 0 ? calViewYear - 1 : calViewYear;
    var daysInPrevMonth = new Date(prevYear, prevMonth + 1, 0).getDate();
    var nextMonth = calViewMonth === 11 ? 0 : calViewMonth + 1;
    var nextYear = calViewMonth === 11 ? calViewYear + 1 : calViewYear;
    var totalCells = Math.ceil((firstWeekday + daysInThisMonth) / 7) * 7;
    var conflictSet = allConflictIds(); var today = todayISO();
    for (var i = 0; i < totalCells; i++) {
      var dayNum, dateStr, outside = false, cellYear = calViewYear, cellMonth = calViewMonth;
      if (i < firstWeekday) { dayNum = daysInPrevMonth - firstWeekday + i + 1; cellYear = prevYear; cellMonth = prevMonth; outside = true; }
      else if (i >= firstWeekday + daysInThisMonth) { dayNum = i - firstWeekday - daysInThisMonth + 1; cellYear = nextYear; cellMonth = nextMonth; outside = true; }
      else { dayNum = i - firstWeekday + 1; }
      dateStr = isoDate(cellYear, cellMonth, dayNum);
      var dayEntries = calendarItems.filter(function (e) { return e.event_date === dateStr; });
      var classes = 'cal-day' + (outside ? ' outside' : '') + (dateStr === today ? ' today' : '') + (dateStr === calSelectedDate ? ' selected' : '');
      html += '<div class="' + classes + '" data-date="' + dateStr + '"><div class="cal-day-num">' + dayNum + '</div>';
      dayEntries.slice(0, 2).forEach(function (e) {
        html += '<div class="cal-chip' + (conflictSet[e.id] ? ' conflict' : '') + '">' + escapeHtml(e.who) + ': ' + escapeHtml(e.what) + '</div>';
      });
      if (dayEntries.length > 2) html += '<div class="cal-chip-more">+' + (dayEntries.length - 2) + ' more</div>';
      html += '</div>';
    }
    grid.innerHTML = html;
    document.querySelectorAll('.cal-day').forEach(function (el) {
      el.addEventListener('click', function () {
        var d = el.getAttribute('data-date');
        calSelectedDate = d;
        var p = d.split('-').map(Number); calViewYear = p[0]; calViewMonth = p[1] - 1;
        renderCalHeader(); renderCalGrid(); renderCalDayPanel();
      });
    });
  }
  function renderCalDayPanel() {
    var panel = document.getElementById('calDayPanel');
    var dateStr = calSelectedDate;
    var dayEntries = calendarItems.filter(function (e) { return e.event_date === dateStr; })
      .sort(function (a, b) { if (!a.start_time) return -1; if (!b.start_time) return 1; return a.start_time < b.start_time ? -1 : 1; });
    var conflictSet = conflictIdsForDate(dateStr);
    var html = '<div class="cal-day-panel-inner"><h3>' + formatDateLong(dateStr) + '</h3>';
    if (dayEntries.length === 0) html += '<div class="empty-state" style="padding:16px 0;">Nothing scheduled yet.</div>';
    else dayEntries.forEach(function (e) {
      var isConflict = conflictSet[e.id], pendingConfirm = pendingCalDeleteId === e.id;
      html += '<div class="cal-entry' + (isConflict ? ' conflict' : '') + '"><div class="cal-entry-main">';
      html += '<div class="cal-entry-time">' + formatTimeRange(e) + ' · ' + escapeHtml(e.who) + '</div>';
      html += '<div class="cal-entry-what">' + escapeHtml(e.what) + '</div>';
      if (e.note) html += '<div class="cal-entry-note">' + escapeHtml(e.note) + '</div>';
      if (isConflict) html += '<div class="cal-conflict-badge">⚠ Time conflict</div>';
      html += '</div><button class="del-btn cal-del-btn' + (pendingConfirm ? ' confirm' : '') + '" data-id="' + e.id + '">' + (pendingConfirm ? 'Sure?' : '×') + '</button></div>';
    });
    html += '<div class="cal-add-row"><select id="calNewWho"><option value="">Who\'s it for?</option>' + WHO_NAMES.map(function (n) { return '<option>' + n + '</option>'; }).join('') + '</select>' +
      '<input type="time" id="calNewStart"><input type="time" id="calNewEnd">' +
      '<input type="text" id="calNewWhat" placeholder="What"><input type="text" id="calNewNote" placeholder="Note (optional)">' +
      '<button class="add-btn" id="calAddBtn">Add</button></div></div>';
    panel.innerHTML = html;
    document.querySelectorAll('.cal-del-btn').forEach(function (el) {
      el.addEventListener('click', async function () {
        var id = el.getAttribute('data-id');
        if (pendingCalDeleteId === id) {
          clearTimeout(pendingCalDeleteTimer); pendingCalDeleteId = null;
          await sbDelete('calendar_events', id);
          calendarItems = calendarItems.filter(function (i) { return i.id !== id; });
          renderCalendar();
        } else {
          pendingCalDeleteId = id; renderCalDayPanel();
          clearTimeout(pendingCalDeleteTimer);
          pendingCalDeleteTimer = setTimeout(function () { pendingCalDeleteId = null; renderCalDayPanel(); }, 6000);
        }
      });
    });
    document.getElementById('calAddBtn').addEventListener('click', async function () {
      var whatInput = document.getElementById('calNewWhat');
      var what = whatInput.value.trim();
      if (!what) { whatInput.focus(); return; }
      var whoSel = document.getElementById('calNewWho');
      if (!whoSel.value) { showToast('Pick who this event is for.'); whoSel.focus(); return; }
      var row = {
        event_date: dateStr, who: whoSel.value,
        start_time: document.getElementById('calNewStart').value || null,
        end_time: document.getElementById('calNewEnd').value || null,
        what: what, note: document.getElementById('calNewNote').value.trim(), created_by: currentPerson()
      };
      var saved = await sbInsert('calendar_events', row);
      if (saved) { calendarItems.push(saved); renderCalendar(); }
    });
  }

  // ============================================================
  // TO-DOS
  // ============================================================
  function isOverdue(t) { return t.due_date && t.status === 'not-done' && t.due_date < todayISO(); }
  function formatDueShort(dateStr) { var p = dateStr.split('-').map(Number); return MONTH_LABELS[p[1] - 1].slice(0, 3) + ' ' + p[2]; }
  function renderTodos() {
    var done = 0, notDone = 0, overdue = 0;
    todoItems.forEach(function (t) { if (t.status === 'done') done++; else notDone++; if (isOverdue(t)) overdue++; });
    document.getElementById('todosTotalsStrip').innerHTML =
      '<div class="cell grand"><div class="label">Total to-dos</div><div class="value">' + todoItems.length + '</div></div>' +
      '<div class="cell"><div class="label">Not done</div><div class="value">' + notDone + '</div></div>' +
      '<div class="cell"><div class="label">Done</div><div class="value">' + done + '</div></div>' +
      '<div class="cell"><div class="label">Overdue</div><div class="value">' + overdue + '</div></div>';
    var list = document.getElementById('todosCategoryList');
    var html = '';
    COMPANIES.forEach(function (co) {
      var secItems = todoItems.filter(function (t) { return t.company_id === co.id; });
      html += '<div class="cat-block"><div class="cat-head co-accent-bar" style="--co-color:' + companyAccent(co.name) + ';"><h2>' + co.name + '</h2><span class="subtotal">' + secItems.length + '</span></div>';
      secItems.forEach(function (t) {
        var pendingConfirm = pendingTodoDeleteId === t.id, overdue = isOverdue(t);
        html += '<div class="item-row" style="grid-template-columns: 1fr 120px 28px;" data-id="' + t.id + '">';
        html += '<div class="item-name">' + escapeHtml(t.task);
        if (t.due_date) html += '<span class="note" style="' + (overdue ? 'color:var(--deep-aqua);font-weight:700;' : '') + '">Due ' + formatDueShort(t.due_date) + (overdue ? ' · OVERDUE' : '') + '</span>';
        html += '</div><div class="status-pill todo-status-pill status-todo-' + t.status + '" data-id="' + t.id + '">' + TODO_STATUS_LABEL[t.status] + '</div>';
        html += '<button class="del-btn todo-del-btn' + (pendingConfirm ? ' confirm' : '') + '" data-id="' + t.id + '">' + (pendingConfirm ? 'Sure?' : '×') + '</button></div>';
      });
      html += '<div class="add-row" style="grid-template-columns: 1.6fr 1fr 96px;">' +
        '<input type="text" class="new-todo-task" placeholder="Task" data-co="' + co.id + '">' +
        '<input type="date" class="new-todo-due" data-co="' + co.id + '">' +
        '<button class="add-btn todo-add-btn" data-co="' + co.id + '">Add</button></div></div>';
    });
    list.innerHTML = (todoItems.length === 0 ? '<div class="empty-state">No to-dos yet. Add the first one below.</div>' : '') + html;
    attachTodoHandlers();
  }
  function attachTodoHandlers() {
    document.querySelectorAll('.todo-status-pill').forEach(function (el) {
      el.addEventListener('click', async function () {
        var t = todoItems.find(function (i) { return i.id === el.getAttribute('data-id'); });
        if (!t) return;
        t.status = TODO_STATUSES[(TODO_STATUSES.indexOf(t.status) + 1) % TODO_STATUSES.length];
        renderTodos();
        await sbUpdate('todos', t.id, { status: t.status });
      });
    });
    document.querySelectorAll('.todo-del-btn').forEach(function (el) {
      el.addEventListener('click', async function () {
        var id = el.getAttribute('data-id');
        if (pendingTodoDeleteId === id) {
          clearTimeout(pendingTodoDeleteTimer); pendingTodoDeleteId = null;
          await sbDelete('todos', id);
          todoItems = todoItems.filter(function (i) { return i.id !== id; });
          renderTodos();
        } else {
          pendingTodoDeleteId = id; renderTodos();
          clearTimeout(pendingTodoDeleteTimer);
          pendingTodoDeleteTimer = setTimeout(function () { pendingTodoDeleteId = null; renderTodos(); }, 6000);
        }
      });
    });
    document.querySelectorAll('.todo-add-btn').forEach(function (el) {
      el.addEventListener('click', async function () {
        var coId = el.getAttribute('data-co');
        var container = el.closest('.add-row');
        var taskInput = container.querySelector('.new-todo-task');
        var task = taskInput.value.trim();
        if (!task) { taskInput.focus(); return; }
        var due = container.querySelector('.new-todo-due').value;
        var row = { task: task, company_id: coId, due_date: due || null, status: 'not-done', created_by: currentPerson() };
        var saved = await sbInsert('todos', row);
        if (saved) { todoItems.push(saved); renderTodos(); }
      });
    });
  }

  // ============================================================
  // MONEY (+ grants preview)
  // ============================================================
  function grantsForItem(itemId) { return moneyGrants.filter(function (g) { return g.money_item_id === itemId; }); }
  function isVisibleToCurrentPerson(item) {
    var myCompany = companyByName(currentPersonCompanyName());
    if (myCompany && item.company_id === myCompany.id) return true;
    return grantsForItem(item.id).some(function (g) {
      if (g.grant_type === 'public') return true;
      if (g.grant_type === 'person') return g.grantee_person === currentPerson();
      if (g.grant_type === 'company') return myCompany && g.grantee_company_id === myCompany.id;
      return false;
    });
  }
  function renderMoney() {
    var visible = moneyItems.filter(isVisibleToCurrentPerson);
    var total = 0, actual = 0, received = 0;
    visible.forEach(function (i) { total += Number(i.est_cost) || 0; actual += Number(i.actual_cost) || 0; if (i.status === 'received') received++; });
    document.getElementById('moneyTotalsStrip').innerHTML =
      '<div class="cell grand"><div class="label">Estimated total</div><div class="value">₱' + total.toLocaleString() + '</div></div>' +
      '<div class="cell"><div class="label">Actual spent</div><div class="value">₱' + actual.toLocaleString() + '</div></div>' +
      '<div class="cell"><div class="label">Items</div><div class="value">' + visible.length + '</div></div>' +
      '<div class="cell"><div class="label">Received</div><div class="value">' + received + '</div></div>';

    var list = document.getElementById('moneyCategoryList');
    var myCompany = companyByName(currentPersonCompanyName());
    var html = '';
    GEAR_CATEGORIES.forEach(function (cat) {
      var catItems = visible.filter(function (i) { return i.category === cat; });
      html += '<div class="cat-block"><div class="cat-head"><h2>' + cat + '</h2><span class="subtotal">₱' +
        catItems.reduce(function (s, i) { return s + (Number(i.est_cost) || 0); }, 0).toLocaleString() + '</span></div>';
      catItems.forEach(function (item) {
        var pendingConfirm = pendingMoneyDeleteId === item.id;
        var isMine = myCompany && item.company_id === myCompany.id;
        var lockLabel = isMine ? 'Private to ' + (companyById(item.company_id) || {}).name : 'Shared with you by ' + (companyById(item.company_id) || {}).name;
        html += '<div class="item-row" data-id="' + item.id + '">';
        html += '<div class="item-name">' + escapeHtml(item.name) + (item.note ? '<span class="note">' + escapeHtml(item.note) + '</span>' : '') +
          '<span class="money-lock">🔒 ' + escapeHtml(lockLabel) + (isMine ? '<button class="share-btn" data-id="' + item.id + '">Share</button>' : '') + '</span></div>';
        html += '<input class="item-cost money-est-input" type="number" value="' + (item.est_cost == null ? '' : item.est_cost) + '" data-id="' + item.id + '" ' + (isMine ? '' : 'disabled') + '>';
        html += '<input class="item-cost money-actual-input" type="number" value="' + (item.actual_cost == null ? '' : item.actual_cost) + '" placeholder="actual" data-id="' + item.id + '" ' + (isMine ? '' : 'disabled') + '>';
        html += '<div class="status-pill money-status-pill status-' + item.status + '" data-id="' + item.id + '">' + MONEY_STATUS_LABEL[item.status] + '</div>';
        html += isMine ? '<button class="del-btn money-del-btn' + (pendingConfirm ? ' confirm' : '') + '" data-id="' + item.id + '">' + (pendingConfirm ? 'Sure?' : '×') + '</button>' : '<span></span>';
        html += '</div>';
        if (openShareItemId === item.id) html += renderSharePanel(item);
      });
      if (myCompany) {
        html += '<div class="add-row"><input type="text" class="new-money-name" placeholder="Item name" data-cat="' + cat + '">' +
          '<input type="text" class="new-money-note" placeholder="Note (optional)" data-cat="' + cat + '">' +
          '<input type="number" class="new-money-cost" placeholder="Est. cost" data-cat="' + cat + '">' +
          '<button class="add-btn money-add-btn" data-cat="' + cat + '">Add</button></div>';
      }
      html += '</div>';
    });
    list.innerHTML = html;
    attachMoneyHandlers();
  }
  function renderSharePanel(item) {
    var grants = grantsForItem(item.id);
    var html = '<div class="share-panel"><strong>Share "' + escapeHtml(item.name) + '"</strong><br><br>';
    grants.forEach(function (g) {
      var label = g.grant_type === 'public' ? 'Everyone' : g.grant_type === 'person' ? g.grantee_person : (companyById(g.grantee_company_id) || {}).name;
      html += '<span class="grant-tag">' + escapeHtml(label) + ' <button class="revoke-grant-btn" data-grant-id="' + g.id + '">×</button></span>';
    });
    html += '<div style="margin-top:8px;">' +
      '<select id="grantTypeSelect-' + item.id + '"><option value="person">A specific person</option><option value="company">A whole company</option><option value="public">Everyone</option></select> ' +
      '<span id="grantTargetWrap-' + item.id + '"></span> ' +
      '<button class="add-btn grant-add-btn" data-id="' + item.id + '">Grant</button></div></div>';
    return html;
  }
  function refreshGrantTarget(itemId) {
    var typeSel = document.getElementById('grantTypeSelect-' + itemId);
    var wrap = document.getElementById('grantTargetWrap-' + itemId);
    if (!typeSel || !wrap) return;
    if (typeSel.value === 'person') {
      wrap.innerHTML = '<select id="grantTargetSelect-' + itemId + '">' + WHO_NAMES.map(function (n) { return '<option>' + n + '</option>'; }).join('') + '</select>';
    } else if (typeSel.value === 'company') {
      wrap.innerHTML = '<select id="grantTargetSelect-' + itemId + '">' + COMPANIES.map(function (c) { return '<option value="' + c.id + '">' + c.name + '</option>'; }).join('') + '</select>';
    } else {
      wrap.innerHTML = '';
    }
  }
  function attachMoneyHandlers() {
    document.querySelectorAll('.money-status-pill').forEach(function (el) {
      el.addEventListener('click', async function () {
        var i = moneyItems.find(function (x) { return x.id === el.getAttribute('data-id'); });
        if (!i) return;
        i.status = MONEY_STATUSES[(MONEY_STATUSES.indexOf(i.status) + 1) % MONEY_STATUSES.length];
        renderMoney();
        await sbUpdate('money_items', i.id, { status: i.status });
      });
    });
    document.querySelectorAll('.money-est-input').forEach(function (el) {
      el.addEventListener('change', async function () {
        var i = moneyItems.find(function (x) { return x.id === el.getAttribute('data-id'); });
        if (!i) return;
        i.est_cost = el.value === '' ? null : Number(el.value);
        await sbUpdate('money_items', i.id, { est_cost: i.est_cost });
        renderMoney();
      });
    });
    document.querySelectorAll('.money-actual-input').forEach(function (el) {
      el.addEventListener('change', async function () {
        var i = moneyItems.find(function (x) { return x.id === el.getAttribute('data-id'); });
        if (!i) return;
        i.actual_cost = el.value === '' ? null : Number(el.value);
        await sbUpdate('money_items', i.id, { actual_cost: i.actual_cost });
        renderMoney();
      });
    });
    document.querySelectorAll('.money-del-btn').forEach(function (el) {
      el.addEventListener('click', async function () {
        var id = el.getAttribute('data-id');
        if (pendingMoneyDeleteId === id) {
          clearTimeout(pendingMoneyDeleteTimer); pendingMoneyDeleteId = null;
          await sbDelete('money_items', id);
          moneyItems = moneyItems.filter(function (i) { return i.id !== id; });
          renderMoney();
        } else {
          pendingMoneyDeleteId = id; renderMoney();
          clearTimeout(pendingMoneyDeleteTimer);
          pendingMoneyDeleteTimer = setTimeout(function () { pendingMoneyDeleteId = null; renderMoney(); }, 6000);
        }
      });
    });
    document.querySelectorAll('.money-add-btn').forEach(function (el) {
      el.addEventListener('click', async function () {
        var cat = el.getAttribute('data-cat');
        var container = el.closest('.add-row');
        var nameInput = container.querySelector('.new-money-name');
        var name = nameInput.value.trim();
        if (!name) { nameInput.focus(); return; }
        var myCompany = companyByName(currentPersonCompanyName());
        var costVal = container.querySelector('.new-money-cost').value;
        var row = {
          name: name, category: cat, company_id: myCompany.id,
          note: container.querySelector('.new-money-note').value.trim(),
          est_cost: costVal === '' ? null : Number(costVal),
          status: 'wishlist', created_by: currentPerson()
        };
        var saved = await sbInsert('money_items', row);
        if (saved) { moneyItems.push(saved); renderMoney(); }
      });
    });
    document.querySelectorAll('.share-btn').forEach(function (el) {
      el.addEventListener('click', function () {
        var id = el.getAttribute('data-id');
        openShareItemId = (openShareItemId === id) ? null : id;
        renderMoney();
        if (openShareItemId) refreshGrantTarget(openShareItemId);
      });
    });
    document.querySelectorAll('[id^="grantTypeSelect-"]').forEach(function (el) {
      el.addEventListener('change', function () { refreshGrantTarget(el.id.replace('grantTypeSelect-', '')); });
      refreshGrantTarget(el.id.replace('grantTypeSelect-', ''));
    });
    document.querySelectorAll('.revoke-grant-btn').forEach(function (el) {
      el.addEventListener('click', async function () {
        var grantId = el.getAttribute('data-grant-id');
        await sbDelete('money_grants', grantId);
        moneyGrants = moneyGrants.filter(function (g) { return g.id !== grantId; });
        renderMoney();
      });
    });
    document.querySelectorAll('.grant-add-btn').forEach(function (el) {
      el.addEventListener('click', async function () {
        var itemId = el.getAttribute('data-id');
        var typeSel = document.getElementById('grantTypeSelect-' + itemId);
        var type = typeSel.value;
        var row = { money_item_id: itemId, grant_type: type, granted_by: currentPerson() };
        if (type === 'person') row.grantee_person = document.getElementById('grantTargetSelect-' + itemId).value;
        if (type === 'company') row.grantee_company_id = document.getElementById('grantTargetSelect-' + itemId).value;
        var saved = await sbInsert('money_grants', row);
        if (saved) { moneyGrants.push(saved); renderMoney(); }
      });
    });
  }

  // ============================================================
  // ASSISTANT
  // ============================================================
  function buildDataSnapshot() {
    return JSON.stringify({
      today: todayISO(), todayWeekday: WEEKDAY_LABELS[new Date().getDay()],
      companies: COMPANIES.map(function (c) { return c.name; }),
      people: WHO_NAMES,
      currentUser: currentPerson(),
      gearCategories: GEAR_CATEGORIES, contactTags: CONTACT_TAGS,
      projectStatuses: PROJECT_STATUSES, todoStatuses: TODO_STATUSES, gearStatuses: GEAR_STATUSES,
      existingGear: gearItems.map(function (g) { return { id: g.id, name: g.name, category: g.category, holder: g.holder, status: g.status }; }),
      existingContacts: contactItems.map(function (c) { return { id: c.id, name: c.name, company: (companyById(c.company_id) || {}).name, tag: c.tag, organization: c.org, role: c.role }; }),
      existingProjects: projectItems.map(function (p) { return { id: p.id, name: p.name, company: (companyById(p.company_id) || {}).name, status: p.status, startDate: p.start_date, endDate: p.end_date }; }),
      existingTodos: todoItems.map(function (t) { return { id: t.id, task: t.task, company: (companyById(t.company_id) || {}).name, status: t.status, dueDate: t.due_date }; }),
      visibleMoneyItems: moneyItems.filter(isVisibleToCurrentPerson).map(function (i) { return { id: i.id, name: i.name, category: i.category, company: (companyById(i.company_id) || {}).name, status: i.status }; })
    });
  }
  function buildBusinessContextText() {
    var lines = [];
    Object.keys(BUSINESS_CONTEXT.companies).forEach(function (name) {
      var c = BUSINESS_CONTEXT.companies[name];
      var line = '- ' + name + ': ' + c.whatWeDo;
      if (c.typicalWork && c.typicalWork.length) line += ' Typical work: ' + c.typicalWork.join(', ') + '.';
      lines.push(line);
    });
    var peopleLines = Object.keys(BUSINESS_CONTEXT.people).map(function (name) {
      var p = BUSINESS_CONTEXT.people[name];
      return name + ' (' + p.role + ', ' + p.company + ')';
    });
    var text = 'WHAT EACH COMPANY DOES:\n' + lines.join('\n') + '\n\nPEOPLE AND ROLES:\n' + peopleLines.join('; ') + '\n';
    if (BUSINESS_CONTEXT.commonVendorsOrClients.length) {
      text += '\nRECURRING VENDORS/CLIENTS: ' + BUSINESS_CONTEXT.commonVendorsOrClients.join(', ') + '.\n';
    }
    if (BUSINESS_CONTEXT.shorthand.length) {
      text += '\nHOUSE SHORTHAND (resolve these automatically, don\'t ask): ' +
        BUSINESS_CONTEXT.shorthand.map(function (s) { return '"' + s.term + '" means ' + s.meansGear; }).join('; ') + '.\n';
    }
    return text;
  }
  function buildAssistantRules() {
    return (
      'You are a filing assistant inside "Virtual HQ", a shared internal tool for three small companies working out of one studio: MAAD Solutions, Pulse Narrative, and Alexander & Co. ' +
      'The user talking to you right now is: ' + currentPerson() + '. When they say "I" or "me", that means ' + currentPerson() + '.\n\n' +
      buildBusinessContextText() + '\n' +
      'You handle two kinds of messages. If the user is asking a QUESTION about existing data ("what\'s overdue for MAAD", "who has the camera", "is Thursday double-booked"), answer it directly and helpfully using CURRENT DATA below, and return an empty actions list. If the user is telling you something to FILE (a meeting, a task, gear status, a new contact), propose structured actions as described below. A single message can contain both a question and something to file - handle both. A single message can also describe several unrelated things to file - handle each independently.\n\n' +
      'CATEGORIES AND FIELDS:\n' +
      '- gear: fields name, category (one of gearCategories), holder (who has it now, or empty), status (one of gearStatuses), note (optional).\n' +
      '- contacts: fields name, company (one of companies - which company this contact belongs to), org (their organization, optional), role (their job title or role, optional), info (email or phone, optional), tag (one of contactTags).\n' +
      '- projects: fields name, company (one of companies), owner (a name, free text), note (optional), status (one of projectStatuses), startDate (YYYY-MM-DD, optional), endDate (YYYY-MM-DD, optional).\n' +
      '- calendar: fields date (YYYY-MM-DD), who (must be one of people), what (title), startTime (HH:MM 24-hour, optional), endTime (HH:MM 24-hour, optional), note (optional).\n' +
      '- todos: fields task, company (one of companies), dueDate (YYYY-MM-DD, optional), status (one of todoStatuses).\n\n' +
      'MATCHING RULE: compare what the user says against the "existing*" lists in CURRENT DATA. If there is exactly one plausible match for something they refer to, propose an "update" using that item\'s id instead of a duplicate. If more than one item is plausibly what they mean, ask a clarifying question and propose no action for that item yet. If nothing plausibly matches, propose "create". Apply the same assume-if-one / ask-if-several logic to any other ambiguous detail: which company, which person, which date.\n\n' +
      'Reply with ONLY a JSON object, nothing else. No markdown fences, no conversational lead-in like "Sure, here it is:" or "Perfect, I\'ll log that", no text before or after the object. This applies to every single message, including short ones - if the user just answers your own clarifying question with something like "yes" or a one-word confirmation, your response is still the full JSON object, with the confirmed action now filled in and ready in "actions", not a plain sentence acknowledging their answer. Any warmth or acknowledgment belongs inside the "reply" field, not outside the JSON. Shaped exactly like this:\n' +
      '{"reply": "a short natural conversational line - answer a question, confirm what you understood, or ask a clarifying question here", "actions": [{"module": "gear", "operation": "create", "matchId": null, "summary": "one plain-English line describing this action, for a confirmation list", "fields": {}}]}\n' +
      'If you are only answering a question or asking a clarifying question, return "actions": [].\n\n' +
      'CURRENT DATA:\n' + buildDataSnapshot()
    );
  }
  function renderChatLog() {
    var log = document.getElementById('asstLog');
    var html = '';
    chatTurns.forEach(function (t) { html += '<div class="asst-bubble ' + (t.role === 'user' ? 'user' : 'assistant') + '">' + escapeHtml(t.content) + '</div>'; });
    if (asstBusy) html += '<div class="asst-bubble thinking">Thinking...</div>';
    log.innerHTML = html;
    log.scrollTop = log.scrollHeight;
    document.getElementById('asstIntro').style.display = chatTurns.length === 0 ? '' : 'none';
  }
  function renderPendingActions() {
    var box = document.getElementById('asstPending');
    if (!pendingActions || pendingActions.length === 0) { box.style.display = 'none'; box.innerHTML = ''; return; }
    var html = '<h3>Ready to file</h3><ul>';
    pendingActions.forEach(function (a) { html += '<li>' + escapeHtml(a.summary || (a.operation + ' ' + a.module)) + '</li>'; });
    html += '</ul><div class="asst-pending-actions"><button class="asst-confirm-btn" id="asstConfirmBtn">Add these</button><button class="asst-cancel-btn" id="asstCancelBtn">Cancel</button></div>';
    box.innerHTML = html; box.style.display = '';
    document.getElementById('asstConfirmBtn').addEventListener('click', applyPendingActions);
    document.getElementById('asstCancelBtn').addEventListener('click', function () { pendingActions = null; renderPendingActions(); });
  }
  function isISODate(v) { return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v); }
  function oneOf(val, list, fallback) { return list.indexOf(val) !== -1 ? val : fallback; }
  async function applyPendingActions() {
    if (!pendingActions) return;
    setStatus('asstStatusBar', 'saving...');
    for (var idx = 0; idx < pendingActions.length; idx++) {
      var a = pendingActions[idx]; var f = a.fields || {};
      try {
        if (a.module === 'gear') {
          if (a.operation === 'update' && a.matchId) {
            var g = gearItems.find(function (i) { return i.id === a.matchId; });
            if (g) {
              var patch = {};
              if (f.holder !== undefined) patch.holder = f.holder;
              if (f.status !== undefined) patch.status = oneOf(f.status, GEAR_STATUSES, g.status);
              if (f.note !== undefined) patch.note = f.note;
              var prevHolder = g.holder || '', prevStatus = g.status;
              Object.assign(g, patch); await sbUpdate('gear_items', g.id, patch);
              if (patch.holder !== undefined) await logGearChange(g.id, 'holder', prevHolder, g.holder);
              if (patch.status !== undefined) await logGearChange(g.id, 'status', prevStatus, g.status);
            }
          } else if (f.name) {
            var row = { name: f.name, category: oneOf(f.category, GEAR_CATEGORIES, GEAR_CATEGORIES[0]), holder: f.holder || '', status: oneOf(f.status, GEAR_STATUSES, 'available'), note: f.note || '', created_by: currentPerson() };
            var saved = await sbInsert('gear_items', row); if (saved) gearItems.push(saved);
          }
        } else if (a.module === 'contacts') {
          var co = companyByName(f.company);
          if (a.operation === 'update' && a.matchId) {
            var c = contactItems.find(function (i) { return i.id === a.matchId; });
            if (c) {
              var cp = {}; if (f.org !== undefined) cp.org = f.org; if (f.role !== undefined) cp.role = f.role; if (f.info !== undefined) cp.info = f.info; if (f.tag !== undefined) cp.tag = oneOf(f.tag, CONTACT_TAGS, c.tag);
              Object.assign(c, cp); await sbUpdate('contacts', c.id, cp);
            }
          } else if (f.name && co) {
            var crow = { name: f.name, company_id: co.id, org: f.org || '', info: f.info || '', tag: oneOf(f.tag, CONTACT_TAGS, 'contact'), created_by: currentPerson() };
            if (f.role) crow.role = f.role;
            var csaved = await sbInsert('contacts', crow); if (csaved) contactItems.push(csaved);
          }
        } else if (a.module === 'projects') {
          var pco = companyByName(f.company);
          if (a.operation === 'update' && a.matchId) {
            var p = projectItems.find(function (i) { return i.id === a.matchId; });
            if (p) {
              var pp = {}; if (f.owner !== undefined) pp.owner = f.owner; if (f.note !== undefined) pp.note = f.note; if (f.status !== undefined) pp.status = oneOf(f.status, PROJECT_STATUSES, p.status);
              if (f.startDate !== undefined) pp.start_date = isISODate(f.startDate) ? f.startDate : null;
              if (f.endDate !== undefined) pp.end_date = isISODate(f.endDate) ? f.endDate : null;
              Object.assign(p, pp); await sbUpdate('projects', p.id, pp);
            }
          } else if (f.name && pco) {
            var prow = { name: f.name, company_id: pco.id, owner: f.owner || '', note: f.note || '', status: oneOf(f.status, PROJECT_STATUSES, 'not-started'), created_by: currentPerson() };
            if (isISODate(f.startDate)) prow.start_date = f.startDate;
            if (isISODate(f.endDate)) prow.end_date = f.endDate;
            var psaved = await sbInsert('projects', prow); if (psaved) projectItems.push(psaved);
          }
        } else if (a.module === 'calendar') {
          if (f.date && /^\d{4}-\d{2}-\d{2}$/.test(f.date)) {
            var erow = { event_date: f.date, who: oneOf(f.who, WHO_NAMES, WHO_NAMES[0]), what: f.what || 'Untitled', start_time: f.startTime || null, end_time: f.endTime || null, note: f.note || '', created_by: currentPerson() };
            var esaved = await sbInsert('calendar_events', erow); if (esaved) calendarItems.push(esaved);
          }
        } else if (a.module === 'todos') {
          var tco = companyByName(f.company);
          if (a.operation === 'update' && a.matchId) {
            var t = todoItems.find(function (i) { return i.id === a.matchId; });
            if (t) {
              var tp = {}; if (f.status !== undefined) tp.status = oneOf(f.status, TODO_STATUSES, t.status); if (f.dueDate !== undefined) tp.due_date = f.dueDate || null;
              Object.assign(t, tp); await sbUpdate('todos', t.id, tp);
            }
          } else if (f.task && tco) {
            var trow = { task: f.task, company_id: tco.id, due_date: (f.dueDate && /^\d{4}-\d{2}-\d{2}$/.test(f.dueDate)) ? f.dueDate : null, status: oneOf(f.status, TODO_STATUSES, 'not-done'), created_by: currentPerson() };
            var tsaved = await sbInsert('todos', trow); if (tsaved) todoItems.push(tsaved);
          }
        }
      } catch (e) { console.error('action failed', a, e); }
    }
    renderGear(); renderContacts(); renderProjects(); renderCalendar(); renderTodos(); renderMoney();
    pendingActions = null; renderPendingActions();
    setStatus('asstStatusBar', 'saved');
  }
  async function callAI(turns) {
    var body = { system: buildAssistantRules(), messages: turns };
    var res = await fetch(AI_PROXY_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    var data = await res.json();
    if (data.error) throw new Error(data.error.message || 'AI request failed');
    var textBlock = (data.content || []).find(function (b) { return b.type === 'text'; });
    if (!textBlock) throw new Error('No response text');
    var raw = textBlock.text.trim().replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```\s*$/, '');
    // The model is instructed to reply with only JSON, but doesn't always comply,
    // sometimes it wraps the JSON in a conversational lead-in ("Perfect. I'll log..."),
    // and sometimes it skips JSON entirely and just replies in plain prose (this shows
    // up especially on short follow-up turns like "yes"). Handle both gracefully rather
    // than surfacing a parse error to the user - the model's actual words should never
    // just get replaced by an error message.
    var firstBrace = raw.indexOf('{');
    var lastBrace = raw.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      var candidate = raw.substring(firstBrace, lastBrace + 1);
      try {
        return JSON.parse(candidate);
      } catch (e) { /* not actually valid JSON - fall through to the plain-text case below */ }
    }
    // No usable JSON found at all - treat the whole reply as a plain conversational
    // line with nothing to file, rather than erroring out.
    return { reply: raw, actions: [] };
  }
  async function sendChatMessage() {
    var input = document.getElementById('asstInput');
    var text = input.value.trim();
    if (!text || asstBusy) return;
    // The Assistant treats "I" and "me" as whoever is logged in, so it needs a name.
    if (!hasName()) { promptForName(); return; }
    input.value = ''; input.disabled = true; document.getElementById('asstSendBtn').disabled = true;
    chatTurns.push({ role: 'user', content: text });
    asstBusy = true; renderChatLog();
    try {
      var result = await callAI(chatTurns);
      asstBusy = false;
      var reply = (result && typeof result.reply === 'string') ? result.reply : 'Got it.';
      chatTurns.push({ role: 'assistant', content: reply });
      pendingActions = (result && Array.isArray(result.actions)) ? result.actions.filter(function (a) { return a && a.module && a.fields; }) : [];
      renderChatLog(); renderPendingActions();
    } catch (e) {
      asstBusy = false;
      chatTurns.push({ role: 'assistant', content: 'Couldn\'t process that — ' + (e.message || 'try again.') });
      renderChatLog();
    } finally {
      document.getElementById('asstInput').disabled = false;
      document.getElementById('asstSendBtn').disabled = false;
      document.getElementById('asstInput').focus();
    }
  }
  function initVoice() {
    var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    var micBtn = document.getElementById('asstMicBtn');
    if (!SpeechRecognition) return;
    micBtn.style.display = '';
    recognizer = new SpeechRecognition();
    recognizer.continuous = false;
    recognizer.interimResults = false;
    recognizer.lang = 'en-US';
    recognizer.onresult = function (e) {
      var transcript = e.results[0][0].transcript;
      var input = document.getElementById('asstInput');
      input.value = (input.value ? input.value + ' ' : '') + transcript;
      input.focus();
    };
    recognizer.onend = function () { listening = false; micBtn.classList.remove('listening'); };
    recognizer.onerror = function () { listening = false; micBtn.classList.remove('listening'); };
    micBtn.addEventListener('click', function () {
      if (listening) { recognizer.stop(); return; }
      listening = true; micBtn.classList.add('listening'); recognizer.start();
    });
  }
  function openAsstWidget() {
    document.getElementById('asstWidget').style.display = 'flex';
    document.getElementById('asstBubbleBtn').style.display = 'none';
    document.getElementById('asstInput').focus();
  }
  function closeAsstWidget() {
    document.getElementById('asstWidget').style.display = 'none';
    document.getElementById('asstBubbleBtn').style.display = '';
  }
  function initAssistant() {
    document.getElementById('asstSendBtn').addEventListener('click', sendChatMessage);
    document.getElementById('asstInput').addEventListener('keydown', function (e) { if (e.key === 'Enter') sendChatMessage(); });
    document.getElementById('asstBubbleBtn').addEventListener('click', openAsstWidget);
    document.getElementById('asstWidgetClose').addEventListener('click', closeAsstWidget);
    document.querySelectorAll('.asst-quick-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.getElementById('asstInput').value = btn.getAttribute('data-prompt');
        sendChatMessage();
      });
    });
    initVoice();
  }

  // ============================================================
  // INIT
  // ============================================================
  async function loadCompanies() {
    var res = await sb.from('companies').select('*').order('name');
    COMPANIES = res.data || [];
  }
  async function init() {
    initWho(); initTabs(); initAssistant();
    document.getElementById('exportBtn').addEventListener('click', exportEverything);
    await loadCompanies();
    gearItems = await sbSelect('gear_items');
    gearHistory = await sbSelect('gear_history');
    contactItems = await sbSelect('contacts');
    projectItems = await sbSelect('projects');
    calendarItems = await sbSelect('calendar_events');
    todoItems = await sbSelect('todos');
    moneyItems = await sbSelect('money_items');
    moneyGrants = await sbSelect('money_grants');
    renderGear(); renderContacts(); renderProjects(); renderCalendar(); renderTodos(); renderMoney();
    renderOverview();
    initScrollReveals();
    renderChatLog();
  }

  init();
})();
