import {useState} from 'react';
import {NumberField} from '../../components/NumberField';
import {Result} from '../../components/Result';
import {parseWhole} from '../parse';
import {clockFromDayTick} from './logic';

/** 一天中的游戏刻换成钟面时间。 */
export default function DayClockWidget() {
  const [raw, setRaw] = useState('');
  const tick = parseWhole(raw);
  const clock = tick === undefined ? undefined : clockFromDayTick(tick);

  return (
    <div className="grid gap-5">
      <NumberField label="一天中的游戏刻" value={raw} onChange={setRaw} />
      <div className="grid gap-3 sm:grid-cols-3">
        <Result label="钟面" value={clock ? clock.clock : '—'} />
        <Result label="昼夜" value={clock ? clock.phase : '—'} />
        <Result label="当日刻数" value={clock ? String(clock.tick) : '—'} />
      </div>
    </div>
  );
}
