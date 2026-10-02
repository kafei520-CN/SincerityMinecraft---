const FAVORITES_KEY = 'sincerity-tools-favorites';
const RECENT_KEY = 'sincerity-tools-recent';
const RECENT_LIMIT = 4;

export const favoritesEventName = 'sincerity-favorites';
export const recentEventName = 'sincerity-recent';

/** 读取收藏的工具 id。 */
export function readFavorites(): string[] {
  return readIds(FAVORITES_KEY);
}

/** 切换收藏，返回切换后是否已收藏。 */
export function toggleFavorite(toolId: string): boolean {
  const current = readFavorites();
  const next = current.includes(toolId)
    ? current.filter((id) => id !== toolId)
    : [toolId, ...current];
  writeIds(FAVORITES_KEY, next);
  window.dispatchEvent(new Event(favoritesEventName));
  return next.includes(toolId);
}

/** 读取最近打开的工具 id，新的在前。 */
export function readRecent(): string[] {
  return readIds(RECENT_KEY);
}

/** 把工具记到最近使用的最前面。 */
export function rememberTool(toolId: string): void {
  const next = [toolId, ...readRecent().filter((id) => id !== toolId)].slice(0, RECENT_LIMIT);
  writeIds(RECENT_KEY, next);
  window.dispatchEvent(new Event(recentEventName));
}

function readIds(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return [];
    }
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((item): item is string => typeof item === 'string');
  } catch {
    return [];
  }
}

function writeIds(key: string, ids: string[]): void {
  localStorage.setItem(key, JSON.stringify(ids));
}
