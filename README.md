# Ditho

> Lightweight, framework-agnostic animated dithered backgrounds for the modern web.

Ditho mounts animated, procedural dithered backgrounds directly inside target DOM elements. Instead of fullscreen canvas overlays or fragile synthetic scroll tracking, Ditho attaches a local `<canvas>` inside each target's DOM subtree so that browser compositing handles scrolling, rounded corners, ancestor transforms, and stacking contexts naturally.

---

## Features

- **Small & Dependency-Free:** Core library has 0 runtime dependencies (< 11 kB min+gzip).
- **Local Canvas Compositing:** Canvases live inside target elements (`z-index: -1`, `pointer-events: none`). Native scrolling, CSS transforms, and padding work automatically.
- **Ordered & Noise Dithering:** Bayer 8×8 (64 levels), Bayer 4×4 (16 levels), deterministic static noise, and smooth continuous reference mode.
- **Three Procedural Presets:**
  - `aurora`: Domain-warped procedural ribbons with bounded octaves.
  - `waves`: Multi-layer directional harmonic sine wave interference.
  - `gradient`: Smooth angled directional gradient with subtle wave oscillation.
- **Multi-Stop Color Ramps:** Quantizes ordered palettes of up to 8 colors smoothly across threshold intervals.
- **Shared Animation Scheduler:** Single shared `requestAnimationFrame` loop drives all instances. Stops continuous rendering when inactive (when elements are offscreen, the tab is hidden, or instances are paused/static).
- **Explicit Quality Controls:** Configurable DPR capping (`maxDpr`), internal resolution scaling (`resolutionScale`), and optional frame rate capping (`fpsLimit: 30`).
- **Context Budget Protection:** Configurable limit on concurrent WebGL contexts (`setContextBudget`); graceful fallback to CSS backgrounds if exhausted.
- **Accessibility & Reduced Motion:** Canvases are marked decorative (`aria-hidden="true"`, `role="presentation"`). Automatically detects OS motion preference (`prefers-reduced-motion: reduce`) or enforces static rendering.
- **Developer Integrations:** Imperative API, Declarative HTML (`data-dither`), and a thin SSR-safe React adapter (`<DitherBackground>`).

---

## Installation

```bash
npm install ditho
```

Import the core CSS styles in your app entry:

```css
import 'ditho/style.css';
```

---

## Quick Start

### 1. Vanilla JavaScript / TypeScript (Imperative)

```ts
import { createDither } from 'ditho';
import 'ditho/style.css';

const element = document.querySelector<HTMLElement>('.hero-card')!;

const background = createDither(element, {
  preset: 'aurora',
  colors: ['#050814', '#16235a', '#2f6991', '#88d49e', '#fef9e7'],
  dither: 'bayer8',
  pixelSize: 2,
  scale: 1.0,
  speed: 0.25,
});

// Update options without remounting canvas
background.update({ speed: 0.1, pixelSize: 4 });

// Lifecycle controls
background.pause();
background.resume();

// Full cleanup (removes canvas, frees GPU resources & context budget)
background.destroy();
```

---

### 2. React

```tsx
import { DitherBackground } from 'ditho/react';
import 'ditho/style.css';

export function Hero() {
  return (
    <DitherBackground
      preset="aurora"
      colors={['#180828', '#631858', '#b52f64', '#e26d5c', '#ffcd75']}
      dither="bayer8"
      pixelSize={2}
      speed={0.3}
      className="rounded-2xl p-8"
      fallbackColor="#180828"
    >
      <h1 className="text-3xl font-bold text-white">Welcome</h1>
      <p className="text-zinc-300">Content sits cleanly above the dither effect.</p>
    </DitherBackground>
  );
}
```

- **SSR-safe:** Output contains the container and CSS fallback color on the server; WebGL initializes exclusively on the client after hydration.
- **Strict Mode Safe:** Safe against double-mount effect cleanup.
- **Ref Forwarding:** Passes `ref` to the underlying container element.

---

### 3. Declarative HTML (`data-dither`)

```html
<section class="dither-host" data-dither="cyber" data-dither-pixel-size="2" data-dither-speed="0.25">
  <h2>Declarative Background</h2>
</section>

<script type="module">
  import { initDither } from 'ditho';
  import 'ditho/style.css';

  // Automatically initializes [data-dither] elements and observes DOM additions/removals
  const cleanup = initDither();
</script>
```

---

## Host CSS Contract

Ditho enforces a predictable stacking context so that the dither background sits **behind** host content but **above** the host's background color:

```css
/* Applied automatically by the library or imported from ditho/style.css */
.dither-host {
  position: relative;
  isolation: isolate;
  background-color: #0d0f18; /* CSS Fallback color */
}

.dither-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: -1;
  pointer-events: none;
  border-radius: inherit;
  clip-path: inset(0 round inherit);
  display: block;
}
```

- `isolation: isolate`: Traps the canvas's `z-index: -1` inside the host element so it never escapes behind ancestors.
- `pointer-events: none`: Guarantees clicks, hovers, text selection, and touch gestures pass directly through to buttons and inputs.
- `border-radius: inherit` + Shader SDF clipping: Prevents rectangular corners from flashing during scroll.

---

## API Reference

### `createDither(element, options): DitherInstance`

