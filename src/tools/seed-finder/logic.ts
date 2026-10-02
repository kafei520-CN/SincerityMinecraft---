const LONG_MIN = -9223372036854775808n;
const LONG_MAX = 9223372036854775807n;

/** Java 文字种子使用的 String.hashCode，结果是有符号 32 位。 */
export function javaStringHash(text: string): number {
  let hash = 0;
  for (let index = 0; index < text.length; index++) {
    hash = Math.imul(hash, 31) + text.charCodeAt(index) | 0;
  }
  return hash;
}

/**
 * 折成 Java 版世界种子。
 * 纯数字且在 long 范围内就原样使用，否则用文字哈希。
 */
export function parseJavaSeed(raw: string): bigint {
  const text = raw.trim();
  if (/^-?\d+$/.test(text)) {
    try {
      const numeric = BigInt(text);
      if (numeric >= LONG_MIN && numeric <= LONG_MAX) {
        return numeric;
      }
    } catch {
      return BigInt(javaStringHash(text));
    }
  }
  return BigInt(javaStringHash(text));
}

/** 把有符号 64 位种子拆成 wasm 用的高低 32 位。 */
export function splitSeed(seed: bigint): {lo: number; hi: number} {
  const unsigned = BigInt.asUintN(64, seed);
  return {
    lo: Number(unsigned & 0xffffffffn),
    hi: Number((unsigned >> 32n) & 0xffffffffn),
  };
}

export function formatSeed(seed: bigint): string {
  return seed.toString();
}
