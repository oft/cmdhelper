import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { loadContent } from '../content-files.js';
import { articleIndexUrl, renderArticleIndex } from '../article-index.js';

const { bundle } = await loadContent();

test('article index includes all source articles and stays in sync', async () => {
  const actual = await readFile(articleIndexUrl, 'utf8');
  assert.equal(
    actual.replaceAll('\r\n', '\n'),
    await renderArticleIndex(bundle.articles),
  );
});

test('article index sorts newest first, breaks date ties by slug, and drops removed articles', async () => {
  const article = bundle.articles[0]!;
  const older = { ...article, slug: 'older', date: '2025-01-01' };
  const first = { ...article, slug: 'alpha', date: '2026-01-01' };
  const second = { ...article, slug: 'beta', date: '2026-01-01' };
  const source = await renderArticleIndex([older, second, first]);
  assert.ok(source.indexOf('./alpha.json') < source.indexOf('./beta.json'));
  assert.ok(source.indexOf('./beta.json') < source.indexOf('./older.json'));
  assert.equal(source, await renderArticleIndex([first, older, second]));
  const updated = await renderArticleIndex([older, first]);
  assert.ok(!updated.includes('./beta.json'));
  assert.match(
    await renderArticleIndex([]),
    /export const articles: Article\[\] = \[\];/,
  );
});
