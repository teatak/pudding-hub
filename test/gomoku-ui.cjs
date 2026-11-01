// Shipped game/UI rendered in isolated Electron with an in-memory activity host.
// No model calls, user profile or public catalog is changed by this test.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const hub = path.resolve(__dirname, '..');
const desktop = process.env.PUDDING_DESKTOP_DIR || path.resolve(hub, '../pudding-desktop');
const out = process.versions.electron ? process.argv[2] : process.env.PUDDING_GOMOKU_QA_DIR || fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'pudding-gomoku-ui-'));
fs.mkdirSync(out, { recursive: true });

if (!process.versions.electron) {
  (async () => {
    const { build } = require(path.join(desktop, 'web/node_modules/esbuild'));
    const sdk = `import {useSyncExternalStore} from 'react';
      const f=window.__fixture;const sub=cb=>{f.listeners.add(cb);return()=>f.listeners.delete(cb)};
      export const pudding={state:{read:()=>f.state,write:async({expectedVersion,data})=>{
        if(expectedVersion!==f.state.version)throw Error('widget_state_conflict');
        f.state={version:f.state.version+1,data};f.notify();return f.state;
      }},locale:{read:()=>f.locale,subscribe:()=>()=>{}},
        interaction:{read:()=>f.run,candidates:async()=>({sessions:f.candidates}),onResume:cb=>{f.onResume=cb;return()=>{}},handle:fn=>fn({}),
          connect:async({sessionIDs})=>{f.calls.push({method:'connect',sessionIDs});f.run={...f.run,participants:[{id:'human',kind:'human',name:'Human'},...sessionIDs.map(id=>{const c=f.candidates.find(c=>c.id===id);return{id:c.participantID,kind:c.kind,name:c.name}})]};f.notify();return f.run},
          pause:async()=>{f.calls.push({method:'pause'});f.run={...f.run,status:'paused',reason:''};f.notify();return f.run},
          resume:async()=>{f.calls.push({method:'resume'});f.run={...f.run,status:'running',reason:''};f.notify();await f.onResume?.();return f.run},
          setRequests:async()=>f.run,notify:async notice=>{f.calls.push({method:'notify',notice});return f.run}},
        defineInterface:()=>()=>{},setInstructions:()=>{}};
      export const useWidgetState=()=>useSyncExternalStore(sub,()=>f.state);
      export const useWidgetInteraction=()=>useSyncExternalStore(sub,()=>f.run);
      export const useWidgetLocale=()=>useSyncExternalStore(sub,()=>f.locale);`;
    const built = await build({
      stdin: { contents: `import React from 'react';import{createRoot}from'react-dom/client';import App from ${JSON.stringify(hub+'/extensions/widgets/gomoku/source/src/App.tsx')};createRoot(document.getElementById('root')).render(<App/>);`, resolveDir: hub, loader: 'tsx' },
      bundle: true, platform: 'browser', format: 'iife', jsx: 'automatic', write: false,
      outfile: out+'/widget.js', nodePaths: [desktop+'/web/node_modules'],
      plugins: [{ name:'display-host', setup(b) {
        b.onResolve({filter:/^@pudding\/widget$/},()=>({path:'sdk',namespace:'fixture'}));
        b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:sdk,resolveDir:desktop+'/web'}));
      }}],
    });
    for (const file of built.outputFiles) fs.writeFileSync(file.path,file.contents);
    const participants = ['a','b'].map((id,i)=>({id,kind:'session',name:'Player '+(i+1)}));
    const state = {version:0,data:{lobby:{round:1,players:['a','b'],phase:'playing',seats:{Black:'a',White:'b'},ready:['a','b'],startsAt:null},position:{history:[],resigned:null,turnStartedAt:null,turnElapsedMS:0}}};
    const run = {id:'fixture',status:'running',participants,receipts:[]};
    const candidates = [...participants,{id:'c',kind:'external',name:'New agent'}].map(p=>({...p,participantID:p.id,model:{id:'flash',name:'DeepSeek Flash',icon:'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><circle cx="12" cy="12" r="12" fill="cornflowerblue"/></svg>'}}));
    const fixture=`window.AudioContext=undefined;window.__fixture={state:${JSON.stringify(state)},run:${JSON.stringify(run)},candidates:${JSON.stringify(candidates)},locale:'zh-CN',listeners:new Set(),errors:[],calls:[]};
      const f=window.__fixture;f.notify=()=>{for(const cb of f.listeners)cb()};
      f.history=h=>{f.state={version:f.state.version+1,data:{...f.state.data,position:{...f.state.data.position,history:h}}};f.notify()};
      window.addEventListener('error',e=>f.errors.push(String(e.error||e.message)));window.addEventListener('unhandledrejection',e=>f.errors.push(String(e.reason)));`;
    fs.writeFileSync(out+'/widget.html',`<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0}html{color-scheme:light}</style><link rel="stylesheet" href="widget.css"></head><body><div id="root"></div><script>${fixture}</script><script src="widget.js"></script></body></html>`);
    const executable=require(path.join(desktop,'web/node_modules/electron'));
    const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
    const child=require('node:child_process').spawnSync(executable,[__filename,out],{env,stdio:'inherit',timeout:90000});
    if(child.error)throw child.error;process.exitCode=child.status||0;
  })().catch(e=>{console.error(e);process.exitCode=1});
} else {
  const {app,BrowserWindow,nativeTheme}=require('electron');
  app.setPath('userData',out+'/profile');
  let win;const checks=[];const delay=ms=>new Promise(r=>setTimeout(r,ms));
  app.whenReady().then(async()=>{
    win=new BrowserWindow({width:1100,height:900,show:false,webPreferences:{contextIsolation:true,nodeIntegration:false,backgroundThrottling:false}});
    const js=s=>win.webContents.executeJavaScript(s,true);
    const wait=async(s)=>{for(let i=0;i<100;i++){if(await js(s))return;await delay(30)}throw Error('Timed out '+s)};
    await win.loadFile(out+'/widget.html');await wait('document.querySelectorAll("[data-player-id]").length===2&&document.querySelectorAll("[data-speech-move]").length===0');
    const geometry=()=>js(`(()=>{const rect=e=>{const r=e.getBoundingClientRect();return[r.x,r.y,r.width,r.height]};return[rect(document.querySelector('[role="group"][data-replaying]')),...[...document.querySelectorAll('[data-player-id]')].map(rect)]})()`);
    const history=async h=>{await js(`window.__fixture.history(${JSON.stringify(h)})`);await delay(400)};
    for(const theme of ['light','dark']){
      nativeTheme.themeSource=theme;await js(`document.documentElement.style.colorScheme=${JSON.stringify(theme)}`);
      for(const [width,height] of [[1100,900],[640,900],[390,844]]){
        win.setContentSize(width,height);await delay(120);await history([]);const before=await geometry();
        for(const comment of ['落子天元','这是一个很长的落子短评，用于验证文字滚动时棋盘和棋手卡片都保持原位。'.repeat(3)]){
          await history([{column:'H',row:8,stone:'B',comment}]);
          assert.deepEqual(await geometry(),before,'comment changes keep board and cards fixed');
          await wait('!!document.querySelector("[data-speech-move]")');
          assert.ok(await js(`(()=>{const p=document.querySelector('[data-speech-move]').getBoundingClientRect();const spot=document.querySelector('[data-row="15"][data-column="H"]');const r=spot.getBoundingClientRect();return p.bottom<=r.y+r.height/2&&spot.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))})()`),'overlay leaves the top row accessible');
          await js('document.querySelector(".gd-danmaku-toggle").click()');await wait('!document.querySelector("[data-speech-move]")');assert.deepEqual(await geometry(),before);
          await js('document.querySelector(".gd-danmaku-toggle").click()');await wait('!!document.querySelector("[data-speech-move]")');assert.deepEqual(await geometry(),before);
        }
        assert.ok(await js('document.documentElement.scrollWidth<=innerWidth'),'no horizontal overflow');
        await js(`window.__fixture.run={...window.__fixture.run,status:'paused',reason:''};window.__fixture.notify()`);
        await wait(`!!document.querySelector('#resume')`);
        assert.deepEqual(await geometry(),before,'pausing and showing the separate actions keeps board/cards fixed');
        assert.ok(await js(`(()=>{const r=document.querySelector('.gd-game-actions').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth})()`),'paused actions fit the viewport');
        await js(`window.__fixture.run={...window.__fixture.run,status:'running'};window.__fixture.notify()`);
        await wait(`!!document.querySelector('#pause')`);
        await delay(400);
        fs.writeFileSync(out+'/'+theme+'-'+width+'.png',(await win.webContents.capturePage()).toPNG());
        checks.push(theme+' '+width+': stable board/cards with empty, short, long and toggled comments; top row accessible');
      }
    }
    await js(`window.__fixture.run={...window.__fixture.run,status:'paused',reason:'restored'};window.__fixture.notify()`);
    await wait(`document.querySelector('[data-connection-paused]')?.textContent==='棋局已恢复，当前处于暂停状态'`);
    const pausedGeometry=await geometry();
    assert.ok(await js(`document.querySelector('#change-players').querySelector('svg')&&document.querySelector('#change-players').getAttribute('aria-label')===document.querySelector('#change-players').title`),'player selection is a labelled icon button');
    assert.equal(await js(`document.querySelector('#change-players').textContent.trim()`),'');
    assert.ok(await js(`(()=>{const e=document.querySelector('#resume'),r=e.getBoundingClientRect();return e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))})()`),'the floating recovery notice never covers the continue action');
    await delay(250);fs.writeFileSync(out+'/paused-separate-actions-dark-mobile.png',(await win.webContents.capturePage()).toPNG());
    const prior=await js(`({lobby:window.__fixture.state.data.lobby,history:window.__fixture.state.data.position.history})`);
    await js(`window.__fixture.calls=[];document.querySelector('#resume').click()`);
    await wait(`window.__fixture.run.status==='running'&&!document.querySelector('#resume')`);
    assert.equal(await js(`window.__fixture.calls.some(c=>c.method==='connect')`),false);
    assert.deepEqual(await js(`({lobby:window.__fixture.state.data.lobby,history:window.__fixture.state.data.position.history})`),prior,'continue retains the round, players, colors and stones');
    assert.deepEqual(await geometry(),pausedGeometry,'continuing does not move the board');
    await js(`document.querySelector('#pause').click()`);await wait(`!!document.querySelector('#resume')`);
    await js(`window.__fixture.calls=[];document.querySelector('#start').click()`);
    await wait(`window.__fixture.state.data.lobby.round===2&&window.__fixture.calls.filter(c=>c.method==='notify').length===2`);
    assert.deepEqual(await js(`window.__fixture.calls.find(c=>c.method==='connect').sessionIDs`),['a','b']);
    assert.deepEqual(await js(`window.__fixture.state.data.lobby.seats`),{Black:'b',White:'a'});
    assert.deepEqual(await js(`window.__fixture.state.data.lobby.ready`),[]);
    assert.deepEqual(await js(`window.__fixture.state.data.position.history`),[]);
    checks.push('continue retains the current round; the separate new-game action reuses players, swaps colors and requests readiness');
    await js(`document.querySelector('#pause').click()`);await wait(`!!document.querySelector('#start')`);
    const saved=await js(`window.__fixture.state`);
    await js(`window.__fixture.calls=[];document.querySelector('#change-players').click()`);
    await wait(`!!document.querySelector('dialog[open]')`);
    assert.deepEqual(await js(`window.__fixture.state`),saved,'choosing players does not change the current game');
    await js(`document.querySelector('dialog .gd-picker-actions button:last-child').click()`);
    await wait(`!document.querySelector('dialog')`);
    assert.deepEqual(await js(`window.__fixture.state`),saved,'cancelling player selection keeps the current game');
    await js(`window.__fixture.candidates=window.__fixture.candidates.map(c=>({...c,connected:c.id!=='a'}));document.querySelector('#start').click()`);
    await wait(`!!document.querySelector('dialog[open]')`);
    assert.equal(await js(`window.__fixture.calls.some(c=>c.method==='connect')`),false,'a new agent is never substituted automatically');
    assert.ok(await js(`!document.querySelector('[data-session="c"]').checked`));
    await js(`document.querySelector('[data-session="c"]').click()`);
    await wait(`!document.querySelector('dialog .gd-picker-actions button:first-child').disabled`);
    await js(`document.querySelector('dialog .gd-picker-actions button:first-child').click()`);
    await wait(`window.__fixture.state.data.lobby.round===3`);
    assert.deepEqual(await js(`window.__fixture.calls.find(c=>c.method==='connect').sessionIDs.sort()`),['b','c']);
    checks.push('selection can be cancelled; an offline original player opens the picker and replacement requires an explicit choice');
    await js(`window.__fixture.run={...window.__fixture.run,status:'paused',reason:'connection_lost'};window.__fixture.notify()`);
    await wait(`document.querySelector('#resume')?.textContent.trim()==='正在恢复…'`);
    assert.ok(await js(`document.querySelector('#resume').disabled&&document.querySelector('#start').disabled&&document.querySelector('#change-players').disabled`));
    checks.push('reconnection is an automatic disabled state rather than a manual continue action');
    for(const locale of ['en','zh-CN','zh-TW','ja','ko','es','de','fr']){
      await js(`window.__fixture.locale=${JSON.stringify(locale)};window.__fixture.notify()`);await delay(50);
      assert.ok(await js(`(()=>{const r=document.querySelector('.gd-game-actions').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth})()`),'reconnecting controls fit in '+locale);
    }
    await js(`window.__fixture.locale='zh-CN';window.__fixture.run={...window.__fixture.run,status:'paused',reason:'restored'};window.__fixture.history([{column:'A',row:1,stone:'B'},{column:'A',row:15,stone:'W'},{column:'B',row:1,stone:'B'},{column:'C',row:15,stone:'W'},{column:'C',row:1,stone:'B'},{column:'E',row:15,stone:'W'},{column:'D',row:1,stone:'B'},{column:'G',row:15,stone:'W'},{column:'E',row:1,stone:'B'}])`);
    await wait(`!document.querySelector('#resume')&&document.querySelector('#start')?.textContent.trim()==='再来一局'`);
    const icon=await js(`(()=>{const e=document.querySelector('#change-players'),r=e.getBoundingClientRect();return{label:e.getAttribute('aria-label'),text:e.textContent.trim(),hit:e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}})()`);
    assert.ok(icon.hit&&icon.label&&!icon.text,'the separate player icon must be visible and clickable');
    assert.equal(await js(`document.querySelector('summary')`),null,'no dropdown remains');
    await delay(250);fs.writeFileSync(out+'/separate-actions-dark-mobile.png',(await win.webContents.capturePage()).toPNG());
    checks.push('finished games show separate rematch and player-icon actions; all eight languages fit the narrow toolbar');
    await js(`window.__fixture.calls=[];window.__fixture.run=null;window.__fixture.state={version:window.__fixture.state.version+1,data:{lobby:{round:0,players:[],phase:'lobby',seats:{},ready:[],startsAt:null},position:{history:[],resigned:null,turnStartedAt:null,turnElapsedMS:0}}};window.__fixture.notify()`);
    await wait(`document.querySelector('#start')?.textContent.trim()==='开一局'&&!document.querySelector('#change-players').disabled`);
    assert.ok(await js(`document.querySelector('#change-players').title.includes('选择棋手')`),'unstarted games label the initial player-selection icon');
    assert.doesNotMatch(await js(`document.querySelector('#change-players').title`),/(?:\.{3}|…)$/u);
    await js(`document.querySelector('#change-players').click()`);await wait(`!!document.querySelector('dialog[open]')`);
    assert.equal(await js(`window.__fixture.calls.length`),0,'selecting initial players never starts a round');
    await delay(250);fs.writeFileSync(out+'/initial-player-picker-dark-mobile.png',(await win.webContents.capturePage()).toPNG());
    checks.push('the initial player icon opens selection without ellipses and without starting a game');
    assert.deepEqual(await js('window.__fixture.errors'),[]);
    fs.writeFileSync(out+'/result.json',JSON.stringify({passed:true,checks,errors:[]},null,2));console.log(JSON.stringify({passed:checks.length,artifacts:out}));
    win.destroy();app.quit();
  }).catch(e=>{console.error(e);if(win)win.destroy();app.exit(1)});
}
