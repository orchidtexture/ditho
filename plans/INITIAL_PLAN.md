# Dither backgrounds — implementation plan

## 1. Product goal

Build a small, framework-agnostic library for animated, dithered backgrounds that feel like part of the page—not a separate visual effect pasted over it.

The first release should make one to a few hero sections, cards, or panels look great with minimal setup. It should preserve normal DOM layering and clipping, degrade gracefully, and remain usable on mobile devices.

**Core principle:** prioritize visual quality and predictable integration before optimizing for dozens of simultaneous backgrounds.

## 2. Scope

### MVP

- TypeScript core with a small imperative API.
- WebGL2 renderer, with a CSS background fallback when unavailable.
- Canvas mounted inside the target element, behind its content.
- Three procedural presets: gradient, waves, and aurora.
- Palette quantization with ordered and static-noise dithering.
- Controls for colors, speed, field scale, dither pixel size, and intensity.
- Resize handling, offscreen pausing, hidden-tab pausing, and reduced-motion support.
- Explicit cleanup and WebGL context-loss handling.
- Interactive demo and integration documentation.

### After the core is stable

- Declarative `data-dither` initialization.
- Thin React adapter.
- An experimental shared-canvas renderer for constrained layouts.

### Not in the MVP

- Arbitrary DOM projection through one fullscreen canvas.
- Fluid simulation: the aurora is an animated procedural field, not a physics solver.
- WebGPU, Wasm, image/video dithering, or a shader-authoring API.
- Automatically rewriting a site's stacking contexts and clipping rules.
- Guaranteed support for dozens of independently mounted WebGL canvases.

## 3. Architecture

### A. Local canvas first

Mount a canvas as a child of each target. Because it lives in the target's DOM subtree, browser compositing handles ancestor transforms, opacity, scrolling, and clipping instead of the library reconstructing them.

Define an explicit host CSS contract:

- Host establishes a positioning and isolated stacking context.
- Canvas fills the host, uses a negative local stacking level, and ignores pointer events.
- Host isolation keeps that negative layer above the host's own background but below normal content.
- Canvas inherits the host's border radius; avoid clipping the host's children just to clip the effect.
- Host dimensions come from its content or CSS, never from the canvas.

Prototype and verify this contract before committing to it. Test borders, padding, positioned children, focus rings, and rounded corners in all supported browsers. Document stacking-context side effects and an explicit content-wrapper alternative if needed.

Do not silently change inline positioning, overflow, or content markup. Provide an opt-in class and clear integration instructions. The React adapter can own a wrapper and apply the contract itself.

### B. Shared scheduling, separate local contexts

Use one scheduler for all instances:

1. Batch pending measurements.
2. Determine which instances need a frame.
3. Update uniforms and render active instances.
4. Stop requesting frames when nothing is animated or dirty.

Each local canvas initially owns its WebGL context. This is a deliberate MVP tradeoff, not the final answer for large instance counts.

Use lazy initialization, document the intended one-to-few-instance workload, and add a configurable context budget. If the budget is exhausted, leave additional targets on their CSS fallback. Pausing an instance saves rendering work but does not release its context.

### C. Internal modules

- `core`: instances, options, validation, public lifecycle.
- `scheduler`: shared animation loop and dirty-frame scheduling.
- `renderer`: context setup, shaders, buffers, uniforms, resource disposal.
- `effects`: procedural field implementations.
- `dither`: palette mapping and threshold algorithms.
- `dom`: sizing, visibility, motion preferences, host integration.
- `react`: optional adapter with no React dependency in the core entry point.

Avoid a complex renderer plugin system until a second rendering strategy proves necessary.

## 4. Visual pipeline

Keep the underlying animation separate from the dither pattern:

1. Generate a normalized scalar field from local coordinates and time.
2. Map that field through an ordered palette of color stops.
3. Use a threshold to choose between adjacent palette colors.
4. Output the selected color.

For the first version, palettes are ordered ramps—not arbitrary nearest-color palettes. Define behavior for one color, repeated colors, and invalid colors. Normalize accepted CSS color inputs before passing them to the GPU.

### Initial effects

- **Gradient:** inexpensive moving linear/radial field; useful for correctness and baseline performance.
- **Waves:** layered sine fields with a smooth, deliberate rhythm.
- **Aurora:** domain-warped noise with bounded octave counts; expensive quality tiers must be explicit.

