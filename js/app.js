import api, { MODE } from './store.js';
import { CONFIG } from './config.js';
import {
  esc, icon, todayISO, fmtDayLong, relDay, fmtWindow, fmtStamp, initials, greeting,
  STATUS, statusChip, PART_STATUS, partChip, telHref, smsHref, waHref, mailHref, mapLinks,
  toast, openSheet, sheetIsOpen, openLightbox, photoPicker,
} from './ui.js';

const $app = document.getElementById('app');
const state = {
  user: null,
  view: '',
  tab: sessionStorage.getItem('ff-tab') || 'today',
  staffFilter: 'all',
  q: '',
  partsTab: 'requested',
};
const isAdmin = () => state.user?.role === 'admin';
const go = (hash) => { location.hash = hash; };
const firstNameOf = (n = '') => (/\s\d+$/.test(n) ? n : n.split(' ')[0]);

/* ── Boot ─────────────────────────────────────────────────── */
async function boot() {
  try { state.user = await api.session(); } catch (e) { console.error(e); }
  window.addEventListener('hashchange', route);
  api.onChange(() => {
    if (['jobs', 'job', 'parts'].includes(state.view) && !sheetIsOpen()) route();
  });
  route();
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
}

async function route() {
  const [view = 'jobs', id] = location.hash.replace(/^#\/?/, '').split('/');
  if (!state.user) { state.view = 'login'; return renderLogin(); }
  state.view = view;
  window.scrollTo(0, 0);
  try {
    if (view === 'job' && id) return await renderJob(id);
    if (view === 'new' && isAdmin()) return await renderForm();
    if (view === 'edit' && id && isAdmin()) return await renderForm(id);
    if (view === 'parts' && isAdmin()) return await renderParts();
    if (view === 'me') return await renderMe();
    state.view = 'jobs';
    return await renderJobs();
  } catch (e) {
    console.error(e);
    $app.innerHTML = page(`<div class="empty">${icon('alert', 40)}<h3>Something went wrong</h3><p>${esc(e.message || e)}</p>
      <button class="btn btn-primary" onclick="location.reload()">Try again</button></div>`);
  }
}

/* ── Layout helpers ───────────────────────────────────────── */
function nav() {
  const v = state.view;
  const item = (hash, ic, label, active) =>
    `<a href="${hash}" class="nav-item ${active ? 'active' : ''}">${icon(ic, 22)}<span>${label}</span></a>`;
  return `<nav class="bottom-nav">
    ${item('#/jobs', 'jobs', 'Jobs', v === 'jobs' || v === 'job')}
    ${isAdmin() ? `<a href="#/new" class="nav-fab" aria-label="New job">${icon('plus', 26)}</a>` : ''}
    ${isAdmin() ? item('#/parts', 'package', 'Parts', v === 'parts') : ''}
    ${item('#/me', 'user', 'Profile', v === 'me')}
  </nav>`;
}
const page = (inner, { withNav = true } = {}) =>
  `${MODE === 'demo' ? `<div class="demo-bar">Demo mode · data saved on this device only</div>` : ''}
   <div class="page">${inner}</div>${withNav ? nav() : ''}`;
const topbar = (title, { back, right = '' } = {}) =>
  `<header class="topbar">
     ${back ? `<a class="icon-btn" href="${back}" aria-label="Back">${icon('back', 24)}</a>` : '<span></span>'}
     <h1>${title}</h1>
     <div class="topbar-right">${right}</div>
   </header>`;
const skeleton = () => page(`<div class="skel-list">${'<div class="skel"></div>'.repeat(4)}</div>`);
const avatar = (name, cls = '') => `<span class="avatar ${cls}" title="${esc(name || 'Unassigned')}">${esc(name ? initials(name) : '–')}</span>`;

/* ── Login ────────────────────────────────────────────────── */
async function renderLogin() {
  const brand = `<div class="brand"><div class="logo">${icon('wrench', 30)}</div>
    <h1>${esc(CONFIG.APP_NAME)}</h1><p>Maintenance jobs, sorted.</p></div>`;

  if (MODE === 'demo') {
    const users = await api.listStaff();
    $app.innerHTML = `<div class="login">${brand}
      <div class="card login-card">
        <h2>Choose a demo user</h2>
        <p class="muted">Try the app as the manager (creates jobs) or as a staff member (does the jobs).</p>
        <div class="user-pick">
          ${users.map((u) => `<button class="user-row" data-id="${esc(u.id)}">${avatar(u.name, u.role === 'admin' ? 'av-admin' : '')}
            <span><strong>${esc(u.name)}</strong><small>${u.role === 'admin' ? 'Manager · admin' : 'Staff'}</small></span>${icon('chevron')}</button>`).join('')}
        </div>
      </div></div>`;
    $app.querySelectorAll('.user-row').forEach((b) => b.onclick = async () => {
      state.user = await api.signInAs(b.dataset.id);
      go('#/jobs'); route();
    });
    return;
  }

  $app.innerHTML = `<div class="login">${brand}
    <form class="card login-card" id="login">
      <h2>Sign in</h2>
      <label class="field"><span>Email</span><input type="email" name="email" autocomplete="email" required></label>
      <label class="field"><span>Password</span><input type="password" name="password" autocomplete="current-password" required></label>
      <button class="btn btn-primary btn-block" type="submit">Sign in</button>
      <button class="btn btn-link" type="button" id="forgot">Forgot password?</button>
    </form></div>`;
  const f = $app.querySelector('#login');
  f.onsubmit = async (e) => {
    e.preventDefault();
    const btn = f.querySelector('[type=submit]');
    btn.disabled = true; btn.textContent = 'Signing in…';
    try {
      state.user = await api.signIn(f.email.value.trim(), f.password.value);
      go('#/jobs'); route();
    } catch (err) {
      toast(err.message || 'Sign in failed', 'err');
      btn.disabled = false; btn.textContent = 'Sign in';
    }
  };
  $app.querySelector('#forgot').onclick = async () => {
    const email = f.email.value.trim();
    if (!email) return toast('Type your email first', 'err');
    try { await api.resetPassword(email); toast('Password reset email sent'); } catch (err) { toast(err.message, 'err'); }
  };
}

/* ── Jobs list ────────────────────────────────────────────── */
async function renderJobs() {
  if (!$app.querySelector('.jobs-view')) $app.innerHTML = skeleton();
  const [jobs, staff] = await Promise.all([api.listJobs(), api.listStaff()]);
  const t = todayISO();
  const open = (j) => j.status !== 'completed';
  const byTime = (a, b) => (a.scheduled_date + (a.start_time || '')).localeCompare(b.scheduled_date + (b.start_time || ''));

  let pool = jobs;
  if (state.staffFilter !== 'all') pool = pool.filter((j) => (j.assigned_to || 'none') === state.staffFilter);
  const q = state.q.toLowerCase();
  if (q) pool = pool.filter((j) => [j.title, j.address, j.tenant_name, j.client, j.description, '#' + j.id].join(' ').toLowerCase().includes(q));

  const tabs = {
    overdue: pool.filter((j) => open(j) && j.scheduled_date < t).sort(byTime),
    today: pool.filter((j) => j.scheduled_date === t).sort(byTime),
    upcoming: pool.filter((j) => open(j) && j.scheduled_date > t).sort(byTime),
    done: pool.filter((j) => !open(j)).sort((a, b) => (b.completed_at || '').localeCompare(a.completed_at || '')),
  };
  const list = tabs[state.tab] || tabs.today;
  const openToday = tabs.today.filter(open).length;
  const mineToday = tabs.today.filter((j) => open(j) && j.assigned_to === state.user.id).length;

  const groups = [];
  for (const j of list) {
    const key = state.tab === 'done' ? (j.completed_at || '').slice(0, 10) || j.scheduled_date : j.scheduled_date;
    let g = groups.find((x) => x.key === key);
    if (!g) groups.push((g = { key, items: [] }));
    g.items.push(j);
  }

  const emptyMsg = {
    overdue: ['Nothing overdue', 'Great work – every past job is closed.'],
    today: ['No jobs for today', 'Enjoy the quiet, or check Upcoming.'],
    upcoming: ['Nothing upcoming', 'New jobs will appear here.'],
    done: ['No completed jobs yet', 'Finished jobs will show up here.'],
  }[state.tab];

  $app.innerHTML = page(`
    <div class="jobs-view">
      <header class="hero">
        <div>
          <p class="hero-date">${esc(fmtDayLong(t))}</p>
          <h1>${greeting()}, ${esc(firstNameOf(state.user.name))}</h1>
          <p class="hero-sub">${openToday ? `<strong>${openToday}</strong> open job${openToday > 1 ? 's' : ''} today${!isAdmin() ? ` · <strong>${mineToday}</strong> yours` : ''}` : 'No open jobs today'}${tabs.overdue.length ? ` · <span class="txt-warn">${tabs.overdue.length} overdue</span>` : ''}</p>
        </div>
        ${avatar(state.user.name, isAdmin() ? 'av-admin av-lg' : 'av-lg')}
      </header>

      <div class="toolbar">
        <label class="search">${icon('search', 18)}<input type="search" placeholder="Search jobs…" value="${esc(state.q)}"></label>
        <select class="select-sm" id="staffFilter" aria-label="Filter by person">
          <option value="all">Everyone</option>
          <option value="${esc(state.user.id)}" ${state.staffFilter === state.user.id ? 'selected' : ''}>My jobs</option>
          ${staff.filter((s) => s.id !== state.user.id).map((s) => `<option value="${esc(s.id)}" ${state.staffFilter === s.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}
          <option value="none" ${state.staffFilter === 'none' ? 'selected' : ''}>Unassigned</option>
        </select>
      </div>

      <div class="tabs" role="tablist">
        ${[['overdue', 'Overdue'], ['today', 'Today'], ['upcoming', 'Upcoming'], ['done', 'Done']].map(([k, l]) =>
          `<button role="tab" class="tab ${state.tab === k ? 'active' : ''} ${k === 'overdue' && tabs.overdue.length ? 'has-alert' : ''}" data-tab="${k}">
             ${l}${k !== 'done' ? `<span class="count">${tabs[k].length}</span>` : ''}</button>`).join('')}
      </div>

      <div class="job-list">
        ${list.length ? groups.map((g) => `
          ${state.tab !== 'today' ? `<h2 class="group-title">${esc(state.tab === 'done' ? 'Completed · ' + relDay(g.key) : relDay(g.key))}</h2>` : ''}
          ${g.items.map(jobCard).join('')}`).join('')
        : `<div class="empty">${icon(state.tab === 'overdue' ? 'checkCircle' : 'calendar', 44)}<h3>${emptyMsg[0]}</h3><p>${emptyMsg[1]}</p>
             ${isAdmin() && state.tab !== 'done' ? `<a class="btn btn-primary" href="#/new">${icon('plus', 18)} New job</a>` : ''}</div>`}
      </div>
    </div>`);

  $app.querySelectorAll('[data-tab]').forEach((b) => b.onclick = () => {
    state.tab = b.dataset.tab; sessionStorage.setItem('ff-tab', state.tab); renderJobs();
  });
  const s = $app.querySelector('.search input');
  s.oninput = () => {
    state.q = s.value;
    clearTimeout(s._t);
    s._t = setTimeout(async () => { await renderJobs(); const n = $app.querySelector('.search input'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 250);
  };
  const sf = $app.querySelector('#staffFilter');
  if (sf) sf.onchange = () => { state.staffFilter = sf.value; renderJobs(); };
  bindCardActions($app);
}

function jobCard(j) {
  return `<article class="job-card ${STATUS[j.status]?.cls || ''}" data-href="#/job/${j.id}" tabindex="0">
    <div class="jc-row">
      <span class="jc-time">${icon('clock', 15)} ${esc(fmtWindow(j))}</span>
      ${statusChip(j.status)}
    </div>
    <h3>${esc(j.title)}</h3>
    <p class="jc-meta"><span class="num">#${j.id}</span>${j.tenant_name ? ` · ${esc(j.tenant_name)}` : ''}${j.client ? ` · ${esc(j.client)}` : ''}</p>
    <p class="jc-addr">${icon('pin', 15)} <span>${esc(j.address)}</span></p>
    <div class="jc-foot">
      <span class="jc-assignee ${j.assigned_to === state.user.id ? 'is-me' : ''}">${avatar(j.assignee_name, 'av-sm')} ${j.assigned_to === state.user.id ? 'You' : esc(j.assignee_name || 'Unassigned')}</span>
      <span class="jc-actions">
        <button class="pill" data-directions="${esc(j.address)}">${icon('nav', 15)} Directions</button>
        ${j.tenant_phone ? `<a class="pill" href="${telHref(j.tenant_phone)}" data-stop>${icon('phone', 15)} Call</a>` : ''}
      </span>
    </div>
  </article>`;
}

function bindCardActions(root) {
  root.querySelectorAll('.job-card').forEach((c) => {
    c.onclick = (e) => {
      if (e.target.closest('[data-stop]')) return;
      const d = e.target.closest('[data-directions]');
      if (d) { e.stopPropagation(); return directionsSheet(d.dataset.directions); }
      go(c.dataset.href);
    };
    c.onkeydown = (e) => { if (e.key === 'Enter') go(c.dataset.href); };
  });
}

function directionsSheet(address) {
  const m = mapLinks(address);
  openSheet('Get directions', `
    <p class="muted addr-line">${icon('pin', 16)} ${esc(address)}</p>
    <div class="option-list">
      <a class="option" href="${m.google}" target="_blank" rel="noopener"><span class="opt-ic g">G</span>Google Maps${icon('chevron')}</a>
      <a class="option" href="${m.apple}" target="_blank" rel="noopener"><span class="opt-ic a">${icon('nav', 18)}</span>Apple Maps${icon('chevron')}</a>
      <a class="option" href="${m.waze}" target="_blank" rel="noopener"><span class="opt-ic w">W</span>Waze${icon('chevron')}</a>
    </div>
    <button class="btn btn-ghost btn-block" id="copyAddr">Copy address</button>`).el.querySelector('#copyAddr').onclick = async () => {
    try { await navigator.clipboard.writeText(address); toast('Address copied'); } catch { toast('Could not copy', 'err'); }
  };
}

/* ── Job detail ───────────────────────────────────────────── */
async function renderJob(id) {
  if (!$app.querySelector(`[data-job="${id}"]`)) $app.innerHTML = skeleton();
  const j = await api.getJob(id);
  if (!j) {
    $app.innerHTML = page(`${topbar('Job', { back: '#/jobs' })}<div class="empty">${icon('alert', 40)}<h3>Job not found</h3><p>It may have been deleted.</p></div>`);
    return;
  }
  const m = mapLinks(j.address);
  const done = j.status === 'completed';
  const step = { scheduled: 0, on_the_way: 1, in_progress: 2, on_hold: 2, completed: 3 }[j.status] || 0;
  const firstName = firstNameOf(state.user.name);

  const actions = done
    ? `<div class="done-banner">${icon('checkCircle', 22)}<div><strong>Job completed</strong><small>${j.completed_at ? fmtStamp(j.completed_at) : ''}</small></div>
         ${isAdmin() ? `<button class="btn btn-sm btn-ghost" id="reopen">${icon('reopen', 16)} Reopen</button>` : ''}</div>`
    : `<div class="action-bar">
        <button class="act ${step >= 1 ? 'done' : ''} ${step === 1 ? 'current' : ''}" id="actWay">${icon('car', 20)}<span>On my way</span></button>
        <button class="act ${step >= 2 ? 'done' : ''} ${step === 2 ? 'current' : ''}" id="actStart">${icon(j.status === 'on_hold' ? 'reopen' : 'play', 20)}<span>${j.status === 'on_hold' ? 'Resume' : 'Start'}</span></button>
        <button class="act act-finish" id="actFinish">${icon('check', 20)}<span>Finish</span></button>
      </div>`;

  const photos = (urls, cls = '') => urls?.length
    ? `<div class="photo-grid ${cls}">${urls.map((u, i) => `<button class="thumb" data-lb="${i}"><img src="${esc(u)}" alt="" loading="lazy"></button>`).join('')}</div>` : '';

  $app.innerHTML = page(`
    <div data-job="${j.id}">
    ${topbar(`#${j.id}`, {
      back: '#/jobs',
      right: isAdmin() ? `<a class="icon-btn" href="#/edit/${j.id}" aria-label="Edit">${icon('edit', 20)}</a>
                          <button class="icon-btn danger" id="delJob" aria-label="Delete">${icon('trash', 20)}</button>` : '',
    })}

    ${actions}

    <div class="map-wrap">
      <iframe src="${m.embed}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="Map"></iframe>
      <button class="map-overlay" data-directions="${esc(j.address)}" aria-label="Directions"></button>
    </div>
    <div class="addr-bar">
      <span>${icon('pin', 18)} ${esc(j.address)}</span>
      <button class="btn btn-sm btn-primary" data-directions="${esc(j.address)}">${icon('nav', 16)} Directions</button>
    </div>

    <section class="detail-head">
      <div class="row-between">${statusChip(j.status)}${j.scheduled_date < todayISO() && !done ? '<span class="chip st-overdue">Overdue</span>' : ''}</div>
      <h1>${esc(j.title)}</h1>
      <p class="when">${icon('calendar', 16)} ${esc(fmtDayLong(j.scheduled_date))} &nbsp;·&nbsp; ${icon('clock', 16)} ${esc(fmtWindow(j))}</p>
      <p class="when">${icon('user', 16)} ${esc(j.assignee_name || 'Unassigned')}</p>
    </section>

    ${j.description ? `<section class="card"><h3 class="card-title">${icon('note', 18)} Description</h3><p class="prewrap">${esc(j.description)}</p></section>` : ''}

    ${j.photo_urls?.length ? `<section class="card"><h3 class="card-title">${icon('image', 18)} Attachments <span class="muted">(${j.photo_urls.length})</span></h3>${photos(j.photo_urls, 'job-photos')}</section>` : ''}

    <section class="card contact">
      <div class="contact-head">
        ${avatar(j.tenant_name, 'av-lg av-tenant')}
        <div><strong>${esc(j.tenant_name || 'No tenant name')}</strong><small>${icon('building', 14)} ${esc(j.client || 'Tenant')}</small></div>
      </div>
      ${j.tenant_phone || j.tenant_email ? `<p class="muted small">${esc(j.tenant_phone || '')}${j.tenant_phone && j.tenant_email ? ' · ' : ''}${esc(j.tenant_email || '')}</p>` : ''}
      <div class="contact-actions">
        ${contactBtn(j.tenant_phone && telHref(j.tenant_phone), 'phone', 'Call')}
        ${contactBtn(j.tenant_phone && smsHref(j.tenant_phone), 'sms', 'SMS')}
        ${contactBtn(j.tenant_phone && waHref(j.tenant_phone), 'wa', 'WhatsApp', true)}
        ${contactBtn(j.tenant_email && mailHref(j.tenant_email, `Job #${j.id} – ${j.title}`), 'mail', 'Email')}
      </div>
    </section>

    <section class="card">
      <div class="row-between"><h3 class="card-title">${icon('package', 18)} Parts</h3>
        ${!done ? `<button class="btn btn-sm btn-ghost" id="addPart">${icon('plus', 16)} Request part</button>` : ''}</div>
      ${j.parts.length ? `<ul class="parts">${j.parts.map((p) => `
        <li><div><span><strong>${esc(p.description)}</strong> <span class="muted">× ${esc(p.qty)}</span></span>
          <small>${esc(p.requester_name || '')} · ${fmtStamp(p.created_at)}${p.notes ? ' · ' + esc(p.notes) : ''}</small></div>
          ${isAdmin() ? partSelect(p) : partChip(p.status)}</li>`).join('')}</ul>`
        : '<p class="muted small">No parts requested.</p>'}
    </section>

    <section class="card">
      <h3 class="card-title">${icon('clock', 18)} Activity</h3>
      <ol class="timeline">
        ${j.updates.map((u, ui) => `
          <li class="tl-${esc(u.kind)}">
            <span class="tl-dot"></span>
            <div class="tl-body">
              <p class="tl-head"><strong>${esc(u.author_name || 'Someone')}</strong> ${activityText(u)}</p>
              ${u.message ? `<p class="prewrap">${esc(u.message)}</p>` : ''}
              ${u.photo_urls?.length ? `<div class="photo-grid sm" data-upd="${ui}">${u.photo_urls.map((p, i) => `<button class="thumb" data-lbu="${ui}:${i}"><img src="${esc(p)}" alt="" loading="lazy"></button>`).join('')}</div>` : ''}
              <time>${fmtStamp(u.created_at)}</time>
            </div>
          </li>`).join('') || '<li class="muted small">No activity yet.</li>'}
      </ol>
    </section>

    <div class="bottom-space"></div>
    <button class="fab-note" id="addNote">${icon('camera', 20)} Add note / photos</button>
    </div>`);

  // events
  $app.querySelectorAll('[data-directions]').forEach((b) => b.onclick = () => directionsSheet(b.dataset.directions));
  $app.querySelectorAll('[data-lb]').forEach((b) => b.onclick = () => openLightbox(j.photo_urls, +b.dataset.lb));
  $app.querySelectorAll('[data-lbu]').forEach((b) => b.onclick = () => {
    const [ui, i] = b.dataset.lbu.split(':').map(Number);
    openLightbox(j.updates[ui].photo_urls, i);
  });
  $app.querySelectorAll('.part-select').forEach((s) => s.onchange = async () => {
    await api.updatePart(s.dataset.id, { status: s.value }); toast('Part updated');
  });
  $app.querySelector('#addNote').onclick = () => noteSheet(j);
  $app.querySelector('#addPart')?.addEventListener('click', () => partSheet(j));
  $app.querySelector('#delJob')?.addEventListener('click', async () => {
    if (!confirm(`Delete job #${j.id} "${j.title}"? This cannot be undone.`)) return;
    await api.deleteJob(j.id); toast('Job deleted'); go('#/jobs');
  });
  $app.querySelector('#reopen')?.addEventListener('click', async () => {
    await api.addUpdate(j.id, { kind: 'status', status: 'scheduled', message: 'Job reopened' });
    toast('Job reopened'); renderJob(j.id);
  });
  $app.querySelector('#actWay')?.addEventListener('click', async () => {
    if (j.status !== 'on_the_way') await api.addUpdate(j.id, { kind: 'status', status: 'on_the_way' });
    renderJob(j.id);
    if (j.tenant_phone) {
      const msg = `Hi ${(j.tenant_name || '').split(' ')[0] || 'there'}, this is ${firstName} from ${CONFIG.COMPANY_NAME}. I'm on my way to ${j.address} for the "${j.title}" job. See you soon!`;
      openSheet('Let the tenant know?', `
        <p class="muted">Send a quick message so they're ready for you.</p>
        <div class="quote">${esc(msg)}</div>
        <div class="btn-row">
          <a class="btn btn-primary" href="${smsHref(j.tenant_phone, msg)}" data-close>${icon('sms', 18)} SMS</a>
          <a class="btn btn-wa" href="${waHref(j.tenant_phone, msg)}" target="_blank" rel="noopener" data-close>${icon('wa', 18)} WhatsApp</a>
        </div>
        <button class="btn btn-ghost btn-block" data-close>Skip</button>`);
    } else toast('Status: on the way');
  });
  $app.querySelector('#actStart')?.addEventListener('click', async () => {
    if (j.status !== 'in_progress') await api.addUpdate(j.id, { kind: 'status', status: 'in_progress', message: j.status === 'on_hold' ? 'Work resumed' : '' });
    toast('Job started'); renderJob(j.id);
  });
  $app.querySelector('#actFinish')?.addEventListener('click', () => finishSheet(j));
}

