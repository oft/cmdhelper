import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generate,generateScenario,describeResult,getCommand,getScenarioFields,search,problemCatalog,matchProblems,evaluateReadiness} from '../src/index.js';
test('Git places global options, subcommands, flags and operands correctly',()=>{
 assert.equal(generateScenario('git','clone',{repository:'https://example.com/repo.git',target:'./my repo',depth:'1'}),"git clone --depth 1 https://example.com/repo.git './my repo'");
 assert.equal(generateScenario('git','status',{directory:'./my repo',short:true}),"git -C './my repo' status --short");
 assert.equal(generateScenario('git','pull',{remote:'origin',branch:'main'}),'git pull --ff-only origin main');
 assert.equal(generateScenario('git','add',{path:'./my file.txt'}),"git add -- './my file.txt'");
 assert.equal(generateScenario('git','commit',{message:"fix user's docs"},'powershell'),"git commit -m 'fix user''s docs'");
 assert.equal(generateScenario('git','push',{remote:'origin',branch:'feature/demo',upstream:true}),'git push --set-upstream origin feature/demo');
});
test('curl quotes URLs and reads JSON from a file instead of inline native shell JSON',()=>{
 assert.equal(generateScenario('curl','get',{url:'https://example.com/api?a=1&b=2',include:true}),"curl --globoff --fail-with-body --include 'https://example.com/api?a=1&b=2'");
 assert.equal(generateScenario('curl','download',{url:'https://example.com/a.zip',output:'./a.zip',location:true}),'curl --globoff --fail-with-body --output ./a.zip --location https://example.com/a.zip');
 assert.equal(generateScenario('curl','json',{url:'https://example.com/api',jsonFile:'./my payload.json'},'powershell'),"curl.exe --globoff --fail-with-body --json '@./my payload.json' https://example.com/api");
});
test('new commands reject missing scenario and invalid inputs',()=>{
 assert.throws(()=>generate('git',{}));
 assert.throws(()=>generateScenario('git','clone',{repository:'-bad',target:'./repo'}));
 assert.throws(()=>generateScenario('git','clone',{repository:'https://example.com/a.git',target:'./a',depth:'0'}));
 assert.throws(()=>generateScenario('git','push',{remote:'origin',branch:'main:other'}));
 assert.throws(()=>generateScenario('curl','get',{url:'file:///etc/passwd'}));
 assert.throws(()=>generateScenario('curl','get',{url:'https://user:secret@example.com'}));
 assert.throws(()=>generateScenario('curl','get',{url:'https://example.com',timeout:'-1'}));
 assert.throws(()=>generateScenario('curl','json',{url:'https://example.com'}));
});
test('all worked examples generate and fields are scoped to each scenario',()=>{
 for(const id of ['git','curl'])for(const scenario of getCommand(id).scenarios){
  const result=describeResult(id,scenario.id,{},'powershell');
  assert.ok(result.example.command.startsWith(id==='curl'?'curl.exe':'git'));
  assert.ok(result.example.steps.length&&result.before.length&&result.after.length);
 }
 assert.deepEqual(getScenarioFields(getCommand('git'),getCommand('git').scenarios.find(s=>s.id==='commit')).map(f=>f.id),['directory','message']);
 assert.ok(search('暂存').some(s=>s.command.id==='git'));
 assert.ok(search('下载').some(s=>s.command.id==='curl'));
});
test('each new navigation preset matches its solution and has hierarchical checks',()=>{
 for(const s of problemCatalog.solutions.filter(s=>['git','curl'].includes(s.tool))){
  const coordinates=Object.fromEntries(problemCatalog.dimensions.map(d=>[d.id,s.match[d.id]?.[0]??s.requirements[d.id]?.[0]??d.options[0].id]));
  assert.ok(matchProblems(coordinates).some(m=>m.id===s.id&&m.status==='matched'));
  assert.equal(evaluateReadiness(s.id,{},coordinates).ready,false);
 }
});
