export type RGB = [number, number, number];

/**
 * Normalizes CSS hex color (#RGB, #RRGGBB) to [r, g, b] float range 0.0 - 1.0.
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

  // Support rgb(r, g, b) basic syntax if provided
  const rgbMatch = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (rgbMatch) {
    const r = Number(rgbMatch[1]);
    const g = Number(rgbMatch[2]);
    const b = Number(rgbMatch[3]);
    return [r / 255, g / 255, b / 255];
  }

  return fallback;
}
