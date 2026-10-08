export const vertexShaderSource = `#version 300 es
precision highp float;

in vec2 a_position;
out vec2 v_uv;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_uv = a_position * 0.5 + 0.5;
}
`;

export const fragmentShaderSource = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

// Dimensions & Scaling
uniform vec2 u_resolution;       // Canvas buffer size (device pixels)
uniform float u_dpr;             // Device pixel ratio
uniform float u_resolutionScale; // Internal rendering resolution scale
uniform float u_pixelSize;       // Dither cell size in CSS pixels

// Dynamics & Field Controls
uniform float u_time;            // Elapsed time in seconds
uniform float u_speed;           // Animation speed multiplier
uniform float u_scale;           // Structure spatial scale
uniform float u_intensity;       // Contrast / modulation depth
uniform int u_seed;              // Deterministic seed
uniform int u_preset;            // 0: gradient, 1: waves, 2: aurora
uniform int u_ditherMode;        // 0: none, 1: bayer4, 2: bayer8, 3: noise

// Palette ramp (up to 8 stops)
#define MAX_STOPS 8
uniform vec3 u_palette[MAX_STOPS];
uniform int u_paletteCount;

// 4x4 Bayer Matrix
const int bayer4[16] = int[](
   0,  8,  2, 10,
  12,  4, 14,  6,
   3, 11,  1,  9,
  15,  7, 13,  5
);

// 8x8 Bayer Matrix
const int bayer8[64] = int[](
   0, 32,  8, 40,  2, 34, 10, 42,
  48, 16, 56, 24, 50, 18, 58, 26,
  12, 44,  4, 36, 14, 46,  6, 38,
  60, 28, 52, 20, 62, 30, 54, 22,
   3, 35, 11, 43,  1, 33,  9, 41,
  51, 19, 59, 27, 49, 17, 57, 25,
  15, 47,  7, 39, 13, 45,  5, 37,
  63, 31, 55, 23, 61, 29, 53, 21
);

// Deterministic integer hash for static noise threshold (PCG-style 32-bit mix)
float hash2D(ivec2 p, int seed) {
  uint x = uint(p.x);
  uint y = uint(p.y);
  uint s = uint(seed);
  uint n = x * 1597334673u ^ y * 3812015801u ^ s * 2798796413u;
  n = (n ^ (n >> 15u)) * (n | 1u);
  n ^= n + (n ^ (n >> 7u)) * (n | 61u);
  return float(n ^ (n >> 14u)) / 4294967296.0;
}

// 2D Simplex/Gradient Noise for procedural fields
vec2 hashGradient(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}

float noise2D(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);

  return mix(
    mix(dot(hashGradient(i + vec2(0.0, 0.0)), f - vec2(0.0, 0.0)),
        dot(hashGradient(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0)), u.x),
    mix(dot(hashGradient(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0)),
        dot(hashGradient(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0)), u.x),
    u.y
  );
}

// Preset 0: Clean Angled Harmonic Gradient
float evaluateGradient(vec2 st, float t, float seedOffset) {
  vec2 dir = vec2(cos(t * 0.2 + seedOffset), sin(t * 0.2 + seedOffset));
  float linearTerm = dot(st * u_scale, dir) * 0.5 + 0.5;
  float wave = sin(st.x * 2.2 * u_scale + t * 0.6 + seedOffset) * 0.12 * u_intensity;
  return clamp(linearTerm + wave, 0.0, 1.0);
}

// Preset 1: Multi-layer Directional Sine Waves
float evaluateWaves(vec2 st, float t, float seedOffset) {
  vec2 p = st * u_scale * 3.0;
  float w1 = sin((p.x * 0.9 + p.y * 0.4) + t * 1.0 + seedOffset);
  float w2 = sin((p.x * -0.6 + p.y * 0.8) - t * 0.85 + seedOffset * 1.3);
  float w3 = sin((p.x * 0.3 - p.y * 0.95) + t * 0.65 + seedOffset * 0.7);

  float combined = (w1 * 0.38 + w2 * 0.34 + w3 * 0.28) * u_intensity;
  return clamp(combined * 0.5 + 0.5, 0.0, 1.0);
}