#### Options (`DitherOptions`)

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `preset` | `'aurora' \| 'waves' \| 'gradient'` | `'aurora'` | Procedural field generation algorithm. |
| `colors` | `string[]` | `['#101124', '#efb7d2']` | Ordered ramp of CSS colors (hex, rgb). Supports 1 to 8 stops. |
| `dither` | `'bayer8' \| 'bayer4' \| 'noise' \| 'none'` | `'bayer8'` | Quantization algorithm. `'none'` renders smooth reference field. |
| `pixelSize` | `number` | `2` | Dither cell size in CSS pixels (min: 1). |
| `scale` | `number` | `1.0` | Spatial scale of structures in the procedural field. |
| `intensity` | `number` | `1.0` | Contrast / modulation depth of the field. |
| `speed` | `number` | `0.25` | Animation speed multiplier (`0` = static). |
| `seed` | `number` | `42` | Seed integer for repeatable determinism. |
| `maxDpr` | `number` | `2.0` | Caps device pixel ratio to protect GPU fillrate. |
| `resolutionScale`| `number` | `1.0` | Internal rendering buffer scale (0.1 to 1.0). |
| `fpsLimit` | `number \| null` | `null` | Optional frame rate cap (e.g. `30` or `15` fps for mobile). |
| `reducedMotion` | `'system' \| 'static' \| 'reduce' \| 'off'`| `'system'` | Policy for `prefers-reduced-motion`. |
| `paused` | `boolean` | `false` | Freezes animation. |

#### Instance Methods (`DitherInstance`)

- `update(options: Partial<DitherOptions>): void`: Applies partial option changes with dirty-frame redraw.
- `pause(): void`: Freezes animation loop without releasing context or GPU resources.
- `resume(): void`: Resumes animation loop without visual time jumps.
- `destroy(): void`: Idempotent cleanup. Removes canvas, releases WebGL programs/buffers, unregisters listeners, and frees context budget slot.
- `isPaused(): boolean`: Returns current pause state.
- `isFallbackActive(): boolean`: Returns `true` if target is currently on CSS fallback due to context budget or unsupported WebGL.
- `getMetrics(): PerformanceMetrics`: Returns real-time `{ fps, frameTimeMs, gpuTimeMs, bufferWidth, bufferHeight, pixelCount, dpr }`.

---

## Curated Presets

Ditho includes a curated set of named configurations:

```ts
import { PRESETS } from 'ditho';

// PRESETS.aurora    — Domain-warped ribbons in navy, teal, mint, and soft gold
// PRESETS.cyber     — Layered harmonic waves drifting into vibrant sunset magenta
// PRESETS.ocean     — Deep aquatic undulating sine field in oceanic blues
// PRESETS.monochrome — Clean angled gradient with deterministic static noise dither
// PRESETS.orchid    — Vivid magenta and electric violet aurora ribbons
```

---

## Performance & Quality Best Practices

1. **Intended Workload:** Ditho is designed for one to a few prominent hero sections, panels, or cards on a page. Avoid mounting dozens of independent WebGL canvases simultaneously.
2. **Context Budget:** Browsers enforce hard limits on concurrent WebGL contexts (often 8 to 16). Configure the budget using `setContextBudget(limit)`. If exhausted, newly mounted targets remain on their CSS fallback background without crashing.
3. **High-DPI / Mobile Displays:** Use `maxDpr: 1.5` or `2.0`. A 4K or 3× retina mobile display at uncapped DPR consumes massive fillrate.
4. **Constrained Devices:** Offers configurable quality/performance tradeoffs: set `fpsLimit: 30` or `resolutionScale: 0.75` to reduce GPU draw overhead on battery-sensitive or constrained devices.
5. **Idle Suspension:** The shared scheduler automatically suspends the `requestAnimationFrame` loop when all instances are offscreen, the tab is hidden, or instances are paused/static.

---

## Accessibility (`a11y`)

- **Decorative Canvas:** All canvases are generated with `aria-hidden="true"`, `role="presentation"`, and `tabindex="-1"`.
- **Text Contrast Responsibility:** Because dither backgrounds contain animated light and dark bands, consumers remain responsible for ensuring foreground text achieves WCAG AA (≥ 4.5:1) or AAA (≥ 7:1) contrast against **both** extremes of the palette ramp.
- **Reduced Motion:** When `reducedMotion: 'system'` (default) is set, Ditho listens to OS motion preferences (`prefers-reduced-motion: reduce`) and renders a static, frozen frame with 0 continuous frame cost.

---

## Bundle Sizes

| Entry | Minified | Gzipped |
| :--- | :--- | :--- |
| **`ditho` (Core)** | 36.18 kB | **10.85 kB** |
| **`ditho/react`** | 1.85 kB | **0.68 kB** |
| **`ditho/style.css`** | 0.26 kB | **0.20 kB** |

*Measured using Vite/Rollup production build with tree-shaking and externalized React peer dependencies.*

---

## Troubleshooting

### Q: Why do my canvas corners flash square during fast scrolling?
This occurs in some browsers (like Firefox) when asynchronous scrolling decouples picture cache layers. Ditho incorporates shader-level signed distance field (SDF) corner clipping and CSS `clip-path` to discard fragments outside the host's `border-radius`. If your host container does not require protruding dropdowns/tooltips, adding `overflow: hidden` to the host container provides additional compositor-level clipping.

### Q: Why is my target showing a solid background instead of WebGL?
Check `instance.isFallbackActive()`. If WebGL2 is unsupported on the device, or if the configured context budget has been reached (`getActiveContextCount() >= getContextBudget()`), Ditho intentionally preserves the host element's CSS background color to prevent browser context exhaustion or page crashes.

### Q: Can I use Ditho with Next.js (App Router / SSR)?
Yes! In vanilla DOM, call `createDither` or `initDither` inside `useEffect` or client-side scripts. In React/Next.js, the `<DitherBackground>` component from `ditho/react` is already SSR-safe—its server output contains the wrapper and CSS fallback, while WebGL initializes on the client after hydration.

---

## License

MIT © Luis
