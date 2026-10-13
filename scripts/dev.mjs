// `npm start`: compila e sobe a API de catálogo e o `ng serve` (com proxy de /api) juntos.
// Argumentos extras vão para o `ng serve`, ex.: `npm start -- --host 0.0.0.0 --port 4173`.
import { spawn } from 'node:child_process';

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const children = [
  spawn(npm, ['run', 'start:api'], { stdio: 'inherit', shell: process.platform === 'win32' }),
  spawn(npm, ['run', 'start:web', '--', ...process.argv.slice(2)], { stdio: 'inherit', shell: process.platform === 'win32' })
];

let exiting = false;
function stopAll(code) {
  if (exiting) return;
  exiting = true;
  for (const child of children) if (child.exitCode === null) child.kill('SIGTERM');
  process.exitCode = code;
}

for (const child of children) child.on('exit', code => stopAll(code ?? 0));
process.on('SIGINT', () => stopAll(0));
process.on('SIGTERM', () => stopAll(0));
