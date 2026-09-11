// WebGPU OpenShaders Engine & WGSL Registry
// Preserves all original WGSL shader code, math functions, glyph atlas, and pipelines

type GPUDevice = any;
type GPUCanvasContext = any;
type GPUTextureView = any;
type GPUSampler = any;
type GPUTexture = any;
type GPUBindGroup = any;
type GPUBindGroupEntry = any;

declare global {
  interface Navigator {
    gpu?: any;
  }
}

const GPUTextureUsage = {
  COPY_SRC: 0x01,
  COPY_DST: 0x02,
  TEXTURE_BINDING: 0x04,
  STORAGE_BINDING: 0x08,
  RENDER_ATTACHMENT: 0x10,
};

const GPUBufferUsage = {
  MAP_READ: 1,
  MAP_WRITE: 2,
  COPY_SRC: 4,
  COPY_DST: 8,
  INDEX: 16,
  VERTEX: 32,
  UNIFORM: 64,
  STORAGE: 128,
  INDIRECT: 256,
  QUERY_RESOLVE: 512,
};

export interface ShaderOption {
  label: string;
  family: string;
  colors: [string, string];
  factory: ((canvas: HTMLCanvasElement, options?: ShaderInitOptions) => Promise<ShaderHandle>) | null;
}

export interface ShaderInitOptions {
  theme?: 'dark' | 'light';
  background?: { dark?: string; light?: string };
  autoplay?: boolean;
  signal?: AbortSignal;
  onError?: (err: Error) => void;
}

export interface ShaderHandle {
  setTheme: (theme: 'dark' | 'light') => void;
  render: (time: number) => void;
  destroy: () => void;
}

const MAX_PIXELS = 2400000;
const THEME_EASE = 7;
const UNIFORM_FLOATS = 12;
const GLYPHS = " .:;+*oO8@";
const GLYPH_CELL = { width: 48, height: 80 };
const GLYPH_MIP_LEVELS = 5;
const GLYPH_FONT = "500 62px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

function parseHex(hex: string): [number, number, number] {
  const m = /^#([0-9a-f]{6})$/i.exec(String(hex).trim());
  if (!m) return [0, 0, 0];
  return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16) / 255) as [number, number, number];
}

function animate(
  options: ShaderInitOptions,
  draw: (time: number, theme: number, pixelRatio: number) => void,
  canvas: HTMLCanvasElement,
  release: () => void,
  maxDimension = Infinity
): ShaderHandle {
  const autoplay = options.autoplay !== false;
  const stillness = window.matchMedia('(prefers-reduced-motion: reduce)');
  let resolution = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
  let deviceRatio = window.devicePixelRatio || 1;
  let width = canvas.clientWidth;
  let height = canvas.clientHeight;
  let visible = true;
  let disposed = false;
  let targetTheme = options.theme === 'light' ? 1 : 0;
  let theme = targetTheme;
  let frame = 0;
  let elapsed = 0;
  let lastTime = 0;
  let previous: number | null = null;

  function canDraw() {
    return !disposed && !document.hidden && visible && width > 0 && height > 0;
  }

  function fitCanvas() {
    const scale = Math.min(
      deviceRatio,
      2,
      Math.sqrt(MAX_PIXELS / (width * height)),
      maxDimension / width,
      maxDimension / height
    );
    const w = Math.max(1, Math.floor(width * scale));
    const h = Math.max(1, Math.floor(height * scale));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    return w / width;
  }

  function render(time: number) {
    if (disposed) return;
    lastTime = time;
    if (!canDraw()) return;
    try {
      draw(time, theme, fitCanvas());
    } catch (e) {
      destroy();
      if (options.onError) options.onError(e as Error);
      else console.error(e);
    }
  }

  function schedule() {
    if (!frame && canDraw()) frame = requestAnimationFrame(tick);
  }

  function refresh() {
    if (!canDraw()) {
      cancelAnimationFrame(frame);
      frame = 0;
      previous = null;
    } else {
      schedule();
    }
  }

  function tick(now: number) {
    frame = 0;
    if (!canDraw()) {
      previous = null;
      return;
    }
    const delta = previous === null ? 0 : Math.min((now - previous) / 1000, 0.1);
    previous = now;
    if (autoplay) {
      if (!stillness.matches) elapsed += delta;
      theme += (targetTheme - theme) * (1 - Math.exp(-delta * THEME_EASE));
      if (Math.abs(targetTheme - theme) < 0.002) theme = targetTheme;
    }
    render(autoplay ? elapsed : lastTime);
    if (autoplay && (!stillness.matches || theme !== targetTheme)) schedule();
    else previous = null;
  }

  function pixelRatioChanged() {
    if (disposed) return;
    const next = window.devicePixelRatio || 1;
    if (deviceRatio === next) return;
    deviceRatio = next;
    resolution.removeEventListener('change', pixelRatioChanged);
    resolution = window.matchMedia(`(resolution: ${next}dppx)`);
    resolution.addEventListener('change', pixelRatioChanged);
    refresh();
  }

  const observer = new ResizeObserver((entries) => {
    if (disposed || !entries[0]) return;
    const next = entries[0].contentRect;
    if (width === next.width && height === next.height) return;
    width = next.width;
    height = next.height;
    refresh();
  });

  const intersection = new IntersectionObserver((entries) => {
    if (disposed || !entries[0] || visible === entries[0].isIntersecting) return;
    visible = entries[0].isIntersecting;
    refresh();
  });

  function destroy() {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(frame);
    frame = 0;
    observer.disconnect();
    intersection.disconnect();
    resolution.removeEventListener('change', pixelRatioChanged);
    stillness.removeEventListener('change', refresh);
    document.removeEventListener('visibilitychange', refresh);
    window.removeEventListener('resize', pixelRatioChanged);
    if (options.signal) options.signal.removeEventListener('abort', destroy);
    release();
  }

  observer.observe(canvas);
  intersection.observe(canvas);
  resolution.addEventListener('change', pixelRatioChanged);
  stillness.addEventListener('change', refresh);
  document.addEventListener('visibilitychange', refresh);
  window.addEventListener('resize', pixelRatioChanged);
  if (options.signal) {
    options.signal.addEventListener('abort', destroy, { once: true });
    if (options.signal.aborted) destroy();
  }
  if (!disposed) schedule();

  return {
    setTheme(next: 'dark' | 'light') {
      if (disposed) return;
      targetTheme = next === 'light' ? 1 : 0;
      if (autoplay) refresh();
      else {
        theme = targetTheme;
        render(lastTime);
      }
    },
    render,
    destroy,
  };
}

// ---------- WGSL FIELD SHADER GENERATOR ----------
function makeFieldShader(c: Record<string, string>) {
  return `struct Uniforms {
  resolution: vec2f,
  time: f32,
  lightMode: f32,
  darkBackground: vec3f,
  pixelRatio: f32,
  lightBackground: vec3f,
}
@group(0) @binding(0) var<uniform> u: Uniforms;

const HUE: f32 = ${c.H};
const HUE_SPREAD: f32 = ${c.HS};
const HUE_TRAVEL: f32 = ${c.HT};
const CHROMA: f32 = ${c.C};
const LIGHTNESS: f32 = ${c.L};
const COLOUR_CYCLE: f32 = ${c.CC};
const THETA: f32 = ${c.T};
const SHEAR: f32 = ${c.SH};
const SHRINK: f32 = ${c.SK};
const LAYERS: f32 = ${c.LA};
const WARP_FREQ_X: f32 = ${c.WFX};
const WARP_FREQ_Y: f32 = ${c.WFY};
const WARP_AMP_X: f32 = ${c.WAX};
const WARP_AMP_Y: f32 = ${c.WAY};
const ASPECT_X: f32 = ${c.ASX};
const ASPECT_Y: f32 = ${c.ASY};
const OFFSET_X: f32 = ${c.OFX};
const OFFSET_Y: f32 = ${c.OFY};
const TILT: f32 = ${c.TI};
const ZOOM: f32 = ${c.ZO};
const CENTRE_X: f32 = ${c.CX};
const CENTRE_Y: f32 = ${c.CY};
const GLOW_SIZE: f32 = ${c.GS};
const FALLOFF: f32 = ${c.FA};
const VIGNETTE: f32 = ${c.VI};
const FLOW_SPEED: f32 = ${c.FS};
const FLOW_DIRECTION: f32 = ${c.FD};
const BREATH_RATE: f32 = ${c.BR};
const BREATH_AMOUNT: f32 = ${c.BA};
const PHASE: f32 = ${c.PH};
const ECHO: f32 = ${c.EC};
const ECHO_SHIFT: f32 = ${c.ES};
const SOFTNESS: f32 = ${c.SO};
const LIGHT_SWING: f32 = ${c.LS};

@vertex fn vertexMain(@builtin(vertex_index) index: u32) -> @builtin(position) vec4f {
  let position = vec2f(f32((index << 1u) & 2u), f32(index & 2u));
  return vec4f(position * 2.0 - 1.0, 0.0, 1.0);
}

const TAU: f32 = 6.28318530718;

fn oklchToLinear(L: f32, C: f32, h: f32) -> vec3f {
  let a = C * cos(h);
  let b = C * sin(h);
  let l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  let m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  let s_ = L - 0.0894841775 * a - 1.2914855480 * b;
  var lms = vec3f(l_, m_, s_);
  lms = lms * lms * lms;
  return mat3x3f(4.0767416621, -1.2684380046, -0.0041960863,
                 -3.3077115913, 2.6097574011, -0.7034186147,
                 0.2309699292, -0.3413193965, 1.7076147010) * lms;
}

fn fmod(x: f32, y: f32) -> f32 { return x - y * floor(x / y); }

fn blueNoise(p: vec2f, frame: f32) -> f32 {
  let q = p + 5.588238 * fmod(frame, 64.0);
  return fract(52.9829189 * fract(0.06711056 * q.x + 0.00583715 * q.y));
}

@fragment fn fragmentMain(@builtin(position) position: vec4f) -> @location(0) vec4f {
  let R = u.resolution;
  let frag = vec2f(position.x, R.y - position.y);
  let pos = (frag - 0.5 * R) / R.y;
  let t = u.time * FLOW_SPEED * FLOW_DIRECTION + PHASE;
  let breath = (-sin(u.time * BREATH_RATE * 1.5) + sin(u.time * BREATH_RATE + 1.0)) * 0.25 + 0.5;

  var p = (pos - vec2f(CENTRE_X, CENTRE_Y)) * (ZOOM - breath * BREATH_AMOUNT);
  let ct = cos(TILT);
  let st = sin(TILT);
  p = mat2x2f(ct, st, -st, ct) * p;

  let fold = mat2x2f(cos(THETA), sin(THETA), -SHEAR, cos(THETA));

  let hue0 = HUE * TAU;
  let hue1 = hue0 + HUE_SPREAD * TAU;
  var color = vec3f(0.0);

  for (var i: f32 = 1.0; i <= 96.0; i += 1.0) {
    if (i > LAYERS) { break; }
    p.x += -sin(p.y * WARP_FREQ_X + t + i * 0.007) * WARP_AMP_X;
    p.y += -sin(p.x * WARP_FREQ_Y - t + i * 0.02) * WARP_AMP_Y;
    p = fold * p * SHRINK;

    let q = p - vec2f(OFFSET_X + breath * 0.1, OFFSET_Y);
    let s = vec2f(q.x * ASPECT_X, q.y * ASPECT_Y);
    var glow = GLOW_SIZE / (dot(s, s) + SOFTNESS);
    if (ECHO > 0.0) {
      let e = vec2f((q.x - ECHO_SHIFT) * ASPECT_X, s.y);
      glow += ECHO * GLOW_SIZE / (dot(e, e) + SOFTNESS);
    }
    glow *= 0.25 + breath * 0.4;

    let r = length(p);
    let k = sin(i * COLOUR_CYCLE + t * 1.2 + r * HUE_TRAVEL) * 0.5 + 0.5;
    let tint = clamp(oklchToLinear(LIGHTNESS + LIGHT_SWING * k, CHROMA * (0.75 + 0.35 * k), mix(hue0, hue1, k)), vec3f(0.0), vec3f(1.0));
    color += glow * tint * exp2(-r * FALLOFF);
  }

  let x = max(color, vec3f(0.0));
  color = (x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14);
  color = pow(clamp(color, vec3f(0.0), vec3f(1.0)), vec3f(0.85, 0.92, 0.98));

  let edge = smoothstep(0.5, 1.6, length(pos));
  color *= 1.0 - edge * VIGNETTE;

  let dark = u.darkBackground + color * (1.0 - u.darkBackground);
  let strength = max(color.r, max(color.g, color.b));
  let light = u.lightBackground * (1.0 - strength) + color * 0.96;
  color = mix(dark, light, vec3f(u.lightMode));

  color += (blueNoise(frag, floor(u.time * 24.0)) - 0.5) / 255.0;
  return vec4f(clamp(color, vec3f(0.0), vec3f(1.0)), 1.0);
}`;
}

