'use client';

import { useEffect, useRef, useState } from 'react';
import { ToolGlyph } from '../src/components/ToolGlyph';
import { createRenderer } from './renderer';

export type CardTool = {
  id: string;
  name: string;
  category: string;
};

export function Example({tools = []}: {tools?: CardTool[]}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let mounted = true;
    const renderer = createRenderer(canvas);
    void renderer.ready.catch((cause: unknown) => {
      if (!mounted) return;
      console.error('Holographic card initialization failed:', cause);
      setError(true);
    });
    return () => { mounted = false; renderer.dispose(); };
  }, []);

  return (
    <div className="relative flex h-full min-h-full w-full flex-col bg-[#090a0c] text-white">
      <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" aria-hidden="true" />
      <nav aria-label="工具" className="relative z-10 flex flex-1 flex-col justify-center px-5 py-6 sm:px-7">
        <ol className="flex w-full flex-col">
          {tools.map((tool) => (
            <li key={tool.id} className="border-b border-white/15 last:border-b-0">
              <a href={`/tools/${tool.id}/`} className="group flex items-center gap-3 py-2.5">
                <span className="grid size-9 shrink-0 place-items-center rounded-full border border-white/30 text-white/85">
                  <ToolGlyph id={tool.id} className="size-4" />
                </span>
                <span className="min-w-0 truncate text-lg font-semibold tracking-tight group-hover:underline">{tool.name}</span>
                <span className="ml-auto shrink-0 text-sm text-white/60">{tool.category}</span>
              </a>
            </li>
          ))}
        </ol>
      </nav>
      {error && (
        <p className="pointer-events-none absolute inset-x-0 bottom-4 text-center font-mono text-[10px] tracking-[0.16em] text-white/50">
          这张卡需要支持 WebGPU 的浏览器。
        </p>
      )}
    </div>
  );
}

export default Example;
