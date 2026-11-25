// Data layer. Same interface for DEMO (localStorage) and SUPABASE (live).
import { CONFIG } from './config.js';
import { todayISO, addDays, compressImage, blobToDataURL } from './ui.js';

const LIVE = Boolean(CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY);
export const MODE = LIVE ? 'live' : 'demo';

const api = LIVE ? await createSupabaseApi() : createDemoApi();
export default api;

/* ════════════════════════════════════════════════════════════
   DEMO  – everything in localStorage, perfect for showing the boss
   ════════════════════════════════════════════════════════════ */
function createDemoApi() {
  const KEY = 'fixflow-demo-v4';
  const SESSION = 'fixflow-demo-session';
  const listeners = new Set();

  const load = () => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    const s = seed();
    save(s);
    return s;
  };
  const save = (db) => {
    try { localStorage.setItem(KEY, JSON.stringify(db)); }
    catch { throw new Error('Device storage is full – remove some demo photos or reset the demo.'); }
  };
  const emit = () => listeners.forEach((fn) => fn());
  window.addEventListener('storage', (e) => e.key === KEY && emit());

  const now = () => new Date().toISOString();
  const nameOf = (db, id) => db.users.find((u) => u.id === id)?.name || null;
  const me = () => {
    try {
      const s = JSON.parse(localStorage.getItem(SESSION));
      return s ? JSON.parse(localStorage.getItem(KEY)).users.find((u) => u.id === s.id) || null : null;
    } catch { return null; }
  };
  const canSee = (u) => Boolean(u); // whole team sees every job
  const toUrls = async (files = []) => {
    const out = [];
    for (const f of files) out.push(await blobToDataURL(await compressImage(f, 1000, 0.6)));
    return out;
  };
  const withNames = (db, j) => ({ ...j, assignee_name: nameOf(db, j.assigned_to), photo_urls: j.photos || [] });

  return {
    mode: 'demo',
    onChange(fn) { listeners.add(fn); },

    async session() {
      const s = me();
      if (!s) return null;
      return load().users.find((u) => u.id === s.id) || null;
    },
    async signInAs(userId) {
      const u = load().users.find((x) => x.id === userId);
      localStorage.setItem(SESSION, JSON.stringify({ id: u.id }));
      return u;
    },
    async signOut() { localStorage.removeItem(SESSION); },
    resetDemo() { localStorage.removeItem(KEY); localStorage.removeItem(SESSION); },

    async listStaff() { return load().users; },
    async addStaff({ name, email, role = 'staff' }) {
      const db = load();
      db.users.push({ id: 'u-' + Date.now(), name, email, role });
      save(db); emit();
    },

    async listJobs() {
      const db = load(); const u = me();
      return db.jobs.filter((j) => canSee(u, j)).map((j) => withNames(db, j));
    },
    async getJob(id) {
      const db = load(); const u = me();
      const j = db.jobs.find((x) => x.id === Number(id));
      if (!j || !canSee(u, j)) return null;
      return {
        ...withNames(db, j),
        updates: db.updates.filter((x) => x.job_id === j.id)
          .sort((a, b) => b.created_at.localeCompare(a.created_at))
          .map((x) => ({ ...x, author_name: nameOf(db, x.author_id), photo_urls: x.photos || [] })),
        parts: db.parts.filter((p) => p.job_id === j.id)
          .map((p) => ({ ...p, requester_name: nameOf(db, p.requested_by) })),
      };
    },
    async createJob(data, files = []) {
      const db = load();
      const id = ++db.seq;
      const photos = await toUrls(files);
      db.jobs.push({ id, status: 'scheduled', created_at: now(), created_by: me().id, ...data, photos });
      db.updates.push({ id: Date.now(), job_id: id, author_id: me().id, kind: 'created', message: '', photos: [], created_at: now() });
      save(db); emit();
      return id;
    },
    async updateJob(id, patch, files = []) {
      const db = load();
      const j = db.jobs.find((x) => x.id === Number(id));
      Object.assign(j, patch);
      if (files.length) j.photos = [...(j.photos || []), ...(await toUrls(files))];
      save(db); emit();
    },
    async deleteJob(id) {
      const db = load(); id = Number(id);
      db.jobs = db.jobs.filter((j) => j.id !== id);
      db.updates = db.updates.filter((x) => x.job_id !== id);
      db.parts = db.parts.filter((x) => x.job_id !== id);
      save(db); emit();
    },
    async addUpdate(jobId, { kind, message = '', files = [], status }) {
      const db = load(); jobId = Number(jobId);
      const photos = await toUrls(files);
      db.updates.push({ id: Date.now(), job_id: jobId, author_id: me().id, kind, message, status: status || null, photos, created_at: now() });
      if (status) {
        const j = db.jobs.find((x) => x.id === jobId);
        j.status = status;
        j.completed_at = status === 'completed' ? now() : null;
      }
      save(db); emit();
    },
    async addPart(jobId, { description, qty = 1, notes = '' }) {
      const db = load();
      db.parts.push({ id: Date.now() + Math.random(), job_id: Number(jobId), description, qty, notes, status: 'requested', requested_by: me().id, created_at: now() });
      save(db); emit();
    },
    async updatePart(id, patch) {
      const db = load();
      Object.assign(db.parts.find((p) => String(p.id) === String(id)), patch);
      save(db); emit();
    },
    async listParts() {
      const db = load();
      return db.parts.map((p) => {
        const j = db.jobs.find((x) => x.id === p.job_id);
        return { ...p, requester_name: nameOf(db, p.requested_by), job: j ? { id: j.id, title: j.title, address: j.address } : null };
      }).sort((a, b) => b.created_at.localeCompare(a.created_at));
    },
  };
}

