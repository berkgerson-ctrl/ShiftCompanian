// Shift Companion — app logic (classic script; handlers are referenced from inline onclick).
const _n=new Date();
const E=(y,m,d)=>Math.round(Date.UTC(y,m,d)/864e5),UD=n=>new Date(n*864e5),O=E(2026,9,0),STD=468;
let TODAY=E(_n.getFullYear(),_n.getMonth(),_n.getDate());
const todayN=t=>{const x=new Date(t);return E(x.getFullYear(),x.getMonth(),x.getDate())};
const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],DAYN=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const fd=n=>MON[UD(n).getUTCMonth()]+' '+UD(n).getUTCDate(),iso=n=>UD(n).toISOString().slice(0,10),fromIso=t=>{const m=String(t).match(/^(\d{4})-(\d\d)-(\d\d)$/);return m?E(+m[1],m[2]-1,+m[3]):NaN};
const DOW=['SUN','MON','TUE','WED','THU','FRI','SAT'];
const wd=[1,2,4,5,6,8,9,11,12,13,15,16,18,19,20,22,23,25,26,27,29,30],work=wd.map(d=>O+d);
const S={};wd.forEach(d=>S[O+d]={s:d%3==0?'09:22':'08:50',e:d%3==0?'17:10':'16:38',st:'Scheduled',f:''});
S[O+12].st='Planned';S[O+16].st='Approved';S[O+16].f='Swapped';
const R={week:6,cons:6,sixPerMonth:2,commute:45};
const TYPE_COLORS=['#3987e5','#9085e9','#199e70','#d95926','#e87ba4','#c98500','#e66767','#008300'],CUSTOM_C='#e9a23b';
const defTypes=()=>[{id:'E',n:'Early',l:'E',s:'08:50',e:'16:38',c:TYPE_COLORS[0]},{id:'L',n:'Late',l:'L',s:'09:22',e:'17:10',c:TYPE_COLORS[1]}];
let TYPES=defTypes();
const typeOf=d=>{const s=S[d];return s&&TYPES.find(x=>x.s==s.s&&x.e==s.e)||null};
const partial=d=>leaves.some(l=>l.d==d&&!l.full&&l.st!='Denied');
const kind=d=>{const s=S[d];if(!s)return '';if(partial(d))return 'C';const x=typeOf(d);return x?x.l:'C'};
const fullLv=d=>leaves.find(l=>l.d==d&&l.full&&l.st!='Denied');
const DEMO_BASE={PTO:36*60+12,TOIL:11*60+30,Sick:5*468},base={PTO:0,TOIL:0,Sick:0};
const hm=t=>{const[a,b]=String(t).split(':').map(Number);return a*60+b};
let leaves=[{id:1,d:O+5,type:'PTO',full:true,st:'Review'},{id:2,d:O+20,type:'PTO',full:true,st:'Denied'},{id:3,d:O+23,type:'PTO',full:false,s:'12:00',e:'14:00',st:'Approved'},{id:4,d:O+9,type:'Sick',full:true,st:'Approved'}],lid=5;
const dur=l=>l.full?STD:Math.min(STD,hm(l.e)-hm(l.s));
const used=(k,skip)=>leaves.filter(l=>l.type==k&&l.st=='Approved'&&l.id!=skip).reduce((a,l)=>a+dur(l),0),rem=k=>bal(k)-used(k);
let holidays=[],swapLog=[];
const TOIL_DAY=STD,hol=d=>holidays.find(h=>h.d==d);
// Bank holiday TOIL: a shift on the day = scheduled (the company sets shifts) = earn 1 day once the day arrives.
// A full-day leave request of any type (PTO, TOIL, Sick) that is not Denied cancels it; partial leave does not.
function holState(h){if(!S[h.d])return 'off';
  if(leaves.some(l=>l.d==h.d&&l.full&&l.st!='Denied'))return 'blocked';
  return h.d<=TODAY?'earned':'pending'}
const toilEarned=()=>holidays.filter(h=>holState(h)=='earned').length*TOIL_DAY,bal=k=>base[k]+(k=='TOIL'?toilEarned():0);
const fm=m=>{const ng=m<0;m=Math.abs(m);const d=Math.floor(m/STD),r=m%STD;return (ng?'−':'')+(d?d+'d ':'')+Math.floor(r/60)+'h '+String(r%60).padStart(2,'0')+'m'};
const lab={Review:'Under Review'};
let tab=0,sel=TODAY,vm={y:_n.getFullYear(),m:_n.getMonth()},out='',col=false,modal=false,warn=false,editing=null,dl=false,imp=null,impDone='',lvId=null,swId=null,bhId=null;
function mv(k){let m=vm.m+k,y=vm.y;if(m<0){m=11;y--}if(m>11){m=0;y++}vm={y,m};draw()}
function goto(d){sel=d;const t=UD(d);vm={y:t.getUTCFullYear(),m:t.getUTCMonth()}}
const newId=()=>Date.now()*1000+Math.floor(Math.random()*1000);
function openL(id){modal='lv';lvId=id;warn=false;dl=false;draw()}
function openImp(){modal='imp';imp=null;impDone='';draw()}
function openM(d){editing=d;modal=true;warn=false;dl=false;draw()}
function openW(id){swId=id;modal='sw';warn=false;dl=false;draw()}
function openBH(d){bhId=d;modal='bh';warn=false;dl=false;draw()}
const dow=n=>((n+4)%7+7)%7;
const off=x=>leaves.some(l=>l.d==x&&l.full&&l.st=='Approved');
function check(d,skip){ // would working day d break rules? (skip = a day being given away)
  const w=new Set(work.filter(x=>x!=skip&&S[x].st!='Denied'&&!off(x)));w.add(d);
  const a=d-dow(d),wc=(set,t)=>[...set].filter(x=>x>=t&&x<=t+6).length,wk=wc(w,a);
  let run=1,x=d-1;while(w.has(x)){run++;x--}x=d+1;while(w.has(x)){run++;x++}
  const e=[];if(wk>R.week)e.push(`Week would have ${wk} workdays (max ${R.week})`);
  if(run>R.cons)e.push(`${run} days in a row (max ${R.cons})`);
  if(wc(w,a)>=6&&wc(new Set([...w].filter(y=>y!=d)),a)<6){const mo=t=>{const u=UD(t+6);return u.getUTCFullYear()*12+u.getUTCMonth()};
    const n=[...new Set([...w].map(y=>y-dow(y)))].filter(t=>t!=a&&mo(t)==mo(a)&&wc(w,t)>=6).length+1;
    if(n>R.sixPerMonth)e.push(`That makes ${n} six-day weeks in ${MON[UD(a+6).getUTCMonth()]} (max ${R.sixPerMonth})`)}
  return e}
