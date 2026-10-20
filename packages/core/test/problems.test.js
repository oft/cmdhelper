import {test} from 'node:test';
import assert from 'node:assert/strict';
import {problemCatalog,matchProblems,getCommand,evaluateReadiness,updateReadinessEvidence,toolCatalog} from '../src/index.js';
const base=problemCatalog.presets[0].values;
test('problem coordinates distinguish one-off transfers and recurring sync',()=>{
 assert.equal(matchProblems(base)[0].id,'scp');
 assert.equal(matchProblems({...base,time:'repeat'})[0].id,'rsync');
});
test('unknown or unavailable connection remains conditional',()=>{
 for(const connection of ['unknown','offline']) {
  const result=matchProblems({...base,connection})[0];
  assert.equal(result.status,'conditional');assert.equal(result.missing[0].dimension,'connection');
 }
});
test('media requirements distinguish remux and transcode',()=>{
 const media=problemCatalog.presets[2].values;
 assert.deepEqual(matchProblems(media).map(s=>[s.id,s.status]),[['remux','matched'],['transcode','conditional']]);
 assert.equal(matchProblems({...media,quality:'encode'}).find(s=>s.id==='transcode').status,'matched');
});
test('uncovered combinations return empty; malformed coordinates rejected',()=>{
 assert.deepEqual(matchProblems({...base,object:'file',goal:'convert'}),[]);
 assert.throws(()=>matchProblems({}));
});
test('assistant links and all catalog coordinates are valid',()=>{
 for(const s of problemCatalog.solutions){
  for(const [key,vals] of Object.entries({...s.match,...s.requirements}))for(const v of vals)assert.ok(problemCatalog.dimensions.find(d=>d.id===key)?.options.some(o=>o.id===v));
  if(s.assistant)assert.ok(getCommand(s.assistant.command).scenarios.some(sc=>sc.id===s.assistant.scenario));
 }
});

test('all tools define checkable conditions with remediation',()=>{
 for(const tool of toolCatalog.tools){
  assert.ok(tool.preconditions.length);
  assert.ok(tool.preconditions.some(c=>c.kind==='platform'));
  assert.ok(tool.preconditions.some(c=>c.kind==='installation'));
  for(const c of tool.preconditions)assert.ok(c.verify&&c.remedy&&c.scope);
 }
 for(const s of problemCatalog.solutions)assert.ok(s.acceptance.length);
});
test('readiness requires every precondition and outcome evidence separately',()=>{
 const initial=evaluateReadiness('scp',{},base);
 assert.equal(initial.ready,false);assert.equal(initial.complete,false);
 const evidence=Object.fromEntries(initial.preconditions.map(c=>[c.id,'pass']));
 assert.equal(evaluateReadiness('scp',evidence,base).ready,true);
 assert.equal(evaluateReadiness('scp',evidence,base).complete,false);
 for(const c of initial.acceptance)evidence[c.id]='pass';
 assert.equal(evaluateReadiness('scp',evidence,base).complete,true);
 evidence[initial.preconditions[0].id]='fail';
 assert.equal(evaluateReadiness('scp',evidence,base).status,'blocked');
 assert.equal(evaluateReadiness('scp',evidence,base).complete,false);
 evidence[initial.preconditions[0].id]='pass';
 assert.equal(evaluateReadiness('scp',evidence,{...base,connection:'offline'}).ready,false);
 assert.equal(evaluateReadiness('scp',evidence).ready,false);
});
test('SCP models modern SFTP; rsync requires remote installation',()=>{
 const scp=toolCatalog.tools.find(t=>t.id==='scp');
 assert.ok(scp.preconditions.some(c=>c.id==='sftp-service'));
 const rsync=toolCatalog.tools.find(t=>t.id==='rsync');
 assert.ok(rsync.preconditions.some(c=>c.id==='remote-rsync-installed'&&c.scope==='远端'));
 for(const s of problemCatalog.solutions){
  const c=evaluateReadiness(s.id).preconditions;
  assert.equal(new Set(c.map(x=>x.id)).size,c.length);
 }
});

test('problem tree blocks lower levels until ancestors pass',()=>{
 const initial=evaluateReadiness('scp',{},base);
 assert.equal(initial.current.id,'feasibility');
 assert.equal(initial.tree.children[0].children[0].status,'locked');
 const offline=evaluateReadiness('scp',{}, {...base,connection:'offline'});
 assert.equal(offline.current.id,'goal');assert.equal(offline.tree.children[0].status,'locked');
 const evidence={};for(const c of initial.tree.children[0].items)evidence[c.id]='pass';
 const next=evaluateReadiness('scp',evidence,base);assert.equal(next.current.id,'environment');
});
test('editing parent condition invalidates descendants and acceptance',()=>{
 const initial=evaluateReadiness('scp',{},base);
 const evidence=Object.fromEntries([...initial.preconditions,...initial.acceptance].map(c=>[c.id,'pass']));
 const first=initial.tree.children[0].items[0];
 const updated=updateReadinessEvidence('scp',evidence,first.id,'fail');
 assert.equal(evaluateReadiness('scp',updated,base).current.id,'feasibility');
 for(const c of initial.tree.children[0].children[0].items)assert.equal(updated[c.id],undefined);
 for(const c of initial.acceptance)assert.equal(updated[c.id],undefined);
 assert.equal(evidence[first.id],'pass');
});
test('every condition appears exactly once in its solution tree',()=>{
 for(const s of problemCatalog.solutions){const checks=evaluateReadiness(s.id);const ids=[];
  function visit(n){ids.push(...n.checks);for(const child of n.children)visit(child);}visit(s.checkTree);
  assert.deepEqual(ids.toSorted(),checks.preconditions.map(c=>c.id).toSorted());
  assert.equal(new Set(ids).size,ids.length);
 }
});
