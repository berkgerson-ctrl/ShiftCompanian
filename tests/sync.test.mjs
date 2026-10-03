// Two-device sync test against a simulated Firestore and IndexedDB (no network, no dependencies).
// Run: node tests/sync.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sc-test-'));
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---- ESM copies of sync.js + a fake Firebase SDK, in a temp dir -------------------------------
fs.writeFileSync(path.join(tmp, 'package.json'), '{"type":"module"}');
fs.copyFileSync(path.join(root, 'js/sync.js'), path.join(tmp, 'sync.js'));
fs.writeFileSync(path.join(tmp, 'firebase-config.js'),
  'export const firebaseConfig = { apiKey: "test", authDomain: "t", projectId: "t", appId: "t" };');
fs.mkdirSync(path.join(tmp, 'sdk'));
fs.writeFileSync(path.join(tmp, 'sdk/firebase-app.js'), 'export const initializeApp = () => ({});');
fs.writeFileSync(path.join(tmp, 'sdk/firebase-auth.js'), `
export const getAuth = () => ({});
export class GoogleAuthProvider {}
export const onAuthStateChanged = (a, cb) => setTimeout(() => cb(globalThis.__user), 0);
export const signInWithPopup = async () => {}; export const signInWithRedirect = async () => {}; export const signOut = async () => {};`);
fs.writeFileSync(path.join(tmp, 'sdk/firebase-firestore.js'), `
const C = () => globalThis.__cloud;
const ts = ms => ({ ms, toMillis: () => ms });
export const Timestamp = { fromMillis: ts };
export const getFirestore = () => ({});
export const serverTimestamp = () => ({ __server: true });
export const collection = (db, ...p) => ({ prefix: p.join('/') + '/' });
export const where = (f, op, v) => ({ f, op, v });
export const query = (c, w) => ({ c, w });
export const doc = (db, ...p) => ({ path: p.join('/') });
export const getDocs = async q => ({ docs: [...C().docs.entries()]
  .filter(([k, v]) => k.startsWith(q.c.prefix) && v.s.ms >= q.w.v.ms)
  .map(([, v]) => ({ data: () => ({ ...JSON.parse(JSON.stringify(v)), s: ts(v.s.ms) }) })) });
export const writeBatch = () => { const ops = [];
  return { set: (ref, data) => ops.push([ref.path, data]),
    commit: async () => { for (const [p, d] of ops) C().docs.set(p, { ...JSON.parse(JSON.stringify(d)), s: ts(++C().clock) }); } }; };`);

// ---- fake browser globals ---------------------------------------------------------------------
globalThis.__cloud = { docs: new Map(), clock: 1000 };
globalThis.__user = { email: 'test@example.com', uid: 'u1' };
const win = { SC_SDK_BASE: pathToFileURL(path.join(tmp, 'sdk')).href + '/', addEventListener() {}, dispatchEvent() {} };
globalThis.window = win;
globalThis.document = { getElementById: () => null, addEventListener() {}, hidden: false, activeElement: null };

function makeIdb() {
  const stores = {}; let created = false;
  const idb = { stores, open() {
    const req = {};
    setTimeout(() => {
      const db = {
        createObjectStore(n, o) { stores[n] = { kp: o.keyPath, m: new Map() }; },
        transaction() {
          const t = {};
          t.objectStore = n => { const st = stores[n]; return {
            put(v) { st.m.set(v[st.kp], JSON.parse(JSON.stringify(v))); setTimeout(() => t.oncomplete && t.oncomplete()); },
            getAll() { const q = {}; setTimeout(() => { q.result = [...st.m.values()].map(x => JSON.parse(JSON.stringify(x))); q.onsuccess && q.onsuccess(); }); return q; },
            get(k) { const q = {}; setTimeout(() => { const v = st.m.get(k); q.result = v && JSON.parse(JSON.stringify(v)); q.onsuccess && q.onsuccess(); }); return q; } }; };
          return t;
        } };
      req.result = db;
      if (!created) { created = true; req.onupgradeneeded && req.onupgradeneeded(); }
      req.onsuccess && req.onsuccess();
    });
    return req; } };
  return idb;
}
const makeLs = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) }; };

