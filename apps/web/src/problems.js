import {dimensionSlider,bindDimensionSliders,setDimensionDisabled,setDimensionCounts} from './dimension-slider.js';
import {mountResources} from './resources.js';
import {problemCatalog,matchProblems,evaluateReadiness,updateReadinessEvidence} from '@cmdhelper/core';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const evidenceBySolution={};
let resourceDecision={toolAllowed:false};
const state={...problemCatalog.presets[0].values};
const label=(key,value)=>problemCatalog.dimensions.find(d=>d.id===key)?.options.find(o=>o.id===value)?.label??value;
export function renderProblemPage(root,onAssistant){
 root.innerHTML=`<div class="problem-intro"><h1>问题导航 <span class="prototype">初步探索</span></h1><p>先描述对象与变化，再找适合的工具。</p></div><div id="resource-root"></div><div class="problem-presets"><span>试一个问题</span>${problemCatalog.presets.map((p,i)=>`<button data-preset="${i}">${esc(p.title)}</button>`).join('')}</div><div class="problem-layout"><aside class="problem-coordinates"><div class="panel-title">01 / 给问题定位</div><form id="coordinates">${problemCatalog.dimensions.map(d=>dimensionSlider({...d,value:state[d.id]})).join('')}</form><p class="coordinate-note">设备和文件是对象；位置、频率、表示方式描述变化。连接和质量要求约束可行方案。</p></aside><section class="problem-main"><div id="problem-map"></div><div id="problem-solutions"></div></section></div><details class="problem-model"><summary>这个导航如何组织问题？</summary><p>对象 → 当前状态 → 目标状态 → 约束 → 候选方案。一个工具可以覆盖多个问题，一个问题也可能需要多个工具。</p><ul><li>空间：对象位于哪台设备，是否需要跨设备移动数据。</li><li>时间：单次处理，还是反复发生；将来可增加历史版本、定时和延迟。</li><li>表示：内容不变但换容器，还是改变编码、分辨率等属性。</li><li>约束：连接、权限、平台、质量、成本和可用工具。</li></ul><p>当前仅覆盖文件传输、远程操作和视频转换的少量规则。未匹配表示资料尚未覆盖，不能推断现实中无解；也不会把候选方案当作全局最优。</p></details>`;
 const form=root.querySelector('#coordinates');form.onsubmit=e=>e.preventDefault();
 bindDimensionSliders(form,problemCatalog.dimensions,(id,value)=>{for(const key of Object.keys(evidenceBySolution))delete evidenceBySolution[key];state[id]=value;update();});
 for(const b of root.querySelectorAll('[data-preset]'))b.onclick=()=>{for(const key of Object.keys(evidenceBySolution)) delete evidenceBySolution[key];Object.assign(state,problemCatalog.presets[+b.dataset.preset].values);renderProblemPage(root,onAssistant);};
 function update(){
  const media=state.object==='video'&&state.goal==='convert';
  for(const d of ['connection','quality']){const relevant=d==='connection'?state.space==='remote':media;setDimensionDisabled(form,d,!relevant);}
  const activeState=resourceDecision.textMode?{...problemCatalog.presets[0].values,time:'once'}:state;
  for(const d of problemCatalog.dimensions){const disabled=form.querySelector(`[data-slider="${d.id}"]`).disabled;setDimensionCounts(form,d.id,d.options.map(o=>disabled?null:matchProblems({...state,[d.id]:o.id}).length),'候选');}
  const matches=matchProblems(activeState).map(s=>({...s,checks:evaluateReadiness(s.id,evidenceBySolution[s.id],activeState)}));
  const transfer=state.goal==='transfer', remote=state.space==='remote';
  root.querySelector('#problem-map').innerHTML=`<div class="live-results" role="status" aria-live="polite"><strong>${matches.length}</strong> 个候选方案 <span>其中 ${matches.filter(s=>s.status==='matched').length} 个符合所选条件 · ${matches.filter(s=>s.checks.ready).length} 个前置检查通过</span></div><div class="coordinate-summary">问题坐标 <code>${['object','space','goal','time'].map(k=>esc(label(k,state[k]))).join(' / ')}</code></div><div class="state-map"><section><h2>当前状态</h2><div class="device-box"><span>${remote?'设备 A · 本机':'同一台设备'}</span><strong>${esc(label('object',state.object))}</strong><small>${transfer?'源内容':state.goal==='convert'?'原内容 / 格式':'本地操作入口'}</small></div></section><div class="state-arrow"><span>${esc(label('goal',state.goal))}</span>→</div><section><h2>目标状态</h2><div class="device-box target-box"><span>${remote?'设备 B · 远程':'同一台设备'}</span><strong>${transfer?'得到内容副本':state.goal==='convert'?'得到目标格式 / 编码':state.goal==='operate'?'远程命令环境':'远程服务访问入口'}</strong><small>${esc(label('time',state.time))}</small></div></section></div>`;
  const result=root.querySelector('#problem-solutions');
  result.innerHTML=`<h2 class="candidate-title">02 / 候选方案 <span>${matches.length} 个 · 按适用规则匹配</span></h2>${!matches.length?'<div class="no-solution"><h3>当前坐标尚无收录方案</h3><p>请检查对象与目标是否对应，例如“视频文件 → 同一台设备 → 改变格式 / 编码”。目前无法联网的跨设备传输、定时编排等问题还需补充方案。</p></div>':matches.map(s=>`<article class="solution-card"><div class="solution-heading"><h3>${esc(s.title)}</h3><span class="match-badge ${s.status}">${s.checks.complete?'用户报告已完成':s.checks.status==='blocked'?'前置条件不满足':s.checks.ready?'前置条件已人工确认':'待检查条件'}</span></div><p>${esc(s.reason)}</p>${s.missing.length?`<div class="missing-condition"><strong>还缺少的条件</strong><ul>${s.missing.map(m=>`<li>${esc(problemCatalog.dimensions.find(d=>d.id===m.dimension).label)} 当前：${esc(label(m.dimension,m.actual))}；需要：${m.expected.map(v=>esc(label(m.dimension,v))).join(' / ')}。</li>`).join('')}</ul><p>条件确认前，不能据此认定方案可执行。</p></div>`:''}${resourceDecision.toolAllowed?renderChecks(s):'<div class="priority-focus"><strong>当前优先：确认投入与路线</strong><p>先在上方比较并选择路线，暂不展开工具条件检查。</p></div>'}<div class="solution-states"><section><h4>执行前</h4><pre>${esc(s.before)}</pre></section><section><h4>执行后（成功时）</h4><pre>${esc(s.after)}</pre></section></div><h4>解决步骤</h4><ol>${s.steps.map(t=>`<li>${esc(t)}</li>`).join('')}</ol><h4>选择前要了解</h4><ul>${s.tradeoffs.map(t=>`<li>${esc(t)}</li>`).join('')}</ul><div class="solution-actions">${s.assistant?`<button data-solution="${s.id}" ${!resourceDecision.toolAllowed||!s.checks.ready?'disabled':''}>进入命令助手 →</button>`:'<span class="muted">已收录方案 · 参数编辑器待补充</span>'}<a href="${s.source}" target="_blank" rel="noreferrer">官方文档 ↗</a></div></article>`).join('')}`;
  for(const select of result.querySelectorAll('[data-check]'))select.onchange=()=>{
   const id=select.dataset.owner;
   evidenceBySolution[id]=updateReadinessEvidence(id,evidenceBySolution[id]??{},select.dataset.check,select.value);
   update();
  };
  for(const b of result.querySelectorAll('[data-solution]'))b.onclick=()=>{const s=matches.find(s=>s.id===b.dataset.solution);if(!resourceDecision.toolAllowed||!s.checks.ready)return;const a={...s.assistant};if(a.command==='scp'&&activeState.object==='directory')a.scenario='upload-directory';onAssistant(a);};
 }
 mountResources(root.querySelector('#resource-root'),decision=>{resourceDecision=decision;for(const key of Object.keys(evidenceBySolution))delete evidenceBySolution[key];update();root.querySelector('.problem-presets').hidden=decision.textMode;root.querySelector('.problem-coordinates').hidden=decision.textMode;root.querySelector('#problem-map').hidden=decision.textMode;root.querySelector('.problem-layout').classList.toggle('text-problem',decision.textMode);root.querySelector('.problem-main').hidden=decision.textMode&&!decision.toolAllowed;});
}

