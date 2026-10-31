// Real Desktop compiler + SDK + Electron rendering, with an isolated in-memory host.
// No daemon, real model, user profile, or published catalog is modified.
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const hub=path.resolve(__dirname,'..');
const desktop=process.env.PUDDING_DESKTOP_DIR||path.resolve(hub,'../pudding-desktop');
const out=process.versions.electron?process.argv[3]:(process.env.PUDDING_LIGHT_QA_DIR||fs.mkdtempSync(path.join(require('node:os').tmpdir(),'pudding-light-qa-')));
fs.mkdirSync(out,{recursive:true});
if(process.versions.electron){
const {app,BrowserWindow,nativeTheme}=require('electron');
let win;
app.setPath('userData',out+'/profile');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
app.whenReady().then(async()=>{
 nativeTheme.themeSource='light';
 win=new BrowserWindow({width:1060,height:920,show:false,webPreferences:{contextIsolation:true,nodeIntegration:false,backgroundThrottling:false}});
 const js=async s=>{try{return await win.webContents.executeJavaScript(s,true)}catch(e){console.error("EVAL:",s);throw e;}};
 const checks=[];
 const check=(name,value)=>{assert.ok(value,name);checks.push(name);};
 const wait=async(condition)=>{for(let i=0;i<100;i++){if(await js(condition))return;await sleep(35);}throw new Error('Timed out: '+condition);};
 const click=async(selector)=>{await js(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e||e.disabled)throw new Error('Missing or disabled '+${JSON.stringify(selector)});e.click()})()`);await wait('!document.querySelector(".lw-hit-grid button[data-cell=D4]").disabled || window.__qa.state.data.game?.mode === "edit" || !!document.querySelector(".is-solved")');await sleep(100);};
 const clickText=async(text)=>{await js(`(()=>{const e=[...document.querySelectorAll('button')].find(e=>e.textContent.trim()===${JSON.stringify(text)});if(!e||e.disabled)throw new Error('Missing or disabled: '+${JSON.stringify(text)});e.click()})()`);await sleep(170);};
 const shot=async name=>{await sleep(230);fs.writeFileSync(out+'/'+name+'.png',(await win.webContents.capturePage()).toPNG());};
 await win.loadFile(out+'/widget.html');await wait('!!window.__qa && document.querySelectorAll(".lw-hit-grid button").length===36');
 await js('window.__qa.audioCount=0; window.__qa.audioContexts=[]; window.AudioContext=class extends AudioContext{constructor(...args){super(...args);window.__qa.audioContexts.push(this)}createOscillator(){window.__qa.audioCount++;return super.createOscillator()}}; void 0');
 check('initial board renders without overflow',await js('document.documentElement.scrollWidth <= innerWidth'));
 check('light theme applied',await js('getComputedStyle(document.body).backgroundColor')==='rgb(246, 245, 241)');
 check('no AI controls, conversation fields or empty sidebar',await js('!document.querySelector("textarea,select,.lw-ai,.lw-sidebar")'));
 check('game uses the full content width',await js('document.querySelector(".lw-main").clientWidth >= document.querySelector(".lw-layout").clientWidth - 2'));
 await shot('desktop-light');
 const icon=require('node:url').pathToFileURL(path.join(hub,'extensions/widgets/light-workshop/assets/icon.svg')).href;
 const iw=new BrowserWindow({width:512,height:512,show:false});await iw.loadURL(icon);await sleep(80);fs.writeFileSync(out+'/icon.png',(await iw.webContents.capturePage()).toPNG());iw.destroy();
 const pos=await js('(()=>{const r=document.querySelector("[data-cell=D4]").getBoundingClientRect();return{x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)}})()');
 win.webContents.sendInputEvent({type:'mouseDown',button:'left',clickCount:1,...pos});win.webContents.sendInputEvent({type:'mouseUp',button:'left',clickCount:1,...pos});
 await wait('window.__qa.state.data.game?.history.length===1');
 check('trusted input unlocks synthesized sound',await js('window.__qa.audioCount===2 && window.__qa.audioContexts[0]?.state==="running"'));
 await click('[data-cell=D2]');check('tutorial completes in two rotations',await js('document.querySelector(".is-solved") && window.__qa.state.data.game.history.length===2'));await shot('solved');
 const read=await js('window.__qa.invoke("readBoard")');check('actual SDK returns terminal state',read.data?.result?.phase==='solved');
 const stale=await js('window.__qa.invoke("rotateMirror",{cell:"D4"},0)');check('SDK rejects stale write before execution',stale.error?.code==='widget_state_conflict'&&stale.error.executed===false);
 await click('[aria-label="撤销"]');check('undo reopens completed puzzle',await js('!document.querySelector(".is-solved") && window.__qa.state.data.game.history.length===1'));
 await click('[aria-label="音效已开启"]');const sounds=await js('window.__qa.audioCount');await click('[data-cell=D2]');check('mute prevents synthesized notes',await js('window.__qa.audioCount')===sounds);
 await click('[aria-label="重新开始"]');
 const highlighted=await js('window.__qa.invoke("highlightMirror",{cell:"D4"})');
 check('conversation can highlight a mirror without rotating it',highlighted.data?.result?.highlight==='D4'&&highlighted.data?.result?.moves===0);
 const move=await js('window.__qa.invoke("rotateMirror",{cell:"D4"},undefined,"session-a")');
 check('ordinary conversation operates without a selected participant',move.data?.result?.moves===1);
 const observed=await js('window.__qa.invoke("readBoard",{},undefined,"session-b")');
 check('another conversation sees the same board',observed.data?.result?.lastMove==='D4');
 const observedVersion=observed.data.stateVersion;
 await click('[data-cell=D2]');
 const staleMove=await js('window.__qa.invoke("rotateMirror",{cell:"D4"},'+observedVersion+',"session-b")');
 check('human edits invalidate stale model operations',staleMove.error?.code==='widget_state_conflict'&&staleMove.error?.executed===false);
 const finished=await js('window.__qa.invoke("rotateMirror",{cell:"D4"})');
 check('completed puzzle returns a structured business result',finished.data?.result?.code==='finished'&&finished.data?.result?.phase==='solved');
 const validated=await js('window.__qa.invoke("validatePuzzle",{level:window.__qa.state.data.game.level})');
 check('conversation validates puzzles without a designer seat',validated.data?.result?.solvable===true);
 const submitted=await js('window.__qa.invoke("submitPuzzle",{level:{...window.__qa.state.data.game.level,title:"对话出题"}})');
 check('conversation submits a playable puzzle directly',submitted.data?.result?.phase==='playing'&&submitted.data?.result?.board?.title==='对话出题');
 await clickText('新建关卡');check('editor renders tools',await js('document.querySelectorAll(".lw-brushes button").length===5'));
 await click('[data-cell=D4]');await click('[data-cell=D4]');await click('[data-cell=D2]');await click('[data-cell=D2]');
 await js('(()=>{const e=document.querySelector("input");Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set.call(e,"我的光路");e.dispatchEvent(new Event("input",{bubbles:true}))})()');
 await clickText('保存关卡');check('save stores the named editable puzzle',await js('window.__qa.storage.data.levels[0]?.title==="我的光路"'));await shot('editor');
 await clickText('检查并开始');check('editor starts a validated puzzle on first click',await js('window.__qa.state.data.game.mode==="play" && window.__qa.state.data.game.level.title==="我的光路"'));
 await clickText('我的关卡');check('saved library is visible',await js('document.querySelector(".lw-library").textContent.includes("我的光路")'));
 nativeTheme.themeSource='dark';await shot('desktop-dark');check('dark theme applied',await js('getComputedStyle(document.body).backgroundColor')!=='rgb(246, 245, 241)');
 win.setContentSize(390,844);await shot('mobile-dark');check('mobile has no horizontal overflow',await js('document.documentElement.scrollWidth<=innerWidth'));
 nativeTheme.themeSource='light';await shot('mobile-light');
 win.setContentSize(760,900);await shot('compact');check('compact full-width layout has no overflow',await js('document.documentElement.scrollWidth<=innerWidth'));
 check('no collaboration, assignment or notification requests',await js('!window.__qa.methods.some(m=>m.startsWith("interaction"))'));
 check('no renderer/runtime errors',await js('window.__qa.errors.length===0'));
 fs.writeFileSync(out+'/result.json',JSON.stringify({checks,errors:await js('window.__qa.errors'),heap:await js('performance.memory?.usedJSHeapSize')},null,2));console.log(JSON.stringify({passed:checks.length,artifacts:out}));win.destroy();app.quit();
}).catch(e=>{console.error(e);if(win)win.destroy();app.exit(1);});

}else{
(async()=>{

 const {compileWidget}=require(desktop+'/electron/widget-build.cjs');
 const files={};const root=hub+'/extensions/widgets/light-workshop/source';
 function read(folder){for(const e of fs.readdirSync(folder,{withFileTypes:true})){const p=path.join(folder,e.name);if(e.isDirectory())read(p);else files[path.relative(root,p)]=fs.readFileSync(p,'utf8');}}read(root);
 const built=await compileWidget({revisionHash:require('node:crypto').createHash('sha256').update(JSON.stringify(files)).digest('hex'),files});
 if(!built.ok)throw new Error(JSON.stringify(built.diagnostics));
 const bootstrap={locale:'zh-CN',state:{version:0,data:{}},run:null,capabilities:{}};
 const nonce=built.html.match(/nonce="([^"]+)"/)[1];
 const fixture=`(${function(){
  window.__qa={state:{version:0,data:{}},storage:{version:0,data:{}},errors:[],methods:[],pending:new Map()};
  const q=window.__qa,channel=new MessageChannel(),port=channel.port1;
  q.send=data=>port.postMessage(data);
  q.invoke=(name,input={},version=q.state.version,sessionID='session-1')=>new Promise(resolve=>{const id=crypto.randomUUID();q.pending.set(id,resolve);q.send({type:'interaction',action:'invoke',id,name,input,expectedStateVersion:version,sessionID});});
  port.onmessage=({data:m})=>{
   if(m.type==='interactionResult'){q.pending.get(m.id)?.(m);q.pending.delete(m.id);return;}
   if(m.type==='runtimeError'){q.errors.push(m.message);return;}
   if(!m.method)return;
   q.methods.push(m.method);
   let data;
   try{
    if(m.method==='stateWrite'){if(q.state.version!==m.params.expectedVersion)throw new Error('widget_state_conflict');data=q.state={version:q.state.version+1,data:m.params.data};}
    else if(m.method==='storageRead')data=q.storage;
    else if(m.method==='storageWrite'){if(q.storage.version!==m.params.expectedVersion)throw new Error('storage_conflict');data=q.storage={version:q.storage.version+1,data:m.params.data};q.send({type:'storageChanged'});}
    else throw new Error('Unexpected method '+m.method);
    port.postMessage({id:m.id,data});
   }catch(e){port.postMessage({id:m.id,error:{message:e.message}});}
  };port.start();window.postMessage({type:'pudding-widget-connect'},'*',[channel.port2]);
 }.toString()})();`;
 const html=built.html.replace('<div id="root">','<script type="application/json" id="pudding-page-bootstrap">'+JSON.stringify(bootstrap)+'</script><div id="root">').replace('</body>','<script nonce="'+nonce+'">'+fixture+'</script></body>');
 fs.writeFileSync(out+'/widget.html',html);console.log('COMPILED '+Buffer.byteLength(html)+' bytes');

 const executable=require(require.resolve('electron',{paths:[path.join(desktop,'web')]}));
 const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
 const child=require('node:child_process').spawnSync(executable,[__filename,'--browser',out],{env,stdio:'inherit',timeout:90000});
 if(child.error)throw child.error;
 if(child.status!==0)throw new Error('Electron smoke failed: '+(child.signal||child.status));
})().catch(e=>{console.error(e);process.exitCode=1;});
}
