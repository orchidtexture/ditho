import { describe, it, expect } from 'vitest';
import { validateOptions, DEFAULT_OPTIONS } from '../src/core/options';

describe('Option Validation (validateOptions)', () => {
  it('returns default options when empty object provided', () => {
    const opts = validateOptions({});
    expect(opts).toEqual(DEFAULT_OPTIONS);
  });

  it('clamps pixelSize to [1, 64]', () => {
    expect(validateOptions({ pixelSize: -5 }).pixelSize).toBe(1);
    expect(validateOptions({ pixelSize: 0 }).pixelSize).toBe(1);
    expect(validateOptions({ pixelSize: 100 }).pixelSize).toBe(64);
    expect(validateOptions({ pixelSize: 4.8 }).pixelSize).toBe(5);
  });

  it('clamps scale to positive bounds [0.05, 10.0]', () => {
    expect(validateOptions({ scale: -1 }).scale).toBe(DEFAULT_OPTIONS.scale);
    expect(validateOptions({ scale: 0.01 }).scale).toBe(0.05);
    expect(validateOptions({ scale: 20 }).scale).toBe(10.0);
  });

  it('clamps intensity and speed', () => {
    expect(validateOptions({ intensity: -2 }).intensity).toBe(0.0);
    expect(validateOptions({ intensity: 10 }).intensity).toBe(5.0);
    expect(validateOptions({ speed: -1 }).speed).toBe(0.0);
    expect(validateOptions({ speed: 20 }).speed).toBe(10.0);
  });

  it('falls back to default preset and dither on invalid string inputs', () => {
    const opts = validateOptions({ preset: 'invalid' as any, dither: 'fake' as any });
    expect(opts.preset).toBe(DEFAULT_OPTIONS.preset);
    expect(opts.dither).toBe(DEFAULT_OPTIONS.dither);
  });

  it('sanitizes resolutionScale and maxDpr', () => {
    expect(validateOptions({ resolutionScale: 0.01 }).resolutionScale).toBe(0.1);
    expect(validateOptions({ resolutionScale: 1.5 }).resolutionScale).toBe(1.0);
    expect(validateOptions({ maxDpr: 0.1 }).maxDpr).toBe(0.5);
    expect(validateOptions({ maxDpr: 10 }).maxDpr).toBe(4.0);
  });

  it('preserves existing options when merging partial updates', () => {
    const initial = validateOptions({ speed: 0.8, pixelSize: 4 });
    const updated = validateOptions({ scale: 2.0 }, initial);
    expect(updated.speed).toBe(0.8);
    expect(updated.pixelSize).toBe(4);
    expect(updated.scale).toBe(2.0);
  });
});
