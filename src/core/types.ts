export type DitherMode = 'bayer4' | 'bayer8' | 'none';

export interface DitherOptions {
  colorA?: string;
  colorB?: string;
  speed?: number;
  scale?: number;
  pixelSize?: number;
  dither?: DitherMode;
  maxDpr?: number;
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
