import {dimensionSlider,bindDimensionSliders,setDimensionCounts} from './dimension-slider.js';
import {problemModel,assessResources} from '@cmdhelper/core';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const resources={};
let textMode=false,selectedRoute='',frequency='once';
let outcome='unknown';
const frequencyDimension={id:'frequency',label:'使用频率',options:[{id:'once',label:'仅这一次'},{id:'repeat',label:'以后反复使用'}]};
export function mountResources(root,onChange){
 root.innerHTML=`<section class="resource-panel"><div class="resource-heading"><h2>先判断值得怎样做</h2><span>问题模型 v${problemModel.version}</span></div><label class="resource-mode">问题类型<select id="resource-mode"><option value="tool" ${!textMode?'selected':''}>当前文件 / 设备 / 视频问题</option><option value="text" ${textMode?'selected':''}>示例：发送一句话到另一台设备</option></select></label><p>先比较投入，再深入工具细节。所有条件初始未知，按你的回答匹配，不估算虚假的分钟数或最优分数。</p><form id="resource-fields">${[...problemModel.resourceFields,frequencyDimension].map(f=>dimensionSlider({...f,value:f.id==='frequency'?frequency:resources[f.id]??'unknown'})).join('')}</form><div id="resource-comparison"></div><div id="resource-plan"></div></section>`;
 const form=root.querySelector('form');form.onsubmit=e=>e.preventDefault();
 bindDimensionSliders(form,[...problemModel.resourceFields,frequencyDimension],(id,value)=>{if(id==='frequency')frequency=value;else resources[id]=value;selectedRoute='';outcome='unknown';update();});
 root.querySelector('#resource-mode').onchange=e=>{textMode=e.target.value==='text';selectedRoute='';outcome='unknown';update();};
 function update(){
  const assessments=assessResources(resources,frequency);
  const template=problemModel.templates[0];
  for(const f of [...problemModel.resourceFields,frequencyDimension])setDimensionCounts(form,f.id,f.options.map(o=>assessResources(f.id==='frequency'?resources:{...resources,[f.id]:o.id},f.id==='frequency'?o.id:frequency).filter(a=>(textMode||a.id==='tool')&&a.status==='eligible').length),'可选');
  const visible=assessments.filter(a=>textMode||a.id==='tool');
  root.querySelector('#resource-comparison').innerHTML=`<div class="live-results" role="status" aria-live="polite"><strong>${visible.filter(a=>a.status==='eligible').length}</strong> 条可选择路线 <span>${visible.length} 条参与比较 · ${visible.filter(a=>a.status==='pending').length} 条待补充信息 · ${visible.filter(a=>a.status==='excluded').length} 条不符合投入</span></div><h3>${textMode?'发送一句话：比较三条路线':'当前工具路线的投入判断'}</h3><div class="resource-table-wrap"><table class="resource-table"><thead><tr><th>路线</th><th>准备成本</th><th>每次操作 / 维护</th><th>当前判断</th><th>选择</th></tr></thead><tbody>${assessments.filter(a=>textMode||a.id==='tool').map(a=>{const route=template.routes.find(r=>r.id===a.id);return `<tr><td><strong>${textMode?esc(route.title):'使用当前候选工具方案'}</strong></td><td>${textMode?esc(route.cost.setup):'取决于平台、安装、连接及授权现状'}</td><td>${textMode?`${esc(route.cost.perUse)}<br><small>${esc(route.cost.maintenance)}</small>`:'继续检查当前问题的执行步骤及维护要求'}</td><td><b>${({eligible:'可选择，待核实细节',pending:'需补充信息',excluded:'不符合当前投入'})[a.status]}</b><ul>${[...a.blocked,...a.missing,...a.reasons].map(t=>`<li>${esc(t)}</li>`).join('')}</ul></td><td><button data-route="${a.id}" ${a.status!=='eligible'?'disabled':''}>${selectedRoute===a.id?'已选择':'选择路线'}</button></td></tr>`;}).join('')}</tbody></table></div><p class="resource-footnote">顺序按适用条件和所选偏好调整，不代表全局最优。拒绝安装不等于工具不可用：已有环境就绪时仍可采用。</p>`;
  for(const b of root.querySelectorAll('[data-route]'))b.onclick=()=>{selectedRoute=b.dataset.route;outcome='unknown';update();};
  const route=template.routes.find(r=>r.id===selectedRoute);
  root.querySelector('#resource-plan').innerHTML=route&&textMode?`<article class="resource-chosen"><h3>具体方案 · ${esc(route.title)}</h3><p><b>目标：</b>${esc(template.goal)}</p><ol>${route.steps.map(t=>`<li>${esc(t)}</li>`).join('')}</ol><div class="solution-states"><section><h4>执行前</h4><pre>${esc(route.before)}</pre></section><section><h4>执行后（成功时）</h4><pre>${esc(route.after)}</pre></section></div><p><b>验收：</b>${esc(route.acceptance)}</p>${route.id!=='tool'?`<label>实际完成后记录验收结果<select id="resource-outcome"><option value="unknown">尚未验收</option><option value="pass" ${outcome==='pass'?'selected':''}>已核对内容一致</option><option value="fail" ${outcome==='fail'?'selected':''}>内容不一致，需要重新处理</option></select></label><p>${outcome==='pass'?'你已报告目标完成；网页未自动执行或核验。':outcome==='fail'?'请重新输入或发送，并再次对照原文检查。':'先实际操作，再核对目标文本。'}</p>`:'<p>下一步：在下方逐层核实 SCP 条件，然后进入命令助手；源路径填写保存后的文本文件。</p>'}</article>`:selectedRoute==='tool'?'<p class="resource-selected">已接受工具路线投入，继续下方问题树。修改投入条件后需重新选择。</p>':'<p class="resource-selected">先补全影响路线的条件并选择方案，下方工具细节暂缓。</p>';
  const outcomeSelect=root.querySelector('#resource-outcome');if(outcomeSelect)outcomeSelect.onchange=e=>{outcome=e.target.value;update();};
  onChange({textMode,selectedRoute,toolAllowed:selectedRoute==='tool'});
 }
 update();
}
