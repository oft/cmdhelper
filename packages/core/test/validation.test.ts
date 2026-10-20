import { test } from 'node:test';
import assert from 'node:assert/strict';
import { commands, generate, generateScenario } from '../src/index.js';

test('missing fields inherit base labels and list all missing fields in form order', () => {
  assert.throws(() => generateScenario('git', 'clone', {}), {
    message: '请填写仓库地址；请填写克隆到哪个目录？',
  });
  assert.throws(() => generateScenario('curl', 'get', {}), {
    message: '请填写请求地址',
  });
  assert.throws(
    () =>
      generateScenario('curl', 'download', { url: 'https://example.com/a' }),
    { message: '请填写保存到哪个文件？' },
  );
  assert.throws(() => generate('curl', { action: 'get' }), {
    message: '请填写请求地址',
  });
});

test('scenario labels and requirements are used for both base and scenario-required fields', () => {
  assert.throws(() => generateScenario('scp', 'upload-file', {}), {
    message: '请填写要发送哪个文件？；请填写发送到哪个远程目录？',
  });
  assert.throws(() => generateScenario('ssh', 'tunnel', {}), {
    message: '请填写通过哪台主机连接？；请填写将哪个本地端口转发到哪个服务？',
  });
  assert.throws(
    () =>
      generateScenario('scp', 'upload-file', {
        source: '-bad',
        target: 'u@host:/tmp/',
      }),
    { message: '要发送哪个文件？不能以 - 开头，本地路径请加 ./' },
  );
});

test('every catalog scenario reports the correct label for each missing required field', () => {
  for (const command of commands)
    for (const scenario of command.scenarios) {
      const example = scenario.result.example!.values;
      // Derive expectations from the model contract, independently of the field resolver.
      for (const field of command.fields) {
        if (scenario.fields && !scenario.fields.includes(field.id)) continue;
        if (!field.required && !scenario.required?.includes(field.id)) continue;
        const values = { ...example, [field.id]: '' };
        const label = scenario.labels[field.id] ?? field.label;
        if (String(scenario.defaults[field.id] ?? '').trim()) {
          assert.doesNotThrow(() =>
            generateScenario(command.id, scenario.id, values),
          );
        } else {
          assert.throws(
            () => generateScenario(command.id, scenario.id, values),
            { message: `请填写${label}` },
            `${command.id}/${scenario.id}/${field.id}`,
          );
        }
      }
      assert.doesNotThrow(() =>
        generateScenario(command.id, scenario.id, example),
      );
    }
});

test('defaults satisfy required fields before validation', () => {
  const command = commands.find((c) => c.id === 'curl')!;
  const original = command.scenarios.find((s) => s.id === 'get')!;
  const scenario = {
    ...original,
    id: 'test-default',
    defaults: { action: 'test-default', url: 'https://example.com' },
  };
  command.scenarios.push(scenario);
  try {
    assert.equal(
      generateScenario('curl', scenario.id, { url: '' }),
      'curl --globoff --fail-with-body https://example.com',
    );
  } finally {
    command.scenarios.pop();
  }
});
