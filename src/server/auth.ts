import {createHmac, randomBytes, scryptSync, timingSafeEqual} from 'node:crypto';
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';

const ROOT = join(process.cwd(), 'data');
const FILE = join(ROOT, 'admin.json');
const COOKIE = 'sm_admin';

interface Store {
  salt: string;
  hash: string;
  secret: string;
}

function load(): Store {
  mkdirSync(ROOT, {recursive: true});
  if (!existsSync(FILE)) {
    const salt = randomBytes(16).toString('hex');
    const secret = randomBytes(24).toString('hex');
    const password = process.env.ADMIN_PASSWORD || 'admin';
    const store: Store = {salt, secret, hash: scryptSync(password, salt, 32).toString('hex')};
    writeFileSync(FILE, JSON.stringify(store, null, 2));
    return store;
  }
  return JSON.parse(readFileSync(FILE, 'utf8')) as Store;
}

function sign(value: string, secret: string): string {
  return `${value}.${createHmac('sha256', secret).update(value).digest('hex')}`;
}

export function checkPassword(password: string): boolean {
  const store = load();
  const got = scryptSync(password, store.salt, 32);
  const want = Buffer.from(store.hash, 'hex');
  return got.length === want.length && timingSafeEqual(got, want);
}

export function makeSession(): string {
  const store = load();
  const payload = `${Date.now()}.${randomBytes(8).toString('hex')}`;
  return sign(payload, store.secret);
}

export function validSession(cookieHeader: string | null): boolean {
  if (!cookieHeader) {
    return false;
  }
  const match = cookieHeader.match(/(?:^|;\s*)sm_admin=([^;]+)/);
  if (!match?.[1]) {
    return false;
  }
  const token = decodeURIComponent(match[1]);
  const dot = token.lastIndexOf('.');
  if (dot < 0) {
    return false;
  }
  const payload = token.slice(0, dot);
  const store = load();
  return sign(payload, store.secret) === token;
}

export function sessionCookie(token: string): string {
  return `${COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}`;
}

export function clearCookie(): string {
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export function requireAdmin(request: Request): boolean {
  return validSession(request.headers.get('cookie'));
}
