import { vertexShaderSource, fragmentShaderSource } from './shaders';
import { normalizePalette, NormalizedPalette } from './color';
import { DitherMode, PresetType, PerformanceMetrics } from '../core/types';

export interface RendererConfig {
  preset: PresetType;
  colors: string[];
  dither: DitherMode;
  pixelSize: number;
  scale: number;
  intensity: number;
  speed: number;
  seed: number;
  resolutionScale: number;
}

export class WebGL2Renderer {
  private gl: WebGL2RenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private vao: WebGLVertexArrayObject | null = null;
  private positionBuffer: WebGLBuffer | null = null;

  // Uniform locations
  private uResolutionLoc: WebGLUniformLocation | null = null;
  private uDprLoc: WebGLUniformLocation | null = null;
  private uResolutionScaleLoc: WebGLUniformLocation | null = null;
  private uPixelSizeLoc: WebGLUniformLocation | null = null;
  private uTimeLoc: WebGLUniformLocation | null = null;
  private uSpeedLoc: WebGLUniformLocation | null = null;
  private uScaleLoc: WebGLUniformLocation | null = null;
  private uIntensityLoc: WebGLUniformLocation | null = null;
  private uSeedLoc: WebGLUniformLocation | null = null;
  private uPresetLoc: WebGLUniformLocation | null = null;
  private uDitherModeLoc: WebGLUniformLocation | null = null;
  private uPaletteLoc: WebGLUniformLocation | null = null;
  private uPaletteCountLoc: WebGLUniformLocation | null = null;

  // State
  private isContextLost = false;
  private loseContextExt: any = null;
  private timerQueryExt: any = null;
  private activeQuery: WebGLQuery | null = null;
  private pendingQuery: WebGLQuery | null = null;

  private config: RendererConfig;
  private normalizedPalette: NormalizedPalette;