const ic=p=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
const icons=[ic('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>'),ic('<path d="M7 7h12l-3-3M17 17H5l3 3"/>'),ic('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),ic('<path d="M4 6h10M4 12h16M4 18h8"/><circle cx="17" cy="6" r="2"/>')];
const names=['Schedule','Swaps','Leave','Rules'];
function tapDay(d){try{navigator.vibrate&&navigator.vibrate(6)}catch(e){}sel=d;col=false;draw()}
function cal(){const big=col;let h='<div class="grid'+(big?' big':'')+'">'+DOW.map(x=>`<div class="h">${x}</div>`).join('');
  const f1=E(vm.y,vm.m,1),nd=new Date(Date.UTC(vm.y,vm.m+1,0)).getUTCDate();
  for(let i=0;i<dow(f1);i++)h+='<div></div>';
  for(let k=1;k<=nd;k++){const d=f1+k-1,s=S[d];const c=s?({Scheduled:'#5b9bff',Planned:'#7c6cf0',Review:'#d95f18',Approved:'#1fb67a',Denied:'#e5484d'})[s.st]:'';
    const fl=fullLv(d);let cls='',tag='',sty='';
    if(big){if(fl){cls=fl.st=='Approved'?'lva':'lvr';tag=`<em class="tg">${fl.type=='Sick'?'SICK':fl.type}</em>`}
      else if(!s){cls='offd';tag='<em class="tg">OFF</em>'}
      else{const q=kind(d),x=q=='C'?null:typeOf(d);cls=x?'kt':'kC';if(x)sty=`style="background:${x.c}33"`;tag=`<em class="tg lt">${esc(q)}</em>`}}
    h+=`<div class="d ${cls} ${d==sel?'sel':''} ${d==TODAY?'today':''} ${hol(d)?'bh':''}" ${sty} onclick="tapDay(${d})"><b>${k}</b>${big?tag:''}${swapLog.some(w=>w.give==d||w.take==d)?'<i class="sw"></i>':''}${leaves.some(l=>l.d==d)&&!(big&&fl)?'<i class="lv"></i>':''}${s&&!(big&&!fl)?`<i style="background:${c}"></i>`:''}</div>`}
  h+='</div>';
  if(big)h+='<div class="lg">'+TYPES.map(x=>`<span><u style="background:${x.c}">${esc(x.l)}</u>${esc(x.n)}</span>`).join('')+`<span><u style="background:${CUSTOM_C}">C</u>Custom / partial</span><span><u class="offd">OFF</u>Day off</span><span><u class="lva"></u>Leave</span><span><u class="lvr"></u>Pending</span></div>`;
  return h}
function sched(){const s=S[sel];let h=`<div class="top"><div class="bar"><span onclick="openStats()" style="cursor:pointer;font-size:12px;border:1px solid #5b6f9e;border-radius:12px;padding:3px 10px">Stats</span><span>Schedule</span><span onclick="openImp()" style="cursor:pointer;font-size:12px;border:1px solid #5b6f9e;border-radius:12px;padding:3px 10px">Import</span></div><div class="sub row" style="font-size:15px"><span onclick="mv(-1)" style="cursor:pointer;padding:4px 14px">‹</span><b onclick="goto(TODAY);draw()" style="cursor:pointer">${MON[vm.m]} ${vm.y}</b><span onclick="mv(1)" style="cursor:pointer;padding:4px 14px">›</span></div>${cal()}</div><div class="sheet" id="sh"><div class="grab" id="gr"></div><h2>${DAYN[dow(sel)]}, ${fd(sel)}</h2>`;
  if(s||sel==TODAY)h+=breaksCard(sel);
  if(!s)h+='<div class="card"><div class="t">Day off</div><div class="m">Standard day = 7h 48m. Tap + to add a shift.</div></div>';
  else{const[hh,mm]=s.s.split(':').map(Number);const l=hh*60+mm-R.commute;
    h+=`<div class="card"><div class="row"><div class="t">${s.s} – ${s.e}</div><span class="pill st-${s.st}">${lab[s.st]||s.st}</span></div><div class="m">Sun–Sat week · ${DOW[dow(sel)]}</div>
    <span class="tag tg-b">Leave by ${tm(((l%1440)+1440)%1440)}</span>${s.f?`<span class="tag tg-o">${s.f}</span>`:''}<button class="btn" style="margin-top:12px" onclick="openM(${sel})">Edit shift</button></div>`}
  h+=leaves.filter(l=>l.d==sel).map(l=>`<div class="card" style="border-left:4px solid #f2c94c;cursor:pointer" onclick="openL(${l.id})"><div class="row"><div class="t">${l.type} leave · ${l.full?'Full day':'Partial'}</div><span class="pill st-${l.st}">${lab[l.st]||l.st}</span></div><div class="m">${l.full?'':l.s+'–'+l.e+' · '}${fm(dur(l))}${l.st=='Approved'?' deducted':l.st=='Denied'?' not deducted':' requested'}</div></div>`).join('');
  const H=hol(sel);if(H){const stt=holState(H),p=HL[stt];h+=`<div class="card" style="border-left:4px solid #f2994a;cursor:pointer" onclick="openBH(${H.d})"><div class="row"><div class="t">Bank holiday · ${esc(H.name)}</div>${p[0]?`<span class="pill st-${p[0]}">${p[1]}</span>`:''}</div><div class="m">${holNote(stt)}</div></div>`}
  h+=swapLog.filter(w=>w.give==sel||w.take==sel).map(w=>`<div class="card" style="border-left:4px solid #b58cff;cursor:pointer" onclick="openW(${w.id})"><div class="row"><div class="t">Swap · ${w.give==sel?'giving this day away':'taking this day'}</div><span class="pill st-${w.st}">${lab[w.st]||w.st}</span></div><div class="m">${w.who?(w.give==sel?'To ':'From ')+esc(w.who)+' · ':''}${esc(swapTitle(w))}</div></div>`).join('');
  return h+'</div>'}
// ---------- daily breaks ----------
// Tick a break after taking it. Each calendar day has its own ticks, so a new day always starts empty.
// Stored on this device only (localStorage 'sc-breaks': {dayNumber: bitmask}); days older than 60 days are dropped.
const BREAKS=6;
const BK={get(){try{return JSON.parse(localStorage.getItem('sc-breaks')||'{}')}catch(e){return{}}},set(o){try{localStorage.setItem('sc-breaks',JSON.stringify(o))}catch(e){}}};
const bkMask=d=>+BK.get()[d]||0,bkOn=(m,i)=>(m>>i&1)==1,bkCount=m=>{let c=0;for(let i=0;i<BREAKS;i++)if(bkOn(m,i))c++;return c};
function tgB(d,i){const o=BK.get();o[d]=(+o[d]||0)^(1<<i);if(!o[d])delete o[d];for(const k of Object.keys(o))if(+k<TODAY-60)delete o[k];BK.set(o);try{navigator.vibrate&&navigator.vibrate(6)}catch(e){}draw()}
function breaksCard(d){const m=bkMask(d),n=bkCount(m);
  return `<div class="card"><div class="row"><div class="t">Breaks</div><span class="pill ${n>=BREAKS?'st-Approved':'st-Planned'}">${n} / ${BREAKS} used</span></div><div class="bks">${[...Array(BREAKS)].map((_,i)=>`<button type="button" class="bk${bkOn(m,i)?' on':''}" role="checkbox" aria-checked="${bkOn(m,i)}" aria-label="Break ${i+1}" onclick="tgB(${d},${i})">${bkOn(m,i)?'✓':i+1}</button>`).join('')}</div><div class="m">${n>=BREAKS?'All breaks taken':(BREAKS-n)+' left'} · new day, new boxes</div></div>`}
function swaps(){
  const due=swapLog.filter(w=>fuOpen(w)&&w.fu<=TODAY+3).sort((a,b)=>a.fu-b.fu);
  const L=[...swapLog].sort((a,b)=>Math.max(b.give,b.take)-Math.max(a.give,a.take));
  const dueTxt=w=>w.fu<TODAY?['Denied','Overdue '+(TODAY-w.fu)+'d']:w.fu==TODAY?['Review','Due today']:['Planned','In '+(w.fu-TODAY)+'d'];
  return `<div class="dark"><div class="bar"><span></span><span>Swaps</span><span></span></div><div class="sub">Arranged outside the app. Log them here to keep a record.</div></div><div class="page">
  ${due.length?`<h2>Follow-ups</h2>${due.map(w=>{const t=dueTxt(w);return `<div class="card row" onclick="openW(${w.id})" style="cursor:pointer"><div><div class="t">${esc(w.who||'Swap')} · ${fd(w.fu)}</div><div class="m">${esc(swapTitle(w))}</div></div><span class="pill st-${t[0]}">${t[1]}</span></div>`}).join('')}`:''}
  <h2>Check a day</h2><input type="date" id="cd" value="${iso(sel)}"><button class="btn" onclick="chk()">Check against my rules</button><div id="res" style="margin:12px 0">${out}</div>
  <h2>Swap log</h2><button class="btn" style="margin:0 0 10px" onclick="openW(null)">Log a swap</button>
  ${L.length?L.map(w=>`<div class="card row" onclick="openW(${w.id})" style="cursor:pointer"><div><div class="t">${esc(swapTitle(w))}</div><div class="m">${w.who?'With '+esc(w.who):'No name'}${w.fu?' · follow up '+fd(w.fu):''}${w.note?' · '+esc(w.note):''}</div></div><span class="pill st-${w.st}">${lab[w.st]||w.st}</span></div>`).join(''):'<div class="m">No swaps logged yet.</div>'}
  <div class="m" style="margin-top:8px">The log does not change your schedule. Edit the shifts yourself once a swap is approved.</div></div>`}
function chk(){const d=fromIso(document.getElementById('cd').value);if(isNaN(d))return;
  const e=off(d)?['You are on approved leave that day']:work.includes(d)?['You already work that day']:check(d);
  out=e.length?`<b class="bad">✗ Not safe for ${fd(d)}</b><br>${e.join('<br>')}`:`<b class="ok">✓ ${fd(d)} is safe to take</b>`;draw()}
function leave(){const L=[...leaves].sort((a,b)=>a.d-b.d),H=[...holidays].filter(h=>holState(h)!='off').sort((a,b)=>a.d-b.d),te=toilEarned();
  return `<div class="dark"><div class="bar"><span></span><span>Leave & TOIL</span><span></span></div><div class="bal">${Object.keys(base).map(k=>`<div><small>${k}</small><b>${fm(rem(k))}</b></div>`).join('')}</div><div class="m" style="color:#9fb0d6">1 day = 7h 48m (468 min). Only Approved requests are deducted.${te?` TOIL includes ${fm(te)} earned on bank holidays.`:''}</div><button class="btn" onclick="openL(null)">Request leave</button></div>
  <div class="page"><h2>Requests</h2>${L.length?L.map(l=>`<div class="card row" onclick="openL(${l.id})" style="cursor:pointer"><div><div class="t">${fd(l.d)} · ${l.type}</div><div class="m">${l.full?'Full day':l.s+'–'+l.e} · ${fm(dur(l))}</div></div><span class="pill st-${l.st}">${lab[l.st]||l.st}</span></div>`).join(''):'<div class="m">No requests yet.</div>'}
  ${H.length?`<h2 style="margin-top:14px">Bank holiday TOIL</h2>${H.map(h=>holRow(h,false)).join('')}`:''}</div>`}
function lu(){const f=fv('l-f')=='1';document.getElementById('l-tm').style.display=f?'none':'';const m=f?STD:hm(fv('l-b'))-hm(fv('l-a'));
  document.getElementById('lm').textContent=m>0?`${f?'Full day':'Partial'}: ${fm(Math.min(STD,m))} · deducted from ${fv('l-t')} once Approved`:'End time must be after start time.';
  warn=false;wn('');document.getElementById('sv').textContent=lvId?'Save changes':'Submit request'}
function saveL(){const f=fv('l-f')=='1',d=fromIso(fv('l-d')),a=fv('l-a'),b=fv('l-b'),t=fv('l-t'),st=fv('l-s'),m=f?STD:hm(b)-hm(a);
  if(isNaN(d))return wn('Pick a date.');
  if(!f&&!(m>0))return wn('End time must be after start time.');
  if(leaves.some(x=>x.d==d&&x.id!=lvId&&x.st!='Denied'&&(f||x.full||(hm(a)<hm(x.e)&&hm(b)>hm(x.s)))))return wn('This overlaps another leave request that day.');
  const need=Math.min(STD,m),avail=bal(t)-used(t,lvId),msgs=[];
  if(st!='Denied'&&need>avail)msgs.push(`Only ${fm(Math.max(0,avail))} ${t} left; this needs ${fm(need)}.`);
  if(st!='Denied'&&f&&hol(d)&&S[d])msgs.push(`${hol(d).name} is a bank holiday you are scheduled to work. A full-day ${t} request means no TOIL day.`);
  if(msgs.length&&!warn){warn=true;document.getElementById('sv').textContent='Submit anyway';return wn('⚠ '+msgs.join(' '))}
  const rec={id:lvId||newId(),d,type:t,full:f,s:f?null:a,e:f?null:b,st};
  if(lvId)leaves[leaves.findIndex(x=>x.id==lvId)]=rec;else leaves.push(rec);pL(rec);goto(d);col=false;showOk('Leave saved');closeM()}
function delL(){const b=document.getElementById('dl');if(!dl){dl=true;b.textContent='Tap again to confirm delete';return}xL(lvId);leaves=leaves.filter(x=>x.id!=lvId);closeM()}
function leaveHTML(){const l=lvId?leaves.find(x=>x.id==lvId):null,d=l?l.d:sel,sh=S[d],x=l||{type:'PTO',full:true,s:sh?sh.s:'09:00',e:sh?sh.e:'11:00',st:'Review'};
  const o=(arr,v)=>arr.map(a=>`<option value="${a[0]}" ${a[0]==v?'selected':''}>${a[1]}</option>`).join('');
  return `<div class="ov" onclick="if(event.target==this)closeM()"><div class="mod" id="md"><div class="grab" id="mg"></div><h2>${l?'Edit leave · '+fd(l.d):'Request leave'}</h2>
  <div class="two"><div class="f"><label>Date</label><input id="l-d" type="date" value="${iso(d)}" oninput="lu()"></div>
  <div class="f"><label>Type</label><select id="l-t" onchange="lu()">${o([['PTO','PTO'],['TOIL','TOIL'],['Sick','Sick']],x.type)}</select></div>
  <div class="f"><label>Duration</label><select id="l-f" onchange="lu()">${o([['1','Full day'],['0','Partial (set times)']],x.full?'1':'0')}</select></div>
  <div class="f"><label>Status</label><select id="l-s" ${l?'':'disabled'}>${o([['Review','Under Review'],['Approved','Approved'],['Denied','Denied']],x.st)}</select></div></div>
  <div class="two" id="l-tm"><div class="f"><label>Start</label><input id="l-a" type="time" value="${x.s||'09:00'}" oninput="lu()"></div><div class="f"><label>End</label><input id="l-b" type="time" value="${x.e||'11:00'}" oninput="lu()"></div></div>
  <div id="lm" class="m" style="margin-top:8px"></div><div id="wn" class="bad m" style="margin-top:4px;min-height:16px"></div>
  <button class="btn" id="sv" onclick="saveL()">${l?'Save changes':'Submit request'}</button>${l?'<button class="btn" id="dl" style="background:var(--red)" onclick="delL()">Delete request</button>':''}</div></div>`}
function setBal(k,v){const m=String(v).trim().match(/^(\d{1,4})(?::([0-5]\d))?$/);if(m){base[k]=+m[1]*60+(+m[2]||0);pB()}draw()}
function syncCard(){const y=window.SYNC||{};let t,m,b='';
  if(!y.configured){t='Cloud sync not set up';m='Add your Firebase settings to js/firebase-config.js (see docs/SETUP.md). The app works fully offline without it.'}
  else if(!y.user){t='Not signed in';m=y.error?'⚠ '+esc(y.error):'Sign in with Google to back up and sync your data across devices.';b='<button class="btn" onclick="SYNC.signIn()">Sign in with Google</button>'}
  else{t=({ok:'● Synced',syncing:'Syncing…',error:'⚠ Sync problem'})[y.status]||'Cloud sync';m=esc(y.user.email||'')+(y.last?' · last sync '+new Date(y.last).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):'')+(y.error?' · '+esc(y.error):'');b='<button class="btn" onclick="SYNC.now()">Sync now</button><button class="btn" style="background:#8a97b8" onclick="SYNC.signOut()">Sign out</button>'}
  return `<div class="card"><div class="t">${t}</div><div class="m">${m}</div>${b}</div>`}
const SH={get(){try{return JSON.parse(localStorage.getItem('sc-sheets')||'{}')}catch(e){return{}}},set(v){try{localStorage.setItem('sc-sheets',JSON.stringify(v))}catch(e){}}};
const rowsData=()=>tsv().split('\n').map(l=>l.split('\t'));
function sheetsCard(){const c=SH.get();return `<div class="card"><div class="t">Push to a Google Sheet</div><div class="m">Optional. Paste your Apps Script web-app URL and secret (see docs/APPS-SCRIPT.md). Stored on this device only, never synced.</div>
  <div class="f"><input id="sh-u" placeholder="https://script.google.com/macros/s/…/exec" value="${esc(c.url||'')}"></div><div class="f"><input id="sh-k" type="password" placeholder="Secret" value="${esc(c.key||'')}"></div>
  <div id="sh-m" class="m" style="min-height:16px;margin-top:6px"></div><button class="btn" onclick="pushSheet()">Save &amp; push now</button></div>`}
async function pushSheet(){const u=fv('sh-u').trim(),k=fv('sh-k').trim(),m=document.getElementById('sh-m');
  if(!/^https:\/\/script\.google\.com\//.test(u)){m.className='bad m';m.textContent='Enter the https://script.google.com/… web-app URL.';return}
  SH.set({url:u,key:k});m.className='m';m.textContent='Sending…';
  try{const r=await fetch(u,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({key:k,rows:rowsData()})}),j=await r.json();
    m.className=(j.ok?'ok':'bad')+' m';m.textContent=j.ok?'Sheet updated: '+j.rows+' rows.':'Rejected: '+(j.error||'unknown error')}
  catch(e){m.className='bad m';m.textContent='Could not confirm. Check you are online, the URL is right, and the deployment allows “Anyone”.'}}
function rules(){const st=(k,l,min,max)=>`<div class="card row"><div class="t">${l}</div><div class="step"><button onclick="R.${k}=Math.max(${min},R.${k}-${k=='commute'?5:1});pM();draw()">−</button><b>${R[k]}${k=='commute'?' min':''}</b><button onclick="R.${k}=Math.min(${max},R.${k}+${k=='commute'?5:1});pM();draw()">+</button></div></div>`;
  return `<div class="dark"><div class="bar"><span></span><span>Rules & Settings</span><span></span></div><div class="sub">Week runs Sunday → Saturday</div></div><div class="page">
  <button class="btn" style="margin:0 0 6px" onclick="openStats()">Statistics &amp; charts</button>${installCard()}
  <h2 style="margin-top:14px">Shift types</h2><div class="m" style="margin-bottom:8px">Your usual shifts. The calendar shows each one's letter and colour; any other hours, or a shift with partial leave, shows C.</div>${TYPES.map((x,i)=>`<div class="card row" onclick="openTy(${i})" style="cursor:pointer"><div class="trow"><u class="tdot" style="background:${x.c}">${esc(x.l)}</u><div><div class="t">${esc(x.n)}</div><div class="m">${x.s}–${x.e}</div></div></div><span class="m">Edit</span></div>`).join('')}<button class="btn" onclick="openTy(null)">Add shift type</button>
  <h2 style="margin-top:14px">Limits</h2><div class="m" style="margin-bottom:8px">Approved full-day leave doesn't count as a workday. Partial leave still does. A week counts toward the month it ends in (Saturday).</div>${st('week','Max workdays / week',1,7)}${st('cons','Max consecutive days',1,14)}${st('sixPerMonth','6-day weeks / month',0,5)}
  <h2>Commute</h2>${st('commute','Travel time to work',5,180)}<div class="m">Used for the “Leave by” reminder on each shift.</div>
  <h2 style="margin-top:14px">Reminders</h2>${notifCard()}${calCard()}
  <h2 style="margin-top:14px">Bank holidays</h2><div class="m" style="margin-bottom:8px">Scheduled to work a bank holiday? You earn 1 TOIL day (7h 48m) once the day arrives. Take a full day of leave (PTO, TOIL or sick) on it and you earn none; partial leave does not count. Add the dates for your region.</div>${[...holidays].sort((a,b)=>a.d-b.d).map(h=>holRow(h,true)).join('')||'<div class="m">No bank holidays added yet.</div>'}
  <div class="two"><button class="btn" onclick="openBH(null)">Add holiday</button><button class="btn" style="background:#8a97b8" onclick="modal='bhm';draw()">Add several</button></div>
  <h2 style="margin-top:14px">Opening balances</h2><div class="m" style="margin-bottom:8px">Hours:minutes you had before using this app (e.g. 36:12). Approved leave is deducted from these. TOIL earned on the bank holidays below is added automatically, so leave it out of the TOIL figure.</div>${['PTO','TOIL','Sick'].map(k=>`<div class="card row"><div class="t">${k}</div><input style="width:110px;text-align:right" value="${Math.floor(base[k]/60)}:${pad(base[k]%60)}" onchange="setBal('${k}',this.value)"></div>`).join('')}
  <h2 style="margin-top:14px">Sync</h2><div class="card"><div class="t">${dbOk?'● Saved on this device':'⚠ Not saved: storage unavailable'}</div><div class="m">${dbOk?'Every change is written to this device straight away and works offline.':'This browser is blocking local storage, so changes will be lost when the page reloads.'}</div></div>${syncCard()}
  <h2 style="margin-top:14px">Google Sheets</h2>${sheetsCard()}<h2 style="margin-top:14px">Data</h2><button class="btn" onclick="modal='exp';draw()">Export for payroll (Google Sheets)</button><button class="btn" style="background:#8a97b8" onclick="saveBackup()">Download a backup (JSON)</button><button class="btn" style="background:#8a97b8" onclick="demo()">Load demo data</button><button class="btn" id="clr" style="background:var(--red)" onclick="clr()">Clear all data</button></div>`}
// ---------- shift type editor ----------
let tyId=null,tyC=TYPE_COLORS[2],tyDel=false;
function openTy(i){tyId=i;tyDel=false;tyC=i==null?(TYPE_COLORS.find(c=>!TYPES.some(x=>x.c==c))||TYPE_COLORS[0]):TYPES[i].c;modal='ty';draw()}
function pickC(c){tyC=c;document.querySelectorAll('.sw8 button').forEach(b=>b.classList.toggle('on',b.dataset.c==c))}
function tyHTML(){const x=tyId==null?{n:'',l:'',s:'08:00',e:'16:00'}:TYPES[tyId];
  return `<div class="ov" onclick="if(event.target==this)closeM()"><div class="mod" id="md"><div class="grab" id="mg"></div><h2>${tyId==null?'New shift type':'Edit shift type'}</h2>
  <div class="two"><div class="f"><label>Name</label><input id="t-n" maxlength="16" value="${esc(x.n)}" placeholder="Night shift"></div><div class="f"><label>Letter</label><input id="t-l" maxlength="2" value="${esc(x.l)}" placeholder="N" style="text-transform:uppercase"></div>
  <div class="f"><label>Start</label><input id="t-a" type="time" value="${x.s}"></div><div class="f"><label>End</label><input id="t-b" type="time" value="${x.e}"></div></div>
  <div class="f"><label>Colour</label><div class="sw8">${TYPE_COLORS.map(c=>`<button type="button" data-c="${c}" aria-label="${c}" class="${c==tyC?'on':''}" style="background:${c}" onclick="pickC('${c}')"></button>`).join('')}</div></div>
  <div id="wn" class="bad m" style="margin-top:8px;min-height:16px"></div><button class="btn" onclick="saveTy()">Save</button>${tyId!=null?'<button class="btn" id="tdl" style="background:var(--red)" onclick="delTy()">Delete shift type</button>':''}</div></div>`}
function saveTy(){const n=fv('t-n').trim(),l=(fv('t-l').trim()||n.slice(0,1)).toUpperCase().slice(0,2),a=fv('t-a'),b=fv('t-b');
  if(!n)return wn('Give the shift a name.');if(!l)return wn('Pick a letter.');if(l=='C')return wn('C is reserved for customized shifts.');
  if(!a||!b||b<=a)return wn('Pick an end time after the start.');
  if(TYPES.some((x,i)=>i!=tyId&&x.l==l))return wn('Letter '+l+' is used by another shift type.');
  if(TYPES.some((x,i)=>i!=tyId&&x.s==a&&x.e==b))return wn('Another shift type already has these hours.');
  const rec={id:tyId==null?'t'+Date.now().toString(36):TYPES[tyId].id,n,l,s:a,e:b,c:tyC};
  if(tyId==null){if(TYPES.length>=8)return wn('Up to 8 shift types.');TYPES.push(rec)}else TYPES[tyId]=rec;
  pT();showOk('Saved');closeM()}
function delTy(){const b=document.getElementById('tdl');if(!tyDel){tyDel=true;b.textContent='Tap again to confirm. Shifts keep their times and show C.';return}TYPES.splice(tyId,1);pT();closeM()}

// ---------- statistics ----------
const SC={hrs:'#2a78d6',toil:'#1baf7a',pto:'#4a3aa7',Sick:'#eb6834'};
let stY=_n.getFullYear(),stM=_n.getMonth(),stSel=_n.getMonth();
const fh=m=>Math.floor(m/60)+'h '+pad(Math.round(m%60))+'m';
function monthStats(y,m){const a=E(y,m,1),z=E(y,m+1,1)-1,types={};let mins=0,done=0,n=0;
  work.forEach(d=>{if(d<a||d>z)return;const s=S[d];if(!s||s.st=='Denied'||off(d))return;
    let q=hm(s.e)-hm(s.s);leaves.forEach(l=>{if(l.d==d&&!l.full&&l.st!='Denied')q-=dur(l)});q=Math.max(0,q);
    mins+=q;if(d<=TODAY)done+=q;n++;const k=kind(d);types[k]=(types[k]||0)+1});
  return{mins,done,n,types}}
function limitStats(y,m){const w=new Set(work.filter(x=>S[x].st!='Denied'&&!off(x))),a=E(y,m,1),z=E(y,m+1,1)-1;let six=0,maxWk=0,best=0,run=0,start=0;
  for(let sat=a+((6-dow(a)+7)%7);sat<=z;sat+=7){let c=0;for(let i=0;i<7;i++)if(w.has(sat-i))c++;maxWk=Math.max(maxWk,c);if(c>=6)six++}
  for(let d=a-14;d<=z+14;d++){if(w.has(d)){if(!run)start=d;run++;if(d>=a&&start<=z&&run>best)best=run}else run=0}
  return{six,maxWk,best}}
const takenYear=(k,y)=>leaves.filter(l=>l.type==k&&l.st=='Approved'&&UD(l.d).getUTCFullYear()==y).reduce((s,l)=>s+dur(l),0);
const toilMonth=(y,m)=>holidays.filter(h=>holState(h)=='earned'&&UD(h.d).getUTCFullYear()==y&&UD(h.d).getUTCMonth()==m).length*TOIL_DAY;
const niceStep=v=>{const r=(v||1)/3,p=10**Math.floor(Math.log10(r)),f=r/p;return(f<=1?1:f<=2?2:f<=5?5:10)*p};
function barSvg(vals,lab,o){const W=330,H=164,L=34,T=24,B=22,n=vals.length,mx=Math.max(...vals,o.floor||1),step=niceStep(mx),top=Math.ceil(mx/step-1e-9)*step||step,ih=H-T-B,iw=W-L-4,bw=Math.min(18,iw/n-6);
  let g='',b='',x='';
  for(let q=0;q<=top+1e-9;q+=step){const y=T+ih-q/top*ih;g+=`<line x1="${L}" x2="${W-4}" y1="${y}" y2="${y}" class="gl"/><text x="${L-6}" y="${y+3}" class="ax" text-anchor="end">${Math.round(q*10)/10}</text>`}
  vals.forEach((v,i)=>{const cx=L+(i+.5)*iw/n,h=v/top*ih,y=T+ih-h,r=Math.min(4,h/2);
    if(v>0)b+=`<path d="M${cx-bw/2},${T+ih}V${y+r}a${r},${r} 0 0 1 ${r},-${r}h${bw-2*r}a${r},${r} 0 0 1 ${r},${r}V${T+ih}z" fill="${o.color}"/>`;
    x+=`<text x="${cx}" y="${H-6}" class="ax${i==o.sel?' on':''}" text-anchor="middle">${lab[i]}</text>`;
    if(i==o.sel&&v>0)x+=`<text x="${cx}" y="${y-6}" class="vl" text-anchor="middle">${o.fmt(v)}</text>`;
    b+=`<rect x="${cx-iw/n/2}" y="${T-8}" width="${iw/n}" height="${ih+B+8}" fill="transparent" onclick="${o.pick}(${i})" style="cursor:pointer"/>`});
  return `<svg viewBox="0 0 ${W} ${H}" class="bc" role="img" aria-label="${esc(o.aria)}">${g}${b}${x}</svg>`}
function donutSvg(parts){const tot=parts.reduce((s,p)=>s+p.v,0),C=2*Math.PI*43;let acc=0,s='';
  if(!tot)return '<div class="m">No shifts this year.</div>';
  parts.filter(p=>p.v>0).forEach(p=>{const L=p.v/tot*C,len=Math.max(L-2,.01);s+=`<circle cx="60" cy="60" r="43" fill="none" stroke="${p.c}" stroke-width="18" stroke-dasharray="${len} ${C-len}" stroke-dashoffset="${-acc}" transform="rotate(-90 60 60)"/>`;acc+=L});
  return `<svg viewBox="0 0 120 120" class="dn" role="img" aria-label="Shift mix">${s}<text x="60" y="58" text-anchor="middle" class="dnv">${tot}</text><text x="60" y="72" text-anchor="middle" class="ax">shifts</text></svg>`}
const limRow=(label,v,max,unit)=>{const r=max?v/max:(v?2:0),st=r>1?'bad':r==1?'warn':'ok',ico={bad:'✕',warn:'!',ok:'✓'}[st],txt={bad:'Over limit',warn:'At limit',ok:'Within limit'}[st];
  return `<div class="lim"><div class="row"><span class="t">${label}</span><span class="lst ${st}">${ico} ${txt}</span></div><div class="meter"><i class="${st}" style="transform:scaleX(${Math.min(1,r)})"></i></div><div class="m">${v} of ${max} ${unit}</div></div>`};
function openStats(){stY=vm.y;stM=vm.m;stSel=vm.m;modal='stats';draw()}
function keepDraw(){const m=document.getElementById('md'),q=m&&m.scrollTop;draw();const n=document.getElementById('md');if(n&&q)n.scrollTop=q}
function stYear(k){stY+=k;stSel=stY==_n.getFullYear()?_n.getMonth():0;keepDraw()}
function stPick(i){stSel=i;keepDraw()}
function stMon(k){let m=stM+k,y=stY;if(m<0){m=11;y--}if(m>11){m=0;y++}stM=m;if(y!=stY){stY=y;stSel=y==_n.getFullYear()?_n.getMonth():0}keepDraw()}
function statsHTML(){const MS=[...Array(12)].map((_,m)=>monthStats(stY,m)),yr=MS.reduce((s,x)=>({mins:s.mins+x.mins,done:s.done+x.done,n:s.n+x.n}),{mins:0,done:0,n:0}),sel=MS[stSel],ML=MON.map(x=>x[0]);
  const mix={};MS.forEach(x=>Object.keys(x.types).forEach(k=>mix[k]=(mix[k]||0)+x.types[k]));
  const parts=[...TYPES.map(x=>({v:mix[x.l]||0,c:x.c,l:x.n+' ('+x.l+')'})),{v:mix.C||0,c:CUSTOM_C,l:'Custom (C)'}];
  const toilM=[...Array(12)].map((_,m)=>toilMonth(stY,m)),ls=limitStats(stY,stM);
  const tile=(l,v,c)=>`<div class="tile"><small>${l}</small><b style="color:${c||'inherit'}">${v}</b></div>`;
  const lrow=k=>{const tk=takenYear(k,stY),left=Math.max(0,rem(k)),tot=tk+left,c=k=='PTO'?SC.pto:k=='TOIL'?SC.toil:SC.Sick;
    return `<div class="lim"><div class="row"><span class="t">${k}</span><span class="m">${fh(tk)} taken · ${fh(left)} left</span></div><div class="meter"><i style="background:${c};transform:scaleX(${tot?tk/tot:0})"></i></div></div>`};
  return `<div class="ov" onclick="if(event.target==this)closeM()"><div class="mod full" id="md"><div class="grab" id="mg"></div>
  <div class="row"><h2 style="margin:0">Statistics</h2><button class="xbtn" aria-label="Close" onclick="closeM()">✕</button></div>
  <div class="yr"><button onclick="stYear(-1)" aria-label="Previous year">‹</button><b>${stY}</b><button onclick="stYear(1)" aria-label="Next year">›</button></div>
  <div class="tiles">${tile('Scheduled',fh(yr.mins),SC.hrs)}${tile('Worked so far',fh(yr.done))}${tile('Shifts',yr.n)}</div>
  <h3>Hours per month</h3><div class="m">Scheduled hours, minus partial leave and approved full-day leave. Tap a bar.</div>
  ${barSvg(MS.map(x=>x.mins/60),ML,{color:SC.hrs,sel:stSel,pick:'stPick',floor:10,fmt:v=>Math.round(v*10)/10+'h',aria:'Scheduled hours per month in '+stY})}
  <div class="readout" aria-live="polite">${MON[stSel]} ${stY} · <b>${fh(sel.mins)}</b> scheduled · ${sel.n} shifts · ${fh(sel.done)} worked so far</div>
  <h3>Shift mix in ${stY}</h3><div class="mix">${donutSvg(parts)}<div class="mixl">${parts.filter(p=>p.v>0).map(p=>`<div><u style="background:${p.c}"></u>${esc(p.l)}<b>${p.v}</b></div>`).join('')||''}</div></div>
  <h3>TOIL</h3><div class="tiles">${tile('Balance now',fh(Math.max(0,rem('TOIL'))),SC.toil)}${tile('Earned in '+stY,fh(toilM.reduce((a,b)=>a+b,0)))}${tile('Taken in '+stY,fh(takenYear('TOIL',stY)))}</div>
  <div class="m">Hours earned on bank holidays you worked, per month.</div>
  ${toilM.some(x=>x)?barSvg(toilM.map(x=>x/60),ML,{color:SC.toil,sel:-1,pick:'stPick',floor:8,fmt:v=>Math.round(v*10)/10+'h',aria:'TOIL hours earned per month in '+stY}):'<div class="readout">No TOIL earned in '+stY+' yet.</div>'}
  <h3>Leave taken in ${stY}</h3>${['PTO','TOIL','Sick'].map(lrow).join('')}
  <h3>Statutory limits</h3><div class="yr"><button onclick="stMon(-1)" aria-label="Previous month">‹</button><b>${MON[stM]} ${stY}</b><button onclick="stMon(1)" aria-label="Next month">›</button></div>
  ${limRow('Six-day weeks',ls.six,R.sixPerMonth,'allowed this month')}${limRow('Busiest week',ls.maxWk,R.week,'workdays allowed per week')}${limRow('Longest run',ls.best,R.cons,'days in a row allowed')}
  <details class="tbl"><summary>View data as a table</summary><table><tr><th>Month</th><th>Hours</th><th>Shifts</th><th>TOIL</th></tr>${MS.map((x,m)=>`<tr><td>${MON[m]}</td><td>${fh(x.mins)}</td><td>${x.n}</td><td>${toilM[m]?fh(toilM[m]):'–'}</td></tr>`).join('')}</table></details>
  </div></div>`}

// ---------- install as an app ----------
let instEv=null;
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();instEv=e;window.redraw&&window.redraw()});
window.addEventListener('appinstalled',()=>{instEv=null;window.redraw&&window.redraw()});
const standalone=()=>{try{return matchMedia('(display-mode: standalone)').matches||navigator.standalone===true}catch(e){return false}};
async function doInstall(){if(!instEv)return;try{instEv.prompt();await instEv.userChoice}catch(e){}instEv=null;draw()}
function installCard(){const sa=standalone();
  return `<div class="card" style="margin-top:10px"><div class="t">${sa?'✓ Running as an installed app':'Install on this phone'}</div>`+
   (sa?'<div class="m">You are using the installed app. It works offline.</div>':
    instEv?'<div class="m">Adds Shift Companion to your app list and opens it full screen. Works offline.</div><button class="btn" onclick="doInstall()">Install app</button>':
    '<div class="m">Chrome menu (⋮) → <b>Install app</b> or <b>Add to Home screen</b>. If Chrome says it is already installed, search your app list for “Shift”; it may be labelled “Shifts” or “Shift Companion”. If it truly is not there, Chrome may have only saved a shortcut: remove it and install again.</div>')+`</div>`}

