import {useState} from 'react';
import {TextField} from '../../components/TextField';
import {avatarUrl, bodyUrl, lookupPlayer, skinPngUrl, type PlayerProfile} from './logic';

/** 查询正版玩家的 UUID 和皮肤。 */
export default function UuidSkinWidget() {
  const [query, setQuery] = useState('');
  const [profile, setProfile] = useState<PlayerProfile | undefined>();
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function search(): Promise<void> {
    setPending(true);
    setError('');
    try {
      setProfile(await lookupPlayer(query));
    } catch (caught) {
      setProfile(undefined);
      setError(caught instanceof Error ? caught.message : '查询失败');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-5">
      <TextField label="玩家名或 UUID" value={query} placeholder="Notch" onChange={setQuery} />
      <button
        type="button"
        className="w-fit rounded-full bg-ink px-5 py-2.5 text-sm text-white disabled:opacity-50"
        disabled={pending}
        onClick={() => void search()}
      >
        {pending ? '查询中' : '查询'}
      </button>
      {error !== '' && <p className="text-sm text-mute">{error}</p>}
      {profile && (
        <div className="grid gap-4 sm:grid-cols-[160px_minmax(0,1fr)]">
          <img className="w-full rounded-2xl bg-paper" alt="" src={bodyUrl(profile.rawId)} />
          <div className="grid content-start gap-3">
            <img className="size-16 rounded-2xl border border-line" alt="" src={avatarUrl(profile.rawId)} />
            <p className="text-xl font-semibold">{profile.name}</p>
            <CopyLine label="UUID" value={profile.id} />
            <CopyLine label="无横线" value={profile.rawId} />
            <a className="text-sm underline" href={skinPngUrl(profile.rawId)}>下载皮肤</a>
            <a className="text-sm underline" href={`/tools/skin-preview/?name=${encodeURIComponent(profile.name)}`}>
              打开 3D 预览
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function CopyLine({label, value}: {label: string; value: string}) {
  return (
    <div>
      <p className="text-sm text-mute">{label}</p>
      <div className="mt-1 flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-xl bg-paper px-3 py-2 text-sm">{value}</code>
        <button
          type="button"
          className="rounded-full border border-line px-3 py-2 text-sm hover:border-ink"
          onClick={() => void navigator.clipboard.writeText(value)}
        >
          复制
        </button>
      </div>
    </div>
  );
}
