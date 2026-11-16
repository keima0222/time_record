'use strict';
const C=TimeCore,KEY='time-record-v1',$=id=>document.getElementById(id);
let data={version:1,sessions:[]},loadFailed=false,selected=new Date(),summary=false,toastTimer;
const duration=ms=>{const m=Math.floor(ms/60000);return `${Math.floor(m/60)}時間${String(m%60).padStart(2,'0')}分`;};
const clock=ms=>{const s=Math.floor(Math.max(0,ms)/1000);return [Math.floor(s/3600),Math.floor(s/60)%60,s%60].map(n=>String(n).padStart(2,'0')).join(':');};
const dateText=d=>d.toLocaleDateString('ja-JP',{year:'numeric',month:'long',day:'numeric',weekday:'short'});
function toast(text){$('toast').textContent=text;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,5500);}
function read(){const raw=localStorage.getItem(KEY);return raw?C.validate(JSON.parse(raw)):{version:1,sessions:[]};}
try{data=read();}catch(e){loadFailed=true;toast('保存データを読み込めません。データを上書きせず停止しました。バックアップから復元してください。');}
function persist(next){localStorage.setItem(KEY,JSON.stringify(next));data=next;loadFailed=false;render();}
async function switchTo(category){
  const action=()=>{if(loadFailed){toast('データの読み込みエラーを解決するか、バックアップを復元してください。');return;}try{persist(C.change(read(),category,Date.now()));toast(category?`${C.categories.find(c=>c[0]===category)[1]}を記録中です`:'記録を停止しました');}catch(e){toast('保存できませんでした。'+e.message);}};
  if(navigator.locks)await navigator.locks.request(KEY,action);else action();
}
C.categories.forEach(([id,label,icon,color])=>{const b=document.createElement('button');b.className='activity';b.style.setProperty('--color',color);b.dataset.category=id;b.setAttribute('aria-pressed','false');b.innerHTML=`<span class="icon" aria-hidden="true">${icon}</span><span class="label">${label}</span>`;b.onclick=()=>switchTo(id);$('activities').append(b);});
function render(){
  const now=Date.now(),last=data.sessions.at(-1),active=last?.end===null?last:null;
  $('today').textContent=dateText(new Date(now));$('status').textContent=active?'ただいま記録中':'記録をはじめましょう';$('dot').classList.toggle('running',!!active);
  $('activity').textContent=active?C.categories.find(c=>c[0]===active.category)[1]:'今、何をしていますか？';$('elapsed').textContent=clock(active?now-active.start:0);
  $('since').textContent=active?`${new Date(active.start).toLocaleString('ja-JP',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})} から記録中`:'下のボタンを押すと、記録が始まります。';
  $('stop').disabled=!active||loadFailed;document.querySelectorAll('.activity').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.category===active?.category));b.disabled=loadFailed;});
  $('today-total').textContent=duration(C.summarize(data,new Date(),now).total);if(summary)renderSummary(now);
}
function renderSummary(now){
  const s=C.summarize(data,selected,now);$('selected-date').textContent=dateText(selected);$('day-total').textContent=duration(s.total);$('coverage').textContent=s.total?'記録した時間の内訳':'まだ記録がありません';$('empty').textContent=s.total?'行動ごとの時間を振り返りましょう':'この日の記録はありません。';
  $('next').disabled=C.bounds(selected)[0]>=C.bounds(new Date())[0];let angle=0;const stops=[];
  $('breakdown').replaceChildren();C.categories.forEach(([id,label,,color])=>{const ratio=s.total?s.totals[id]/s.total:0;stops.push(`${color} ${angle}deg ${angle+ratio*360}deg`);angle+=ratio*360;const row=document.createElement('div');row.className='break-row';row.innerHTML=`<span class="swatch" style="background:${color}"></span><div>${label}<div class="bar"><i style="width:${ratio*100}%;background:${color}"></i></div></div><div>${duration(s.totals[id])}<small>${Math.round(ratio*100)}%</small></div>`;$('breakdown').append(row);});
  $('donut').style.background=s.total?`conic-gradient(${stops.join(',')})`:'#e5eae3';$('timeline').replaceChildren();
  const time=t=>t===C.bounds(selected)[1]?'24:00':new Date(t).toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'});
  s.rows.forEach(r=>{const el=document.createElement('div');el.className='timeline-row';el.textContent=`${time(r.start)} – ${time(r.end)}　${C.categories.find(c=>c[0]===r.category)[1]}　${duration(r.end-r.start)}`;$('timeline').append(el);});
}
function showSummary(value){summary=value;$('record-panel').hidden=value;$('summary-panel').hidden=!value;for(const id of ['record-tab','summary-tab'])$(id).removeAttribute('aria-current');$(value?'summary-tab':'record-tab').setAttribute('aria-current','page');render();}
$('record-tab').onclick=()=>showSummary(false);$('summary-tab').onclick=()=>showSummary(true);$('see-summary').onclick=()=>{selected=new Date();showSummary(true);};$('stop').onclick=()=>switchTo(null);
for(const [id,offset] of [['prev',-1],['next',1]])$(id).onclick=()=>{selected=new Date(selected.getFullYear(),selected.getMonth(),selected.getDate()+offset);render();};
let wheels={};
function wheel(name,label,values,value){const col=document.createElement('div');col.className='wheel-col';const title=document.createElement('span');title.textContent=label;const list=document.createElement('div');list.className='wheel';list.tabIndex=0;list.setAttribute('role','listbox');list.setAttribute('aria-label',label);col.append(title,list);$('wheels').append(col);const obj={list,values,value};wheels[name]=obj;
  function update(){obj.value=values[Math.max(0,Math.min(values.length-1,Math.round(list.scrollTop/56)))];list.querySelectorAll('button').forEach(b=>b.setAttribute('aria-selected',String(Number(b.textContent)===obj.value)));if(name!=='day')updateDays();}
  for(const n of values){const b=document.createElement('button');b.type='button';b.textContent=n;b.setAttribute('role','option');b.onclick=()=>{list.scrollTop=values.indexOf(n)*56;update();};list.append(b);}
  list.onscroll=update;list.onkeydown=e=>{if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();list.scrollTop+=e.key==='ArrowDown'?56:-56;}};list.scrollTop=Math.max(0,values.indexOf(value))*56;update();return obj;
}
function updateDays(){if(!wheels.year||!wheels.month||!wheels.day)return;const max=new Date(wheels.year.value,wheels.month.value,0).getDate(),d=wheels.day;if(d.values.length===max)return;const value=Math.min(d.value,max);d.list.parentElement.remove();delete wheels.day;wheel('day','日',Array.from({length:max},(_,i)=>i+1),value);}
$('choose-date').onclick=()=>{wheels={};$('wheels').replaceChildren();$('date-dialog').showModal();const year=new Date().getFullYear(),first=data.sessions.length?new Date(data.sessions[0].start).getFullYear():year;wheel('year','年',Array.from({length:year-Math.min(first,year-5)+1},(_,i)=>Math.min(first,year-5)+i),selected.getFullYear());wheel('month','月',Array.from({length:12},(_,i)=>i+1),selected.getMonth()+1);wheel('day','日',Array.from({length:new Date(selected.getFullYear(),selected.getMonth()+1,0).getDate()},(_,i)=>i+1),selected.getDate());};
$('apply-date').onclick=()=>{const d=new Date(wheels.year.value,wheels.month.value-1,wheels.day.value);if(d>C.bounds(new Date())[0]){toast('今日以前の日付を選んでください。');return;}selected=d;$('date-dialog').close();render();};
$('export').onclick=()=>{try{const raw=localStorage.getItem(KEY);const blob=new Blob([raw??JSON.stringify(data)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`time-record-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(e){toast('バックアップを保存できませんでした。');}};
$('import').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>20000000)throw Error('ファイルが大きすぎます。');const restored=C.validate(JSON.parse(await file.text()));if(restored.sessions.some(s=>s.start>Date.now()||(s.end!==null&&s.end>Date.now())))throw Error('未来の記録が含まれています。端末の日時を確認してください。');if(confirm('現在の全記録をバックアップの内容に置き換えます。よろしいですか？')){const action=()=>persist(restored);if(navigator.locks)await navigator.locks.request(KEY,action);else action();toast('バックアップを復元しました。');}}catch(err){toast('復元できませんでした。'+err.message);}finally{e.target.value='';}};
window.addEventListener('storage',e=>{if(e.key===KEY){try{data=read();loadFailed=false;render();}catch{loadFailed=true;render();toast('別画面の保存データを読み込めませんでした。');}}});document.addEventListener('visibilitychange',()=>{if(!document.hidden){try{data=read();}catch{loadFailed=true;}render();}});
function network(){$('offline').textContent=navigator.onLine?'端末に保存':'オフライン';}window.addEventListener('online',network);window.addEventListener('offline',network);network();render();setInterval(render,1000);
if('serviceWorker' in navigator&&location.protocol!=='file:'){navigator.serviceWorker.register('./sw.js').then(()=>navigator.serviceWorker.ready).then(()=>$('pwa-status').textContent='オフライン準備完了。Chromeのメニューから「ホーム画面に追加」でアプリとして使えます。').catch(()=>$('pwa-status').textContent='オフラインの準備に失敗しました。通信できる場所で再読み込みしてください。');}else $('pwa-status').textContent='オフライン利用にはGitHub PagesなどのHTTPS上で一度開いてください。';
