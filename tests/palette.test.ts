import { describe, it, expect } from 'vitest';
import { normalizePalette, MAX_PALETTE_COLORS, DEFAULT_PALETTE } from '../src/renderer/color';

describe('normalizePalette', () => {
  it('falls back to default palette when colors array is undefined or empty', () => {
    const emptyResult = normalizePalette([]);
    expect(emptyResult.count).toBe(DEFAULT_PALETTE.length);

    const undefinedResult = normalizePalette(undefined);
    expect(undefinedResult.count).toBe(DEFAULT_PALETTE.length);
  });

  it('generates a 2-stop tonal ramp when only 1 color is provided', () => {
    const result = normalizePalette(['#ff0000']);
    expect(result.count).toBe(2);
    // Base color should be pure red [1, 0, 0]
    expect(result.colors[1]).toEqual([1, 0, 0]);
    // Dark tone should be scaled down version [0.35, 0, 0]
    expect(result.colors[0][0]).toBeCloseTo(0.35);
    expect(result.colors[0][1]).toBe(0);
    expect(result.colors[0][2]).toBe(0);
  });

  it('correctly normalizes multi-stop palettes with 3 to 8 stops', () => {
    const palette = ['#000000', '#333333', '#666666', '#999999', '#ffffff'];
    const result = normalizePalette(palette);
    expect(result.count).toBe(5);
    expect(result.colors.length).toBe(5);
    expect(result.flatArray.length).toBe(MAX_PALETTE_COLORS * 3);

    // Verify first stop is black
    expect(result.flatArray[0]).toBe(0);
    expect(result.flatArray[1]).toBe(0);
    expect(result.flatArray[2]).toBe(0);

    // Verify last stop is white
    expect(result.flatArray[4 * 3 + 0]).toBe(1);
    expect(result.flatArray[4 * 3 + 1]).toBe(1);
    expect(result.flatArray[4 * 3 + 2]).toBe(1);
  });

  it('clamps colors exceeding MAX_PALETTE_COLORS (8)', () => {
    const nineColors = [
      '#111111', '#222222', '#333333', '#444444',
      '#555555', '#666666', '#777777', '#888888', '#999999',
    ];
    const result = normalizePalette(nineColors);
    expect(result.count).toBe(MAX_PALETTE_COLORS);
    expect(result.colors.length).toBe(MAX_PALETTE_COLORS);
  });

  it('gracefully handles malformed color strings', () => {
    const result = normalizePalette(['invalid-hex', '#ffffff']);
    expect(result.count).toBe(2);
    // Invalid hex falls back without throwing
    expect(result.colors[0]).toBeDefined();
    expect(result.colors[1]).toEqual([1, 1, 1]);
  });
});