const contactBtn = (href, ic, label, blank = false) => href
  ? `<a class="contact-btn" href="${href}" ${blank ? 'target="_blank" rel="noopener"' : ''}>${icon(ic, 22)}<span>${label}</span></a>`
  : `<span class="contact-btn disabled">${icon(ic, 22)}<span>${label}</span></span>`;

const partSelect = (p) => `<select class="select-sm part-select ${PART_STATUS[p.status]?.cls}" data-id="${esc(p.id)}">
  ${Object.entries(PART_STATUS).map(([k, v]) => `<option value="${k}" ${p.status === k ? 'selected' : ''}>${v.label}</option>`).join('')}</select>`;

function activityText(u) {
  switch (u.kind) {
    case 'created': return 'created the job';
    case 'completed': return `<span class="txt-ok">marked it as resolved ✓</span>`;
    case 'kept_open': return `<span class="txt-warn">kept the job open</span>`;
    case 'note': return 'added a note';
    case 'status': return `changed status to <strong>${esc(STATUS[u.status]?.label || u.status)}</strong>`;
    default: return '';
  }
}

/* ── Sheets: note / part / finish ─────────────────────────── */
async function busy(btn, fn) {
  const txt = btn.innerHTML;
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Saving…';
  try { await fn(); } catch (e) { console.error(e); toast(e.message || 'Could not save', 'err'); btn.disabled = false; btn.innerHTML = txt; }
}

