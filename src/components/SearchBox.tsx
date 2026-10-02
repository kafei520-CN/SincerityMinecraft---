import {useId, useMemo, useState} from 'react';
import {filterTools} from '../tools/catalog';

/** 按登记表即时筛选工具。 */
export default function SearchBox() {
  const [query, setQuery] = useState('');
  const inputId = useId();
  const matches = useMemo(() => filterTools(query), [query]);
  const open = query.trim() !== '';

  return (
    <div className="relative w-full sm:w-72">
      <label className="sr-only" htmlFor={inputId}>搜索工具</label>
      <input
        id={inputId}
        type="search"
        placeholder="搜索工具"
        value={query}
        autoComplete="off"
        className="w-full rounded-full border border-line bg-paper px-4 py-2.5 text-sm text-ink outline-none focus:border-ink"
        onChange={(event) => setQuery(event.target.value)}
      />
      {open && (
        <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-3xl border border-ink bg-white">
          {matches.length === 0 ? (
            <p className="px-4 py-3 text-sm text-mute">没有匹配的工具</p>
          ) : (
            <ul>
              {matches.map((tool) => (
                <li key={tool.id}>
                  <a className="block px-4 py-3 hover:bg-paper" href={`/tools/${tool.id}/`}>
                    <span className="block text-sm font-medium">{tool.name}</span>
                    <span className="mt-1 block text-sm text-mute">{tool.summary}</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