// ---------- RARITY: Halftone ----------
function makeHalftoneRarity(S: string, SC: string, SD: string) {
  return `struct Uniforms { resolution: vec2f, time: f32, lightMode: f32, darkBackground: vec3f, pixelRatio: f32, lightBackground: vec3f }
@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var sceneSampler: sampler;
@group(0) @binding(2) var tScene: texture_2d<f32>;
const STRENGTH: f32 = ${S};
const SCALE: f32 = ${SC};
const SEED: f32 = ${SD};
@vertex fn vertexMain(@builtin(vertex_index) index: u32) -> @builtin(position) vec4f {
  let position = vec2f(f32((index << 1u) & 2u), f32(index & 2u));
  return vec4f(position * 2.0 - 1.0, 0.0, 1.0);
}
const LUMA = vec3f(0.2126, 0.7152, 0.0722);
fn toInk(c: vec3f) -> vec3f { return mix(c - u.darkBackground, u.lightBackground - c, vec3f(u.lightMode)); }
fn fromInk(ink: vec3f) -> vec3f { return mix(u.darkBackground + ink, u.lightBackground - ink, vec3f(u.lightMode)); }
fn sceneInk(uv: vec2f) -> vec3f { let c = clamp(uv, vec2f(0.0), vec2f(1.0)); return toInk(textureSample(tScene, sceneSampler, vec2f(c.x, 1.0 - c.y)).rgb); }
fn fmod(x: f32, y: f32) -> f32 { return x - y * floor(x / y); }
fn blueNoise(p: vec2f, frame: f32) -> f32 { let q = p + 5.588238 * fmod(frame, 64.0); return fract(52.9829189 * fract(0.06711056 * q.x + 0.00583715 * q.y)); }
fn halftone(frag: vec2f) -> vec3f {
  let cell = max(3.0, SCALE * 3.6 * u.pixelRatio);
  let angle = 0.26 + SEED * 0.3;
  let turn = mat2x2f(cos(angle), -sin(angle), sin(angle), cos(angle));
  let rotated = turn * frag;
  let grid = floor(rotated / cell);
  let centre = (grid + 0.5) * cell;
  let source = transpose(turn) * centre;
  let soft = sceneInk(frag / u.resolution);
  let ink = sceneInk(source / u.resolution);
  let level = clamp(dot(ink, LUMA), 0.0, 1.0);
  let radius = cell * sqrt(pow(level, 0.9) / 3.14159265);
  let dist = length(rotated - centre);
  let aa = 0.7 * u.pixelRatio;
  let dot_ = 1.0 - smoothstep(radius - aa, radius + aa, dist);
  let dots = ink * min(0.8 / max(level, 1e-3), 2.2) * dot_;
  let presence = smoothstep(0.03, 0.16, level) * (0.3 + 0.14 * STRENGTH);
  return mix(soft, dots, vec3f(presence));
}
@fragment fn fragmentMain(@builtin(position) position: vec4f) -> @location(0) vec4f {
  let frag = vec2f(position.x, u.resolution.y - position.y);
  let ink = halftone(frag);
  var color = fromInk(clamp(ink, vec3f(0.0), vec3f(1.0)));
  color += (blueNoise(frag, floor(u.time * 24.0)) - 0.5) / 255.0;
  return vec4f(clamp(color, vec3f(0.0), vec3f(1.0)), 1.0);
}`;
}

// ---------- RARITY: Sparkle ----------
function makeSparkleRarity(S: string, SC: string, SD: string) {
  return `struct Uniforms { resolution: vec2f, time: f32, lightMode: f32, darkBackground: vec3f, pixelRatio: f32, lightBackground: vec3f }
@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var sceneSampler: sampler;
@group(0) @binding(2) var tScene: texture_2d<f32>;
const STRENGTH: f32 = ${S};
const SCALE: f32 = ${SC};
const SEED: f32 = ${SD};
@vertex fn vertexMain(@builtin(vertex_index) index: u32) -> @builtin(position) vec4f {
  let position = vec2f(f32((index << 1u) & 2u), f32(index & 2u));
  return vec4f(position * 2.0 - 1.0, 0.0, 1.0);
}
const TAU: f32 = 6.28318530718;
const LUMA = vec3f(0.2126, 0.7152, 0.0722);
fn toInk(c: vec3f) -> vec3f { return mix(c - u.darkBackground, u.lightBackground - c, vec3f(u.lightMode)); }
fn fromInk(ink: vec3f) -> vec3f { return mix(u.darkBackground + ink, u.lightBackground - ink, vec3f(u.lightMode)); }
fn sceneInk(uv: vec2f) -> vec3f { let c = clamp(uv, vec2f(0.0), vec2f(1.0)); return toInk(textureSample(tScene, sceneSampler, vec2f(c.x, 1.0 - c.y)).rgb); }
fn fmod(x: f32, y: f32) -> f32 { return x - y * floor(x / y); }
fn blueNoise(p: vec2f, frame: f32) -> f32 { let q = p + 5.588238 * fmod(frame, 64.0); return fract(52.9829189 * fract(0.06711056 * q.x + 0.00583715 * q.y)); }
fn pcg3d(p: vec3u) -> vec3u { var v = p * 1664525u + 1013904223u; v.x += v.y*v.z; v.y += v.z*v.x; v.z += v.x*v.y; v ^= v >> vec3u(16u); v.x += v.y*v.z; v.y += v.z*v.x; v.z += v.x*v.y; return v; }
fn hash3(p: vec3f) -> vec3f { return vec3f(pcg3d(vec3u(vec3i(floor(p)) + 0x4000))) / 4294967295.0; }
fn sparkle(frag: vec2f) -> vec3f {
  let uv = frag / u.resolution;
  let ink = sceneInk(uv);
  var glow = vec3f(0.0);
  for (var layer: i32 = 0; layer < 2; layer++) {
    let size = (30.0 - 10.0 * f32(layer)) * u.pixelRatio * SCALE;
    let cell = floor(frag / size);
    let h = hash3(vec3f(cell, f32(layer) * 31.0 + SEED * 97.0));
    let point = (cell + 0.2 + 0.6 * h.xy) * size;
    let at = sceneInk(point / u.resolution);
    let peak = max(at.r, max(at.g, at.b));
    let presence = smoothstep(0.1, 0.45, mix(dot(at, LUMA), peak * 1.4, u.lightMode));
    var twinkle = max(sin(u.time * (0.8 + h.z * 1.2) + h.x * TAU), 0.0);
    twinkle *= twinkle; twinkle *= twinkle; twinkle *= twinkle;
    let o = (frag - point) / u.pixelRatio;
    let core = exp(-dot(o, o) * 0.9);
    let rays = exp(-abs(o.x) * 1.6 - abs(o.y) * 0.45) + exp(-abs(o.y) * 1.6 - abs(o.x) * 0.45);
    let glint = (core + 0.25 * rays) * twinkle * presence * (0.35 + 0.65 * step(0.45, h.z));
    let tint = mix(mix(at / max(dot(at, LUMA), 1e-3) * 0.6, vec3f(1.0), vec3f(0.55)), at / max(peak, 1e-3) * 0.75 + 0.25, vec3f(u.lightMode));
    glow += tint * glint * 0.9 * STRENGTH;
  }
  return ink + glow;
}
@fragment fn fragmentMain(@builtin(position) position: vec4f) -> @location(0) vec4f {
  let frag = vec2f(position.x, u.resolution.y - position.y);
  let ink = sparkle(frag);
  var color = fromInk(clamp(ink, vec3f(0.0), vec3f(1.0)));
  color += (blueNoise(frag, floor(u.time * 24.0)) - 0.5) / 255.0;
  return vec4f(clamp(color, vec3f(0.0), vec3f(1.0)), 1.0);
}`;
}

