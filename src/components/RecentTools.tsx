import {useEffect, useState} from 'react';
import {readRecent, recentEventName} from '../lib/storage';
import {toolById} from '../tools/catalog';
import {ToolCapsule} from './ToolCapsule';

/** 最近打开的工具。没有记录时不占位。 */
export default function RecentTools() {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    const sync = () => setIds(readRecent());
    sync();
    window.addEventListener(recentEventName, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(recentEventName, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const items = ids
    .map((id) => toolById(id))
    .filter((tool) => tool !== undefined);
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="mb-8">
      <h2 className="text-sm text-mute">最近使用</h2>
      <ul className="mt-3 flex flex-wrap gap-3">
        {items.map((tool) => (
          <li key={tool.id}>
            <ToolCapsule id={tool.id} name={tool.name} summary={tool.summary} />
          </li>
        ))}
      </ul>
    </section>
  );
}
