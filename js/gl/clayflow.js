/**
 * ============================================================================
 * CLAY FIT — SHADER COMPARTILHADO "CLAY-FLOW" (WebGL + Fallback CSS por Tema)
 * /js/gl/clayflow.js
 *
 * Export obrigatório:
 * export const clayFlow = { mount(host, {palette, intensity}), unmount() }
 *
 * Especificação Prompt 5 (A5):
 * - Paletas 'CLARA' | 'TERRACOTA' | 'SALVIA' com variantes para tema claro e
 *   tema escuro ("Studio Clay Noite": base #0E0D0C, brilhos em terracota a 22%,
 *   sálvia a 14%, areia a 10%, com domain warping suave).
 * - Ouve 'clay:tema' e faz cross-fade de 240ms entre paletas via uniform `uMix`.
 * - Fallback em gradiente CSS estático por tema (sem WebGL ou reduced-motion).
 * - Único contexto WebGL compartilhado, 0,5× de resolução, 30fps, pausa em aba
 *   oculta e fora do viewport (IntersectionObserver).
 * ============================================================================
 */

import { prefersReducedMotion } from '../motion.js';
import { temaAtivo } from '../ui/theme.js';

export const CLAY_PALETTES_LIGHT = {
  // CLARA = #F4F1EA, #F6D9CF, #EAE5DA, #DCE6D6
  CLARA: [
    [0.957, 0.945, 0.918],
    [0.965, 0.851, 0.812],
    [0.918, 0.898, 0.855],
    [0.863, 0.902, 0.839]
  ],
  // TERRACOTA = #F6D9CF, #F4C9B8, #E2573B (30% peso), #EAE5DA
  TERRACOTA: [
    [0.965, 0.851, 0.812],
    [0.957, 0.788, 0.722],
    [0.906, 0.690, 0.620],
    [0.918, 0.898, 0.855]
  ],
  // SALVIA = #DCE6D6, #F4F1EA, #D9B98A (25% peso), #EAE5DA
  SALVIA: [
    [0.863, 0.902, 0.839],
    [0.957, 0.945, 0.918],
    [0.905, 0.865, 0.790],
    [0.918, 0.898, 0.855]
  ]
};

export const CLAY_PALETTES_DARK = {
  // Base #0E0D0C com brilhos em terracota (22%), sálvia (14%) e areia (10%)
  CLARA: [
    [0.055, 0.051, 0.047],
    [0.238, 0.115, 0.088],
    [0.126, 0.135, 0.116],
    [0.135, 0.118, 0.096]
  ],
  TERRACOTA: [
    [0.055, 0.051, 0.047],
    [0.238, 0.115, 0.088],
    [0.182, 0.096, 0.075],
    [0.135, 0.118, 0.096]
  ],
  SALVIA: [
    [0.055, 0.051, 0.047],
    [0.126, 0.135, 0.116],
    [0.135, 0.118, 0.096],
    [0.195, 0.102, 0.080]
  ]
};

export const CLAY_PALETTES = CLAY_PALETTES_DARK;

const STATIC_GRADIENTS_LIGHT = {
  CLARA:
    'radial-gradient(120% 90% at 22% 18%, #F6D9CF 0%, #F4F1EA 52%, #DCE6D6 100%)',
  TERRACOTA:
    'radial-gradient(120% 95% at 75% 20%, rgba(226, 87, 59, 0.28) 0%, #F6D9CF 50%, #EAE5DA 100%)',
  SALVIA:
    'radial-gradient(120% 90% at 30% 20%, #DCE6D6 0%, #F4F1EA 58%, rgba(217, 185, 138, 0.32) 100%)'
};

const STATIC_GRADIENTS_DARK = {
  CLARA:
    'radial-gradient(120% 90% at 22% 18%, rgba(226, 87, 59, 0.22) 0%, #0E0D0C 54%, rgba(143, 166, 138, 0.14) 100%)',
  TERRACOTA:
    'radial-gradient(120% 95% at 75% 20%, rgba(226, 87, 59, 0.22) 0%, rgba(217, 185, 138, 0.10) 48%, #0E0D0C 100%)',
  SALVIA:
    'radial-gradient(120% 90% at 30% 20%, rgba(143, 166, 138, 0.14) 0%, #0E0D0C 58%, rgba(217, 185, 138, 0.10) 100%)'
};