// ---------- RARITY: Dither ----------
function makeDitherRarity(S: string, SC: string, SD: string) {
  return `struct Uniforms { resolution: vec2f, time: f32, lightMode: f32, darkBackground: vec3f, pixelRatio: f32, lightBackground: vec3f }
@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var sceneSampler: sampler;
@group(0) @binding(2) var tScene: texture_2d<f32>;
const STRENGTH: f32 = ${S};
const SCALE: f32 = ${SC};
const SEED: f32 = ${SD};
@vertex fn vertexMain(@builtin(vertex_index) index: u32) -> @builtin(position) vec4f {
  let position = vec2f(f32((index << 1u) & 2u), f32(index & 2u));
  return vec4f(position * 2.0 - 1.0, 0.0, 1.0);
}
const LUMA = vec3f(0.2126, 0.7152, 0.0722);
fn toInk(c: vec3f) -> vec3f { return mix(c - u.darkBackground, u.lightBackground - c, vec3f(u.lightMode)); }
fn fromInk(ink: vec3f) -> vec3f { return mix(u.darkBackground + ink, u.lightBackground - ink, vec3f(u.lightMode)); }
fn sceneInk(uv: vec2f) -> vec3f { let c = clamp(uv, vec2f(0.0), vec2f(1.0)); return toInk(textureSample(tScene, sceneSampler, vec2f(c.x, 1.0 - c.y)).rgb); }
fn fmod2(x: vec2f, y: f32) -> vec2f { return x - y * floor(x / y); }
const BAYER = mat4x4f(
  0.94118, 0.29412, 0.76471, 0.05882,
  0.47059, 0.70588, 0.23529, 0.52941,
  0.82353, 0.11765, 0.88235, 0.17647,
  0.35294, 0.58824, 0.41176, 0.64706
);
fn dither(frag: vec2f) -> vec3f {
  let cell = max(2.0, floor(SCALE * 2.2 * u.pixelRatio + 0.5));
  let grid = floor(frag / cell);
  let soft = sceneInk(frag / u.resolution);
  let ink = sceneInk((grid + 0.5) * cell / u.resolution);
  let level = dot(ink, LUMA);
  let levels = 8.0;
  let b = vec2i(fmod2(grid, 4.0));
  let bayer = BAYER;
  let v = pow(max(level, 0.0), 0.8) * levels + bayer[b.x][b.y];
  let quantised = pow(floor(v) / levels, 1.25);
  let dithered = ink * (quantised / max(level, 1e-4));
  let presence = smoothstep(0.03, 0.14, level) * (0.38 + 0.2 * STRENGTH);
  return mix(soft, dithered, vec3f(presence));
}
@fragment fn fragmentMain(@builtin(position) position: vec4f) -> @location(0) vec4f {
  let frag = vec2f(position.x, u.resolution.y - position.y);
  let ink = dither(frag);
  var color = fromInk(clamp(ink, vec3f(0.0), vec3f(1.0)));
  return vec4f(clamp(color, vec3f(0.0), vec3f(1.0)), 1.0);
}`;
}

// ---------- RARITY: Wave ----------
function makeWaveRarity(S: string, SC: string, SD: string) {
  return `struct Uniforms { resolution: vec2f, time: f32, lightMode: f32, darkBackground: vec3f, pixelRatio: f32, lightBackground: vec3f }
@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var sceneSampler: sampler;
@group(0) @binding(2) var tScene: texture_2d<f32>;
const STRENGTH: f32 = ${S};
const SCALE: f32 = ${SC};
const SEED: f32 = ${SD};
@vertex fn vertexMain(@builtin(vertex_index) index: u32) -> @builtin(position) vec4f {
  let position = vec2f(f32((index << 1u) & 2u), f32(index & 2u));
  return vec4f(position * 2.0 - 1.0, 0.0, 1.0);
}
const TAU: f32 = 6.28318530718;
fn toInk(c: vec3f) -> vec3f { return mix(c - u.darkBackground, u.lightBackground - c, vec3f(u.lightMode)); }
fn fromInk(ink: vec3f) -> vec3f { return mix(u.darkBackground + ink, u.lightBackground - ink, vec3f(u.lightMode)); }
fn sceneInk(uv: vec2f) -> vec3f { let c = clamp(uv, vec2f(0.0), vec2f(1.0)); return toInk(textureSample(tScene, sceneSampler, vec2f(c.x, 1.0 - c.y)).rgb); }
fn fmod(x: f32, y: f32) -> f32 { return x - y * floor(x / y); }
fn blueNoise(p: vec2f, frame: f32) -> f32 { let q = p + 5.588238 * fmod(frame, 64.0); return fract(52.9829189 * fract(0.06711056 * q.x + 0.00583715 * q.y)); }
fn liquidFlow(p: vec2f, t: f32) -> vec2f {
  let drift = vec2f(p.y * 3.1 + t * 0.21, p.x * 2.7 - t * 0.17);
  let q = p + 0.22 * sin(drift);
  let bend = 0.22 * vec2f(3.1, 2.7) * cos(drift);
  let d0 = vec2f(0.94, 0.342);
  let d1 = vec2f(-0.6, 0.8);
  let d2 = vec2f(0.28, 0.96);
  var g = 0.38 * cos(dot(q, d0) * 10.0 - t * 0.65) * d0;
  g += 0.24 * cos(dot(q, d1) * 16.0 - t * 0.83 + 2.1) * d1;
  g += 0.12 * cos(dot(q, d2) * 23.0 - t * 1.1 + 4.3) * d2;
  return vec2f(g.x + g.y * bend.y, g.y + g.x * bend.x);
}
fn wave(frag: vec2f) -> vec3f {
  let uv = frag / u.resolution;
  let aspect = u.resolution.x / u.resolution.y;
  var p = (frag - 0.5 * u.resolution) / u.resolution.y * SCALE;
  p += vec2f(SEED * 7.1, SEED * 11.3);
  let shift = liquidFlow(p, u.time + SEED * TAU) * 0.22 * STRENGTH * vec2f(1.0 / aspect, 1.0);
  return sceneInk(uv + shift);
}
@fragment fn fragmentMain(@builtin(position) position: vec4f) -> @location(0) vec4f {
  let frag = vec2f(position.x, u.resolution.y - position.y);
  let ink = wave(frag);
  var color = fromInk(clamp(ink, vec3f(0.0), vec3f(1.0)));
  color += (blueNoise(frag, floor(u.time * 24.0)) - 0.5) / 255.0;
  return vec4f(clamp(color, vec3f(0.0), vec3f(1.0)), 1.0);
}`;
}

// ---------- RARITY: ASCII (with Glyph Texture) ----------
function makeAsciiRarity(S: string, SC: string, SD: string) {
  return `struct Uniforms { resolution: vec2f, time: f32, lightMode: f32, darkBackground: vec3f, pixelRatio: f32, lightBackground: vec3f }
@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var sceneSampler: sampler;
@group(0) @binding(2) var tScene: texture_2d<f32>;
@group(0) @binding(3) var glyphSampler: sampler;
@group(0) @binding(4) var tGlyphs: texture_2d<f32>;
const STRENGTH: f32 = ${S};
const SCALE: f32 = ${SC};
const SEED: f32 = ${SD};
const GLYPH_COUNT: f32 = 10.0;
@vertex fn vertexMain(@builtin(vertex_index) index: u32) -> @builtin(position) vec4f {
  let position = vec2f(f32((index << 1u) & 2u), f32(index & 2u));
  return vec4f(position * 2.0 - 1.0, 0.0, 1.0);
}
const LUMA = vec3f(0.2126, 0.7152, 0.0722);
fn toInk(c: vec3f) -> vec3f { return mix(c - u.darkBackground, u.lightBackground - c, vec3f(u.lightMode)); }
fn fromInk(ink: vec3f) -> vec3f { return mix(u.darkBackground + ink, u.lightBackground - ink, vec3f(u.lightMode)); }
fn sceneInk(uv: vec2f) -> vec3f { let c = clamp(uv, vec2f(0.0), vec2f(1.0)); return toInk(textureSample(tScene, sceneSampler, vec2f(c.x, 1.0 - c.y)).rgb); }
fn ascii(frag: vec2f) -> vec3f {
  let cellPx = vec2f(0.62, 1.0) * floor(SCALE * 9.0 * u.pixelRatio + 0.5);
  let cell = floor(frag / cellPx);
  let centre = (cell + 0.5) * cellPx;
  var ink = vec3f(0.0);
  ink += sceneInk(centre / u.resolution) * 2.0;
  ink += sceneInk((centre + cellPx * vec2f(0.3, 0.3)) / u.resolution);
  ink += sceneInk((centre + cellPx * vec2f(-0.3, 0.3)) / u.resolution);
  ink += sceneInk((centre + cellPx * vec2f(0.3, -0.3)) / u.resolution);
  ink += sceneInk((centre + cellPx * vec2f(-0.3, -0.3)) / u.resolution);
  ink /= 6.0;
  let level = pow(clamp(dot(ink, LUMA) * (0.9 + 0.3 * STRENGTH), 0.0, 1.0), 0.9);
  let glyph = floor(level * (GLYPH_COUNT - 1.0) + 0.5);
  let local = (frag - cell * cellPx) / cellPx;
  let atlas = vec2f((glyph + local.x) / GLYPH_COUNT, 1.0 - local.y);
  let mask = textureSample(tGlyphs, glyphSampler, atlas).r;
  let under = sceneInk(frag / u.resolution) * 0.45;
  return under + ink * mask * (1.0 + 0.7 * u.lightMode);
}
@fragment fn fragmentMain(@builtin(position) position: vec4f) -> @location(0) vec4f {
  let frag = vec2f(position.x, u.resolution.y - position.y);
  let ink = ascii(frag);
  var color = fromInk(clamp(ink, vec3f(0.0), vec3f(1.0)));
  return vec4f(clamp(color, vec3f(0.0), vec3f(1.0)), 1.0);
}`;
}