### Initial dither modes

- **Bayer:** ordered threshold pattern with a crisp, graphic appearance.
- **Static noise:** deterministic seeded thresholds, fixed in local space.
- **None:** undithered reference mode for comparison and debugging.

Animate the field while keeping the threshold pattern stable by default. Temporal noise can be explored later, after testing flicker and visual comfort. A blue-noise texture is a later quality improvement, not a prerequisite.

Keep these concepts separate:

- `scale`: size of structures in the procedural field.
- `pixelSize`: dither cell size in CSS pixels.
- `resolutionScale`: internal rendering resolution/performance setting.

Specify coordinate conversion so changing device pixel ratio does not unexpectedly change the artistic scale. Test low-resolution rendering for blur and aliasing of the dither grid.

## 5. Proposed public API

```ts
const background = createDither(element, {
  preset: 'aurora',
  colors: ['#101124', '#6155ba', '#efb7d2'],
  dither: 'bayer',
  pixelSize: 2,
  scale: 1,
  intensity: 1,
  speed: 0.25,
  seed: 42,
  maxDpr: 1.5,
  resolutionScale: 1,
  reducedMotion: 'static',
});

background.update({ speed: 0.1 });
background.pause();
background.resume();
background.destroy();
```

API behavior:

- `update()` applies supported changes without remounting the canvas.
- `pause()` freezes animation; resize or option changes may still trigger a single redraw.
- `resume()` respects document visibility, intersection state, and reduced-motion preferences.
- `destroy()` is idempotent and removes only library-owned resources.
- Unsupported graphics or context-budget exhaustion preserve the CSS fallback without breaking the page.
- Invalid options produce useful diagnostics; rendering failures should not crash the host application.
- Imports are SSR-safe: no `window` or `document` access at module evaluation time.

Finalize option names after the visual prototype, before publishing.

## 6. Delivery phases

### Phase 1 — Prove the rendering and host model

Set up a minimal TypeScript/Vite playground. Build one fullscreen-triangle WebGL2 renderer and mount it inside a real DOM section.

Implement a static gradient, a two-color Bayer dither, and basic animation. Build test fixtures for rounded cards, opaque ancestors, nested scroll areas, transforms, and overlapping elements.

**Exit criteria:** the canvas behaves as a local background, never intercepts clicks, and does not require manual tracking of page scroll positions. The base effect looks good on desktop and a real mobile device.

### Phase 2 — Establish the visual language

Implement the three presets, ordered palette stops, static-noise thresholds, and seed-based repeatability. Add a playground with side-by-side dithered/undithered views and controls for every artistic parameter.

Curate a small set of named configurations rather than exposing dozens of noise parameters.

**Exit criteria:** each preset is visibly distinct; changing pixel ratio preserves its CSS-space scale; paused renders are deterministic for a given configuration, size, and time.

### Phase 3 — Extract the core library

Separate the playground from the library. Implement the public lifecycle API, option validation, shared scheduler, lazy context allocation, and configurable context budget.

Handle resize, zero-size targets, page visibility, intersection changes, runtime motion-preference changes, and WebGL context loss/restoration. Do not assume initialization requires IntersectionObserver callbacks to have already fired.

Pause simulation time while inactive to avoid unexpected jumps on resume. Redraw static/reduced-motion instances only when dirty. On context loss, reveal the fallback; on restoration, rebuild GPU resources and render again.

**Exit criteria:** repeated create/update/destroy cycles leave no owned canvases, observers, listeners, animation callbacks, or GPU resources behind. No animation frames are continuously scheduled when every instance is inactive or static.

### Phase 4 — Performance and accessibility pass

Benchmark representative workloads:

- One desktop hero at DPR 1 and 2.
- One mobile hero on actual mobile hardware.
- Three visible cards.
- Several registered targets with only one visible.
- All targets offscreen or the browser tab hidden.
- Reduced motion enabled before mount and toggled afterward.

Measure JavaScript frame cost, frame cadence, drawing-buffer dimensions, context count, and GPU time where timer queries are supported. Do not treat low JavaScript time as proof of low GPU cost.

Start with explicit quality controls: capped DPR, resolution scale, bounded noise octaves, and optional frame-rate limits. Only add adaptive quality if measurements justify its complexity; if added, use hysteresis to avoid constant quality changes.

