import type { ContentBundle, CheckTree, Command } from './index.js';
import { ResourceEnums } from './index.js';

/** Cross-record rules cannot be expressed by a standalone JSON Schema. */
export function validateReferences(bundle: ContentBundle): string[] {
  const errors: string[] = [];
  const error = (path: string, message: string) =>
    errors.push(`${path}: ${message}`);
  function unique(ids: string[], path: string) {
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) error(path, `重复标识 ${id}`);
      seen.add(id);
    }
  }
  function has(ids: Set<string>, id: string, path: string) {
    if (!ids.has(id)) error(path, `未知引用 ${id}`);
  }
  unique(
    bundle.commands.map((c) => c.id),
    'commands',
  );
  unique(
    bundle.tools.tools.map((t) => t.id),
    'tools',
  );
  unique(
    bundle.problems.solutions.map((s) => s.id),
    'problems.solutions',
  );
  unique(
    bundle.problems.dimensions.map((d) => d.id),
    'problems.dimensions',
  );
  unique(
    bundle.model.templates.map((t) => t.id),
    'model.templates',
  );
  unique(
    bundle.model.resourceFields.map((d) => d.id),
    'model.resourceFields',
  );
  unique(
    bundle.instances.map((i) => i.id),
    'instances',
  );
  unique(
    bundle.articles.map((a) => a.slug),
    'articles',
  );
  const commands = new Map(bundle.commands.map((c) => [c.id, c]));
  const tools = new Map(bundle.tools.tools.map((t) => [t.id, t]));
  const dimensions = new Map(
    bundle.problems.dimensions.map((d) => [
      d.id,
      new Set(d.options.map((o) => o.id)),
    ]),
  );
  const variables = (c: Command) =>
    new Set([
      ...c.fields.map((f) => f.id),
      'resultPath',
      'localPort',
      'service',
    ]);
  function placeholders(texts: string[], allowed: Set<string>, path: string) {
    for (const text of texts)
      for (const match of text.matchAll(/{(w+)}/g))
        has(allowed, match[1]!, path);
  }
  for (const c of bundle.commands) {
    const path = `commands.${c.id}`;
    const fields = new Map(c.fields.map((f) => [f.id, f]));
    const fieldIds = new Set(fields.keys());
    unique(
      c.fields.map((f) => f.id),
      `${path}.fields`,
    );
    unique(
      c.scenarios.map((s) => s.id),
      `${path}.scenarios`,
    );
    placeholders(
      [...c.result.before, ...c.result.after],
      variables(c),
      `${path}.result`,
    );
    for (const s of c.scenarios) {
      const sp = `${path}.scenarios.${s.id}`;
      const active = new Set(s.fields ?? fieldIds);
      for (const [name, ids] of Object.entries({
        fields: s.fields ?? [],
        required: s.required ?? [],
        labels: Object.keys(s.labels),
        placeholders: Object.keys(s.placeholders ?? {}),
      })) {
        unique(ids, `${sp}.${name}`);
        for (const id of ids) {
          has(fieldIds, id, `${sp}.${name}`);
          if (name !== 'fields') has(active, id, `${sp}.${name}`);
        }
      }
      for (const [id, value] of Object.entries(s.defaults)) {
        if (id === 'action' && c.scenarioOnly) {
          if (value !== s.id) error(sp, 'action 默认值必须等于场景标识');
          continue;
        }
        has(active, id, `${sp}.defaults`);
        const f = fields.get(id);
        if (f && (f.kind === 'boolean') !== (typeof value === 'boolean'))
          error(`${sp}.defaults.${id}`, '默认值类型与字段类型不符');
      }
      if (
        c.scenarioOnly &&
        (!s.tokens?.length || s.defaults.action !== s.id || !s.fields)
      )
        error(sp, '场景型命令必须提供 tokens、fields 和 action 默认值');
      placeholders(
        [...s.result.before, ...s.result.after],
        variables(c),
        `${sp}.result`,
      );
      if (s.result.example) {
        const values = s.result.example.values;
        for (const id of Object.keys(values))
          has(active, id, `${sp}.example.values`);
        for (const id of [
          ...c.fields
            .filter((f) => f.required && active.has(f.id))
            .map((f) => f.id),
          ...(s.required ?? []),
        ]) {
          if (!String(values[id] ?? s.defaults[id] ?? '').trim())
            error(sp, `示例缺少必填字段 ${id}`);
        }
        for (const [id, value] of Object.entries(values)) {
          const f = fields.get(id);
          if (f && (f.kind === 'boolean') !== (typeof value === 'boolean'))
            error(sp, `示例字段 ${id} 类型错误`);
        }
      }
    }
  }
  for (const d of bundle.problems.dimensions)
    unique(
      d.options.map((o) => o.id),
      `dimensions.${d.id}.options`,
    );
  function coordinates(values: Record<string, string>, path: string) {
    for (const key of dimensions.keys())
      if (!(key in values)) error(path, `缺少维度 ${key}`);
    for (const [key, value] of Object.entries(values)) {
      if (!dimensions.has(key)) error(path, `未知维度 ${key}`);
      else has(dimensions.get(key)!, value, `${path}.${key}`);
    }
  }
  for (const [i, p] of bundle.problems.presets.entries())
    coordinates(p.values, `presets.${i}`);
  for (const s of bundle.problems.solutions) {
    const path = `solutions.${s.id}`;
    const tool = tools.get(s.tool);
    if (!tool) error(path, `未知工具 ${s.tool}`);
    for (const [group, rules] of Object.entries({
      match: s.match,
      requirements: s.requirements,
    }))
      for (const [key, values] of Object.entries(rules)) {
        if (!dimensions.has(key)) error(path, `未知维度 ${key}`);
        else
          for (const value of values)
            has(dimensions.get(key)!, value, `${path}.${group}.${key}`);
        unique(values, `${path}.${group}.${key}`);
        if (
          group === 'requirements' &&
          s.match[key] &&
          !values.some((value) => s.match[key]!.includes(value))
        )
          error(path, `维度 ${key} 的 match 与 requirements 冲突`);
      }
    if (s.assistant) {
      const c = commands.get(s.assistant.command);
      if (!c) error(path, `未知命令 ${s.assistant.command}`);
      else if (!c.scenarios.some((x) => x.id === s.assistant!.scenario))
        error(path, `未知场景 ${s.assistant.scenario}`);
    }
    const checks = [...(tool?.preconditions ?? []), ...s.preconditions];
    unique(
      checks.map((c) => c.id),
      `${path}.preconditions`,
    );
    unique(
      s.acceptance.map((c) => c.id),
      `${path}.acceptance`,
    );
    const valid = new Set(checks.map((c) => c.id));
    for (const item of s.acceptance)
      if (valid.has(item.id)) error(path, `验收与前置条件标识冲突 ${item.id}`);
    const nodeIds: string[] = [],
      refs: string[] = [];
    function walk(n: CheckTree, parent?: CheckTree) {
      nodeIds.push(n.id);
      refs.push(...n.checks);
      for (const id of n.checks) has(valid, id, `${path}.checkTree.${n.id}`);
      if (parent && (n.priority <= parent.priority || n.id === 'goal'))
        error(path, '子节点优先级必须低于父节点且不能使用 goal 标识');
      for (const child of n.children) walk(child, n);
    }
    if (
      s.checkTree.id !== 'goal' ||
      s.checkTree.priority !== 0 ||
      s.checkTree.checks.length
    )
      error(path, '检查树根必须是 priority=0、checks 为空的 goal 节点');
    walk(s.checkTree);
    unique(nodeIds, `${path}.checkTree`);
    unique(refs, `${path}.checkTree.checks`);
    for (const id of valid)
      if (!refs.includes(id)) error(path, `检查树遗漏条件 ${id}`);
  }
  for (const tool of bundle.tools.tools)
    unique(
      tool.preconditions.map((c) => c.id),
      `tools.${tool.id}.preconditions`,
    );
  const requiredResources = Object.keys(ResourceEnums).filter(
    (k) => k !== 'frequency',
  );
  const actualResources = new Set(bundle.model.resourceFields.map((d) => d.id));
  for (const id of requiredResources)
    has(actualResources, id, 'model.resourceFields');
  for (const d of bundle.model.resourceFields) {
    const def = ResourceEnums[d.id as keyof typeof ResourceEnums];
    if (!def || d.id === 'frequency')
      error('model.resourceFields', `未知资源维度 ${d.id}`);
    else {
      unique(
        d.options.map((o) => o.id),
        `resourceFields.${d.id}`,
      );
      const options = new Set(d.options.map((o) => o.id));
      for (const v of def.options) has(options, v, `resourceFields.${d.id}`);
      for (const v of options)
        if (!def.options.includes(v as never))
          error(`resourceFields.${d.id}`, `未知选项 ${v}`);
    }
  }
  for (const t of bundle.model.templates) {
    unique(
      t.entities.map((e) => e.id),
      `templates.${t.id}.entities`,
    );
    unique(
      t.routes.map((r) => r.id),
      `templates.${t.id}.routes`,
    );
  }
  for (const instance of bundle.instances) {
    const path = `instances.${instance.id}`,
      template = bundle.model.templates.find(
        (t) => t.id === instance.templateId,
      );
    if (!template) error(path, `未知问题模板 ${instance.templateId}`);
    unique(
      instance.entities.map((e) => e.id),
      `${path}.entities`,
    );
    if (template) {
      for (const entity of template.entities) {
        const match = instance.entities.find((e) => e.id === entity.id);
        if (!match || match.type !== entity.type)
          error(path, `缺少或不匹配的模板实体 ${entity.id}`);
      }
      if (
        instance.selectedRoute !== null &&
        !template.routes.some((r) => r.id === instance.selectedRoute)
      )
        error(path, `未知路线 ${instance.selectedRoute}`);
    }
    for (const [key, fact] of Object.entries(instance.evidence)) {
      if (
        fact.status === 'confirmed' &&
        (fact.value === null || fact.source === 'inferred')
      )
        error(`${path}.evidence.${key}`, '确认事实不能是 null 或仅由模型推断');
    }
  }
  return errors;
}
