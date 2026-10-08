import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setupHostCanvas } from '../src/dom/host';

describe('Host Contract (setupHostCanvas)', () => {
  let host: HTMLElement;

  beforeEach(() => {
    // Mock ResizeObserver for jsdom
    global.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };

    host = document.createElement('div');
    document.body.appendChild(host);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('adds dither-host class and establishes positioning and stacking context', () => {
    const mount = setupHostCanvas(host);

    expect(host.classList.contains('dither-host')).toBe(true);
    expect(host.style.position).toBe('relative');
    expect(host.style.isolation).toBe('isolate');

    mount.cleanup();
  });

  it('inserts canvas as first child with correct CSS attributes and styles', () => {
    const mount = setupHostCanvas(host);
    const canvas = mount.canvas;

    expect(host.firstChild).toBe(canvas);
    expect(canvas.classList.contains('dither-canvas')).toBe(true);
    expect(canvas.getAttribute('aria-hidden')).toBe('true');
    expect(canvas.getAttribute('role')).toBe('presentation');

    expect(canvas.style.position).toBe('absolute');
    expect(canvas.style.inset).toBe('0px');
    expect(canvas.style.zIndex).toBe('-1');
    expect(canvas.style.pointerEvents).toBe('none');
    expect(canvas.style.borderRadius).toBe('inherit');

    mount.cleanup();
  });

  it('removes canvas cleanly on cleanup without leaving orphaned DOM nodes', () => {
    const mount = setupHostCanvas(host);
    expect(host.contains(mount.canvas)).toBe(true);

    mount.cleanup();
    expect(host.contains(mount.canvas)).toBe(false);
  });
});