const VERTEX_SHADER_SRC = `
  attribute vec2 a_pos;
  void main() {
    gl_Position = vec4(a_pos, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER_SRC = `
  precision mediump float;
  uniform float u_time;
  uniform vec2 u_res;
  uniform vec3 u_palette_from[4];
  uniform vec3 u_palette[4];
  uniform float uMix;
  uniform float u_intensity;
  uniform vec2 u_pointer;

  vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }

  float snoise(vec2 v) {
    const vec4 C = vec4(
      0.211324865405187,
      0.366025403784439,
     -0.577350269189626,
      0.024390243902439
    );
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod(i, 289.0);
    vec3 p = permute(
      permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0)
    );
    vec3 m = max(
      0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)),
      0.0
    );
    m = m * m;
    m = m * m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  float fbm(vec2 p) {
    float val = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 4; i++) {
      val += amp * snoise(p);
      p *= 2.02;
      amp *= 0.5;
    }
    return val;
  }

  float hashGrain(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / max(u_res, vec2(1.0));
    float aspect = u_res.x / max(u_res.y, 1.0);
    vec2 p = vec2(uv.x * aspect, uv.y) * 1.45;

    float t = u_time * 0.035;

    vec2 w1 = vec2(
      fbm(p * 1.2 + t * 0.6),
      fbm(p * 1.2 + vec2(2.4, 1.3) + t * 0.6)
    );
    p += 0.35 * w1;

    vec2 w2 = vec2(
      fbm(p * 1.2 + t * 0.6),
      fbm(p * 1.2 + vec2(1.7, 3.1) - t * 0.6)
    );
    p += 0.35 * w2;

    float n = clamp(fbm(p) * 0.5 + 0.5, 0.0, 1.0);

    vec3 c0 = mix(u_palette_from[0], u_palette[0], clamp(uMix, 0.0, 1.0));
    vec3 c1 = mix(u_palette_from[1], u_palette[1], clamp(uMix, 0.0, 1.0));
    vec3 c2 = mix(u_palette_from[2], u_palette[2], clamp(uMix, 0.0, 1.0));
    vec3 c3 = mix(u_palette_from[3], u_palette[3], clamp(uMix, 0.0, 1.0));

    vec3 col = mix(c0, c1, smoothstep(0.0, 0.38, n));
    col = mix(col, c2, smoothstep(0.32, 0.70, n));
    col = mix(col, c3, smoothstep(0.65, 1.0, n));

    float dPtr = distance(uv, u_pointer);
    float glow = smoothstep(0.55, 0.0, dPtr) * 0.045 * u_intensity;
    col += vec3(glow);

    float vig = distance(uv, vec2(0.5));
    col *= (1.0 - smoothstep(0.25, 0.9, vig) * 0.06);

    float grain = (hashGrain(gl_FragCoord.xy + fract(t)) - 0.5) * 0.03;
    col = mix(c0, col + grain, clamp(u_intensity, 0.15, 1.0));

    gl_FragColor = vec4(col, 1.0);
  }
