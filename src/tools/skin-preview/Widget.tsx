import {useEffect, useRef, useState} from 'react';
import type {SkinViewer, WalkingAnimation} from 'skinview3d';
import {ModeButton} from '../../components/ModeButton';
import {TextField} from '../../components/TextField';
import {lookupPlayer, skinPngUrl} from '../uuid-skin/logic';

type ArmModel = 'default' | 'slim';

/** 立体预览皮肤，可切换粗手臂和细手臂。 */
export default function SkinPreviewWidget() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewerRef = useRef<SkinViewer | undefined>(undefined);
  const walkRef = useRef<typeof WalkingAnimation | undefined>(undefined);
  const [name, setName] = useState('');
  const [model, setModel] = useState<ArmModel>('default');
  const [walking, setWalking] = useState(true);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const sourceRef = useRef<string>('');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return undefined;
    }
    let disposed = false;
    void import('skinview3d').then(({SkinViewer, WalkingAnimation}) => {
      if (disposed) {
        return;
      }
      const viewer = new SkinViewer({canvas, width: canvas.clientWidth || 640, height: 420});
      viewer.background = '#f4f4f4';
      viewer.autoRotate = true;
      viewer.zoom = 0.85;
      viewer.animation = new WalkingAnimation();
      viewerRef.current = viewer;
      walkRef.current = WalkingAnimation;
      const params = new URLSearchParams(window.location.search);
      const initial = params.get('name');
      if (initial) {
        setName(initial);
        void loadName(initial, 'default');
      }
    });
    return () => {
      disposed = true;
      viewerRef.current?.dispose();
      viewerRef.current = undefined;
    };
  }, []);

  useEffect(() => {
    const viewer = viewerRef.current;
    const Walking = walkRef.current;
    if (!viewer || !Walking) {
      return;
    }
    viewer.animation = walking ? new Walking() : null;
  }, [walking]);

  async function loadName(player: string, arm: ArmModel): Promise<void> {
    const viewer = viewerRef.current;
    if (!viewer) {
      return;
    }
    setPending(true);
    setError('');
    try {
      const profile = await lookupPlayer(player);
      const url = skinPngUrl(profile.rawId);
      sourceRef.current = url;
      await viewer.loadSkin(url, {model: arm});
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '皮肤加载失败');
    } finally {
      setPending(false);
    }
  }

  async function loadFile(file: File, arm: ArmModel): Promise<void> {
    const viewer = viewerRef.current;
    if (!viewer) {
      return;
    }
    const url = URL.createObjectURL(file);
    sourceRef.current = url;
    setError('');
    await viewer.loadSkin(url, {model: arm});
  }

  function switchModel(arm: ArmModel): void {
    setModel(arm);
    const viewer = viewerRef.current;
    if (viewer && sourceRef.current !== '') {
      void viewer.loadSkin(sourceRef.current, {model: arm});
    }
  }

  return (
    <div className="grid gap-5">
      <TextField label="玩家名" value={name} placeholder="Notch" onChange={setName} />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-full bg-ink px-4 py-2 text-sm text-white disabled:opacity-50"
          disabled={pending}
          onClick={() => void loadName(name, model)}
        >
          {pending ? '加载中' : '按名字加载'}
        </button>
        <label className="rounded-full border border-line px-4 py-2 text-sm hover:border-ink">
          上传皮肤
          <input
            className="sr-only"
            type="file"
            accept="image/png"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void loadFile(file, model);
              }
            }}
          />
        </label>
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="手臂">
        <ModeButton pressed={model === 'default'} onClick={() => switchModel('default')}>粗手臂</ModeButton>
        <ModeButton pressed={model === 'slim'} onClick={() => switchModel('slim')}>细手臂</ModeButton>
        <ModeButton pressed={walking} onClick={() => setWalking((value) => !value)}>行走</ModeButton>
      </div>
      {error !== '' && <p className="text-sm text-mute">{error}</p>}
      <canvas ref={canvasRef} className="h-[420px] w-full rounded-3xl bg-paper" />
    </div>
  );
}