Target smooth 60 fps on a documented reference desktop, with a documented 30 fps/lower-resolution mode for constrained devices. These are validation targets, not blanket hardware guarantees.

Mark canvases decorative and hidden from assistive technology. Preserve meaningful content and fallback backgrounds. Explain that consumers remain responsible for text contrast across all animation states.

**Exit criteria:** publishable benchmark results and tested quality recommendations; reduced-motion mode produces a static background; the page remains usable when rendering fails.

### Phase 5 — Developer integrations

Add optional declarative initialization:

```html
<section class="dither-host" data-dither="aurora">...</section>
```

Provide a root-scoped initializer that returns a cleanup handle. Use MutationObserver only for the declarative mode, batch mutation processing, avoid reacting to the library's own canvas insertion, and handle targets moved within the root without unnecessary teardown.

Add a React component with safe effect cleanup, updates, ref handling, and Strict Mode remount behavior. Server output should already contain the wrapper and CSS fallback; GPU initialization happens only on the client.

**Exit criteria:** plain DOM and React examples share the same renderer and lifecycle code; declarative initialization is idempotent and handles additions/removals correctly.

### Phase 6 — Package and release

Ship ESM and type declarations with separate core and React exports. Keep the core dependency-light. Measure and publish minified/gzipped sizes before setting a durable bundle-size budget.

Document installation, host CSS requirements, presets, performance controls, accessibility, cleanup, SSR, supported browsers, and the intended instance count. Include a troubleshooting section for stacking and graphics failures.

**Exit criteria:** a fresh vanilla app and a fresh React app can install the package and reproduce the documented examples without repository-specific setup.

## 7. Testing strategy

### Unit tests

- Option validation and update merging.
- Palette normalization and threshold generation.
- CSS-pixel/device-pixel coordinate math.
- Seed repeatability.
- Scheduler state transitions and context-budget decisions.

### Browser integration tests

- Mount/update/destroy and duplicate initialization.
- Target resize, zero-size targets, ancestor clipping, and border radii.
- Opaque ancestors, transforms, nested scroll containers, and overlapping targets.
- Click/focus behavior and absence of layout shifts caused by the canvas.
- Visibility and reduced-motion state transitions.
- Context loss/restoration using `WEBGL_lose_context` where supported.
- Fallback behavior with WebGL unavailable or the context budget exhausted.
- React Strict Mode and SSR import safety.

### Visual tests

Freeze time and seed in test fixtures. Use screenshot tolerances because GPU/browser output can differ. Cover each preset, one- and multi-color palettes, several pixel sizes, multiple DPR values, and reduced resolution.

Use Chromium, Firefox, and WebKit automation where available; supplement with real Safari/iOS and Android browser checks. Software-rendered CI does not establish mobile GPU performance.

## 8. Later experiment: shared-canvas mode

Only attempt this after measuring a genuine need for many simultaneous backgrounds.

The initial shared mode supports explicitly opted-in, non-overlapping, axis-aligned regions in a common visual layer. It does not claim to reproduce arbitrary DOM stacking, transforms, clipping, masks, or opacity.

Implementation sketch:

- One canvas attached to an explicit effect-layer container.
- Batched target rectangle reads, including movement while animating.
- Intersection culling and clipped scissor rectangles.
- Local coordinates preserved when a target is partially offscreen.
- Explicit target draw order and clearing behavior.
- Rounded-corner clipping in the shader where supported.

Scissor and viewport coordinate conversion must account for canvas location, DPR, and WebGL's bottom-left origin. Observers alone do not track every position change.

Compare this against local canvases using the same visual and performance fixtures. If the shared approach requires transparent ancestors or restrictions users routinely violate, keep it a specialized API rather than making it the default.

A worker/OffscreenCanvas renderer or a shared renderer copying into local canvases can be investigated separately. Neither automatically fixes DOM compositing or removes transfer/compositing costs.

## 9. First concrete milestone

Build one polished demo page with:

1. An animated dithered hero.
2. A rounded card inside an opaque parent.
3. A second card inside a scrolling container.
4. Palette, preset, pixel-size, and speed controls.
5. A deterministic static-preview mode and a CSS fallback.

This milestone answers the two highest-risk questions early: **does it look good, and does it behave like a background?** Packaging, React ergonomics, and shared-canvas optimization follow only after those answers are yes.
