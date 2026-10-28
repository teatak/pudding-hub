#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import {parseHubIndex} from '../contracts/hub.mjs';
const root=path.resolve(import.meta.dirname,'..');
const index=parseHubIndex(JSON.parse(await fs.readFile(path.join(root,'index.json'),'utf8')));
for(const source of index.sources) {
 for(const catalog of source.catalogs) {
  const url=new URL(catalog.url);
  if(url.origin!=='https://teatak.github.io'||!url.pathname.startsWith('/pudding-hub/'))continue;
  const file=path.resolve(root,url.pathname.slice('/pudding-hub/'.length));
  if(!file.startsWith(root+path.sep))throw new Error('Invalid local catalog path');
  const data=JSON.parse(await fs.readFile(file,'utf8'));
  if((data.schemaVersion??data.schema_version)!==catalog.schemaVersion)throw new Error(`Catalog format differs from index: ${catalog.url}`);
 }
}
console.log(`Validated ${index.sources.length} Hub sources; one current catalog per type.`);
