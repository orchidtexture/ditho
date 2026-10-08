import { DitherOptions, DitherInstance } from './core/types';
import { WebGL2Renderer } from './renderer/webgl2';
import { setupHostCanvas } from './dom/host';

export * from './core/types';
export { WebGL2Renderer } from './renderer/webgl2';
export { setupHostCanvas } from './dom/host';
export { parseColor } from './renderer/color';

const DEFAULT_OPTIONS: Required<Omit<DitherOptions, 'paused'>> & { paused: boolean } = {
  colorA: '#101124',
  colorB: '#efb7d2',
  speed: 0.35,
  scale: 1.0,
  pixelSize: 2.0,
  dither: 'bayer8',
  maxDpr: 2.0,
  paused: false,
};

export function createDither(
  element: HTMLElement,
  options: DitherOptions = {}
): DitherInstance {
  let opts = { ...DEFAULT_OPTIONS, ...options };

  // Setup host and canvas
  const hostMount = setupHostCanvas(element, opts.maxDpr, (_w, _h, dpr) => {
    // Re-render immediately on resize if paused
    if (paused) {
      renderer.render(effectiveTime, dpr);
    }
  });

  const renderer = new WebGL2Renderer(hostMount.canvas, {
    colorA: opts.colorA,
    colorB: opts.colorB,
    speed: opts.speed,
    scale: opts.scale,
    pixelSize: opts.pixelSize,
    dither: opts.dither,
  }, () => {
    // When context is restored, draw immediate frame
    const dims = hostMount.getDimensions();
    renderer.render(effectiveTime, dims.dpr);
  });

  let paused = opts.paused;
  let rafId: number | null = null;
  let lastTimestamp: number | null = null;
  let effectiveTime = 0;
  let isDestroyed = false;

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

      renderer.updateConfig({
        ...(newOptions.colorA !== undefined && { colorA: newOptions.colorA }),
        ...(newOptions.colorB !== undefined && { colorB: newOptions.colorB }),
        ...(newOptions.speed !== undefined && { speed: newOptions.speed }),
        ...(newOptions.scale !== undefined && { scale: newOptions.scale }),
        ...(newOptions.pixelSize !== undefined && { pixelSize: newOptions.pixelSize }),
        ...(newOptions.dither !== undefined && { dither: newOptions.dither }),
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
