import scp from '../data/scp.json' with { type: 'json' };
import ssh from '../data/ssh.json' with { type: 'json' };
export const commands = [scp, ssh];
export const getCommand = id => commands.find(c => c.id === id);
export function quote(value, shell = 'posix') {
  const s = String(value);
  if (/^[a-zA-Z0-9_@%+=:,./~-]+$/.test(s)) return s;
  return "'" + s.replaceAll("'", shell === "powershell" ? "''" : "'\"'\"'") + "'";
}
export function validate(command, values) {
  if (!command) return ['未知命令'];
  return command.fields.flatMap(f => {
    const v = values[f.id];
    if (f.required && !String(v ?? '').trim()) return [`请填写${f.label}`];
    if (v && /[\r\n\0]/.test(String(v))) return [`${f.label}不能包含换行或空字符`];
    if (v && f.kind === 'port' && (!/^\d+$/.test(v) || +v < 1 || +v > 65535)) return ['端口必须是 1–65535 的整数'];
    if (v && !f.flag && String(v).startsWith('-')) return [`${f.label}不能以 - 开头，本地路径请加 ./`];
    if (v && f.id === 'forward' && !/^\d+:[^\s:]+:\d+$/.test(v)) return ['转发格式应为 本地端口:主机:目标端口'];
    return [];
  });
}
export function generate(id, values = {}, shell = 'posix') {
  const c = getCommand(id), errors = validate(c, values);
  if (errors.length) throw new Error(errors.join('；'));
  const tokens = [id];
  for (const f of c.fields.filter(f => f.flag)) {
    const v = values[f.id];
    if (f.kind === 'boolean') { if (v === true) tokens.push(f.flag); }
    else if (v !== undefined && String(v).trim()) tokens.push(f.flag, quote(v, shell));
  }
  for (const f of c.fields.filter(f => !f.flag)) tokens.push(quote(values[f.id], shell));
  return tokens.join(' ');
}
function fuzzy(query, text) {
  let i = 0;
  for (const ch of text.toLowerCase()) if (ch === query[i]) i++;
  return i === query.length;
}
export function search(query = '') {
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return commands.toSorted((a,b) => Number(terms.every(t=>fuzzy(t,b.id)))-Number(terms.every(t=>fuzzy(t,a.id)))).map(c => ({command:c, matches:c.fields.filter(f => terms.every(t => fuzzy(t,`${f.flag ?? ''} ${f.label} ${f.description}`)))})).filter(({command:c,matches}) => !terms.length || matches.length || terms.every(t => fuzzy(t,`${c.id} ${c.title} ${c.description} ${c.notes.join(' ')}`)));
}

export function generateScenario(commandId, scenarioId, values, shell = 'posix') {
  const command = getCommand(commandId);
  const scenario = command?.scenarios?.find(s => s.id === scenarioId);
  if (!scenario) throw new Error('请选择使用场景');
  const resolved = { ...values, ...scenario.defaults };
  for (const id of scenario.required ?? []) {
    if (!String(resolved[id] ?? '').trim()) throw new Error(`请填写${scenario.labels[id]}`);
  }
  if (scenario.sourceSuffix && String(resolved.source ?? '').trim()) {
    const source = String(resolved.source).replaceAll('\\', '/');
    resolved.source = source.replace(/\/+$/, '').replace(/\/\.$/, '') + scenario.sourceSuffix;
  }
  return generate(commandId, resolved, shell);
}

export function describeResult(commandId, scenarioId, values = {}, shell = 'posix') {
  const command = getCommand(commandId);
  if (!command) throw new Error('未知命令');
  const scenario = command.scenarios?.find(s => s.id === scenarioId);
  const resolved = { ...values, ...scenario?.defaults };
  const source = String(resolved.source || '〔待填写源路径〕');
  const target = String(resolved.target || '〔待填写目标目录〕');
  const name = source.replaceAll('\\', '/').replace(/\/+$/, '').split('/').pop();
  const forward = String(resolved.forward || '').split(':');
  const tokens = {
    source, target, resultPath: target.replace(/[\\/]+$/, '') + '/' + (name || '〔源名称〕'),
    destination: resolved.destination || '〔待填写主机〕', port: resolved.port || '22',
    localPort: forward[0] || '〔本地端口〕', service: forward.length === 3 ? forward.slice(1).join(':') : '〔目标主机:端口〕',
  };
  const fill = text => text.replace(/\{(\w+)\}/g, (_, key) => String(tokens[key] ?? `〔${key}〕`));
  const template = scenario?.result ?? command.result;
  const before = template.before.map(fill), after = template.after.map(fill);
  if (commandId === 'ssh') {
    if (resolved.noCommand && scenarioId !== 'tunnel') after[0] = '连接成功后仅保持 SSH 连接，不打开远程交互终端。';
    if (resolved.forward && scenarioId !== 'tunnel') after.push(fill('同时尝试建立本地端口转发：127.0.0.1:{localPort} → {service}（经 SSH 主机）。'));
  }
  if (commandId === 'scp' && resolved.preserve) after.push('同时尝试保留源文件的修改时间、访问时间与权限位。');
  const example = template.example ? {
    ...template.example,
    command: generateScenario(commandId, scenarioId, template.example.values, shell),
  } : null;
  return {before, after, example};
}

export {problemCatalog, matchProblems, toolCatalog, evaluateReadiness, updateReadinessEvidence} from './problems.js';
export {problemModel, assessResources} from './resources.js';
