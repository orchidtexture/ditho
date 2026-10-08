import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createDither } from '../src/index';

describe('Performance Metrics & Controls (Phase 4)', () => {
  let host: HTMLElement;

  beforeEach(() => {
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

    host = document.createElement('div');
    document.body.appendChild(host);
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('provides real-time performance metrics via getMetrics()', () => {
    const instance = createDither(host);
    const metrics = instance.getMetrics();

    expect(metrics).toBeDefined();
    expect(typeof metrics.fps).toBe('number');
    expect(typeof metrics.frameTimeMs).toBe('number');
    expect(metrics.bufferWidth).toBeGreaterThan(0);
    expect(metrics.bufferHeight).toBeGreaterThan(0);
    expect(metrics.pixelCount).toBe(metrics.bufferWidth * metrics.bufferHeight);

    instance.destroy();
  });

  it('supports fpsLimit option without throwing', () => {
    const instance = createDither(host, {
      fpsLimit: 30,
      speed: 0.5,
    });

    instance.update({ fpsLimit: 60 });
    instance.update({ fpsLimit: null as any });

    instance.destroy();
  });
});
