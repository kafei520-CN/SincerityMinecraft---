export const TICKS_PER_SECOND = 20;

/** 游戏刻换成秒。 */
export function ticksToSeconds(ticks: number): number {
  return ticks / TICKS_PER_SECOND;
}

/** 秒换成游戏刻。 */
export function secondsToTicks(seconds: number): number {
  return seconds * TICKS_PER_SECOND;
}

/** 分钟换成游戏刻。 */
export function minutesToTicks(minutes: number): number {
  return minutes * 60 * TICKS_PER_SECOND;
}