// ---------- success tick ----------
function showOk(msg){try{const o=document.getElementById('okp');if(o)o.remove();const el=document.createElement('div');el.id='okp';el.className='okp';el.setAttribute('role','status');
  el.innerHTML='<svg viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="23"/><path d="M15 27l8 8 15-17"/></svg><span></span>';el.lastChild.textContent=msg||'Done';document.body.appendChild(el);setTimeout(()=>el.remove(),1600)}catch(e){}}

function drag(h,el,o){let y0=null,b=0,cur=0;
  h.onpointerdown=e=>{y0=e.clientY;b=o.base();cur=b;h.setPointerCapture(e.pointerId);el.style.transition='none'};
  h.onpointermove=e=>{if(y0==null)return;cur=Math.min(o.max(),Math.max(0,b+e.clientY-y0));el.style.transform=`translateY(${cur}px)`};
  h.onpointerup=e=>{if(y0==null)return;const mv=Math.abs(e.clientY-y0);y0=null;el.style.transition='transform .45s cubic-bezier(.34,1.5,.64,1)';o.end(cur-b,mv,cur)}}
function wire(){const sh=document.getElementById('sh');
  if(sh){const off=()=>sh.offsetHeight-124,pos=()=>sh.style.transform=col?`translateY(${off()}px)`:'translateY(0)';
    sh.style.transition='none';pos();
    drag(document.getElementById('gr'),sh,{base:()=>col?off():0,max:off,end:(dy,mv)=>{const o=col;col=mv<4?!col:col?!(dy<-60):dy>60;if(o!=col)draw();else pos()}})}
  const md=document.getElementById('md');
  if(md)drag(document.getElementById('mg'),md,{base:()=>0,max:()=>md.offsetHeight,end:(dy,mv,cur)=>cur>110?closeM():md.style.transform='translateY(0)'})}
