declare module 'node:child_process' {
  export interface ChildProcess {
    kill(): void;
  }
  export function spawn(command: string, args: readonly string[], options: {stdio: 'ignore'}): ChildProcess;
}

declare module 'node:fs' {
  export function existsSync(path: string): boolean;
}

declare const process: {env: {TEMP?: string}};

declare const Buffer: {
  from(data: string, encoding: 'base64'): Uint8Array;
};
