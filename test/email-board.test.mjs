import test, {beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks,createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const require=createRequire(path.resolve(process.env.PUDDING_DESKTOP_DIR||'../pudding-desktop','web/package.json'));
const source=new URL('../extensions/widgets/email-board/source/src/',import.meta.url);
let saved,identity,requests,defs,gate,htmlBody,unread,readFailure,readGate;
const message={id:'message_1',subject:'Hello',from:'sender@example.org',to:'user@example.org',date:'2026-11-02T00:00:00Z',unread:true};
globalThis.__emailSDK={
 query:async(name,p={},options={})=>{
  requests.push({name,p});
  if(name==='profile')return {data:{...identity}};
  if(gate)await gate;
  options.signal?.throwIfAborted();
  if(p.mailboxID!==identity.mailboxID||p.configRevision!==identity.configRevision)throw Error('email_connection_changed');
  if(name==='list')return {data:{messages:[{...message,unread}],nextCursor:''}};
  if(name==='message')return {data:{...message,unread,text:'private body '+identity.configRevision,...(htmlBody?{html:htmlBody}:{}),attachments:[]}};
  throw Error('unexpected operation '+name);
 },
 action:async(name,p)=>{requests.push({name,p});if(readGate)await readGate;if(readFailure)return {state:'unknown',result:{error:'offline'}};assert.equal(name,'markRead');assert.equal(p.mailboxID,identity.mailboxID);assert.equal(p.configRevision,identity.configRevision);unread=false;return {state:'succeeded',result:{data:{id:p.id,unread:false}}}},
 storage:{read:async()=>structuredClone(saved),write:async v=>{assert.equal(v.expectedVersion,saved.version);saved={version:saved.version+1,data:structuredClone(v.data)};return structuredClone(saved)}},
 locale:{read:()=> 'en'},defineInterface:d=>{defs.set(d.name,d);return()=>{}},setInstructions:()=>{},
};
const hook=registerHooks({resolve(s,c,next){if(s==='@pudding/widget')return {url:'data:text/javascript,export const pudding=globalThis.__emailSDK',shortCircuit:true};if(['zod','@tanstack/react-query','dompurify'].includes(s))return {url:pathToFileURL(require.resolve(s)).href,shortCircuit:true};if(c.parentURL?.startsWith(source.href)&&s.startsWith('./')&&!path.extname(s))return next(s+'.ts',c);return next(s,c)}});
const {createMailbox,registerInterfaces}=await import(new URL('api.ts',source));
const {QueryClient}=await import(pathToFileURL(require.resolve('@tanstack/react-query')));
const {JSDOM}=require('jsdom');
const dom=new JSDOM('');
globalThis.window=dom.window;
const {sanitizeEmailHtml}=await import(new URL('html.ts',source));
delete globalThis.window;
const {decodeHeaderWords,parseSender}=await import(new URL('headers.ts',source));
hook.deregister();
let api;
beforeEach(()=>{identity={mailboxID:'mb_'+'a'.repeat(64),address:'user@example.org',configRevision:'r1'};saved={version:0,data:{gmailBoard:{legacy:'untouched'}}};requests=[];defs=new Map();gate=null;htmlBody=undefined;unread=true;readFailure=false;readGate=null;api=createMailbox(new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0}}}));registerInterfaces(api)});
test('generic board batches metadata and persists only local notes/drafts, preserving legacy Gmail data',async()=>{
 const board=await api.board();assert.equal(board.account,identity.mailboxID);assert.equal(api.address(),identity.address);
 assert.deepEqual(requests.filter(r=>r.name!=='profile').map(r=>r.name),['list']);
 const detail=await api.read(board.account,message.id);assert.equal(detail.messages[0].text,'private body r1');assert.equal(detail.messages[0].html,undefined);
 await api.edit(board.account,0,[{id:message.id,status:'reply',note:'Follow up'}],{id:message.id,value:{subject:'Re: Hello',body:'My draft'}});
 assert.deepEqual(saved.data.gmailBoard,{legacy:'untouched'});assert.equal(saved.data.emailBoard.schemaVersion,2);assert.ok(!JSON.stringify(saved).includes('private body'));
 assert.equal(saved.data.emailBoard.accounts[board.account][message.id].draft.body,'My draft');
 assert.ok(defs.has('listMessages')&&defs.has('readMessage'));assert.ok(!defs.has('readThread'));
});
test('credential rotation refreshes reads while retaining notes and drafts for the same mailbox',async()=>{
 const account=await api.profile();await api.list(account);await api.edit(account,0,[{id:message.id,note:'Keep'}]);
 await api.read(account,message.id);identity.configRevision='r2';const detail=await api.read(account,message.id);
 assert.equal(detail.note,'Keep');assert.equal(detail.messages[0].text,'private body r2');
 assert.equal(requests.filter(r=>r.name==='message').length,2);
});
test('HTML and plain alternatives reach readers without storing either body locally',async()=>{
 htmlBody='<table><tr><td><strong>Rich message</strong></td></tr></table>';
 const account=await api.profile();const detail=await api.read(account,message.id);
 assert.equal(detail.messages[0].html,htmlBody);assert.equal(detail.messages[0].text,'private body r1');assert.equal(detail.messages[0].format,'html');
 await api.edit(account,0,[{id:message.id,note:'Keep local'}]);
 assert.ok(!JSON.stringify(saved).includes(htmlBody));assert.ok(!JSON.stringify(saved).includes('private body'));
});
test('opening synchronizes Seen once and updates cached list/detail while model reads remain read-only',async()=>{
 const account=await api.profile();await api.list(account);await api.read(account,message.id);
 assert.equal(requests.filter(r=>r.name==='markRead').length,0);assert.equal(unread,true);
 let release;readGate=new Promise(resolve=>{release=resolve});
 const pending=Promise.all([api.markRead(account,message.id),api.markRead(account,message.id)]);
 while(!requests.some(r=>r.name==='markRead'))await new Promise(resolve=>setTimeout(resolve,0));
 await new Promise(resolve=>setTimeout(resolve,0));assert.equal(requests.filter(r=>r.name==='markRead').length,1);
 assert.equal((await api.list(account)).items[0].unread,true);
 release();await pending;readGate=null;
 assert.equal((await api.list(account)).items[0].unread,false);assert.equal((await api.read(account,message.id)).unread,false);
 const other=createMailbox(new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0}}}));
 assert.equal((await other.list(account)).items[0].unread,false);assert.equal(saved.version,0);
});
test('failed Seen synchronization keeps unread and readable content, with explicit retry and account isolation',async()=>{
 const account=await api.profile();await api.list(account);await api.read(account,message.id);
 readFailure=true;await assert.rejects(api.markRead(account,message.id),/readSyncFailed/);
 assert.equal((await api.list(account)).items[0].unread,true);assert.equal((await api.read(account,message.id)).messages[0].text,'private body r1');
 readFailure=false;await api.markRead(account,message.id);assert.equal((await api.refresh(account)).loadedCount,1);assert.equal((await api.list(account)).items[0].unread,false);
 identity={...identity,mailboxID:'mb_'+'b'.repeat(64),configRevision:'r2'};unread=true;
 await assert.rejects(api.markRead(account,message.id),/wrongAccount/);
 assert.equal((await api.list(identity.mailboxID)).items[0].unread,true);
 assert.equal(requests.filter(r=>r.name==='markRead').length,2);
});
test('isolated rich document retains original styles and default images but removes active markup',()=>{
 const html=sanitizeEmailHtml(`<!doctype html><html><head><style>.card{border-radius:24px;background:#f5ffed}@media(max-width:600px){.card{padding:12px}}</style>
 <meta http-equiv="refresh" content="0;url=https://evil.test"><link rel="stylesheet" href="https://evil.test/style.css"><base href="https://evil.test/"></head><body>
 <script>parent.__unsafe=true</script><form action="https://evil.test"><input autofocus></form><iframe src="https://evil.test"></iframe>
 <img src="https://images.test/avatar.png" onerror="alert(1)"><img src="//images.test/logo.png"><img src="data:image/png;base64,aGVsbG8=">
 <img src="http://images.test/plain.png"><img src="data:image/svg+xml,evil"><img src="cid:attachment">
 <svg><a href="javascript:alert(1)">bad</a></svg>
 <table class="card" id="email-card" style="width:100%;border-bottom:1px solid #ddd;border-radius:32px"><tr><td style="color:rgb(1,2,3);padding:12px"><strong>Hello</strong></td></tr></table>
 <a href="https://example.org/read" ping="https://evil.test" onclick="alert(1)">Read</a><a href="mailto:demo@example.org">Reply</a>
 <a href="jav&#x61;script:alert(1)">bad link</a><a href="data:text/html,evil">bad data</a><a href="/relative">relative</a></body></html>`);
 const view=new JSDOM(html).window.document;
 const table=view.querySelector('table');assert.equal(table.id,'email-card');assert.equal(table.className,'card');
 assert.equal(table.style.width,'100%');assert.equal(table.style.borderRadius,'32px');assert.equal(view.querySelector('td').style.padding,'12px');
 assert.ok([...view.querySelectorAll('style')].some(s=>s.textContent.includes('@media(max-width:600px)')));
 assert.equal(view.querySelectorAll('script,form,input,iframe,svg,base,link,[http-equiv="refresh"],[onclick],[onerror],[ping]').length,0);
 const csp=view.querySelector('meta[http-equiv="Content-Security-Policy"]');assert.equal(csp.parentNode,view.head);
 for(const directive of ["script-src 'none'","frame-src 'none'","form-action 'none'","font-src 'none'","img-src https: data:"])assert.ok(csp.content.includes(directive));
 assert.equal(view.head.querySelector('meta[name="referrer"]').content,'no-referrer');
 const images=[...view.querySelectorAll('img')];assert.deepEqual(images.map(i=>i.getAttribute('src')),['https://images.test/avatar.png','https://images.test/logo.png','data:image/png;base64,aGVsbG8=',null,null,null]);
 assert.ok(images.every(i=>i.getAttribute('referrerpolicy')==='no-referrer'));
 const links=[...view.querySelectorAll('a[href]')];assert.deepEqual(links.map(a=>a.getAttribute('href')),['https://example.org/read','mailto:demo@example.org']);
 assert.ok(links.every(a=>a.target==='_blank'&&a.rel==='noopener noreferrer'));
 assert.equal(sanitizeEmailHtml('  '),'');
});
test('MIME display names decode Q, Base64, folded adjacent words and declared charsets without changing addresses',()=>{
 const q='=?utf-8?q?Google_=E4=BD=BF=E7=94=A8=E6=8A=80=E5=B7=A7?=';
 assert.equal(decodeHeaderWords(q),'Google 使用技巧');
 assert.equal(decodeHeaderWords('=?UTF-8?B?5L2g5aW9?= \r\n =?utf-8?Q?_=E4=B8=96=E7=95=8C?='),'你好 世界');
 assert.equal(decodeHeaderWords('=?iso-8859-1?Q?Andr=E9?='),'André');
 assert.equal(decodeHeaderWords('=?gbk?B?1tDOxA==?='),'中文');
 for(const raw of ['plain_name','=?unknown?Q?abc?=','=?UTF-8?Q?bad=GG?=','=?UTF-8?B?not%base64?='])assert.equal(decodeHeaderWords(raw),raw);
 assert.deepEqual(parseSender('"'+q+'" <sender_name@example.org>'),{name:'Google 使用技巧',email:'sender_name@example.org',full:'Google 使用技巧 <sender_name@example.org>'});
 assert.equal(parseSender('<plain_name@example.org>').name,'plain_name');
});
test('switching mailbox rejects old-account edits and isolates local data',async()=>{
 const old=await api.profile();await api.list(old);await api.edit(old,0,[{id:message.id,note:'Mailbox A only'}]);
 identity={...identity,mailboxID:'mb_'+'b'.repeat(64),address:'second@example.org',configRevision:'r2'};
 await assert.rejects(api.edit(old,1,[{id:message.id,note:'wrong'}]),/wrongAccount/);
 const current=await api.profile();const detail=await api.read(current,message.id);assert.equal(detail.note,'');assert.equal(saved.version,1);
});
test('a configuration change during a request rejects stale results; storage conflicts preserve data',async()=>{
 const account=await api.profile();let release;gate=new Promise(resolve=>{release=resolve});
 const pending=api.list(account);while(!requests.some(r=>r.name==='list'))await new Promise(resolve=>setTimeout(resolve,0));
 identity.configRevision='r2';release();await assert.rejects(pending,/email_connection_changed/);gate=null;
 await api.list(account);saved.version=3;await assert.rejects(api.edit(account,0,[{id:message.id,note:'stale'}]),/conflict/);assert.equal(saved.data.emailBoard,undefined);
});