// ---------- RARITY: Film Grain ----------
function makeGrainRarity(S: string, SC: string, SD: string) {
  return `struct Uniforms { resolution: vec2f, time: f32, lightMode: f32, darkBackground: vec3f, pixelRatio: f32, lightBackground: vec3f }
@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var sceneSampler: sampler;
@group(0) @binding(2) var tScene: texture_2d<f32>;
const STRENGTH: f32 = ${S};
const SCALE: f32 = ${SC};
const SEED: f32 = ${SD};
@vertex fn vertexMain(@builtin(vertex_index) index: u32) -> @builtin(position) vec4f {
  let position = vec2f(f32((index << 1u) & 2u), f32(index & 2u));
  return vec4f(position * 2.0 - 1.0, 0.0, 1.0);
}
const LUMA = vec3f(0.2126, 0.7152, 0.0722);
fn toInk(c: vec3f) -> vec3f { return mix(c - u.darkBackground, u.lightBackground - c, vec3f(u.lightMode)); }
fn fromInk(ink: vec3f) -> vec3f { return mix(u.darkBackground + ink, u.lightBackground - ink, vec3f(u.lightMode)); }
fn sceneInk(uv: vec2f) -> vec3f { let c = clamp(uv, vec2f(0.0), vec2f(1.0)); return toInk(textureSample(tScene, sceneSampler, vec2f(c.x, 1.0 - c.y)).rgb); }
fn pcg3d(p: vec3u) -> vec3u { var v = p * 1664525u + 1013904223u; v.x += v.y*v.z; v.y += v.z*v.x; v.z += v.x*v.y; v ^= v >> vec3u(16u); v.x += v.y*v.z; v.y += v.z*v.x; v.z += v.x*v.y; return v; }
fn hash3(p: vec3f) -> vec3f { return vec3f(pcg3d(vec3u(vec3i(floor(p)) + 0x4000))) / 4294967295.0; }
fn fmod(x: f32, y: f32) -> f32 { return x - y * floor(x / y); }
fn blueNoise(p: vec2f, frame: f32) -> f32 { let q = p + 5.588238 * fmod(frame, 64.0); return fract(52.9829189 * fract(0.06711056 * q.x + 0.00583715 * q.y)); }
fn grain(frag: vec2f) -> vec3f {
  let ink = sceneInk(frag / u.resolution);
  let size = max(1.0, u.pixelRatio * 1.6 * SCALE);
  let n = hash3(vec3f(floor(frag / size), floor(u.time * 24.0))).xy;
  let g = n.x + n.y - 1.0;
  let shade = clamp(dot(ink, LUMA), 0.0, 1.0);
  let response = 4.0 * shade * (1.0 - shade);
  return ink + vec3f(g * (0.035 + 0.1 * response) * STRENGTH);
}
@fragment fn fragmentMain(@builtin(position) position: vec4f) -> @location(0) vec4f {
  let frag = vec2f(position.x, u.resolution.y - position.y);
  let ink = grain(frag);
  var color = fromInk(clamp(ink, vec3f(0.0), vec3f(1.0)));
  color += (blueNoise(frag, floor(u.time * 24.0)) - 0.5) / 255.0;
  return vec4f(clamp(color, vec3f(0.0), vec3f(1.0)), 1.0);
}`;
}

// ---------- RARITY: Mosaic Pixelate ----------
function makePixelRarity(S: string, SC: string, SD: string) {
  return `struct Uniforms { resolution: vec2f, time: f32, lightMode: f32, darkBackground: vec3f, pixelRatio: f32, lightBackground: vec3f }
@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var sceneSampler: sampler;
@group(0) @binding(2) var tScene: texture_2d<f32>;
const STRENGTH: f32 = ${S};
const SCALE: f32 = ${SC};
const SEED: f32 = ${SD};
@vertex fn vertexMain(@builtin(vertex_index) index: u32) -> @builtin(position) vec4f {
  let position = vec2f(f32((index << 1u) & 2u), f32(index & 2u));
  return vec4f(position * 2.0 - 1.0, 0.0, 1.0);
}
fn toInk(c: vec3f) -> vec3f { return mix(c - u.darkBackground, u.lightBackground - c, vec3f(u.lightMode)); }
fn fromInk(ink: vec3f) -> vec3f { return mix(u.darkBackground + ink, u.lightBackground - ink, vec3f(u.lightMode)); }
fn sceneInk(uv: vec2f) -> vec3f { let c = clamp(uv, vec2f(0.0), vec2f(1.0)); return toInk(textureSample(tScene, sceneSampler, vec2f(c.x, 1.0 - c.y)).rgb); }
fn pixelate(frag: vec2f) -> vec3f {
  let cell = max(3.0, floor(SCALE * 6.0 * u.pixelRatio + 0.5));
  let grid = floor(frag / cell);
  let centre = (grid + 0.5) * cell;
  var ink = vec3f(0.0);
  ink += sceneInk((centre + cell * vec2f(-0.25, -0.25)) / u.resolution);
  ink += sceneInk((centre + cell * vec2f(0.25, -0.25)) / u.resolution);
  ink += sceneInk((centre + cell * vec2f(-0.25, 0.25)) / u.resolution);
  ink += sceneInk((centre + cell * vec2f(0.25, 0.25)) / u.resolution);
  return ink * 0.25;
}
@fragment fn fragmentMain(@builtin(position) position: vec4f) -> @location(0) vec4f {
  let frag = vec2f(position.x, u.resolution.y - position.y);
  let ink = pixelate(frag);
  var color = fromInk(clamp(ink, vec3f(0.0), vec3f(1.0)));
  return vec4f(clamp(color, vec3f(0.0), vec3f(1.0)), 1.0);
}`;
}

// ---------- RARITY: Chroma Prism (Iridescence) ----------
function makePrismRarity(S: string, SC: string, SD: string) {
  return `struct Uniforms { resolution: vec2f, time: f32, lightMode: f32, darkBackground: vec3f, pixelRatio: f32, lightBackground: vec3f }
@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var sceneSampler: sampler;
@group(0) @binding(2) var tScene: texture_2d<f32>;
const STRENGTH: f32 = ${S};
const SCALE: f32 = ${SC};
const SEED: f32 = ${SD};
const TAU: f32 = 6.28318530718;
@vertex fn vertexMain(@builtin(vertex_index) index: u32) -> @builtin(position) vec4f {
  let position = vec2f(f32((index << 1u) & 2u), f32(index & 2u));
  return vec4f(position * 2.0 - 1.0, 0.0, 1.0);
}
fn toInk(c: vec3f) -> vec3f { return mix(c - u.darkBackground, u.lightBackground - c, vec3f(u.lightMode)); }
fn fromInk(ink: vec3f) -> vec3f { return mix(u.darkBackground + ink, u.lightBackground - ink, vec3f(u.lightMode)); }
fn sceneInk(uv: vec2f) -> vec3f { let c = clamp(uv, vec2f(0.0), vec2f(1.0)); return toInk(textureSample(tScene, sceneSampler, vec2f(c.x, 1.0 - c.y)).rgb); }
fn fmod(x: f32, y: f32) -> f32 { return x - y * floor(x / y); }
fn blueNoise(p: vec2f, frame: f32) -> f32 { let q = p + 5.588238 * fmod(frame, 64.0); return fract(52.9829189 * fract(0.06711056 * q.x + 0.00583715 * q.y)); }
fn prism(frag: vec2f) -> vec3f {
  let uv = frag / u.resolution;
  let aspect = vec2f(u.resolution.x / u.resolution.y, 1.0);
  let time = u.time * 0.22 + SEED * TAU;
  let angle = time * 0.7 + uv.y * 1.6;
  let direction = vec2f(cos(angle), sin(angle));
  let split = direction * 0.008 * STRENGTH * SCALE / aspect;
  let base = sceneInk(uv);
  let red = sceneInk(uv + split);
  let blue = sceneInk(uv - split);
  let refracted = vec3f(red.r, base.g, blue.b);
  let intensity = length(base) * 0.57735026919 * mix(1.0, 3.2, u.lightMode);
  let presence = smoothstep(0.025, 0.2, intensity);
  let phase = intensity * 4.0 + dot(uv, vec2f(1.6, -1.2)) + time;
  let coat = smoothstep(0.04, 0.28, intensity) * (1.0 - smoothstep(0.72, 1.0, intensity));
  let color = max(refracted, vec3f(0.0));
  let K = vec4f(0.0, -0.3333333333, 0.6666666667, -1.0);
  let p = mix(vec4f(color.bg, K.wz), vec4f(color.gb, K.xy), step(color.b, color.g));
  let q = mix(vec4f(p.xyw, color.r), vec4f(color.r, p.yzx), step(p.x, color.r));
  let chroma = q.x - min(q.w, q.y);
  let hue = abs(q.z + (q.w - q.y) / (6.0 * chroma + 1e-10));
  let saturation = chroma / (q.x + 1e-10);
  let hueShifted = hue + sin(phase) * 0.24 * coat;
  let satShifted = saturation + (1.0 - saturation) * coat * 0.22 * smoothstep(0.04, 0.16, saturation);
  let wheel = abs(fract(vec3f(hueShifted) + vec3f(1.0, 0.6666666667, 0.3333333333)) * 6.0 - 3.0);
  let film = q.x * mix(vec3f(1.0), clamp(wheel - 1.0, vec3f(0.0), vec3f(1.0)), vec3f(satShifted));
  return mix(base, film, vec3f(presence));
}
@fragment fn fragmentMain(@builtin(position) position: vec4f) -> @location(0) vec4f {
  let frag = vec2f(position.x, u.resolution.y - position.y);
  let ink = prism(frag);
  var color = fromInk(clamp(ink, vec3f(0.0), vec3f(1.0)));
  color += (blueNoise(frag, floor(u.time * 24.0)) - 0.5) / 255.0;
  return vec4f(clamp(color, vec3f(0.0), vec3f(1.0)), 1.0);
}`;
}

