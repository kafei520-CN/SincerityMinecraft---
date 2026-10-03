import {useEffect, useState} from 'react';

interface Visitor {
  ip: string;
  path: string;
  rendering: boolean;
  ua: string;
  seen: number;
}

export default function AdminDash() {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [renders, setRenders] = useState<Visitor[]>([]);
  const [gpu, setGpu] = useState({browser: false, jobs: 0});

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const response = await fetch('/api/admin/status/');
      if (!response.ok || !alive) {
        return;
      }
      const data = await response.json() as {visitors: Visitor[]; renders: Visitor[]; gpu?: {browser: boolean; jobs: number}};
      setVisitors(data.visitors ?? []);
      setRenders(data.renders ?? []);
      setGpu(data.gpu ?? {browser: false, jobs: 0});
    };
    void load();
    const timer = window.setInterval(() => void load(), 3000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <section className="rounded-3xl border border-line bg-white p-5">
        <h2 className="text-lg font-semibold">渲染进程</h2>
        <p className="mt-1 text-sm text-mute">
          页面会话 {renders.length} 个。服务器 Edge {gpu.browser ? '在跑' : '未开'}，排队 {gpu.jobs} 张。
        </p>
        <Table rows={renders} />
      </section>
      <section className="rounded-3xl border border-line bg-white p-5">
        <h2 className="text-lg font-semibold">在线 IP</h2>
        <p className="mt-1 text-sm text-mute">最近 45 秒内有心跳的访问。</p>
        <Table rows={visitors} />
      </section>
    </div>
  );
}

function Table({rows}: {rows: Visitor[]}) {
  if (rows.length === 0) {
    return <p className="mt-4 text-sm text-mute">现在没有人。</p>;
  }
  return (
    <ul className="mt-4 divide-y divide-line text-sm">
      {rows.map((row) => (
        <li key={`${row.ip}-${row.seen}`} className="flex flex-col gap-1 py-3">
          <span className="font-medium">{row.ip}</span>
          <span className="text-mute">{row.path}{row.rendering ? ' · 渲染中' : ''}</span>
        </li>
      ))}
    </ul>
  );
}
