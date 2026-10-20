import { mkdir, copyFile } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
await mkdir(new URL('packages/core/data/',root),{recursive:true});
for(const name of ['ssh','scp']) await copyFile(new URL(`commands/${name}.json`,root),new URL(`packages/core/data/${name}.json`,root));
await copyFile(new URL('problems/catalog.json',root),new URL('packages/core/data/problems.json',root));
await copyFile(new URL('tools/catalog.json',root),new URL('packages/core/data/tools.json',root));
await copyFile(new URL('problems/model.json',root),new URL('packages/core/data/model.json',root));
