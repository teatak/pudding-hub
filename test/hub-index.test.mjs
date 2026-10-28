import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {parseHubIndex} from '../contracts/hub.mjs';
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
    // Migration copies packages byte-for-byte; existing hashes never change.
    const legacy=await fs.readFile(path.join(root,folder,release.package));
    assert.ok(bytes.equals(legacy));
    if(release.manifest)await fs.access(path.join(dir,release.manifest));
   }
   if(item.icon?.svg)await fs.access(path.join(dir,item.icon.svg));
  }
 }
});
test('public index validator stays synchronized with the Core runtime contract',async()=>{
 const core=path.resolve(process.env.PUDDING_CORE_DIR||path.join(root,'../pudding-core'));
 assert.ok((await fs.readFile(path.join(root,'contracts/hub.mjs'))).equals(await fs.readFile(path.join(core,'contracts/hub.mjs'))));
});
