/* ============================================================
   Green smoke over the hero, as an actual fluid.

   Adapted from Pavel Dobryakov's WebGL-Fluid-Simulation (MIT), which
   solves incompressible Navier–Stokes on the GPU: advect, add
   vorticity, compute divergence, solve pressure, subtract the
   gradient. That is why it looks like smoke — it is doing what smoke
   does, rather than translating soft gradients around and hoping.

     https://github.com/PavelDoGreat/WebGL-Fluid-Simulation

   Two deliberate changes from the original, which is a toy you paint
   into by dragging:

   1. The SOURCE IS FIXED. Emitters at the bottom of the canvas push
      density and upward velocity every frame, wandering on slow sine
      waves so the column is never a jet. The smoke exists whether or
      not anybody is here.

   2. THE POINTER ADDS NO SMOKE. It injects velocity only — no density
      — so moving through it shoves what is already there and leaves
      nothing behind. That is the difference between disturbing smoke
      and drawing with it.

   Everything is torn down by the returned function: the loop, the
   listeners, the GL objects and the context itself.
   ============================================================ */

type Rgb = [number, number, number];

/** A smoke source. Positions are canvas UV (0,0 bottom-left); dx/dy is its push. */
export type Emitter = {
  /** Where it sits, in UV. */
  x: number;
  y: number;
  /** Which way it pushes. */
  dx: number;
  dy: number;
  period: number;
  /** How far the position wanders. */
  drift: number;
  strength: number;
};

export interface SmokeOptions {
  /** Smoke colour, 0–1 per channel. Kept dim: it is added, and it stacks. */
  colour?: Rgb;
  /** How fast smoke fades. Lower clears faster. 0.9–0.995. */
  densityDissipation?: number;
  /** How fast motion dies down. */
  velocityDissipation?: number;
  /**
   * Vorticity confinement. The single knob that decides smoke or ink.
   *
   * High values sharpen motion into thin filaments — which is exactly the
   * ink-in-water look, and was why strands kept appearing however slow the
   * sources got. Low values let the flow stay broad and billowy. It curls
   * either way; this is about how tightly.
   */
  curl?: number;
  /** Halves the simulation resolution per step. 1 is half, 2 is quarter. */
  downsample?: number;
  /** Skip the loop entirely — for prefers-reduced-motion. */
  still?: boolean;
  /**
   * How wide each emitter's puff is. It is the Gaussian's variance, not a
   * width: the visible width goes with its square root, so a strand a tenth
   * as wide needs a value a hundredth the size. Default 0.048 (the hero's,
   * ~150px across); ~0.0001 is a few pixels.
   */
  emitRadius?: number;
  /**
   * Replace the built-in sources (which ring the whole frame). The hero
   * leaves this unset.
   */
  emitters?: Emitter[];
  /**
   * The spread of each emitter's push, separately from its smoke (same units
   * as emitRadius). A thin source needs a broad current around it to carry
   * the smoke off in a strand; pushed only as wide as itself it just sits
   * there as a dot. Defaults to emitRadius.
   */
  emitFlowRadius?: number;
}

interface Pointer {
  x: number;
  y: number;
  dx: number;
  dy: number;
  moved: boolean;
}

/**
 * Start the simulation on a canvas. Returns a teardown function.
 *
 * Returns a no-op if WebGL is unavailable, so a browser without it simply shows
 * the hero video rather than breaking.
 */
