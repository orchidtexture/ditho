import { describe, it, expect } from 'vitest';
import { parseColor } from '../src/renderer/color';

describe('parseColor', () => {
  it('parses standard 6-digit hex colors', () => {
    expect(parseColor('#000000')).toEqual([0, 0, 0]);
    expect(parseColor('#ffffff')).toEqual([1, 1, 1]);
    expect(parseColor('#ff0000')).toEqual([1, 0, 0]);
  });

  it('parses 3-digit shorthand hex colors', () => {
    expect(parseColor('#000')).toEqual([0, 0, 0]);
    expect(parseColor('#fff')).toEqual([1, 1, 1]);
    expect(parseColor('#f00')).toEqual([1, 0, 0]);
  });

  it('parses rgb() syntax strings', () => {
    expect(parseColor('rgb(255, 128, 0)')).toEqual([1, 128 / 255, 0]);
  });

  it('falls back to default color on invalid inputs', () => {
    const fallback: [number, number, number] = [0.5, 0.5, 0.5];
    expect(parseColor('invalid-color', fallback)).toEqual(fallback);
    expect(parseColor('', fallback)).toEqual(fallback);
  });
});
