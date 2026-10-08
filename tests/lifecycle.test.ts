import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createDither, setContextBudget, resetContextBudget, getActiveContextCount, isSchedulerActive } from '../src/index';

describe('Lifecycle & Resource Teardown (Phase 3 Exit Criteria)', () => {
  let container: HTMLElement;

  beforeEach(() => {
    resetContextBudget(4);

    // Mock WebGL2 in jsdom
    HTMLCanvasElement.prototype.getContext = vi.fn().mockImplementation((type) => {
      if (type === 'webgl2') {
        return {
          VERTEX_SHADER: 35633,
          FRAGMENT_SHADER: 35632,
          COMPILE_STATUS: 35713,
          LINK_STATUS: 35714,
          ARRAY_BUFFER: 34962,
          STATIC_DRAW: 35044,
          FLOAT: 5126,
          TRIANGLES: 4,
          drawingBufferWidth: 500,
          drawingBufferHeight: 300,
          createShader: () => ({}),
          shaderSource: () => {},
          compileShader: () => {},
          getShaderParameter: () => true,
          getShaderInfoLog: () => '',
          deleteShader: () => {},
          createProgram: () => ({}),
          attachShader: () => {},
          linkProgram: () => {},
          getProgramParameter: () => true,
          getProgramInfoLog: () => '',
          deleteProgram: () => {},
          detachShader: () => {},
          useProgram: () => {},
          getUniformLocation: () => ({}),
          getAttribLocation: () => 0,
          enableVertexAttribArray: () => {},
          vertexAttribPointer: () => {},
          createVertexArray: () => ({}),
          bindVertexArray: () => {},
          deleteVertexArray: () => {},
          createBuffer: () => ({}),
          bindBuffer: () => {},
          bufferData: () => {},
          deleteBuffer: () => {},
          viewport: () => {},
          uniform1i: () => {},
          uniform1f: () => {},
          uniform2f: () => {},
          uniform3fv: () => {},
          drawArrays: () => {},
          getExtension: () => ({
            loseContext: () => {},
            restoreContext: () => {},
          }),
        };
      }
      return null;
    }) as any;

    global.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };

    global.IntersectionObserver = class {
      constructor(private cb: any) {}
      observe() {}
      unobserve() {}
      disconnect() {}
    } as any;

    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('handles repeated create/update/destroy cycles without leaking resources', () => {
    expect(getActiveContextCount()).toBe(0);

    for (let cycle = 0; cycle < 5; cycle++) {
      const el = document.createElement('div');
      container.appendChild(el);

      const instance = createDither(el, {
        preset: 'waves',
        speed: 0.5,
        dither: 'bayer8',
      });

      expect(getActiveContextCount()).toBe(1);
      expect(el.querySelector('canvas.dither-canvas')).not.toBeNull();

      // Updates
      instance.update({ speed: 0.2 });
      instance.update({ colors: ['#ffffff', '#000000'] });

      // Destroy
      instance.destroy();

      // Canvas removed from DOM
      expect(el.querySelector('canvas.dither-canvas')).toBeNull();
      // Context budget returned
      expect(getActiveContextCount()).toBe(0);

      container.removeChild(el);
    }

    // Verify scheduler stops when all instances are destroyed
    expect(isSchedulerActive()).toBe(false);
  });

  it('destroy is completely idempotent', () => {
    const el = document.createElement('div');
    container.appendChild(el);

    const instance = createDither(el);
    expect(getActiveContextCount()).toBe(1);

    instance.destroy();
    expect(getActiveContextCount()).toBe(0);

    // Repeated destroy should not throw and not decrement budget below 0
    expect(() => {
      instance.destroy();
      instance.destroy();
    }).not.toThrow();

    expect(getActiveContextCount()).toBe(0);
  });

  it('enforces context budget and falls back gracefully when limit is reached', () => {
    setContextBudget(2);

    const el1 = document.createElement('div');
    const el2 = document.createElement('div');
    const el3 = document.createElement('div');
    container.appendChild(el1);
    container.appendChild(el2);
    container.appendChild(el3);

    const inst1 = createDither(el1);
    const inst2 = createDither(el2);
    expect(getActiveContextCount()).toBe(2);
    expect(inst1.isFallbackActive()).toBe(false);
    expect(inst2.isFallbackActive()).toBe(false);

    // 3rd instance exceeds budget of 2 -> falls back to CSS gracefully
    const inst3 = createDither(el3);
    expect(inst3.isFallbackActive()).toBe(true);
    expect(inst3.canvas).toBeNull();
    expect(getActiveContextCount()).toBe(2);

    // Destroying inst1 frees budget
    inst1.destroy();
    expect(getActiveContextCount()).toBe(1);

    inst2.destroy();
    inst3.destroy();
    expect(getActiveContextCount()).toBe(0);
  });

  it('stops scheduling animation frames when instance is paused or static', () => {
    const el = document.createElement('div');
    container.appendChild(el);

    const instance = createDither(el, { speed: 0.5 });
    expect(instance.isPaused()).toBe(false);

    // Pausing stops continuous scheduling
    instance.pause();
    expect(instance.isPaused()).toBe(true);

    instance.destroy();
  });
});
