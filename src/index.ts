import { DitherOptions, DitherInstance, ValidatedDitherOptions } from './core/types';
import { validateOptions, DEFAULT_OPTIONS } from './core/options';
import { acquireContextBudget, releaseContextBudget } from './core/budget';
import { WebGL2Renderer } from './renderer/webgl2';
import { setupHostCanvas } from './dom/host';
import { observeIntersection } from './dom/visibility';
import { isReducedMotionPreferred, subscribeToMotionPreference } from './dom/motion';
import { registerScheduledTask, requestTick } from './scheduler/scheduler';

export * from './core/types';
export * from './presets';
export { setContextBudget, getContextBudget, getActiveContextCount, resetContextBudget } from './core/budget';
export { isSchedulerActive, getRegisteredTaskCount } from './scheduler/scheduler';
export { WebGL2Renderer } from './renderer/webgl2';
export { setupHostCanvas } from './dom/host';
export { parseColor, normalizePalette } from './renderer/color';
export { isReducedMotionPreferred } from './dom/motion';

/**
 * Creates an animated or static dithered background attached to target element.
 *
 * Architecture Invariants:
 * - Local canvas mounted inside target DOM subtree with negative local stacking level.
 * - Single shared scheduler drives all instances and pauses when offscreen or hidden.
 * - Respects context budget, reduced motion, zero-size targets, and context loss.
 */
export function createDither(
  element: HTMLElement,
  userOptions: DitherOptions = {}
): DitherInstance {
  // Validate and sanitize options
  let opts: ValidatedDitherOptions = validateOptions(userOptions, DEFAULT_OPTIONS);

  // Check WebGL Context Budget
  const hasBudget = acquireContextBudget();
  if (!hasBudget) {
    console.warn('[Ditho] Context budget exceeded. Target will remain on CSS fallback.');
    element.classList.add('dither-host');
    return createFallbackInstance(element);
  }

  // Mount host and canvas
  let dirty = true;
  const hostMount = setupHostCanvas(
    element,
    opts.maxDpr,
    opts.resolutionScale,
    () => {
      dirty = true;
      requestTick();
    }
  );

  let isContextLost = false;
  const renderer = new WebGL2Renderer(
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
    // On restored
    () => {
      isContextLost = false;
      dirty = true;
      requestTick();
    },
    // On lost
    () => {
      isContextLost = true;
    }
  );

  // If WebGL2 context failed to create (unsupported device)
  if (!renderer.isAvailable()) {
    releaseContextBudget();
    hostMount.cleanup();
    element.classList.add('dither-host');
    return createFallbackInstance(element);
  }

  // State
  let paused = opts.paused;
  let isDestroyed = false;
  let isIntersecting = true; // Default true so initial draw does not wait for async observer
  let systemReducedMotion = isReducedMotionPreferred();
  let effectiveTime = 0;

  // Determine if motion is effectively static
  const isEffectivelyStatic = (): boolean => {
    if (opts.speed === 0) return true;
    if (opts.reducedMotion === 'static' || opts.reducedMotion === 'reduce') return true;
    if (opts.reducedMotion === 'system' && systemReducedMotion) return true;
    return false;
  };

  // Subscribe to runtime OS reduced motion preference changes
  const unsubscribeMotion = subscribeToMotionPreference((reduced) => {
    systemReducedMotion = reduced;
    dirty = true;
    requestTick();
  });

  // Subscribe to element viewport intersection
  const unsubscribeIntersection = observeIntersection(element, (intersecting) => {
    isIntersecting = intersecting;
    if (intersecting) {
      dirty = true;
      requestTick();
    }
  });

  // Register with shared scheduler
  const { unregister: unregisterScheduler } = registerScheduledTask({
    isContinuous: () => {
      if (isDestroyed || paused || isContextLost || !isIntersecting) {
        return false;
      }
      if (!hostMount.hasValidDimensions()) {
        return false;
      }
      return !isEffectivelyStatic();
    },
    isDirty: () => {
      if (isDestroyed || isContextLost) return false;
      if (!isIntersecting || !hostMount.hasValidDimensions()) return false;
      return dirty;
    },
    getFpsLimit: () => opts.fpsLimit,
    measure: () => {
      if (hostMount.measureIfNeeded()) {
        dirty = true;
      }
    },
    render: (delta: number) => {
      if (isDestroyed || isContextLost) return;
      effectiveTime += delta;
      const dims = hostMount.getDimensions();
      renderer.render(effectiveTime, dims.dpr);
      dirty = false;
    },
  });

  // Request initial frame
  requestTick();

  const instance: DitherInstance = {
    element,
    canvas: hostMount.canvas,

    update(newOptions: Partial<DitherOptions>) {
      if (isDestroyed) return;

      opts = validateOptions(newOptions, opts);

      if (newOptions.resolutionScale !== undefined) {
        hostMount.setResolutionScale(opts.resolutionScale);
      }

      renderer.updateConfig({
        preset: opts.preset,
        colors: opts.colors,
        dither: opts.dither,
        pixelSize: opts.pixelSize,
        scale: opts.scale,
        intensity: opts.intensity,
        speed: opts.speed,
        seed: opts.seed,
        resolutionScale: opts.resolutionScale,
      });

      if (newOptions.paused !== undefined) {
        paused = opts.paused;
      }

      dirty = true;
      requestTick();
    },

    pause() {
      if (paused || isDestroyed) return;
      paused = true;
      opts.paused = true;
    },

    resume() {
      if (!paused || isDestroyed) return;
      paused = false;
      opts.paused = false;
      dirty = true;
      requestTick();
    },

    isPaused() {
      return paused;
    },

    isFallbackActive() {
      return false;
    },

    getMetrics() {
      if (isDestroyed) {
        return {
          fps: 0,
          frameTimeMs: 0,
          gpuTimeMs: null,
          bufferWidth: 0,
          bufferHeight: 0,
          pixelCount: 0,
          dpr: 1,
        };
      }
      return renderer.getMetrics(hostMount.getDimensions().dpr);
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

      unregisterScheduler();
      unsubscribeIntersection();
      unsubscribeMotion();
      releaseContextBudget();

      renderer.dispose();
      hostMount.cleanup();
    },
  };

  return instance;
}

/**
 * Creates an empty, non-throwing fallback instance for unsupported environments or exhausted budget.
 */
function createFallbackInstance(element: HTMLElement): DitherInstance {
  return {
    element,
    canvas: null,
    update: () => {},
    pause: () => {},
    resume: () => {},
    destroy: () => {},
    isPaused: () => true,
    isFallbackActive: () => true,
    getMetrics: () => ({
      fps: 0,
      frameTimeMs: 0,
      gpuTimeMs: null,
      bufferWidth: 0,
      bufferHeight: 0,
      pixelCount: 0,
      dpr: 1,
    }),
    simulateContextLoss: () => {},
    restoreContext: () => {},
  };
}
