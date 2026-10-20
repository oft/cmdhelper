import {test} from 'node:test';
import assert from 'node:assert/strict';
import {assessResources,problemModel} from '../src/index.js';
const find=(r,id)=>r.find(x=>x.id===id);
test('initial unknowns never imply permission or readiness',()=>{for(const r of assessResources())assert.equal(r.status,'pending');});
test('manual short-text route requires physical access',()=>{assert.equal(find(assessResources({physical:'yes'}),'manual').status,'eligible');assert.equal(find(assessResources({physical:'no'}),'manual').status,'excluded');});
test('existing approved channel is independently viable',()=>assert.equal(find(assessResources({channel:'yes',install:'no',configure:'no'}),'channel').status,'eligible'));
test('no preparation excludes unready tools; ready tools bypass installation concerns',()=>{
 assert.equal(find(assessResources({setup:'none',toolReady:'no'}),'tool').status,'excluded');
 assert.equal(find(assessResources({setup:'none',toolReady:'yes',install:'no',configure:'no'}),'tool').status,'eligible');
});
test('unready tools need permission clarification, not automatic rejection',()=>{
 assert.equal(find(assessResources({setup:'small',toolReady:'no',install:'no',configure:'yes'}),'tool').status,'pending');
 assert.equal(find(assessResources({setup:'small',toolReady:'no',install:'yes',configure:'yes'}),'tool').status,'eligible');
});
test('explicit preference affects ordering, not feasibility',()=>{
 const r={physical:'yes',channel:'yes',toolReady:'yes'};
 assert.equal(assessResources({...r,priority:'quick'})[0].id,'manual');
 assert.equal(assessResources({...r,priority:'repeat'},'repeat')[0].id,'tool');
 assert.throws(()=>assessResources({install:'maybe'}));
});
test('each route supplies concrete steps and acceptance',()=>{for(const r of problemModel.templates[0].routes)assert.ok(r.steps.length&&r.before&&r.after&&r.acceptance);});

test('unknown existing environment is not treated as a known failure',()=>assert.equal(find(assessResources({setup:'none'}),'tool').status,'pending'));