function seed() {
  const t = todayISO();
  const ago = (h) => new Date(Date.now() - h * 3600e3).toISOString();
  const users = [
    { id: 'u-admin', name: 'Boss', email: 'boss@demo.ie', role: 'admin' },
    { id: 'u-1', name: 'Staff 1', email: 'staff1@demo.ie', role: 'staff' },
    { id: 'u-2', name: 'Staff 2', email: 'staff2@demo.ie', role: 'staff' },
  ];
  const J = (id, o) => ({ id, status: 'scheduled', photos: [], created_by: 'u-admin', created_at: ago(48), client: 'Liffey Lettings', tenant_email: '', ...o });
  const jobs = [
    J(1001, { title: 'Shower seals & balcony door seals', scheduled_date: t, start_time: '08:00', end_time: '09:00', assigned_to: 'u-1', status: 'in_progress',
      description: '1 – The shower seals need to be cut out and redone.\n2 – The seals are gone on the balcony door and the door itself is looking tired. We recommend sanding / painting it and replacing the seals. Top windows probably the same.',
      tenant_name: 'Maria Tenant', tenant_phone: '083 000 0001', address: '14 Manor Street, Stoneybatter, Dublin 7' }),
    J(1002, { title: 'Bathroom heater & shower holder', scheduled_date: t, start_time: '10:00', end_time: '11:00', assigned_to: 'u-1',
      description: 'Can you replace both please – the wall heater and the shower head holder. Thanks.',
      tenant_name: 'Filipe Tenant', tenant_phone: '083 000 0002', address: 'Parnell Road, Drimnagh, Dublin 12' }),
    J(1003, { title: 'Post box lock', scheduled_date: t, start_time: '12:00', end_time: '13:00', assigned_to: 'u-2',
      description: 'Post box lock is broken, tenant cannot open it. Replace lock and give 2 keys to tenant.',
      tenant_name: 'Ken Tenant', tenant_phone: '083 000 0003', tenant_email: 'ken@example.com', address: "Harold's Cross Road, Dublin 6W" }),
    J(1004, { title: 'ASAP – small list', scheduled_date: addDays(t, -2), start_time: '08:00', end_time: '09:00', assigned_to: 'u-1', status: 'on_hold',
      description: '- Kitchen tap dripping\n- Bedroom door handle loose\n- Smoke alarm beeping (battery)',
      tenant_name: 'Anna Tenant', tenant_phone: '083 000 0004', address: 'Castleforbes Square, North Dock, Dublin 1' }),
    J(1005, { title: 'Boiler losing pressure', scheduled_date: addDays(t, -1), start_time: '14:00', end_time: '15:00', assigned_to: 'u-2',
      description: 'Tenant reports boiler pressure drops to 0.5 every two days. Check for leaks, repressurise.',
      tenant_name: 'John Tenant', tenant_phone: '083 000 0005', address: 'Capel Street, Dublin 1' }),
    J(1006, { title: 'Extractor fan not working', scheduled_date: addDays(t, 1), start_time: '09:00', end_time: '10:00', assigned_to: 'u-1',
      description: 'Bathroom extractor fan stopped working. Check fuse / replace fan.',
      tenant_name: 'Sofia Tenant', tenant_phone: '083 000 0006', address: 'Rathmines Road Lower, Dublin 6' }),
    J(1007, { title: 'Repaint hallway after leak', scheduled_date: addDays(t, 3), start_time: '08:00', end_time: '12:00', assigned_to: 'u-2',
      description: 'Ceiling stain in hallway after upstairs leak (fixed). Stain block + 2 coats.',
      tenant_name: 'Liam Tenant', tenant_phone: '083 000 0007', address: 'Phibsborough Road, Dublin 7' }),
    J(1008, { title: 'Replace kitchen hinge', scheduled_date: addDays(t, -3), start_time: '11:00', end_time: '12:00', assigned_to: 'u-1', status: 'completed', completed_at: ago(70),
      description: 'Kitchen cupboard door hanging off. Replace hinge.',
      tenant_name: 'Emma Tenant', tenant_phone: '083 000 0008', address: 'Thomas Street, Dublin 8' }),
  ];
  const updates = [
    { id: 1, job_id: 1004, author_id: 'u-1', kind: 'kept_open', status: 'on_hold', message: 'Fixed the door handle and smoke alarm. Tap needs a new cartridge – ordered.', photos: [], created_at: ago(30) },
    { id: 2, job_id: 1001, author_id: 'u-1', kind: 'status', status: 'in_progress', message: '', photos: [], created_at: ago(1) },
    { id: 3, job_id: 1008, author_id: 'u-1', kind: 'completed', status: 'completed', message: 'New soft-close hinge fitted, door aligned.', photos: [], created_at: ago(70) },
  ];
  const parts = [
    { id: 1, job_id: 1004, description: 'Kitchen tap cartridge 35mm', qty: 1, notes: 'Grohe – photo of old one in job', status: 'requested', requested_by: 'u-1', created_at: ago(30) },
  ];
  return { seq: 1008, users, jobs, updates, parts };
}

