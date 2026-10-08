export type RGB = [number, number, number];

export const MAX_PALETTE_COLORS = 8;
export const DEFAULT_PALETTE: string[] = ['#101124', '#efb7d2'];

/**
 * Normalizes CSS hex color (#RGB, #RRGGBB) or rgb() syntax to [r, g, b] float range 0.0 - 1.0.
 * Falls back to default color if input is invalid.
 */
export function parseColor(colorStr: string, fallback: RGB = [0, 0, 0]): RGB {
  if (!colorStr) return fallback;

  const hex = colorStr.trim().replace(/^#/, '');

  if (hex.length === 3) {
    const r = parseInt(hex[0] + hex[0], 16);
    const g = parseInt(hex[1] + hex[1], 16);
    const b = parseInt(hex[2] + hex[2], 16);
    if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
      return [r / 255, g / 255, b / 255];
    }
  } else if (hex.length === 6) {
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
      return [r / 255, g / 255, b / 255];
    }
  }

  const rgbMatch = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (rgbMatch) {
    const r = Number(rgbMatch[1]);
    const g = Number(rgbMatch[2]);
    const b = Number(rgbMatch[3]);
    if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
      return [
        Math.min(1, Math.max(0, r / 255)),
        Math.min(1, Math.max(0, g / 255)),
        Math.min(1, Math.max(0, b / 255)),
      ];
    }
  }

  return fallback;
}

export interface NormalizedPalette {
  colors: RGB[];
  flatArray: Float32Array;
  count: number;
}

/**
 * Normalizes an ordered array of color strings into a GPU-ready buffer.
 * - Handles 0 colors by providing default palette.
 * - Handles 1 color by creating a two-stop tonal range (darkened version to base).
 * - Caps colors at MAX_PALETTE_COLORS (8).
 * - Packs into a flat Float32Array suitable for gl.uniform3fv.
 */
export function normalizePalette(rawColors?: string[]): NormalizedPalette {
  let colorsList = rawColors && rawColors.length > 0 ? rawColors : DEFAULT_PALETTE;

  // Single color edge case: generate a 2-stop ramp (deep tone -> original color)
  if (colorsList.length === 1) {
    const base = parseColor(colorsList[0], [0.1, 0.1, 0.2]);
    const dark: RGB = [base[0] * 0.35, base[1] * 0.35, base[2] * 0.35];
    const parsed: RGB[] = [dark, base];
    return packPalette(parsed);
  }

  // Parse each color, falling back if invalid
  const parsed: RGB[] = colorsList
    .slice(0, MAX_PALETTE_COLORS)
    .map((c, i) => {
      const fallback: RGB = i === 0 ? [0.06, 0.07, 0.14] : [0.94, 0.72, 0.82];
      return parseColor(c, fallback);
    });

  return packPalette(parsed);
}

function packPalette(colors: RGB[]): NormalizedPalette {
  const flat = new Float32Array(MAX_PALETTE_COLORS * 3);
  for (let i = 0; i < MAX_PALETTE_COLORS; i++) {
    const c = i < colors.length ? colors[i] : colors[colors.length - 1];
    flat[i * 3 + 0] = c[0];
    flat[i * 3 + 1] = c[1];
    flat[i * 3 + 2] = c[2];
  }
  return {
    colors,
    flatArray: flat,
    count: colors.length,
  };
}
