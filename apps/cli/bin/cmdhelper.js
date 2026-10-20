#!/usr/bin/env node
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { commands, getCommand, generate, search, validate } from '@cmdhelper/core';
const args = process.argv.slice(2);
async function main() {
  if (args.includes('--help') || args.includes('-h')) {
    console.log('cmdhelper [scp|ssh] [--shell posix|powershell]\ncmdhelper search <关键词>\ncmdhelper explain <命令>\n逐步填写参数，只生成命令，不执行。输入留空跳过可选项，布尔项输入 y 启用。'); return;
  }
  if (args[0] === 'search') {
    for (const {command:c,matches} of search(args.slice(1).join(' '))) console.log(`${c.id} — ${c.description}\n${matches.map(f=>`  ${f.flag ?? f.id} ${f.label}：${f.description}`).join('\n')}`);
    return;
  }
  if (args[0] === 'explain') {
    const c=getCommand(args[1]); if(!c) throw Error('未知命令');
    console.log(`${c.id}：${c.description}\n${c.fields.map(f=>`${f.flag ?? f.id} ${f.label}：${f.description}`).join('\n')}\n${c.notes.join('\n')}\n${c.source}`);return;
  }
  const shellIndex=args.indexOf('--shell');
  const shell=shellIndex>=0?args[shellIndex+1]:(process.platform==='win32'?'powershell':'posix');
  if(!['powershell','posix'].includes(shell)) throw Error('shell 仅支持 posix 或 powershell');
  const positional=args.filter((_,i)=>i!==shellIndex && (shellIndex<0 || i!==shellIndex+1));
  if(positional.length>1 || positional.some(x=>x.startsWith('-'))) throw Error('未知参数，使用 --help 查看用法');
  if(!stdin.isTTY) throw Error('交互模式需要终端；使用 --help、search 或 explain 查看资料');
  const rl=createInterface({input:stdin,output:stdout});
  try {
    const id=positional[0] || (await rl.question(`选择命令 (${commands.map(c=>c.id).join('/')})：`)).trim();
    const c=getCommand(id);if(!c) throw Error('暂不支持该命令');
    console.log(`\n${c.description}\n`); const values={};
    for(const f of c.fields) {
      while(true) {
        const answer=(await rl.question(`${f.flag ?? f.id} ${f.label}${f.required?' *':''}\n  ${f.description}\n  ${f.kind==='boolean'?'启用？[y/N]':f.placeholder+'（可选项留空跳过）'} > `)).trim();
        values[f.id]=f.kind==='boolean'?/^(y|yes)$/i.test(answer):answer;
        const errors=validate(c,values).filter(e=>!e.startsWith('请填写') || e===`请填写${f.label}`);
        if(!errors.length) break; console.log(errors.join('\n'));
      }
    }
    console.log(`\n生成命令（${shell}）：\n${generate(id,values,shell)}\n`);
  } finally {rl.close();}
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
process.on('SIGINT',()=>process.exit(130));
