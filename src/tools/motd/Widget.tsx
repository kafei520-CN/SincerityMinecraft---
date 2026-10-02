import {useState} from 'react';
import {MotdView} from '../../components/MotdView';
import {MOTD_COLORS} from './logic';

const FORMATS = [
  {code: 'l', name: '粗体'},
  {code: 'o', name: '斜体'},
  {code: 'n', name: '下划线'},
  {code: 'm', name: '删除线'},
  {code: 'k', name: '乱码'},
  {code: 'r', name: '重置'},
];

/** 拼服务器 MOTD，并按原版颜色预览。 */
export default function MotdWidget() {
  const [text, setText] = useState('§fSincerityMinecraft\n§7欢迎回来');
  const [copied, setCopied] = useState(false);

  function insert(code: string): void {
    setText((current) => `${current}§${code}`);
    setCopied(false);
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap gap-2">
        {MOTD_COLORS.map((color) => (
          <button
            key={color.code}
            type="button"
            aria-label={color.name}
            className="size-8 rounded-full border border-line"
            style={{background: color.hex}}
            onClick={() => insert(color.code)}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {FORMATS.map((format) => (
          <button
            key={format.code}
            type="button"
            className="rounded-full border border-line px-3 py-1.5 text-sm hover:border-ink"
            onClick={() => insert(format.code)}
          >
            {format.name}
          </button>
        ))}
        <button
          type="button"
          className="rounded-full border border-line px-3 py-1.5 text-sm hover:border-ink"
          onClick={() => setText((current) => `${current}\n`)}
        >
          换行
        </button>
      </div>
      <textarea
        className="min-h-28 w-full rounded-2xl border border-line px-4 py-3 font-mono text-sm outline-none focus:border-ink"
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          setCopied(false);
        }}
      />
      <MotdView text={text} />
      <div className="flex flex-wrap items-center gap-3">
        <code className="min-w-0 flex-1 truncate rounded-xl bg-paper px-3 py-2 text-sm">{text}</code>
        <button
          type="button"
          className="rounded-full bg-ink px-4 py-2 text-sm text-white"
          onClick={() => {
            void navigator.clipboard.writeText(text);
            setCopied(true);
          }}
        >
          {copied ? '已复制' : '复制'}
        </button>
      </div>
    </div>
  );
}
