import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React, { createRef } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { act } from 'react';
import { DitherBackground } from '../src/react/index';
import { getActiveContextCount, resetContextBudget } from '../src/index';

describe('React Adapter (DitherBackground)', () => {
  let container: HTMLDivElement;
  let root: Root | null = null;

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
    root = createRoot(container);
  });

  afterEach(() => {
    if (root) {
      act(() => {
        root!.unmount();
      });
      root = null;
    }
    if (container.parentElement) {
      document.body.removeChild(container);
    }
    vi.restoreAllMocks();
  });

  it('renders host element with dither-host class and mounts canvas', async () => {
    await act(async () => {
      root!.render(
        <DitherBackground preset="aurora" className="my-hero">
          <h1>Hello React</h1>
        </DitherBackground>
      );
    });

    const host = container.querySelector('.dither-host');
    expect(host).not.toBeNull();
    expect(host?.classList.contains('my-hero')).toBe(true);
    expect(host?.querySelector('h1')?.textContent).toBe('Hello React');

    // Client canvas mounted
    const canvas = host?.querySelector('canvas.dither-canvas');
    expect(canvas).not.toBeNull();
    expect(getActiveContextCount()).toBe(1);
  });

  it('cleans up GPU resources and decrements context budget upon unmount', async () => {
    await act(async () => {
      root!.render(
        <DitherBackground preset="waves">
          <div>Content</div>
        </DitherBackground>
      );
    });

    expect(getActiveContextCount()).toBe(1);

    await act(async () => {
      root!.unmount();
      root = null;
    });

    expect(getActiveContextCount()).toBe(0);
  });

  it('forwards DOM ref correctly', async () => {
    const ref = createRef<HTMLElement>();

    await act(async () => {
      root!.render(
        <DitherBackground ref={ref} id="custom-id">
          <span>Ref Target</span>
        </DitherBackground>
      );
    });

    expect(ref.current).not.toBeNull();
    expect(ref.current?.id).toBe('custom-id');
  });
});
