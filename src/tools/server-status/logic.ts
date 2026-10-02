import {normalizeSectionSigns} from '../motd/logic';

export type ServerEdition = 'java' | 'bedrock';

export interface ServerStatus {
  online: boolean;
  host: string;
  port: number;
  version: string;
  onlinePlayers: number;
  maxPlayers: number;
  motd: string;
  icon: string;
}

/** 通过 mcstatus.io 查询 Java 或基岩服务器。 */
export async function fetchServerStatus(edition: ServerEdition, address: string): Promise<ServerStatus> {
  const trimmed = address.trim();
  if (trimmed === '') {
    throw new Error('先填写服务器地址');
  }
  const response = await fetch(
    `https://api.mcstatus.io/v2/status/${edition}/${encodeURIComponent(trimmed)}?query=false`,
  );
  if (!response.ok) {
    throw new Error('查询失败，稍后再试');
  }
  const body: unknown = await response.json();
  return readStatus(body);
}

function readStatus(body: unknown): ServerStatus {
  const record = asRecord(body);
  const version = asRecord(record.version);
  const players = asRecord(record.players);
  const motd = asRecord(record.motd);
  const icon = typeof record.icon === 'string' ? record.icon : '';
  return {
    online: record.online === true,
    host: typeof record.host === 'string' ? record.host : '',
    port: typeof record.port === 'number' ? record.port : 0,
    version: typeof version.name === 'string'
      ? version.name
      : typeof version.name_clean === 'string'
        ? version.name_clean
        : '',
    onlinePlayers: typeof players.online === 'number' ? players.online : 0,
    maxPlayers: typeof players.max === 'number' ? players.max : 0,
    motd: normalizeSectionSigns(typeof motd.raw === 'string' ? motd.raw : ''),
    icon: icon.startsWith('data:') ? icon : icon === '' ? '' : `data:image/png;base64,${icon}`,
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value === 'object' && value !== null) {
    return value as Record<string, unknown>;
  }
  return {};
}
