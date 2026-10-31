import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const desktop=process.env.PUDDING_DESKTOP_DIR||path.resolve(import.meta.dirname,'../../pudding-desktop');
const require=createRequire(path.join(desktop,'web/package.json'));
const ts=require('typescript');
const root=path.resolve(import.meta.dirname,'../extensions/widgets');
const languages=['en','zh-CN','zh-TW','ja','ko','es','de','fr'];
const symbols={notes:'DICTIONARY',reversi:'DICTIONARY',debate:'DICTIONARY',doudizhu:'dict',undercover:'dict','synology-files':'translations','pocket-studio':'DICT'};
function load(name){
 let locale='en';const listeners=[];const cache=new Map();
 const sdk={locale:{read:()=>locale,subscribe:f=>{listeners.push(f);return()=>{}}}};
 function module(file,extra=''){
  file=path.resolve(file);if(cache.has(file))return cache.get(file);
  if(file.endsWith('.json'))return JSON.parse(fs.readFileSync(file,'utf8'));
  if(!path.extname(file))file+='.ts';
  const exports={};cache.set(file,exports);
  const code=ts.transpileModule(fs.readFileSync(file,'utf8')+extra,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
  vm.runInNewContext(code,{exports,Error,require:id=>id==='@pudding/widget'?{pudding:sdk}:id.startsWith('.')?module(path.resolve(path.dirname(file),id)):require(id)}, {filename:file});return exports;
 }
 const text=module(path.join(root,name,'source/src/text.ts'),'\nexport const __catalog='+ (symbols[name]||'messages')+';\nexport const __extra=extra;');
 return {text,module,set(value){locale=value;text.setLocale?.(value);listeners.forEach(f=>f())}};
}
const names=fs.readdirSync(root).filter(name=>fs.existsSync(path.join(root,name,'manifest.json')));
for(const name of names)test(`${name}: eight language switches, English fallback and literal interpolation`,()=>{
 const {text,set}=load(name);const dict=text.__catalog;const music=name==='pocket-studio';
 const english=music?Object.fromEntries(Object.entries(dict).map(([k,v])=>[k,v.en])):dict.en;
 const key=Object.keys(english).find(k=>!k.startsWith('desc'));
 const params={count:9,name:'$& $$ {color} 🎵',color:'$& $$ {name}',seat:'$& $$ {cycle}',cycle:3,result:'$& $$ {name}',title:'$& $$ {count}'};
 for(const lang of languages){
  set(lang);const dictionary=music?(lang==='en'||lang.startsWith('zh')?Object.fromEntries(Object.entries(dict).map(([k,v])=>[k,v[lang]])):text.__extra[lang].messages):dict[lang];
  assert.deepEqual(Object.keys(dictionary).sort(),Object.keys(english).sort());
  for(const k of Object.keys(english)){
   assert.equal(typeof dictionary[k],'string',`${lang}:${k}`);assert.ok(dictionary[k].trim(),`${lang}:${k}`);
   const placeholders=s=>[...s.matchAll(/\{\w+\}/g)].map(m=>m[0]).sort();
   assert.deepEqual(placeholders(dictionary[k]),placeholders(english[k]),`${lang}:${k}`);
   const rendered=text.t(k,params);assert.equal(typeof rendered,'string');
   for(const slot of placeholders(dictionary[k])){const v=params[slot.slice(1,-1)];if(v!==undefined)assert.ok(rendered.includes(String(v)),`${lang}:${k} must preserve interpolation value`);}
  }
  const main=text.t(key);assert.ok(main);if(!['en','zh-CN','zh-TW'].includes(lang))assert.ok(Object.keys(english).some(k=>dictionary[k]!==english[k]),`${lang} uses a translated catalog`);
 }
 set('it-IT');assert.equal(text.t(key),english[key]);for(const [regional,normalized]of Object.entries({'ja-JP':'ja','ko-KR':'ko','es-MX':'es','de-DE':'de','fr-CA':'fr','zh-Hant-HK':'zh-TW','zh-Hans':'zh-CN','en-GB':'en'})){set(regional);assert.equal(text.normalizeLocale(regional),normalized);const expected=music?(normalized==='en'||normalized.startsWith('zh')?dict[key][normalized]:text.__extra[normalized].messages[key]):dict[normalized][key];assert.equal(text.t(key),expected);}
 set('ja');const translated=music?text.__extra.ja.messages:dict.ja;const old=translated[key];delete translated[key];assert.equal(text.t(key),english[key]);translated[key]=old;
});
test('Gomoku invitations, turn notifications, errors and results follow all eight languages',()=>{
 const {text,set}=load('gomoku');const name='$& $$ {result} 🎯';
 for(const lang of languages){set(lang);const invite=text.t('notifyInviteSummary',{color:text.t('stoneBlack')});assert.ok(invite.includes(text.t('stoneBlack')));const result=text.t('notifyMatchFinished',{name});assert.ok(result.includes(name));assert.equal(text.errorText(new Error('Not your turn')),lang==='en'?'Not your turn':lang==='zh-CN'?'还没轮到你':lang==='zh-TW'?'還沒輪到你':text.__extra[lang].errors['Not your turn']);}
 set('xx');assert.equal(text.errorText(new Error('Not your turn')),'Not your turn');
});
test('localized Undercover words and bot clues survive a locale switch without revealing words',()=>{
 const loaded=load('undercover');const rules=loaded.module(path.join(root,'undercover/source/src/rules.ts'));
 for(const lang of languages){
  const bank=rules.getWordPairsForLocale(lang);assert.ok(bank.length>=20);
  for(const pair of bank){assert.notEqual(pair.civilianWord,pair.undercoverWord);for(const [key,word]of [['civilianClues',pair.civilianWord],['undercoverClues',pair.undercoverWord]])for(const clue of pair[key])assert.equal(rules.containsOwnSecretWord(clue,word),false,`${lang}:${pair.id}: clue must not reveal its word`);}
  const saved=JSON.stringify(bank[0]);loaded.set('en');assert.equal(JSON.stringify(bank[0]),saved);
 }
 assert.deepEqual(JSON.parse(JSON.stringify(rules.getWordPairsForLocale('it'))),JSON.parse(JSON.stringify(rules.WORD_PAIRS_EN)));
});

test('Undercover new and custom games use localized bot clues, valid voting and stable state',()=>{
 const loaded=load('undercover');const rules=loaded.module(path.join(root,'undercover/source/src/rules.ts'));
 for(const lang of languages)for(const custom of [false,true]){
  let p=rules.createInitialPosition(1,4,1,custom?'custom':'daily',custom?'Alpha':null,custom?'Beta':null,undefined,lang);
  let l={...rules.initialLobby(),round:1,phase:'speaking'};
  const originalWords=JSON.stringify(p.words);
  for(let i=0;i<80&&!p.winner;i++){
   if(l.phase==='speaking'){
    const clue=rules.chooseBotSpeech(p,p.turn);assert.ok(clue.trim());assert.equal(rules.containsOwnSecretWord(clue,p.words[p.turn]),false,`${lang}: bot protects its word`);
    ({lobby:l,position:p}=rules.applySpeak(l,p,p.turn,clue));
   }else if(l.phase==='voting'){
    const choice=rules.chooseBotVote(p,p.turn);assert.ok(choice.reason.trim());assert.ok(!choice.reason.includes('{'));
    ({lobby:l,position:p}=rules.applyVote(l,p,p.turn,choice.target,choice.reason));
   }else assert.fail(`Unexpected phase ${l.phase}`);
   loaded.set('en');assert.equal(JSON.stringify(p.words),originalWords);
  }
  assert.ok(p.winner,`${lang}: ${custom?'custom':'curated'} game finishes`);
 }
});


test('missing game-specific rank and bot-name translations fall back to English',()=>{
 const cards=load('doudizhu');cards.set('ja');const ranks=cards.text.__extra.ja.ranks;const original=ranks.BJ;delete ranks.BJ;assert.ok(cards.text.comboLabel('single','BJ').includes('Black Joker'));ranks.BJ=original;
 const agents=load('undercover');agents.set('en');const english=agents.text.botNameForSeat('Seat1');agents.set('ja');const names=agents.text.__extra.ja.botNames;const saved=names.Seat1;delete names.Seat1;assert.equal(agents.text.botNameForSeat('Seat1'),english);names.Seat1=saved;
});
