type VisibilityCallback = (visible: boolean) => void;
type IntersectionCallback = (isIntersecting: boolean) => void;

// ============================================================================
// Page Visibility (document.visibilityState)
// ============================================================================

const pageListeners = new Set<VisibilityCallback>();
let isDocumentVisible = true;
let isPageListening = false;

function handleVisibilityChange(): void {
  if (typeof document === 'undefined') return;
  const visible = document.visibilityState !== 'hidden';
  if (visible !== isDocumentVisible) {
    isDocumentVisible = visible;
    pageListeners.forEach((fn) => fn(isDocumentVisible));
  }
}

export function isPageVisible(): boolean {
  if (typeof document === 'undefined') return true;
  return document.visibilityState !== 'hidden';
}

export function subscribeToPageVisibility(callback: VisibilityCallback): () => void {
  if (typeof document === 'undefined') {
    return () => {};
  }

  pageListeners.add(callback);
  if (!isPageListening) {
    document.addEventListener('visibilitychange', handleVisibilityChange);
    isPageListening = true;
  }

  return () => {
    pageListeners.delete(callback);
    if (pageListeners.size === 0 && isPageListening) {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      isPageListening = false;
    }
  };
}

// ============================================================================
// Element Viewport Intersection (Shared IntersectionObserver)
// ============================================================================

let sharedObserver: IntersectionObserver | null = null;
const observedElements = new Map<HTMLElement, IntersectionCallback>();

function initSharedObserver(): void {
  if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') {
    return;
  }

  sharedObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const target = entry.target as HTMLElement;
        const callback = observedElements.get(target);
        if (callback) {
          callback(entry.isIntersecting);
        }
      });
    },
    { threshold: 0.0 }
  );
}

/**
 * Observes an element using a single shared IntersectionObserver.
 * Calls callback when intersection changes.
 * Returns an unobserve function.
 */
export function observeIntersection(
  element: HTMLElement,
  callback: IntersectionCallback
): () => void {
  if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') {
    // If not supported, assume always intersecting
    callback(true);
    return () => {};
  }

  if (!sharedObserver) {
    initSharedObserver();
  }

  observedElements.set(element, callback);
  sharedObserver?.observe(element);

  return () => {
    if (sharedObserver) {
      sharedObserver.unobserve(element);
    }
    observedElements.delete(element);

    if (observedElements.size === 0 && sharedObserver) {
      sharedObserver.disconnect();
      sharedObserver = null;
    }
  };
}
