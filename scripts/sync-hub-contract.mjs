import fs from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const core=path.resolve(process.env.PUDDING_CORE_DIR||path.join(root,'../pudding-core'));
await fs.mkdir(path.join(root,'contracts'),{recursive:true});
await fs.copyFile(path.join(core,'contracts/hub.mjs'),path.join(root,'contracts/hub.mjs'));
console.log('Synced public Hub index contract from pudding-core.');