export function startSmoke(canvas: HTMLCanvasElement, opts: SmokeOptions = {}) {
  const colour: Rgb = opts.colour ?? [0.05, 0.40, 0.07];
  const emitRadius = opts.emitRadius ?? 0.048;
  const emitFlowRadius = opts.emitFlowRadius ?? emitRadius;
  /**
   * Phones get a coarser simulation.
   *
   * A Navier–Stokes solver is the same work per pixel wherever it runs, and a
   * phone GPU is not a laptop's. Quartering the resolution and cutting the
   * pressure solve costs almost nothing visually — everything here is broad and
   * blurred, and the blur is wider than the extra detail would have been — while
   * roughly quartering the work.
   *
   * Keyed on the pointer being coarse rather than on width, because a narrow
   * desktop window is still a desktop GPU.
   */
  const coarsePointer =
    typeof window !== "undefined" &&
    window.matchMedia("(pointer: coarse)").matches;

  const config = {
    DOWNSAMPLE: opts.downsample ?? (coarsePointer ? 2 : 1),
    DENSITY_DISSIPATION: opts.densityDissipation ?? 0.984,
    VELOCITY_DISSIPATION: opts.velocityDissipation ?? 0.974,
    PRESSURE_DISSIPATION: 0.8,
    PRESSURE_ITERATIONS: coarsePointer ? 12 : 20,
    CURL: opts.curl ?? 4,
    SPLAT_RADIUS: 0.0055,
  };

  const params = {
    alpha: true,
    depth: false,
    stencil: false,
    antialias: false,
    // Straight alpha, not premultiplied: the display shader derives alpha from
    // the density it just wrote, and premultiplying would darken the edges.
    premultipliedAlpha: false,
  } as const;

  let gl = canvas.getContext("webgl2", params) as WebGL2RenderingContext | null;
  const isWebGL2 = !!gl;
  if (!gl) {
    gl = (canvas.getContext("webgl", params) ??
      canvas.getContext("experimental-webgl", params)) as WebGL2RenderingContext | null;
  }
  if (!gl || gl.isContextLost()) return { stop: () => {}, setRunning: () => {}, gust: () => {} };
  const g = gl;

  /* ── Formats ───────────────────────────────────────────────
     Half-float render targets. A simulation accumulates, so 8-bit
     channels band and then posterise within seconds. */
  let halfFloatTexType: number;
  let supportLinearFiltering: boolean;

  if (isWebGL2) {
    g.getExtension("EXT_color_buffer_float");
    supportLinearFiltering = !!g.getExtension("OES_texture_float_linear");
    halfFloatTexType = g.HALF_FLOAT;
  } else {
    const hf = g.getExtension("OES_texture_half_float") as { HALF_FLOAT_OES: number } | null;
    supportLinearFiltering = !!g.getExtension("OES_texture_half_float_linear");
    halfFloatTexType = hf ? hf.HALF_FLOAT_OES : g.UNSIGNED_BYTE;
  }

  const supportsFormat = (internalFormat: number, format: number, type: number) => {
    const tex = g.createTexture();
    g.bindTexture(g.TEXTURE_2D, tex);
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MIN_FILTER, g.NEAREST);
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MAG_FILTER, g.NEAREST);
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_S, g.CLAMP_TO_EDGE);
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_T, g.CLAMP_TO_EDGE);
    g.texImage2D(g.TEXTURE_2D, 0, internalFormat, 4, 4, 0, format, type, null);

    const fbo = g.createFramebuffer();
    g.bindFramebuffer(g.FRAMEBUFFER, fbo);
    g.framebufferTexture2D(g.FRAMEBUFFER, g.COLOR_ATTACHMENT0, g.TEXTURE_2D, tex, 0);
    const ok = g.checkFramebufferStatus(g.FRAMEBUFFER) === g.FRAMEBUFFER_COMPLETE;

    g.deleteFramebuffer(fbo);
    g.deleteTexture(tex);
    return ok;
  };

  const pick = (internalFormat: number, format: number) =>
    supportsFormat(internalFormat, format, halfFloatTexType)
      ? { internalFormat, format }
      : { internalFormat: g.RGBA, format: g.RGBA };

  const fmtRGBA = isWebGL2 ? pick(g.RGBA16F, g.RGBA) : { internalFormat: g.RGBA, format: g.RGBA };
  const fmtRG = isWebGL2 ? pick(g.RG16F, g.RG) : { internalFormat: g.RGBA, format: g.RGBA };
  const fmtR = isWebGL2 ? pick(g.R16F, g.RED) : { internalFormat: g.RGBA, format: g.RGBA };

  /* ── Shaders ───────────────────────────────────────────── */

  const compile = (type: number, source: string) => {
    const shader = g.createShader(type)!;
    g.shaderSource(shader, source);
    g.compileShader(shader);
    if (!g.getShaderParameter(shader, g.COMPILE_STATUS)) {
      throw new Error(
        `shader failed: ${g.getShaderInfoLog(shader) || "no log"}`,
      );
    }
    return shader;
  };

  const baseVertex = compile(
    g.VERTEX_SHADER,
    `precision highp float;
     attribute vec2 aPosition;
     varying vec2 vUv, vL, vR, vT, vB;
     uniform vec2 texelSize;
     void main () {
       vUv = aPosition * 0.5 + 0.5;
       vL = vUv - vec2(texelSize.x, 0.0);
       vR = vUv + vec2(texelSize.x, 0.0);
       vT = vUv + vec2(0.0, texelSize.y);
       vB = vUv - vec2(0.0, texelSize.y);
       gl_Position = vec4(aPosition, 0.0, 1.0);
     }`,
  );

  const clearFrag = compile(
    g.FRAGMENT_SHADER,
    `precision highp float; precision mediump sampler2D;
     varying vec2 vUv; uniform sampler2D uTexture; uniform float value;
     void main () { gl_FragColor = value * texture2D(uTexture, vUv); }`,
  );

  /* Alpha comes from the density itself, so the canvas is transparent
     wherever there is no smoke and the hero video shows through. */
  const displayFrag = compile(
    g.FRAGMENT_SHADER,
    `precision highp float; precision mediump sampler2D;
     varying vec2 vUv; uniform sampler2D uTexture;
     void main () {
       vec3 c = texture2D(uTexture, vUv).rgb;
       float a = clamp(max(c.r, max(c.g, c.b)), 0.0, 1.0);
       gl_FragColor = vec4(c, a);
     }`,
  );

  const splatFrag = compile(
    g.FRAGMENT_SHADER,
    `precision highp float; precision mediump sampler2D;
     varying vec2 vUv;
     uniform sampler2D uTarget; uniform float aspectRatio;
     uniform vec3 color; uniform vec2 point; uniform float radius;
     void main () {
       vec2 p = vUv - point.xy;
       p.x *= aspectRatio;
       vec3 splat = exp(-dot(p, p) / radius) * color;
       gl_FragColor = vec4(texture2D(uTarget, vUv).xyz + splat, 1.0);
     }`,
  );

  const advectionFrag = compile(
    g.FRAGMENT_SHADER,
    supportLinearFiltering
      ? `precision highp float; precision mediump sampler2D;
         varying vec2 vUv;
         uniform sampler2D uVelocity, uSource;
         uniform vec2 texelSize; uniform float dt, dissipation;
         void main () {
           vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
           gl_FragColor = dissipation * texture2D(uSource, coord);
           gl_FragColor.a = 1.0;
         }`
      : `precision highp float; precision mediump sampler2D;
         varying vec2 vUv;
         uniform sampler2D uVelocity, uSource;
         uniform vec2 texelSize; uniform float dt, dissipation;
         vec4 bilerp (in sampler2D sam, in vec2 p) {
           vec4 st; st.xy = floor(p - 0.5) + 0.5; st.zw = st.xy + 1.0;
           vec4 uv = st * texelSize.xyxy;
           vec4 a = texture2D(sam, uv.xy), b = texture2D(sam, uv.zy);
           vec4 c = texture2D(sam, uv.xw), d = texture2D(sam, uv.zw);
           vec2 f = p - st.xy;
           return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
         }
         void main () {
           vec2 coord = gl_FragCoord.xy - dt * texture2D(uVelocity, vUv).xy;
           gl_FragColor = dissipation * bilerp(uSource, coord);
           gl_FragColor.a = 1.0;
         }`,
  );

  const divergenceFrag = compile(
    g.FRAGMENT_SHADER,
    `precision highp float; precision mediump sampler2D;
     varying vec2 vL, vR, vT, vB; uniform sampler2D uVelocity;
     vec2 sampleVelocity (in vec2 uv) {
       vec2 m = vec2(1.0, 1.0);
       if (uv.x < 0.0) { uv.x = 0.0; m.x = -1.0; }
       if (uv.x > 1.0) { uv.x = 1.0; m.x = -1.0; }
       if (uv.y < 0.0) { uv.y = 0.0; m.y = -1.0; }
       if (uv.y > 1.0) { uv.y = 1.0; m.y = -1.0; }
       return m * texture2D(uVelocity, uv).xy;
     }
     void main () {
       float div = 0.5 * (sampleVelocity(vR).x - sampleVelocity(vL).x
                        + sampleVelocity(vT).y - sampleVelocity(vB).y);
       gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
     }`,
  );

  const curlFrag = compile(
    g.FRAGMENT_SHADER,
    `precision highp float; precision mediump sampler2D;
     varying vec2 vL, vR, vT, vB; uniform sampler2D uVelocity;
     void main () {
       float vorticity = texture2D(uVelocity, vR).y - texture2D(uVelocity, vL).y
                       - texture2D(uVelocity, vT).x + texture2D(uVelocity, vB).x;
       gl_FragColor = vec4(vorticity, 0.0, 0.0, 1.0);
     }`,
  );

  const vorticityFrag = compile(
    g.FRAGMENT_SHADER,
    `precision highp float; precision mediump sampler2D;
     varying vec2 vUv, vT, vB;
     uniform sampler2D uVelocity, uCurl; uniform float curl, dt;
     void main () {
       float T = texture2D(uCurl, vT).x, B = texture2D(uCurl, vB).x;
       float C = texture2D(uCurl, vUv).x;
       vec2 force = vec2(abs(T) - abs(B), 0.0);
       force *= 1.0 / length(force + 0.00001) * curl * C;
       gl_FragColor = vec4(texture2D(uVelocity, vUv).xy + force * dt, 0.0, 1.0);
     }`,
  );

  const pressureFrag = compile(
    g.FRAGMENT_SHADER,
    `precision highp float; precision mediump sampler2D;
     varying vec2 vUv, vL, vR, vT, vB;
     uniform sampler2D uPressure, uDivergence;
     vec2 boundary (in vec2 uv) { return min(max(uv, 0.0), 1.0); }
     void main () {
       float L = texture2D(uPressure, boundary(vL)).x;
       float R = texture2D(uPressure, boundary(vR)).x;
       float T = texture2D(uPressure, boundary(vT)).x;
       float B = texture2D(uPressure, boundary(vB)).x;
       float divergence = texture2D(uDivergence, vUv).x;
       gl_FragColor = vec4((L + R + B + T - divergence) * 0.25, 0.0, 0.0, 1.0);
     }`,
  );

  const gradientFrag = compile(
    g.FRAGMENT_SHADER,
    `precision highp float; precision mediump sampler2D;
     varying vec2 vUv, vL, vR, vT, vB;
     uniform sampler2D uPressure, uVelocity;
     vec2 boundary (in vec2 uv) { return min(max(uv, 0.0), 1.0); }
     void main () {
       float L = texture2D(uPressure, boundary(vL)).x;
       float R = texture2D(uPressure, boundary(vR)).x;
       float T = texture2D(uPressure, boundary(vT)).x;
       float B = texture2D(uPressure, boundary(vB)).x;
       vec2 velocity = texture2D(uVelocity, vUv).xy - vec2(R - L, T - B);
       gl_FragColor = vec4(velocity, 0.0, 1.0);
     }`,
  );

  class Program {
    program: WebGLProgram;
    uniforms: Record<string, WebGLUniformLocation | null> = {};

    constructor(vert: WebGLShader, frag: WebGLShader) {
      this.program = g.createProgram()!;
      g.attachShader(this.program, vert);
      g.attachShader(this.program, frag);
      g.linkProgram(this.program);
      if (!g.getProgramParameter(this.program, g.LINK_STATUS)) {
        throw new Error(g.getProgramInfoLog(this.program) ?? "link failed");
      }
      const count = g.getProgramParameter(this.program, g.ACTIVE_UNIFORMS) as number;
      for (let i = 0; i < count; i++) {
        const name = g.getActiveUniform(this.program, i)!.name;
        this.uniforms[name] = g.getUniformLocation(this.program, name);
      }
    }

    bind() {
      g.useProgram(this.program);
    }
  }

  const clearProgram = new Program(baseVertex, clearFrag);
  const displayProgram = new Program(baseVertex, displayFrag);
  const splatProgram = new Program(baseVertex, splatFrag);
  const advectionProgram = new Program(baseVertex, advectionFrag);
  const divergenceProgram = new Program(baseVertex, divergenceFrag);
  const curlProgram = new Program(baseVertex, curlFrag);
  const vorticityProgram = new Program(baseVertex, vorticityFrag);
  const pressureProgram = new Program(baseVertex, pressureFrag);
  const gradientProgram = new Program(baseVertex, gradientFrag);

  /* ── Render targets ────────────────────────────────────── */

  type Fbo = { texture: WebGLTexture; fbo: WebGLFramebuffer; attach: (id: number) => number };
  type Double = { read: Fbo; write: Fbo; swap: () => void };

  const created: { textures: WebGLTexture[]; fbos: WebGLFramebuffer[] } = { textures: [], fbos: [] };

  function createFbo(w: number, h: number, internalFormat: number, format: number, param: number): Fbo {
    const texture = g.createTexture()!;
    g.activeTexture(g.TEXTURE0);
    g.bindTexture(g.TEXTURE_2D, texture);
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MIN_FILTER, param);
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MAG_FILTER, param);
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_S, g.CLAMP_TO_EDGE);
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_T, g.CLAMP_TO_EDGE);
    g.texImage2D(g.TEXTURE_2D, 0, internalFormat, w, h, 0, format, halfFloatTexType, null);

    const fbo = g.createFramebuffer()!;
    g.bindFramebuffer(g.FRAMEBUFFER, fbo);
    g.framebufferTexture2D(g.FRAMEBUFFER, g.COLOR_ATTACHMENT0, g.TEXTURE_2D, texture, 0);
    g.viewport(0, 0, w, h);
    g.clear(g.COLOR_BUFFER_BIT);

    created.textures.push(texture);
    created.fbos.push(fbo);

    return {
      texture,
      fbo,
      // Bound at draw time rather than pinned to a fixed unit, which is where
      // the original is fragile — a texture unit reused by two targets in one
      // pass silently reads the wrong buffer.
      attach: (id: number) => {
        g.activeTexture(g.TEXTURE0 + id);
        g.bindTexture(g.TEXTURE_2D, texture);
        return id;
      },
    };
  }

  function createDouble(w: number, h: number, internalFormat: number, format: number, param: number): Double {
    let a = createFbo(w, h, internalFormat, format, param);
    let b = createFbo(w, h, internalFormat, format, param);
    return {
      get read() { return a; },
      get write() { return b; },
      swap() { const t = a; a = b; b = t; },
    };
  }

  let simWidth = 0;
  let simHeight = 0;
  let density: Double;
  let velocity: Double;
  let divergence: Fbo;
  let curlFbo: Fbo;
  let pressure: Double;

  function initFramebuffers() {
    simWidth = g.drawingBufferWidth >> config.DOWNSAMPLE;
    simHeight = g.drawingBufferHeight >> config.DOWNSAMPLE;
    const filtering = supportLinearFiltering ? g.LINEAR : g.NEAREST;

    density = createDouble(simWidth, simHeight, fmtRGBA.internalFormat, fmtRGBA.format, filtering);
    velocity = createDouble(simWidth, simHeight, fmtRG.internalFormat, fmtRG.format, filtering);
    divergence = createFbo(simWidth, simHeight, fmtR.internalFormat, fmtR.format, g.NEAREST);
    curlFbo = createFbo(simWidth, simHeight, fmtR.internalFormat, fmtR.format, g.NEAREST);
    pressure = createDouble(simWidth, simHeight, fmtR.internalFormat, fmtR.format, g.NEAREST);
  }

  const quadBuffer = g.createBuffer()!;
  const quadIndices = g.createBuffer()!;
  g.bindBuffer(g.ARRAY_BUFFER, quadBuffer);
  g.bufferData(g.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), g.STATIC_DRAW);
  g.bindBuffer(g.ELEMENT_ARRAY_BUFFER, quadIndices);
  g.bufferData(g.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), g.STATIC_DRAW);
  g.vertexAttribPointer(0, 2, g.FLOAT, false, 0, 0);
  g.enableVertexAttribArray(0);

  const blit = (target: WebGLFramebuffer | null) => {
    g.bindFramebuffer(g.FRAMEBUFFER, target);
    g.drawElements(g.TRIANGLES, 6, g.UNSIGNED_SHORT, 0);
  };

  g.clearColor(0, 0, 0, 0);
  g.disable(g.BLEND);
  initFramebuffers();

  /* ── Splats ────────────────────────────────────────────── */

  /** Push velocity into the field. No density: nothing is drawn. */
  function splatVelocity(x: number, y: number, dx: number, dy: number, radius = config.SPLAT_RADIUS) {
    splatProgram.bind();
    g.uniform1i(splatProgram.uniforms.uTarget, velocity.read.attach(0));
    g.uniform1f(splatProgram.uniforms.aspectRatio, canvas.width / canvas.height);
    g.uniform2f(splatProgram.uniforms.point, x, y);
    g.uniform3f(splatProgram.uniforms.color, dx, dy, 1);
    g.uniform1f(splatProgram.uniforms.radius, radius);
    g.viewport(0, 0, simWidth, simHeight);
    blit(velocity.write.fbo);
    velocity.swap();
  }

  /** Add smoke, and the motion that carries it. */
  function splatSmoke(x: number, y: number, dx: number, dy: number, strength: number, radius: number, flowRadius = radius) {
    splatVelocity(x, y, dx, dy, flowRadius);

    splatProgram.bind();
    g.uniform1i(splatProgram.uniforms.uTarget, density.read.attach(0));
    g.uniform1f(splatProgram.uniforms.aspectRatio, canvas.width / canvas.height);
    g.uniform2f(splatProgram.uniforms.point, x, y);
    g.uniform3f(
      splatProgram.uniforms.color,
      colour[0] * strength,
      colour[1] * strength,
      colour[2] * strength,
    );
    g.uniform1f(splatProgram.uniforms.radius, radius);
    g.viewport(0, 0, simWidth, simHeight);
    blit(density.write.fbo);
    density.swap();
  }

  /* ── Emitters ──────────────────────────────────────────────
     Sources around the edges, not just along the bottom. Smoke coming
     only from the floor reads as a row of chimneys however slow it is;
     drifting in from the sides and the corners reads as a room with
     smoke in it.

     Each has a position, a direction, and two sine waves at unrelated
     periods — one wandering the position, one gusting the push — so no
     source is ever steady and none of them line up with each other.

     Velocities are very small — around a fortieth of the first version,
     which used 950 and looked like a fire hose. Strengths came down with
     them rather than after: smoke that moves slowly lingers near its
     source, so holding strength while cutting speed piles density up and
     burns it to neon.

     Twenty sources, and the count matters as much as the placement. Each
     one is weak enough to be invisible alone; what shows is where several
     of them overlap, which moves and dissolves on its own because no two
     share a period. */


  const BUILT_IN: Emitter[] = [
    // Along the floor — fourteen of them, close together and at uneven
    // spacing and heights. Seven was few enough to pick out individual
    // plumes, which is the thing to avoid: the fix is more of them, weaker,
    // overlapping into one mass rather than a row of separate rises.
    { x: 0.03, y: 0.03, dx: 4, dy: 17, period: 13_000, drift: 0.07, strength: 0.0144 },
    { x: 0.11, y: 0.06, dx: -5, dy: 21, period: 17_500, drift: 0.08, strength: 0.0161 },
    { x: 0.18, y: 0.02, dx: 3, dy: 15, period: 11_500, drift: 0.07, strength: 0.0133 },
    { x: 0.25, y: 0.07, dx: -3, dy: 19, period: 19_000, drift: 0.09, strength: 0.0150 },
    { x: 0.33, y: 0.04, dx: 5, dy: 16, period: 15_000, drift: 0.08, strength: 0.0139 },
    { x: 0.40, y: 0.08, dx: -4, dy: 20, period: 21_500, drift: 0.07, strength: 0.0155 },
    { x: 0.47, y: 0.03, dx: 2, dy: 14, period: 12_800, drift: 0.09, strength: 0.0128 },
    { x: 0.55, y: 0.06, dx: -5, dy: 18, period: 16_200, drift: 0.08, strength: 0.0144 },
    { x: 0.62, y: 0.02, dx: 4, dy: 15, period: 22_800, drift: 0.07, strength: 0.0133 },
    { x: 0.70, y: 0.07, dx: -2, dy: 20, period: 14_400, drift: 0.09, strength: 0.0155 },
    { x: 0.77, y: 0.04, dx: 5, dy: 16, period: 18_100, drift: 0.08, strength: 0.0139 },
    { x: 0.85, y: 0.08, dx: -4, dy: 19, period: 20_600, drift: 0.07, strength: 0.0150 },
    { x: 0.92, y: 0.03, dx: 3, dy: 14, period: 12_100, drift: 0.09, strength: 0.0128 },
    { x: 0.98, y: 0.06, dx: -3, dy: 18, period: 23_400, drift: 0.07, strength: 0.0144 },

    // Across the top, and no longer an afterthought. Nine of them, at
    // strengths matching the floor, so the frame is weighted evenly instead
    // of everything visibly originating below.
    { x: 0.06, y: 0.98, dx: 7, dy: -12, period: 27_000, drift: 0.08, strength: 0.0139 },
    { x: 0.17, y: 0.96, dx: -5, dy: -14, period: 31_000, drift: 0.09, strength: 0.0150 },
    { x: 0.29, y: 0.99, dx: 6, dy: -11, period: 24_500, drift: 0.08, strength: 0.0133 },
    { x: 0.40, y: 0.97, dx: -7, dy: -15, period: 29_500, drift: 0.09, strength: 0.0144 },
    { x: 0.52, y: 0.98, dx: 4, dy: -12, period: 33_500, drift: 0.10, strength: 0.0139 },
    { x: 0.63, y: 0.96, dx: -6, dy: -14, period: 26_200, drift: 0.08, strength: 0.0150 },
    { x: 0.75, y: 0.99, dx: 8, dy: -11, period: 30_800, drift: 0.09, strength: 0.0133 },
    { x: 0.86, y: 0.97, dx: -4, dy: -15, period: 25_400, drift: 0.08, strength: 0.0144 },
    { x: 0.95, y: 0.98, dx: 5, dy: -13, period: 34_200, drift: 0.09, strength: 0.0139 },

    // In from the left at four heights, each angled differently.
    { x: 0.02, y: 0.18, dx: 16, dy: 8, period: 23_000, drift: 0.07, strength: 0.0128 },
    { x: 0.03, y: 0.41, dx: 13, dy: -3, period: 18_500, drift: 0.08, strength: 0.0117 },
    { x: 0.02, y: 0.62, dx: 17, dy: -6, period: 26_500, drift: 0.07, strength: 0.0122 },
    { x: 0.03, y: 0.84, dx: 14, dy: -9, period: 32_000, drift: 0.08, strength: 0.0117 },

    // And from the right.
    { x: 0.98, y: 0.15, dx: -15, dy: 9, period: 25_500, drift: 0.08, strength: 0.0128 },
    { x: 0.97, y: 0.38, dx: -12, dy: -2, period: 20_000, drift: 0.07, strength: 0.0111 },
    { x: 0.98, y: 0.59, dx: -16, dy: -6, period: 28_000, drift: 0.08, strength: 0.0122 },
    { x: 0.97, y: 0.81, dx: -13, dy: -10, period: 35_000, drift: 0.07, strength: 0.0117 },

    // Inside the frame, pushing across it. With sources only on the edges,
    // flows meet in the middle and nowhere else, so the middle is the only
    // place a billow forms. These give them somewhere else to collide.
    { x: 0.22, y: 0.33, dx: 11, dy: 5, period: 33_000, drift: 0.12, strength: 0.0094 },
    { x: 0.44, y: 0.58, dx: -9, dy: 7, period: 35_500, drift: 0.13, strength: 0.0094 },
    { x: 0.66, y: 0.29, dx: 8, dy: -6, period: 37_000, drift: 0.12, strength: 0.0089 },
    { x: 0.80, y: 0.66, dx: -10, dy: 6, period: 39_500, drift: 0.14, strength: 0.0089 },
  ];

  /**
   * How many slices the emitter list is split into.
   *
   * Every source costs two GPU passes — one into velocity, one into density —
   * so firing all thirty-six every frame would cost more than the solver it
   * feeds. Instead a third of them fire each frame, at triple strength, which
   * averages out to the same smoke for a third of the work.
   *
   * Invisible because nothing here is sharp: every source is weak, broad and
   * slow, and density lingers for dozens of frames. A source missing for two
   * of them cannot be seen.
   *
   * Note that adding sources means dividing their strengths. Tripling the count
   * while keeping each one's strength tripled the total density and flooded the
   * frame with green — "more sources" has to mean more, weaker sources, or it
   * just means more smoke.
   *
   * Matching the old total isn't quite enough either: a wider source radius,
   * lower vorticity and a heavier blur all spread the same density over more
   * area, so it reads fainter at the same sum. These are set by eye against
   * the previous look rather than by arithmetic.
   */
  const EMITTERS = opts.emitters ?? BUILT_IN;
  const SLICES = 3;
  let slice = 0;

  function emit(now: number) {
    for (let i = slice; i < EMITTERS.length; i += SLICES) {
      const e = EMITTERS[i];
      const phase = (now % e.period) / e.period * Math.PI * 2;
      const slow = e.period * 1.7;
      const wobble = (now % slow) / slow * Math.PI * 2;

      const x = e.x + Math.sin(phase) * e.drift;
      const y = e.y + Math.sin(wobble) * e.drift * 0.45;

      // Gusts between roughly half and full push, so nothing is constant.
      const gust = 0.55 + 0.45 * Math.sin(wobble * 1.3);

      splatSmoke(
        x,
        y,
        e.dx * gust,
        e.dy * gust,
        e.strength * SLICES * (0.7 + 0.3 * Math.sin(wobble)),
        emitRadius,
        emitFlowRadius,
      );
    }
    slice = (slice + 1) % SLICES;
  }

  /* ── Pointer ───────────────────────────────────────────── */

  /**
   * An outward puff at a point. What a tap does.
   *
   * Six velocity splats in a ring, each pushing away from the centre, because
   * one splat can only push in a single direction — the splat shader adds a
   * constant velocity across its falloff, so there is no way to get radial flow
   * out of one of them. A ring is how you get a tap to look like something
   * displacing the smoke rather than nudging it sideways.
   *
   * Velocity only, like the cursor: a tap disturbs the smoke and leaves none
   * behind.
   */
  function puff(x: number, y: number, force = 210) {
    const ring = 6;
    const offset = 0.045;

    for (let i = 0; i < ring; i++) {
      const angle = (i / ring) * Math.PI * 2;
      const ox = Math.cos(angle);
      const oy = Math.sin(angle);
      splatVelocity(x + ox * offset, y + oy * offset, ox * force, oy * force, 0.010);
    }
  }

  const pointer: Pointer = { x: 0, y: 0, dx: 0, dy: 0, moved: false };
  let hasPointer = false;

  function onMouseMove(e: MouseEvent) {
    const box = canvas.getBoundingClientRect();
    const x = (e.clientX - box.left) / box.width;
    const y = 1 - (e.clientY - box.top) / box.height;

    if (hasPointer) {
      // Scaled up hard: a pointer moves a few pixels a frame, and the field
      // needs a shove to visibly deflect a rising column.
      pointer.dx = (x - pointer.x) * 6200;
      pointer.dy = (y - pointer.y) * 6200;
      pointer.moved = true;
    }

    pointer.x = x;
    pointer.y = y;
    hasPointer = true;
  }

  function onMouseLeave() {
    hasPointer = false;
    pointer.moved = false;
  }

  function uvOf(clientX: number, clientY: number) {
    const box = canvas.getBoundingClientRect();
    return {
      x: (clientX - box.left) / box.width,
      y: 1 - (clientY - box.top) / box.height,
    };
  }

  function onTouchStart(e: TouchEvent) {
    const t = e.targetTouches[0];
    if (!t) return;

    const { x, y } = uvOf(t.clientX, t.clientY);
    // Seed the position so the first touchmove has something to measure a
    // drag against, instead of the first movement being swallowed.
    pointer.x = x;
    pointer.y = y;
    hasPointer = true;
    puff(x, y);
  }

  function onTouchMove(e: TouchEvent) {
    const t = e.targetTouches[0];
    if (!t) return;
    onMouseMove({ clientX: t.clientX, clientY: t.clientY } as MouseEvent);
  }

  canvas.addEventListener("mousemove", onMouseMove);
  canvas.addEventListener("mouseleave", onMouseLeave);
  // Not passive:false and no preventDefault anywhere: the hero fills the
  // viewport on a phone, so swallowing touchmove would leave somebody unable to
  // scroll past it. Dragging disturbs the smoke and scrolls the page; that is
  // the right trade.
  canvas.addEventListener("touchstart", onTouchStart, { passive: true });
  canvas.addEventListener("touchmove", onTouchMove, { passive: true });
  canvas.addEventListener("touchend", onMouseLeave);
  canvas.addEventListener("touchcancel", onMouseLeave);

  /* ── Loop ──────────────────────────────────────────────── */

  function resize() {
    const w = Math.floor(canvas.clientWidth * Math.min(window.devicePixelRatio || 1, 1.5));
    const h = Math.floor(canvas.clientHeight * Math.min(window.devicePixelRatio || 1, 1.5));
    if (canvas.width === w && canvas.height === h) return false;
    canvas.width = w;
    canvas.height = h;
    return true;
  }

  resize();
  initFramebuffers();

  let raf = 0;
  let last = performance.now();
  let running = !opts.still;

  function simulate(dt: number, now: number) {
    g.viewport(0, 0, simWidth, simHeight);
    const texel = [1 / simWidth, 1 / simHeight] as const;

    advectionProgram.bind();
    g.uniform2f(advectionProgram.uniforms.texelSize, texel[0], texel[1]);
    g.uniform1i(advectionProgram.uniforms.uVelocity, velocity.read.attach(0));
    g.uniform1i(advectionProgram.uniforms.uSource, velocity.read.attach(0));
    g.uniform1f(advectionProgram.uniforms.dt, dt);
    g.uniform1f(advectionProgram.uniforms.dissipation, config.VELOCITY_DISSIPATION);
    blit(velocity.write.fbo);
    velocity.swap();

    advectionProgram.bind();
    g.uniform1i(advectionProgram.uniforms.uVelocity, velocity.read.attach(0));
    g.uniform1i(advectionProgram.uniforms.uSource, density.read.attach(1));
    g.uniform1f(advectionProgram.uniforms.dissipation, config.DENSITY_DISSIPATION);
    blit(density.write.fbo);
    density.swap();

    emit(now);

    if (pointer.moved) {
      splatVelocity(pointer.x, pointer.y, pointer.dx, pointer.dy, 0.012);
      pointer.moved = false;
    }

    curlProgram.bind();
    g.uniform2f(curlProgram.uniforms.texelSize, texel[0], texel[1]);
    g.uniform1i(curlProgram.uniforms.uVelocity, velocity.read.attach(0));
    blit(curlFbo.fbo);

    vorticityProgram.bind();
    g.uniform2f(vorticityProgram.uniforms.texelSize, texel[0], texel[1]);
    g.uniform1i(vorticityProgram.uniforms.uVelocity, velocity.read.attach(0));
    g.uniform1i(vorticityProgram.uniforms.uCurl, curlFbo.attach(1));
    g.uniform1f(vorticityProgram.uniforms.curl, config.CURL);
    g.uniform1f(vorticityProgram.uniforms.dt, dt);
    blit(velocity.write.fbo);
    velocity.swap();

    divergenceProgram.bind();
    g.uniform2f(divergenceProgram.uniforms.texelSize, texel[0], texel[1]);
    g.uniform1i(divergenceProgram.uniforms.uVelocity, velocity.read.attach(0));
    blit(divergence.fbo);

    clearProgram.bind();
    g.uniform1i(clearProgram.uniforms.uTexture, pressure.read.attach(0));
    g.uniform1f(clearProgram.uniforms.value, config.PRESSURE_DISSIPATION);
    blit(pressure.write.fbo);
    pressure.swap();

    pressureProgram.bind();
    g.uniform2f(pressureProgram.uniforms.texelSize, texel[0], texel[1]);
    g.uniform1i(pressureProgram.uniforms.uDivergence, divergence.attach(0));
    for (let i = 0; i < config.PRESSURE_ITERATIONS; i++) {
      g.uniform1i(pressureProgram.uniforms.uPressure, pressure.read.attach(1));
      blit(pressure.write.fbo);
      pressure.swap();
    }

    gradientProgram.bind();
    g.uniform2f(gradientProgram.uniforms.texelSize, texel[0], texel[1]);
    g.uniform1i(gradientProgram.uniforms.uPressure, pressure.read.attach(0));
    g.uniform1i(gradientProgram.uniforms.uVelocity, velocity.read.attach(1));
    blit(velocity.write.fbo);
    velocity.swap();
  }

  function draw() {
    g.viewport(0, 0, g.drawingBufferWidth, g.drawingBufferHeight);
    displayProgram.bind();
    g.uniform1i(displayProgram.uniforms.uTexture, density.read.attach(0));
    blit(null);
  }

  function step(now: number) {
    if (resize()) initFramebuffers();

    // Clamped: a backgrounded tab returns a gap of seconds, and feeding that in
    // as one timestep makes the solver explode.
    const dt = Math.min((now - last) / 1000, 0.016);
    last = now;

    simulate(dt, now);
    draw();

    if (running) raf = requestAnimationFrame(step);
  }

  // Run the solver forward before the first paint, so the hero opens with smoke
  // already in it instead of filling up while somebody watches.
  //
  // Real steps, not repeated emits: emitting ninety times without advecting
  // between them piles ninety layers of density on one spot, which saturates and
  // clips into a hard dome. That was the first thing this looked like.
  for (let i = 0; i < 150; i++) simulate(0.016, i * 16);
  draw();

  if (running) {
    last = performance.now();
    raf = requestAnimationFrame(step);
  }

  /** Pause when the hero isn't on screen — a fluid solver is not free. */
  function setRunning(next: boolean) {
    if (next === running) return;
    running = next;
    if (running) {
      last = performance.now();
      raf = requestAnimationFrame(step);
    } else {
      cancelAnimationFrame(raf);
    }
  }

  function stop() {
    running = false;
    cancelAnimationFrame(raf);
    canvas.removeEventListener("mousemove", onMouseMove);
    canvas.removeEventListener("mouseleave", onMouseLeave);
    canvas.removeEventListener("touchstart", onTouchStart);
    canvas.removeEventListener("touchmove", onTouchMove);
    canvas.removeEventListener("touchend", onMouseLeave);
    canvas.removeEventListener("touchcancel", onMouseLeave);
    for (const t of created.textures) g.deleteTexture(t);
    for (const f of created.fbos) g.deleteFramebuffer(f);
    g.deleteBuffer(quadBuffer);
    g.deleteBuffer(quadIndices);
    // Deliberately NOT loseContext(). A canvas hands out the same context
    // object every time, and losing it is unrecoverable without waiting for a
    // restore event — so a teardown that loses the context breaks every later
    // start on that canvas. React runs effects twice in development, which is
    // exactly how this was found: mount, tear down, mount again onto a dead
    // context, and every shader fails to compile.
  }

  /**
   * A blast of wind from a point on screen (client coordinates): two rings
   * of outward velocity, a tight strong one and a wide one, so smoke near
   * the point is thrown clear and smoke further off is shoved after it.
   * Velocity only, like the pointer. `strength` 1 is a hard shove.
   */
  function gust(clientX: number, clientY: number, strength = 1) {
    const { x, y } = uvOf(clientX, clientY);
    const rings: [number, number, number, number][] = [
      // [count, offset, force, radius]
      [10, 0.06, 1400, 0.02],
      [14, 0.2, 900, 0.045],
    ];
    for (const [count, offset, force, radius] of rings) {
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const ox = Math.cos(angle);
        const oy = Math.sin(angle);
        splatVelocity(x + ox * offset, y + oy * offset, ox * force * strength, oy * force * strength, radius);
      }
    }
  }

  return { stop, setRunning, gust };
}
