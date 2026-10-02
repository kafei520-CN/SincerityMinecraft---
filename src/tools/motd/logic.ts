export interface MotdStyle {
  color: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  obfuscated: boolean;
}

export interface MotdSpan {
  text: string;
  style: MotdStyle;
}

export const MOTD_COLORS: {code: string; name: string; hex: string}[] = [
  {code: '0', name: '黑', hex: '#000000'},
  {code: '1', name: '深蓝', hex: '#0000aa'},
  {code: '2', name: '深绿', hex: '#00aa00'},
  {code: '3', name: '深青', hex: '#00aaaa'},
  {code: '4', name: '深红', hex: '#aa0000'},
  {code: '5', name: '紫', hex: '#aa00aa'},
  {code: '6', name: '金', hex: '#ffaa00'},
  {code: '7', name: '灰', hex: '#aaaaaa'},
  {code: '8', name: '深灰', hex: '#555555'},
  {code: '9', name: '蓝', hex: '#5555ff'},
  {code: 'a', name: '绿', hex: '#55ff55'},
  {code: 'b', name: '青', hex: '#55ffff'},
  {code: 'c', name: '红', hex: '#ff5555'},
  {code: 'd', name: '粉', hex: '#ff55ff'},
  {code: 'e', name: '黄', hex: '#ffff55'},
  {code: 'f', name: '白', hex: '#ffffff'},
];

const COLOR_HEX = Object.fromEntries(MOTD_COLORS.map((item) => [item.code, item.hex]));

const DEFAULT_STYLE: MotdStyle = {
  color: '#ffffff',
  bold: false,
  italic: false,
  underline: false,
  strike: false,
  obfuscated: false,
};

/** 把服务器返回的错误编码 § 还原成分节号。 */
export function normalizeSectionSigns(raw: string): string {
  return raw.replaceAll('Â§', '§').replaceAll('\u00c2\u00a7', '§');
}

/** 把 § 颜色码拆成可绘制的片段。 */
export function parseMotd(raw: string): MotdSpan[] {
  const text = normalizeSectionSigns(raw);
  const spans: MotdSpan[] = [];
  let style = {...DEFAULT_STYLE};
  let buffer = '';

  function flush(): void {
    if (buffer === '') {
      return;
    }
    spans.push({text: buffer, style: {...style}});
    buffer = '';
  }

  for (let index = 0; index < text.length; index++) {
    const char = text[index] ?? '';
    const next = text[index + 1]?.toLowerCase() ?? '';
    const isCode = (char === '§' || char === '&') && /[0-9a-fk-or]/.test(next);
    if (!isCode) {
      buffer += char;
      continue;
    }
    flush();
    if (COLOR_HEX[next]) {
      style = {...DEFAULT_STYLE, color: COLOR_HEX[next]};
    } else if (next === 'l') {
      style = {...style, bold: true};
    } else if (next === 'o') {
      style = {...style, italic: true};
    } else if (next === 'n') {
      style = {...style, underline: true};
    } else if (next === 'm') {
      style = {...style, strike: true};
    } else if (next === 'k') {
      style = {...style, obfuscated: true};
    } else if (next === 'r') {
      style = {...DEFAULT_STYLE};
    }
    index += 1;
  }
  flush();
  return spans;
}