  // Performance telemetry
  private lastCpuFrameMs = 0;
  private lastGpuFrameMs: number | null = null;
  private lastFrameTimestamp = 0;
  private fpsSmoothed = 60;
  private frameCount = 0;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    initialConfig: RendererConfig,
    private readonly onContextRestored?: () => void,
    private readonly onContextLostCallback?: () => void
  ) {
    this.config = { ...initialConfig };
    this.normalizedPalette = normalizePalette(this.config.colors);

    this.handleContextLost = this.handleContextLost.bind(this);
    this.handleContextRestored = this.handleContextRestored.bind(this);

    this.canvas.addEventListener('webglcontextlost', this.handleContextLost, false);
    this.canvas.addEventListener('webglcontextrestored', this.handleContextRestored, false);

    this.initGL();
  }

  private handleContextLost(e: Event): void {
    e.preventDefault();
    this.isContextLost = true;
    this.canvas.style.display = 'none'; // Reveal host CSS fallback
    console.warn('[Ditho] WebGL2 context lost.');
    if (this.onContextLostCallback) {
      this.onContextLostCallback();
    }
  }

  private handleContextRestored(): void {
    console.info('[Ditho] WebGL2 context restored. Rebuilding GPU resources...');
    this.isContextLost = false;
    this.canvas.style.display = 'block';
    this.initGL();
    if (this.onContextRestored) {
      this.onContextRestored();
    }
  }

  private initGL(): boolean {
    const gl = this.canvas.getContext('webgl2', {
      alpha: false,
      depth: false,
      stencil: false,
      antialias: false,
      powerPreference: 'low-power',
      preserveDrawingBuffer: false,
    });

    if (!gl) {
      console.warn('[Ditho] WebGL2 is not supported on this device/browser.');
      return false;
    }

    this.gl = gl;
    this.loseContextExt = gl.getExtension('WEBGL_lose_context');
    // GPU Timer Query extension (optional telemetry)
    this.timerQueryExt = gl.getExtension('EXT_disjoint_timer_query_webgl2');

    // Compile shaders
    const vs = this.compileShader(gl.VERTEX_SHADER, vertexShaderSource);
    const fs = this.compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource);
    if (!vs || !fs) return false;

    // Link program
    const program = gl.createProgram();
    if (!program) return false;

    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('[Ditho] Program link error:', gl.getProgramInfoLog(program));
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteProgram(program);
      return false;
    }

    gl.detachShader(program, vs);
    gl.detachShader(program, fs);
    gl.deleteShader(vs);
    gl.deleteShader(fs);

    this.program = program;

    // Cache uniform locations (guarantee array index [0] compatibility for Firefox/ANGLE)
    this.uResolutionLoc = gl.getUniformLocation(program, 'u_resolution');
    this.uDprLoc = gl.getUniformLocation(program, 'u_dpr');
    this.uResolutionScaleLoc = gl.getUniformLocation(program, 'u_resolutionScale');
    this.uPixelSizeLoc = gl.getUniformLocation(program, 'u_pixelSize');
    this.uTimeLoc = gl.getUniformLocation(program, 'u_time');
    this.uSpeedLoc = gl.getUniformLocation(program, 'u_speed');
    this.uScaleLoc = gl.getUniformLocation(program, 'u_scale');
    this.uIntensityLoc = gl.getUniformLocation(program, 'u_intensity');
    this.uSeedLoc = gl.getUniformLocation(program, 'u_seed');
    this.uPresetLoc = gl.getUniformLocation(program, 'u_preset');
    this.uDitherModeLoc = gl.getUniformLocation(program, 'u_ditherMode');
    this.uPaletteLoc = gl.getUniformLocation(program, 'u_palette[0]') ?? gl.getUniformLocation(program, 'u_palette');
    this.uPaletteCountLoc = gl.getUniformLocation(program, 'u_paletteCount');

    // Create fullscreen triangle geometry: [-1, -1], [3, -1], [-1, 3]
    const triangleVertices = new Float32Array([
      -1.0, -1.0,
       3.0, -1.0,
      -1.0,  3.0,
    ]);

    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    this.vao = vao;

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, triangleVertices, gl.STATIC_DRAW);
    this.positionBuffer = positionBuffer;

    const posLoc = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    return true;
  }

  private compileShader(type: number, source: string): WebGLShader | null {
    if (!this.gl) return null;
    const shader = this.gl.createShader(type);
    if (!shader) return null;

    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.error('[Ditho] Shader compile error:', this.gl.getShaderInfoLog(shader));
      this.gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  public updateConfig(newConfig: Partial<RendererConfig>): void {
    this.config = { ...this.config, ...newConfig };
    if (newConfig.colors !== undefined) {
      this.normalizedPalette = normalizePalette(this.config.colors);
    }
  }

  public render(time: number, dpr: number): void {
    if (this.isContextLost || !this.gl || !this.program || !this.vao) return;

    const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
    const gl = this.gl;

    // Check previous GPU timer query
    if (this.timerQueryExt && this.pendingQuery) {
      const available = gl.getQueryParameter(this.pendingQuery, gl.QUERY_RESULT_AVAILABLE);
      const disjoint = gl.getParameter(this.timerQueryExt.GPU_DISJOINT_EXT);

      if (available && !disjoint) {
        const timeElapsedNs = gl.getQueryParameter(this.pendingQuery, gl.QUERY_RESULT);
        this.lastGpuFrameMs = timeElapsedNs / 1_000_000;
        gl.deleteQuery(this.pendingQuery);
        this.pendingQuery = null;
      }
    }

    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.useProgram(this.program);

    // Uniforms
    gl.uniform2f(this.uResolutionLoc, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.uniform1f(this.uDprLoc, dpr);
    gl.uniform1f(this.uResolutionScaleLoc, this.config.resolutionScale);
    gl.uniform1f(this.uPixelSizeLoc, Math.max(1, this.config.pixelSize));
    gl.uniform1f(this.uTimeLoc, time);
    gl.uniform1f(this.uSpeedLoc, this.config.speed);
    gl.uniform1f(this.uScaleLoc, this.config.scale);
    gl.uniform1f(this.uIntensityLoc, this.config.intensity);
    gl.uniform1i(this.uSeedLoc, this.config.seed);

    // Preset mode: 0: gradient, 1: waves, 2: aurora
    const presetInt = this.config.preset === 'gradient' ? 0 : this.config.preset === 'waves' ? 1 : 2;
    gl.uniform1i(this.uPresetLoc, presetInt);

    // Dither mode: 0: none, 1: bayer4, 2: bayer8, 3: noise
    const ditherInt =
      this.config.dither === 'none'
        ? 0
        : this.config.dither === 'bayer4'
        ? 1
        : this.config.dither === 'bayer8'
        ? 2
        : 3;
    gl.uniform1i(this.uDitherModeLoc, ditherInt);

    // Multi-stop palette
    gl.uniform3fv(this.uPaletteLoc, this.normalizedPalette.flatArray);
    gl.uniform1i(this.uPaletteCountLoc, this.normalizedPalette.count);

    // Begin GPU timer query if supported
    if (this.timerQueryExt && !this.pendingQuery) {
      this.activeQuery = gl.createQuery();
      if (this.activeQuery) {
        gl.beginQuery(this.timerQueryExt.TIME_ELAPSED_EXT, this.activeQuery);
      }
    }

    // Draw fullscreen triangle
    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);

    // End GPU timer query
    if (this.timerQueryExt && this.activeQuery) {
      gl.endQuery(this.timerQueryExt.TIME_ELAPSED_EXT);
      this.pendingQuery = this.activeQuery;
      this.activeQuery = null;
    }

    // Telemetry updates
    const t1 = typeof performance !== 'undefined' ? performance.now() : 0;
    this.lastCpuFrameMs = t1 - t0;

    if (this.lastFrameTimestamp > 0 && t0 > this.lastFrameTimestamp) {
      const instantaneousFps = 1000 / (t0 - this.lastFrameTimestamp);
      // Exponential moving average over ~30 frames
      this.fpsSmoothed = this.fpsSmoothed * 0.92 + Math.min(120, instantaneousFps) * 0.08;
    }
    this.lastFrameTimestamp = t0;
    this.frameCount++;
  }

  public getMetrics(dpr: number): PerformanceMetrics {
    const width = this.gl ? this.gl.drawingBufferWidth : this.canvas.width;
    const height = this.gl ? this.gl.drawingBufferHeight : this.canvas.height;

    return {
      fps: Math.round(this.fpsSmoothed),
      frameTimeMs: Number(this.lastCpuFrameMs.toFixed(2)),
      gpuTimeMs: this.lastGpuFrameMs !== null ? Number(this.lastGpuFrameMs.toFixed(2)) : null,
      bufferWidth: width,
      bufferHeight: height,
      pixelCount: width * height,
      dpr,
    };
  }

  public simulateContextLoss(): void {
    if (this.loseContextExt) {
      this.loseContextExt.loseContext();
    } else {
      console.warn('[Ditho] WEBGL_lose_context is not supported on this context.');
    }
  }

  public restoreContext(): void {
    if (this.loseContextExt) {
      this.loseContextExt.restoreContext();
    }
  }

  public dispose(): void {
    this.canvas.removeEventListener('webglcontextlost', this.handleContextLost);
    this.canvas.removeEventListener('webglcontextrestored', this.handleContextRestored);

    if (this.gl) {
      if (this.pendingQuery) {
        this.gl.deleteQuery(this.pendingQuery);
        this.pendingQuery = null;
      }
      if (this.activeQuery) {
        this.gl.deleteQuery(this.activeQuery);
        this.activeQuery = null;
      }
      if (this.vao) {
        this.gl.deleteVertexArray(this.vao);
        this.vao = null;
      }
      if (this.positionBuffer) {
        this.gl.deleteBuffer(this.positionBuffer);
        this.positionBuffer = null;
      }
      if (this.program) {
        this.gl.deleteProgram(this.program);
        this.program = null;
      }
      this.gl = null;
    }
  }

  public isAvailable(): boolean {
    return this.gl !== null && !this.isContextLost;
  }
}
