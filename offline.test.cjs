const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
test('オフライン用ファイル一式が存在し、キャッシュから応答する',async()=>{
 const events={},stored=new Map(),cache={async addAll(files){for(const f of files){const name=f==='./'?'index.html':f.slice(2);assert.ok(fs.existsSync(path.join(__dirname,'..',name)),name);stored.set('https://example.test/app/'+(f==='./'?'':f.slice(2)),{ok:true,name});}},async match(r){return stored.get(r.url);}};
 const context={self:{location:{origin:'https://example.test'},clients:{claim:async()=>{}},addEventListener:(name,fn)=>events[name]=fn},caches:{open:async()=>cache,keys:async()=>['time-record-shell-v1'],delete:async()=>true},URL,fetch:async()=>{throw Error('offline');}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../sw.js'),'utf8'),context);
 let done;events.install({waitUntil:p=>done=p});await done;events.activate({waitUntil:p=>done=p});await done;
 for(const url of ['https://example.test/app/','https://example.test/app/app.js']){events.fetch({request:{method:'GET',url},respondWith:p=>done=p});assert.equal((await done).ok,true);}
});
