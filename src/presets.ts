import { DitherOptions } from './core/types';

export interface PresetConfig {
  name: string;
  description: string;
  options: DitherOptions;
}

export const PRESETS: Record<string, PresetConfig> = {
  aurora: {
    name: 'Aurora Borealis',
    description: 'Domain-warped procedural field with rich ribbon transitions',
    options: {
      preset: 'aurora',
      colors: ['#050814', '#16235a', '#2f6991', '#88d49e', '#fef9e7'],
      dither: 'bayer8',
      pixelSize: 2,
      scale: 1.0,
      intensity: 1.1,
      speed: 0.22,
      seed: 42,
    },
  },
  cyber: {
    name: 'Cyber Sunset',
    description: 'Layered harmonic waves drifting into vibrant twilight',
    options: {
      preset: 'waves',
      colors: ['#180828', '#631858', '#b52f64', '#e26d5c', '#ffcd75'],
      dither: 'bayer8',
      pixelSize: 2,
      scale: 1.2,
      intensity: 1.0,
      speed: 0.3,
      seed: 108,
    },
  },
  ocean: {
    name: 'Deep Ocean',
    description: 'Subtle rolling aquatic sine field with deep oceanic depth',
    options: {
      preset: 'waves',
      colors: ['#03071e', '#002855', '#023e7d', '#0096c7', '#ade8f4'],
      dither: 'bayer4',
      pixelSize: 3,
      scale: 0.9,
      intensity: 0.9,
      speed: 0.25,
      seed: 7,
    },
  },
  monochrome: {
    name: 'Monochrome Grain',
    description: 'Clean angled gradient with deterministic static-noise dither',
    options: {
      preset: 'gradient',
      colors: ['#050508', '#22252e', '#6e7382', '#e4e7eb'],
      dither: 'noise',
      pixelSize: 2,
      scale: 1.0,
      intensity: 1.0,
      speed: 0.15,
      seed: 99,
    },
  },
  orchid: {
    name: 'Neon Orchid',
    description: 'Vivid magenta and electric violet aurora ribbons',
    options: {
      preset: 'aurora',
      colors: ['#0f051d', '#3d0c5a', '#851e7f', '#d14081', '#f5b5c8'],
      dither: 'bayer8',
      pixelSize: 2,
      scale: 1.15,
      intensity: 1.25,
      speed: 0.28,
      seed: 512,
    },
  },
};
