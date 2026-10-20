import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  CommandSchema,
  ToolsSchema,
  ProblemsSchema,
  ModelSchema,
  InstanceSchema,
  ArticleSchema,
  validateReferences,
} from '../../packages/schema/src/index.js';
import {
  loadContent,
  checkGeneratedSchemas,
  schemaOutputs,
  root,
} from '../content-files.js';
const { bundle } = await loadContent();
const clone = () => structuredClone(bundle);

test('generated schemas document every fixed property for IDE hints', async () => {
  function visit(value: unknown, path: string) {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) {
      value.forEach((item, i) => visit(item, `${path}/${i}`));
      return;
    }
    const node = value as Record<string, unknown>;
    if (node.properties) {
      for (const [key, property] of Object.entries(
        node.properties as Record<string, Record<string, unknown>>,
      )) {
        assert.equal(typeof property.title, 'string', `${path}/${key}: title`);
        assert.equal(
          typeof property.description,
          'string',
          `${path}/${key}: description`,
        );
        assert.ok((property.description as string).trim().length > 0);
      }
    }
    for (const [key, child] of Object.entries(node))
      visit(child, `${path}/${key}`);
  }
  for (const [path] of schemaOutputs)
    visit(JSON.parse(await readFile(new URL(path, root), 'utf8')), path);
  const command = JSON.parse(
    await readFile(new URL('schemas/command.schema.json', root), 'utf8'),
  );
  assert.deepEqual(
    command.properties.scenarios.items.properties.labels.examples,
    [{}],
  );
  assert.match(
    command.properties.scenarios.items.properties.labels.description,
    /继承基础名称/,
  );
  const article = JSON.parse(
    await readFile(new URL('schemas/article.schema.json', root), 'utf8'),
  );
  assert.deepEqual(article.properties.date.examples, ['2026-10-20']);
});
test('all source data and generated schemas are valid and in sync', async () => {
  assert.deepEqual(validateReferences(bundle), []);
  await checkGeneratedSchemas();
});
test('strict objects reject unexpected keys at every record level', () => {
  assert.equal(
    CommandSchema.safeParse({ ...bundle.commands[0], typo: true }).success,
    false,
  );
  const tool = structuredClone(bundle.tools);
  tool.tools[0]!.preconditions[0] = {
    ...tool.tools[0]!.preconditions[0]!,
    extra: true,
  } as never;
  assert.equal(ToolsSchema.safeParse(tool).success, false);
  assert.equal(
    ProblemsSchema.safeParse({ ...bundle.problems, unknown: 1 }).success,
    false,
  );
  assert.equal(
    ModelSchema.safeParse({ ...bundle.model, unknown: 1 }).success,
    false,
  );
  assert.equal(
    InstanceSchema.safeParse({ ...bundle.instances[0], extra: true }).success,
    false,
  );
  assert.equal(
    ArticleSchema.safeParse({ ...bundle.articles[0], extra: true }).success,
    false,
  );
});
test('models reject missing fields, invalid enums, null confirmations and invalid dates', () => {
  const c = structuredClone(bundle.commands[0]!);
  delete (c as Partial<typeof c>).source;
  assert.equal(CommandSchema.safeParse(c).success, false);
  const instance = structuredClone(bundle.instances[0]!);
  delete (instance.resources as Partial<typeof instance.resources>).install;
  assert.equal(InstanceSchema.safeParse(instance).success, false);
  assert.equal(
    InstanceSchema.safeParse({
      ...bundle.instances[0],
      resources: { ...bundle.instances[0]!.resources, install: 'maybe' },
    }).success,
    false,
  );
  assert.equal(
    ArticleSchema.safeParse({ ...bundle.articles[0], date: '2026-02-30' })
      .success,
    false,
  );
  assert.equal(
    ArticleSchema.safeParse({ ...bundle.articles[0], title: '   ' }).success,
    false,
  );
  const b = clone();
  b.instances[0]!.evidence.bad = {
    value: null,
    source: 'user',
    status: 'confirmed',
  };
  assert.ok(validateReferences(b).some((e) => e.includes('确认事实不能')));
});
test('unknown field references, invalid defaults and incomplete examples fail', () => {
  const b = clone();
  const c = b.commands[0]!,
    s = c.scenarios[0]!;
  s.required = ['typo'];
  s.defaults.typo = true;
  assert.ok(validateReferences(b).some((e) => e.includes('未知引用 typo')));
  const other = clone();
  other.commands[0]!.scenarios[0]!.result.example!.values = {};
  assert.ok(
    validateReferences(other).some((e) => e.includes('示例缺少必填字段')),
  );
});
test('cross-file command, tool and coordinate references are checked', () => {
  const b = clone();
  const s = b.problems.solutions[0]!;
  s.tool = 'missing';
  s.assistant = { command: 'git', scenario: 'missing' };
  s.requirements.missing = ['missing'];
  b.problems.presets[0]!.values.object = 'missing';
  const errors = validateReferences(b);
  assert.ok(errors.some((e) => e.includes('未知工具 missing')));
  assert.ok(errors.some((e) => e.includes('未知场景 missing')));
  assert.ok(errors.some((e) => e.includes('未知维度 missing')));
  assert.ok(errors.some((e) => e.includes('未知引用 missing')));
});
test('tree references cover every condition once and priority must descend', () => {
  const b = clone();
  const s = b.problems.solutions[0]!;
  s.checkTree.children[0]!.priority = 0;
  s.checkTree.children[0]!.checks.push(s.checkTree.children[0]!.checks[0]!);
  s.checkTree.children[0]!.checks.push('missing');
  const errors = validateReferences(b);
  assert.ok(errors.some((e) => e.includes('优先级')));
  assert.ok(errors.some((e) => e.includes('重复标识')));
  assert.ok(errors.some((e) => e.includes('未知引用 missing')));
  const other = clone();
  other.problems.solutions[0]!.checkTree.children = [];
  assert.ok(validateReferences(other).some((e) => e.includes('遗漏条件')));
});
test('resource definitions and instance template routes cannot drift', () => {
  const b = clone();
  b.model.resourceFields[0]!.options.push({
    id: 'unsupported',
    label: 'unsupported',
  });
  b.instances[0]!.selectedRoute = 'missing';
  assert.ok(
    validateReferences(b).some((e) => e.includes('未知选项 unsupported')),
  );
  assert.ok(validateReferences(b).some((e) => e.includes('未知路线 missing')));
});
test('generated JSON Schemas use 2020-12 and forbid unknown record properties', async () => {
  for (const [path] of schemaOutputs) {
    const schema = JSON.parse(await readFile(new URL(path, root), 'utf8')) as {
      $schema: string;
      additionalProperties: boolean;
    };
    assert.equal(
      schema.$schema,
      'https://json-schema.org/draft/2020-12/schema',
    );
    assert.equal(schema.additionalProperties, false);
  }
});
