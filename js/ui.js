import { CONFIG } from './config.js';

// ── Text / dates ────────────────────────────────────────────
export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function todayISO(d = new Date()) {
  const z = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}
export function addDays(iso, n) {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return todayISO(d);
}
export const fmtDayLong = (iso) =>
  new Date(iso + 'T12:00:00').toLocaleDateString('en-IE', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
export const fmtDayShort = (iso) =>
  new Date(iso + 'T12:00:00').toLocaleDateString('en-IE', { weekday: 'short', day: 'numeric', month: 'short' });
export function relDay(iso) {
  const t = todayISO();
  if (iso === t) return 'Today';
  if (iso === addDays(t, 1)) return 'Tomorrow';
  if (iso === addDays(t, -1)) return 'Yesterday';
  return fmtDayShort(iso);
}
export const fmtTime = (t) => (t ? String(t).slice(0, 5) : '');
export const fmtWindow = (j) => (j.start_time ? `${fmtTime(j.start_time)}${j.end_time ? ' – ' + fmtTime(j.end_time) : ''}` : 'Any time');
export const fmtStamp = (ts) =>
  new Date(ts).toLocaleString('en-IE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
export function initials(name = '?') {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('') || '?';
}
export function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

// ── Status ──────────────────────────────────────────────────
export const STATUS = {
  scheduled: { label: 'Scheduled', cls: 'st-scheduled' },
  on_the_way: { label: 'On the way', cls: 'st-way' },
  in_progress: { label: 'In progress', cls: 'st-progress' },
  on_hold: { label: 'Kept open', cls: 'st-hold' },
  completed: { label: 'Completed', cls: 'st-done' },
};
export const statusChip = (s) => `<span class="chip ${STATUS[s]?.cls || ''}">${esc(STATUS[s]?.label || s)}</span>`;

export const PART_STATUS = {
  requested: { label: 'Requested', cls: 'st-hold' },
  ordered: { label: 'Ordered', cls: 'st-progress' },
  received: { label: 'Received', cls: 'st-done' },
};
export const partChip = (s) => `<span class="chip ${PART_STATUS[s]?.cls || ''}">${esc(PART_STATUS[s]?.label || s)}</span>`;

// ── Links: phone / maps ─────────────────────────────────────
const digits = (p) => String(p || '').replace(/[^\d+]/g, '');
export const telHref = (p) => `tel:${digits(p)}`;
export const smsHref = (p, body = '') => `sms:${digits(p)}${body ? `?&body=${encodeURIComponent(body)}` : ''}`;
export function waHref(p, text = '') {
  let d = digits(p).replace(/^\+/, '');
  if (d.startsWith('00')) d = d.slice(2);
  else if (d.startsWith('0')) d = CONFIG.COUNTRY_CODE + d.slice(1);
  return `https://wa.me/${d}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}
export const mailHref = (e, subject = '') => `mailto:${e}${subject ? `?subject=${encodeURIComponent(subject)}` : ''}`;
export function mapLinks(address) {
  const q = encodeURIComponent(address);
  return {
    google: `https://www.google.com/maps/dir/?api=1&destination=${q}`,
    apple: `https://maps.apple.com/?daddr=${q}`,
    waze: `https://waze.com/ul?q=${q}&navigate=yes`,
    embed: `https://www.google.com/maps?q=${q}&output=embed`,
  };
}

// ── Icons (Lucide, MIT) ─────────────────────────────────────
const P = {
  back: '<path d="m15 18-6-6 6-6"/>',
  chevron: '<path d="m9 18 6-6-6-6"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  checkCircle: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  nav: '<polygon points="3 11 22 2 13 21 11 13 3 11"/>',
  phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
  sms: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  wa: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
  mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
  camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  calendar: '<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  package: '<path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
  jobs: '<rect width="8" height="4" x="8" y="2" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/>',
  car: '<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>',
  play: '<polygon points="6 3 20 12 6 21 6 3"/>',
  pause: '<rect x="14" y="4" width="4" height="16" rx="1"/><rect x="6" y="4" width="4" height="16" rx="1"/>',
  edit: '<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/>',
  trash: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>',
  wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
  alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  image: '<rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>',
  reopen: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
  note: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/>',
  building: '<rect width="16" height="20" x="4" y="2" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/>',
};
export const icon = (n, s = 20) =>
  `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n] || ''}</svg>`;

// ── Toast ───────────────────────────────────────────────────
export function toast(msg, type = 'ok') {
  let box = document.querySelector('.toasts');
  if (!box) {
    box = document.createElement('div');
    box.className = 'toasts';
    document.body.appendChild(box);
  }
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.innerHTML = `${icon(type === 'err' ? 'alert' : 'checkCircle', 18)}<span>${esc(msg)}</span>`;
  box.appendChild(t);
  setTimeout(() => t.classList.add('out'), 2600);
  setTimeout(() => t.remove(), 3000);
}

// ── Bottom sheet ────────────────────────────────────────────
export function openSheet(title, bodyHtml) {
  const wrap = document.createElement('div');
  wrap.className = 'sheet-backdrop';
  wrap.innerHTML = `
    <div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <div class="sheet-grip"></div>
      <div class="sheet-head"><h2>${esc(title)}</h2><button class="icon-btn" data-close aria-label="Close">${icon('x')}</button></div>
      <div class="sheet-body">${bodyHtml}</div>
    </div>`;
  document.body.appendChild(wrap);
  document.body.classList.add('no-scroll');
  requestAnimationFrame(() => wrap.classList.add('open'));
  const close = () => {
    wrap.classList.remove('open');
    document.body.classList.remove('no-scroll');
    setTimeout(() => wrap.remove(), 220);
  };
  wrap.addEventListener('click', (e) => {
    if (e.target === wrap || e.target.closest('[data-close]')) close();
  });
  return { el: wrap.querySelector('.sheet'), close };
}
export const sheetIsOpen = () => !!document.querySelector('.sheet-backdrop, .lightbox');

// ── Lightbox ────────────────────────────────────────────────
export function openLightbox(urls, index = 0) {
  let i = index;
  const lb = document.createElement('div');
  lb.className = 'lightbox';
  const draw = () => {
    lb.innerHTML = `
      <button class="lb-close" aria-label="Close">${icon('x', 26)}</button>
      <img src="${esc(urls[i])}" alt="Photo ${i + 1}">
      ${urls.length > 1 ? `<div class="lb-count">${i + 1} / ${urls.length}</div>
      <button class="lb-prev" aria-label="Previous">${icon('back', 30)}</button>
      <button class="lb-next" aria-label="Next">${icon('chevron', 30)}</button>` : ''}`;
  };
  draw();
  lb.addEventListener('click', (e) => {
    if (e.target.closest('.lb-prev')) { i = (i - 1 + urls.length) % urls.length; draw(); }
    else if (e.target.closest('.lb-next')) { i = (i + 1) % urls.length; draw(); }
    else if (e.target.tagName !== 'IMG') lb.remove();
  });
  document.body.appendChild(lb);
}

// ── Photo picker (returns getter for selected files) ───────
export function photoPicker(container, { label = 'Add photos' } = {}) {
  const files = [];
  container.innerHTML = `
    <div class="photo-grid picker">
      <label class="photo-add">
        ${icon('camera', 24)}<span>${esc(label)}</span>
        <input type="file" accept="image/*" multiple hidden>
      </label>
    </div>`;
  const grid = container.querySelector('.photo-grid');
  const add = grid.querySelector('.photo-add');
  const redraw = () => {
    grid.querySelectorAll('.thumb').forEach((t) => t.remove());
    files.forEach((f, idx) => {
      const d = document.createElement('div');
      d.className = 'thumb';
      d.innerHTML = `<img src="${f.preview}" alt=""><button type="button" class="thumb-x" aria-label="Remove">${icon('x', 14)}</button>`;
      d.querySelector('button').onclick = () => { URL.revokeObjectURL(f.preview); files.splice(idx, 1); redraw(); };
      grid.insertBefore(d, add);
    });
  };
  container.querySelector('input').addEventListener('change', (e) => {
    for (const f of e.target.files) { f.preview = URL.createObjectURL(f); files.push(f); }
    e.target.value = '';
    redraw();
  });
  return () => files.slice();
}

// ── Images ──────────────────────────────────────────────────
export function compressImage(file, max = 1600, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not process image'))), 'image/jpeg', quality);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Unsupported image')); };
    img.src = url;
  });
}
export const blobToDataURL = (blob) =>
  new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(blob); });
