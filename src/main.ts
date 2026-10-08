import {
  createDither,
  DitherMode,
  PresetType,
  DitherOptions,
  ValidatedDitherOptions,
  ReducedMotionPolicy,
  getActiveContextCount,
  getContextBudget,
  setContextBudget,
  isSchedulerActive,
} from './index';
import { PRESETS } from './presets';
import { runBenchmarkSuite } from './benchmark/benchmark';

// Set playground budget high enough to support hero, comparison, and gallery cards simultaneously
setContextBudget(16);

// State for active hero configuration
let currentOptions: ValidatedDitherOptions = {
  preset: 'aurora',
  colors: ['#050814', '#16235a', '#2f6991', '#88d49e', '#fef9e7'],
  dither: 'bayer8',
  pixelSize: 2,
  scale: 1.0,
  intensity: 1.1,
  speed: 0.22,
  seed: 42,
  maxDpr: 2.0,
  resolutionScale: 1.0,
  fpsLimit: null,
  reducedMotion: 'system',
  paused: false,
};

// 1. Initialize Hero Stage
const heroElement = document.getElementById('hero-stage') as HTMLElement;
const heroDither = createDither(heroElement, currentOptions);

// 2. Initialize Side-by-Side Comparison Instances
const compDitherElement = document.getElementById('comp-dither-host') as HTMLElement;
const compSmoothElement = document.getElementById('comp-smooth-host') as HTMLElement;

const compDitherInstance = createDither(compDitherElement, {
  ...currentOptions,
});

const compSmoothInstance = createDither(compSmoothElement, {
  ...currentOptions,
  dither: 'none',
});

// DOM Control Elements
const selectPreset = document.getElementById('select-preset') as HTMLSelectElement;
const selectDither = document.getElementById('select-dither') as HTMLSelectElement;
const rangePixelSize = document.getElementById('range-pixelsize') as HTMLInputElement;
const valPixelSize = document.getElementById('val-pixelsize') as HTMLElement;
const rangeScale = document.getElementById('range-scale') as HTMLInputElement;
const valScale = document.getElementById('val-scale') as HTMLElement;
const rangeIntensity = document.getElementById('range-intensity') as HTMLInputElement;
const valIntensity = document.getElementById('val-intensity') as HTMLElement;
const rangeSpeed = document.getElementById('range-speed') as HTMLInputElement;
const valSpeed = document.getElementById('val-speed') as HTMLElement;
const inputSeed = document.getElementById('input-seed') as HTMLInputElement;
const btnRandSeed = document.getElementById('btn-rand-seed') as HTMLButtonElement;
const selectResScale = document.getElementById('select-res-scale') as HTMLSelectElement;
const selectReducedMotion = document.getElementById('select-reduced-motion') as HTMLSelectElement;
const selectFpsLimit = document.getElementById('select-fps-limit') as HTMLSelectElement;
const selectMaxDpr = document.getElementById('select-max-dpr') as HTMLSelectElement;
const btnPause = document.getElementById('btn-pause') as HTMLButtonElement;
const btnResetTime = document.getElementById('btn-reset-time') as HTMLButtonElement;
const btnContextLoss = document.getElementById('btn-context-loss') as HTMLButtonElement;

// Metric labels
const metricMode = document.getElementById('metric-mode') as HTMLElement;
const metricPixel = document.getElementById('metric-pixel') as HTMLElement;
const metricSeed = document.getElementById('metric-seed') as HTMLElement;
const metricScale = document.getElementById('metric-scale') as HTMLElement;
const heroTag = document.getElementById('hero-tag') as HTMLElement;
const heroTitle = document.getElementById('hero-title') as HTMLElement;
const heroDesc = document.getElementById('hero-desc') as HTMLElement;
const badgeCompDither = document.getElementById('badge-comp-dither') as HTMLElement;
const paletteCountEl = document.getElementById('palette-count') as HTMLElement;
const paletteSwatchesContainer = document.getElementById('palette-swatches-container') as HTMLElement;
const btnAddColor = document.getElementById('btn-add-color') as HTMLButtonElement;

function syncMetricsDisplay(): void {
  metricMode.textContent =
    currentOptions.dither === 'none'
      ? 'None (Continuous)'
      : currentOptions.dither === 'noise'
      ? 'Static Noise'
      : currentOptions.dither === 'bayer4'
      ? 'Bayer 4×4'
      : 'Bayer 8×8';

  metricPixel.textContent = `${currentOptions.pixelSize}px`;
  metricSeed.textContent = `${currentOptions.seed}`;
  metricScale.textContent = currentOptions.scale.toFixed(1);

  badgeCompDither.textContent = `${
    currentOptions.dither === 'none'
      ? 'None'
      : currentOptions.dither === 'noise'
      ? 'Static Noise'
      : currentOptions.dither.toUpperCase()
  } (${currentOptions.pixelSize}px)`;

  valPixelSize.textContent = `${currentOptions.pixelSize}px`;
  valScale.textContent = currentOptions.scale.toFixed(1);
  valIntensity.textContent = currentOptions.intensity.toFixed(2);
  valSpeed.textContent = currentOptions.speed.toFixed(2);
}

