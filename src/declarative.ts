import { createDither, DitherInstance, DitherOptions, PresetType, DitherMode, ReducedMotionPolicy } from './index';
import { PRESETS } from './presets';

/**
 * Parses options from an element's data attributes and data-dither value.
 */
export function parseElementOptions(element: HTMLElement, defaultOptions?: DitherOptions): DitherOptions {
  const options: DitherOptions = { ...defaultOptions };

  const rawDither = element.getAttribute('data-dither');
  if (rawDither) {
    const trimmed = rawDither.trim();
    if (trimmed.startsWith('{')) {
      try {
        const jsonOpts = JSON.parse(trimmed);
        Object.assign(options, jsonOpts);
      } catch (err) {
        console.warn('[Ditho] Failed to parse JSON in data-dither:', err);
      }
    } else if (PRESETS[trimmed]) {
      Object.assign(options, PRESETS[trimmed].options);
    } else if (['aurora', 'waves', 'gradient'].includes(trimmed)) {
      options.preset = trimmed as PresetType;
    }
  }

  // Explicit data-dither-* attributes take precedence
  const presetAttr = element.getAttribute('data-dither-preset');
  if (presetAttr && ['aurora', 'waves', 'gradient'].includes(presetAttr)) {
    options.preset = presetAttr as PresetType;
  }

  const colorsAttr = element.getAttribute('data-dither-colors');
  if (colorsAttr) {
    if (colorsAttr.trim().startsWith('[')) {
      try {
        options.colors = JSON.parse(colorsAttr);
      } catch {
        options.colors = colorsAttr.split(',').map((c) => c.trim());
      }
    } else {
      options.colors = colorsAttr.split(',').map((c) => c.trim());
    }
  }

  const ditherAttr = element.getAttribute('data-dither-mode');
  if (ditherAttr && ['bayer8', 'bayer4', 'noise', 'none'].includes(ditherAttr)) {
    options.dither = ditherAttr as DitherMode;
  }

  const pixelSizeAttr = element.getAttribute('data-dither-pixel-size');
  if (pixelSizeAttr) {
    const n = Number(pixelSizeAttr);
    if (!isNaN(n)) options.pixelSize = n;
  }

  const scaleAttr = element.getAttribute('data-dither-scale');
  if (scaleAttr) {
    const n = Number(scaleAttr);
    if (!isNaN(n)) options.scale = n;
  }

  const intensityAttr = element.getAttribute('data-dither-intensity');
  if (intensityAttr) {
    const n = Number(intensityAttr);
    if (!isNaN(n)) options.intensity = n;
  }

  const speedAttr = element.getAttribute('data-dither-speed');
  if (speedAttr) {
    const n = Number(speedAttr);
    if (!isNaN(n)) options.speed = n;
  }

  const seedAttr = element.getAttribute('data-dither-seed');
  if (seedAttr) {
    const n = Number(seedAttr);
    if (!isNaN(n)) options.seed = n;
  }

  const fpsAttr = element.getAttribute('data-dither-fps-limit');
  if (fpsAttr) {
    options.fpsLimit = fpsAttr === 'none' || fpsAttr === 'uncapped' ? null : Number(fpsAttr);
  }

  const motionAttr = element.getAttribute('data-dither-reduced-motion');
  if (motionAttr && ['system', 'static', 'reduce', 'off'].includes(motionAttr)) {
    options.reducedMotion = motionAttr as ReducedMotionPolicy;
  }

  return options;
}

/**
 * Initializes all [data-dither] elements within a root and observes DOM mutations.
 *
 * Invariants:
 * - Batches mutation processing using microtasks.
 * - Ignores the library's own canvas insertion/removal to prevent recursion.
 * - Handles targets moved within the root without unnecessary teardown.
 * - Returns an idempotent cleanup handle.
 */