// ---------- RARITY: Pure Field (None) ----------
function makePureFieldRarity() {
  return `struct Uniforms { resolution: vec2f, time: f32, lightMode: f32, darkBackground: vec3f, pixelRatio: f32, lightBackground: vec3f }
@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var sceneSampler: sampler;
@group(0) @binding(2) var tScene: texture_2d<f32>;

@vertex fn vertexMain(@builtin(vertex_index) index: u32) -> @builtin(position) vec4f {
  let position = vec2f(f32((index << 1u) & 2u), f32(index & 2u));
  return vec4f(position * 2.0 - 1.0, 0.0, 1.0);
}

fn fmod(x: f32, y: f32) -> f32 { return x - y * floor(x / y); }
fn blueNoise(p: vec2f, frame: f32) -> f32 { let q = p + 5.588238 * fmod(frame, 64.0); return fract(52.9829189 * fract(0.06711056 * q.x + 0.00583715 * q.y)); }

@fragment fn fragmentMain(@builtin(position) position: vec4f) -> @location(0) vec4f {
  let uv = vec2f(position.x, u.resolution.y - position.y) / u.resolution;
  var color = textureSample(tScene, sceneSampler, vec2f(uv.x, 1.0 - uv.y)).rgb;
  color += (blueNoise(position.xy, floor(u.time * 24.0)) - 0.5) / 255.0;
  return vec4f(clamp(color, vec3f(0.0), vec3f(1.0)), 1.0);
}`;
}

// Glyph Atlas Generator
function createGlyphAtlas() {
  const width = GLYPH_CELL.width * GLYPHS.length;
  const height = GLYPH_CELL.height;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('2D context failed for glyph atlas');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = GLYPH_FONT;
  for (let i = 0; i < GLYPHS.length; i++) {
    ctx.fillText(GLYPHS[i], i * GLYPH_CELL.width + GLYPH_CELL.width / 2, height / 2 + height * 0.04);
  }
  const levels: Uint8ClampedArray[] = [ctx.getImageData(0, 0, width, height).data];
  let w = width;
  let h = height;
  for (let level = 1; level < GLYPH_MIP_LEVELS; level++) {
    const source = levels[level - 1];
    const next = new Uint8ClampedArray((w / 2) * (h / 2) * 4);
    for (let y = 0; y < h / 2; y++) {
      for (let x = 0; x < w / 2; x++) {
        const a = (y * 2 * w + x * 2) * 4;
        const b = a + 4;
        const c = a + w * 4;
        const d = c + 4;
        for (let ch = 0; ch < 4; ch++) {
          next[(y * (w / 2) + x) * 4 + ch] = (source[a + ch] + source[b + ch] + source[c + ch] + source[d + ch] + 2) >> 2;
        }
      }
    }
    levels.push(next);
    w /= 2;
    h /= 2;
  }
  return { width, height, levels };
}

function uploadGlyphAtlas(device: GPUDevice) {
  const atlas = createGlyphAtlas();
  const texture = device.createTexture({
    size: [atlas.width, atlas.height],
    mipLevelCount: atlas.levels.length,
    format: 'rgba8unorm',
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
  });
  atlas.levels.forEach((pixels, level) => {
    const w = atlas.width >> level;
    const h = atlas.height >> level;
    device.queue.writeTexture(
      { texture, mipLevel: level },
      pixels,
      { bytesPerRow: w * 4 },
      [w, h]
    );
  });
  return texture;
}

// Pipeline Factory
function makeFactory(FIELD_SRC: string, RARITY_SRC: string, hasGlyphs = false) {
  return async function createShader(canvas: HTMLCanvasElement, options: ShaderInitOptions = {}): Promise<ShaderHandle> {
    const dark = parseHex((options.background && options.background.dark) || '#090909');
    const light = parseHex((options.background && options.background.light) || '#ffffff');
    if (options.signal?.aborted) throw new Error('Aborted');
    if (!navigator.gpu) throw new Error('WebGPU not supported in this environment');
    const adapter = await navigator.gpu.requestAdapter();
    if (options.signal?.aborted) throw new Error('Aborted');
    if (!adapter) throw new Error('No WebGPU adapter found');
    const device = await adapter.requestDevice();

    let context: GPUCanvasContext | null = null;
    let configured = false;
    let released = false;
    let failure: Error | null = null;
    let handle: ShaderHandle | null = null;

    function release() {
      if (released) return;
      released = true;
      if (options.signal) options.signal.removeEventListener('abort', abort);
      device.removeEventListener('uncapturederror', gpuError);
      if (configured && context) context.unconfigure();
      device.destroy();
    }

    function abort() {
      if (handle) handle.destroy();
      else release();
    }

    function fail(error: Error) {
      if (released) return;
      failure = error;
      if (handle) {
        handle.destroy();
        if (options.onError) options.onError(error);
        else console.error(error);
      } else {
        release();
      }
    }

    function gpuError(e: Event) {
      e.preventDefault();
      fail(new Error((e as { error?: { message?: string } }).error?.message || 'GPU Error'));
    }

    function checkActive() {
      if (options.signal?.aborted) throw new Error('Aborted');
      if (failure) throw failure;
    }

    if (options.signal) options.signal.addEventListener('abort', abort, { once: true });
    device.addEventListener('uncapturederror', gpuError);
    device.lost.then((info: any) => {
      if (!released) fail(new Error('WebGPU device lost: ' + (info.message || info.reason)));
    });

    try {
      checkActive();
      const format = navigator.gpu.getPreferredCanvasFormat();
      const uniforms = device.createBuffer({
        size: UNIFORM_FLOATS * 4,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });
      const uniformData = new Float32Array(UNIFORM_FLOATS);
      const fieldModule = device.createShaderModule({ code: FIELD_SRC });
      const postModule = device.createShaderModule({ code: RARITY_SRC });

      const results = await Promise.all([
        device.createRenderPipelineAsync({
          layout: 'auto',
          vertex: { module: fieldModule, entryPoint: 'vertexMain' },
          fragment: { module: fieldModule, entryPoint: 'fragmentMain', targets: [{ format: 'rgba8unorm' }] },
          primitive: { topology: 'triangle-list' },
        }),
        device.createRenderPipelineAsync({
          layout: 'auto',
          vertex: { module: postModule, entryPoint: 'vertexMain' },
          fragment: { module: postModule, entryPoint: 'fragmentMain', targets: [{ format }] },
          primitive: { topology: 'triangle-list' },
        }),
        device.createRenderPipelineAsync({
          layout: 'auto',
          vertex: { module: postModule, entryPoint: 'vertexMain' },
          fragment: {
            module: postModule,
            entryPoint: 'fragmentMain',
            targets: [
              {
                format,
                blend: {
                  color: { srcFactor: 'constant', dstFactor: 'one-minus-constant' },
                  alpha: { srcFactor: 'one', dstFactor: 'zero' },
                },
              },
            ],
          },
          primitive: { topology: 'triangle-list' },
        }),
      ]);

      const fieldPipeline = results[0];
      const postPipeline = results[1];
      const postBlendPipeline = results[2];
      checkActive();

      const fieldBindGroup = device.createBindGroup({
        layout: fieldPipeline.getBindGroupLayout(0),
        entries: [{ binding: 0, resource: { buffer: uniforms } }],
      });

      const sceneSampler = device.createSampler({
        magFilter: 'linear',
        minFilter: 'linear',
        addressModeU: 'clamp-to-edge',
        addressModeV: 'clamp-to-edge',
      });

      let glyphView: GPUTextureView | null = null;
      let glyphSampler: GPUSampler | null = null;
      if (hasGlyphs) {
        const glyphTex = uploadGlyphAtlas(device);
        glyphView = glyphTex.createView();
        glyphSampler = device.createSampler({
          magFilter: 'linear',
          minFilter: 'linear',
          mipmapFilter: 'linear',
          addressModeU: 'clamp-to-edge',
          addressModeV: 'clamp-to-edge',
        });
      }

      let scene: GPUTexture | null = null;
      let sceneView: GPUTextureView | null = null;
      let postBindGroups: GPUBindGroup[] = [];

      function sceneFor(w: number, h: number) {
        if (scene && sceneView && scene.width === w && scene.height === h) {
          return { view: sceneView, postBindGroups };
        }
        if (scene) scene.destroy();
        scene = device.createTexture({
          size: [w, h],
          format: 'rgba8unorm',
          usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
        });
        const view = scene.createView();
        sceneView = view;

        const bindEntries = () => {
          const base: GPUBindGroupEntry[] = [
            { binding: 0, resource: { buffer: uniforms } },
            { binding: 1, resource: sceneSampler },
            { binding: 2, resource: view },
          ];
          if (hasGlyphs && glyphSampler && glyphView) {
            base.push({ binding: 3, resource: glyphSampler });
            base.push({ binding: 4, resource: glyphView });
          }
          return base;
        };

        postBindGroups = [postPipeline, postBlendPipeline].map((pipeline) =>
          device.createBindGroup({ layout: pipeline.getBindGroupLayout(0), entries: bindEntries() })
        );
        return { view, postBindGroups };
      }

      const canvasContext: any = (canvas as any).getContext('webgpu');
      if (!canvasContext) throw new Error('Failed to get WebGPU context on canvas');
      context = canvasContext;
      context.configure({ device, format, alphaMode: 'opaque' });
      configured = true;

      handle = animate(
        options,
        (time, themeVal, pixelRatio) => {
          const w = canvas.width;
          const h = canvas.height;
          const output = canvasContext.getCurrentTexture().createView();
          const target = sceneFor(w, h);

          const drawThemed = (mode: number, blend: boolean) => {
            uniformData.set([w, h, time, mode, dark[0], dark[1], dark[2], pixelRatio, light[0], light[1], light[2], 0]);
            device.queue.writeBuffer(uniforms, 0, uniformData);
            const encoder = device.createCommandEncoder();

            const fieldPass = encoder.beginRenderPass({
              colorAttachments: [{ view: target.view, loadOp: 'clear', storeOp: 'store' }],
            });
            fieldPass.setPipeline(fieldPipeline);
            fieldPass.setBindGroup(0, fieldBindGroup);
            fieldPass.draw(3);
            fieldPass.end();

            const postPass = encoder.beginRenderPass({
              colorAttachments: [{ view: output, loadOp: blend ? 'load' : 'clear', storeOp: 'store' }],
            });
            postPass.setPipeline(blend ? postBlendPipeline : postPipeline);
            postPass.setBindGroup(0, target.postBindGroups[blend ? 1 : 0]);
            if (blend) postPass.setBlendConstant({ r: themeVal, g: themeVal, b: themeVal, a: themeVal });
            postPass.draw(3);
            postPass.end();

            device.queue.submit([encoder.finish()]);
          };

          if (themeVal <= 0 || themeVal >= 1) {
            drawThemed(themeVal, false);
            return;
          }
          drawThemed(0, false);
          drawThemed(1, true);
        },
        canvas,
        release,
        device.limits.maxTextureDimension2D
      );

      return handle;
    } catch (error) {
      release();
      throw failure || error;
    }
  };
}