function noteSheet(j) {
  const { el, close } = openSheet('Add note / photos', `
    <label class="field"><span>Note</span><textarea rows="4" id="noteMsg" placeholder="What did you find or do?"></textarea></label>
    <div id="notePics"></div>
    <button class="btn btn-primary btn-block" id="saveNote">Save</button>`);
  const pics = photoPicker(el.querySelector('#notePics'));
  el.querySelector('#saveNote').onclick = (e) => busy(e.currentTarget, async () => {
    const message = el.querySelector('#noteMsg').value.trim();
    const files = pics();
    if (!message && !files.length) throw new Error('Write a note or add a photo');
    await api.addUpdate(j.id, { kind: 'note', message, files });
    close(); toast('Note added'); renderJob(j.id);
  });
}

function partSheet(j) {
  const { el, close } = openSheet('Request a part', `
    <label class="field"><span>Part / material</span><input id="pDesc" placeholder="e.g. Tap cartridge 35mm"></label>
    <div class="grid-2">
      <label class="field"><span>Quantity</span><input id="pQty" type="number" min="1" value="1" inputmode="numeric"></label>
      <label class="field"><span>Notes</span><input id="pNotes" placeholder="Brand, size, shop…"></label>
    </div>
    <button class="btn btn-primary btn-block" id="savePart">${icon('package', 18)} Request part</button>`);
  el.querySelector('#savePart').onclick = (e) => busy(e.currentTarget, async () => {
    const description = el.querySelector('#pDesc').value.trim();
    if (!description) throw new Error('Describe the part');
    await api.addPart(j.id, { description, qty: Number(el.querySelector('#pQty').value) || 1, notes: el.querySelector('#pNotes').value.trim() });
    close(); toast('Part requested'); renderJob(j.id);
  });
}

