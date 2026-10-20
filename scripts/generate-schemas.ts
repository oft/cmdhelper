import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { root, schemaOutputs, schemaText } from './content-files.js';
for (const [path, schema] of schemaOutputs) {
  const target = new URL(path, root);
  await mkdir(dirname(fileURLToPath(target)), { recursive: true });
  await writeFile(target, schemaText(schema));
}
console.log(`Generated ${schemaOutputs.length} JSON Schemas from Zod.`);
