export const TICKS_PER_DAY = 24000;
const MINUTES_PER_DAY = 24 * 60;
const DAWN_OFFSET_MINUTES = 6 * 60;
const NIGHT_START_TICK = 13000;

export interface DayClock {
  tick: number;
  clock: string;
  phase: string;
}

/** 把一天中的游戏刻收成 0 到 23999。 */
export function wrapDayTick(tick: number): number {
  const rounded = Math.round(tick);
  return ((rounded % TICKS_PER_DAY) + TICKS_PER_DAY) % TICKS_PER_DAY;
}

/**
 * 第 0 刻对应清晨 6:00。
 * 13000 刻起算夜晚。
 */
export function clockFromDayTick(tick: number): DayClock {
  const wrapped = wrapDayTick(tick);
  const elapsedMinutes = Math.floor((wrapped / TICKS_PER_DAY) * MINUTES_PER_DAY);
  const clockMinutes = (elapsedMinutes + DAWN_OFFSET_MINUTES) % MINUTES_PER_DAY;
  const hour = Math.floor(clockMinutes / 60);
  const minute = clockMinutes % 60;
  const hourText = String(hour).padStart(2, '0');
  const minuteText = String(minute).padStart(2, '0');
  return {
    tick: wrapped,
    clock: `${hourText}:${minuteText}`,
    phase: wrapped < NIGHT_START_TICK ? '白天' : '夜晚',
  };
}