function updateAllInstances(partial: Partial<DitherOptions>): void {
  currentOptions = { ...currentOptions, ...partial };

  heroDither.update(partial);

  compDitherInstance.update(partial);

  // Smooth comparison stays dither: 'none'
  compSmoothInstance.update({
    ...partial,
    dither: 'none',
  });

  syncMetricsDisplay();
}

// Render dynamic color palette editor
function renderPaletteEditor(): void {
  paletteSwatchesContainer.innerHTML = '';
  paletteCountEl.textContent = `${currentOptions.colors.length}`;

  currentOptions.colors.forEach((color, idx) => {
    const item = document.createElement('div');
    item.className = 'color-stop-item';

    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.value = color.length === 7 ? color : '#ffffff';
    colorInput.addEventListener('input', (e) => {
      const newHex = (e.target as HTMLInputElement).value;
      const updated = [...currentOptions.colors];
      updated[idx] = newHex;
      hexLabel.textContent = newHex;
      updateAllInstances({ colors: updated });
    });

    const hexLabel = document.createElement('span');
    hexLabel.textContent = color;

    item.appendChild(colorInput);
    item.appendChild(hexLabel);

    if (currentOptions.colors.length > 2) {
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn-icon-danger';
      deleteBtn.textContent = '×';
      deleteBtn.title = 'Remove color stop';
      deleteBtn.addEventListener('click', () => {
        const updated = currentOptions.colors.filter((_, i) => i !== idx);
        updateAllInstances({ colors: updated });
        renderPaletteEditor();
      });
      item.appendChild(deleteBtn);
    }

    paletteSwatchesContainer.appendChild(item);
  });

  btnAddColor.disabled = currentOptions.colors.length >= 8;
}

// Add color stop handler
btnAddColor.addEventListener('click', () => {
  if (currentOptions.colors.length >= 8) return;
  // Blend between last two colors
  const lastColor = currentOptions.colors[currentOptions.colors.length - 1];
  const newColor = lastColor === '#ffffff' ? '#e26d5c' : '#ffffff';
  const updated = [...currentOptions.colors, newColor];
  updateAllInstances({ colors: updated });
  renderPaletteEditor();
});

// Event Listeners for Controls
selectPreset.addEventListener('change', (e) => {
  const preset = (e.target as HTMLSelectElement).value as PresetType;
  updateAllInstances({ preset });
  heroTag.textContent = `${preset.toUpperCase()} Preset`;
});

selectDither.addEventListener('change', (e) => {
  const dither = (e.target as HTMLSelectElement).value as DitherMode;
  updateAllInstances({ dither });
});

rangePixelSize.addEventListener('input', (e) => {
  const pixelSize = Number((e.target as HTMLInputElement).value);
  updateAllInstances({ pixelSize });
});

rangeScale.addEventListener('input', (e) => {
  const scale = Number((e.target as HTMLInputElement).value);
  updateAllInstances({ scale });
});

rangeIntensity.addEventListener('input', (e) => {
  const intensity = Number((e.target as HTMLInputElement).value);
  updateAllInstances({ intensity });
});

rangeSpeed.addEventListener('input', (e) => {
  const speed = Number((e.target as HTMLInputElement).value);
  updateAllInstances({ speed });
});

inputSeed.addEventListener('change', (e) => {
  const seed = parseInt((e.target as HTMLInputElement).value, 10) || 0;
  updateAllInstances({ seed });
});

btnRandSeed.addEventListener('click', () => {
  const seed = Math.floor(Math.random() * 100000);
  inputSeed.value = `${seed}`;
  updateAllInstances({ seed });
});

selectResScale.addEventListener('change', (e) => {
  const resolutionScale = parseFloat((e.target as HTMLSelectElement).value);
  updateAllInstances({ resolutionScale });
  const diagRes = document.getElementById('diag-res-status');
  if (diagRes) {
    diagRes.textContent = `${resolutionScale}x (Decoupled from CSS)`;
  }
});

