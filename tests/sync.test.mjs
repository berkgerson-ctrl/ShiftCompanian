// Two-device sync test against a simulated Firestore and IndexedDB (no network, no dependencies).
// Run: node tests/sync.test.mjs
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
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
  const stores = {};
  const idb = { stores, version: 0, open(name, ver) {
    const req = {};
    setTimeout(() => {
      const db = {
        objectStoreNames: { contains: n => !!stores[n] },
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
      if (idb.version < ver) { req.onupgradeneeded && req.onupgradeneeded(); idb.version = ver; }
      req.onsuccess && req.onsuccess();
    });
    return req; } };
  return idb;
}
const makeLs = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) }; };

const appSrc = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8').replace('ready.then(draw);', '');
async function device(name, preset) {
  const idb = preset || makeIdb(), ls = makeLs();
  globalThis.indexedDB = idb; globalThis.localStorage = ls;
  const app = new Function(appSrc + `;return {kind,fullLv,TYPES,S,work,leaves:()=>leaves,setLeaves:v=>{leaves=v},R,base,pS,xS,pL,pM,pB,O,ready,holidays:()=>holidays,setHolidays:v=>{holidays=v},swapLog:()=>swapLog,setSwaps:v=>{swapLog=v},pH,xH,pW,xW,holState,toilEarned,rem,setToday:v=>{TODAY=v},evList,armNotifs,icsText,NS,getTimers:()=>timers,csv,tplCsv,tplWorkbook,build,getImp:()=>imp}`)();
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
  dev.dirtyCount = () => ['shifts', 'leaves', 'meta', 'holidays', 'swaps'].reduce((n, s) => n + [...idb.stores[s].m.values()].filter(v => v.dirty).length, 0);
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

// 9. bank holidays and swaps sync, including deletes
A.use(); A.app.setHolidays([{ d: O + 12, name: 'Test holiday' }]); A.app.pH(A.app.holidays()[0]);
A.app.setSwaps([{ id: 777, give: O + 3, take: O + 6, who: 'Sam', st: 'Planned', fu: O + 9, note: '' }]); A.app.pW(A.app.swapLog()[0]);
await A.run(); await B.run();
assert.equal(B.app.holidays()[0].name, 'Test holiday'); assert.equal(B.app.swapLog()[0].who, 'Sam');
ok('bank holidays and swap log sync to another device');
B.use(); B.app.xH(O + 12); B.app.setHolidays([]); B.app.xW(777); B.app.setSwaps([]); await B.run(); await A.run();
assert.equal(A.app.holidays().length, 0); assert.equal(A.app.swapLog().length, 0);
ok('deleting a holiday and a swap syncs');

// 10. upgrade from the first release (database v1 without holidays/swaps) keeps existing data
const old = makeIdb(); old.version = 1;
for (const [nm, kp] of [['shifts', 'd'], ['leaves', 'id'], ['meta', 'k']]) old.stores[nm] = { kp, m: new Map() };
old.stores.shifts.m.set(O + 3, { d: O + 3, s: '07:00', e: '14:48', st: 'Scheduled', f: '', u: 1, dirty: 0 });
old.stores.meta.m.set('seeded', { k: 'seeded', v: 1 });
globalThis.__user = { email: 'old@example.com', uid: 'u3' };
const U = await device('U', old);
assert.ok(U.app.work.includes(O + 3)); assert.ok(old.stores.holidays && old.stores.swaps); assert.equal(old.version, 2);
ok('upgrading from database v1 keeps shifts and adds the new stores');

// 11. TOIL for bank holidays
globalThis.__user = { email: 'x@example.com', uid: 'u4' };
const D2 = await device('T'); const x = D2.app; D2.use();
x.setToday(O + 20); x.base.TOIL = 0;
D2.addShift(10); x.setHolidays([{ d: O + 10, name: 'H1' }]);
assert.equal(x.holState(x.holidays()[0]), 'earned'); assert.equal(x.toilEarned(), 468); assert.equal(x.rem('TOIL'), 468);
const leaveOn = (type, full, st) => [{ id: 1, d: O + 10, type, full, s: full ? null : '09:00', e: full ? null : '10:00', st }];
for (const type of ['PTO', 'Sick', 'TOIL']) for (const st of ['Review', 'Approved']) {
  x.setLeaves(leaveOn(type, true, st));
  assert.equal(x.holState(x.holidays()[0]), 'blocked', type + ' ' + st); assert.equal(x.toilEarned(), 0, type + ' ' + st); }
ok('a full-day PTO, sick or TOIL request (under review or approved) on a worked bank holiday earns no TOIL day');
for (const type of ['PTO', 'Sick', 'TOIL']) { x.setLeaves(leaveOn(type, false, 'Approved')); assert.equal(x.holState(x.holidays()[0]), 'earned', 'partial ' + type); }
ok('partial leave of any type does not cancel the TOIL day');
x.setLeaves(leaveOn('PTO', true, 'Denied')); assert.equal(x.holState(x.holidays()[0]), 'earned'); ok('a denied request does not cancel the TOIL day');
x.setLeaves([]); x.setHolidays([{ d: O + 10, name: 'A' }, { d: O + 11, name: 'no shift' }]);
assert.equal(x.holState(x.holidays()[1]), 'off'); assert.equal(x.toilEarned(), 468); ok('a bank holiday you are not scheduled for earns nothing');
D2.addShift(25); x.setHolidays([{ d: O + 10, name: 'A' }, { d: O + 25, name: 'future' }]);
assert.equal(x.holState(x.holidays()[1]), 'pending'); assert.equal(x.toilEarned(), 468);
x.setToday(O + 25); assert.equal(x.holState(x.holidays()[1]), 'earned'); assert.equal(x.toilEarned(), 936);
ok('a future holiday is pending, then earned when the day arrives (2 days = 936 min)');
delete x.S[O + 25]; assert.equal(x.holState(x.holidays()[1]), 'off'); x.S[O + 25] = { s: '07:00', e: '14:48', st: 'Scheduled', f: '' };
x.base.TOIL = 100; assert.equal(x.rem('TOIL'), 100 + 936); ok('earned days add to the opening TOIL balance');

// 12. leave-by notifications and calendar file
const Ev = await device('N'); const y = Ev.app; Ev.use();
y.R.commute = 45; Ev.addShift(22); Ev.addShift(23); y.S[O + 23].s = '14:00'; y.S[O + 23].e = '21:48';
const at = (d, h, m) => new Date(2026, 9, d, h, m).getTime();
let ev = y.evList(at(22, 5, 0)).filter(e => e.key.startsWith('shift:' + (O + 22)));
assert.equal(ev.length, 1); assert.equal(ev[0].at, at(22, 6, 5)); assert.equal(ev[0].until, at(22, 6, 15)); assert.equal(ev[0].title, 'Leave by 06:15');
ok('reminder fires 10 min before the leave-by time (07:00 shift, 45 min trip -> 06:05, leave by 06:15)');
y.setLeaves([{ id: 5, d: O + 22, type: 'PTO', full: true, st: 'Approved' }]);
assert.equal(y.evList(at(22, 5, 0)).filter(e => e.key.startsWith('shift:' + (O + 22))).length, 0); y.setLeaves([]);
ok('no reminder on a day of approved full-day leave');
const shown = []; globalThis.Notification = { permission: 'granted' };
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { serviceWorker: { ready: Promise.resolve({ showNotification: async (t, o) => shown.push([t, o.body]) }) } } });
y.NS.set({ on: true });
y.armNotifs(at(22, 6, 10)); await sleep(20);
assert.equal(shown.length, 1); assert.equal(shown[0][0], 'Leave by 06:15');
y.armNotifs(at(22, 6, 11)); await sleep(20); assert.equal(shown.length, 1);
ok('a reminder missed by a few minutes still shows once, and never twice');
y.armNotifs(at(22, 6, 30)); await sleep(20); assert.equal(shown.length, 1); ok('nothing shows after the leave-by time has passed');
const ev2 = y.evList(at(23, 12, 0)).find(e => e.key.startsWith('shift:' + (O + 23)));
y.armNotifs(ev2.at - 150); assert.equal(y.getTimers().length >= 1, true); await sleep(400);
assert.equal(shown.length, 2); ok('an upcoming reminder is scheduled and fires on time');
y.setSwaps([{ id: 55, give: O + 22, take: O + 24, who: 'Sam', st: 'Review', fu: O + 22, note: '' }]);
const sw = y.evList(at(22, 8, 0)).find(e => e.key.startsWith('swap:55')); assert.equal(sw.at, at(22, 9, 0)); ok('swap follow-up reminder is set for 09:00 on its date');
y.setSwaps([]);
const ics = y.icsText(at(22, 5, 0));
assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\n') && ics.endsWith('END:VCALENDAR\r\n'));
assert.equal(ics.split('BEGIN:VEVENT').length - 1, 2);
assert.ok(ics.includes('UID:shift-' + (O + 22) + '@shift-companion') && ics.includes('DTSTART:20261022T070000') && ics.includes('TRIGGER:-PT55M'));
assert.ok(!ics.split('\r\n').some(l => l.length > 75) && !/[^\r]\n/.test(ics));
ok('calendar file has one event per upcoming shift, a 55 min alarm, and valid line endings');
delete globalThis.Notification;

