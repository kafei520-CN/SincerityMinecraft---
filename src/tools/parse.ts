/** 把输入解析成有限数字。空字符串和非法输入返回 undefined。 */
export function parseFinite(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (trimmed === '') {
    return undefined;
  }
  const value = Number(trimmed);
  if (!Number.isFinite(value)) {
    return undefined;
  }
  return value;
}

/** 解析非负整数。带小数点或符号时返回 undefined。 */
export function parseWhole(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) {
    return undefined;
  }
  const value = Number(trimmed);
  if (!Number.isFinite(value)) {
    return undefined;
  }
  return value;
}

/** 最多保留 3 位小数，并去掉末尾的 0。 */
export function formatMeasure(value: number): string {
  const rounded = Math.round(value * 1000) / 1000;
  return String(rounded);
}