function finishSheet(j) {
  const { el, close } = openSheet('Finish job', `
    <p class="muted">Was the problem fixed?</p>
    <div class="choice">
      <label class="choice-opt ok"><input type="radio" name="res" value="yes" checked>${icon('checkCircle', 26)}<strong>Resolved</strong><small>Close the job</small></label>
      <label class="choice-opt hold"><input type="radio" name="res" value="no">${icon('pause', 26)}<strong>Not resolved</strong><small>Keep it open</small></label>
    </div>
    <label class="field"><span id="noteLbl">What was done?</span><textarea rows="3" id="finMsg" placeholder="Short summary for the office"></textarea></label>
    <div id="finPics"></div>
    <div id="partsBox" hidden>
      <div class="row-between"><span class="field-label">Parts needed</span><button type="button" class="btn btn-sm btn-ghost" id="addRow">${icon('plus', 16)} Add part</button></div>
      <div id="partRows"></div>
    </div>
    <button class="btn btn-success btn-block" id="saveFin">${icon('check', 18)} Complete job</button>`);
  const pics = photoPicker(el.querySelector('#finPics'), { label: 'Photos' });
  const rows = el.querySelector('#partRows');
  const addRow = () => {
    const r = document.createElement('div');
    r.className = 'part-row';
    r.innerHTML = `<input placeholder="Part / material" class="pr-desc"><input type="number" min="1" value="1" class="pr-qty" inputmode="numeric"><button type="button" class="icon-btn" aria-label="Remove">${icon('x', 16)}</button>`;
    r.querySelector('button').onclick = () => r.remove();
    rows.appendChild(r);
  };
  el.querySelector('#addRow').onclick = addRow;
  const sync = () => {
    const resolved = el.querySelector('[name=res]:checked').value === 'yes';
    el.querySelector('#partsBox').hidden = resolved;
    el.querySelector('#noteLbl').textContent = resolved ? 'What was done?' : 'Why is it still open?';
    const b = el.querySelector('#saveFin');
    b.className = `btn btn-block ${resolved ? 'btn-success' : 'btn-warn'}`;
    b.innerHTML = resolved ? `${icon('check', 18)} Complete job` : `${icon('pause', 18)} Keep job open`;
    if (!resolved && !rows.children.length) addRow();
  };
  el.querySelectorAll('[name=res]').forEach((r) => r.onchange = sync);

  el.querySelector('#saveFin').onclick = (e) => busy(e.currentTarget, async () => {
    const resolved = el.querySelector('[name=res]:checked').value === 'yes';
    const message = el.querySelector('#finMsg').value.trim();
    const files = pics();
    if (resolved && CONFIG.REQUIRE_PHOTO_ON_FINISH && !files.length) throw new Error('Add at least one photo of the finished work');
    if (!resolved && !message) throw new Error('Explain why the job is still open');
    const parts = [...rows.querySelectorAll('.part-row')]
      .map((r) => ({ description: r.querySelector('.pr-desc').value.trim(), qty: Number(r.querySelector('.pr-qty').value) || 1 }))
      .filter((p) => p.description);
    await api.addUpdate(j.id, { kind: resolved ? 'completed' : 'kept_open', status: resolved ? 'completed' : 'on_hold', message, files });
    if (!resolved) for (const p of parts) await api.addPart(j.id, p);
    close();
    toast(resolved ? 'Job completed – nice work!' : 'Job kept open');
    resolved ? go('#/jobs') : renderJob(j.id);
  });
}

