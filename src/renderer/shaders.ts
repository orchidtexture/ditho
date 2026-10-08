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

uniform vec2 u_resolution; // Canvas dimensions in device pixels
uniform float u_dpr;        // Device pixel ratio
uniform float u_pixelSize;  // Dither cell size in CSS pixels
uniform float u_time;       // Elapsed time in seconds
uniform float u_speed;      // Animation speed multiplier
uniform float u_scale;      // Field spatial scale
uniform vec3 u_colorA;      // First stop
uniform vec3 u_colorB;      // Second stop
uniform int u_ditherMode;   // 0: none, 1: bayer4, 2: bayer8

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

float getBayerThreshold(ivec2 coord, int mode) {
  if (mode == 1) {
    int idx = (coord.y % 4) * 4 + (coord.x % 4);
    return (float(bayer4[idx]) + 0.5) / 16.0;
  } else {
    int idx = (coord.y % 8) * 8 + (coord.x % 8);
    return (float(bayer8[idx]) + 0.5) / 64.0;
  }
}

void main() {
  // Convert gl_FragCoord to CSS pixels
  // gl_FragCoord origin is bottom-left; flip Y to match DOM top-left origin
  vec2 cssCoord = vec2(gl_FragCoord.x, u_resolution.y - gl_FragCoord.y) / u_dpr;

  // Aspect-ratio normalized coordinates for field generation
  vec2 st = (cssCoord - 0.5 * (u_resolution / u_dpr)) / min(u_resolution.x / u_dpr, u_resolution.y / u_dpr);

  // Time & dynamics
  float t = u_time * u_speed;

  // Procedural gradient field
  // Moving directional wave + harmonic oscillation
  vec2 dir = vec2(cos(t * 0.25), sin(t * 0.25));
  float linearField = dot(st * u_scale, dir) * 0.6;
  float wave = sin(st.x * 2.8 * u_scale + t * 0.8) * 0.18 + cos(st.y * 2.2 * u_scale - t * 0.6) * 0.18;
  float field = clamp(linearField + wave + 0.5, 0.0, 1.0);

  vec3 outColor;

  if (u_ditherMode == 0) {
    // Undithered continuous reference
    outColor = mix(u_colorA, u_colorB, field);
  } else {
    // Quantized ordered dithering
    // Determine dither pixel coordinate in integer cell grid
    float cellSize = max(1.0, floor(u_pixelSize));
    ivec2 ditherCoord = ivec2(floor(cssCoord / cellSize));
    float threshold = getBayerThreshold(ditherCoord, u_ditherMode);

    float quantized = step(threshold, field);
    outColor = mix(u_colorA, u_colorB, quantized);
  }

  fragColor = vec4(outColor, 1.0);
}
`;
