import { DitherOptions, DitherInstance } from './core/types';
import { WebGL2Renderer } from './renderer/webgl2';
import { setupHostCanvas } from './dom/host';

export * from './core/types';
export * from './presets';
export { WebGL2Renderer } from './renderer/webgl2';
export { setupHostCanvas } from './dom/host';
export { parseColor, normalizePalette } from './renderer/color';

const DEFAULT_OPTIONS: Required<Omit<DitherOptions, 'paused'>> & { paused: boolean } = {
  preset: 'aurora',
  colors: ['#101124', '#6155ba', '#efb7d2'],
  dither: 'bayer8',
  pixelSize: 2.0,
  scale: 1.0,
  intensity: 1.0,
  speed: 0.25,
  seed: 42,
  maxDpr: 2.0,
  resolutionScale: 1.0,
  paused: false,
};

export function createDither(
  element: HTMLElement,
  options: DitherOptions = {}
): DitherInstance {
  let opts = { ...DEFAULT_OPTIONS, ...options };

  let paused = opts.paused;
  let rafId: number | null = null;
  let lastTimestamp: number | null = null;
  let effectiveTime = 0;
  let isDestroyed = false;
  let renderer: WebGL2Renderer | null = null;

  // Setup host and canvas
  const hostMount = setupHostCanvas(
    element,
    opts.maxDpr,
    opts.resolutionScale,
    (_w, _h, dpr) => {
      // Re-render immediately on resize if paused
      if (paused && renderer) {
        renderer.render(effectiveTime, dpr);
      }
    }
  );

  renderer = new WebGL2Renderer(
    hostMount.canvas,
    {
      preset: opts.preset,
      colors: opts.colors,
      dither: opts.dither,
      pixelSize: opts.pixelSize,
      scale: opts.scale,
      intensity: opts.intensity,
      speed: opts.speed,
      seed: opts.seed,
      resolutionScale: opts.resolutionScale,
    },
    () => {
      // When context is restored, draw immediate frame
      if (renderer) {
        const dims = hostMount.getDimensions();
        renderer.render(effectiveTime, dims.dpr);
      }
    }
  );

  const tick = (now: number) => {
    if (isDestroyed) return;

    if (lastTimestamp === null) {
      lastTimestamp = now;
    }
    const delta = (now - lastTimestamp) / 1000;
    lastTimestamp = now;

    if (!paused) {
      effectiveTime += delta;
      const dims = hostMount.getDimensions();
      renderer.render(effectiveTime, dims.dpr);
      rafId = requestAnimationFrame(tick);
    } else {
      rafId = null;
    }
  };

  // Initial frame
  const dims = hostMount.getDimensions();
  renderer.render(effectiveTime, dims.dpr);

  if (!paused) {
    rafId = requestAnimationFrame(tick);
  }

  const instance: DitherInstance = {
    element,
    canvas: hostMount.canvas,

    update(newOptions: Partial<DitherOptions>) {
      if (isDestroyed) return;

      opts = { ...opts, ...newOptions };

      if (newOptions.resolutionScale !== undefined) {
        hostMount.setResolutionScale(newOptions.resolutionScale);
      }

      renderer.updateConfig({
        ...(newOptions.preset !== undefined && { preset: newOptions.preset }),
        ...(newOptions.colors !== undefined && { colors: newOptions.colors }),
        ...(newOptions.dither !== undefined && { dither: newOptions.dither }),
        ...(newOptions.pixelSize !== undefined && { pixelSize: newOptions.pixelSize }),
        ...(newOptions.scale !== undefined && { scale: newOptions.scale }),
        ...(newOptions.intensity !== undefined && { intensity: newOptions.intensity }),
        ...(newOptions.speed !== undefined && { speed: newOptions.speed }),
        ...(newOptions.seed !== undefined && { seed: newOptions.seed }),
        ...(newOptions.resolutionScale !== undefined && { resolutionScale: newOptions.resolutionScale }),
      });

      if (newOptions.paused !== undefined) {
        if (newOptions.paused) {
          instance.pause();
        } else {
          instance.resume();
        }
      } else if (paused) {
        // Redraw single static frame with updated options
        const currentDims = hostMount.getDimensions();
        renderer.render(effectiveTime, currentDims.dpr);
      }
    },

    pause() {
      if (paused || isDestroyed) return;
      paused = true;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      lastTimestamp = null;
    },

    resume() {
      if (!paused || isDestroyed) return;
      paused = false;
      lastTimestamp = null;
      rafId = requestAnimationFrame(tick);
    },

    isPaused() {
      return paused;
    },

    simulateContextLoss() {
      renderer.simulateContextLoss();
    },

    restoreContext() {
      renderer.restoreContext();
    },

    destroy() {
      if (isDestroyed) return;
      isDestroyed = true;

      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }

      hostMount.cleanup();
      renderer.dispose();
    },
  };

  return instance;
}