// 13. import template (CSV and Excel) round-trips through the importer
const XL = createRequire(import.meta.url)(path.join(root, 'js/vendor/xlsx.full.min.js')); globalThis.XLSX = XL;
const Tm = await device('TPL'); const tp = Tm.app; Tm.use(); tp.setToday(O + 20);
tp.build(tp.csv(tp.tplCsv())); let imp = tp.getImp();
assert.equal(imp.length, 3); assert.ok(imp.every(r => !r.err && r.kind === 'new')); assert.deepEqual(imp.map(r => r.d), [O + 21, O + 22, O + 23]);
ok('the CSV template imports cleanly');
const wb = XL.read(XL.write(tp.tplWorkbook(), { bookType: 'xlsx', type: 'array' }), { type: 'array' });
assert.deepEqual(wb.SheetNames, ['Schedule', 'Instructions']);
tp.build(XL.utils.sheet_to_json(wb.Sheets.Schedule, { defval: '', raw: true })); imp = tp.getImp();
assert.deepEqual(imp.map(r => [r.d, r.s, r.e, r.st, r.err]), [[O + 21, 530, 998, 'Scheduled', ''], [O + 22, 562, 1030, 'Scheduled', ''], [O + 23, 530, 998, 'Planned', '']]);
ok('the Excel template imports cleanly: dates, times and statuses read back exactly');
tp.build([{ Date: '2026-10-30', 'Start Time': '07:00', 'End Time': '14:48', Status: 'Denied' }]);
assert.ok(tp.getImp()[0].err.includes('cannot be Denied')); ok('a shift row marked Denied is rejected with a clear message');