selectReducedMotion?.addEventListener('change', (e) => {
  const policy = (e.target as HTMLSelectElement).value as ReducedMotionPolicy;
  updateAllInstances({ reducedMotion: policy });
  const diagMotion = document.getElementById('diag-motion-status');
  if (diagMotion) {
    diagMotion.textContent = `${policy.toUpperCase()} (Active)`;
  }
});

selectFpsLimit?.addEventListener('change', (e) => {
  const val = (e.target as HTMLSelectElement).value;
  const fpsLimit = val === 'uncapped' ? null : Number(val);
  updateAllInstances({ fpsLimit: fpsLimit as any });
});

selectMaxDpr?.addEventListener('change', (e) => {
  const maxDpr = parseFloat((e.target as HTMLSelectElement).value);
  updateAllInstances({ maxDpr });
});

btnPause.addEventListener('click', () => {
  if (heroDither.isPaused()) {
    heroDither.resume();
    compDitherInstance.resume();
    compSmoothInstance.resume();
    btnPause.textContent = 'Pause';
    btnPause.classList.remove('active');
  } else {
    heroDither.pause();
    compDitherInstance.pause();
    compSmoothInstance.pause();
    btnPause.textContent = 'Resume';
    btnPause.classList.add('active');
  }
});

btnResetTime.addEventListener('click', () => {
  // Deterministic pause check: update with speed 0 and pause
  heroDither.pause();
  compDitherInstance.pause();
  compSmoothInstance.pause();
  btnPause.textContent = 'Resume';
  btnPause.classList.add('active');
  updateAllInstances({ speed: 0 });
});

let isContextLost = false;
btnContextLoss.addEventListener('click', () => {
  if (!isContextLost) {
    heroDither.simulateContextLoss();
    btnContextLoss.textContent = 'Restore Context';
    btnContextLoss.classList.add('active');
    isContextLost = true;
  } else {
    heroDither.restoreContext();
    btnContextLoss.textContent = 'Lose Context';
    btnContextLoss.classList.remove('active');
    isContextLost = false;
  }
});

// Load Preset Function
function loadPreset(presetKey: string): void {
  const p = PRESETS[presetKey];
  if (!p) return;

  // Update UI Inputs
  selectPreset.value = p.options.preset || 'aurora';
  selectDither.value = p.options.dither || 'bayer8';
  rangePixelSize.value = `${p.options.pixelSize ?? 2}`;
  rangeScale.value = `${p.options.scale ?? 1.0}`;
  rangeIntensity.value = `${p.options.intensity ?? 1.0}`;
  rangeSpeed.value = `${p.options.speed ?? 0.25}`;
  inputSeed.value = `${p.options.seed ?? 42}`;

  heroTitle.textContent = p.name;
  heroDesc.textContent = p.description;
  heroTag.textContent = `${p.options.preset?.toUpperCase()} Preset`;

  // Update Preset bar chip active class
  document.querySelectorAll('.preset-chip').forEach((chip) => {
    chip.classList.toggle('active', chip.getAttribute('data-preset-id') === presetKey);
  });

  updateAllInstances(p.options);
  renderPaletteEditor();
}

// Preset Quick Chips
document.querySelectorAll('.preset-chip').forEach((chip) => {
  chip.addEventListener('click', () => {
    const key = chip.getAttribute('data-preset-id');
    if (key) loadPreset(key);
  });
});

