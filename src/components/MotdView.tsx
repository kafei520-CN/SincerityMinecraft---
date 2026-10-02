import {useEffect, useState} from 'react';
import {parseMotd, type MotdStyle} from '../tools/motd/logic';

interface MotdViewProps {
  text: string;
}

/** 按原版颜色码预览公告。 */
export function MotdView({text}: MotdViewProps) {
  const lines = text.split('\n');
  return (
    <div className="overflow-x-auto rounded-2xl bg-[#1d1d1d] px-4 py-3 font-mono text-sm leading-6">
      {lines.map((line, index) => (
        <p key={index} className="min-h-6 whitespace-pre">
          {parseMotd(line).map((span, spanIndex) => (
            <MotdSpanView key={spanIndex} text={span.text} style={span.style} />
          ))}
        </p>
      ))}
    </div>
  );
}

function MotdSpanView({text, style}: {text: string; style: MotdStyle}) {
  const className = [
    style.bold ? 'font-bold' : '',
    style.italic ? 'italic' : '',
    style.underline ? 'underline' : '',
    style.strike ? 'line-through' : '',
  ].filter(Boolean).join(' ');
  if (style.obfuscated) {
    return <Obfuscated text={text} className={className} color={style.color} />;
  }
  return (
    <span className={className} style={{color: style.color}}>
      {text}
    </span>
  );
}

function Obfuscated({text, className, color}: {text: string; className: string; color: string}) {
  const [shown, setShown] = useState(text);

  useEffect(() => {
    const glyphs = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const timer = window.setInterval(() => {
      setShown(Array.from(text, () => glyphs[Math.floor(Math.random() * glyphs.length)] ?? 'A').join(''));
    }, 80);
    return () => window.clearInterval(timer);
  }, [text]);

  return (
    <span className={className} style={{color}}>
      {shown}
    </span>
  );
}
