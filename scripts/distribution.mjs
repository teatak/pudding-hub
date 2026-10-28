import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

// Copy immutable public artifacts, never authoring sources or installation data.
async function copyImmutable(source, target) {
  const stat = await fs.stat(source).catch(error=>{if(error.code==='ENOENT')return null;throw error});
  if (!stat) return;
  if (stat.isDirectory()) {
    await fs.mkdir(target,{recursive:true});
    for (const entry of await fs.readdir(source)) await copyImmutable(path.join(source,entry),path.join(target,entry));
    return;
  }
  const bytes=await fs.readFile(source);
  const existing=await fs.readFile(target).catch(error=>{if(error.code==='ENOENT')return null;throw error});
  if(existing){if(!existing.equals(bytes))throw new Error(`Immutable distribution artifact differs: ${target}`);return}
  await fs.mkdir(path.dirname(target),{recursive:true});
  await fs.writeFile(target,bytes,{flag:'wx'});
}
export async function prepareDistribution(root) {
  for(const type of ['widgets','plugins']) {
    const legacy=path.join(root,type), destination=path.join(root,'extensions',type);
    const entries=await fs.readdir(legacy,{withFileTypes:true}).catch(error=>{if(error.code==='ENOENT')return null;throw error});
    if(!entries)continue;
    for(const entry of entries.filter(entry=>entry.isDirectory())) {
      for(const child of ['releases','withdrawn.json']) await copyImmutable(path.join(legacy,entry.name,child),path.join(destination,entry.name,child));
      // Existing catalog artwork is seeded once. New releases publish versioned artwork.
      const assets=path.join(destination,entry.name,'assets');
      try {await fs.access(assets)} catch(error) {if(error.code!=='ENOENT')throw error;await copyImmutable(path.join(legacy,entry.name,'assets'),assets)}
    }
    const target=path.join(destination,'registry.json');
    try {await fs.access(target)} catch(error) {
      if(error.code!=='ENOENT')throw error;
      const registry=JSON.parse(await fs.readFile(path.join(legacy,'registry.json'),'utf8'));
      if(type==='plugins')registry.schema_version=2;
      await fs.mkdir(destination,{recursive:true});
      await fs.writeFile(target,JSON.stringify(registry,null,2)+'\n',{flag:'wx'});
    }
  }
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  await prepareDistribution(path.resolve(import.meta.dirname,'..'));
  console.log('Prepared extensions catalogs and immutable artifacts; legacy directories preserved.');
}
