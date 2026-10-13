// Roda os testes compilados da API com o runner nativo do Node (`node --test`),
// listando os arquivos explicitamente para funcionar em Node 18, 20 e 22.
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = 'dist/api/server';
const files = readdirSync(root, { recursive: true })
  .map(String)
  .filter(file => file.endsWith('.test.js'))
  .map(file => join(root, file))
  .sort();
if (!files.length) {
  console.error(`No API tests found in ${root}; run "npm run build:api" first.`);
  process.exit(1);
}
const { status } = spawnSync(process.execPath, ['--test', ...files], { stdio: 'inherit' });
process.exit(status ?? 1);