export function initDither(
  root: HTMLElement | Document = typeof document !== 'undefined' ? document : (null as any),
  defaultOptions?: DitherOptions
): () => void {
  if (!root || typeof window === 'undefined') {
    return () => {};
  }

  const instances = new Map<HTMLElement, DitherInstance>();
  let isCleanedUp = false;

  const initElement = (el: HTMLElement) => {
    if (isCleanedUp || instances.has(el)) return;
    const opts = parseElementOptions(el, defaultOptions);
    const instance = createDither(el, opts);
    instances.set(el, instance);
  };

  const destroyElement = (el: HTMLElement) => {
    const inst = instances.get(el);
    if (inst) {
      inst.destroy();
      instances.delete(el);
    }
  };

  // Initial pass on existing elements
  const existing = root.querySelectorAll<HTMLElement>('[data-dither]');
  existing.forEach((el) => initElement(el));

  let pendingMutations: MutationRecord[] = [];
  let isMicrotaskScheduled = false;

  const processMutations = () => {
    if (isCleanedUp) return;
    const records = pendingMutations;
    pendingMutations = [];
    isMicrotaskScheduled = false;

    for (const record of records) {
      // Attribute changes on observed elements
      if (record.type === 'attributes') {
        const target = record.target as HTMLElement;
        if (target.hasAttribute('data-dither')) {
          const inst = instances.get(target);
          const newOpts = parseElementOptions(target, defaultOptions);
          if (inst) {
            inst.update(newOpts);
          } else {
            initElement(target);
          }
        } else {
          // data-dither attribute was removed
          destroyElement(target);
        }
        continue;
      }

      // Added nodes
      record.addedNodes.forEach((node) => {
        if (node.nodeType !== Node.ELEMENT_NODE) return;
        const el = node as HTMLElement;
        // Avoid reacting to canvas insertion by library
        if (el.tagName === 'CANVAS' && el.classList.contains('dither-canvas')) return;

        if (el.hasAttribute && el.hasAttribute('data-dither')) {
          initElement(el);
        }
        const matches = el.querySelectorAll ? el.querySelectorAll<HTMLElement>('[data-dither]') : [];
        matches.forEach((child) => initElement(child));
      });

      // Removed nodes
      record.removedNodes.forEach((node) => {
        if (node.nodeType !== Node.ELEMENT_NODE) return;
        const el = node as HTMLElement;
        if (el.tagName === 'CANVAS' && el.classList.contains('dither-canvas')) return;

        // Check if element was truly removed from document, or merely moved
        if (el.hasAttribute && el.hasAttribute('data-dither')) {
          if (!el.isConnected) {
            destroyElement(el);
          }
        }
        const matches = el.querySelectorAll ? el.querySelectorAll<HTMLElement>('[data-dither]') : [];
        matches.forEach((child) => {
          if (!child.isConnected) {
            destroyElement(child);
          }
        });
      });
    }
  };

  const observer = new MutationObserver((mutations) => {
    // Filter out our own canvas element changes to prevent any recursive triggers
    const relevant = mutations.filter((m) => {
      if (m.type === 'childList') {
        const isCanvasOnly =
          Array.from(m.addedNodes).every((n) => (n as HTMLElement).tagName === 'CANVAS') &&
          Array.from(m.removedNodes).every((n) => (n as HTMLElement).tagName === 'CANVAS');
        return !isCanvasOnly;
      }
      return true;
    });

    if (relevant.length === 0) return;

    pendingMutations.push(...relevant);
    if (!isMicrotaskScheduled) {
      isMicrotaskScheduled = true;
      queueMicrotask(processMutations);
    }
  });

  observer.observe(root, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: [
      'data-dither',
      'data-dither-preset',
      'data-dither-colors',
      'data-dither-mode',
      'data-dither-pixel-size',
      'data-dither-scale',
      'data-dither-intensity',
      'data-dither-speed',
      'data-dither-seed',
      'data-dither-fps-limit',
      'data-dither-reduced-motion',
    ],
  });

  return () => {
    if (isCleanedUp) return;
    isCleanedUp = true;
    observer.disconnect();
    instances.forEach((inst) => inst.destroy());
    instances.clear();
  };
}
