import { mkdir, copyFile, readFile, writeFile } from 'node:fs/promises';
import { checkGeneratedSchemas, loadContent } from './content-files.js';
import { generateArticleIndex } from './article-index.js';
const root = new URL('../', import.meta.url);
await checkGeneratedSchemas();
const { bundle, count } = await loadContent();
console.log(
  `Validated ${count} content files, cross-file references and generated schemas.`,
);
await generateArticleIndex(bundle.articles);
await mkdir(new URL('packages/core/data/', root), { recursive: true });
await mkdir(new URL('packages/core/schemas/', root), { recursive: true });
const snapshots: [string, string, string][] = [
  ...['ssh', 'scp', 'git', 'curl'].map((name): [string, string, string] => [
    `commands/${name}.json`,
    name,
    'command',
  ]),
  ['problems/catalog.json', 'problems', 'problems'],
  ['tools/catalog.json', 'tools', 'tools'],
  ['problems/model.json', 'model', 'model'],
];
for (const [source, name, schema] of snapshots) {
  const data = JSON.parse(await readFile(new URL(source, root), 'utf8'));
  data.$schema = `../schemas/${schema}.schema.json`;
  await writeFile(
    new URL(`packages/core/data/${name}.json`, root),
    JSON.stringify(data, null, 2) + '\n',
  );
}
for (const schema of new Set(snapshots.map(([, , schema]) => schema)))
  await copyFile(
    new URL(`schemas/${schema}.schema.json`, root),
    new URL(`packages/core/schemas/${schema}.schema.json`, root),
  );