/* ── New / edit job (admin) ───────────────────────────────── */
async function renderForm(id) {
  $app.innerHTML = skeleton();
  const [staff, j] = await Promise.all([api.listStaff(), id ? api.getJob(id) : null]);
  const v = j || { scheduled_date: todayISO(), start_time: '09:00', end_time: '10:00' };
  const f = (k) => esc(v[k] ?? '');

  $app.innerHTML = page(`
    ${topbar(id ? `Edit #${id}` : 'New job', { back: id ? `#/job/${id}` : '#/jobs' })}
    <form class="form" id="jobForm">
      <section class="card">
        <h3 class="card-title">${icon('wrench', 18)} The job</h3>
        <label class="field"><span>Title *</span><input name="title" required value="${f('title')}" placeholder="e.g. Shower seals & balcony door"></label>
        <label class="field"><span>Description</span><textarea name="description" rows="5" placeholder="What needs to be done? One item per line.">${f('description')}</textarea></label>
        <div id="jobPics"></div>
        ${j?.photo_urls?.length ? `<p class="muted small">${j.photo_urls.length} photo(s) already attached – new ones will be added.</p>` : ''}
      </section>

      <section class="card">
        <h3 class="card-title">${icon('calendar', 18)} When & who</h3>
        <label class="field"><span>Date *</span><input type="date" name="scheduled_date" required value="${f('scheduled_date')}"></label>
        <div class="grid-2">
          <label class="field"><span>From</span><input type="time" name="start_time" value="${esc(String(v.start_time || '').slice(0, 5))}"></label>
          <label class="field"><span>To</span><input type="time" name="end_time" value="${esc(String(v.end_time || '').slice(0, 5))}"></label>
        </div>
        <label class="field"><span>Assign to</span>
          <select name="assigned_to"><option value="">Unassigned</option>
            ${staff.map((s) => `<option value="${esc(s.id)}" ${v.assigned_to === s.id ? 'selected' : ''}>${esc(s.name)}${s.role === 'admin' ? ' (admin)' : ''}</option>`).join('')}
          </select></label>
      </section>

      <section class="card">
        <h3 class="card-title">${icon('pin', 18)} Property & tenant</h3>
        <label class="field"><span>Address / Eircode *</span><input name="address" required value="${f('address')}" placeholder="28 Example Court, Dublin 7, D07 XXXX" autocomplete="street-address"></label>
        <label class="field"><span>Client / landlord</span><input name="client" value="${f('client')}" placeholder="e.g. Liffey Lettings"></label>
        <label class="field"><span>Tenant name</span><input name="tenant_name" value="${f('tenant_name')}"></label>
        <div class="grid-2">
          <label class="field"><span>Phone</span><input type="tel" name="tenant_phone" value="${f('tenant_phone')}" inputmode="tel"></label>
          <label class="field"><span>Email</span><input type="email" name="tenant_email" value="${f('tenant_email')}"></label>
        </div>
      </section>

      <button class="btn btn-primary btn-block btn-lg" type="submit">${icon('check', 20)} ${id ? 'Save changes' : 'Create job'}</button>
      <div class="bottom-space"></div>
    </form>`);

  const pics = photoPicker($app.querySelector('#jobPics'), { label: 'Add photos' });
  const form = $app.querySelector('#jobForm');
  form.onsubmit = (e) => {
    e.preventDefault();
    busy(form.querySelector('[type=submit]'), async () => {
      const d = Object.fromEntries(new FormData(form));
      for (const k of Object.keys(d)) d[k] = d[k].trim() || null;
      d.assigned_to = d.assigned_to || null;
      if (id) { await api.updateJob(id, d, pics()); toast('Job updated'); go(`#/job/${id}`); }
      else { const newId = await api.createJob(d, pics()); toast(`Job #${newId} created`); go(`#/job/${newId}`); }
    });
  };
}

