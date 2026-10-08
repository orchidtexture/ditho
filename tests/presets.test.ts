import { describe, it, expect } from 'vitest';
import { PRESETS } from '../src/presets';

describe('Curated Presets', () => {
  it('defines all required core presets', () => {
    expect(PRESETS.aurora).toBeDefined();
    expect(PRESETS.cyber).toBeDefined();
    expect(PRESETS.ocean).toBeDefined();
    expect(PRESETS.monochrome).toBeDefined();
    expect(PRESETS.orchid).toBeDefined();
  });

  it('covers all three procedural preset algorithms', () => {
    const algorithms = Object.values(PRESETS).map((p) => p.options.preset);
    expect(algorithms).toContain('aurora');
    expect(algorithms).toContain('waves');
    expect(algorithms).toContain('gradient');
  });

  it('covers ordered bayer and static noise dither modes', () => {
    const ditherModes = Object.values(PRESETS).map((p) => p.options.dither);
    expect(ditherModes).toContain('bayer8');
    expect(ditherModes).toContain('bayer4');
    expect(ditherModes).toContain('noise');
  });

  it('ensures each preset has valid color ramps with at least 2 stops', () => {
    Object.values(PRESETS).forEach((preset) => {
      expect(preset.name).toBeTruthy();
      expect(preset.description).toBeTruthy();
      expect(preset.options.colors).toBeDefined();
      expect(preset.options.colors!.length).toBeGreaterThanOrEqual(2);
      expect(preset.options.seed).toBeDefined();
    });
  });
});
