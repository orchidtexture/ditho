export type DitherMode = 'bayer8' | 'bayer4' | 'noise' | 'none';
export type PresetType = 'aurora' | 'waves' | 'gradient';
export type ReducedMotionPolicy = 'system' | 'static' | 'reduce' | 'off';

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
  /** Reduced motion policy ('system' follows OS preference, 'static' freezes animation, 'off' ignores OS) */
  reducedMotion?: ReducedMotionPolicy;
  /** Pause animation */
  paused?: boolean;
}

export type ValidatedDitherOptions = Required<DitherOptions>;

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
  /** Testing utility: simulate WebGL context loss */
  simulateContextLoss(): void;
  /** Testing utility: restore WebGL context */
  restoreContext(): void;
}
