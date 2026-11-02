// Real widget UI in an isolated Electron profile, with synthetic mail and images.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const hub = path.resolve(__dirname, '..');
const desktop = process.env.PUDDING_DESKTOP_DIR || path.resolve(hub, '../pudding-desktop');
const out = process.versions.electron ? process.argv[2] : fs.mkdtempSync(path.join(os.tmpdir(), 'pudding-email-ui-'));

if (!process.versions.electron) {
  (async () => {
    const {build} = require(path.join(desktop, 'web/node_modules/esbuild'));
    const html = `<!doctype html><html><head><style>
      body{background:#e5eaf0;padding:16px}.card{max-width:720px;margin:auto;padding:40px;border:1px solid #dadce0;border-radius:28px;background:#f5ffed}
      .avatar{width:48px;height:48px;border-radius:50%}h2{font-size:32px;color:#182818}.cta{display:inline-block;padding:12px 28px;border-radius:24px;background:#0b57d0;color:#fff;text-decoration:none}
      .spacer{height:180px}@media(max-width:600px){.card{padding:12px}.spacer{height:360px}}
      </style><script>parent.__escaped=true</script></head><body><div class="card" id="original-card">
      <img class="avatar" src="https://mail-images.invalid/avatar.png" onerror="parent.__escaped=true"><h2>Original email layout</h2>
      <p>Responsive body and account avatar.</p><a class="cta" href="https://example.invalid/activity">View activity</a><div class="spacer"></div></div></body></html>`;
    const sdk = `export const useWidgetLocale=()=> 'en';
      const meta={id:'message_1',subject:'Email rendering fixture',from:'=?utf-8?q?Google_=E4=BD=BF=E7=94=A8=E6=8A=80=E5=B7=A7?= <sender@example.org>',to:'=?utf-8?B?5L2g5aW9?= <user@example.org>',date:'2026-11-02T00:00:00Z',unread:true};
      export const pudding={locale:{read:()=> 'en'},storage:{read:async()=>({version:0,data:{}}),write:async()=>{throw Error('Unexpected storage write')},subscribe:()=>()=>{}},defineInterface:()=>()=>{},setInstructions:()=>{},
      action:async(name,p)=>({state:'succeeded',result:{data:{id:p.id,unread:false}}}),
      query:async(name)=>{if(name==='profile')return {data:{mailboxID:'mb_'+'a'.repeat(64),address:'user@example.org',configRevision:'fixture'}};if(name==='list')return {data:{messages:[meta],nextCursor:''}};if(name==='message')return {data:{...meta,text:'Plain alternative',html:${JSON.stringify(html)},attachments:[]}};throw Error(name)}};`;
    const built = await build({
      stdin:{contents:`import React from 'react';import{createRoot}from'react-dom/client';import{QueryClient,QueryClientProvider}from'@tanstack/react-query';import App from ${JSON.stringify(hub+'/extensions/widgets/email-board/source/src/App.tsx')};createRoot(document.getElementById('root')).render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0}}})}><App/></QueryClientProvider>);`,resolveDir:hub,loader:'tsx'},
      bundle:true,platform:'browser',format:'iife',jsx:'automatic',write:false,outfile:out+'/widget.js',nodePaths:[desktop+'/web/node_modules'],loader:{'.svg':'dataurl'},
      plugins:[{name:'email-host',setup(b){b.onResolve({filter:/^@pudding\/widget$/},()=>({path:'sdk',namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:sdk,resolveDir:desktop+'/web'}))}}],
    });
    for(const file of built.outputFiles)fs.writeFileSync(file.path,file.contents);
    const css=fs.readFileSync(out+'/widget.css','utf8');
    const csp="default-src 'none'; script-src 'nonce-fixture'; style-src 'unsafe-inline'; img-src data: https:; font-src data:; connect-src 'none'; form-action 'none'; base-uri 'none'; frame-src 'none'";
    fs.writeFileSync(out+'/widget.html',`<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${csp}"><style>${css}\n.gb-message-content h2{color:magenta!important;border-radius:0!important}</style></head><body><div id="root"></div><script nonce="fixture" src="widget.js"></script></body></html>`);
    const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
    const child=require('node:child_process').spawnSync(require(path.join(desktop,'web/node_modules/electron')),[__filename,out],{env,stdio:'inherit',timeout:60000});
    if(child.error)throw child.error;
    if(child.signal)throw Error('Electron terminated: '+child.signal);
    process.exitCode=child.status;
  })().catch(error=>{console.error(error);process.exitCode=1});
} else {
  const {app,BrowserWindow,protocol}=require('electron');
  protocol.registerSchemesAsPrivileged([{scheme:'email-fixture',privileges:{standard:true,secure:true}}]);
  app.setPath('userData',out+'/profile');
  app.whenReady().then(async()=>{
    const win=new BrowserWindow({width:1500,height:1000,show:false,webPreferences:{contextIsolation:true,nodeIntegration:false,backgroundThrottling:false}});
    protocol.handle('email-fixture',request=>{
      const file=new URL(request.url).pathname.endsWith('/widget.js')?'widget.js':'widget.html';
      return new Response(fs.readFileSync(out+'/'+file),{headers:{'Content-Type':file.endsWith('.js')?'application/javascript':'text/html','Content-Security-Policy':'sandbox allow-scripts'}});
    });
    const images=[],followed=[];
    win.webContents.on('console-message',event=>{if(/Refused|Blocked|Error/.test(event.message))console.error(event.message)});
    require(path.join(desktop,'electron/widget-webview.cjs')).configureWidgetGuest(win.webContents,win.webContents.session,url=>followed.push(url));
    win.webContents.session.protocol.interceptBufferProtocol('https',(request,callback)=>{
      if(request.url==='https://mail-images.invalid/avatar.png'){
        images.push(request.url);
        callback({mimeType:'image/png',data:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a6xkAAAAASUVORK5CYII=','base64')});
      }else callback({error:-10});
    });
    const js=code=>win.webContents.executeJavaScript(code,true);
    const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
    const wait=async code=>{for(let n=0;n<120;n++){if(await js(code))return;await pause(40)}throw Error('Timed out: '+code)};
    const inner=code=>win.webContents.mainFrame.frames.find(frame=>frame.url==='about:srcdoc').executeJavaScript(code,true);
    const waitInner=async code=>{for(let n=0;n<120;n++){if(win.webContents.mainFrame.frames.some(frame=>frame.url==='about:srcdoc')&&await inner(code))return;await pause(40)}throw Error('Timed out in body: '+code+' '+JSON.stringify({parent:await js(`document.querySelector('.gb-email-frame')?.outerHTML.slice(0,180)`),body:await inner(`({height:innerHeight,ready:document.readyState,nonce:document.querySelector('script')?.nonce,policy:document.querySelector('meta[http-equiv]').content,image:document.querySelector('img')?.outerHTML})`),images}))};
    await win.loadURL('email-fixture://runtime/widget.html');
    await wait(`!!document.querySelector('#gb-thread-list button')`);
    assert.equal(await js(`document.querySelector('.gb-card-top span').textContent`),'Google 使用技巧 <sender@example.org>');
    await js(`document.querySelector('#gb-thread-list button').click()`);
    const doc='document';
    await wait(`!!document.querySelector('.gb-email-frame')`);
    await waitInner(`!!document.querySelector('#original-card')`);
    await waitInner(`document.querySelector('.avatar').naturalWidth===1`);
    await wait(`parseFloat(document.querySelector('.gb-email-frame').style.height)>300`);
    assert.deepEqual(images,['https://mail-images.invalid/avatar.png']);
    assert.equal(await js(`document.querySelector('.gb-email-frame').getAttribute('sandbox')`),'allow-scripts');
    assert.equal(await js(`document.querySelector('.gb-email-frame').contentDocument`),null);
    assert.equal(await inner(`(()=>{try{return !!parent.document}catch{return false}})()`),false);
    assert.equal(await js(`document.querySelector('.gb-sender-name').textContent`),'Google 使用技巧');
    assert.equal(await js(`document.querySelector('.gb-recipient').textContent`),'To: 你好 <user@example.org>');
    assert.equal(await js(`window.__escaped`),undefined);
    assert.equal(await inner(`${doc}.querySelectorAll('script').length`),1);
    assert.equal(await inner(`${doc}.querySelectorAll('[onerror]').length`),0);
    const styles=await inner(`(()=>{const d=${doc},w=d.defaultView;return ['#original-card','.cta','.avatar','h2'].map(s=>{const c=w.getComputedStyle(d.querySelector(s));return {radius:c.borderRadius,color:c.color,background:c.backgroundColor,padding:c.padding}})})()`);
    assert.equal(styles[0].radius,'28px');assert.equal(styles[0].background,'rgb(245, 255, 237)');assert.equal(styles[0].padding,'40px');
    assert.equal(styles[1].radius,'24px');assert.equal(styles[2].radius,'50%');assert.equal(styles[3].color,'rgb(24, 40, 24)');
    const token=await inner(`document.querySelector('script').textContent.match(/id:"([a-f0-9]+)"/)[1]`);
    const originalHeight=await js(`document.querySelector('.gb-email-frame').style.height`);
    await js(`window.postMessage({type:'pudding-email-body',id:${JSON.stringify(token)},height:30000,href:'https://forged.invalid/'},'*')`);
    await inner(`parent.postMessage({type:'pudding-email-body',id:'wrong-token',height:30000,href:'https://forged.invalid/'},'*')`);
    await pause(100);
    assert.equal(await js(`document.querySelector('.gb-email-frame').style.height`),originalHeight);
    assert.deepEqual(followed,[]);
    const position=await inner(`(()=>{const r=document.querySelector('.cta').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
    const point=await js(`(()=>{const r=document.querySelector('.gb-email-frame').getBoundingClientRect();return {x:Math.round(r.x+${position.x}),y:Math.round(r.y+${position.y})}})()`);
    win.webContents.sendInputEvent({type:'mouseDown',...point,button:'left',clickCount:1});
    win.webContents.sendInputEvent({type:'mouseUp',...point,button:'left',clickCount:1});
    for(let n=0;n<100&&!followed.length;n++)await pause(30);
    assert.deepEqual(followed,['https://example.invalid/activity']);
    const wide=await js(`parseFloat(document.querySelector('.gb-email-frame').style.height)`);
    win.setContentSize(920,1000);
    await waitInner(`${doc}.defaultView.getComputedStyle(${doc}.querySelector('#original-card')).padding==='12px'`);
    await wait(`parseFloat(document.querySelector('.gb-email-frame').style.height)>${wide+80}`);
    win.setContentSize(1500,1000);
    await waitInner(`${doc}.defaultView.getComputedStyle(${doc}.querySelector('#original-card')).padding==='40px'`);
    await wait(`Math.abs(parseFloat(document.querySelector('.gb-email-frame').style.height)-${wide})<2`);
    await win.webContents.capturePage().then(image=>fs.writeFileSync(out+'/rich.png',image.toPNG()));
    await js(`document.querySelectorAll('.gb-view-toggle button')[1].click()`);
    await wait(`document.querySelector('.gb-plain-body')?.textContent==='Plain alternative'`);
    assert.equal(await js(`!!document.querySelector('.gb-email-frame')`),false);
    await js(`document.querySelectorAll('.gb-view-toggle button')[0].click();document.documentElement.style.colorScheme='dark'`);
    await waitInner(`!!document.querySelector('#original-card')`);
    assert.equal(await inner(`${doc}.defaultView.getComputedStyle(${doc}.documentElement).colorScheme`),'light');
    console.log('PASS: encoded names; default image loading; isolated original styles; responsive layout and shrinking height; script removal; safe link forwarding; rich/plain toggle and dark host. Screenshot: '+out+'/rich.png');
    win.destroy();app.quit();
  }).catch(error=>{console.error(error);app.exit(1)});
}
