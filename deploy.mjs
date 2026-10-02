import {spawnSync} from 'node:child_process';
import {existsSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const port = process.env.PORT || '4321';
const host = process.env.HOST || '0.0.0.0';
const isWin = process.platform === 'win32';

function run(command, args, extraEnv = {}, shell = false) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: 'inherit',
    shell,
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

function findPnpm() {
  const candidates = isWin
    ? [
        ['corepack.cmd', ['pnpm']],
        ['corepack', ['pnpm']],
        ['pnpm.cmd', []],
        ['pnpm', []],
      ]
    : [
        ['corepack', ['pnpm']],
        ['pnpm', []],
      ];
  for (const [bin, prefix] of candidates) {
    const check = spawnSync(bin, [...prefix, '--version'], {
      stdio: 'ignore',
      shell: isWin,
    });
    if (check.status === 0) {
      return {bin, prefix};
    }
  }
  return null;
}

const pm = findPnpm();
if (!pm) {
  console.error('pnpm was not found. Install Node.js 22 or newer, then run: node deploy.mjs');
  process.exit(1);
}

console.log('Installing dependencies...');
run(pm.bin, [...pm.prefix, 'install'], {}, isWin);

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