// Preset 2: Domain-Warped Aurora Ribbons (bounded octaves)
float evaluateAurora(vec2 st, float t, float seedOffset) {
  vec2 p = st * u_scale * 1.8 + vec2(seedOffset * 0.5);

  // First warp stage
  vec2 q = vec2(
    noise2D(p + vec2(0.0, 0.0) + vec2(t * 0.12, t * 0.08)),
    noise2D(p + vec2(5.2, 1.3) + vec2(-t * 0.10, t * 0.14))
  );

  // Second warp stage
  vec2 r = vec2(
    noise2D(p + 2.4 * q + vec2(1.7, 9.2) + vec2(t * 0.15, -t * 0.11)),
    noise2D(p + 2.4 * q + vec2(8.3, 2.8) + vec2(-t * 0.12, t * 0.09))
  );

  // Final noise field evaluation
  float n = noise2D(p + 2.8 * r);
  float field = n * 0.5 + 0.5;

  // Apply intensity contrast around center
  field = clamp((field - 0.5) * u_intensity + 0.5, 0.0, 1.0);
  return field;
}

// Quantize scalar field across ordered palette stops
vec3 mapPalette(float v, float threshold, int ditherMode) {
  int count = max(2, u_paletteCount);
  float maxIdx = float(count - 1);
  float scaled = clamp(v, 0.0, 1.0) * maxIdx;
  int idx = int(floor(scaled));
  if (idx >= count - 1) {
    return u_palette[count - 1];
  }
  float frac = scaled - float(idx);

  if (ditherMode == 0) {
    // Undithered continuous interpolation
    return mix(u_palette[idx], u_palette[idx + 1], frac);
  } else {
    // Quantized ordered / noise dithering threshold
    float stepVal = step(threshold, frac);
    return mix(u_palette[idx], u_palette[idx + 1], stepVal);
  }
}

void main() {
  // Convert gl_FragCoord to exact CSS pixel coordinates
  float scaleFactor = u_dpr * u_resolutionScale;
  vec2 cssCoord = vec2(gl_FragCoord.x, u_resolution.y - gl_FragCoord.y) / scaleFactor;
  vec2 cssSize = u_resolution / scaleFactor;

  // Normalized local coordinates centered on element
  vec2 st = (cssCoord - 0.5 * cssSize) / min(cssSize.x, cssSize.y);

  // Simulation time and seed offset
  float t = u_time * u_speed;
  float seedOffset = float(u_seed) * 0.0543;

  // Evaluate procedural field based on selected preset
  float field = 0.5;
  if (u_preset == 0) {
    field = evaluateGradient(st, t, seedOffset);
  } else if (u_preset == 1) {
    field = evaluateWaves(st, t, seedOffset);
  } else {
    field = evaluateAurora(st, t, seedOffset);
  }

  // Calculate dither threshold
  float threshold = 0.5;
  if (u_ditherMode != 0) {
    float cellSize = max(1.0, floor(u_pixelSize));
    ivec2 ditherCoord = ivec2(floor(cssCoord / cellSize));

    if (u_ditherMode == 1) {
      // Bayer 4x4
      int idx = (ditherCoord.y % 4) * 4 + (ditherCoord.x % 4);
      threshold = (float(bayer4[idx]) + 0.5) / 16.0;
    } else if (u_ditherMode == 2) {
      // Bayer 8x8
      int idx = (ditherCoord.y % 8) * 8 + (ditherCoord.x % 8);
      threshold = (float(bayer8[idx]) + 0.5) / 64.0;
    } else if (u_ditherMode == 3) {
      // Deterministic Static Noise
      threshold = hash2D(ditherCoord, u_seed);
    }
  }

  // Map field through ordered palette
  vec3 finalColor = mapPalette(field, threshold, u_ditherMode);
  fragColor = vec4(finalColor, 1.0);
}
`;
