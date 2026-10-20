export const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const esc=escapeHtml;
export function dimensionSlider({id,label,options,value,name=id}){
 const index=Math.max(0,options.findIndex(o=>o.id===value));
 return `<fieldset class="dimension-slider" data-slider="${esc(id)}"><div class="dimension-heading"><label for="slider-${esc(id)}">${esc(label)}</label><output for="slider-${esc(id)}">${esc(options[index].label)}</output></div><input id="slider-${esc(id)}" name="${esc(name)}" type="range" min="0" max="${options.length-1}" step="1" value="${index}" aria-valuetext="${esc(options[index].label)}"><div class="slider-stops" style="--stops:${options.length}">${options.map((o,i)=>`<button type="button" data-stop="${i}" aria-pressed="${i===index}"><span>${esc(o.label)}</span><small data-count="${i}"></small></button>`).join('')}</div></fieldset>`;
}
export function bindDimensionSliders(root,definitions,onInput){
 for(const definition of definitions){
  const box=root.querySelector(`[data-slider="${definition.id}"]`);
  const input=box.querySelector('input');
  input.oninput=()=>{
   const index=Number(input.value),option=definition.options[index];
   box.querySelector('output').textContent=option.label;
   input.setAttribute('aria-valuetext',option.label);
   for(const b of box.querySelectorAll('[data-stop]'))b.setAttribute('aria-pressed',String(+b.dataset.stop===index));
   onInput(definition.id,option.id);
  };
  for(const button of box.querySelectorAll('[data-stop]'))button.onclick=()=>{
   if(input.disabled)return;
   input.value=button.dataset.stop;
   input.dispatchEvent(new Event('input',{bubbles:true}));
   input.focus();
  };
 }
}
export function setDimensionDisabled(root,id,disabled){
 const box=root.querySelector(`[data-slider="${id}"]`);
 box.disabled=disabled;
 box.classList.toggle('irrelevant',disabled);
}
export function setDimensionCounts(root,id,counts,label){
 const box=root.querySelector(`[data-slider="${id}"]`);
 for(const el of box.querySelectorAll('[data-count]')){
  const count=counts[+el.dataset.count];
  el.textContent=count===null?'不适用':`${count} ${label}`;
 }
}
