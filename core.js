(function(root){
  'use strict';
  const categories=[['sleep','睡眠','☾','#6476ba'],['prepare','身支度','☀','#be8a4c'],['house','家事','⌂','#ae7689'],['exercise','運動','↗','#5d9a71'],['work','仕事','▣','#4e8fa8'],['study','勉強','▤','#8b76ad'],['play','遊び','♫','#d08a66'],['meal','食事','♨','#b49a47'],['other','その他','•••','#849294']];
  function validate(data){
    if(!data||data.version!==1||!Array.isArray(data.sessions))throw Error('対応しているバックアップではありません。');
    let previous=0;
    data.sessions.forEach((s,i)=>{
      if(!s||!categories.some(c=>c[0]===s.category)||!Number.isSafeInteger(s.start)||s.start<0||s.start>8640000000000000||s.start<previous||!(s.end===null||(Number.isSafeInteger(s.end)&&s.end>=s.start&&s.end<=8640000000000000))||(s.end===null&&i!==data.sessions.length-1))throw Error('記録の形式または時刻が不正です。');
      previous=s.end===null?s.start:s.end;
    });return data;
  }
  function change(data,category,now){
    validate(data);if(category!==null&&!categories.some(c=>c[0]===category))throw Error('不明な行動です。');
    const copy=JSON.parse(JSON.stringify(data)),last=copy.sessions.at(-1);
    if(last&&now<(last.end??last.start))throw Error('端末の時計が記録時刻より前です。日時設定を確認してください。');
    if(last?.end===null){if(last.category===category)return copy;last.end=now;}
    if(category)copy.sessions.push({category,start:now,end:null});return copy;
  }
  function bounds(date){return [new Date(date.getFullYear(),date.getMonth(),date.getDate()).getTime(),new Date(date.getFullYear(),date.getMonth(),date.getDate()+1).getTime()];}
  function summarize(data,date,now){const [start,end]=bounds(date),totals=Object.fromEntries(categories.map(c=>[c[0],0])),rows=[];for(const s of data.sessions){const a=Math.max(start,s.start),b=Math.min(end,s.end??now,now);if(b>a){totals[s.category]+=b-a;rows.push({...s,start:a,end:b});}}return {totals,rows,total:Object.values(totals).reduce((a,b)=>a+b,0),dayLength:end-start};}
  const api={categories,validate,change,bounds,summarize};if(typeof module!=='undefined')module.exports=api;else root.TimeCore=api;
})(globalThis);
