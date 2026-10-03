// Shift Companion — app logic (classic script; handlers are referenced from inline onclick).
const _n=new Date();
const E=(y,m,d)=>Math.round(Date.UTC(y,m,d)/864e5),UD=n=>new Date(n*864e5),O=E(2026,9,0),TODAY=E(_n.getFullYear(),_n.getMonth(),_n.getDate()),STD=468;
const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],DAYN=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const fd=n=>MON[UD(n).getUTCMonth()]+' '+UD(n).getUTCDate(),iso=n=>UD(n).toISOString().slice(0,10),fromIso=t=>{const m=String(t).match(/^(\d{4})-(\d\d)-(\d\d)$/);return m?E(+m[1],m[2]-1,+m[3]):NaN};
const DOW=['SUN','MON','TUE','WED','THU','FRI','SAT'];
const wd=[1,2,4,5,6,8,9,11,12,13,15,16,18,19,20,22,23,25,26,27,29,30],work=wd.map(d=>O+d);
const S={};wd.forEach(d=>S[O+d]={s:d%3==0?'14:00':'07:00',e:d%3==0?'21:48':'14:48',st:'Scheduled',f:''});
S[O+12].st='Planned';S[O+16].st='Approved';S[O+16].f='Swapped';
const R={week:6,cons:6,sixPerMonth:2,commute:45};
const DEMO_BASE={PTO:36*60+12,TOIL:11*60+30,Sick:5*468},base={PTO:0,TOIL:0,Sick:0};
const hm=t=>{const[a,b]=String(t).split(':').map(Number);return a*60+b};
let leaves=[{id:1,d:O+5,type:'PTO',full:true,st:'Review'},{id:2,d:O+20,type:'PTO',full:true,st:'Denied'},{id:3,d:O+23,type:'PTO',full:false,s:'12:00',e:'14:00',st:'Approved'},{id:4,d:O+9,type:'Sick',full:true,st:'Approved'}],lid=5;
const dur=l=>l.full?STD:Math.min(STD,hm(l.e)-hm(l.s));
const used=(k,skip)=>leaves.filter(l=>l.type==k&&l.st=='Approved'&&l.id!=skip).reduce((a,l)=>a+dur(l),0),rem=k=>base[k]-used(k);
const fm=m=>{const d=Math.floor(m/STD),r=m%STD;return (d?d+'d ':'')+Math.floor(r/60)+'h '+String(r%60).padStart(2,'0')+'m'};
const lab={Review:'Under Review'};
let tab=0,sel=TODAY,vm={y:_n.getFullYear(),m:_n.getMonth()},out='',col=false,modal=false,warn=false,editing=null,dl=false,imp=null,impDone='',lvId=null;
function mv(k){let m=vm.m+k,y=vm.y;if(m<0){m=11;y--}if(m>11){m=0;y++}vm={y,m};draw()}
function goto(d){sel=d;const t=UD(d);vm={y:t.getUTCFullYear(),m:t.getUTCMonth()}}
const newId=()=>Date.now()*1000+Math.floor(Math.random()*1000);
function openL(id){modal='lv';lvId=id;warn=false;dl=false;draw()}
function openImp(){modal='imp';imp=null;impDone='';draw()}
function openM(d){editing=d;modal=true;warn=false;dl=false;draw()}
const dow=n=>((n+4)%7+7)%7;
const off=x=>leaves.some(l=>l.d==x&&l.full&&l.st=='Approved');
function check(d){ // would working day d break rules?
  const w=new Set(work.filter(x=>S[x].st!='Denied'&&!off(x)));w.add(d);
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
function cal(){let h='<div class="grid">'+DOW.map(x=>`<div class="h">${x}</div>`).join('');
  const f1=E(vm.y,vm.m,1),nd=new Date(Date.UTC(vm.y,vm.m+1,0)).getUTCDate();
  for(let i=0;i<dow(f1);i++)h+='<div></div>';
  for(let k=1;k<=nd;k++){const d=f1+k-1,s=S[d];const c=s?({Scheduled:'#5b9bff',Planned:'#7c6cf0',Review:'#d95f18',Approved:'#1fb67a',Denied:'#e5484d'})[s.st]:'';
    h+=`<div class="d ${d==sel?'sel':''} ${d==TODAY?'today':''}" onclick="sel=${d};col=false;draw()"><b>${k}</b>${leaves.some(l=>l.d==d)?'<i class="lv"></i>':''}${s?`<i style="background:${c}"></i>`:''}</div>`}
  return h+'</div>'}
function sched(){const s=S[sel];let h=`<div class="top"><div class="bar"><span>‹</span><span>Schedule</span><span onclick="openImp()" style="cursor:pointer;font-size:12px;border:1px solid #5b6f9e;border-radius:12px;padding:3px 10px">Import</span></div><div class="sub row" style="font-size:15px"><span onclick="mv(-1)" style="cursor:pointer;padding:4px 14px">‹</span><b onclick="goto(TODAY);draw()" style="cursor:pointer">${MON[vm.m]} ${vm.y}</b><span onclick="mv(1)" style="cursor:pointer;padding:4px 14px">›</span></div>${cal()}</div><div class="sheet" id="sh"><div class="grab" id="gr"></div><h2>${DAYN[dow(sel)]}, ${fd(sel)}</h2>`;
  if(!s)h+='<div class="card"><div class="t">Day off</div><div class="m">Standard day = 7h 48m. Tap + to add a shift.</div></div>';
  else{const[hh,mm]=s.s.split(':').map(Number);const l=hh*60+mm-R.commute;
    h+=`<div class="card"><div class="row"><div class="t">${s.s} – ${s.e}</div><span class="pill st-${s.st}">${lab[s.st]||s.st}</span></div><div class="m">Sun–Sat week · ${DOW[dow(sel)]}</div>
    <span class="tag tg-b">Leave by ${String(Math.floor(l/60)).padStart(2,'0')}:${String(l%60).padStart(2,'0')}</span>${s.f?`<span class="tag tg-o">${s.f}</span>`:''}<button class="btn" style="margin-top:12px" onclick="openM(${sel})">Edit shift</button></div>`}
  h+=leaves.filter(l=>l.d==sel).map(l=>`<div class="card" style="border-left:4px solid #f2c94c;cursor:pointer" onclick="openL(${l.id})"><div class="row"><div class="t">${l.type} leave · ${l.full?'Full day':'Partial'}</div><span class="pill st-${l.st}">${lab[l.st]||l.st}</span></div><div class="m">${l.full?'':l.s+'–'+l.e+' · '}${fm(dur(l))}${l.st=='Approved'?' deducted':l.st=='Denied'?' not deducted':' requested'}</div></div>`).join('');
  return h+'</div>'}
function swaps(){return `<div class="dark"><div class="bar"><span></span><span>Swaps</span><span></span></div><div class="sub">Check a day your peer offers or asks for</div></div><div class="page">
  <h2>Check a day</h2><input type="date" id="cd" value="${iso(sel)}"><button class="btn" onclick="chk()">Check against my rules</button><div id="res" style="margin:12px 0">${out}</div>
  <h2>Swap log</h2><div class="m">Recording swaps (who, which days, reminders) is planned for a later version. For now, use the checker above.</div></div>`}
function chk(){const d=fromIso(document.getElementById('cd').value);if(isNaN(d))return;
  const e=off(d)?['You are on approved leave that day']:work.includes(d)?['You already work that day']:check(d);
  out=e.length?`<b class="bad">✗ Not safe for ${fd(d)}</b><br>${e.join('<br>')}`:`<b class="ok">✓ ${fd(d)} is safe to take</b>`;draw()}
function leave(){const L=[...leaves].sort((a,b)=>a.d-b.d);
  return `<div class="dark"><div class="bar"><span></span><span>Leave & TOIL</span><span></span></div><div class="bal">${Object.keys(base).map(k=>`<div><small>${k}</small><b>${fm(rem(k))}</b></div>`).join('')}</div><div class="m" style="color:#9fb0d6">1 day = 7h 48m (468 min). Only Approved requests are deducted.</div><button class="btn" onclick="openL(null)">Request leave</button></div>
  <div class="page"><h2>Requests</h2>${L.length?L.map(l=>`<div class="card row" onclick="openL(${l.id})" style="cursor:pointer"><div><div class="t">${fd(l.d)} · ${l.type}</div><div class="m">${l.full?'Full day':l.s+'–'+l.e} · ${fm(dur(l))}</div></div><span class="pill st-${l.st}">${lab[l.st]||l.st}</span></div>`).join(''):'<div class="m">No requests yet.</div>'}</div>`}
function lu(){const f=fv('l-f')=='1';document.getElementById('l-tm').style.display=f?'none':'';const m=f?STD:hm(fv('l-b'))-hm(fv('l-a'));
  document.getElementById('lm').textContent=m>0?`${f?'Full day':'Partial'}: ${fm(Math.min(STD,m))} · deducted from ${fv('l-t')} once Approved`:'End time must be after start time.';
  warn=false;wn('');document.getElementById('sv').textContent=lvId?'Save changes':'Submit request'}
function saveL(){const f=fv('l-f')=='1',d=fromIso(fv('l-d')),a=fv('l-a'),b=fv('l-b'),t=fv('l-t'),st=fv('l-s'),m=f?STD:hm(b)-hm(a);
  if(isNaN(d))return wn('Pick a date.');
  if(!f&&!(m>0))return wn('End time must be after start time.');
  if(leaves.some(x=>x.d==d&&x.id!=lvId&&x.st!='Denied'&&(f||x.full||(hm(a)<hm(x.e)&&hm(b)>hm(x.s)))))return wn('This overlaps another leave request that day.');
  const need=Math.min(STD,m),avail=base[t]-used(t,lvId);
  if(st!='Denied'&&need>avail&&!warn){warn=true;document.getElementById('sv').textContent='Submit anyway';return wn(`⚠ Only ${fm(Math.max(0,avail))} ${t} left; this needs ${fm(need)}.`)}
  const rec={id:lvId||newId(),d,type:t,full:f,s:f?null:a,e:f?null:b,st};
  if(lvId)leaves[leaves.findIndex(x=>x.id==lvId)]=rec;else leaves.push(rec);pL(rec);goto(d);col=false;closeM()}
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
  <h2>Limits</h2><div class="m" style="margin-bottom:8px">Approved full-day leave doesn't count as a workday. Partial leave still does. A week counts toward the month it ends in (Saturday).</div>${st('week','Max workdays / week',1,7)}${st('cons','Max consecutive days',1,14)}${st('sixPerMonth','6-day weeks / month',0,5)}
  <h2>Commute</h2>${st('commute','Travel time to work',5,180)}<div class="m">Used for the “Leave by” reminder on each shift.</div>
  <h2 style="margin-top:14px">Opening balances</h2><div class="m" style="margin-bottom:8px">Hours:minutes you had before using this app (e.g. 36:12). Approved leave is deducted from these. To add earned TOIL, raise the TOIL balance.</div>${['PTO','TOIL','Sick'].map(k=>`<div class="card row"><div class="t">${k}</div><input style="width:110px;text-align:right" value="${Math.floor(base[k]/60)}:${pad(base[k]%60)}" onchange="setBal('${k}',this.value)"></div>`).join('')}
  <h2 style="margin-top:14px">Sync</h2><div class="card"><div class="t">${dbOk?'● Saved on this device':'⚠ Not saved: storage unavailable'}</div><div class="m">${dbOk?'Every change is written to this device straight away and works offline.':'This browser is blocking local storage, so changes will be lost when the page reloads.'}</div></div>${syncCard()}
  <h2 style="margin-top:14px">Google Sheets</h2>${sheetsCard()}<h2 style="margin-top:14px">Data</h2><button class="btn" onclick="modal='exp';draw()">Export for payroll (Google Sheets)</button><button class="btn" style="background:#8a97b8" onclick="demo()">Load demo data</button><button class="btn" id="clr" style="background:var(--red)" onclick="clr()">Clear all data</button></div>`}
function drag(h,el,o){let y0=null,b=0,cur=0;
  h.onpointerdown=e=>{y0=e.clientY;b=o.base();cur=b;h.setPointerCapture(e.pointerId);el.style.transition='none'};
  h.onpointermove=e=>{if(y0==null)return;cur=Math.min(o.max(),Math.max(0,b+e.clientY-y0));el.style.transform=`translateY(${cur}px)`};
  h.onpointerup=e=>{if(y0==null)return;const mv=Math.abs(e.clientY-y0);y0=null;el.style.transition='transform .25s ease';o.end(cur-b,mv,cur)}}
function wire(){const sh=document.getElementById('sh');
  if(sh){const off=()=>sh.offsetHeight-124,pos=()=>sh.style.transform=col?`translateY(${off()}px)`:'translateY(0)';
    sh.style.transition='none';pos();
    drag(document.getElementById('gr'),sh,{base:()=>col?off():0,max:off,end:(dy,mv)=>{col=mv<4?!col:col?!(dy<-60):dy>60;pos()}})}
  const md=document.getElementById('md');
  if(md)drag(document.getElementById('mg'),md,{base:()=>0,max:()=>md.offsetHeight,end:(dy,mv,cur)=>cur>110?closeM():md.style.transform='translateY(0)'})}
function closeM(){const md=document.getElementById('md');if(md)md.style.transform='translateY(100%)';setTimeout(()=>{modal=false;warn=false;editing=null;dl=false;imp=null;impDone='';lvId=null;draw()},220)}
const fv=i=>document.getElementById(i).value,wn=t=>{document.getElementById('wn').textContent=t};
function save(){const ed=editing,d=ed||fromIso(fv('f-d')),a=fv('f-a'),b=fv('f-b');
  if(isNaN(d)||!a||!b||b<=a)return wn('Pick a date and an end time after the start.');
  if(!ed&&work.includes(d))return wn('A shift already exists on '+fd(d)+'. Tap that date and use Edit.');
  const e=ed?[]:check(d).concat(off(d)?['You have approved full-day leave on this day']:[]);
  if(e.length&&!warn){warn=true;document.getElementById('sv').textContent='Save anyway';return wn('⚠ '+e.join(' · '))}
  if(!ed){work.push(d);work.sort((x,y)=>x-y)}
  S[d]={...(S[d]||{f:''}),s:a,e:b,st:fv('f-s')};pS(d);goto(d);col=false;closeM()}
function delShift(){const b=document.getElementById('dl');
  if(!dl){dl=true;b.textContent='Tap again to confirm delete';return}
  xS(editing);delete S[editing];work.splice(work.indexOf(editing),1);closeM()}
function modalHTML(){const ed=editing,x=ed?S[ed]:{s:'07:00',e:'14:48',st:'Scheduled',p:0},dv=ed||sel;
  const opts=[['Scheduled','Scheduled'],['Planned','Planned'],['Review','Under Review'],['Approved','Approved'],['Denied','Denied']].map(o=>`<option value="${o[0]}" ${o[0]==x.st?'selected':''}>${o[1]}</option>`).join('');
  return `<div class="ov" onclick="if(event.target==this)closeM()"><div class="mod" id="md"><div class="grab" id="mg"></div><h2>${ed?'Edit shift · '+fd(ed):'Add shift'}</h2>
  <div class="two"><div class="f"><label>Date</label><input id="f-d" type="date" value="${iso(dv)}" ${ed?'disabled':''}></div>
  <div class="f"><label>Status</label><select id="f-s">${opts}</select></div>
  <div class="f"><label>Start</label><input id="f-a" type="time" value="${x.s}"></div><div class="f"><label>End</label><input id="f-b" type="time" value="${x.e}"></div></div>
  <div id="wn" class="bad m" style="margin-top:8px;min-height:16px"></div><button class="btn" id="sv" onclick="save()">${ed?'Save changes':'Save shift'}</button>${ed?'<button class="btn" id="dl" style="background:var(--red)" onclick="delShift()">Delete shift</button>':''}</div></div>`}
const EX='Date,Start Time,End Time,Status\n2026-10-03,07:00,14:48,Scheduled\n2026-10-07,14:00,21:48,Planned\n2026-10-05,07:00,14:48,Scheduled\n2026-11-02,07:00,14:48,Scheduled';
const SM={scheduled:'Scheduled',planned:'Planned',review:'Review',underreview:'Review',approved:'Approved',completed:'Approved',denied:'Denied'};
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
  else if(!st)r.err='Unknown status "'+sr+'"';else if(isNaN(p))r.err='Unreadable partial hours';else if(seen.has(r.d))r.err='Duplicate date in file';
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
  impDone=`Added ${a}, replaced ${rp}. `+(bad.length?`⚠ These days break your limits: ${bad.map(fd).join(', ')}.`:'All days are within your limits.');imp=null;draw()}
function impHTML(){let b;
  if(impDone)b=`<div class="card"><div class="t">✓ Import finished</div><div class="m" style="margin-top:6px">${esc(impDone)}</div></div><button class="btn" onclick="closeM()">Done</button>`;
  else if(!imp)b=`<div class="m">Columns: Date, Start Time, End Time, Status (extra columns are ignored). Partial time off is requested from the Leave tab.<br>Date as YYYY-MM-DD or DD/MM/YYYY · times in 24h (07:00) · status: Scheduled, Planned, Under Review, Approved, Denied.</div>
  <div class="f"><label>Excel or CSV file</label><input type="file" accept=".xlsx,.xls,.csv,.txt" onchange="readFile(this.files[0])"></div>
  <div class="f"><label>…or paste CSV</label><textarea id="imp-t" rows="5" placeholder="Date,Start Time,End Time,Status"></textarea></div>
  <div id="iw" class="bad m" style="min-height:16px;margin-top:6px"></div><div class="two"><button class="btn" style="background:#8a97b8" onclick="document.getElementById('imp-t').value=EX">Load example</button><button class="btn" onclick="pv()">Preview</button></div>`;
  else{const nn=imp.filter(r=>r.kind=='new').length,nc=imp.filter(r=>r.kind=='conflict').length,ne=imp.filter(r=>r.err).length;
    b=`<div class="m" style="margin-bottom:8px">${nn} new · ${nc} clash with existing shifts · ${ne} with errors. Rows with errors are never imported.</div>`+(imp.length?imp.map((r,i)=>`<div class="card row" style="padding:9px 12px"><div><div class="t">${r.lab}${r.err?'':' · '+tm(r.s)+'–'+tm(r.e)}</div><div class="m">${r.err?esc(r.err):(lab[r.st]||r.st)}</div></div>${r.err?'<span class="pill st-Denied">Error</span>':r.kind=='new'?'<span class="pill st-Approved">New</span>':`<select style="width:auto" onchange="imp[${i}].act=this.value;ub()"><option value="skip">Keep existing</option><option value="replace">Replace</option></select>`}</div>`).join(''):'<div class="card">No rows found.</div>')+
    `<div class="two"><button class="btn" style="background:#8a97b8" onclick="imp=null;draw()">Back</button><button class="btn" id="ib" onclick="doImport()" ${cnt()?'':'disabled'}>Import ${cnt()} shifts</button></div>`}
  return `<div class="ov" onclick="if(event.target==this)closeM()"><div class="mod" id="md"><div class="grab" id="mg"></div><h2>Import schedule</h2>${b}</div></div>`}
function draw(){const v=[sched,swaps,leave,rules][tab]();
  document.getElementById('app').innerHTML=v+`<button class="fab" onclick="openM(null)">+</button><div class="nav">${[0,1,null,2,3].map(i=>i===null?'<span style="width:25%"></span>':`<button class="${i==tab?'on':''}" onclick="tab=${i};draw()">${icons[i]}${names[i]}</button>`).join('')}</div>`+(modal=='imp'?impHTML():modal=='exp'?expHTML():modal=='lv'?leaveHTML():modal?modalHTML():'');wire();if(modal=='lv')lu()}
function tsv(){const it=[];
  work.forEach(d=>{const x=S[d];it.push([d,0,'Shift','',x.s,x.e,hm(x.e)-hm(x.s),lab[x.st]||x.st,x.f||'']) });
  leaves.forEach(l=>it.push([l.d,1,'Leave',l.type,l.full?'':l.s,l.full?'':l.e,dur(l),lab[l.st]||l.st,l.full?'Full day':'Partial']));
  it.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
  const rows=[['Date','Weekday','Kind','Leave type','Start','End','Minutes','Status','Note'],...it.map(r=>[iso(r[0]),DAYN[dow(r[0])],...r.slice(2)])];
  rows.push([],['Balances (minutes remaining)']);Object.keys(base).forEach(k=>rows.push(['','','Balance',k,'','',rem(k),'Remaining','']));
  return rows.map(r=>r.join('\t')).join('\n')}
async function cp(){const t=document.getElementById('ex-t');t.select();let ok=false;try{await navigator.clipboard.writeText(t.value);ok=true}catch(e){try{ok=document.execCommand('copy')}catch(e2){}}
  document.getElementById('ex-m').textContent=ok?'Copied. Paste into cell A1 of a Google Sheet.':'Could not copy automatically. Select the text and copy it.'}
function expHTML(){return `<div class="ov" onclick="if(event.target==this)closeM()"><div class="mod" id="md"><div class="grab" id="mg"></div><h2>Export for payroll</h2>
  <div class="m">All shifts, leave requests and remaining balances, in minutes, sorted by date. Tab-separated, so it lands in separate columns when pasted into Google Sheets.</div>
  <div class="f"><textarea id="ex-t" rows="8" readonly style="font:11px monospace;white-space:pre">${esc(tsv())}</textarea></div>
  <div id="ex-m" class="ok m" style="min-height:16px;margin-top:6px"></div><div class="two"><button class="btn" style="background:#8a97b8" onclick="closeM()">Close</button><button class="btn" onclick="cp()">Copy</button></div></div></div>`}
const DEMO=structuredClone({S,work,leaves});
let db=null,dbOk=false,cl=false;
const dbOpen=()=>new Promise((res,rej)=>{try{const r=indexedDB.open('shiftapp',1);r.onupgradeneeded=()=>{const d=r.result;d.createObjectStore('shifts',{keyPath:'d'});d.createObjectStore('leaves',{keyPath:'id'});d.createObjectStore('meta',{keyPath:'k'})};r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);r.onblocked=()=>rej('blocked')}catch(e){rej(e)}});
const getAll=n=>new Promise((res,rej)=>{const q=db.transaction(n).objectStore(n).getAll();q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)});
const put=(n,v)=>{if(!dbOk)return;try{const t=db.transaction(n,'readwrite');t.objectStore(n).put(v);t.oncomplete=()=>window.dispatchEvent(new Event('localchange'));t.onerror=()=>{dbOk=false}}catch(e){dbOk=false}};
const pS=d=>{if(S[d])put('shifts',{...S[d],d,u:Date.now(),dirty:1})},xS=d=>put('shifts',{d,del:true,u:Date.now(),dirty:1});
const pL=l=>put('leaves',{...l,u:Date.now(),dirty:1}),xL=id=>put('leaves',{id,del:true,u:Date.now(),dirty:1});
const pM=()=>put('meta',{k:'rules',v:{...R},u:Date.now(),dirty:1}),pB=()=>put('meta',{k:'balances',v:{...base},u:Date.now(),dirty:1});
async function boot(){try{db=await dbOpen();dbOk=true;const[sh,lv,me]=await Promise.all([getAll('shifts'),getAll('leaves'),getAll('meta')]),m=Object.fromEntries(me.map(x=>[x.k,x.v]));
  if(m.seeded){work.length=0;Object.keys(S).forEach(k=>delete S[k]);sh.filter(x=>!x.del).forEach(x=>{S[x.d]=x;work.push(x.d)});work.sort((a,b)=>a-b);leaves=lv.filter(x=>!x.del);if(m.rules)Object.assign(R,m.rules);if(m.balances)Object.assign(base,m.balances);lid=Math.max(m.lid||1,1,...lv.map(x=>x.id+1))}
  else{work.length=0;Object.keys(S).forEach(k=>delete S[k]);leaves=[];put('meta',{k:'seeded',v:1})}}catch(e){dbOk=false}}
function wipe(){work.forEach(d=>xS(d));leaves.forEach(l=>xL(l.id));work.length=0;Object.keys(S).forEach(k=>delete S[k]);leaves=[]}
function demo(){wipe();const D=structuredClone(DEMO);Object.assign(S,D.S);work.push(...D.work);leaves=D.leaves;work.forEach(pS);leaves.forEach(pL);lid=Math.max(lid,5);Object.assign(base,DEMO_BASE);pB();draw()}
function clr(){const b=document.getElementById('clr');if(!cl){cl=true;b.textContent='Tap again to erase everything (also in the cloud once synced)';return}cl=false;wipe();draw()}
const ready=boot();ready.then(draw);
window.redraw=()=>{const a=document.activeElement;if(!modal&&!(a&&/INPUT|TEXTAREA|SELECT/.test(a.tagName)))draw()};
const idbGet=(n,k)=>new Promise((res,rej)=>{const q=db.transaction(n).objectStore(n).get(k);q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)});
const putRaw=(n,v)=>new Promise((res,rej)=>{const t=db.transaction(n,'readwrite');t.objectStore(n).put(v);t.oncomplete=res;t.onerror=()=>rej(t.error)});
const keyOf=(n,r)=>n=='shifts'?r.d:n=='leaves'?r.id:r.k;
// Bridge used by js/sync.js. Records merge per record: the newest edit time (u) wins.
window.syncApi={
  async dirty(){await ready;const[a,b,c]=await Promise.all([getAll('shifts'),getAll('leaves'),getAll('meta')]);return{shifts:a.filter(x=>x.dirty),leaves:b.filter(x=>x.dirty),rules:c.filter(x=>(x.k=='rules'||x.k=='balances')&&x.dirty)}},
  async apply(n,r){await ready;const cur=await idbGet(n,keyOf(n,r));if(cur&&cur.u>=r.u)return;await putRaw(n,{...r,dirty:0});
    if(n=='shifts'){if(r.del){delete S[r.d];const i=work.indexOf(r.d);if(i>=0)work.splice(i,1)}else{S[r.d]={...r};if(!work.includes(r.d)){work.push(r.d);work.sort((a,b)=>a-b)}}}
    else if(n=='leaves'){leaves=leaves.filter(x=>x.id!=r.id);if(!r.del)leaves.push({...r})}
    else if(r.k=='rules')Object.assign(R,r.v);else if(r.k=='balances')Object.assign(base,r.v);
    window.redraw()},
  async clean(n,r){await ready;const cur=await idbGet(n,keyOf(n,r));if(cur&&cur.u==r.u)await putRaw(n,{...cur,dirty:0})}
};
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