// 3. Populate Curated Presets Gallery
const galleryContainer = document.getElementById('preset-gallery-container');
if (galleryContainer) {
  Object.entries(PRESETS).forEach(([key, presetConfig]) => {
    const card = document.createElement('div');
    card.className = 'preset-card';

    const host = document.createElement('div');
    host.className = 'preset-card-host dither-host';

    const body = document.createElement('div');
    body.className = 'preset-card-body';

    const title = document.createElement('h4');
    title.className = 'preset-card-title';
    title.textContent = presetConfig.name;

    const desc = document.createElement('p');
    desc.className = 'preset-card-desc';
    desc.textContent = presetConfig.description;

    const metaRow = document.createElement('div');
    metaRow.className = 'preset-card-meta';

    const info = document.createElement('span');
    info.textContent = `${presetConfig.options.preset} • ${presetConfig.options.dither}`;

    const loadBtn = document.createElement('button');
    loadBtn.className = 'btn btn-secondary';
    loadBtn.style.padding = '0.35rem 0.75rem';
    loadBtn.style.fontSize = '0.75rem';
    loadBtn.textContent = 'Load Configuration';
    loadBtn.addEventListener('click', () => {
      loadPreset(key);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    metaRow.appendChild(info);
    metaRow.appendChild(loadBtn);

    body.appendChild(title);
    body.appendChild(desc);
    body.appendChild(metaRow);

    card.appendChild(host);
    card.appendChild(body);
    galleryContainer.appendChild(card);

    // Initialize live background for each gallery card
    createDither(host, {
      ...presetConfig.options,
      speed: (presetConfig.options.speed || 0.2) * 0.75, // slightly calmer in gallery
    });
  });
}

// Initial renders
renderPaletteEditor();
syncMetricsDisplay();

// Diagnostics & Meta tracking
function updateHeaderMeta(): void {
  const dprEl = document.getElementById('meta-dpr');
  if (dprEl) {
    dprEl.innerHTML = `DPR: <strong>${window.devicePixelRatio.toFixed(1)}</strong>`;
  }

  const viewportEl = document.getElementById('meta-viewport');
  if (viewportEl) {
    viewportEl.innerHTML = `Viewport: <strong>${window.innerWidth}×${window.innerHeight}</strong>`;
  }

  const budgetEl = document.getElementById('val-budget-count');
  if (budgetEl) {
    budgetEl.textContent = `${getActiveContextCount()} / ${getContextBudget()}`;
  }

  const schedEl = document.getElementById('val-scheduler-status');
  if (schedEl) {
    const active = isSchedulerActive();
    schedEl.textContent = active ? 'ACTIVE' : 'IDLE (Sleeping)';
    schedEl.style.color = active ? '#4ade80' : '#facc15';
  }

  // Update Live Telemetry HUD for Hero Stage
  const metrics = heroDither.getMetrics();
  const hudFps = document.getElementById('hud-fps');
  const hudCpu = document.getElementById('hud-cpu');
  const hudGpu = document.getElementById('hud-gpu');
  const hudBuffer = document.getElementById('hud-buffer');
  const hudPixels = document.getElementById('hud-pixels');

  if (hudFps) {
    hudFps.textContent = `${metrics.fps} FPS`;
    hudFps.className = `t-val ${metrics.fps >= 50 ? 'good' : metrics.fps >= 30 ? 'warn' : ''}`;
  }
  if (hudCpu) {
    hudCpu.textContent = `${metrics.frameTimeMs} ms`;
  }
  if (hudGpu) {
    hudGpu.textContent = metrics.gpuTimeMs !== null ? `${metrics.gpuTimeMs} ms` : 'N/A (Timer Query unavail)';
  }
  if (hudBuffer) {
    hudBuffer.textContent = `${metrics.bufferWidth}×${metrics.bufferHeight}`;
  }
  if (hudPixels) {
    hudPixels.textContent = `${(metrics.pixelCount / 1_000_000).toFixed(2)}M px`;
  }
}

window.addEventListener('resize', updateHeaderMeta);
updateHeaderMeta();
setInterval(updateHeaderMeta, 300);

// Benchmark Suite Runner
const btnRunBenchmark = document.getElementById('btn-run-benchmark') as HTMLButtonElement;
const benchmarkStatus = document.getElementById('benchmark-status') as HTMLElement;
const benchmarkTbody = document.getElementById('benchmark-tbody') as HTMLElement;

btnRunBenchmark?.addEventListener('click', async () => {
  btnRunBenchmark.disabled = true;
  benchmarkStatus.style.display = 'block';

  try {
    const report = await runBenchmarkSuite((current, total, name) => {
      benchmarkStatus.textContent = `Running workload ${current}/${total}: ${name}...`;
    });

    benchmarkStatus.textContent = `Benchmark completed at ${new Date(report.timestamp).toLocaleTimeString()}! Results updated below:`;
    benchmarkStatus.style.color = '#4ade80';

    // Render results into table
    benchmarkTbody.innerHTML = '';
    report.results.forEach((res) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${res.name}</strong><br><span style="font-size:0.75rem;color:var(--text-muted);">${res.description}</span></td>
        <td>${res.bufferWidth}×${res.bufferHeight} (${(res.pixelCount / 1_000_000).toFixed(2)}M px)</td>
        <td style="color:${res.fps >= 50 ? '#4ade80' : res.fps >= 30 ? '#facc15' : '#f87171'};font-weight:700;">${res.fps} FPS</td>
        <td>${res.cpuFrameTimeMs} ms</td>
        <td>${res.gpuTimeMs !== null ? `${res.gpuTimeMs} ms` : 'N/A'}</td>
        <td>${res.contextsActive}</td>
        <td><span class="benchmark-badge ${res.status}">${res.status.toUpperCase()} (${res.notes})</span></td>
      `;
      benchmarkTbody.appendChild(tr);
    });
  } catch (err) {
    benchmarkStatus.textContent = `Error running benchmark: ${err}`;
    benchmarkStatus.style.color = '#f87171';
  } finally {
    btnRunBenchmark.disabled = false;
  }
});