const appSrc = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8').replace('ready.then(draw);', '');
async function device(name) {
  const idb = makeIdb(), ls = makeLs();
  globalThis.indexedDB = idb; globalThis.localStorage = ls;
  const app = new Function(appSrc + `;return {S,work,leaves:()=>leaves,setLeaves:v=>{leaves=v},R,base,pS,xS,pL,pM,pB,O,ready}`)();
  await app.ready;
  win.redraw = () => {};
  const dev = { name, idb, ls, app, api: win.syncApi };
  dev.use = () => { globalThis.indexedDB = idb; globalThis.localStorage = ls; win.syncApi = dev.api; win.redraw = () => {}; };
  dev.use();
  await import(pathToFileURL(path.join(tmp, 'sync.js')).href + '?dev=' + name);
  dev.sync = win.SYNC;
  for (let i = 0; i < 100 && dev.sync.status !== 'ok'; i++) await sleep(5);
  assert.equal(dev.sync.status, 'ok', name + ' initial sync');
  dev.run = async () => { dev.use(); await dev.sync.now(); assert.equal(dev.sync.status, 'ok', name + ' sync status: ' + dev.sync.error); };
  dev.addShift = (d, st = 'Scheduled') => { const x = dev.app; x.S[x.O + d] = { s: '07:00', e: '14:48', st, f: '' }; x.work.push(x.O + d); x.pS(x.O + d); };
  dev.setShift = (d, st) => { const x = dev.app; x.S[x.O + d].st = st; x.pS(x.O + d); };
  dev.delShift = d => { const x = dev.app; x.xS(x.O + d); delete x.S[x.O + d]; x.work.splice(x.work.indexOf(x.O + d), 1); };
  dev.dirtyCount = () => ['shifts', 'leaves', 'meta'].reduce((n, s) => n + [...idb.stores[s].m.values()].filter(v => v.dirty).length, 0);
  return dev;
}

let n = 0; const ok = m => console.log('  PASS ' + (++n) + '. ' + m);

const A = await device('A'), B = await device('B');
const O = A.app.O;

// 1. push + pull
A.use(); A.addShift(3); A.addShift(4); A.addShift(10);
A.app.setLeaves([{ id: 111, d: O + 7, type: 'PTO', full: true, st: 'Review' }]); A.app.pL(A.app.leaves()[0]);
A.use(); A.app.R.week = 3; A.app.pM();
await sleep(5); await A.run();
assert.equal(A.dirtyCount(), 0); ok('device A pushes and clears its dirty flags');
await B.run();
assert.deepEqual(B.app.work.slice().sort((a, b) => a - b), [O + 3, O + 4, O + 10]);
assert.equal(B.app.leaves().length, 1); assert.equal(B.app.leaves()[0].id, 111);
assert.equal(B.app.R.week, 3);
ok('device B receives shifts, leave and rule settings');

// 2. conflict: A edits first (offline), B edits later and syncs first -> B wins everywhere
A.use(); A.setShift(3, 'Planned'); await sleep(8);
B.use(); B.setShift(3, 'Approved'); await B.run();
await A.run(); await B.run();
assert.equal(A.app.S[O + 3].st, 'Approved'); assert.equal(B.app.S[O + 3].st, 'Approved');
assert.equal(globalThis.__cloud.docs.get('users/u1/shifts/' + (O + 3)).st, 'Approved');
ok('newest edit wins; the older offline edit does not overwrite it');

// 3. conflict the other way: A edits later but syncs second -> A wins
B.use(); B.setShift(4, 'Review'); await sleep(8);
A.use(); A.setShift(4, 'Denied');
await B.run(); await A.run(); await B.run();
assert.equal(B.app.S[O + 4].st, 'Denied'); assert.equal(A.app.S[O + 4].st, 'Denied');
ok('a later edit pushed second still wins');

// 4. deletes propagate and are not resurrected
A.use(); A.delShift(10); await A.run(); await B.run();
assert.ok(!B.app.work.includes(O + 10) && !B.app.S[O + 10]);
await A.run(); await B.run();
assert.ok(!A.app.work.includes(O + 10) && !B.app.work.includes(O + 10));
ok('a delete reaches the other device and stays deleted');

// 5. independent offline edits on both devices merge
A.use(); A.addShift(15); B.use(); B.addShift(16);
await A.run(); await B.run(); await A.run();
for (const d of [A, B]) { assert.ok(d.app.work.includes(O + 15) && d.app.work.includes(O + 16), d.name + ' has both'); }
ok('independent offline additions on two devices both survive');

// 6. leave edit + leave delete
A.use(); const lv = A.app.leaves()[0]; lv.st = 'Approved'; A.app.pL(lv); await A.run(); await B.run();
assert.equal(B.app.leaves()[0].st, 'Approved'); ok('leave status change syncs');
B.use(); B.app.pL({ id: 111, del: true }); B.app.setLeaves([]); await B.run(); await A.run();
assert.equal(A.app.leaves().length, 0); ok('leave delete syncs');

// 6b. opening balances sync
A.use(); A.app.base.PTO = 1234; A.app.pB(); await A.run(); await B.run();
assert.equal(B.app.base.PTO, 1234); ok('opening balances sync');

// 7. a fresh third device restores everything from the cloud
const C = await device('C'); await C.run();
assert.deepEqual(C.app.work.slice().sort((a, b) => a - b), A.app.work.slice().sort((a, b) => a - b));
assert.equal(C.app.R.week, 3); assert.equal(C.app.base.PTO, 1234); ok('a new device restores all data from the cloud');

// 8. a different account cannot see these records (query is scoped to users/{uid})
globalThis.__user = { email: 'other@example.com', uid: 'u2' };
const D = await device('D'); await D.run();
assert.equal(D.app.work.length, 0); ok('another account sees none of this data');

console.log('\nAll ' + n + ' sync checks passed.');
fs.rmSync(tmp, { recursive: true, force: true });
process.exit(0);