/* ── Parts (admin) ────────────────────────────────────────── */
async function renderParts() {
  if (!$app.querySelector('.parts-view')) $app.innerHTML = skeleton();
  const parts = await api.listParts();
  const by = (s) => parts.filter((p) => p.status === s);
  const list = by(state.partsTab);
  $app.innerHTML = page(`
    <div class="parts-view">
    ${topbar('Parts & materials')}
    <div class="tabs">
      ${Object.entries(PART_STATUS).map(([k, v]) => `<button class="tab ${state.partsTab === k ? 'active' : ''}" data-ptab="${k}">${v.label}<span class="count">${by(k).length}</span></button>`).join('')}
    </div>
    <div class="job-list">
      ${list.length ? list.map((p) => `
        <article class="card part-card">
          <div class="row-between"><strong>${esc(p.description)} <span class="muted">× ${esc(p.qty)}</span></strong>${partSelect(p)}</div>
          ${p.notes ? `<p class="small">${esc(p.notes)}</p>` : ''}
          ${p.job ? `<a class="part-job" href="#/job/${p.job.id}">${icon('wrench', 15)} #${p.job.id} · ${esc(p.job.title)}${icon('chevron', 16)}</a>` : ''}
          <p class="muted small">${esc(p.requester_name || '')} · ${fmtStamp(p.created_at)}</p>
        </article>`).join('')
      : `<div class="empty">${icon('package', 44)}<h3>Nothing here</h3><p>Parts requested by staff will show up here.</p></div>`}
    </div></div>`);
  $app.querySelectorAll('[data-ptab]').forEach((b) => b.onclick = () => { state.partsTab = b.dataset.ptab; renderParts(); });
  $app.querySelectorAll('.part-select').forEach((s) => s.onchange = async () => {
    await api.updatePart(s.dataset.id, { status: s.value }); toast(`Marked as ${PART_STATUS[s.value].label.toLowerCase()}`); renderParts();
  });
}

