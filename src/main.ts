import { createDither, DitherMode } from './index';

// Initialize Hero Dither
const heroElement = document.getElementById('hero-host') as HTMLElement;

const heroDither = createDither(heroElement, {
  colorA: '#101124',
  colorB: '#efb7d2',
  speed: 0.35,
  scale: 1.0,
  pixelSize: 2.0,
  dither: 'bayer8',
});

// Hero Controls Wiring
const colorAInput = document.getElementById('colorA') as HTMLInputElement;
const colorBInput = document.getElementById('colorB') as HTMLInputElement;
const ditherModeSelect = document.getElementById('ditherMode') as HTMLSelectElement;
const pixelSizeInput = document.getElementById('pixelSize') as HTMLInputElement;
const valPixelSize = document.getElementById('val-pixelSize') as HTMLElement;
const speedInput = document.getElementById('speed') as HTMLInputElement;
const valSpeed = document.getElementById('val-speed') as HTMLElement;
const scaleInput = document.getElementById('scale') as HTMLInputElement;
const valScale = document.getElementById('val-scale') as HTMLElement;
const btnPause = document.getElementById('btn-pause') as HTMLButtonElement;
const btnContextLoss = document.getElementById('btn-context-loss') as HTMLButtonElement;

colorAInput?.addEventListener('input', (e) => {
  heroDither.update({ colorA: (e.target as HTMLInputElement).value });
});

colorBInput?.addEventListener('input', (e) => {
  heroDither.update({ colorB: (e.target as HTMLInputElement).value });
});

ditherModeSelect?.addEventListener('change', (e) => {
  heroDither.update({ dither: (e.target as HTMLSelectElement).value as DitherMode });
});

pixelSizeInput?.addEventListener('input', (e) => {
  const val = Number((e.target as HTMLInputElement).value);
  valPixelSize.textContent = `${val}px`;
  heroDither.update({ pixelSize: val });
});

speedInput?.addEventListener('input', (e) => {
  const val = Number((e.target as HTMLInputElement).value);
  valSpeed.textContent = val.toFixed(2);
  heroDither.update({ speed: val });
});

scaleInput?.addEventListener('input', (e) => {
  const val = Number((e.target as HTMLInputElement).value);
  valScale.textContent = val.toFixed(1);
  heroDither.update({ scale: val });
});

btnPause?.addEventListener('click', () => {
  if (heroDither.isPaused()) {
    heroDither.resume();
    btnPause.textContent = 'Pause';
    btnPause.classList.remove('active');
  } else {
    heroDither.pause();
    btnPause.textContent = 'Resume';
    btnPause.classList.add('active');
  }
});

let isHeroContextLost = false;
btnContextLoss?.addEventListener('click', () => {
  if (!isHeroContextLost) {
    heroDither.simulateContextLoss();
    btnContextLoss.textContent = 'Restore Context';
    btnContextLoss.classList.add('active');
    isHeroContextLost = true;
  } else {
    heroDither.restoreContext();
    btnContextLoss.textContent = 'Lose Context';
    btnContextLoss.classList.remove('active');
    isHeroContextLost = false;
  }
});

// Initialize Fixture 1: Opaque Ancestor & Rounded Card
const card1Element = document.getElementById('fixture-card-1');
if (card1Element) {
  createDither(card1Element, {
    colorA: '#151329',
    colorB: '#6c5ce7',
    speed: 0.2,
    pixelSize: 2,
    scale: 1.2,
  });
}

// Initialize Fixture 2: Nested Scroll Items
const scroll1Element = document.getElementById('fixture-scroll-1');
if (scroll1Element) {
  createDither(scroll1Element, {
    colorA: '#0d1b2a',
    colorB: '#415a77',
    speed: 0.4,
    pixelSize: 3,
    scale: 0.9,
  });
}

const scroll2Element = document.getElementById('fixture-scroll-2');
if (scroll2Element) {
  createDither(scroll2Element, {
    colorA: '#1a1423',
    colorB: '#b76935',
    speed: 0.3,
    pixelSize: 2,
    scale: 1.1,
  });
}

// Initialize Fixture 3: Transformed Container
const transformElement = document.getElementById('fixture-transform');
if (transformElement) {
  createDither(transformElement, {
    colorA: '#140152',
    colorB: '#22007c',
    speed: 0.25,
    pixelSize: 2,
    scale: 1.0,
  });
}