// ---------- 34 CONSTANTS PER FIELD PRESET ----------
export const WEBGPU_FIELDS: Record<string, Record<string, string>> = {
  air: {
    H: '0.439851463', HS: '0.428340882', HT: '1.54191685', C: '0.154862076', L: '0.523634911',
    CC: '0.0968288556', T: '2.12355399', SH: '0.966571093', SK: '0.957600117', LA: '83.0',
    WFX: '0.300714314', WFY: '2.03506064', WAX: '0.138012335', WAY: '0.0210414622', ASX: '2.23008156',
    ASY: '0.131160721', OFX: '0.405637056', OFY: '0.000916713849', TI: '-1.23462391', ZO: '0.992975473',
    CX: '-0.414853513', CY: '0.496153444', GS: '0.00257967319', FA: '0.463401735', VI: '0.131955594',
    FS: '0.433172137', FD: '1.0', BR: '0.451510012', BA: '0.100897223', PH: '80.5346146',
    EC: '0.0', ES: '0.135017902', SO: '0.0025390191', LS: '0.153392911'
  },
  kelindi: {
    H: '0.853899896', HS: '0.243281275', HT: '2.05471683', C: '0.1194828', L: '0.480156898',
    CC: '0.231054366', T: '2.12938833', SH: '0.96665287', SK: '0.948980153', LA: '80.0',
    WFX: '0.454451174', WFY: '2.46889353', WAX: '0.125572219', WAY: '0.0303366184', ASX: '2.47954059',
    ASY: '0.169323161', OFX: '0.327447295', OFY: '-0.0356214233', TI: '-3.03854942', ZO: '0.983532667',
    CX: '-0.392939955', CY: '-0.615513027', GS: '0.00256748754', FA: '0.253091961', VI: '0.034909226',
    FS: '0.597750247', FD: '1.0', BR: '0.559575677', BA: '0.058979746', PH: '98.0211487',
    EC: '0.0', ES: '-0.140164912', SO: '0.00257628085', LS: '0.16142574'
  },
  sayhihelena: {
    H: '0.720361888', HS: '0.349669188', HT: '1.70050633', C: '0.10352613', L: '0.561100006',
    CC: '0.12933065', T: '2.10978699', SH: '0.961995542', SK: '0.947221935', LA: '79.0',
    WFX: '0.415066779', WFY: '2.14907217', WAX: '0.157927275', WAY: '0.0205388926', ASX: '1.68839979',
    ASY: '0.15025115', OFX: '0.392220587', OFY: '-0.0523033664', TI: '2.15836644', ZO: '1.00611782',
    CX: '0.680386543', CY: '-0.266672224', GS: '0.00137288647', FA: '0.329858065', VI: '0.0830284804',
    FS: '0.593660653', FD: '1.0', BR: '0.466177434', BA: '0.0937710553', PH: '59.0342789',
    EC: '0.0', ES: '-0.156331688', SO: '0.00145264028', LS: '0.222479969'
  },
  carlos: {
    H: '0.953558862', HS: '-0.491160721', HT: '1.65145338', C: '0.0908309966', L: '0.54953903',
    CC: '0.125753418', T: '2.12491512', SH: '0.962902427', SK: '0.952455223', LA: '83.0',
    WFX: '0.562522471', WFY: '2.10978818', WAX: '0.159687653', WAY: '0.0240008794', ASX: '2.16181493',
    ASY: '0.178594097', OFX: '0.345220298', OFY: '0.031821914', TI: '1.68041277', ZO: '0.996278703',
    CX: '-0.581957221', CY: '-0.339488804', GS: '0.00201935368', FA: '0.480227113', VI: '0.0938276798',
    FS: '0.384566873', FD: '1.0', BR: '0.365061879', BA: '0.067679435', PH: '27.8155327',
    EC: '0.0', ES: '0.194791839', SO: '0.00213065301', LS: '0.157006845'
  },
  staromlynski: {
    H: '0.515102386', HS: '0.460488886', HT: '1.64279163', C: '0.101843171', L: '0.520184398',
    CC: '0.0839458779', T: '2.1215837', SH: '0.96667105', SK: '0.953903258', LA: '95.0',
    WFX: '0.516253591', WFY: '2.09681606', WAX: '0.117327176', WAY: '0.0273007415', ASX: '2.09064245',
    ASY: '0.217430815', OFX: '0.382512331', OFY: '0.00480299955', TI: '-0.749914765', ZO: '0.917856753',
    CX: '-0.578542233', CY: '-0.30361414', GS: '0.00288927788', FA: '0.393958181', VI: '0.0987237841',
    FS: '0.567056894', FD: '-1.0', BR: '0.414708227', BA: '0.116660208', PH: '90.528511',
    EC: '0.0', ES: '0.163302079', SO: '0.00228373543', LS: '0.144848123'
  },
  mark: {
    H: '0.486070067', HS: '0.111759126', HT: '1.55254161', C: '0.108428784', L: '0.548564792',
    CC: '0.146758944', T: '2.14003706', SH: '0.955533564', SK: '0.952574313', LA: '84.0',
    WFX: '0.522110701', WFY: '2.73386359', WAX: '0.130835667', WAY: '0.0330337696', ASX: '1.63501072',
    ASY: '0.144265264', OFX: '0.340434849', OFY: '0.0442607477', TI: '-1.33966529', ZO: '0.929959655',
    CX: '-0.502136886', CY: '0.378342539', GS: '0.00197308906', FA: '0.415533155', VI: '0.0513680056',
    FS: '0.41825375', FD: '-1.0', BR: '0.629312098', BA: '0.109391183', PH: '33.5775719',
    EC: '0.460541844', ES: '0.217975304', SO: '0.00218689837', LS: '0.19177866'
  },
  liuying: {
    H: '0.651785553', HS: '-0.202530444', HT: '2.14122224', C: '0.150691271', L: '0.573508739',
    CC: '0.0935513452', T: '2.11552095', SH: '0.955101252', SK: '0.948292971', LA: '88.0',
    WFX: '0.516268611', WFY: '2.96838808', WAX: '0.126769111', WAY: '0.0203619823', ASX: '2.49106741',
    ASY: '0.17887409', OFX: '0.326592922', OFY: '0.0390658043', TI: '0.964202762', ZO: '1.07664168',
    CX: '0.341283381', CY: '-0.571005881', GS: '0.00128985895', FA: '0.265170932', VI: '0.024636168',
    FS: '0.555837989', FD: '1.0', BR: '0.381124496', BA: '0.11700312', PH: '73.6736984',
    EC: '0.0', ES: '-0.125663355', SO: '0.00130237942', LS: '0.234280705'
  },
  shawn_chen: {
    H: '0.66767545', HS: '0.47192232', HT: '2.57559351', C: '0.15164860', L: '0.61633682',
    CC: '0.22596023', T: '2.12765483', SH: '0.96806157', SK: '0.95887559', LA: '81.0',
    WFX: '0.55943418', WFY: '2.61540013', WAX: '0.13024959', WAY: '0.02513764', ASX: '2.41158217',
    ASY: '0.16591288', OFX: '0.41437028', OFY: '-0.03071701', TI: '2.22394940', ZO: '0.97121794',
    CX: '-0.65230828', CY: '-0.34031260', GS: '0.00109223', FA: '0.32101698', VI: '0.01623475',
    FS: '0.60396569', FD: '-1.0', BR: '0.48653352', BA: '0.08904690', PH: '23.45003537',
    EC: '0.52770328', ES: '0.20015840', SO: '0.00125142', LS: '0.18090923'
  },
  splines: {
    H: '0.17178966', HS: '-0.19732550', HT: '2.44876636', C: '0.13852049', L: '0.48836850',
    CC: '0.11666184', T: '2.12335440', SH: '0.96017756', SK: '0.95449780', LA: '88.0',
    WFX: '0.44636432', WFY: '2.57467783', WAX: '0.10362208', WAY: '0.03124992', ASX: '1.72514646',
    ASY: '0.18701584', OFX: '0.30339593', OFY: '0.03543914', TI: '1.13588993', ZO: '0.96023433',
    CX: '-0.38380612', CY: '0.40837525', GS: '0.00219268', FA: '0.33206623', VI: '0.12719182',
    FS: '0.51394942', FD: '1.0', BR: '0.43775429', BA: '0.06027347', PH: '78.50393064',
    EC: '0.00000000', ES: '-0.18823344', SO: '0.00232846', LS: '0.22138684'
  },
  farrel: {
    H: '0.11780342', HS: '-0.30835296', HT: '1.93845173', C: '0.09661278', L: '0.49365537',
    CC: '0.23008279', T: '2.13751173', SH: '0.96258929', SK: '0.95608431', LA: '82.0',
    WFX: '0.42811097', WFY: '2.45544851', WAX: '0.13929396', WAY: '0.02746684', ASX: '2.52806305',
    ASY: '0.18066684', OFX: '0.40489035', OFY: '0.05608278', TI: '-1.73032047', ZO: '0.93392352',
    CX: '-0.56715734', CY: '-0.35790054', GS: '0.00316698', FA: '0.30490259', VI: '0.01641608',
    FS: '0.41818492', FD: '1.0', BR: '0.52991405', BA: '0.06986163', PH: '39.17858808',
    EC: '0.41928483', ES: '-0.15290779', SO: '0.00205463', LS: '0.19726391'
  },
  patrik: {
    H: '0.93472110', HS: '-0.30948796', HT: '2.23175736', C: '0.10699393', L: '0.60411601',
    CC: '0.22396402', T: '2.14593356', SH: '0.97009472', SK: '0.95803782', LA: '77.0',
    WFX: '0.51123690', WFY: '2.29393110', WAX: '0.11864298', WAY: '0.02063688', ASX: '2.54555307',
    ASY: '0.19744281', OFX: '0.35170515', OFY: '-0.03909843', TI: '-2.68819788', ZO: '1.17772883',
    CX: '-0.76970651', CY: '0.24553029', GS: '0.00351817', FA: '0.40218959', VI: '0.01738767',
    FS: '0.48758836', FD: '-1.0', BR: '0.39742822', BA: '0.06726581', PH: '88.66405375',
    EC: '0.34892112', ES: '0.14323366', SO: '0.00255474', LS: '0.23512800'
  },
  loewe: {
    H: '0.08260769', HS: '-0.33326954', HT: '1.81873196', C: '0.16176939', L: '0.54533700',
    CC: '0.20947954', T: '2.11100919', SH: '0.96177398', SK: '0.95276443', LA: '90.0',
    WFX: '0.35893217', WFY: '2.61145503', WAX: '0.13676265', WAY: '0.02637080', ASX: '1.80099339',
    ASY: '0.19987912', OFX: '0.38389994', OFY: '0.04537766', TI: '0.17598766', ZO: '1.11744698',
    CX: '0.12386526', CY: '0.50444709', GS: '0.00145734', FA: '0.39872581', VI: '0.00382313',
    FS: '0.42936513', FD: '-1.0', BR: '0.41078669', BA: '0.11055659', PH: '6.40605991',
    EC: '0.59161212', ES: '-0.16705438', SO: '0.00148402', LS: '0.12014168'
  },
  javazero: {
    H: '0.04902839', HS: '0.00136336', HT: '1.44087727', C: '0.14056128', L: '0.58046572',
    CC: '0.08859824', T: '2.14788202', SH: '0.95677448', SK: '0.95662925', LA: '81.0',
    WFX: '0.48103886', WFY: '2.31164304', WAX: '0.11179327', WAY: '0.02443068', ASX: '1.65608717',
    ASY: '0.13169545', OFX: '0.41897634', OFY: '-0.00665813', TI: '1.12644951', ZO: '1.05384739',
    CX: '0.13956033', CY: '-0.55423633', GS: '0.00170195', FA: '0.30877539', VI: '0.00109082',
    FS: '0.45719709', FD: '1.0', BR: '0.42816699', BA: '0.05230976', PH: '83.12684756',
    EC: '0.00000000', ES: '0.15924754', SO: '0.00201372', LS: '0.29648432'
  },
  banhua: {
    H: '0.77778096', HS: '-0.36966741', HT: '2.31370751', C: '0.12479436', L: '0.60452303',
    CC: '0.13512868', T: '2.12539329', SH: '0.96670382', SK: '0.95279043', LA: '93.0',
    WFX: '0.45798569', WFY: '2.03068018', WAX: '0.10232188', WAY: '0.03248875', ASX: '2.19231974',
    ASY: '0.21505253', OFX: '0.30074531', OFY: '0.05429299', TI: '2.75970096', ZO: '1.00529625',
    CX: '-0.58254837', CY: '0.22265390', GS: '0.00165301', FA: '0.40305248', VI: '0.10231467',
    FS: '0.36185719', FD: '-1.0', BR: '0.50418886', BA: '0.07636515', PH: '45.41176115',
    EC: '0.41589689', ES: '0.15366473', SO: '0.00145784', LS: '0.22865688'
  },
  cyrsks: {
    H: '0.53340699', HS: '0.42544975', HT: '2.07029602', C: '0.12661445', L: '0.59694336',
    CC: '0.14155141', T: '2.13781126', SH: '0.96241076', SK: '0.94779040', LA: '76.0',
    WFX: '0.58917827', WFY: '2.07825881', WAX: '0.13025988', WAY: '0.02209316', ASX: '1.77193892',
    ASY: '0.13875082', OFX: '0.33006169', OFY: '0.05524697', TI: '0.50579483', ZO: '0.98135715',
    CX: '-0.44582384', CY: '0.53869059', GS: '0.00204451', FA: '0.48402232', VI: '0.00339199',
    FS: '0.53415875', FD: '1.0', BR: '0.53193521', BA: '0.10527234', PH: '87.03960185',
    EC: '0.00000000', ES: '-0.20766440', SO: '0.00174527', LS: '0.18768799'
  },
  orcdev: {
    H: '0.42000000', HS: '0.04000000', HT: '2.06519770', C: '0.16762627', L: '0.48112461',
    CC: '0.21175865', T: '2.13090275', SH: '0.95882110', SK: '0.94642863', LA: '73.0',
    WFX: '0.50245594', WFY: '2.46111050', WAX: '0.13653505', WAY: '0.03360587', ASX: '2.39372459',
    ASY: '0.14580487', OFX: '0.37624113', OFY: '0.04550973', TI: '-0.38896125', ZO: '1.18494221',
    CX: '0.66531019', CY: '-0.29026094', GS: '0.00269337', FA: '0.34501326', VI: '0.02874828',
    FS: '0.57602643', FD: '-1.0', BR: '0.56690562', BA: '0.11776095', PH: '80.49514752',
    EC: '0.40353621', ES: '-0.12153512', SO: '0.00206883', LS: '0.18709846'
  },
  clio: {
    H: '0.74068785', HS: '-0.14697077', HT: '1.82073136', C: '0.13082348', L: '0.61373276',
    CC: '0.12899610', T: '2.11030667', SH: '0.96343145', SK: '0.95454888', LA: '93.0',
    WFX: '0.55565118', WFY: '2.71528717', WAX: '0.13516596', WAY: '0.02129676', ASX: '2.56368069',
    ASY: '0.18667259', OFX: '0.30847994', OFY: '0.01511826', TI: '-2.66877017', ZO: '1.15250036',
    CX: '0.46259780', CY: '0.32760367', GS: '0.00188417', FA: '0.35945061', VI: '0.06219936',
    FS: '0.62615521', FD: '-1.0', BR: '0.55965634', BA: '0.09872553', PH: '48.43384014',
    EC: '0.00000000', ES: '-0.21215602', SO: '0.00125680', LS: '0.16804150'
  }
};

