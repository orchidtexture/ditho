import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

describe('Package & Distribution Exports (Phase 6 Exit Criteria)', () => {
  it('exports valid ESM entry points and declaration files in dist/', async () => {
    expect(existsSync(resolve(__dirname, '../dist/index.js'))).toBe(true);
    expect(existsSync(resolve(__dirname, '../dist/index.d.ts'))).toBe(true);
    expect(existsSync(resolve(__dirname, '../dist/react.js'))).toBe(true);
    expect(existsSync(resolve(__dirname, '../dist/react.d.ts'))).toBe(true);
    expect(existsSync(resolve(__dirname, '../dist/style.css'))).toBe(true);
  });

  it('dist/style.css contains the host contract styles without playground clutter', () => {
    const css = readFileSync(resolve(__dirname, '../dist/style.css'), 'utf-8');
    expect(css).toContain('.dither-host');
    expect(css).toContain('.dither-canvas');
    expect(css).toContain('isolation:isolate');
    expect(css).toContain('pointer-events:none');
    expect(css).not.toContain('.playground-header');
    expect(css).not.toContain('.preset-bar');
  });

  it('can dynamically import dist/index.js and access public API exports', async () => {
    const core = await import('../dist/index.js');
    expect(typeof core.createDither).toBe('function');
    expect(typeof core.initDither).toBe('function');
    expect(typeof core.setContextBudget).toBe('function');
    expect(core.PRESETS).toBeDefined();
    expect(core.PRESETS.aurora).toBeDefined();
  });

  it('can dynamically import dist/react.js and access React component export', async () => {
    const reactAdapter = await import('../dist/react.js');
    expect(reactAdapter.DitherBackground).toBeDefined();
  });
});
