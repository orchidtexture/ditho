export interface HostMountResult {
  canvas: HTMLCanvasElement;
  cleanup: () => void;
  getDimensions: () => { width: number; height: number; dpr: number };
}

/**
 * Applies the host CSS contract and mounts an isolated, non-interactive canvas.
 *
 * Host Contract:
 * - Host must establish positioning and an isolated stacking context (position: relative, isolation: isolate).
 * - Canvas is positioned absolutely (inset: 0, 100% size), receives z-index: -1, pointer-events: none.
 * - Canvas inherits border-radius from host.
 * - Canvas is decorative (aria-hidden="true").
 */
export function setupHostCanvas(
  host: HTMLElement,
  maxDpr: number = 2.0,
  onResize?: (width: number, height: number, dpr: number) => void
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

  // Inline fallback styling in case CSS class is loaded asynchronously
  canvas.style.position = 'absolute';
  canvas.style.inset = '0';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.zIndex = '-1';
  canvas.style.pointerEvents = 'none';
  canvas.style.borderRadius = 'inherit';
  canvas.style.display = 'block';

  // Insert canvas as first child so it sits behind DOM content
  host.insertBefore(canvas, host.firstChild);

  let currentWidth = 0;
  let currentHeight = 0;
  let currentDpr = 1;

  const updateSize = () => {
    const rect = host.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);

    const physicalWidth = Math.max(1, Math.round(rect.width * dpr));
    const physicalHeight = Math.max(1, Math.round(rect.height * dpr));

    currentWidth = physicalWidth;
    currentHeight = physicalHeight;
    currentDpr = dpr;

    if (canvas.width !== physicalWidth || canvas.height !== physicalHeight) {
      canvas.width = physicalWidth;
      canvas.height = physicalHeight;
      if (onResize) {
        onResize(physicalWidth, physicalHeight, dpr);
      }
    }
  };

  // Initial measurement
  updateSize();

  // ResizeObserver for responsive dimension tracking
  const resizeObserver = new ResizeObserver(() => {
    updateSize();
  });
  resizeObserver.observe(host);

  // Window dpr changes (e.g. moving between retina and external screens)
  const handleWindowResize = () => {
    updateSize();
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
    getDimensions: () => ({ width: currentWidth, height: currentHeight, dpr: currentDpr }),
  };
}