/* ── Profile ──────────────────────────────────────────────── */
async function renderMe() {
  const u = state.user;
  const staff = isAdmin() ? await api.listStaff() : [];
  $app.innerHTML = page(`
    ${topbar('Profile')}
    <section class="card profile">
      ${avatar(u.name, `av-xl ${isAdmin() ? 'av-admin' : ''}`)}
      <h2>${esc(u.name)}</h2>
      <p class="muted">${esc(u.email || '')}</p>
      <span class="chip ${isAdmin() ? 'st-progress' : 'st-scheduled'}">${isAdmin() ? 'Manager · admin' : 'Staff'}</span>
    </section>

    ${isAdmin() ? `
    <section class="card">
      <h3 class="card-title">${icon('users', 18)} Team <span class="muted">(${staff.length})</span></h3>
      <ul class="team">${staff.map((s) => `<li>${avatar(s.name, s.role === 'admin' ? 'av-admin' : '')}<div><strong>${esc(s.name)}</strong><small>${esc(s.email || '')}</small></div>
        ${MODE === 'live' && s.id !== u.id ? `<select class="select-sm role-select" data-id="${esc(s.id)}"><option value="staff" ${s.role === 'staff' ? 'selected' : ''}>Staff</option><option value="admin" ${s.role === 'admin' ? 'selected' : ''}>Admin</option></select>`
          : `<span class="chip ${s.role === 'admin' ? 'st-progress' : 'st-scheduled'}">${s.role}</span>`}</li>`).join('')}</ul>
      ${MODE === 'demo' ? `
        <form class="add-staff" id="addStaff">
          <input name="name" placeholder="Name" required><input name="email" type="email" placeholder="Email">
          <button class="btn btn-sm btn-primary">${icon('plus', 16)} Add</button>
        </form>` : `<p class="muted small">To add a staff member: Supabase → Authentication → Users → <em>Add user</em> (email + password). They appear here automatically.</p>`}
    </section>` : ''}

    <section class="card">
      <h3 class="card-title">${icon('phone', 18)} Install on your phone</h3>
      <p class="small"><strong>iPhone:</strong> open in Safari → Share → <em>Add to Home Screen</em>.<br><strong>Android:</strong> Chrome menu ⋮ → <em>Install app</em>.</p>
    </section>

    <button class="btn btn-ghost btn-block danger" id="logout">${icon('logout', 18)} Sign out</button>
    ${MODE === 'demo' ? `<button class="btn btn-link btn-block" id="resetDemo">Reset demo data</button>` : ''}
    <p class="muted small center">${esc(CONFIG.APP_NAME)} · ${MODE === 'demo' ? 'demo mode' : 'connected'}</p>
    <div class="bottom-space"></div>`);

  $app.querySelector('#logout').onclick = async () => { await api.signOut(); state.user = null; go('#/'); route(); };
  $app.querySelector('#resetDemo')?.addEventListener('click', () => {
    if (confirm('Reset all demo data?')) { api.resetDemo(); state.user = null; go('#/'); location.reload(); }
  });
  $app.querySelectorAll('.role-select').forEach((s) => s.onchange = async () => {
    try { await api.setRole(s.dataset.id, s.value); toast('Role updated'); } catch (e) { toast(e.message, 'err'); }
  });
  const add = $app.querySelector('#addStaff');
  if (add) add.onsubmit = async (e) => {
    e.preventDefault();
    await api.addStaff({ name: add.name.value.trim(), email: add.email.value.trim() });
    toast('Staff added'); renderMe();
  };
}

boot();
