export interface PlayerProfile {
  name: string;
  id: string;
  rawId: string;
}

/** 用玩家名或 UUID 向 playerdb 查询正版档案。 */
export async function lookupPlayer(query: string): Promise<PlayerProfile> {
  const trimmed = query.trim();
  if (trimmed === '') {
    throw new Error('先填写玩家名或 UUID');
  }
  const response = await fetch(`https://playerdb.co/api/player/minecraft/${encodeURIComponent(trimmed)}`);
  if (!response.ok) {
    throw new Error('没有找到这个玩家');
  }
  const body: unknown = await response.json();
  const player = readPlayer(body);
  if (!player) {
    throw new Error('没有找到这个玩家');
  }
  return player;
}

export function avatarUrl(rawId: string): string {
  return `https://crafatar.com/avatars/${rawId}?overlay&size=64`;
}

export function bodyUrl(rawId: string): string {
  return `https://crafatar.com/renders/body/${rawId}?overlay`;
}

export function skinPngUrl(rawId: string): string {
  return `https://crafatar.com/skins/${rawId}`;
}

function readPlayer(body: unknown): PlayerProfile | undefined {
  if (typeof body !== 'object' || body === null || !('data' in body)) {
    return undefined;
  }
  const data = body.data;
  if (typeof data !== 'object' || data === null || !('player' in data)) {
    return undefined;
  }
  const player = data.player;
  if (typeof player !== 'object' || player === null) {
    return undefined;
  }
  const name = 'username' in player && typeof player.username === 'string' ? player.username : '';
  const id = 'id' in player && typeof player.id === 'string' ? player.id : '';
  const rawId = 'raw_id' in player && typeof player.raw_id === 'string' ? player.raw_id : id.replaceAll('-', '');
  if (name === '' || id === '') {
    return undefined;
  }
  return {name, id, rawId};
}
