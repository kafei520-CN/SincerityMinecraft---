export interface Visitor {
  ip: string;
  path: string;
  rendering: boolean;
  ua: string;
  seen: number;
}

const visitors = new Map<string, Visitor>();
const TTL = 45_000;

function prune(now = Date.now()): void {
  for (const [key, row] of visitors) {
    if (now - row.seen > TTL) {
      visitors.delete(key);
    }
  }
}

export function clientIp(request: Request, fallback = ''): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || fallback;
  }
  return fallback;
}

export function touchVisitor(input: {ip: string; path: string; rendering?: boolean; ua?: string}): void {
  const now = Date.now();
  prune(now);
  const key = `${input.ip}|${input.ua ?? ''}`;
  const prev = visitors.get(key);
  visitors.set(key, {
    ip: input.ip || '未知',
    path: input.path || '/',
    rendering: Boolean(input.rendering) || input.path.includes('skin-render'),
    ua: input.ua ?? '',
    seen: now,
  });
  if (prev && !input.rendering && prev.rendering && Date.now() - prev.seen < 5000) {
    const row = visitors.get(key);
    if (row) {
      row.rendering = true;
    }
  }
}

export function listVisitors(): Visitor[] {
  prune();
  return [...visitors.values()].sort((a, b) => b.seen - a.seen);
}

export function renderSessions(): Visitor[] {
  return listVisitors().filter((row) => row.rendering);
}
