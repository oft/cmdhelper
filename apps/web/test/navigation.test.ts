import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import {
  Window,
  type HTMLInputElement,
  type HTMLButtonElement,
  type HTMLSelectElement,
} from 'happy-dom';

test('compiled website supports command editing, sliders and all navigation pages', async () => {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const output = await build({
    root,
    configFile: root + 'vite.config.ts',
    logLevel: 'silent',
    build: { write: false },
  });
  assert.ok(!Array.isArray(output) && 'output' in output);
  const bundle = output.output.find(
    (item) => item.type === 'chunk' && item.isEntry,
  );
  assert.ok(bundle && bundle.type === 'chunk');
  const window = new Window({ url: 'http://localhost/cmdhelper/' });
  const { document } = window;
  document.body.innerHTML = '<div id="app"></div>';
  try {
    window.eval(bundle.code);
    const element = (selector: string) => {
      const found = document.querySelector(selector);
      assert.ok(found, `Missing element: ${selector}`);
      return found;
    };
    const flush = async () => {
      await Promise.resolve();
      await window.happyDOM.waitUntilComplete();
    };
    const navigate = async (hash: string) => {
      window.location.hash = hash;
      window.dispatchEvent(new window.Event('hashchange'));
      await flush();
    };
    assert.match(element('h1').textContent, /命令助手/);
    for (const [command, field, expected] of [
      ['git', 'repository', '请填写仓库地址'],
      ['curl', 'url', '请填写请求地址'],
    ]) {
      (element(`[data-command="${command}"]`) as HTMLButtonElement).click();
      await flush();
      assert.match(element('#preview').textContent, new RegExp(expected!));
      assert.ok(element(`#f-${field}`));
    }
    const scenario = element('#scenario') as HTMLSelectElement;
    scenario.value = 'download';
    scenario.dispatchEvent(new window.Event('change', { bubbles: true }));
    await flush();
    assert.ok(element('#f-output'));
    const url = element('#f-url');
    url.setAttribute('value', 'https://example.com');
    // Set the live input value as a user would, rather than just its HTML attribute.
    (url as HTMLInputElement).value = 'https://example.com';
    url.dispatchEvent(new window.Event('input', { bubbles: true }));
    await flush();
    assert.match(element('#preview').textContent, /请填写保存到哪个文件/);
    const destination = element('#f-output') as HTMLInputElement;
    destination.value = './result.txt';
    destination.dispatchEvent(new window.Event('input', { bubbles: true }));
    await flush();
    assert.match(
      element('#preview').textContent,
      /curl.exe.*https:\/\/example.com/,
    );
    assert.match(element('#preview').textContent, /--output .\/result.txt/);
    await navigate('#/problems');
    const slider = element('#slider-physical');
    (slider as HTMLInputElement).value = '1';
    slider.dispatchEvent(new window.Event('input', { bubbles: true }));
    await flush();
    assert.match(element('#resource-comparison').textContent, /可选择路线/);
    const setSlider = async (id: string, index: number) => {
      const input = element(`#slider-${id}`) as HTMLInputElement;
      input.value = String(index);
      input.dispatchEvent(new window.Event('input', { bubbles: true }));
      await flush();
    };
    const click = async (selector: string) => {
      (element(selector) as HTMLButtonElement).click();
      await flush();
    };
    await setSlider('toolReady', 1);
    await click('[data-route="tool"]');
    assert.ok(element('.check-tree'));
    assert.ok((element('.acceptance select') as HTMLSelectElement).disabled);
    // Walk the visible hierarchy; each parent unlocks the next level.
    for (let count = 0; count < 40; count++) {
      const next = [
        ...document.querySelectorAll<HTMLSelectElement>('[data-check]'),
      ].find((select) => !select.disabled && select.value === 'unknown');
      if (!next) break;
      next.value = 'pass';
      next.dispatchEvent(new window.Event('change', { bubbles: true }));
      await flush();
    }
    const assistant = element('[data-solution="scp"]') as HTMLButtonElement;
    assert.equal(assistant.disabled, false);
    await click('[data-solution="scp"]');
    await flush();
    assert.match(element('.editor h2').textContent, /scp/);
    await navigate('#/problems');
    await setSlider('toolReady', 2);
    assert.equal(document.querySelector('.check-tree'), null);
    const mode = element('#resource-mode') as HTMLSelectElement;
    mode.value = 'text';
    mode.dispatchEvent(new window.Event('change', { bubbles: true }));
    await flush();
    await click('[data-route="manual"]');
    assert.ok(element('.resource-chosen'));
    const outcome = element('#resource-outcome') as HTMLSelectElement;
    outcome.value = 'pass';
    outcome.dispatchEvent(new window.Event('change', { bubbles: true }));
    await flush();
    assert.match(element('#resource-plan').textContent, /你已报告目标完成/);
    await setSlider('physical', 2);
    assert.equal(document.querySelector('#resource-outcome'), null);
    await navigate('#/articles');
    assert.ok(element('.article'));
    await navigate(element('.article').getAttribute('href')!);
    assert.ok(element('article.reading h1'));
    await navigate('#/about');
    assert.match(element('h1').textContent, /知道命令/);
    // The search shortcut is harmless on pages without the command search box.
    window.dispatchEvent(new window.KeyboardEvent('keydown', { key: '/' }));
    await navigate('#/assistant');
    await click('[data-command="curl"]');
    assert.match(element('#preview').textContent, /--output .\/result.txt/);
  } finally {
    await window.happyDOM.close();
  }
});