`;

function resolvePaletteForTheme(paletteKey = 'CLARA', theme = temaAtivo()) {
  const bank = theme === 'claro' ? CLAY_PALETTES_LIGHT : CLAY_PALETTES_DARK;
  return bank[paletteKey] || bank.CLARA;
}

function resolveStaticGradient(paletteKey = 'CLARA', theme = temaAtivo()) {
  const bank = theme === 'claro' ? STATIC_GRADIENTS_LIGHT : STATIC_GRADIENTS_DARK;
  return bank[paletteKey] || bank.CLARA;
}

const state = {
  initialized: false,
  disabled: false,
  themeListenerBound: false,
  canvas: null,
  gl: null,
  program: null,
  uniforms: {},
  host: null,
  palette: 'CLARA',
  fromPaletteVec: resolvePaletteForTheme('CLARA', 'escuro'),
  targetPaletteVec: resolvePaletteForTheme('CLARA', 'escuro'),
  mixStartMs: 0,
  uMix: 1.0,
  intensity: 0.6,
  pointer: { x: 0.5, y: 0.5 },
  targetPointer: { x: 0.5, y: 0.5 },
  running: false,
  inViewport: true,
  rafId: null,
  lastFrameTime: 0,
  startTime: typeof performance !== 'undefined' ? performance.now() : 0,
  observer: null
};

function shouldFallbackToStatic() {
  try {
    if (prefersReducedMotion()) return true;
    const nav = typeof navigator !== 'undefined' ? navigator : {};
    if (nav.connection && nav.connection.saveData) return true;
    if (typeof nav.hardwareConcurrency === 'number' && nav.hardwareConcurrency <= 4) {
      return true;
    }
    if (typeof nav.deviceMemory === 'number' && nav.deviceMemory <= 2) {
      return true;
    }
    return false;
  } catch (e) {
    return true;
  }
}

function compileShader(gl, type, src) {
  try {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  } catch (e) {
    return null;
  }
}

function bindThemeChangeListener() {
  if (state.themeListenerBound || typeof window === 'undefined') return;
  state.themeListenerBound = true;

  window.addEventListener('clay:tema', (ev) => {
    try {
      const nextTheme = ev?.detail?.temaAtivo || temaAtivo();
      if (state.host) {
        state.host.style.backgroundImage = resolveStaticGradient(state.palette, nextTheme);
      }
      state.fromPaletteVec = state.targetPaletteVec || resolvePaletteForTheme(state.palette, nextTheme);
      state.targetPaletteVec = resolvePaletteForTheme(state.palette, nextTheme);
      if (prefersReducedMotion()) {
        state.uMix = 1.0;
      } else {
        state.uMix = 0.0;
        state.mixStartMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
      }
      if (state.running && state.gl) {
        drawFrame(typeof performance !== 'undefined' ? performance.now() : Date.now());
      }
    } catch (_) {}
  });
}

function ensureGLContext() {
  bindThemeChangeListener();
  if (state.initialized) return !state.disabled;
  state.initialized = true;

  if (shouldFallbackToStatic()) {
    state.disabled = true;
    return false;
  }

  try {
    const canvas = document.createElement('canvas');
    canvas.className = 'clayflow-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    Object.assign(canvas.style, {
      position: 'absolute',
      inset: '0',
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      zIndex: '0',
      borderRadius: 'inherit'
    });

    const gl =
      canvas.getContext('webgl', {
        alpha: false,
        antialias: false,
        depth: false,
        stencil: false,
        preserveDrawingBuffer: false,
        powerPreference: 'low-power'
      }) || canvas.getContext('experimental-webgl');

    if (!gl) {
      state.disabled = true;
      return false;
    }

    const vs = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER_SRC);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SRC);
    if (!vs || !fs) {
      state.disabled = true;
      return false;
    }

    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      state.disabled = true;
      return false;
    }

    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW
    );

    const posLoc = gl.getAttribLocation(program, 'a_pos');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    state.canvas = canvas;
    state.gl = gl;
    state.program = program;
    state.uniforms = {
      u_time: gl.getUniformLocation(program, 'u_time'),
      u_res: gl.getUniformLocation(program, 'u_res'),
      u_intensity: gl.getUniformLocation(program, 'u_intensity'),
      u_pointer: gl.getUniformLocation(program, 'u_pointer'),
      uMix: gl.getUniformLocation(program, 'uMix'),
      u_palette_from0: gl.getUniformLocation(program, 'u_palette_from[0]'),
      u_palette_from1: gl.getUniformLocation(program, 'u_palette_from[1]'),
      u_palette_from2: gl.getUniformLocation(program, 'u_palette_from[2]'),
      u_palette_from3: gl.getUniformLocation(program, 'u_palette_from[3]'),
      u_palette0: gl.getUniformLocation(program, 'u_palette[0]'),
      u_palette1: gl.getUniformLocation(program, 'u_palette[1]'),
      u_palette2: gl.getUniformLocation(program, 'u_palette[2]'),
      u_palette3: gl.getUniformLocation(program, 'u_palette[3]')
    };

    window.addEventListener(
      'pointermove',
      (e) => {
        state.targetPointer.x = e.clientX / Math.max(1, window.innerWidth);
        state.targetPointer.y = 1.0 - e.clientY / Math.max(1, window.innerHeight);
      },
      { passive: true }
    );

    window.addEventListener(
      'resize',
      () => {
        if (state.running) resizeCanvas();
      },
      { passive: true }
    );

    if ('IntersectionObserver' in window) {
      state.observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (entry.target === state.host) {
            state.inViewport = entry.isIntersecting;
          }
        }
      });
    }

    return true;
  } catch (e) {
    state.disabled = true;
    return false;
  }
}

function resizeCanvas() {
  try {
    if (!state.canvas || !state.host || !state.gl) return;
    const rect = state.host.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = Math.max(32, Math.floor(rect.width * dpr * 0.5));
    const h = Math.max(32, Math.floor(rect.height * dpr * 0.5));
    if (state.canvas.width !== w || state.canvas.height !== h) {
      state.canvas.width = w;
      state.canvas.height = h;
      state.gl.viewport(0, 0, w, h);
    }
  } catch (e) {
    // Nunca lança erro
  }
}

function drawFrame(now) {
  try {
    const gl = state.gl;
    if (!gl || !state.program || !state.canvas) return;

    state.pointer.x += (state.targetPointer.x - state.pointer.x) * 0.06;
    state.pointer.y += (state.targetPointer.y - state.pointer.y) * 0.06;

    if (state.uMix < 1.0) {
      const dtMix = Math.max(0, now - state.mixStartMs);
      state.uMix = Math.min(1.0, dtMix / 240);
    }

    const fromPal = state.fromPaletteVec || resolvePaletteForTheme(state.palette);
    const toPal = state.targetPaletteVec || resolvePaletteForTheme(state.palette);
    const elapsedSec = (now - state.startTime) / 1000;

    gl.useProgram(state.program);
    gl.uniform1f(state.uniforms.u_time, elapsedSec);
    gl.uniform2f(state.uniforms.u_res, state.canvas.width, state.canvas.height);
    gl.uniform1f(state.uniforms.u_intensity, state.intensity);
    gl.uniform2f(state.uniforms.u_pointer, state.pointer.x, state.pointer.y);
    gl.uniform1f(state.uniforms.uMix, state.uMix);
    gl.uniform3fv(state.uniforms.u_palette_from0, fromPal[0]);
    gl.uniform3fv(state.uniforms.u_palette_from1, fromPal[1]);
    gl.uniform3fv(state.uniforms.u_palette_from2, fromPal[2]);
    gl.uniform3fv(state.uniforms.u_palette_from3, fromPal[3]);
    gl.uniform3fv(state.uniforms.u_palette0, toPal[0]);
    gl.uniform3fv(state.uniforms.u_palette1, toPal[1]);
    gl.uniform3fv(state.uniforms.u_palette2, toPal[2]);
    gl.uniform3fv(state.uniforms.u_palette3, toPal[3]);

    gl.drawArrays(gl.TRIANGLES, 0, 3);
  } catch (e) {
    // Nunca lança erro
  }
}

function startLoop() {
  if (state.running || state.disabled) return;
  state.running = true;
  state.lastFrameTime = 0;

  const tick = (now) => {
    if (!state.running) return;
    state.rafId = requestAnimationFrame(tick);
    if (document.hidden || !state.inViewport) return;
    if (now - state.lastFrameTime < 33.3 && state.uMix >= 1.0) return; // Máx 30fps
    state.lastFrameTime = now;
    drawFrame(now);
  };

  state.rafId = requestAnimationFrame(tick);
}

function stopLoop() {
  state.running = false;
  if (state.rafId !== null) {
    cancelAnimationFrame(state.rafId);
    state.rafId = null;
  }
}

export const clayFlow = {
  mount(host, { palette = 'CLARA', intensity = 0.6 } = {}) {
    try {
      this.unmount();
      bindThemeChangeListener();
      if (!host) return;

      const normalizedPalette = CLAY_PALETTES_DARK[palette] ? palette : 'CLARA';
      const activeTheme = temaAtivo();
      const targetVec = resolvePaletteForTheme(normalizedPalette, activeTheme);

      state.host = host;
      state.palette = normalizedPalette;
      state.fromPaletteVec = targetVec;
      state.targetPaletteVec = targetVec;
      state.uMix = 1.0;
      state.intensity = Number(intensity ?? 0.6);
      state.inViewport = true;

      // Gradiente CSS estático por tema aplicado imediatamente (zero CLS e fallback)
      host.style.backgroundImage = resolveStaticGradient(normalizedPalette, activeTheme);

      if (!ensureGLContext()) {
        return;
      }

      const pos = window.getComputedStyle(host).position;
      if (pos === 'static') {
        host.style.position = 'relative';
      }

      host.prepend(state.canvas);
      if (state.observer) {
        state.observer.observe(host);
      }
      resizeCanvas();
      drawFrame(typeof performance !== 'undefined' ? performance.now() : Date.now());
      startLoop();
    } catch (e) {
      // Nunca lança erro
    }
  },

  unmount() {
    try {
      stopLoop();
      if (state.observer && state.host) {
        state.observer.unobserve(state.host);
      }
      if (state.canvas && state.canvas.parentNode) {
        state.canvas.parentNode.removeChild(state.canvas);
      }
      state.host = null;
    } catch (e) {
      // Nunca lança erro
    }
  }
};

export default clayFlow;
