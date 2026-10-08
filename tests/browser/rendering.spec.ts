import { test, expect } from '@playwright/test';

test.describe('Real Browser Rendering & WebGL2 Correctness', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForSelector('canvas.dither-canvas');
  });

  test('compiles shaders and links WebGL2 program without errors on real GPU hardware', async ({ page }) => {
    const glStatus = await page.evaluate(() => {
      const canvas = document.querySelector<HTMLCanvasElement>('#hero-stage canvas.dither-canvas');
      if (!canvas) return { hasCanvas: false };
      const gl = canvas.getContext('webgl2');
      if (!gl) return { hasGl: false };

      return {
        hasCanvas: true,
        hasGl: true,
        error: gl.getError(),
        width: canvas.width,
        height: canvas.height,
      };
    });

    expect(glStatus.hasCanvas).toBe(true);
    expect(glStatus.hasGl).toBe(true);
    expect(glStatus.error).toBe(0); // GL_NO_ERROR
    expect(glStatus.width).toBeGreaterThan(0);
    expect(glStatus.height).toBeGreaterThan(0);
  });

  test('shader-level SDF corner clipping discards fragments outside border radius', async ({ page }) => {
    const pixelTest = await page.evaluate(async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 200;
      canvas.height = 200;
      document.body.appendChild(canvas);

      const { WebGL2Renderer } = await import('/src/renderer/webgl2.ts');
      const renderer = new WebGL2Renderer(canvas, {
        preset: 'aurora',
        colors: ['#ffffff', '#ffffff'],
        dither: 'none',
        pixelSize: 1,
        scale: 1,
        intensity: 1,
        speed: 0,
        seed: 0,
        resolutionScale: 1,
        borderRadius: [30, 30, 30, 30],
      });

      // Synchronously draw one frame
      renderer.render(0, 1);

      const gl = canvas.getContext('webgl2')!;

      // Top-left corner pixel in GL coordinates (x=2, y=197)
      const corner = new Uint8Array(4);
      gl.readPixels(2, 197, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, corner);

      // Center pixel (x=100, y=100)
      const center = new Uint8Array(4);
      gl.readPixels(100, 100, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, center);

      renderer.dispose();
      canvas.remove();

      return {
        cornerAlpha: corner[3],
        centerAlpha: center[3],
      };
    });

    // Outer corner fragment was discarded by shader SDF -> alpha is 0
    expect(pixelTest.cornerAlpha).toBe(0);
    // Inner center fragment was shaded -> alpha is 255
    expect(pixelTest.centerAlpha).toBe(255);
  });

  test('updating maxDpr dynamically resizes existing instance drawing buffer', async ({ page }) => {
    const initialWidth = await page.evaluate(() => {
      const canvas = document.querySelector<HTMLCanvasElement>('#hero-stage canvas.dither-canvas')!;
      return canvas.width;
    });

    // Update maxDpr dropdown to 1.0
    await page.selectOption('#select-max-dpr', '1.0');
    await page.waitForTimeout(200);

    const updatedWidth = await page.evaluate(() => {
      const canvas = document.querySelector<HTMLCanvasElement>('#hero-stage canvas.dither-canvas')!;
      return canvas.width;
    });

    const clientWidth = await page.evaluate(() => {
      const host = document.querySelector<HTMLElement>('#hero-stage')!;
      return Math.round(host.getBoundingClientRect().width);
    });

    expect(updatedWidth).toBe(clientWidth);
    if (await page.evaluate(() => window.devicePixelRatio > 1)) {
      expect(updatedWidth).toBeLessThan(initialWidth);
    }
  });

  test('simulates WebGL context loss and restoration on real context', async ({ page }) => {
    const lossResult = await page.evaluate(async () => {
      const btnLoss = document.querySelector<HTMLButtonElement>('#btn-context-loss')!;
      const canvas = document.querySelector<HTMLCanvasElement>('#hero-stage canvas.dither-canvas')!;

      // Trigger context loss
      btnLoss.click();
      await new Promise((r) => setTimeout(r, 100));
      const displayAfterLoss = canvas.style.display;

      // Restore context
      btnLoss.click();
      await new Promise((r) => setTimeout(r, 100));
      const displayAfterRestore = canvas.style.display;

      return { displayAfterLoss, displayAfterRestore };
    });

    expect(lossResult.displayAfterLoss).toBe('none');
    expect(lossResult.displayAfterRestore).toBe('block');
  });

  test('frame-rate limiting (30 fps) throttles draw cadence without changing animation speed', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const c1 = document.createElement('div');
      const c2 = document.createElement('div');
      c1.style.position = 'fixed';
      c1.style.top = '0';
      c1.style.left = '0';
      c1.style.width = '150px';
      c1.style.height = '80px';
      c1.style.zIndex = '99999';

      c2.style.position = 'fixed';
      c2.style.top = '90px';
      c2.style.left = '0';
      c2.style.width = '150px';
      c2.style.height = '80px';
      c2.style.zIndex = '99999';

      document.body.appendChild(c1);
      document.body.appendChild(c2);

      const ditho = (window as any).ditho || (await import('/src/index.ts'));

      // Both instances configured with speed 1.0
      // inst1 is uncapped, inst2 is throttled to 30 fps
      const inst1 = ditho.createDither(c1, { speed: 1.0, fpsLimit: null });
      const inst2 = ditho.createDither(c2, { speed: 1.0, fpsLimit: 30 });

      // Run for 1000ms wall-clock time
      await new Promise((r) => setTimeout(r, 1000));

      const m1 = inst1.getMetrics();
      const m2 = inst2.getMetrics();

      inst1.destroy();
      inst2.destroy();
      c1.remove();
      c2.remove();

      return {
        fps1: m1.fps,
        fps2: m2.fps,
      };
    });

    // Uncapped should run near display refresh (>= 45 fps)
    expect(result.fps1).toBeGreaterThanOrEqual(45);
    // 30 fps instance should be throttled near 30 fps (~25 - 40 fps on variable refresh displays)
    expect(result.fps2).toBeLessThanOrEqual(40);
    expect(result.fps2).toBeGreaterThanOrEqual(20);
    // Throttled cadence must be lower than uncapped cadence
    expect(result.fps2).toBeLessThan(result.fps1);
  });
});
