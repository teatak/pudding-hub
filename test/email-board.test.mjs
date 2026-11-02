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
test('rich text preserves tables, typography and safe links while removing active content and remote resources',()=>{
 const html=sanitizeEmailHtml(`<style>body{display:none}</style><script>alert(1)</script>
 <form action="https://tracker.test"><input autofocus></form><iframe src="https://tracker.test"></iframe>
 <img src="https://tracker.test/pixel" onerror="alert(1)"><svg><a href="javascript:alert(1)">bad</a></svg>
 <table class="gb-app" id="root" style="width:100%;background:url(https://tracker.test);position:fixed;z-index:999">
 <tr><td style="color:rgb(1,2,3);padding:12px;background-image:image-set(url(https://tracker.test) 1x)"><strong>Hello</strong></td></tr></table>
 <a href="https://example.org/read" ping="https://tracker.test" onclick="alert(1)">Read</a>
 <a href="mailto:demo@example.org">Reply</a><a href="jav&#x61;script:alert(1)">bad link</a>
 <a href="data:text/html,evil">bad data</a><a href="/relative">relative</a>`);
 const view=new JSDOM(html).window.document;
 assert.ok(view.querySelector('table td strong'));assert.equal(view.querySelector('strong').textContent,'Hello');
 assert.equal(view.querySelector('table').style.width,'100%');assert.equal(view.querySelector('td').style.padding,'12px');assert.equal(view.querySelector('td').style.color,'rgb(1, 2, 3)');
 assert.equal(view.querySelectorAll('script,style,form,input,iframe,img,svg,[class],[id],[onclick],[onerror],[ping]').length,0);
 assert.ok(!html.includes('tracker.test'));assert.ok(!html.includes('position:'));assert.ok(!html.includes('z-index:'));
 const links=[...view.querySelectorAll('a[href]')];assert.deepEqual(links.map(a=>a.getAttribute('href')),['https://example.org/read','mailto:demo@example.org']);
 assert.ok(links.every(a=>a.target==='_blank'&&a.rel==='noopener noreferrer'));
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
