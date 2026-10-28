import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..');
const read=async file=>JSON.parse(await fs.readFile(file,'utf8'));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
test('versioned plugin catalog preserves every legacy release and its immutable package',async()=>{
 const old=await read(path.join(root,'plugins/registry.json'));
 const next=await read(path.join(root,'extensions/plugins/registry.json'));
 assert.equal(next.schema_version,2);
 for(const item of old.items){
  const current=next.items.find(c=>c.id===item.id);assert.ok(current);
  for(const release of item.releases||[]){
   assert.deepEqual(current.releases.find(r=>r.version===release.version),release);
   assert.equal(hash(await fs.readFile(path.join(root,'plugins',release.package))),release.package_sha256);
  }
 }
});
test('packager records API in the package, rejects inconsistent requirements and keeps the old catalog unchanged',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'pudding-plugin-api-'));
 try{
  await fs.mkdir(path.join(dir,'scripts'));await fs.mkdir(path.join(dir,'plugins/sample'),{recursive:true});
  await fs.copyFile(path.join(root,'scripts/package-plugin.mjs'),path.join(dir,'scripts/package-plugin.mjs'));
  await fs.copyFile(path.join(root,'scripts/distribution.mjs'),path.join(dir,'scripts/distribution.mjs'));
  await fs.symlink(path.join(root,'node_modules'),path.join(dir,'node_modules'),'dir');
  const old={kind:'pudding.plugin.registry',schema_version:1,name:'fixtures',title:{en:'Fixtures'},items:[]};
  const oldText=JSON.stringify(old);await fs.writeFile(path.join(dir,'plugins/registry.json'),oldText);
  const manifest={name:'sample',id:'test/hub/plugins/sample',version:'1.0.0',title:{en:'Sample'},files:['plugin.yaml'],requires:{pudding_plugin:'1.1.0'}};
  const manifestPath=path.join(dir,'plugins/sample/manifest.json');
  await fs.writeFile(manifestPath,JSON.stringify(manifest));
  const yamlPath=path.join(dir,'plugins/sample/plugin.yaml');
  await fs.writeFile(yamlPath,'id: sample\nname: Sample\nversion: 1.0.0\napi_version: 1.0.0\n');
  const run=()=>execFileSync(process.execPath,[path.join(dir,'scripts/package-plugin.mjs'),'sample'],{cwd:dir,env:{...process.env,PUDDING_CORE_DIR:path.resolve(process.env.PUDDING_CORE_DIR||path.join(root,'../pudding-core'))},stdio:['ignore','pipe','pipe']});
  assert.throws(run,/requirements differ/);
  await assert.rejects(fs.access(path.join(dir,'plugins/sample/releases')));
  await fs.writeFile(yamlPath,'id: sample\nname: Sample\nversion: 1.0.0\napi_version: 1.1.0\n');
  run();
  assert.equal(await fs.readFile(path.join(dir,'plugins/registry.json'),'utf8'),oldText);
  const pkgPath=path.join(dir,'extensions/plugins/sample/releases/1.0.0/sample.pudding-plugin.json');
  const bytes=await fs.readFile(pkgPath);const pkg=JSON.parse(bytes);
  assert.equal(pkg.schema_version,2);assert.equal(pkg.plugin.api_version,'1.1.0');
  const registry=await read(path.join(dir,'extensions/plugins/registry.json'));
  const release=registry.items[0].releases[0];
  assert.equal(release.requires.pudding_plugin,'1.1.0');assert.equal(release.package_sha256,hash(bytes));
  await fs.writeFile(yamlPath,'id: sample\nname: Sample\nversion: 1.0.0\napi_version: 1.1.0\ndescription: Changed\n');
  assert.throws(run,/Immutable plugin release/);
  assert.ok((await fs.readFile(pkgPath)).equals(bytes));
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
