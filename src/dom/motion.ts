type MotionListener = (reduced: boolean) => void;

const listeners = new Set<MotionListener>();
let mediaQueryList: MediaQueryList | null = null;
let currentReduced = false;

function handleMediaChange(e: MediaQueryListEvent | MediaQueryList): void {
  currentReduced = e.matches;
  listeners.forEach((listener) => listener(currentReduced));
}

function initMotionQuery(): void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return;
  }

  mediaQueryList = window.matchMedia('(prefers-reduced-motion: reduce)');
  currentReduced = mediaQueryList.matches;

  if (typeof mediaQueryList.addEventListener === 'function') {
    mediaQueryList.addEventListener('change', handleMediaChange);
  } else if (typeof (mediaQueryList as any).addListener === 'function') {
    (mediaQueryList as any).addListener(handleMediaChange);
  }
}

function teardownMotionQuery(): void {
  if (!mediaQueryList) return;

  if (typeof mediaQueryList.removeEventListener === 'function') {
    mediaQueryList.removeEventListener('change', handleMediaChange);
  } else if (typeof (mediaQueryList as any).removeListener === 'function') {
    (mediaQueryList as any).removeListener(handleMediaChange);
  }

  mediaQueryList = null;
}

/**
 * Returns whether the user's OS has requested reduced motion.
 * SSR-safe: returns false if window is not available.
 */
export function isReducedMotionPreferred(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  if (!mediaQueryList) {
    initMotionQuery();
  }
  return currentReduced;
}

/**
 * Subscribes to runtime changes in reduced motion preference.
 * Returns an unsubscribe callback. Cleans up window listener when all subscribers unsubscribe.
 */
export function subscribeToMotionPreference(listener: MotionListener): () => void {
  if (listeners.size === 0) {
    initMotionQuery();
  }

  listeners.add(listener);
  // Immediate notification of initial state
  listener(currentReduced);

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      teardownMotionQuery();
    }
  };
}