/* ════════════════════════════════════════════════════════════
   LIVE  – Supabase (auth + Postgres + Storage + Realtime)
   ════════════════════════════════════════════════════════════ */
async function createSupabaseApi() {
  const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm');
  const sb = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
  const BUCKET = 'job-photos';
  const must = ({ data, error }) => { if (error) throw error; return data; };
  let current = null;

  const toUser = (p) => ({ id: p.id, name: p.full_name || p.email, email: p.email, role: p.role, phone: p.phone });

  async function upload(jobId, files = []) {
    const paths = [];
    for (const f of files) {
      const blob = await compressImage(f, 1600, 0.8);
      const path = `${jobId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
      must(await sb.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg' }));
      paths.push(path);
    }
    return paths;
  }
  async function signAll(paths) {
    const uniq = [...new Set(paths.filter(Boolean))];
    if (!uniq.length) return {};
    const data = must(await sb.storage.from(BUCKET).createSignedUrls(uniq, 3600));
    return Object.fromEntries(data.map((d) => [d.path, d.signedUrl]));
  }
  const JOB_SELECT = '*, assignee:profiles!jobs_assigned_to_fkey(full_name)';
  const mapJob = (j) => ({ ...j, assignee_name: j.assignee?.full_name || null });

  return {
    mode: 'live',
    onChange(fn) {
      let t;
      const debounced = () => { clearTimeout(t); t = setTimeout(fn, 400); };
      sb.channel('fixflow')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, debounced)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'job_updates' }, debounced)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'parts' }, debounced)
        .subscribe();
    },

    async session() {
      const { data: { session } } = await sb.auth.getSession();
      if (!session) return (current = null);
      const p = must(await sb.from('profiles').select('*').eq('id', session.user.id).single());
      return (current = toUser({ ...p, email: p.email || session.user.email }));
    },
    async signIn(email, password) {
      must(await sb.auth.signInWithPassword({ email, password }));
      return this.session();
    },
    async resetPassword(email) {
      must(await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname }));
    },
    async signOut() { await sb.auth.signOut(); current = null; },

    async listStaff() {
      return must(await sb.from('profiles').select('*').order('full_name')).map(toUser);
    },
    async setRole(id, role) { must(await sb.from('profiles').update({ role }).eq('id', id)); },

    async listJobs() {
      return must(await sb.from('jobs').select(JOB_SELECT).order('scheduled_date').order('start_time')).map(mapJob);
    },
    async getJob(id) {
      const j = must(await sb.from('jobs').select(JOB_SELECT).eq('id', id).maybeSingle());
      if (!j) return null;
      const [updates, parts] = await Promise.all([
        sb.from('job_updates').select('*, author:profiles(full_name)').eq('job_id', id).order('created_at', { ascending: false }).then(must),
        sb.from('parts').select('*, requester:profiles(full_name)').eq('job_id', id).order('created_at').then(must),
      ]);
      const urls = await signAll([...(j.photos || []), ...updates.flatMap((u) => u.photos || [])]);
      return {
        ...mapJob(j),
        photo_urls: (j.photos || []).map((p) => urls[p]).filter(Boolean),
        updates: updates.map((u) => ({ ...u, author_name: u.author?.full_name, photo_urls: (u.photos || []).map((p) => urls[p]).filter(Boolean) })),
        parts: parts.map((p) => ({ ...p, requester_name: p.requester?.full_name })),
      };
    },
    async createJob(data, files = []) {
      const j = must(await sb.from('jobs').insert({ ...data, created_by: current.id }).select('id').single());
      await sb.from('job_updates').insert({ job_id: j.id, author_id: current.id, kind: 'created' });
      if (files.length) {
        const photos = await upload(j.id, files);
        must(await sb.from('jobs').update({ photos }).eq('id', j.id));
      }
      return j.id;
    },
    async updateJob(id, patch, files = []) {
      if (files.length) {
        const cur = must(await sb.from('jobs').select('photos').eq('id', id).single());
        patch = { ...patch, photos: [...(cur.photos || []), ...(await upload(id, files))] };
      }
      must(await sb.from('jobs').update(patch).eq('id', id));
    },
    async deleteJob(id) {
      const j = must(await sb.from('jobs').select('photos').eq('id', id).single());
      const ups = must(await sb.from('job_updates').select('photos').eq('job_id', id));
      const all = [...(j.photos || []), ...ups.flatMap((u) => u.photos || [])];
      if (all.length) await sb.storage.from(BUCKET).remove(all);
      must(await sb.from('jobs').delete().eq('id', id));
    },
    async addUpdate(jobId, { kind, message = '', files = [], status }) {
      const photos = await upload(jobId, files);
      must(await sb.from('job_updates').insert({ job_id: jobId, author_id: current.id, kind, message, status: status || null, photos }));
      if (status) {
        must(await sb.from('jobs').update({ status, completed_at: status === 'completed' ? new Date().toISOString() : null }).eq('id', jobId));
      }
    },
    async addPart(jobId, { description, qty = 1, notes = '' }) {
      must(await sb.from('parts').insert({ job_id: jobId, description, qty, notes, requested_by: current.id }));
    },
    async updatePart(id, patch) { must(await sb.from('parts').update(patch).eq('id', id)); },
    async listParts() {
      return must(await sb.from('parts').select('*, requester:profiles(full_name), job:jobs(id,title,address)').order('created_at', { ascending: false }))
        .map((p) => ({ ...p, requester_name: p.requester?.full_name }));
    },
  };
}
