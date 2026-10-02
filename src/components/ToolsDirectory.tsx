import type {Category, ToolEntry} from '../tools/catalog';
import {ToolCapsule} from './ToolCapsule';

interface ToolsDirectoryProps {
  categories: Category[];
  tools: ToolEntry[];
  current: string;
}

/** 按这次请求的分类渲染目录。点分类会再向服务器要一页。 */
export default function ToolsDirectory({categories, tools, current}: ToolsDirectoryProps) {
  const groups = Array.isArray(categories) ? categories : [];
  const catalog = Array.isArray(tools) ? tools : [];
  const selected = groups.some((category) => category.id === current) ? current : 'all';
  const sections = selected === 'all'
    ? groups
    : groups.filter((category) => category.id === selected);

  return (
    <div className="md:grid md:grid-cols-[11rem_minmax(0,1fr)] md:items-start md:gap-12">
      <nav aria-label="分类" className="flex gap-2 overflow-x-auto md:sticky md:top-24 md:flex-col md:self-start">
        <CategoryLink id="all" name="全部" active={selected === 'all'} />
        {groups.map((category) => (
          <CategoryLink
            key={category.id}
            id={category.id}
            name={category.name}
            active={selected === category.id}
          />
        ))}
      </nav>
      <div className="mt-8 grid gap-8 md:mt-0">
        {sections.map((category) => (
          <section key={category.id}>
            <h2 className="text-sm text-mute">{category.name}</h2>
            <ul className="mt-3 flex flex-wrap gap-3">
              {catalog.filter((tool) => tool.categoryId === category.id).map((tool) => (
                <li key={tool.id}>
                  <ToolCapsule id={tool.id} name={tool.name} summary={tool.summary} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

function CategoryLink({id, name, active}: {id: string; name: string; active: boolean}) {
  const href = id === 'all' ? '/tools/' : `/tools/?category=${id}`;
  const tone = active
    ? 'border-ink bg-ink text-white'
    : 'border-line bg-white text-ink hover:border-ink';
  return (
    <a
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`shrink-0 rounded-full border px-4 py-2 text-left text-sm md:w-full ${tone}`}
    >
      {name}
    </a>
  );
}
