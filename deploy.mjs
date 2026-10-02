import {spawnSync} from 'node:child_process';
import {existsSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const port = process.env.PORT || '4321';
const host = process.env.HOST || '0.0.0.0';

function run(command, args, extraEnv = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: 'inherit',
    env: {...process.env, ...extraEnv},
  });
  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function has(command, args) {
  const result = spawnSync(command, args, {stdio: 'ignore'});
  return result.status === 0;
}

let pm = null;
if (has('corepack', ['pnpm', '--version'])) {
  pm = ['corepack', 'pnpm'];
} else if (has('pnpm', ['--version'])) {
  pm = ['pnpm'];
} else {
  console.error('pnpm was not found. Install Node.js 22 or newer, then run: node deploy.mjs');
  process.exit(1);
}

console.log('Installing dependencies...');
run(pm[0], [...pm.slice(1), 'install']);

const astro = join(root, 'node_modules', 'astro', 'bin', 'astro.mjs');
if (!existsSync(astro)) {
  console.error('astro was not installed.');
  process.exit(1);
}

console.log('Building...');
run(process.execPath, [astro, 'build']);

const entry = join(root, 'dist', 'server', 'entry.mjs');
if (!existsSync(entry)) {
  console.error('Build did not create dist/server/entry.mjs');
  process.exit(1);
}

console.log(`Listening on http://${host}:${port}/`);
run(process.execPath, [entry], {HOST: host, PORT: port});
