import model from '../data/model.json' with {type:'json'};
export const problemModel=model;
export function assessResources(resources={},frequency='once'){
 for(const f of model.resourceFields)if(resources[f.id]!==undefined&&!f.options.some(o=>o.id===resources[f.id]))throw new Error(`无效资源条件：${f.id}`);
 const r=Object.fromEntries(model.resourceFields.map(f=>[f.id,resources[f.id]??'unknown']));
 const result=[];
 function route(id,blocked,missing,reasons,order){result.push({id,status:blocked.length?'excluded':missing.length?'pending':'eligible',blocked,missing,reasons,order});}
 route('manual',r.physical==='no'?['无法方便地直接操作目标设备']:[],r.physical==='unknown'?['能否直接操作目标设备？']:[],[frequency==='repeat'?'反复手工输入会累积操作和核对成本。':'短文本、单次使用时，可避免配置传输工具。'],r.priority==='repeat'?2:0);
 route('channel',r.channel==='no'?['没有已允许使用的现成通道']:[],r.channel==='unknown'?['是否已有可用且允许传递这些内容的通道？']:[],['沿用已有通道，仍需确认接收结果和内容一致性。'],1);
 const blocked=[],missing=[];
 if(r.toolReady==='unknown')missing.push('工具与连接基础环境是否已就绪？');
 if(r.toolReady!=='yes'){
  if(r.setup==='none'&&r.toolReady==='no')blocked.push('当前不接受额外准备，但工具环境尚未就绪');
  else if(r.setup==='unknown')missing.push('是否愿意投入环境准备？');
  for(const [key,title] of [['install','安装软件'],['configure','修改配置']]){
   if(r[key]==='no')missing.push(`不接受${title}：需先确认已有环境能直接使用，否则更换路线。`);
   else if(r[key]==='unknown')missing.push(`若现有环境缺失，是否接受${title}？`);
  }
 }
 route('tool',blocked,missing,[r.toolReady==='yes'?'已有基础环境可减少准备；后续仍需逐项核实前置条件。':'首次准备可能超过发送短文本本身的成本。',frequency==='repeat'?'重复使用时可摊薄首次准备成本。':'本次仅一次，应先比较手工与已有通道。'],r.priority==='repeat'?0:2);
 return result.sort((a,b)=>({eligible:0,pending:1,excluded:2}[a.status]-{eligible:0,pending:1,excluded:2}[b.status])||a.order-b.order);
}