function renderChecks(solution){
 const {checks,id}=solution;
 const group=(items,outcome=false)=>items.map(c=>`<li class="condition-row ${c.status}"><div class="condition-top"><strong>${esc(c.label)}</strong><label class="condition-status">${outcome?'检查结果':'条件状态'}<select data-owner="${id}" data-check="${c.id}" ${outcome&&!checks.ready?'disabled':''}><option value="unknown" ${c.status==='unknown'?'selected':''}>待确认</option><option value="pass" ${c.status==='pass'?'selected':''}>${outcome?'已检查通过':'已确认满足'}</option><option value="fail" ${c.status==='fail'?'selected':''}>${outcome?'检查失败':'不满足'}</option></select></label></div><small>${esc(c.scope)} · 用户手动确认</small><p><b>如何检查：</b>${esc(c.verify)}</p>${c.status!=='pass'?`<p class="condition-remedy"><b>不满足时：</b>${esc(c.remedy)}</p>`:''}</li>`).join('');
 const draw=node=>{
  const locked=node.status==='locked';
  const labels={locked:'暂缓处理',blocked:'当前阻塞',pending:'当前待确认',passed:'已通过'};
  return `<li class="check-branch ${node.status}"><div class="branch-heading"><span class="level-badge">L${node.priority}</span><strong>${esc(node.title)}</strong><span>${labels[node.status]}</span></div><p class="branch-reason">${esc(node.reason)}</p>${locked?'<p class="deferred-note">上层尚未通过，暂不展开此层检查，避免提前处理细节。</p>':`<ul class="condition-list">${group(node.items)}</ul>`}${node.children.length?`<ul class="check-children">${node.children.map(draw).join('')}</ul>`:''}</li>`;
 };
 const current=checks.current;
 return `<section class="readiness"><h4>按问题树逐层检查</h4><p class="check-disclaimer">所有状态由用户人工核实。先处理上层判断；上层变化会清除下层确认与验收。</p><div class="priority-focus"><strong>${current?`当前优先：L${findPriority(checks.tree,current.id)} · ${esc(current.title)}`:'前置条件已逐层确认'}</strong><p>${current?.status==='blocked'?'先解决这个阻塞，或修改条件、更换路线；暂不投入下层细节。':current?'先完成本层检查，通过后展开下一层。':'可以进入命令助手；实际执行后还需验收。'}</p></div><ul class="check-tree">${draw(checks.tree)}</ul><details class="acceptance"><summary>L4 / 执行后验收与失败处理 ${checks.ready?'':'· 等待前置条件'}</summary><p>实际执行后再逐项检查。前置条件未全部确认时，暂不能记录验收通过。</p><ul class="condition-list">${group(checks.acceptance,true)}</ul><p>${checks.complete?'你已报告所有验收项通过；本工具未独立执行或检测。':'完成条件：前置条件满足，并且实际操作后的验收项全部通过。'}</p></details></section>`;
}
function findPriority(node,id){if(node.id===id)return node.priority;for(const child of node.children){const value=findPriority(child,id);if(value!==undefined)return value;}}

