import {useState} from 'react';
import {ModeButton} from '../../components/ModeButton';
import {MotdView} from '../../components/MotdView';
import {TextField} from '../../components/TextField';
import {fetchServerStatus, type ServerEdition, type ServerStatus} from './logic';

/** 查询 Java 或基岩服务器状态。 */
export default function ServerStatusWidget() {
  const [edition, setEdition] = useState<ServerEdition>('java');
  const [address, setAddress] = useState('');
  const [status, setStatus] = useState<ServerStatus | undefined>();
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function search(): Promise<void> {
    setPending(true);
    setError('');
    try {
      setStatus(await fetchServerStatus(edition, address));
    } catch (caught) {
      setStatus(undefined);
      setError(caught instanceof Error ? caught.message : '查询失败');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap gap-2" role="group" aria-label="服务器版本">
        <ModeButton pressed={edition === 'java'} onClick={() => setEdition('java')}>Java</ModeButton>
        <ModeButton pressed={edition === 'bedrock'} onClick={() => setEdition('bedrock')}>基岩版</ModeButton>
      </div>
      <TextField
        label="地址"
        value={address}
        placeholder={edition === 'java' ? 'play.example.com' : 'play.example.com:19132'}
        onChange={setAddress}
      />
      <button
        type="button"
        className="w-fit rounded-full bg-ink px-5 py-2.5 text-sm text-white disabled:opacity-50"
        disabled={pending}
        onClick={() => void search()}
      >
        {pending ? '查询中' : '查询'}
      </button>
      {error !== '' && <p className="text-sm text-mute">{error}</p>}
      {status && (
        <div className="grid gap-4">
          <div className="flex items-center gap-3">
            {status.icon !== '' && <img className="size-16 rounded-2xl" alt="" src={status.icon} />}
            <div>
              <p className="text-xl font-semibold">{status.online ? '在线' : '离线'}</p>
              <p className="text-sm text-mute">{status.host}{status.port ? `:${status.port}` : ''}</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Info label="版本" value={status.version || '—'} />
            <Info label="人数" value={status.online ? `${status.onlinePlayers} / ${status.maxPlayers}` : '—'} />
          </div>
          {status.motd !== '' && <MotdView text={status.motd} />}
        </div>
      )}
    </div>
  );
}

function Info({label, value}: {label: string; value: string}) {
  return (
    <div className="rounded-2xl bg-paper px-4 py-3">
      <p className="text-sm text-mute">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}
