// Cloud sync (Firebase Auth + Firestore).
// IndexedDB stays the source of truth; this module only exchanges records with the cloud.
// Conflict rule: per record, the newest client edit time `u` wins. Deletes travel as tombstones (`del: true`).
import { firebaseConfig } from './firebase-config.js';

const SDK = window.SC_SDK_BASE || 'https://www.gstatic.com/firebasejs/10.12.2/';
const SYNC = window.SYNC = {
  configured: !/^REPLACE/.test(firebaseConfig.apiKey),
  status: 'off', user: null, last: null, error: '',
  signIn, signOut, now: run
};
let fb = null, user = null, busy = false, again = false, timer = null;

const set = o => { Object.assign(SYNC, o); window.redraw && window.redraw(); };

async function load() {
  if (fb) return fb;
  const [app, a, f] = await Promise.all([
    import(SDK + 'firebase-app.js'), import(SDK + 'firebase-auth.js'), import(SDK + 'firebase-firestore.js')]);
  const inst = app.initializeApp(firebaseConfig);
  fb = { a, f, au: a.getAuth(inst), db: f.getFirestore(inst) };
  return fb;
}

async function init() {
  if (!SYNC.configured) return set({ status: 'unconfigured' });
  try { await load(); } catch (e) { return set({ status: 'offline', error: 'Could not load Firebase (offline?)' }); }
  fb.a.onAuthStateChanged(fb.au, u => {
    user = u;
    set({ user: u ? { email: u.email, uid: u.uid } : null, status: u ? 'syncing' : 'off', error: '' });
    if (u) run();
  });
}

async function signIn() {
  try {
    await load();
    await fb.a.signInWithPopup(fb.au, new fb.a.GoogleAuthProvider());
  } catch (e) {
    const redirectable = ['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment'];
    if (redirectable.includes(e.code)) {
      try { return await fb.a.signInWithRedirect(fb.au, new fb.a.GoogleAuthProvider()); } catch (e2) { e = e2; }
    }
    set({ error: e.code || e.message });
  }
}
async function signOut() { try { await fb.a.signOut(fb.au); } catch (e) { set({ error: e.code || e.message }); } }

// Firestore collections under users/{uid}  <->  IndexedDB stores
const MAP = [['shifts', 'shifts'], ['leaves', 'leaves'], ['holidays', 'holidays'], ['swaps', 'swaps'], ['meta', 'settings']];

async function run() {
  if (!fb || !user) return;
  if (busy) { again = true; return; }
  busy = true; set({ status: 'syncing', error: '' });
  try {
    const { f, db } = fb, api = window.syncApi, key = 'sc-cursor:' + user.uid;
    const cursor = +(localStorage.getItem(key) || 0);
    let maxS = cursor;

    // 1) PULL records the server received since the cursor (>= so same-millisecond writes are never missed).
    for (const [store, col] of MAP) {
      const q = f.query(f.collection(db, 'users', user.uid, col), f.where('s', '>=', f.Timestamp.fromMillis(cursor)));
      for (const d of (await f.getDocs(q)).docs) {
        const { s, ...rec } = d.data();
        if (s) maxS = Math.max(maxS, s.toMillis());
        await api.apply(store, rec);   // applied only if newer than the local copy
      }
    }

    // 2) PUSH local records still marked dirty (those not overwritten by a newer remote copy in step 1).
    const dirty = await api.dirty();
    const items = [
      ...dirty.shifts.map(r => ['shifts', 'shifts', String(r.d), r]),
      ...dirty.leaves.map(r => ['leaves', 'leaves', String(r.id), r]),
      ...dirty.holidays.map(r => ['holidays', 'holidays', String(r.d), r]),
      ...dirty.swaps.map(r => ['swaps', 'swaps', String(r.id), r]),
      ...dirty.rules.map(r => ['meta', 'settings', r.k, r])];
    for (let i = 0; i < items.length; i += 400) {
      const batch = f.writeBatch(db);
      items.slice(i, i + 400).forEach(([, col, id, r]) => {
        const { dirty: _d, ...data } = r;
        batch.set(f.doc(db, 'users', user.uid, col, id), { ...data, s: f.serverTimestamp() });
      });
      await batch.commit();
    }
    for (const [store, , , r] of items) await api.clean(store, r);

    localStorage.setItem(key, String(maxS));
    set({ status: 'ok', last: Date.now() });
  } catch (e) {
    set({ status: 'error', error: e.code || e.message });
  }
  busy = false;
  if (again) { again = false; run(); }
}

window.addEventListener('localchange', () => { clearTimeout(timer); timer = setTimeout(run, 1500); });
window.addEventListener('online', () => (fb ? run() : init()));
document.addEventListener('visibilitychange', () => { if (!document.hidden) run(); });
init();
