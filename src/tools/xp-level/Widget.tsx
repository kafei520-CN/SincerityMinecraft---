import {useState} from 'react';
import {NumberField} from '../../components/NumberField';
import {Result} from '../../components/Result';
import {parseWhole} from '../parse';
import {MAX_LEVEL, levelCost} from './logic';

/** 按 Java 版原版公式查询等级经验。 */
export default function XpLevelWidget() {
  const [raw, setRaw] = useState('');
  const level = parseWhole(raw);
  const cost = level === undefined ? undefined : levelCost(level);
  const note = level !== undefined && cost === undefined
    ? `等级请填 0 到 ${MAX_LEVEL} 的整数。`
    : '';

  return (
    <div className="grid gap-5">
      <NumberField label="等级" value={raw} onChange={setRaw} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Result label="到达该等级的总经验" value={cost ? String(cost.totalXp) : '—'} />
        <Result label="升到下一级" value={cost ? String(cost.xpToNext) : '—'} />
      </div>
      {note !== '' && <p className="text-sm text-mute">{note}</p>}
    </div>
  );
}
