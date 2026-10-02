import {useState} from 'react';
import {NumberField} from '../../components/NumberField';
import {formatMeasure, parseFinite} from '../parse';
import {minutesToTicks, secondsToTicks, ticksToSeconds} from './logic';

/** 游戏刻、秒、分钟互相同步。正在输入的那一格保持原样。 */
export default function TickTimeWidget() {
  const [ticks, setTicks] = useState('');
  const [seconds, setSeconds] = useState('');
  const [minutes, setMinutes] = useState('');

  function onTicks(value: string) {
    setTicks(value);
    const parsed = parseFinite(value);
    if (parsed === undefined) {
      setSeconds('');
      setMinutes('');
      return;
    }
    const nextSeconds = ticksToSeconds(parsed);
    setSeconds(formatMeasure(nextSeconds));
    setMinutes(formatMeasure(nextSeconds / 60));
  }

  function onSeconds(value: string) {
    setSeconds(value);
    const parsed = parseFinite(value);
    if (parsed === undefined) {
      setTicks('');
      setMinutes('');
      return;
    }
    setTicks(formatMeasure(secondsToTicks(parsed)));
    setMinutes(formatMeasure(parsed / 60));
  }

  function onMinutes(value: string) {
    setMinutes(value);
    const parsed = parseFinite(value);
    if (parsed === undefined) {
      setTicks('');
      setSeconds('');
      return;
    }
    setTicks(formatMeasure(minutesToTicks(parsed)));
    setSeconds(formatMeasure(parsed * 60));
  }

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <NumberField label="游戏刻" value={ticks} onChange={onTicks} />
      <NumberField label="秒" value={seconds} onChange={onSeconds} />
      <NumberField label="分钟" value={minutes} onChange={onMinutes} />
    </div>
  );
}