const Km = await device('KIND'); const kx = Km.app; Km.use();
kx.S[O + 40] = { s: '08:50', e: '16:38', st: 'Scheduled', f: '' }; kx.S[O + 41] = { s: '09:22', e: '17:10', st: 'Scheduled', f: '' };
kx.S[O + 42] = { s: '07:00', e: '14:48', st: 'Scheduled', f: '' }; kx.S[O + 43] = { s: '08:50', e: '16:38', st: 'Scheduled', f: '' };
kx.setLeaves([{ id: 'p', d: O + 43, type: 'PTO', full: false, s: '15:00', e: '16:38', st: 'Approved' }, { id: 'q', d: O + 40, type: 'PTO', full: false, s: '15:00', e: '16:38', st: 'Denied' }]);
assert.deepEqual([40, 41, 42, 43, 44].map(i => kx.kind(O + i)), ['E', 'L', 'C', 'C', '']);
ok('shift letters: 08:50-16:38 is E, 09:22-17:10 is L, other times C, partial leave C, no shift blank; a denied partial does not make C');
kx.setLeaves([{ id: 'f', d: O + 44, type: 'Sick', full: true, st: 'Denied' }, { id: 'g', d: O + 45, type: 'PTO', full: true, st: 'Review' }]);
assert.ok(!kx.fullLv(O + 44) && kx.fullLv(O + 45)); ok('a denied full-day request is not a leave day, an under-review one is');
console.log('\nAll ' + n + ' sync checks passed.');
fs.rmSync(tmp, { recursive: true, force: true });
process.exit(0);
