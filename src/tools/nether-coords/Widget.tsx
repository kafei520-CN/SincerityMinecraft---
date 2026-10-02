import {useState} from 'react';
import {ModeButton} from '../../components/ModeButton';
import {NumberField} from '../../components/NumberField';
import {Result} from '../../components/Result';
import {formatMeasure, parseFinite} from '../parse';
import {netherToOverworld, overworldToNether} from './logic';

type Direction = 'to-nether' | 'to-overworld';

/** 主世界与下界的水平坐标换算。 */
export default function NetherCoordsWidget() {
  const [direction, setDirection] = useState<Direction>('to-nether');
  const [x, setX] = useState('');
  const [z, setZ] = useState('');
  const parsedX = parseFinite(x);
  const parsedZ = parseFinite(z);
  const result = parsedX !== undefined && parsedZ !== undefined
    ? (direction === 'to-nether'
      ? overworldToNether(parsedX, parsedZ)
      : netherToOverworld(parsedX, parsedZ))
    : undefined;
  const target = direction === 'to-nether' ? '下界' : '主世界';

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap gap-2" role="group" aria-label="换算方向">
        <ModeButton
          pressed={direction === 'to-nether'}
          onClick={() => setDirection('to-nether')}
        >
          主世界到下界
        </ModeButton>
        <ModeButton
          pressed={direction === 'to-overworld'}
          onClick={() => setDirection('to-overworld')}
        >
          下界到主世界
        </ModeButton>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField label="X" value={x} onChange={setX} />
        <NumberField label="Z" value={z} onChange={setZ} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Result label={`${target} X`} value={result ? formatMeasure(result.x) : '—'} />
        <Result label={`${target} Z`} value={result ? formatMeasure(result.z) : '—'} />
      </div>
    </div>
  );
}
