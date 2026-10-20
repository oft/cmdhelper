import { loadContent } from './content-files.js';
import { generateArticleIndex } from './article-index.js';

const { bundle } = await loadContent();
await generateArticleIndex(bundle.articles);
console.log(`Generated article index for ${bundle.articles.length} articles.`);
