import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {parseHubIndex} from '../contracts/hub.mjs';
import {sourceFiles} from '../scripts/package-widget.mjs';
const root=path.resolve(import.meta.dirname,'..');
const read=async file=>JSON.parse(await fs.readFile(file,'utf8'));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
test('root index has one current self-contained catalog per type',async()=>{
 const index=parseHubIndex(await read(path.join(root,'index.json')));
 const official=index.sources.find(s=>s.id==='teatak/pudding-hub');assert.ok(official);
 assert.deepEqual(official.catalogs.map(c=>c.type).sort(),['plugin','widget']);
 for(const catalog of official.catalogs){
  const folder=catalog.type==='plugin'?'plugins':'widgets';
  const dir=path.join(root,'extensions',folder);
  assert.equal(catalog.url,`https://teatak.github.io/pudding-hub/extensions/${folder}/registry.json`);
  const registry=await read(path.join(dir,'registry.json'));
  assert.equal(registry.schemaVersion??registry.schema_version,catalog.schemaVersion);
  for(const item of registry.items){
   for(const release of item.releases){
    const bytes=await fs.readFile(path.join(dir,release.package));
    assert.equal(hash(bytes),release.packageHash??release.package_sha256);
    if(release.manifest)await fs.access(path.join(dir,release.manifest));
   }
   if(catalog.type==='widget') {
    const authorDir=path.join(dir,item.id.split('/').at(-1));
    const source=path.join(authorDir,'source');
    const manifest=await read(path.join(authorDir,'manifest.json'));
    const current=item.releases.find(release=>release.version===manifest.version);
    assert.ok(current,`missing active release for ${item.id}`);
    const pkg=await read(path.join(dir,current.package));
    assert.deepEqual(pkg.source.files,await sourceFiles(source),`new catalog must package active sources for ${item.id}`);
   }
   if(item.icon?.svg)await fs.access(path.join(dir,item.icon.svg));
  }
 }
});
test('public index validator stays synchronized with the Core runtime contract',async()=>{
 const core=path.resolve(process.env.PUDDING_CORE_DIR||path.join(root,'../pudding-core'));
 assert.ok((await fs.readFile(path.join(root,'contracts/hub.mjs'))).equals(await fs.readFile(path.join(core,'contracts/hub.mjs'))));
});

test('legacy catalogs retain byte-identical artifacts without authoring sources',async()=>{
 for(const folder of ['widgets','plugins']) {
  const legacy=path.join(root,folder), current=path.join(root,'extensions',folder);
  const registry=await read(path.join(legacy,'registry.json'));
  for(const item of registry.items) {
   const name=(item.name||item.id.split('/').at(-1));
   const author=path.join(current,name);
   await fs.access(path.join(author,'manifest.json'));
   for(const source of folder==='widgets'?['source']:['plugin.yaml','skills'])
    await assert.rejects(fs.access(path.join(legacy,name,source)),{code:'ENOENT'});
   if(folder==='plugins') {
    const manifest=await read(path.join(author,'manifest.json'));
    for(const file of manifest.files)await fs.access(path.join(author,file));
    for(const key of ['manifest','package'])await fs.access(path.join(author,manifest[key]));
   }
   const withdrawn=await read(path.join(legacy,name,'withdrawn.json')).catch(error=>{
    if(error.code==='ENOENT')return {releases:[]};throw error;
   });
   for(const release of [...item.releases,...withdrawn.releases]) {
    const bytes=await fs.readFile(path.join(legacy,release.package));
    assert.equal(hash(bytes),release.packageHash??release.package_sha256);
    assert.ok(bytes.equals(await fs.readFile(path.join(current,release.package))));
    if(release.manifest)assert.ok((await fs.readFile(path.join(legacy,release.manifest))).equals(await fs.readFile(path.join(current,release.manifest))));
   }
  }
 }
});
