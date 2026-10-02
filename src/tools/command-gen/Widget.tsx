import {useMemo, useState, type ReactNode} from 'react';
import {TextField} from '../../components/TextField';
import {buildCommand, commandKinds, commandVersions, type CommandKind, type CommandVersion} from './logic';

/** 按版本生成常用指令。 */
export default function CommandWidget() {
  const [version, setVersion] = useState<CommandVersion>('java-1.20.5');
  const [kind, setKind] = useState<CommandKind>('give');
  const [target, setTarget] = useState('');
  const [item, setItem] = useState('diamond');
  const [count, setCount] = useState('1');
  const [entity, setEntity] = useState('zombie');
  const [x, setX] = useState('~');
  const [y, setY] = useState('~');
  const [z, setZ] = useState('~');
  const [gamemode, setGamemode] = useState('creative');
  const [effect, setEffect] = useState('speed');
  const [seconds, setSeconds] = useState('30');
  const [amplifier, setAmplifier] = useState('0');
  const [time, setTime] = useState('day');
  const [weather, setWeather] = useState('clear');
  const [copied, setCopied] = useState(false);

  const built = useMemo(() => buildCommand({
    version, kind, target, item, count, entity, x, y, z, gamemode, effect, seconds, amplifier, time, weather,
  }), [version, kind, target, item, count, entity, x, y, z, gamemode, effect, seconds, amplifier, time, weather]);

  return (
    <div className="grid gap-5">
      <Select label="版本" value={version} onChange={(value) => setVersion(value as CommandVersion)}>
        {commandVersions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
      </Select>
      <Select label="指令" value={kind} onChange={(value) => setKind(value as CommandKind)}>
        {commandKinds.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
      </Select>
      {kind !== 'time' && kind !== 'weather' && kind !== 'summon' && (
        <TextField label="目标" value={target} placeholder="@s" onChange={setTarget} />
      )}
      {kind === 'give' && (
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="物品 ID" value={item} onChange={setItem} />
          <TextField label="数量" value={count} onChange={setCount} />
        </div>
      )}
      {kind === 'summon' && <TextField label="实体 ID" value={entity} onChange={setEntity} />}
      {(kind === 'summon' || kind === 'tp') && (
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField label="X" value={x} onChange={setX} />
          <TextField label="Y" value={y} onChange={setY} />
          <TextField label="Z" value={z} onChange={setZ} />
        </div>
      )}
      {kind === 'gamemode' && (
        <Select label="模式" value={gamemode} onChange={setGamemode}>
          <option value="survival">生存</option>
          <option value="creative">创造</option>
          <option value="adventure">冒险</option>
          <option value="spectator">旁观</option>
        </Select>
      )}
      {kind === 'effect' && (
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField label="效果 ID" value={effect} onChange={setEffect} />
          <TextField label="秒" value={seconds} onChange={setSeconds} />
          <TextField label="等级加成" value={amplifier} onChange={setAmplifier} />
        </div>
      )}
      {kind === 'time' && (
        <Select label="时间" value={time} onChange={setTime}>
          <option value="day">白天</option>
          <option value="noon">正午</option>
          <option value="night">夜晚</option>
          <option value="midnight">午夜</option>
        </Select>
      )}
      {kind === 'weather' && (
        <Select label="天气" value={weather} onChange={setWeather}>
          <option value="clear">晴</option>
          <option value="rain">雨</option>
          <option value="thunder">雷暴</option>
        </Select>
      )}
      <p className="text-sm text-mute">{built.note}</p>
      <div className="flex flex-wrap items-center gap-3">
        <code className="min-w-0 flex-1 overflow-x-auto rounded-xl bg-paper px-3 py-2 text-sm">{built.command}</code>
        <button
          type="button"
          className="rounded-full bg-ink px-4 py-2 text-sm text-white"
          onClick={() => {
            void navigator.clipboard.writeText(built.command);
            setCopied(true);
          }}
        >
          {copied ? '已复制' : '复制'}
        </button>
      </div>
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-mute">{label}</span>
      <select
        className="w-full rounded-2xl border border-line bg-white px-4 py-3 outline-none focus:border-ink"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {children}
      </select>
    </label>
  );
}
