import { DitherOptions, ValidatedDitherOptions, PresetType, DitherMode, ReducedMotionPolicy } from './types';

export const DEFAULT_OPTIONS: ValidatedDitherOptions = {
  preset: 'aurora',
  colors: ['#101124', '#6155ba', '#efb7d2'],
  dither: 'bayer8',
  pixelSize: 2,
  scale: 1.0,
  intensity: 1.0,
  speed: 0.25,
  seed: 42,
  maxDpr: 2.0,
  resolutionScale: 1.0,
  reducedMotion: 'system',
  paused: false,
};

const VALID_PRESETS: Set<PresetType> = new Set(['aurora', 'waves', 'gradient']);
const VALID_DITHER: Set<DitherMode> = new Set(['bayer8', 'bayer4', 'noise', 'none']);
const VALID_REDUCED_MOTION: Set<ReducedMotionPolicy> = new Set(['system', 'static', 'reduce', 'off']);

/**
 * Validates, sanitizes, and merges user-supplied options against defaults.
 * Never throws errors to ensure the host application remains stable.
 */
export function validateOptions(
  userOptions: Partial<DitherOptions> = {},
  currentOptions: ValidatedDitherOptions = DEFAULT_OPTIONS
): ValidatedDitherOptions {
  const merged: ValidatedDitherOptions = { ...currentOptions };

  // Preset
  if (userOptions.preset !== undefined) {
    if (VALID_PRESETS.has(userOptions.preset)) {
      merged.preset = userOptions.preset;
    } else {
      console.warn(`[Ditho] Invalid preset "${userOptions.preset}". Using "${merged.preset}".`);
    }
  }

  // Colors
  if (userOptions.colors !== undefined) {
    if (Array.isArray(userOptions.colors) && userOptions.colors.length > 0) {
      merged.colors = userOptions.colors;
    } else {
      console.warn(`[Ditho] colors must be a non-empty array of CSS color strings.`);
    }
  }

  // Dither mode
  if (userOptions.dither !== undefined) {
    if (VALID_DITHER.has(userOptions.dither)) {
      merged.dither = userOptions.dither;
    } else {
      console.warn(`[Ditho] Invalid dither mode "${userOptions.dither}". Using "${merged.dither}".`);
    }
  }

  // Pixel size (min 1, clamp to sensible maximum)
  if (userOptions.pixelSize !== undefined) {
    if (typeof userOptions.pixelSize === 'number' && !isNaN(userOptions.pixelSize)) {
      merged.pixelSize = Math.max(1, Math.min(64, Math.round(userOptions.pixelSize)));
    }
  }

  // Scale (must be positive)
  if (userOptions.scale !== undefined) {
    if (typeof userOptions.scale === 'number' && !isNaN(userOptions.scale) && userOptions.scale > 0) {
      merged.scale = Math.max(0.05, Math.min(10.0, userOptions.scale));
    }
  }

  // Intensity (contrast multiplier)
  if (userOptions.intensity !== undefined) {
    if (typeof userOptions.intensity === 'number' && !isNaN(userOptions.intensity)) {
      merged.intensity = Math.max(0.0, Math.min(5.0, userOptions.intensity));
    }
  }

  // Speed (animation rate)
  if (userOptions.speed !== undefined) {
    if (typeof userOptions.speed === 'number' && !isNaN(userOptions.speed)) {
      merged.speed = Math.max(0.0, Math.min(10.0, userOptions.speed));
    }
  }

  // Seed
  if (userOptions.seed !== undefined) {
    if (typeof userOptions.seed === 'number' && !isNaN(userOptions.seed)) {
      merged.seed = Math.max(0, Math.floor(userOptions.seed));
    }
  }

  // maxDpr
  if (userOptions.maxDpr !== undefined) {
    if (typeof userOptions.maxDpr === 'number' && !isNaN(userOptions.maxDpr) && userOptions.maxDpr > 0) {
      merged.maxDpr = Math.max(0.5, Math.min(4.0, userOptions.maxDpr));
    }
  }

  // resolutionScale
  if (userOptions.resolutionScale !== undefined) {
    if (typeof userOptions.resolutionScale === 'number' && !isNaN(userOptions.resolutionScale)) {
      merged.resolutionScale = Math.max(0.1, Math.min(1.0, userOptions.resolutionScale));
    }
  }

  // reducedMotion policy
  if (userOptions.reducedMotion !== undefined) {
    if (VALID_REDUCED_MOTION.has(userOptions.reducedMotion)) {
      merged.reducedMotion = userOptions.reducedMotion;
    }
  }

  // Paused
  if (userOptions.paused !== undefined) {
    merged.paused = Boolean(userOptions.paused);
  }

  return merged;
}
