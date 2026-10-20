import { spawnSync } from 'node:child_process';
import { mkdir, copyFile, readFile, writeFile } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const check=spawnSync(process.execPath,['--import','tsx','scripts/check-data.ts'],{cwd:root,stdio:'inherit'});
if(check.error)throw check.error;
if(check.status!==0)process.exit(check.status??1);
await mkdir(new URL('packages/core/data/',root),{recursive:true});
await mkdir(new URL('packages/core/schemas/',root),{recursive:true});
const snapshots=[
 ...['ssh','scp','git','curl'].map(name=>[`commands/${name}.json`,name,'command']),
 ['problems/catalog.json','problems','problems'],
 ['tools/catalog.json','tools','tools'],
 ['problems/model.json','model','model'],
];
for(const [source,name,schema] of snapshots){
 const data=JSON.parse(await readFile(new URL(source,root),'utf8'));
 data.$schema=`../schemas/${schema}.schema.json`;
 await writeFile(new URL(`packages/core/data/${name}.json`,root),JSON.stringify(data,null,2)+'\n');
}
for(const schema of new Set(snapshots.map(([, ,schema])=>schema)))
 await copyFile(new URL(`schemas/${schema}.schema.json`,root),new URL(`packages/core/schemas/${schema}.schema.json`,root));
