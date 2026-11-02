import test, {beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks,createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const require=createRequire(path.resolve(process.env.PUDDING_DESKTOP_DIR||'../pudding-desktop','web/package.json'));
const source=new URL('../extensions/widgets/email-board/source/src/',import.meta.url);
let saved,identity,requests,defs,gate;
const message={id:'message_1',subject:'Hello',from:'sender@example.org',to:'user@example.org',date:'2026-11-02T00:00:00Z',unread:true};
globalThis.__emailSDK={
 query:async(name,p={},options={})=>{
  requests.push({name,p});
  if(name==='profile')return {data:{...identity}};
  if(gate)await gate;
  options.signal?.throwIfAborted();
  if(p.mailboxID!==identity.mailboxID||p.configRevision!==identity.configRevision)throw Error('email_connection_changed');
  if(name==='list')return {data:{messages:[message],nextCursor:''}};
  if(name==='message')return {data:{...message,text:'private body '+identity.configRevision,attachments:[]}};
  throw Error('unexpected operation '+name);
 },
 storage:{read:async()=>structuredClone(saved),write:async v=>{assert.equal(v.expectedVersion,saved.version);saved={version:saved.version+1,data:structuredClone(v.data)};return structuredClone(saved)}},
 locale:{read:()=> 'en'},defineInterface:d=>{defs.set(d.name,d);return()=>{}},setInstructions:()=>{},
};
const hook=registerHooks({resolve(s,c,next){if(s==='@pudding/widget')return {url:'data:text/javascript,export const pudding=globalThis.__emailSDK',shortCircuit:true};if(['zod','@tanstack/react-query'].includes(s))return {url:pathToFileURL(require.resolve(s)).href,shortCircuit:true};if(c.parentURL?.startsWith(source.href)&&s.startsWith('./')&&!path.extname(s))return next(s+'.ts',c);return next(s,c)}});
const {createMailbox,registerInterfaces}=await import(new URL('api.ts',source));
const {QueryClient}=await import(pathToFileURL(require.resolve('@tanstack/react-query')));hook.deregister();
let api;
beforeEach(()=>{identity={mailboxID:'mb_'+'a'.repeat(64),address:'user@example.org',configRevision:'r1'};saved={version:0,data:{gmailBoard:{legacy:'untouched'}}};requests=[];defs=new Map();gate=null;api=createMailbox(new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0}}}));registerInterfaces(api)});
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