function closeM(){const md=document.getElementById('md'),ov=md&&md.parentNode,fb=document.querySelector('.fab');if(fb)fb.classList.remove('x');if(md){md.style.transition='transform .3s cubic-bezier(.6,-.28,.735,.045)';md.style.transform='translateY(100%)'}if(ov){ov.style.transition='opacity .3s ease';ov.style.opacity='0'}setTimeout(()=>{modal=false;warn=false;editing=null;dl=false;imp=null;impDone='';lvId=null;swId=null;bhId=null;tyId=null;draw()},300)}
const fv=i=>document.getElementById(i).value,wn=t=>{document.getElementById('wn').textContent=t};
function save(){const ed=editing,d=ed||fromIso(fv('f-d')),a=fv('f-a'),b=fv('f-b');
  if(isNaN(d)||!a||!b||b<=a)return wn('Pick a date and an end time after the start.');
  if(!ed&&work.includes(d))return wn('A shift already exists on '+fd(d)+'. Tap that date and use Edit.');
  const e=ed?[]:check(d).concat(off(d)?['You have approved full-day leave on this day']:[]);
  if(e.length&&!warn){warn=true;document.getElementById('sv').textContent='Save anyway';return wn('⚠ '+e.join(' · '))}
  if(!ed){work.push(d);work.sort((x,y)=>x-y)}
  S[d]={...(S[d]||{f:''}),s:a,e:b,st:fv('f-s')};pS(d);goto(d);col=false;showOk('Shift saved');closeM()}
