export interface HostMountResult {
  canvas: HTMLCanvasElement;
  cleanup: () => void;
  getDimensions: () => { width: number; height: number; dpr: number; resolutionScale: number };
  getBorderRadius: () => [number, number, number, number];
  hasValidDimensions: () => boolean;
  setResolutionScale: (scale: number) => void;
  setMaxDpr: (maxDpr: number) => void;
  markNeedsMeasure: () => void;
  measureIfNeeded: () => boolean;
}

export function parseBorderRadius(host: HTMLElement): [number, number, number, number] {
  if (typeof window === 'undefined') return [0, 0, 0, 0];
  const style = window.getComputedStyle(host);
  const tl = parseFloat(style.borderTopLeftRadius) || 0;
  const tr = parseFloat(style.borderTopRightRadius) || 0;
  const br = parseFloat(style.borderBottomRightRadius) || 0;
  const bl = parseFloat(style.borderBottomLeftRadius) || 0;
  return [tl, tr, br, bl];
}

/**
 * Applies the host CSS contract and mounts an isolated, non-interactive canvas.
 *
 * Host Contract:
 * - Host must establish positioning and an isolated stacking context (position: relative, isolation: isolate).
 * - Canvas is positioned absolutely (inset: 0, 100% size), receives z-index: -1, pointer-events: none.
 * - Canvas inherits border-radius from host.
 * - Canvas is decorative (aria-hidden="true", role="presentation").
 */
export function setupHostCanvas(
  host: HTMLElement,
  maxDpr: number = 2.0,
  initialResolutionScale: number = 1.0,
  onDimensionChange?: (width: number, height: number, dpr: number) => void
): HostMountResult {
  // Ensure host class is present
  host.classList.add('dither-host');

  // Verify computed positioning and stacking context
  const computedStyle = window.getComputedStyle(host);
  if (computedStyle.position === 'static') {
    host.style.position = 'relative';
  }
  if (computedStyle.isolation !== 'isolate') {
    host.style.isolation = 'isolate';
  }

  // Create canvas element
  const canvas = document.createElement('canvas');
  canvas.className = 'dither-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.setAttribute('role', 'presentation');
  canvas.setAttribute('tabindex', '-1');

  // Inline styling guarantees proper layering even before external CSS loads
  canvas.style.position = 'absolute';
  canvas.style.inset = '0';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.zIndex = '-1';
  canvas.style.pointerEvents = 'none';
  canvas.style.borderRadius = 'inherit';
  canvas.style.clipPath = 'inset(0 round inherit)';
  canvas.style.display = 'block';

  // Insert canvas as first child so it sits behind DOM content
  host.insertBefore(canvas, host.firstChild);

  let currentPhysicalWidth = 1;
  let currentPhysicalHeight = 1;
  let currentDpr = 1;
  let currentResolutionScale = initialResolutionScale;
  let currentMaxDpr = maxDpr;
  let currentBorderRadius: [number, number, number, number] = [0, 0, 0, 0];
  let isDimensionValid = false;
  let needsMeasurement = true;

  const measureAndApply = (): boolean => {
    needsMeasurement = false;
    currentBorderRadius = parseBorderRadius(host);
    const rect = host.getBoundingClientRect();

    // Check for zero-size targets (hidden, detached, or collapsed)
    if (rect.width <= 0 || rect.height <= 0) {
      isDimensionValid = false;
      return false;
    }

    isDimensionValid = true;
    const dpr = Math.min(window.devicePixelRatio || 1, currentMaxDpr);
    const pWidth = Math.max(1, Math.round(rect.width * dpr * currentResolutionScale));
    const pHeight = Math.max(1, Math.round(rect.height * dpr * currentResolutionScale));

    const changed =
      canvas.width !== pWidth ||
      canvas.height !== pHeight ||
      currentDpr !== dpr;

    if (changed) {
      canvas.width = pWidth;
      canvas.height = pHeight;
      currentPhysicalWidth = pWidth;
      currentPhysicalHeight = pHeight;
      currentDpr = dpr;

      if (onDimensionChange) {
        onDimensionChange(pWidth, pHeight, dpr);
      }
    }

    return changed;
  };

  // Initial measurement
  measureAndApply();

  // ResizeObserver for element box changes
  const resizeObserver = new ResizeObserver(() => {
    needsMeasurement = true;
    measureAndApply();
  });
  resizeObserver.observe(host);

  // Window resize/DPR listener
  const handleWindowResize = () => {
    needsMeasurement = true;
    measureAndApply();
  };
  window.addEventListener('resize', handleWindowResize, { passive: true });

  const cleanup = () => {
    resizeObserver.disconnect();
    window.removeEventListener('resize', handleWindowResize);
    if (canvas.parentElement === host) {
      host.removeChild(canvas);
    }
  };

  return {
    canvas,
    cleanup,
    getDimensions: () => ({
      width: currentPhysicalWidth,
      height: currentPhysicalHeight,
      dpr: currentDpr,
      resolutionScale: currentResolutionScale,
    }),
    getBorderRadius: () => currentBorderRadius,
    hasValidDimensions: () => isDimensionValid,
    setResolutionScale: (newScale: number) => {
      currentResolutionScale = Math.max(0.1, Math.min(1.0, newScale));
      needsMeasurement = true;
      measureAndApply();
    },
    setMaxDpr: (newMaxDpr: number) => {
      currentMaxDpr = Math.max(0.5, Math.min(4.0, newMaxDpr));
      needsMeasurement = true;
      measureAndApply();
    },
    markNeedsMeasure: () => {
      needsMeasurement = true;
    },
    measureIfNeeded: () => {
      if (needsMeasurement) {
        return measureAndApply();
      }
      return false;
    },
  };
}
