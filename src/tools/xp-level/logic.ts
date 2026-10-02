export const MAX_LEVEL = 10000;

export interface LevelCost {
  level: number;
  totalXp: number;
  xpToNext: number;
}

/** 从 0 级升到该等级所需的总经验。 */
export function totalXpForLevel(level: number): number {
  if (level <= 0) {
    return 0;
  }
  if (level <= 16) {
    return level * level + 6 * level;
  }
  if (level <= 31) {
    return Math.round(2.5 * level * level - 40.5 * level + 360);
  }
  return Math.round(4.5 * level * level - 162.5 * level + 2220);
}

/** 从该等级升到下一级需要的经验。 */
export function xpToNextLevel(level: number): number {
  if (level <= 15) {
    return 2 * level + 7;
  }
  if (level <= 30) {
    return 5 * level - 38;
  }
  return 9 * level - 158;
}

/** 汇总到达该等级的经验消耗。超出范围时返回 undefined。 */
export function levelCost(level: number): LevelCost | undefined {
  if (!Number.isInteger(level) || level < 0 || level > MAX_LEVEL) {
    return undefined;
  }
  return {
    level,
    totalXp: totalXpForLevel(level),
    xpToNext: xpToNextLevel(level),
  };
}