function delShift(){const b=document.getElementById('dl');
  if(!dl){dl=true;b.textContent='Tap again to confirm delete';return}
  xS(editing);delete S[editing];work.splice(work.indexOf(editing),1);closeM()}
const typeNow=(s,e)=>TYPES.find(x=>x.s==s&&x.e==e);
function syncQp(){const a=document.getElementById('f-a'),b=document.getElementById('f-b');if(!a||!b)return;const c=typeNow(a.value,b.value);document.querySelectorAll('#qp button').forEach(x=>x.classList.toggle('on',!!c&&x.dataset.id==c.id))}
function qp(id){const x=TYPES.find(y=>y.id==id);if(!x)return;document.getElementById('f-a').value=x.s;document.getElementById('f-b').value=x.e;syncQp()}
function modalHTML(){const ed=editing,d0=TYPES[0]||{s:'08:00',e:'16:00'},x=ed?S[ed]:{s:d0.s,e:d0.e,st:'Scheduled',p:0},dv=ed||sel,cur=typeNow(x.s,x.e);
  const opts=[['Scheduled','Scheduled'],['Planned','Planned'],['Review','Under Review'],['Approved','Approved']].map(o=>`<option value="${o[0]}" ${o[0]==x.st?'selected':''}>${o[1]}</option>`).join('');
  return `<div class="ov" onclick="if(event.target==this)closeM()"><div class="mod pad" id="md"><div class="grab" id="mg"></div><h2>${ed?'Edit shift · '+fd(ed):'Add shift'}</h2>
  <div class="qp" id="qp">${TYPES.map(y=>`<button type="button" data-id="${y.id}" class="${cur&&cur.id==y.id?'on':''}" style="--c:${y.c}" onclick="qp('${y.id}')">${esc(y.l)} · ${esc(y.n)}<small>${y.s}–${y.e}</small></button>`).join('')}</div><div class="two"><div class="f"><label>Date</label><input id="f-d" type="date" value="${iso(dv)}" ${ed?'disabled':''}></div>
  <div class="f"><label>Status</label><select id="f-s">${opts}</select></div>
  <div class="f"><label>Start</label><input id="f-a" type="time" value="${x.s}" oninput="syncQp()"></div><div class="f"><label>End</label><input id="f-b" type="time" value="${x.e}" oninput="syncQp()"></div></div>
  <div id="wn" class="bad m" style="margin-top:8px;min-height:16px"></div><button class="btn" id="sv" onclick="save()">${ed?'Save changes':'Save shift'}</button>${ed?'<button class="btn" id="dl" style="background:var(--red)" onclick="delShift()">Delete shift</button>':''}</div></div>`}
const EX='Date,Start Time,End Time,Status\n2026-10-03,08:50,16:38,Scheduled\n2026-10-07,09:22,17:10,Planned\n2026-10-05,08:50,16:38,Scheduled\n2026-11-02,08:50,16:38,Scheduled';
const SM={scheduled:'Scheduled',planned:'Planned',review:'Review',underreview:'Review',approved:'Approved',completed:'Approved'};
const esc=t=>String(t).replace(/[<>&"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c])),pad=n=>String(n).padStart(2,'0'),tm=n=>pad(Math.floor(n/60))+':'+pad(n%60);
const pick=(o,k)=>{const key=Object.keys(o).find(x=>x.toLowerCase().replace(/[^a-z]/g,'').startsWith(k));return key===undefined?'':o[key]};
function csv(t){const L=t.trim().split(/\r?\n/).filter(x=>x.trim());if(L.length<2)return[];const dl=[',',';','\t'].sort((a,b)=>L[0].split(b).length-L[0].split(a).length)[0];const sp=l=>l.split(dl).map(c=>c.trim().replace(/^"|"$/g,''));const H=sp(L[0]);return L.slice(1).map(l=>{const c=sp(l),o={};H.forEach((h,i)=>o[h]=c[i]??'');return o})}
function pd(v){let y,m,d,r;if(typeof v=='number'){const t=new Date(Date.UTC(1899,11,30)+Math.floor(v)*864e5);y=t.getUTCFullYear();m=t.getUTCMonth()+1;d=t.getUTCDate()}else{const q=String(v).trim();if(r=q.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)){y=+r[1];m=+r[2];d=+r[3]}else if(r=q.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})/)){d=+r[1];m=+r[2];y=+r[3]<100?2000+ +r[3]:+r[3]}else return null}return{y,m,d}}
function pt(v){if(typeof v=='number')return Math.round((v%1)*1440);const r=String(v).trim().match(/^(\d{1,2})[:.h](\d{2})\s*(am|pm)?$/i);if(!r)return null;let h=+r[1];const m=+r[2];if(r[3])h=h%12+(/pm/i.test(r[3])?12:0);return h>23||m>59?null:h*60+m}
function pp(v){if(v===''||v==null)return 0;if(typeof v=='number')return Math.min(STD,Math.round(v*60));const t=String(v).trim().replace(',','.'),r=t.match(/^(\d+):(\d{2})$/);if(r)return Math.min(STD,+r[1]*60+ +r[2]);return isNaN(+t)?NaN:Math.min(STD,Math.round(+t*60))}
function build(objs){const seen=new Set();imp=[];impDone='';objs.forEach((o,i)=>{if(!Object.values(o).some(v=>String(v).trim()))return;
  const dt=pd(pick(o,'date')),a=pt(pick(o,'start')),b=pt(pick(o,'end')),sr=String(pick(o,'status')).trim(),st=sr?SM[sr.toLowerCase().replace(/[^a-z]/g,'')]:'Scheduled',p=0;
  const r={lab:dt?`${dt.y}-${pad(dt.m)}-${pad(dt.d)}`:'Row '+(i+2),d:dt&&UD(E(dt.y,dt.m-1,dt.d)).getUTCDate()==dt.d?E(dt.y,dt.m-1,dt.d):0,s:a,e:b,st,p,err:'',kind:'',act:'skip'};
  if(!dt)r.err='Unreadable date';else if(!r.d)r.err='Not a real calendar date';
  else if(a==null||b==null)r.err='Unreadable start or end time';else if(b<=a)r.err='End must be after start (overnight not supported yet)';
  else if(!st)r.err=/^denied$/i.test(sr)?'Shifts cannot be Denied (the company sets the schedule)':'Unknown status "'+sr+'"';else if(isNaN(p))r.err='Unreadable partial hours';else if(seen.has(r.d))r.err='Duplicate date in file';
  if(!r.err){seen.add(r.d);r.kind=work.includes(r.d)?'conflict':'new'}imp.push(r)})}
const iw=t=>{const e=document.getElementById('iw');if(e)e.textContent=t};
function pv(){const o=csv(document.getElementById('imp-t').value);if(!o.length)return iw('Paste a header row and at least one data row.');build(o);draw()}
function readFile(f){if(!f)return;const x=/\.xlsx?$/i.test(f.name),rd=new FileReader();
  rd.onload=()=>{try{let o;if(x){if(typeof XLSX=='undefined')return iw('Excel reader did not load. Save as CSV and try again.');const wb=XLSX.read(rd.result,{type:'array'});o=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:'',raw:true})}else o=csv(rd.result);if(!o.length)return iw('No data rows found.');build(o);draw()}catch(e){iw('Could not read that file.')}};
  x?rd.readAsArrayBuffer(f):rd.readAsText(f)}
const cnt=()=>imp.filter(r=>!r.err&&(r.kind=='new'||r.act=='replace')).length;
function ub(){const n=cnt(),b=document.getElementById('ib');b.textContent=`Import ${n} shift${n==1?'':'s'}`;b.disabled=!n}
function doImport(){let a=0,rp=0;imp.forEach(r=>{if(r.err||(r.kind=='conflict'&&r.act!='replace'))return;if(r.kind=='new'){work.push(r.d);a++}else rp++;S[r.d]={...(S[r.d]||{f:''}),s:tm(r.s),e:tm(r.e),st:r.st};pS(r.d)});work.sort((x,y)=>x-y);
  const bad=work.filter(x=>S[x].st!='Denied'&&!off(x)&&check(x).length);
  impDone=`Added ${a}, replaced ${rp}. `+(bad.length?`⚠ These days break your limits: ${bad.map(fd).join(', ')}.`:'All days are within your limits.');imp=null;draw();showOk('Imported '+(a+rp))}
// ---------- import template ----------
const TPL_INFO=[['Shift Companion schedule template'],[],['Fill in the Schedule sheet (one row per shift), save the file, then import it from Schedule > Import.'],[],
  ['Date','YYYY-MM-DD or DD/MM/YYYY. A normal Excel date also works.'],['Start Time','24-hour time, e.g. 08:50'],['End Time','24-hour time, later than the start (shifts cannot cross midnight yet)'],
  ['Status','Optional. Scheduled (default), Planned, Under Review or Approved'],[],
  ['One shift per date. If a date already exists in the app you choose Keep existing or Replace in the preview, and nothing is saved until you confirm.'],
  ['Leave, partial time off and swaps are not part of this file. Use the Leave and Swaps tabs.'],['The three example rows are only examples: change or delete them.']];
const tplRows=()=>[[TODAY+1,'08:50','16:38','Scheduled'],[TODAY+2,'09:22','17:10','Scheduled'],[TODAY+3,'08:50','16:38','Planned']];
const tplCsv=()=>'Date,Start Time,End Time,Status\r\n'+tplRows().map(r=>[iso(r[0]),r[1],r[2],r[3]].join(',')).join('\r\n')+'\r\n';
function tplWorkbook(){const rows=tplRows(),ws=XLSX.utils.aoa_to_sheet([['Date','Start Time','End Time','Status'],...rows.map(r=>[r[0]+25569,hm(r[1])/1440,hm(r[2])/1440,r[3]])]);   // 25569 = Excel serial of 1970-01-01
  rows.forEach((_,i)=>{ws['A'+(i+2)].z='yyyy-mm-dd';ws['B'+(i+2)].z='hh:mm';ws['C'+(i+2)].z='hh:mm'});
  ws['!cols']=[{wch:13},{wch:11},{wch:11},{wch:14}];const info=XLSX.utils.aoa_to_sheet(TPL_INFO);info['!cols']=[{wch:14},{wch:84}];
  const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Schedule');XLSX.utils.book_append_sheet(wb,info,'Instructions');return wb}
function saveBlob(parts,type,name){const u=URL.createObjectURL(new Blob(parts,{type})),a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),2000)}
function dlTpl(kind){if(kind=='csv')return saveBlob([tplCsv()],'text/csv;charset=utf-8','shift-schedule-template.csv');
  if(typeof XLSX=='undefined')return iw('The Excel library did not load. Use the CSV template instead.');
  saveBlob([XLSX.write(tplWorkbook(),{bookType:'xlsx',type:'array'})],'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','shift-schedule-template.xlsx')}
