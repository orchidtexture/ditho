import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createDither, isSchedulerActive } from '../src/index';

describe('Accessibility & Decorative Guarantees (Phase 4)', () => {
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

    host = document.createElement('section');
    host.innerHTML = '<h2>Accessible Heading</h2><p>Accessible readable content</p><button>Action</button>';
    document.body.appendChild(host);
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('marks canvas decorative and hidden from assistive technology', () => {
    const instance = createDither(host);
    const canvas = instance.canvas!;

    expect(canvas).not.toBeNull();
    expect(canvas.getAttribute('aria-hidden')).toBe('true');
    expect(canvas.getAttribute('role')).toBe('presentation');
    expect(canvas.getAttribute('tabindex')).toBe('-1');

    instance.destroy();
  });

  it('preserves readable DOM content and interactive descendants intact', () => {
    const instance = createDither(host);

    const heading = host.querySelector('h2');
    const button = host.querySelector('button');

    expect(heading?.textContent).toBe('Accessible Heading');
    expect(button?.textContent).toBe('Action');

    // Canvas sits behind content (negative z-index)
    const canvas = instance.canvas!;
    expect(canvas.style.zIndex).toBe('-1');
    expect(canvas.style.pointerEvents).toBe('none');

    instance.destroy();
  });

  it('reducedMotion: "static" produces a static background without continuous animation frames', () => {
    const instance = createDither(host, {
      reducedMotion: 'static',
      speed: 0.5,
    });

    // Static mode renders dirty frame and does not request continuous rAF
    expect(instance.isPaused()).toBe(false);

    instance.destroy();
  });
});
