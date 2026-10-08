export type DitherMode = 'bayer8' | 'bayer4' | 'noise' | 'none';
export type PresetType = 'aurora' | 'waves' | 'gradient';
export type ReducedMotionPolicy = 'system' | 'static' | 'reduce' | 'off';

export interface PerformanceMetrics {
  /** Smoothed frames per second */
  fps: number;
  /** JavaScript CPU frame duration in milliseconds */
  frameTimeMs: number;
  /** GPU time in milliseconds from timer queries (null if EXT_disjoint_timer_query_webgl2 is unavailable or disjoint) */
  gpuTimeMs: number | null;
  /** Canvas drawing buffer width in physical pixels */
  bufferWidth: number;
  /** Canvas drawing buffer height in physical pixels */
  bufferHeight: number;
  /** Total pixels rendered per frame */
  pixelCount: number;
  /** Device pixel ratio applied */
  dpr: number;
}

export interface DitherOptions {
  /** Procedural field algorithm */
  preset?: PresetType;
  /** Ordered palette ramp of CSS colors (e.g. hex, rgb). Minimum 1 color. */
  colors?: string[];
  /** Dithering algorithm */
  dither?: DitherMode;
  /** Dither cell size in CSS pixels (min: 1) */
  pixelSize?: number;
  /** Procedural structure spatial scale */
  scale?: number;
  /** Contrast / field modulation intensity */
  intensity?: number;
  /** Animation speed multiplier (0 = static) */
  speed?: number;
  /** Seed for deterministic randomness */
  seed?: number;
  /** Cap device pixel ratio to protect GPU fillrate (default 2.0) */
  maxDpr?: number;
  /** Internal rendering resolution scale (0.1 to 1.0, default 1.0) */
  resolutionScale?: number;
  /** Optional frame rate limit (e.g. 30 fps for power saving or mobile, null or undefined for uncapped/display refresh) */
  fpsLimit?: number | null;
  /** Reduced motion policy ('system' follows OS preference, 'static' freezes animation, 'off' ignores OS) */
  reducedMotion?: ReducedMotionPolicy;
  /** Pause animation */
  paused?: boolean;
}

export type ValidatedDitherOptions = Required<Omit<DitherOptions, 'fpsLimit'>> & { fpsLimit: number | null };

export interface DitherInstance {
  /** Target DOM element */
  readonly element: HTMLElement;
  /** Internal canvas element (null if WebGL unsupported or context budget exceeded) */
  readonly canvas: HTMLCanvasElement | null;
  /** Update options with automatic dirty-redraw */
  update(options: Partial<DitherOptions>): void;
  /** Freeze animation without releasing GPU resources */
  pause(): void;
  /** Resume animation */
  resume(): void;
  /** Remove all DOM elements, event listeners, observers, and GPU resources */
  destroy(): void;
  /** Check if instance is paused */
  isPaused(): boolean;
  /** Check if instance is currently falling back to CSS (unsupported or budget exhausted) */
  isFallbackActive(): boolean;
  /** Query real-time performance and rendering metrics */
  getMetrics(): PerformanceMetrics;
  /** Testing utility: simulate WebGL context loss */
  simulateContextLoss(): void;
  /** Testing utility: restore WebGL context */
  restoreContext(): void;
}
