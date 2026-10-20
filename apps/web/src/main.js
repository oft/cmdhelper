import { renderProblemPage } from './problems.js';
import { commands, getCommand, generate, generateScenario, describeResult, search } from '@cmdhelper/core';
import './style.css';
const articles=Object.values(import.meta.glob('../../../articles/*.json',{eager:true,import:'default'})).sort((a,b)=>b.date.localeCompare(a.date));
const app=document.querySelector('#app');
let selected='scp', query='', activeField='source', shell='powershell';
const values={scp:{},ssh:{}};
const scenarioIds={scp:'upload-file',ssh:'login'};
function currentScenario(){return getCommand(selected).scenarios.find(s=>s.id===scenarioIds[selected]);}
function currentOutput(){return scenarioIds[selected]?generateScenario(selected,scenarioIds[selected],values[selected],shell):generate(selected,values[selected],shell);}
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function route(){const [page='assistant',slug]=location.hash.slice(2).split('/');return {page,slug};}
function render(){
 const {page,slug}=route();
 app.innerHTML=`<header><a class="brand" href="#/assistant"><span class="logo">&gt;_</span> cmdhelper</a><nav aria-label="主导航">${[['assistant','命令助手'],['problems','问题导航'],['articles','文章'],['about','关于']].map(([id,label])=>`<a ${page===id?'aria-current="page"':''} href="#/${id}">${label}</a>`).join('')}</nav><span class="header-note">少记参数，多做事情</span></header><main id="main"></main><footer>cmdhelper / 开放的命令参考工具 <span>仅生成命令 · 不自动执行</span></footer>`;
 if(page==='problems') renderProblemPage(document.querySelector('main'),({command,scenario})=>{selected=command;scenarioIds[command]=scenario;activeField=getCommand(command).fields[0].id;location.hash='/assistant';});
 else if(page==='articles') renderArticles(slug);
 else if(page==='about') document.querySelector('main').innerHTML=`<section class="reading"><div class="eyebrow">ABOUT</div><h1>知道命令，就能开始。</h1><p>cmdhelper 帮助你理解参数，逐步生成可用的命令。网页与 CLI 共用同一份结构化命令资料。</p><h2>终端中使用</h2><pre>npx cmdhelper ssh\ncmdhelper scp\ncmdhelper search 端口\ncmdhelper explain ssh</pre><p>CLI 尚未发布到 npm；当前在项目根目录运行 <code>pnpm cli ssh</code>。</p><h2>内容与边界</h2><p>首批支持 OpenSSH 的 ssh、scp 常用参数。内容并非完整手册；可在右侧访问官方资料。命令输入保留在当前页面内存中。</p><a href="https://github.com/oft/cmdhelper">GitHub · oft/cmdhelper ↗</a></section>`;
 else if(page==='assistant') renderAssistant();
 else document.querySelector('main').innerHTML='<section class="reading"><h1>页面不存在</h1><a href="#/assistant">返回命令助手</a></section>';
}
function renderArticles(slug){
 const root=document.querySelector('main');
 if(slug){const a=articles.find(a=>a.slug===slug);root.innerHTML=a?`<article class="reading"><a href="#/articles">← 所有文章</a><p class="muted">${esc(a.date)}</p><h1>${esc(a.title)}</h1>${a.sections.map(s=>`<h2>${esc(s.heading)}</h2><p>${esc(s.text)}</p>`).join('')}</article>`:'<section class="reading">文章不存在</section>';return;}
 root.innerHTML=`<section class="reading"><div class="eyebrow">GUIDES</div><h1>使用笔记</h1><p class="muted">把常用操作讲清楚。</p>${articles.map(a=>`<a class="article" href="#/articles/${esc(a.slug)}"><time>${esc(a.date)}</time><h2>${esc(a.title)} ↗</h2><p>${esc(a.summary)}</p></a>`).join('')}</section>`;
}
function renderAssistant(){
 const c=getCommand(selected), scenario=currentScenario();
 const fields=c.fields.map(f=>({...f,label:scenario?.labels?.[f.id]??f.label,placeholder:scenario?.placeholders?.[f.id]??f.placeholder,required:f.required||scenario?.required?.includes(f.id)}));
 document.querySelector('main').innerHTML=`<div class="toolbar"><div><h1>命令助手</h1><span class="muted">选命令 → 填参数 → 复制使用</span></div><label class="search">⌕ <input id="search" aria-label="模糊搜索命令、参数与说明" placeholder="搜索命令、参数、说明…" value="${esc(query)}"><kbd>/</kbd></label></div><div class="workspace"><aside class="commands"><div class="panel-title">命令库 <span>${commands.length}</span></div><div id="results"></div><div class="side-tip">搜索支持模糊匹配<br>试试「端口」「私钥」「递归」</div></aside><section class="editor"><div class="editor-head"><div><h2>${c.id} <span>${esc(c.title)}</span></h2><p>${esc(c.description)}</p></div><button id="reset" class="quiet">重置</button></div><section class="scenarios"><label for="scenario">你想做什么？</label><select id="scenario">${c.scenarios.map((s,i)=>`<option value="${s.id}" ${s.id===scenarioIds[selected]?'selected':''}>${i+1}. ${esc(s.title)}</option>`).join('')}<option value="" ${!scenario?'selected':''}>自定义参数</option></select><p>${esc(scenario?.description??'直接填写和调整全部命令参数。')}</p></section><div class="section-label">${scenario?'填写任务信息':'参数配置'} <span>* 为必填</span></div><form id="fields">${fields.map(f=>`<div class="field ${f.kind==='boolean'?'check-field':''}" data-field="${f.id}"><label for="f-${f.id}">${f.flag?`<code>${f.flag}</code>`:''} ${esc(f.label)} ${f.required?'<b>*</b>':''}</label>${f.kind==='boolean'?`<input id="f-${f.id}" type="checkbox" ${values[selected][f.id]?'checked':''}>`:`<input id="f-${f.id}" autocomplete="off" placeholder="${esc(f.placeholder)}" value="${esc(values[selected][f.id])}" ${f.required?'required':''}>`}<small>${esc(f.description)}</small></div>`).join('')}</form><section class="output"><div class="output-head"><strong>生成的命令</strong><select id="shell" aria-label="目标 Shell"><option value="powershell">PowerShell</option><option value="posix">POSIX / Bash</option></select></div><pre id="preview" aria-live="polite"></pre><div class="output-bottom"><small id="status">检查目标与路径后再执行</small><button id="copy">复制命令</button></div></section><section class="result-explanation" aria-label="执行结果说明"><div class="result-heading"><strong>结果说明</strong><span>成功执行后的预计变化</span></div><div id="result-state" class="muted"></div><div id="result-details" class="result-grid"></div><div id="result-example"></div></section></section><aside class="reference" id="reference"></aside></div>`;
 renderResults();renderReference();updatePreview();
 document.querySelector('#shell').value=shell;
 document.querySelector('#search').oninput=e=>{query=e.target.value;renderResults();};
 document.querySelector('#fields').onsubmit=e=>e.preventDefault();
 for(const f of fields){const el=document.querySelector(`#f-${f.id}`);if(scenario && Object.hasOwn(scenario.defaults,f.id)) { el.checked=scenario.defaults[f.id]; el.disabled=true; } el.onfocus=()=>{activeField=f.id;renderReference();};el.oninput=()=>{values[selected][f.id]=f.kind==='boolean'?el.checked:el.value;updatePreview();};}
 document.querySelector('#shell').onchange=e=>{shell=e.target.value;updatePreview();};
 document.querySelector('#reset').onclick=()=>{values[selected]={};renderAssistant();};
 document.querySelector('#scenario').onchange=e=>{scenarioIds[selected]=e.target.value; values[selected].source='';values[selected].target='';values[selected].forward='';values[selected].recursive=false;values[selected].noCommand=false;renderAssistant();document.querySelector('#fields input:not([disabled])')?.focus();};
 document.querySelector('#copy').onclick=async()=>{try{const output=currentOutput();await navigator.clipboard.writeText(output);document.querySelector('#status').textContent='已复制';}catch{document.querySelector('#status').textContent='复制失败，请手动选择命令复制';}};
}
function renderResults(){const results=search(query);document.querySelector('#results').innerHTML=results.length?results.map(({command:c,matches})=>`<button class="command ${selected===c.id?'selected':''}" data-command="${c.id}"><strong>${c.id}<span>↗</span></strong><span>${esc(c.title)}</span>${query?`<small>${matches.length?matches.map(f=>esc(f.flag??f.label)).join(' · '):'命令说明匹配'}</small>`:''}</button>`).join(''):'<p class="empty">没有匹配的命令</p>';for(const b of document.querySelectorAll('[data-command]'))b.onclick=()=>{selected=b.dataset.command;activeField=getCommand(selected).fields[0].id;renderAssistant();};}
function renderReference(){const c=getCommand(selected),f=c.fields.find(f=>f.id===activeField)??c.fields[0];document.querySelector('#reference').innerHTML=`<div class="panel-title">使用说明 <span>参考</span></div><div class="ref-body"><div class="eyebrow">${c.id.toUpperCase()} / ${esc(f.flag??f.id)}</div><h3>${esc(f.label)}</h3><p>${esc(f.description)}</p>${f.placeholder?`<div class="example-label">填写示例</div><code class="example">${esc(f.placeholder)}</code>`:''}<hr><h3>使用提示</h3><ul class="reference-notes">${c.notes.map(n=>`<li>${esc(n)}</li>`).join('')}</ul><hr><a href="${c.source}" target="_blank" rel="noreferrer">OpenSSH 官方手册 ↗</a><p class="muted">聚焦左侧参数，可查看对应说明。</p></div>`;}
function renderResult(){
 const result=describeResult(selected,scenarioIds[selected],values[selected],shell);
 document.querySelector('#result-details').innerHTML=[['before','执行前'],['after','执行后']].map(([key,label])=>`<section class="result-${key}"><h3>${label}</h3><ul>${result[key].map(text=>`<li>${esc(text)}</li>`).join('')}</ul></section>`).join('');
 const example=result.example;
 document.querySelector('#result-example').innerHTML=example?`<article class="worked-example"><h3>示例 · ${esc(example.title)}</h3><ul class="example-assumptions">${example.assumptions.map(t=>`<li>${esc(t)}</li>`).join('')}</ul><h4>示例命令 <span>独立示例，不是上方当前命令</span></h4><pre class="example-command">${esc(example.command)}</pre><div class="example-process"><h4>执行过程</h4><ol>${example.steps.map(t=>`<li>${esc(t)}</li>`).join('')}</ol></div><div class="example-comparison"><section><h4>执行前 · 位置与内容</h4><pre class="tree">${esc(example.before)}</pre></section><section><h4>执行后 · 位置与内容</h4><pre class="tree">${esc(example.after)}</pre></section></div><h4>变化要点</h4><ul class="takeaways">${example.takeaways.map(t=>`<li>${esc(t)}</li>`).join('')}</ul></article>`:'';
 let ready=true;try{currentOutput();}catch{ready=false;}
 document.querySelector('#result-state').textContent=ready?'以下按连接与传输成功说明，实际文件状态未检测。':'请补全有效参数；下方展示当前场景的变化说明。';
}
function updatePreview(){renderResult();try{document.querySelector('#preview').textContent=currentOutput();document.querySelector('#copy').disabled=false;document.querySelector('#status').textContent='检查目标与路径后再执行';}catch(e){document.querySelector('#preview').textContent=e.message;document.querySelector('#copy').disabled=true;}}
window.addEventListener('hashchange',render);
window.addEventListener('keydown',e=>{if(e.key==='/'&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)){const input=document.querySelector('#search');if(input){e.preventDefault();input.focus();}}});
render();
