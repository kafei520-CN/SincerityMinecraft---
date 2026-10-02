import {spawn} from 'node:child_process';

const url = 'http://127.0.0.1:4321/';

for (let attempt = 0; attempt < 40; attempt += 1) {
  try {
    const response = await fetch(url);
    if (response.ok) {
      spawn('cmd.exe', ['/c', 'start', '', url], {detached: true, stdio: 'ignore'}).unref();
      process.exit(0);
    }
  } catch {
    // Server is not listening yet.
  }
  await new Promise((resolve) => setTimeout(resolve, 500));
}

console.error('Server did not answer on ' + url);
process.exit(1);
