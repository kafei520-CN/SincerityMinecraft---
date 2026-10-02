export const commandVersions = [
  {id: 'java-1.12', name: 'Java 1.12 及更早'},
  {id: 'java-1.13', name: 'Java 1.13 – 1.20.4'},
  {id: 'java-1.20.5', name: 'Java 1.20.5 及更新'},
  {id: 'bedrock', name: '基岩版'},
] as const;

export type CommandVersion = (typeof commandVersions)[number]['id'];

export const commandKinds = [
  {id: 'give', name: '给予'},
  {id: 'summon', name: '召唤'},
  {id: 'tp', name: '传送'},
  {id: 'gamemode', name: '游戏模式'},
  {id: 'effect', name: '效果'},
  {id: 'time', name: '时间'},
  {id: 'weather', name: '天气'},
] as const;

export type CommandKind = (typeof commandKinds)[number]['id'];

export interface CommandInput {
  version: CommandVersion;
  kind: CommandKind;
  target: string;
  item: string;
  count: string;
  entity: string;
  x: string;
  y: string;
  z: string;
  gamemode: string;
  effect: string;
  seconds: string;
  amplifier: string;
  time: string;
  weather: string;
}

export interface BuiltCommand {
  command: string;
  note: string;
}

const GAME_MODES: Record<string, {old: string; name: string}> = {
  survival: {old: '0', name: 'survival'},
  creative: {old: '1', name: 'creative'},
  adventure: {old: '2', name: 'adventure'},
  spectator: {old: '3', name: 'spectator'},
};

/** 按所选版本拼出一条可粘贴的指令。 */
export function buildCommand(input: CommandInput): BuiltCommand {
  const target = clean(input.target, input.version === 'java-1.12' ? 'Player' : '@s');
  const modern = input.version !== 'java-1.12' && input.version !== 'bedrock';
  if (input.kind === 'give') {
    const item = itemId(input.item, modern);
    const count = whole(input.count, 1, 9999);
    return {
      command: `/give ${target} ${item} ${count}`,
      note: input.version === 'java-1.12'
        ? '1.12 的物品 ID 不带 minecraft: 前缀。'
        : input.version === 'bedrock'
          ? '基岩版给予指令不写 give 以外的子命令。'
          : '1.13 之后物品 ID 带 minecraft: 前缀，数量写在物品后面。',
    };
  }
  if (input.kind === 'summon') {
    const entity = itemId(input.entity, modern);
    return {
      command: `/summon ${entity} ${coord(input.x)} ${coord(input.y)} ${coord(input.z)}`,
      note: modern ? '1.13 之后实体 ID 带命名空间。' : '这个版本的实体 ID 不带命名空间。',
    };
  }
  if (input.kind === 'tp') {
    return {
      command: `/tp ${target} ${coord(input.x)} ${coord(input.y)} ${coord(input.z)}`,
      note: '坐标可以写成 ~ ~ ~，表示相对当前位置。',
    };
  }
  if (input.kind === 'gamemode') {
    const mode = GAME_MODES[input.gamemode] ?? GAME_MODES.survival;
    const value = input.version === 'java-1.12' ? mode?.old ?? '0' : mode?.name ?? 'survival';
    return {
      command: `/gamemode ${value} ${target}`,
      note: input.version === 'java-1.12'
        ? '1.12 用数字：0 生存，1 创造，2 冒险，3 旁观。'
        : '这个版本用模式名字。',
    };
  }
  if (input.kind === 'effect') {
    const effect = itemId(input.effect, modern);
    const seconds = whole(input.seconds, 30, 1000000);
    const amplifier = whole(input.amplifier, 0, 255);
    if (input.version === 'java-1.12') {
      return {command: `/effect ${target} ${effect} ${seconds} ${amplifier}`, note: '1.12 没有 give 子命令。'};
    }
    if (input.version === 'bedrock') {
      return {command: `/effect ${target} ${effect} ${seconds} ${amplifier}`, note: '基岩版效果指令直接写玩家和效果。'};
    }
    return {
      command: `/effect give ${target} ${effect} ${seconds} ${amplifier}`,
      note: '1.13 之后要写 effect give。',
    };
  }
  if (input.kind === 'time') {
    return {command: `/time set ${clean(input.time, 'day')}`, note: '这几个版本的时间指令写法相同。'};
  }
  return {command: `/weather ${clean(input.weather, 'clear')}`, note: '这几个版本的天气指令写法相同。'};
}

function itemId(raw: string, namespaced: boolean): string {
  const bare = raw.trim().toLowerCase().replace(/^minecraft:/, '');
  const safe = /^[a-z0-9_./-]+$/.test(bare) ? bare : 'diamond';
  return namespaced ? `minecraft:${safe}` : safe;
}

function clean(raw: string, fallback: string): string {
  const value = raw.trim();
  if (value === '' || /[\r\n]/.test(value)) {
    return fallback;
  }
  return value;
}

function coord(raw: string): string {
  const value = raw.trim();
  if (value === '' || value === '~') {
    return '~';
  }
  if (/^-?\d+(\.\d+)?$/.test(value) || /^~-?\d+(\.\d+)?$/.test(value)) {
    return value;
  }
  return '~';
}

function whole(raw: string, fallback: number, max: number): number {
  if (!/^\d+$/.test(raw.trim())) {
    return fallback;
  }
  const value = Number(raw.trim());
  if (!Number.isInteger(value) || value > max) {
    return fallback;
  }
  return value;
}
