import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { initDither, parseElementOptions } from '../src/declarative';
import { getActiveContextCount, resetContextBudget } from '../src/index';

describe('Declarative Initialization (initDither)', () => {
  let container: HTMLElement;

  beforeEach(() => {
    resetContextBudget(10);

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
          drawingBufferWidth: 800,
          drawingBufferHeight: 600,
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
          uniform4f: () => {},
          uniform4fv: () => {},
          drawArrays: () => {},
          getExtension: () => null,
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

  it('parses data-dither preset name and options correctly', () => {
    const el = document.createElement('div');
    el.setAttribute('data-dither', 'cyber');
    el.setAttribute('data-dither-pixel-size', '4');
    el.setAttribute('data-dither-speed', '0.5');

    const opts = parseElementOptions(el);
    expect(opts.preset).toBe('waves');
    expect(opts.pixelSize).toBe(4);
    expect(opts.speed).toBe(0.5);
  });

  it('initializes existing [data-dither] elements within root', () => {
    const el1 = document.createElement('div');
    el1.setAttribute('data-dither', 'aurora');
    container.appendChild(el1);

    const cleanup = initDither(container);

    expect(el1.querySelector('canvas.dither-canvas')).not.toBeNull();
    expect(getActiveContextCount()).toBe(1);

    cleanup();
    expect(el1.querySelector('canvas.dither-canvas')).toBeNull();
    expect(getActiveContextCount()).toBe(0);
  });
});
