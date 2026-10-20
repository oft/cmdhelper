import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  generate,
  generateScenario,
  describeResult,
  quote,
  search,
} from '../src/index.js';
test('scp options precede operands and use uppercase P', () =>
  assert.equal(
    generate('scp', {
      source: './a',
      target: 'u@host:/tmp/',
      port: '2222',
      recursive: true,
    }),
    'scp -P 2222 -r ./a u@host:/tmp/',
  ));
test('ssh uses lowercase p', () =>
  assert.equal(
    generate('ssh', { destination: 'u@host', port: '2222', noCommand: true }),
    'ssh -p 2222 -N u@host',
  ));
test('quote shell metacharacters and apostrophes', () => {
  assert.equal(quote("a'b", 'powershell'), "'a''b'");
  assert.equal(quote('$(touch x)'), "'$(touch x)'");
  assert.equal(quote("a'b"), "'a'\"'\"'b'");
});
test('reject invalid input', () => {
  assert.throws(() => generate('ssh', { destination: '-oops' }));
  assert.throws(() => generate('ssh', { destination: 'host', port: '65536' }));
  assert.throws(() => generate('scp', { source: 'a\nb', target: 'c' }));
  assert.throws(() => generate('scp', {}));
});
test('search descriptions, options and fuzzy names', () => {
  assert.equal(search('递归')[0]!.command.id, 'scp');
  assert.ok(search('私钥').length === 2);
  assert.equal(search('sh')[0]!.command.id, 'ssh');
  assert.equal(search('不存在的命令').length, 0);
});

test('scenarios distinguish directory and its contents', () => {
  const values = { source: './my folder/', target: 'u@host:/srv/' };
  assert.equal(
    generateScenario('scp', 'upload-directory', values),
    `scp -r './my folder/' u@host:/srv/`,
  );
  assert.equal(
    generateScenario('scp', 'upload-contents', values),
    `scp -r './my folder/.' u@host:/srv/`,
  );
  assert.equal(
    generateScenario('scp', 'upload-file', {
      source: './a',
      target: 'u@host:/srv/',
      recursive: true,
    }),
    'scp ./a u@host:/srv/',
  );
});
test('tunnel scenario requires a forwarding destination', () => {
  assert.throws(() =>
    generateScenario('ssh', 'tunnel', { destination: 'host' }),
  );
  assert.equal(
    generateScenario('ssh', 'tunnel', {
      destination: 'host',
      forward: '8080:localhost:80',
    }),
    'ssh -L 8080:localhost:80 -N host',
  );
});

test('result explains directory nesting, contents and retained sources', () => {
  const values = { source: './project', target: 'user@host:/srv/' };
  assert.match(
    describeResult('scp', 'upload-directory', values).after[0]!,
    /user@host:\/srv\/project/,
  );
  const contents = describeResult('scp', 'upload-contents', values);
  assert.match(contents.after[0]!, /不增加源文件夹/);
  assert.ok(contents.after.some((s) => s.includes('不移动、不删除')));
  assert.match(
    describeResult('scp', 'download-file', {
      source: 'u@host:/tmp/a.txt',
      target: './downloads/',
    }).after[0]!,
    /downloads\/a.txt/,
  );
});
test('result reflects tunnel and incomplete fields without inventing state', () => {
  const r = describeResult('ssh', 'tunnel', {
    destination: 'user@host',
    forward: '8080:localhost:80',
  });
  assert.ok(
    r.after.some(
      (s) => s.includes('127.0.0.1:8080') && s.includes('localhost:80'),
    ),
  );
  assert.match(describeResult('scp', 'upload-file', {}).before[0]!, /待填写/);
  assert.ok(
    describeResult('scp', 'upload-file', { preserve: true }).after.some((s) =>
      s.includes('权限位'),
    ),
  );
});

test('worked examples show distinct layouts with executable scenario commands', () => {
  const whole = describeResult('scp', 'upload-directory').example!;
  const contents = describeResult('scp', 'upload-contents').example!;
  assert.ok(whole.after.includes('└── project/'));
  assert.ok(!contents.after.includes('└── project/'));
  assert.ok(contents.after.includes('.env.example'));
  assert.equal(
    contents.command,
    'scp -r ./project/. deploy@example.com:/srv/uploads/',
  );
  assert.equal(
    describeResult('ssh', 'tunnel').example!.command,
    'ssh -L 8080:127.0.0.1:80 -N deploy@example.com',
  );
  assert.equal(describeResult('scp', '').example, null);
});
