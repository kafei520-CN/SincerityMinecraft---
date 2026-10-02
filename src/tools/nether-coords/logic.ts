export interface PlaneCoord {
  x: number;
  z: number;
}

/** 主世界水平坐标换算到下界。 */
export function overworldToNether(x: number, z: number): PlaneCoord {
  return {x: x / 8, z: z / 8};
}

/** 下界水平坐标换算到主世界。 */
export function netherToOverworld(x: number, z: number): PlaneCoord {
  return {x: x * 8, z: z * 8};
}