function impHTML(){let b;
  if(impDone)b=`<div class="card"><div class="t">✓ Import finished</div><div class="m" style="margin-top:6px">${esc(impDone)}</div></div><button class="btn" onclick="closeM()">Done</button>`;
  else if(!imp)b=`<div class="m">Columns: Date, Start Time, End Time, Status (extra columns are ignored). Partial time off is requested from the Leave tab.<br>Date as YYYY-MM-DD or DD/MM/YYYY · times in 24h (07:00) · status (optional): Scheduled, Planned, Under Review, Approved.</div>
  <div class="m" style="margin-top:10px">Not sure of the format? Download a template, fill it in, then choose it below.</div>
  <div class="two" style="margin-bottom:4px"><button class="btn" onclick="dlTpl('xlsx')">Excel template</button><button class="btn" style="background:#8a97b8" onclick="dlTpl('csv')">CSV template</button></div>
  <div class="f"><label>Excel or CSV file</label><input type="file" accept=".xlsx,.xls,.csv,.txt" onchange="readFile(this.files[0])"></div>
  <div class="f"><label>…or paste CSV</label><textarea id="imp-t" rows="5" placeholder="Date,Start Time,End Time,Status"></textarea></div>
  <div id="iw" class="bad m" style="min-height:16px;margin-top:6px"></div><div class="two"><button class="btn" style="background:#8a97b8" onclick="document.getElementById('imp-t').value=EX">Load example</button><button class="btn" onclick="pv()">Preview</button></div>`;
  else{const nn=imp.filter(r=>r.kind=='new').length,nc=imp.filter(r=>r.kind=='conflict').length,ne=imp.filter(r=>r.err).length;
    b=`<div class="m" style="margin-bottom:8px">${nn} new · ${nc} clash with existing shifts · ${ne} with errors. Rows with errors are never imported.</div>`+(imp.length?imp.map((r,i)=>`<div class="card row" style="padding:9px 12px"><div><div class="t">${r.lab}${r.err?'':' · '+tm(r.s)+'–'+tm(r.e)}</div><div class="m">${r.err?esc(r.err):(lab[r.st]||r.st)}</div></div>${r.err?'<span class="pill st-Denied">Error</span>':r.kind=='new'?'<span class="pill st-Approved">New</span>':`<select style="width:auto" onchange="imp[${i}].act=this.value;ub()"><option value="skip">Keep existing</option><option value="replace">Replace</option></select>`}</div>`).join(''):'<div class="card">No rows found.</div>')+
    `<div class="two"><button class="btn" style="background:#8a97b8" onclick="imp=null;draw()">Back</button><button class="btn" id="ib" onclick="doImport()" ${cnt()?'':'disabled'}>Import ${cnt()} shifts</button></div>`}
  return `<div class="ov" onclick="if(event.target==this)closeM()"><div class="mod" id="md"><div class="grab" id="mg"></div><h2>Import schedule</h2>${b}</div></div>`}
// ---------- swap log ----------
const SWST=[['Planned','Planned'],['Review','Under Review'],['Approved','Approved'],['Denied','Denied']];
const swapTitle=w=>w.give&&w.take?`Give ${fd(w.give)} ⇄ Take ${fd(w.take)}`:w.give?`Give away ${fd(w.give)}`:`Take ${fd(w.take)}`;
const swapText=w=>swapTitle(w)+(w.who?' with '+w.who:'');
const fuOpen=w=>w.fu&&(w.st=='Planned'||w.st=='Review');
function swapHTML(){const w=swId?swapLog.find(x=>x.id==swId):null,x=w||{give:0,take:0,who:'',st:'Planned',fu:0,note:''},dv=v=>v?iso(v):'';
  return `<div class="ov" onclick="if(event.target==this)closeM()"><div class="mod" id="md"><div class="grab" id="mg"></div><h2>${w?'Edit swap':'Log a swap'}</h2>
  <div class="two"><div class="f"><label>I give away</label><input id="w-g" type="date" value="${dv(x.give)}" onchange="wr()"></div><div class="f"><label>I take</label><input id="w-t" type="date" value="${dv(x.take)}" onchange="wr()"></div>
  <div class="f"><label>With</label><input id="w-w" value="${esc(x.who||'')}" placeholder="Colleague name"></div><div class="f"><label>Status</label><select id="w-s">${SWST.map(o=>`<option value="${o[0]}" ${o[0]==x.st?'selected':''}>${o[1]}</option>`).join('')}</select></div>
  <div class="f"><label>Follow up on (optional)</label><input id="w-r" type="date" value="${dv(x.fu)}"></div><div class="f"><label>Note (optional)</label><input id="w-n" value="${esc(x.note||'')}"></div></div>
  <div id="wn" class="bad m" style="margin-top:8px;min-height:16px"></div><button class="btn" id="sv" onclick="saveW()">${w?'Save changes':'Save swap'}</button>${w?'<button class="btn" id="dl" style="background:var(--red)" onclick="delW()">Delete swap</button>':''}</div></div>`}
function wr(){warn=false;const b=document.getElementById('sv');if(b)b.textContent=swId?'Save changes':'Save swap';wn('')}
function saveW(){const gv=fv('w-g'),tv=fv('w-t'),rv=fv('w-r'),give=gv?fromIso(gv):0,take=tv?fromIso(tv):0,fu=rv?fromIso(rv):0,st=fv('w-s'),who=fv('w-w').trim(),note=fv('w-n').trim();
  if(isNaN(give)||isNaN(take)||isNaN(fu))return wn('Check the dates.');
  if(!give&&!take)return wn('Pick the day you give away, the day you take, or both.');
  if(give&&give==take)return wn('The give and take days must be different.');
  const old=swId?swapLog.find(x=>x.id==swId):null,msgs=[];
  if(st!='Denied'&&(!old||old.give!=give||old.take!=take)){
    if(give&&!(S[give]&&S[give].st!='Denied'))msgs.push(`You have no shift on ${fd(give)} to give away.`);
    if(take){if(S[take]&&S[take].st!='Denied')msgs.push(`You already work on ${fd(take)}.`);else if(off(take))msgs.push(`You are on approved leave on ${fd(take)}.`);else msgs.push(...check(take,give))}}
  if(msgs.length&&!warn){warn=true;document.getElementById('sv').textContent='Save anyway';return wn('⚠ '+msgs.join(' · '))}
  const rec={id:swId||newId(),give,take,who,st,fu,note};
  if(old)swapLog[swapLog.indexOf(old)]=rec;else swapLog.push(rec);pW(rec);col=false;closeM()}
function delW(){const b=document.getElementById('dl');if(!dl){dl=true;b.textContent='Tap again to confirm delete';return}xW(swId);swapLog=swapLog.filter(x=>x.id!=swId);closeM()}
// ---------- bank holidays ----------
const HL={earned:['Approved','Earned'],pending:['Planned','Pending'],blocked:['Denied','No TOIL'],off:[null,'']};
const holNote=s=>({earned:'Worked · +1 TOIL day earned',pending:'Scheduled · +1 TOIL day on the day',blocked:'Full-day leave requested · no TOIL day',off:'Not scheduled · no TOIL day'})[s];
const holRow=(h,click)=>{const s=holState(h),p=HL[s];return `<div class="card row" ${click?`onclick="openBH(${h.d})" style="cursor:pointer"`:''}><div><div class="t">${esc(h.name)}</div><div class="m">${DAYN[dow(h.d)].slice(0,3)} ${fd(h.d)} ${UD(h.d).getUTCFullYear()} · ${holNote(s)}</div></div>${p[0]?`<span class="pill st-${p[0]}">${p[1]}</span>`:''}</div>`};
function bhHTML(){const h=bhId?hol(bhId):null,d=h?h.d:sel;
  return `<div class="ov" onclick="if(event.target==this)closeM()"><div class="mod" id="md"><div class="grab" id="mg"></div><h2>${h?'Edit bank holiday':'Add bank holiday'}</h2>
  <div class="two"><div class="f"><label>Date</label><input id="b-d" type="date" value="${iso(d)}" ${h?'disabled':''}></div><div class="f"><label>Name</label><input id="b-n" value="${esc(h?h.name:'')}" placeholder="e.g. Christmas Day"></div></div>
  <div class="m" style="margin-top:8px">Scheduled to work this day? You earn 1 TOIL day (7h 48m) once it arrives. A full day of leave (PTO, TOIL or sick) on it means no TOIL day; partial leave does not change it.</div>
  <div id="wn" class="bad m" style="margin-top:8px;min-height:16px"></div><button class="btn" id="sv" onclick="saveBH()">${h?'Save changes':'Add bank holiday'}</button>${h?'<button class="btn" id="dl" style="background:var(--red)" onclick="delBH()">Delete bank holiday</button>':''}</div></div>`}
function saveBH(){const d=bhId||fromIso(fv('b-d')),name=fv('b-n').trim()||'Bank holiday';
  if(isNaN(d))return wn('Pick a date.');
  if(!bhId&&hol(d))return wn('Already in the list: '+hol(d).name);
  const rec={d,name};holidays=holidays.filter(h=>h.d!=d);holidays.push(rec);pH(rec);closeM()}
function delBH(){const b=document.getElementById('dl');if(!dl){dl=true;b.textContent='Tap again to confirm delete';return}xH(bhId);holidays=holidays.filter(h=>h.d!=bhId);closeM()}
function bhmHTML(){return `<div class="ov" onclick="if(event.target==this)closeM()"><div class="mod" id="md"><div class="grab" id="mg"></div><h2>Add several bank holidays</h2>
  <div class="m">One per line: the date, then the name. Dates as YYYY-MM-DD or DD/MM/YYYY. Existing dates are updated.</div>
  <div class="f"><textarea id="bm-t" rows="8" placeholder="2026-12-25 Christmas Day&#10;2026-12-26 Boxing Day"></textarea></div>
  <div id="wn" class="bad m" style="margin-top:8px;min-height:16px"></div><button class="btn" onclick="saveBHM()">Add all</button></div></div>`}
function saveBHM(){const lines=fv('bm-t').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);if(!lines.length)return wn('Paste at least one line.');
  const recs=[];
  for(let i=0;i<lines.length;i++){const l=lines[i],m=l.match(/^(\d{4}-\d{1,2}-\d{1,2}|\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4})[\s,;]*(.*)$/),dt=m&&pd(m[1]),d=dt&&UD(E(dt.y,dt.m-1,dt.d)).getUTCDate()==dt.d?E(dt.y,dt.m-1,dt.d):NaN;
    if(isNaN(d))return wn(`Line ${i+1} not understood: "${l.slice(0,40)}"`);recs.push({d,name:(m[2]||'').trim()||'Bank holiday'})}
  recs.forEach(r=>{holidays=holidays.filter(h=>h.d!=r.d);holidays.push(r);pH(r)});closeM()}
