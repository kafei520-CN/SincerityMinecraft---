import { clock, frameLoop, init, surface, type Gpu } from 'vgpu';
import { createScene } from './scene';

export function createRenderer(canvas: HTMLCanvasElement) {
  let disposed = false;
  let gpu: Gpu | undefined;
  let removeInput = () => {};

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    removeInput();
    gpu?.dispose();
  };

  const ready = (async () => {
    const context = await init();
    if (disposed) { context.dispose(); return; }
    gpu = context;
    const output = surface(context, canvas, { dpr: [1, 2] });
    const shader = createScene(context, output);
    await shader.compile({ colors: [output.format] });
    if (disposed) return;

    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let targetHover = 0;
    let pointerX = 0;
    let pointerY = 0;
    let tiltX = 0;
    let tiltY = 0;
    let hover = 0;
    let lightX = 0.2;
    let lightY = -0.25;
    const input = canvas.parentElement ?? canvas;
    const move = (event: PointerEvent) => {
      if (!event.isPrimary) return;
      const rect = canvas.getBoundingClientRect();
      const scale = Math.min(rect.height, rect.width * 1.35);
      const halfX = rect.width / Math.max(1, scale) * 1.25;
      const halfY = rect.height / Math.max(1, scale) * 1.25;
      // Pointer is in the same -1..1 space as the full-panel card.
      pointerX = ((event.clientX - rect.left) - rect.width / 2) / Math.max(1, scale) * 2.5 / halfX;
      pointerY = ((event.clientY - rect.top) - rect.height / 2) / Math.max(1, scale) * 2.5 / halfY;
      const distanceX = Math.max(0, Math.abs(pointerX) - 1) * scale * halfX / 2.5;
      const distanceY = Math.max(0, Math.abs(pointerY) - 1) * scale * halfY / 2.5;
      const approachDistance = Math.max(1, scale) * 1.28 / 2.5;
      const proximity = Math.max(0, 1 - Math.hypot(distanceX, distanceY) / approachDistance);
      targetHover = proximity * proximity * (3 - 2 * proximity);
    };
    const leave = () => { targetHover = 0; };
    const up = (event: PointerEvent) => { if (event.pointerType !== 'mouse') leave(); };
    input.addEventListener('pointermove', move, { passive: true });
    input.addEventListener('pointerdown', move, { passive: true });
    input.addEventListener('pointerleave', leave);
    input.addEventListener('pointercancel', leave);
    input.addEventListener('pointerup', up);
    const unsubscribeResize = output.onResize(() => {
      shader.set({ params: { resolution: output.size } });
    });
    removeInput = () => {
      input.removeEventListener('pointermove', move);
      input.removeEventListener('pointerdown', move);
      input.removeEventListener('pointerleave', leave);
      input.removeEventListener('pointercancel', leave);
      input.removeEventListener('pointerup', up);
      unsubscribeResize();
    };

    const time = clock(context);
    frameLoop(context, (currentFrame) => {
      const targetX = motion.matches ? 0 : Math.max(-1, Math.min(1, pointerX)) * 0.16 * targetHover;
      const targetY = motion.matches ? 0 : -Math.max(-1, Math.min(1, pointerY)) * 0.12 * targetHover;
      const blend = motion.matches ? 1 : 1 - Math.exp(-10 * Math.min(time.deltaTime, 0.1));
      tiltX += (targetX - tiltX) * blend;
      tiltY += (targetY - tiltY) * blend;
      hover += (targetHover - hover) * blend;
      if (targetHover > 0) {
        lightX += (pointerX - lightX) * blend;
        lightY += (pointerY - lightY) * blend;
      }
      shader.set({ params: { tilt: [tiltX, tiltY], pointer: [lightX, lightY], hover } });
      currentFrame.pass(output, shader);
    }, { fps: 60 });
  })().catch((error: unknown) => {
    if (disposed) return;
    dispose();
    throw error;
  });

  return { ready, dispose };
}