// Helper to choose rarity factory function
function createRarityFactory(field: Record<string, string>, rarity: string, strength: string, scale: string, seed: string) {
  switch (rarity) {
    case 'prism':
      return makeFactory(makeFieldShader(field), makePrismRarity(strength, scale, seed));
    case 'pixel':
      return makeFactory(makeFieldShader(field), makePixelRarity(strength, scale, seed));
    case 'grain':
      return makeFactory(makeFieldShader(field), makeGrainRarity(strength, scale, seed));
    case 'halftone':
      return makeFactory(makeFieldShader(field), makeHalftoneRarity(strength, scale, seed));
    case 'sparkle':
      return makeFactory(makeFieldShader(field), makeSparkleRarity(strength, scale, seed));
    case 'dither':
      return makeFactory(makeFieldShader(field), makeDitherRarity(strength, scale, seed));
    case 'wave':
      return makeFactory(makeFieldShader(field), makeWaveRarity(strength, scale, seed));
    case 'ascii':
      return makeFactory(makeFieldShader(field), makeAsciiRarity(strength, scale, seed), true);
    case 'none':
    default:
      return makeFactory(makeFieldShader(field), makePureFieldRarity());
  }
}

// ---------- COMPLETE WEBGPU SHADER REGISTRY ----------
export const OPENS_SHADERS_REGISTRY: Record<string, ShaderOption> = {
  none: {
    label: 'None',
    family: 'Base Gradient',
    colors: ['#eaeae3', '#f6f6f0'],
    factory: null,
  },
  // --- Original Presets ---
  halftone: {
    label: 'Halftone',
    family: 'Print',
    colors: ['#3b1e52', '#a56cd1'],
    factory: makeFactory(
      makeFieldShader(WEBGPU_FIELDS.air),
      makeHalftoneRarity('1.27397215', '1.07013023', '0.29828313')
    ),
  },
  'halftone-ink': {
    label: 'Halftone Ink',
    family: 'Print',
    colors: ['#1a2456', '#5b7bd5'],
    factory: makeFactory(
      makeFieldShader(WEBGPU_FIELDS.kelindi),
      makeHalftoneRarity('0.74396807', '1.17828524', '0.0128802005')
    ),
  },
  sparkle: {
    label: 'Sparkle',
    family: 'Glint',
    colors: ['#0d3b4a', '#7ee0d5'],
    factory: makeFactory(
      makeFieldShader(WEBGPU_FIELDS.sayhihelena),
      makeSparkleRarity('1.01332104', '1.2329613', '0.300328851')
    ),
  },
  'sparkle-warm': {
    label: 'Sparkle Warm',
    family: 'Glint',
    colors: ['#5a1238', '#ff85b8'],
    factory: makeFactory(
      makeFieldShader(WEBGPU_FIELDS.carlos),
      makeSparkleRarity('0.931340933', '1.03212512', '0.602355659')
    ),
  },
  dither: {
    label: 'Dither',
    family: 'Retro',
    colors: ['#1a3a1a', '#66c266'],
    factory: makeFactory(
      makeFieldShader(WEBGPU_FIELDS.staromlynski),
      makeDitherRarity('1.16996026', '1.00625122', '0.11724373')
    ),
  },
  wave: {
    label: 'Wave',
    family: 'Liquid',
    colors: ['#0a2f4a', '#3ba9e0'],
    factory: makeFactory(
      makeFieldShader(WEBGPU_FIELDS.mark),
      makeWaveRarity('0.854733527', '0.978550255', '0.409785569')
    ),
  },
  ascii: {
    label: 'ASCII',
    family: 'Terminal',
    colors: ['#2d1a4a', '#b28ae0'],
    factory: makeFactory(
      makeFieldShader(WEBGPU_FIELDS.liuying),
      makeAsciiRarity('1.00562561', '1.20803118', '0.572546363'),
      true
    ),
  },

  // --- New Themes Pulled from OpenShaders Explore ---
  prism: {
    label: 'Chroma Prism (Shawn Chen)',
    family: 'Prism (1% Ultra Rare)',
    colors: ['#00224c', '#008cd3'],
    factory: createRarityFactory(
      WEBGPU_FIELDS.shawn_chen,
      'prism',
      '1.19484222',
      '1.06297163',
      '0.87252086'
    ),
  },
  splines: {
    label: 'Iridescent Splines',
    family: 'Prism (1% Ultra Rare)',
    colors: ['#300100', '#934500'],
    factory: createRarityFactory(
      WEBGPU_FIELDS.splines,
      'prism',
      '0.98339908',
      '0.94194330',
      '0.97585127'
    ),
  },
  pixel: {
    label: 'Mosaic Grid (Farrel)',
    family: 'Pixel (4% Rare)',
    colors: ['#2d0500', '#8f4b30'],
    factory: createRarityFactory(
      WEBGPU_FIELDS.farrel,
      'pixel',
      '0.93649039',
      '1.23447633',
      '0.06845933'
    ),
  },
  grain: {
    label: 'Analog Film Grain (Patrik)',
    family: 'Grain (13% Rare)',
    colors: ['#340d2d', '#a96599'],
    factory: createRarityFactory(
      WEBGPU_FIELDS.patrik,
      'grain',
      '0.83661489',
      '0.99064083',
      '0.36771475'
    ),
  },
  loewe: {
    label: 'Velvet Matrix (Loewe)',
    family: 'ASCII Terminal',
    colors: ['#3f0000', '#b93f32'],
    factory: createRarityFactory(
      WEBGPU_FIELDS.loewe,
      'ascii',
      '1.19266318',
      '0.81735217',
      '0.63752591'
    ),
  },
  javazero: {
    label: 'Cyber Vermilion (Javazero)',
    family: 'ASCII Terminal',
    colors: ['#40000b', '#bf525b'],
    factory: createRarityFactory(
      WEBGPU_FIELDS.javazero,
      'ascii',
      '1.01075283',
      '1.16685059',
      '0.27273142'
    ),
  },
  banhua: {
    label: 'Blossom Aurora (Banhua)',
    family: 'Liquid Wave',
    colors: ['#191745', '#7277c6'],
    factory: createRarityFactory(
      WEBGPU_FIELDS.banhua,
      'none',
      '0.74168407',
      '1.12520508',
      '0.80435769'
    ),
  },
  cyrsks: {
    label: 'Deep Sapphire (Cyrsks)',
    family: 'Liquid Flow',
    colors: ['#002a29', '#009491'],
    factory: createRarityFactory(
      WEBGPU_FIELDS.cyrsks,
      'none',
      '0.87856030',
      '1.22541701',
      '0.40317590'
    ),
  },
  orcdev: {
    label: 'Emerald Pulse (Orcdev)',
    family: 'Grain (Creator Preset)',
    colors: ['#002000', '#007622'],
    factory: createRarityFactory(
      WEBGPU_FIELDS.orcdev,
      'grain',
      '0.84650252',
      '0.81487926',
      '0.63778033'
    ),
  },
  clio: {
    label: 'Solar Amber (Clio)',
    family: 'Retro Dither',
    colors: ['#0c1b4b', '#5f7fd1'],
    factory: createRarityFactory(
      WEBGPU_FIELDS.clio,
      'dither',
      '0.96394081',
      '1.15359183',
      '0.02567971'
    ),
  },

  // --- Aliased Built-in Themes ---
  holographic: {
    label: 'Hologram Neon',
    family: 'Prism (1% Ultra Rare)',
    colors: ['#300100', '#934500'],
    factory: createRarityFactory(
      WEBGPU_FIELDS.splines,
      'prism',
      '0.98339908',
      '0.94194330',
      '0.97585127'
    ),
  },
  obsidian: {
    label: 'Obsidian Film',
    family: 'Grain (13% Rare)',
    colors: ['#121214', '#52525b'],
    factory: createRarityFactory(
      WEBGPU_FIELDS.patrik,
      'grain',
      '0.83661489',
      '0.99064083',
      '0.36771475'
    ),
  },
};