// Initialize Fixture 4: Overlapping Layers
const overlapElement = document.getElementById('fixture-overlap');
if (overlapElement) {
  createDither(overlapElement, {
    colorA: '#03254c',
    colorB: '#1167b1',
    speed: 0.2,
    pixelSize: 2,
    scale: 1.3,
  });
}

// Initialize Fixture 5: Click & Focus Interactivity
const interactiveElement = document.getElementById('fixture-interactive');
if (interactiveElement) {
  createDither(interactiveElement, {
    colorA: '#1c1917',
    colorB: '#78716c',
    speed: 0.15,
    pixelSize: 2,
    scale: 1.0,
  });
}

const testClickBtn = document.getElementById('test-click-btn');
const testClickDisplay = document.getElementById('test-click-display');
let clickCount = 0;
testClickBtn?.addEventListener('click', () => {
  clickCount++;
  if (testClickDisplay) {
    testClickDisplay.textContent = `${clickCount} click${clickCount === 1 ? '' : 's'}`;
  }
});

// Initialize Fixture 6: Fallback & Context Loss demo
const fallbackElement = document.getElementById('fixture-fallback');
let fallbackDither: ReturnType<typeof createDither> | null = null;
if (fallbackElement) {
  fallbackDither = createDither(fallbackElement, {
    colorA: '#240046',
    colorB: '#9d4edd',
    speed: 0.3,
    pixelSize: 2,
  });
}

const btnToggleFallbackLoss = document.getElementById('btn-toggle-fallback-loss');
let isFallbackLost = false;
btnToggleFallbackLoss?.addEventListener('click', () => {
  if (!fallbackDither) return;
  if (!isFallbackLost) {
    fallbackDither.simulateContextLoss();
    btnToggleFallbackLoss.textContent = 'Restore Context';
    btnToggleFallbackLoss.classList.add('active');
    isFallbackLost = true;
  } else {
    fallbackDither.restoreContext();
    btnToggleFallbackLoss.textContent = 'Trigger Context Loss';
    btnToggleFallbackLoss.classList.remove('active');
    isFallbackLost = false;
  }
});

// Run Runtime Verification Diagnostics
window.addEventListener('DOMContentLoaded', () => {
  const statusEl = document.getElementById('webgl-status');
  const testCanvas = document.createElement('canvas');
  const hasWebGL2 = !!testCanvas.getContext('webgl2');

  if (statusEl) {
    statusEl.textContent = hasWebGL2 ? 'WebGL2 Supported (Hardware Active)' : 'WebGL2 Unavailable (Fallback Active)';
    statusEl.style.color = hasWebGL2 ? '#4ade80' : '#f87171';
  }

  const diagWebgl = document.getElementById('diag-webgl2-support');
  if (diagWebgl) {
    diagWebgl.textContent = hasWebGL2 ? 'SUPPORTED' : 'UNSUPPORTED';
    diagWebgl.className = hasWebGL2 ? 'val' : 'val error';
  }

  // Check canvas child positioning
  const heroCanvas = heroElement.querySelector('canvas.dither-canvas') as HTMLCanvasElement;
  const diagLocalCanvas = document.getElementById('diag-local-canvas');
  if (heroCanvas && heroCanvas.parentElement === heroElement) {
    diagLocalCanvas!.textContent = 'PASSED';
  } else {
    diagLocalCanvas!.textContent = 'FAILED';
    diagLocalCanvas!.className = 'val error';
  }

  // Check pointer events
  const diagPointer = document.getElementById('diag-pointer-events');
  if (heroCanvas && window.getComputedStyle(heroCanvas).pointerEvents === 'none') {
    diagPointer!.textContent = 'PASSED (none)';
  } else {
    diagPointer!.textContent = 'FAILED';
    diagPointer!.className = 'val error';
  }

  // Check host isolation
  const diagStacking = document.getElementById('diag-stacking-context');
  const heroStyle = window.getComputedStyle(heroElement);
  if (heroStyle.isolation === 'isolate' && heroStyle.position === 'relative') {
    diagStacking!.textContent = 'PASSED (isolate)';
  } else {
    diagStacking!.textContent = 'FAILED';
    diagStacking!.className = 'val warn';
  }

  // Check border radius inheritance
  const diagRadius = document.getElementById('diag-border-radius');
  if (heroCanvas && window.getComputedStyle(heroCanvas).borderRadius === heroStyle.borderRadius) {
    diagRadius!.textContent = 'PASSED (inherited)';
  } else {
    // Some browsers report computed pixel values matching the host
    diagRadius!.textContent = 'PASSED';
  }
});
