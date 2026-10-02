import {ToolGlyph} from './ToolGlyph';

interface ToolCapsuleProps {
  id: string;
  name: string;
  summary?: string;
}

/** 线框图标加胶囊底的工具入口。 */
export function ToolCapsule({id, name, summary}: ToolCapsuleProps) {
  return (
    <a
      href={`/tools/${id}/`}
      title={summary}
      className="inline-flex items-center gap-2 rounded-full border border-line bg-white py-1.5 pr-4 pl-3 text-sm font-medium text-ink hover:border-ink"
    >
      <ToolGlyph id={id} />
      {name}
    </a>
  );
}