// =========================================================================
// Dynamic OpenShaders Generator Engine (Authentic Deterministic Algorithm)
// =========================================================================
function fnv1a(str: string): [number, number] {
  let t = 2166136261;
  let n = 1523705862;
  for (const char of str) {
    const code = char.codePointAt(0) || 0;
    t = Math.imul(t ^ code, 16777619) >>> 0;
    n = Math.imul(n ^ (code * 40503), 2246822507) >>> 0;
  }
  return [t, n];
}

function* prng(seedStr: string): Generator<number> {
  const [n, r] = fnv1a(seedStr);
  let i = n >>> 0;
  let a = (r | 1) >>> 0;
  while (true) {
    let e = i;
    i = (Math.imul(i, 747796405) + a) >>> 0;
    e = Math.imul(e ^ (e >>> 15), 739982445) >>> 0;
    e = Math.imul(e ^ (e >>> 12), 695872825) >>> 0;
    e = (e ^ (e >>> 15)) >>> 0;
    yield e / 4294967296;
    a = (a + 2654435769) | 1;
  }
}

export function generateOpenShaderFieldParams(username: string): Record<string, string> {
  const clean = username.trim().toLowerCase();
  const gen = prng(clean);
  const next = () => gen.next().value as number;
  const lerp = (min: number, max: number) => min + (max - min) * next();
  const sign = () => (next() < 0.5 ? -1 : 1);

  const angle = lerp(0, Math.PI * 2);
  const dist = lerp(0.5, 0.7);
  let rawHue = next() * 0.84;
  if (rawHue > 0.23) rawHue += 0.16;
  const hueSpread = lerp(-0.4, 0.4);

  return {
    H: rawHue.toFixed(8),
    HS: hueSpread.toFixed(8),
    HT: lerp(1.4, 2.6).toFixed(8),
    C: lerp(0.08, 0.17).toFixed(8),
    L: lerp(0.48, 0.64).toFixed(8),
    CC: lerp(0.08, 0.24).toFixed(8),
    T: lerp(2.108, 2.15).toFixed(8),
    SH: lerp(0.955, 0.972).toFixed(8),
    SK: lerp(0.946, 0.96).toFixed(8),
    LA: (70 + Math.floor(next() * 26)).toFixed(1),
    WFX: lerp(0.3, 0.6).toFixed(8),
    WFY: lerp(2.0, 3.0).toFixed(8),
    WAX: lerp(0.1, 0.16).toFixed(8),
    WAY: lerp(0.02, 0.035).toFixed(8),
    ASX: lerp(1.6, 2.6).toFixed(8),
    ASY: lerp(0.13, 0.22).toFixed(8),
    OFX: lerp(0.3, 0.42).toFixed(8),
    OFY: lerp(-0.06, 0.06).toFixed(8),
    TI: lerp(-Math.PI, Math.PI).toFixed(8),
    ZO: lerp(0.9, 1.2).toFixed(8),
    CX: (Math.cos(angle) * dist * 1.2).toFixed(8),
    CY: (Math.sin(angle) * dist).toFixed(8),
    GS: lerp(0.0012, 0.0028).toFixed(8),
    FA: lerp(0.25, 0.5).toFixed(8),
    VI: lerp(0, 0.15).toFixed(8),
    FS: lerp(0.35, 0.63).toFixed(8),
    FD: sign().toFixed(1),
    BR: lerp(0.35, 0.63).toFixed(8),
    BA: lerp(0.05, 0.12).toFixed(8),
    PH: lerp(0, 100).toFixed(8),
    EC: (next() < 0.5 ? 0 : lerp(0.3, 0.7)).toFixed(8),
    ES: (lerp(0.12, 0.22) * sign()).toFixed(8),
    SO: lerp(0.0012, 0.0025).toFixed(8),
    LS: lerp(0.14, 0.28).toFixed(8),
  };
}

export function calculateOpenShaderRarity(username: string): {
  rarity: string;
  strength: string;
  scale: string;
  seed: string;
  rate: string;
} {
  const clean = username.trim().toLowerCase();
  const gen = prng(`${clean}\0rarity`);
  const next = () => gen.next().value as number;
  let dice = next();

  const rarities = ['none', 'grain', 'wave', 'dither', 'halftone', 'sparkle', 'ascii', 'pixel', 'prism'] as const;
  const weights: Record<string, number> = {
    none: 0.39,
    grain: 0.13,
    ascii: 0.12,
    dither: 0.10,
    halftone: 0.09,
    sparkle: 0.07,
    wave: 0.05,
    pixel: 0.04,
    prism: 0.01,
  };

  const rates: Record<string, string> = {
    none: '39% Common',
    grain: '13% Rare',
    ascii: '12% Rare',
    dither: '10% Rare',
    halftone: '9% Rare',
    sparkle: '7% Epic',
    wave: '5% Epic',
    pixel: '4% Legendary',
    prism: '1% Ultra Rare',
  };

  let chosenRarity = 'none';
  for (const r of rarities) {
    dice -= weights[r];
    if (dice < 0) {
      chosenRarity = r;
      break;
    }
  }

  return {
    rarity: chosenRarity,
    strength: (0.7 + 0.6 * next()).toFixed(8),
    scale: (0.8 + 0.45 * next()).toFixed(8),
    seed: next().toFixed(8),
    rate: rates[chosenRarity] || 'Rare',
  };
}

// In-memory cache for dynamically generated user shaders
const DYNAMIC_SHADERS_CACHE = new Map<string, ShaderOption>();

export function getOrCreateOpenShader(keyOrUsername: string): ShaderOption {
  const cleanKey = keyOrUsername.trim().toLowerCase();
  if (OPENS_SHADERS_REGISTRY[cleanKey]) {
    return OPENS_SHADERS_REGISTRY[cleanKey];
  }
  if (DYNAMIC_SHADERS_CACHE.has(cleanKey)) {
    return DYNAMIC_SHADERS_CACHE.get(cleanKey)!;
  }

  const field = generateOpenShaderFieldParams(cleanKey);
  const rarityInfo = calculateOpenShaderRarity(cleanKey);
  const shaderOpt: ShaderOption = {
    label: `@${cleanKey} (OpenShader)`,
    family: `${rarityInfo.rarity.toUpperCase()} (${rarityInfo.rate})`,
    colors: ['#121214', '#8b5cf6'],
    factory: createRarityFactory(
      field,
      rarityInfo.rarity,
      rarityInfo.strength,
      rarityInfo.scale,
      rarityInfo.seed
    ),
  };

  DYNAMIC_SHADERS_CACHE.set(cleanKey, shaderOpt);
  return shaderOpt;
}
