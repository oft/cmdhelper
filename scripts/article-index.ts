import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { format, resolveConfig } from 'prettier';
import type { Article } from '@cmdhelper/schema';

export const articleIndexUrl = new URL('../articles/index.ts', import.meta.url);

export async function renderArticleIndex(articles: Article[]): Promise<string> {
  const sorted = [...articles].sort(
    (a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug),
  );
  const imports = sorted.map(
    (article, index) =>
      `import article${index} from './${article.slug}.json' with { type: 'json' };`,
  );
  const source = [
    '// 自动生成，请勿手改。修改文章后运行 pnpm articles:generate。',
    "import type { Article } from '@cmdhelper/schema';",
    ...imports,
    '',
    `export const articles: Article[] = [${sorted.map((_, index) => `article${index}`).join(', ')}];`,
  ].join('\n');
  return format(source, {
    ...(await resolveConfig(fileURLToPath(articleIndexUrl))),
    parser: 'typescript',
  });
}

export async function generateArticleIndex(articles: Article[]) {
  await writeFile(articleIndexUrl, await renderArticleIndex(articles));
}