let pTab=null,pModal=false,pSel=null;
function fxOf(){let f='';if(pTab!==null){if(modal&&!pModal)f='modal';else if(!modal&&tab!==pTab)f=tab>pTab?'tr':'tl';else if(!modal&&!pModal&&tab==0&&sel!==pSel)f='day'}pTab=tab;pModal=!!modal;pSel=sel;return f}
function draw(){try{drawNow()}catch(e){crash(e)}}
function drawNow(){const v=[sched,swaps,leave,rules][tab]();const fx=fxOf(),ap=document.getElementById('app');if(ap.dataset)ap.dataset.fx=fx;
  const sv=['.page','.sheet','#md'].map(q=>{const e=ap.querySelector(q);return e?e.scrollTop:0});
  ap.innerHTML=v+`<button class="fab ${modal===true?'x up':''}" aria-label="${modal===true?'Close':'Add shift'}" onclick="${modal===true?'closeM()':'openM(null)'}">+</button><div class="nav">${[0,1,null,2,3].map(i=>i===null?'<span style="width:25%"></span>':`<button class="${i==tab?'on':''}" onclick="tab=${i};draw()">${icons[i]}${names[i]}</button>`).join('')}</div>`+(modal=='imp'?impHTML():modal=='exp'?expHTML():modal=='lv'?leaveHTML():modal=='sw'?swapHTML():modal=='bh'?bhHTML():modal=='bhm'?bhmHTML():modal=='ty'?tyHTML():modal=='stats'?statsHTML():modal?modalHTML():'');if(fx!=='tr'&&fx!=='tl'){const q=ap.querySelector('.page'),w=ap.querySelector('.sheet'),m=ap.querySelector('#md');if(q)q.scrollTop=sv[0];if(w&&fx!=='day')w.scrollTop=sv[1];if(m&&fx!=='modal')m.scrollTop=sv[2]}
  wire();if(modal=='lv')lu();if(!dbOk&&!document.getElementById('wbar')){const w=document.createElement('div');w.id='wbar';w.className='wbar';w.textContent='Storage unavailable: changes will not be saved. Close other copies of the app and reload.';ap.appendChild(w)}}
function tsv(){const it=[];
  work.forEach(d=>{const x=S[d];it.push([d,0,'Shift','',x.s,x.e,hm(x.e)-hm(x.s),lab[x.st]||x.st,x.f||'']) });
  leaves.forEach(l=>it.push([l.d,1,'Leave',l.type,l.full?'':l.s,l.full?'':l.e,dur(l),lab[l.st]||l.st,l.full?'Full day':'Partial']));
  it.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
  const rows=[['Date','Weekday','Kind','Leave type','Start','End','Minutes','Status','Note'],...it.map(r=>[iso(r[0]),DAYN[dow(r[0])],...r.slice(2)])];
  rows.push([],['Balances (minutes remaining)']);Object.keys(base).forEach(k=>rows.push(['','','Balance',k,'','',rem(k),'Remaining','']));
  if(holidays.length){rows.push([],['Bank holidays (TOIL day = 468 min)']);[...holidays].sort((a,b)=>a.d-b.d).forEach(h=>{const s=holState(h);rows.push([iso(h.d),DAYN[dow(h.d)],'Bank holiday','','','',s=='earned'?TOIL_DAY:0,({off:'Not scheduled',pending:'Pending',earned:'TOIL earned',blocked:'Full-day leave, no TOIL'})[s],h.name])})}
  if(swapLog.length){rows.push([],['Swaps']);[...swapLog].sort((a,b)=>(a.give||a.take)-(b.give||b.take)).forEach(w=>rows.push([iso(w.give||w.take),DAYN[dow(w.give||w.take)],'Swap',w.who||'','','','',lab[w.st]||w.st,swapTitle(w)+(w.note?' · '+w.note:'')]))}
  return rows.map(r=>r.join('\t')).join('\n')}
async function cp(){const t=document.getElementById('ex-t');t.select();let ok=false;try{await navigator.clipboard.writeText(t.value);ok=true}catch(e){try{ok=document.execCommand('copy')}catch(e2){}}
  document.getElementById('ex-m').textContent=ok?'Copied. Paste into cell A1 of a Google Sheet.':'Could not copy automatically. Select the text and copy it.'}
function expHTML(){return `<div class="ov" onclick="if(event.target==this)closeM()"><div class="mod" id="md"><div class="grab" id="mg"></div><h2>Export for payroll</h2>
  <div class="m">All shifts, leave requests and remaining balances, in minutes, sorted by date. Tab-separated, so it lands in separate columns when pasted into Google Sheets.</div>
  <div class="f"><textarea id="ex-t" rows="8" readonly style="font:11px monospace;white-space:pre">${esc(tsv())}</textarea></div>
  <div id="ex-m" class="ok m" style="min-height:16px;margin-top:6px"></div><div class="two"><button class="btn" style="background:#8a97b8" onclick="closeM()">Close</button><button class="btn" onclick="cp()">Copy</button></div></div></div>`}
const DEMO=structuredClone({S,work,leaves,
  holidays:[{d:O+5,name:'Demo holiday (leave requested)'},{d:O+12,name:'Demo holiday (worked)'},{d:O+14,name:'Demo holiday (not scheduled)'}],
  swapLog:[{id:9001,give:O+13,take:O+14,who:'Sam',st:'Approved',fu:0,note:''},{id:9002,give:O+27,take:O+28,who:'Alex',st:'Review',fu:O+8,note:'Waiting on manager'}]});
let db=null,dbOk=false,cl=false;
const dbOpen=()=>new Promise((res,rej)=>{try{const r=indexedDB.open('shiftapp',2),to=setTimeout(()=>rej('timeout'),8000);r.onupgradeneeded=()=>{const d=r.result,mk=(n,kp)=>{if(!d.objectStoreNames.contains(n))d.createObjectStore(n,{keyPath:kp})};mk('shifts','d');mk('leaves','id');mk('meta','k');mk('holidays','d');mk('swaps','id')};r.onsuccess=()=>{clearTimeout(to);const d=r.result;d.onversionchange=()=>d.close();res(d)};r.onerror=()=>{clearTimeout(to);rej(r.error)}}catch(e){rej(e)}});
const getAll=n=>new Promise((res,rej)=>{const q=db.transaction(n).objectStore(n).getAll();q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)});
const put=(n,v)=>{if(!dbOk)return;try{const t=db.transaction(n,'readwrite');t.objectStore(n).put(v);t.oncomplete=()=>window.dispatchEvent(new Event('localchange'));t.onerror=()=>{dbOk=false}}catch(e){dbOk=false}};
const pS=d=>{if(S[d])put('shifts',{...S[d],d,u:Date.now(),dirty:1})},xS=d=>put('shifts',{d,del:true,u:Date.now(),dirty:1});
const pL=l=>put('leaves',{...l,u:Date.now(),dirty:1}),xL=id=>put('leaves',{id,del:true,u:Date.now(),dirty:1});
const pH=h=>put('holidays',{...h,u:Date.now(),dirty:1}),xH=d=>put('holidays',{d,del:true,u:Date.now(),dirty:1});
const pW=w=>put('swaps',{...w,u:Date.now(),dirty:1}),xW=id=>put('swaps',{id,del:true,u:Date.now(),dirty:1});
const pM=()=>{put('meta',{k:'rules',v:{...R},u:Date.now(),dirty:1});armNotifs()},pB=()=>put('meta',{k:'balances',v:{...base},u:Date.now(),dirty:1}),pT=()=>put('meta',{k:'types',v:TYPES.map(x=>({...x})),u:Date.now(),dirty:1});
// A shift needs a start and end time; a partial leave needs its start and end. Records missing them (written by the
// old sync bug) are ignored everywhere instead of crashing the app, and are never pushed to the cloud.
const okT=v=>typeof v=='string'&&/^\d{1,2}:\d\d$/.test(v);
const valid=(n,r)=>!!r&&(r.del||(n=='shifts'?okT(r.s)&&okT(r.e):n=='leaves'?!!r.full||(okT(r.s)&&okT(r.e)):true));
let bootErr=null;
async function boot(){try{db=await dbOpen();dbOk=true}catch(e){dbOk=false;bootErr=e;return}
  try{const[sh,lv,me,ho,sw]=await Promise.all([getAll('shifts'),getAll('leaves'),getAll('meta'),getAll('holidays'),getAll('swaps')]),m=Object.fromEntries(me.map(x=>[x.k,x.v]));
  if(m.seeded){work.length=0;Object.keys(S).forEach(k=>delete S[k]);sh.filter(x=>!x.del&&valid('shifts',x)).forEach(x=>{S[x.d]=x;work.push(x.d)});work.sort((a,b)=>a-b);leaves=lv.filter(x=>!x.del&&valid('leaves',x));holidays=ho.filter(x=>!x.del);swapLog=sw.filter(x=>!x.del);if(m.rules)Object.assign(R,m.rules);if(m.balances)Object.assign(base,m.balances);if(Array.isArray(m.types)&&m.types.length)TYPES=m.types;lid=Math.max(m.lid||1,1,...lv.map(x=>x.id+1))}
  else{work.length=0;Object.keys(S).forEach(k=>delete S[k]);leaves=[];holidays=[];swapLog=[];put('meta',{k:'seeded',v:1})}}catch(e){bootErr=e}}
function wipe(){work.forEach(d=>xS(d));leaves.forEach(l=>xL(l.id));holidays.forEach(h=>xH(h.d));swapLog.forEach(w=>xW(w.id));work.length=0;Object.keys(S).forEach(k=>delete S[k]);leaves=[];holidays=[];swapLog=[]}
function demo(){wipe();const D=structuredClone(DEMO);Object.assign(S,D.S);work.push(...D.work);leaves=D.leaves;holidays=D.holidays;swapLog=D.swapLog;work.forEach(pS);leaves.forEach(pL);holidays.forEach(pH);swapLog.forEach(pW);lid=Math.max(lid,5);Object.assign(base,DEMO_BASE);pB();draw()}
function clr(){const b=document.getElementById('clr');if(!cl){cl=true;b.textContent='Tap again to erase everything (also in the cloud once synced)';return}cl=false;wipe();draw()}
const ready=boot();
const isBlank=()=>{const a=document.getElementById('app');return !a||!a.children.length||!!a.querySelector('.boot')};
let crashed=false;
function crash(e){crashed=true;try{const m=String(e&&(e.stack||e.message)||e||'Unknown error').slice(0,700),a=document.getElementById('app');
  a.innerHTML=`<div class="crash"><h2>Something went wrong</h2><p>Your shifts are stored on this device and have not been deleted.</p><pre>${esc(m)}</pre><button class="btn" onclick="location.reload()">Reload</button><button class="btn" style="background:#8a97b8" onclick="repairApp()">Repair app files (keeps your data)</button><button class="btn" style="background:#8a97b8" onclick="saveBackup()">Download a backup of my data</button></div>`}catch(x){}}
