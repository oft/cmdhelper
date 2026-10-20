import {readFile,readdir} from 'node:fs/promises';
import {z} from 'zod';
import {CommandSchema,ToolsSchema,ProblemsSchema,ModelSchema,InstanceSchema,ArticleSchema,validateReferences,type ContentBundle} from '../packages/schema/src/index.js';
export const root=new URL('../',import.meta.url);
export const schemaOutputs=[
 ['schemas/command.schema.json',CommandSchema],['schemas/tools.schema.json',ToolsSchema],
 ['schemas/problems.schema.json',ProblemsSchema],['schemas/model.schema.json',ModelSchema],
 ['problems/instance.schema.json',InstanceSchema],['schemas/article.schema.json',ArticleSchema],
] as const;
export function schemaText(schema:z.ZodType):string{return JSON.stringify(z.toJSONSchema(schema,{target:'draft-2020-12',io:'input'}),null,2)+'\n';}
export async function loadContent(){
 const errors:string[]=[];let count=0;
 async function read<T>(path:string,schema:z.ZodType<T>):Promise<T>{
  count++;
  let raw:unknown;
  try{raw=JSON.parse(await readFile(new URL(path,root),'utf8'));}catch(error){throw new Error(`${path}: ${error instanceof Error?error.message:String(error)}`);}
  const parsed=schema.safeParse(raw);
  if(!parsed.success){for(const issue of parsed.error.issues)errors.push(`${path}/${issue.path.map(String).join('/')}: ${issue.message}`);throw new Error(errors.join('\n'));}
  return parsed.data;
 }
 async function files<T>(directory:string,schema:z.ZodType<T>,accept:(name:string)=>boolean){
  const names=(await readdir(new URL(directory+'/',root))).filter(accept).sort();
  const values:T[]=[];
  for(const name of names){const value=await read(directory+'/'+name,schema);values.push(value);
   const id=(value as {id?:string;slug?:string}).id??(value as {slug?:string}).slug;
   if(id&&name!==id+'.json')errors.push(`${directory}/${name}: 文件名必须对应 ${id}.json`);
  }
  return values;
 }
 const commands=await files('commands',CommandSchema,n=>n.endsWith('.json'));
 const articles=await files('articles',ArticleSchema,n=>n.endsWith('.json'));
 const instances=[];
 for(const name of (await readdir(new URL('problems/',root))).filter(n=>n.endsWith('.example.json')).sort())instances.push(await read('problems/'+name,InstanceSchema));
 const bundle:ContentBundle={commands,articles,instances,tools:await read('tools/catalog.json',ToolsSchema),problems:await read('problems/catalog.json',ProblemsSchema),model:await read('problems/model.json',ModelSchema)};
 errors.push(...validateReferences(bundle));
 if(errors.length)throw new Error(errors.join('\n'));
 return {bundle,count};
}
export async function checkGeneratedSchemas(){
 for(const [path,schema] of schemaOutputs){let actual='';try{actual=await readFile(new URL(path,root),'utf8');}catch{throw new Error(`缺少 ${path}，请运行 pnpm schema:generate`);}
  if(actual.replaceAll('\r\n','\n')!==schemaText(schema))throw new Error(`${path} 已过期，请运行 pnpm schema:generate`);
 }
}
