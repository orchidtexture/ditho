export type DitherMode = 'bayer8' | 'bayer4' | 'noise' | 'none';
export type PresetType = 'gradient' | 'waves' | 'aurora';

export interface DitherOptions {
  /** Procedural field algorithm */
  preset?: PresetType;
  /** Ordered palette ramp of CSS colors (e.g. hex, rgb). Minimum 1 color. */
  colors?: string[];
  /** Dithering algorithm */
  dither?: DitherMode;
  /** Dither cell size in CSS pixels */
  pixelSize?: number;
  /** Procedural structure spatial scale */
  scale?: number;
  /** Contrast / field modulation intensity (0.0 to 2.0, default 1.0) */
  intensity?: number;
  /** Animation speed multiplier (0 = static) */
  speed?: number;
  /** Seed for deterministic randomness */
  seed?: number;
  /** Cap device pixel ratio to protect GPU fillrate (default 2.0) */
  maxDpr?: number;
  /** Internal rendering resolution scale (0.25 to 1.0, default 1.0) */
  resolutionScale?: number;
  /** Pause animation */
  paused?: boolean;
}

export interface DitherInstance {
  readonly element: HTMLElement;
  readonly canvas: HTMLCanvasElement;
  update(options: Partial<DitherOptions>): void;
  pause(): void;
  resume(): void;
  destroy(): void;
  isPaused(): boolean;
  simulateContextLoss(): void;
  restoreContext(): void;
}