async function repairApp(){try{const rs=await navigator.serviceWorker.getRegistrations();await Promise.all(rs.map(r=>r.unregister()));const ks=await caches.keys();await Promise.all(ks.map(k=>caches.delete(k)))}catch(e){}location.reload()}
const rawDump=()=>new Promise((res,rej)=>{const r=indexedDB.open('shiftapp');r.onerror=()=>rej(r.error);r.onsuccess=()=>{const d=r.result,ns=[...d.objectStoreNames],o={},tx=d.transaction(ns);ns.forEach(n=>{const q=tx.objectStore(n).getAll();q.onsuccess=()=>o[n]=q.result});tx.oncomplete=()=>{d.close();res(o)};tx.onerror=()=>rej(tx.error)}});
async function saveBackup(){try{const o=await rawDump(),b=new Blob([JSON.stringify({app:'shift-companion',saved:new Date().toISOString(),data:o},null,1)],{type:'application/json'}),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download='shift-companion-backup.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),2000)}catch(e){alert('Could not read the saved data: '+e)}}
let booted=false;
ready.then(()=>{booted=true;try{draw()}catch(e){crash(e)}});
window.addEventListener('error',ev=>{if(isBlank())crash(ev.error||ev.message)});
window.addEventListener('unhandledrejection',ev=>{if(isBlank())crash(ev.reason)});
setTimeout(()=>{if(isBlank())crash('The app did not start within 12 seconds.')},12000);
let rdT=null,lastAct=0;
['touchstart','touchmove','scroll','pointerdown','pointermove'].forEach(ev=>document.addEventListener(ev,()=>{lastAct=Date.now()},{passive:true,capture:true}));
window.redraw=()=>{clearTimeout(rdT);rdT=setTimeout(function go(){const q=Date.now()-lastAct;if(q<600){rdT=setTimeout(go,600-q);return}
  const a=document.activeElement;if(booted&&!crashed&&!modal&&!(a&&/INPUT|TEXTAREA|SELECT/.test(a.tagName))){try{draw()}catch(e){console.error(e)}}},80)};
const idbGet=(n,k)=>new Promise((res,rej)=>{const q=db.transaction(n).objectStore(n).get(k);q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)});
const putRaw=(n,v)=>new Promise((res,rej)=>{const t=db.transaction(n,'readwrite');t.objectStore(n).put(v);t.oncomplete=res;t.onerror=()=>rej(t.error)});
const keyOf=(n,r)=>n=='shifts'||n=='holidays'?r.d:n=='leaves'||n=='swaps'?r.id:r.k;
// Bridge used by js/sync.js. Records merge per record: the newest edit time (u) wins.
window.syncApi={
  async dirty(){await ready;const[a,b,c,h,w]=await Promise.all([getAll('shifts'),getAll('leaves'),getAll('meta'),getAll('holidays'),getAll('swaps')]);return{shifts:a.filter(x=>x.dirty&&valid('shifts',x)),leaves:b.filter(x=>x.dirty&&valid('leaves',x)),holidays:h.filter(x=>x.dirty),swaps:w.filter(x=>x.dirty),rules:c.filter(x=>(x.k=='rules'||x.k=='balances'||x.k=='types')&&x.dirty)}},
  async apply(n,r){await ready;if(!valid(n,r))return;const cur=await idbGet(n,keyOf(n,r));if(cur&&cur.u>=r.u&&valid(n,cur))return;await putRaw(n,{...r,dirty:0});
    if(n=='shifts'){if(r.del){delete S[r.d];const i=work.indexOf(r.d);if(i>=0)work.splice(i,1)}else{S[r.d]={...r};if(!work.includes(r.d)){work.push(r.d);work.sort((a,b)=>a-b)}}}
    else if(n=='leaves'){leaves=leaves.filter(x=>x.id!=r.id);if(!r.del)leaves.push({...r})}
    else if(n=='holidays'){holidays=holidays.filter(x=>x.d!=r.d);if(!r.del)holidays.push({...r})}
    else if(n=='swaps'){swapLog=swapLog.filter(x=>x.id!=r.id);if(!r.del)swapLog.push({...r})}
    else if(r.k=='rules')Object.assign(R,r.v);else if(r.k=='balances')Object.assign(base,r.v);else if(r.k=='types'&&Array.isArray(r.v))TYPES=r.v;
    armNotifs();window.redraw()},
  async markAllDirty(){await ready;for(const n of['shifts','leaves','holidays','swaps','meta'])for(const x of await getAll(n)){
    if(x.dirty||!valid(n,x)||(n=='meta'&&!(x.k=='rules'||x.k=='balances'||x.k=='types')))continue;await putRaw(n,{...x,dirty:1})}},
  async clean(n,r){await ready;const cur=await idbGet(n,keyOf(n,r));if(cur&&cur.u==r.u)await putRaw(n,{...cur,dirty:0})}
};
// ---------- leave-by reminders + calendar file ----------
const NS={get(){let v={};try{v=JSON.parse(localStorage.getItem('sc-notif')||'{}')}catch(e){}return{on:false,lead:10,...v}},set(o){try{localStorage.setItem('sc-notif',JSON.stringify({...NS.get(),...o}))}catch(e){}}};
const canNotify=()=>typeof Notification!='undefined'&&typeof navigator!='undefined'&&'serviceWorker' in navigator;
const perm=()=>canNotify()?Notification.permission:'unsupported';
const atLocal=(d,min)=>{const u=UD(d);return new Date(u.getUTCFullYear(),u.getUTCMonth(),u.getUTCDate(),0,min).getTime()}; // local wall-clock minute-of-day on civil day d (overflow rolls into adjacent days)
function evList(now){const td=todayN(now),lead=NS.get().lead,ev=[];
  for(let d=td-1;d<=td+2;d++){const s=S[d];
    if(s&&s.st!='Denied'&&!off(d)){const lb=hm(s.s)-R.commute,at=atLocal(d,lb-lead),by=new Date(atLocal(d,lb));
      ev.push({key:`shift:${d}:${at}`,at,until:atLocal(d,lb),title:'Leave by '+pad(by.getHours())+':'+pad(by.getMinutes()),body:`Shift starts ${s.s} · ${R.commute} min trip`})}
    swapLog.filter(w=>w.fu==d&&fuOpen(w)).forEach(w=>{const at=atLocal(d,540);ev.push({key:`swap:${w.id}:${at}`,at,until:atLocal(d,1439),title:'Swap follow-up'+(w.who?' · '+w.who:''),body:swapText(w)})})}
  return ev.sort((a,b)=>a.at-b.at)}
const shownGet=()=>{try{return JSON.parse(localStorage.getItem('sc-shown')||'{}')}catch(e){return{}}},shownSet=o=>{try{localStorage.setItem('sc-shown',JSON.stringify(o))}catch(e){}};
async function fire(e){const sh=shownGet(),t=Date.now();if(sh[e.key])return;sh[e.key]=t;for(const k of Object.keys(sh))if(t-sh[k]>3*864e5)delete sh[k];shownSet(sh);
  try{const reg=await navigator.serviceWorker.ready;await reg.showNotification(e.title,{body:e.body,tag:e.key,icon:'icons/icon-192.png',data:{url:'./'}})}catch(err){}}
let timers=[];
function armNotifs(now){now=now||Date.now();timers.forEach(clearTimeout);timers=[];{const o=TODAY;TODAY=todayN(now);if(TODAY!=o&&sel==o){goto(TODAY);col=false;window.redraw&&window.redraw()}}
  if(!NS.get().on||perm()!='granted')return;
  const sh=shownGet();
  evList(now).forEach(e=>{if(sh[e.key])return;if(e.at<=now){if(now<e.until)fire(e)}else if(e.at-now<36*36e5)timers.push(setTimeout(()=>fire(e),e.at-now))})}
function notifCard(){const n=NS.get(),p=perm();let t,m,b='';
  if(p=='unsupported'){t='Reminders not available';m='This browser cannot show notifications. On iPhone, add the app to your Home Screen first (iOS 16.4 or later).'}
  else if(p=='denied'){t='Notifications blocked';m='Allow notifications for this site in your browser or phone settings, then come back.'}
  else if(!n.on||p!='granted'){t='Leave-by reminders are off';m='Get a notification shortly before it is time to leave for work.';b='<button class="btn" onclick="notifOn()">Turn on reminders</button>'}
  else{t='● Reminders on';m=`Notifies ${n.lead} min before you need to leave (trip ${R.commute} min). It works while the app is open or running in the background. For alerts when the app is closed, use the calendar file below.`;
    b=`<div class="row" style="margin:10px 0 2px"><div class="t">Remind me before leaving</div><div class="step"><button onclick="setLead(-5)">−</button><b>${n.lead} min</b><button onclick="setLead(5)">+</button></div></div><button class="btn" onclick="notifTest()">Send test notification</button><button class="btn" style="background:#8a97b8" onclick="notifOff()">Turn off</button>`}
  return `<div class="card"><div class="t">${t}</div><div class="m">${m}</div>${b}</div>`}
async function notifOn(){if(!canNotify())return;let r='denied';try{r=await Notification.requestPermission()}catch(e){}NS.set({on:r=='granted'});armNotifs();draw()}
function notifOff(){NS.set({on:false});armNotifs();draw()}
function setLead(k){NS.set({lead:Math.max(0,Math.min(60,NS.get().lead+k))});armNotifs();draw()}
function notifTest(){fire({key:'test:'+Date.now(),title:'Leave by 06:15 (test)',body:'Reminders are working.'})}
function calCard(){return `<div class="card"><div class="t">Phone calendar alerts</div><div class="m">A web app cannot fire alerts while it is closed. Add your next 60 days of shifts to your phone's calendar and its alarms will. Re-add after schedule changes: matching events are updated, but deleted shifts must be removed by hand.</div><div id="ics-m" class="ok m" style="min-height:16px;margin-top:6px"></div><button class="btn" onclick="dlIcs()">Download calendar file (.ics)</button></div>`}
function icsText(now){now=now||Date.now();const td=todayN(now),lead=NS.get().lead,nl='\r\n',L=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Shift Companion//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH','X-WR-CALNAME:Shift Companion'];
  const stamp=new Date(now).toISOString().replace(/[-:]/g,'').replace(/\.\d+/,''),ldt=(d,min)=>{const t=new Date(atLocal(d,min));return `${t.getFullYear()}${pad(t.getMonth()+1)}${pad(t.getDate())}T${pad(t.getHours())}${pad(t.getMinutes())}00`};
  const tx=t=>String(t).replace(/[\;,]/g,'\\$&').replace(/\r?\n/g,'\\n'),fold=l=>l.length<=73?l:l.match(/.{1,72}/g).join(nl+' ');
  [...work].sort((a,b)=>a-b).filter(d=>d>=td&&d<=td+60&&S[d].st!='Denied'&&!off(d)).forEach(d=>{const s=S[d],lb=hm(s.s)-R.commute,by=new Date(atLocal(d,lb)),when=pad(by.getHours())+':'+pad(by.getMinutes());
    L.push('BEGIN:VEVENT',`UID:shift-${d}@shift-companion`,`DTSTAMP:${stamp}`,`DTSTART:${ldt(d,hm(s.s))}`,`DTEND:${ldt(d,hm(s.e))}`,`SUMMARY:${tx('Shift '+s.s+'-'+s.e)}`,`DESCRIPTION:${tx('Leave by '+when+' ('+R.commute+' min trip)')}`,'BEGIN:VALARM','ACTION:DISPLAY',`DESCRIPTION:${tx('Leave by '+when)}`,`TRIGGER:-PT${R.commute+lead}M`,'END:VALARM','END:VEVENT')});
  swapLog.filter(w=>fuOpen(w)&&w.fu>=td).forEach(w=>L.push('BEGIN:VEVENT',`UID:swap-${w.id}@shift-companion`,`DTSTAMP:${stamp}`,`DTSTART:${ldt(w.fu,540)}`,`DTEND:${ldt(w.fu,555)}`,`SUMMARY:${tx('Swap follow-up'+(w.who?' - '+w.who:''))}`,`DESCRIPTION:${tx(swapText(w))}`,'BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:Swap follow-up','TRIGGER:PT0S','END:VALARM','END:VEVENT'));
  L.push('END:VCALENDAR');return L.map(fold).join(nl)+nl}
function dlIcs(){const t=icsText(),n=t.split('BEGIN:VEVENT').length-1,b=new Blob([t],{type:'text/calendar;charset=utf-8'}),u=URL.createObjectURL(b),a=document.createElement('a');
  a.href=u;a.download='shift-companion.ics';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),2000);
  const m=document.getElementById('ics-m');if(m)m.textContent=n?`Downloaded ${n} event${n==1?'':'s'}. Open the file to add them to your calendar.`:'Nothing to add: no upcoming shifts in the next 60 days.'}
let armT=null;
window.addEventListener('localchange',()=>{clearTimeout(armT);armT=setTimeout(()=>armNotifs(),300)});
document.addEventListener('visibilitychange',()=>{if(!document.hidden){armNotifs();window.redraw&&window.redraw()}});
setInterval(()=>armNotifs(),15*60*1000);
ready.then(()=>armNotifs());
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
