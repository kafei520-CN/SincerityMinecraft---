import { effect, type Gpu, type Target } from 'vgpu';
import fragment from './shader.wgsl?raw';

/** Shared by the live canvas and deterministic gallery thumbnails. */
export function createScene(gpu: Gpu, output: Target) {
  const shader = effect(gpu, fragment, {
    label: 'holographic-card',
    set: {
      params: { resolution: output.size, tilt: [0, 0], pointer: [0.2, -0.25], hover: 0 },
    },
  });
  return shader;
}
