// WebGL2 toolkit used by the 2D renderer for the two things Canvas2D cannot do well everywhere:
// perspective-correct texture warps (3D planes) and fast, identical-on-every-browser gaussian blur.
// One shared context; every call is synchronous and copies its result back into a 2D canvas.

import { createCanvas, get2d, type AnyCanvas, type Ctx2D } from "./canvas";

type Src = TexImageSource;

const VS = `#version 300 es
in vec4 aPos; in vec2 aUv; out vec2 vUv;
void main(){ vUv = aUv; gl_Position = aPos; }`;

const FS_COPY = `#version 300 es
precision highp float; in vec2 vUv; uniform sampler2D uTex; uniform float uAlpha; out vec4 o;
void main(){ o = texture(uTex, vUv) * uAlpha; }`;

// 9-tap linear-sampled gaussian (equivalent to 17 discrete taps); sigma is handled by tap spacing.
const FS_BLUR = `#version 300 es
precision highp float; in vec2 vUv; uniform sampler2D uTex; uniform vec2 uDir; uniform float uSigma; out vec4 o;
void main(){
  vec4 acc = vec4(0.0); float wsum = 0.0;
  for (int i = -8; i <= 8; i++) {
    float x = float(i);
    float w = exp(-0.5 * x * x / (uSigma * uSigma));
    acc += texture(uTex, vUv + uDir * x) * w;
    wsum += w;
  }
  o = acc / wsum;
}`;

interface Prog {
  p: WebGLProgram;
  aPos: number;
  aUv: number;
  u: Record<string, WebGLUniformLocation | null>;
}

interface Target {
  tex: WebGLTexture;
  fbo: WebGLFramebuffer;
  w: number;
  h: number;
}

class GLKit {
  canvas: AnyCanvas;
  gl: WebGL2RenderingContext;
  copy: Prog;
  blurP: Prog;
  buf: WebGLBuffer;
  tex: WebGLTexture;
  aniso: number;
  anisoExt: EXT_texture_filter_anisotropic | null;
  targets: Target[] = [];
  out: { canvas: AnyCanvas; ctx: Ctx2D }[] = [];

  constructor() {
    this.canvas = createCanvas(256, 256);
    const gl = (this.canvas as HTMLCanvasElement).getContext("webgl2", {
      premultipliedAlpha: true,
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
    }) as WebGL2RenderingContext | null;
    if (!gl) throw new Error("WebGL2 unavailable");
    this.gl = gl;
    this.copy = this.program(FS_COPY, ["uTex", "uAlpha"]);
    this.blurP = this.program(FS_BLUR, ["uTex", "uDir", "uSigma"]);
    this.buf = gl.createBuffer()!;
    this.tex = gl.createTexture()!;
    this.anisoExt = gl.getExtension("EXT_texture_filter_anisotropic");
    this.aniso = this.anisoExt ? Math.min(8, gl.getParameter(this.anisoExt.MAX_TEXTURE_MAX_ANISOTROPY_EXT)) : 0;
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  }

  private program(fs: string, uniforms: string[]): Prog {
    const gl = this.gl;
    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? "shader");
      return s;
    };
    const p = gl.createProgram()!;
    gl.attachShader(p, sh(gl.VERTEX_SHADER, VS));
    gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) ?? "link");
    const u: Prog["u"] = {};
    for (const n of uniforms) u[n] = gl.getUniformLocation(p, n);
    return { p, aPos: gl.getAttribLocation(p, "aPos"), aUv: gl.getAttribLocation(p, "aUv"), u };
  }

  ensure(w: number, h: number) {
    const c = this.canvas;
    if (c.width < w || c.height < h) {
      c.width = Math.max(c.width, Math.ceil(w / 256) * 256);
      c.height = Math.max(c.height, Math.ceil(h / 256) * 256);
    }
  }

  private upload(src: Src, mip: boolean) {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    if (mip) {
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      if (this.anisoExt) gl.texParameterf(gl.TEXTURE_2D, this.anisoExt.TEXTURE_MAX_ANISOTROPY_EXT, this.aniso);
    } else {
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    }
  }

  private draw(prog: Prog, verts: Float32Array) {
    const gl = this.gl;
    gl.useProgram(prog.p);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STREAM_DRAW);
    gl.enableVertexAttribArray(prog.aPos);
    gl.vertexAttribPointer(prog.aPos, 4, gl.FLOAT, false, 24, 0);
    gl.enableVertexAttribArray(prog.aUv);
    gl.vertexAttribPointer(prog.aUv, 2, gl.FLOAT, false, 24, 16);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  /**
   * Draw `src` onto `ctx` mapped to a perspective quad. Corners are TL, TR, BR, BL in device px of the
   * target, each with its camera-space depth `w` (any positive scale; only ratios matter).
   */
  warp(ctx: Ctx2D, src: Src, srcW: number, srcH: number, corners: { x: number; y: number; w: number }[], opacity: number, uv?: [number, number, number, number]) {
    const tw = ctx.canvas.width, th = ctx.canvas.height;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const c of corners) {
      x0 = Math.min(x0, c.x); y0 = Math.min(y0, c.y);
      x1 = Math.max(x1, c.x); y1 = Math.max(y1, c.y);
    }
    x0 = Math.max(0, Math.floor(x0)); y0 = Math.max(0, Math.floor(y0));
    x1 = Math.min(tw, Math.ceil(x1)); y1 = Math.min(th, Math.ceil(y1));
    const bw = x1 - x0, bh = y1 - y0;
    if (bw <= 0 || bh <= 0 || srcW <= 0 || srcH <= 0) return;
    this.ensure(bw, bh);
    const gl = this.gl;
    const H = this.canvas.height;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, H - bh, bw, bh);
    gl.enable(gl.SCISSOR_TEST);
    gl.scissor(0, H - bh, bw, bh);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    this.upload(src, true);
    const [u0, v0, u1, v1] = uv ?? [0, 0, 1, 1];
    const uvs = [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];
    // Triangle strip order: TL, TR, BL, BR.
    const order = [0, 1, 3, 2];
    const data = new Float32Array(24);
    order.forEach((ci, i) => {
      const c = corners[ci];
      const nx = ((c.x - x0) / bw) * 2 - 1;
      const ny = 1 - ((c.y - y0) / bh) * 2;
      data.set([nx * c.w, ny * c.w, 0, c.w, uvs[ci][0], uvs[ci][1]], i * 6);
    });
    gl.useProgram(this.copy.p);
    gl.uniform1i(this.copy.u.uTex, 0);
    gl.uniform1f(this.copy.u.uAlpha, 1);
    this.draw(this.copy, data);
    gl.disable(gl.SCISSOR_TEST);
    const prev = ctx.globalAlpha;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = prev * opacity;
    ctx.drawImage(this.canvas as CanvasImageSource, 0, 0, bw, bh, x0, y0, bw, bh);
    ctx.restore();
  }

  private target(i: number, w: number, h: number): Target {
    const gl = this.gl;
    let t = this.targets[i];
    if (!t || t.w !== w || t.h !== h) {
      if (t) {
        gl.deleteTexture(t.tex);
        gl.deleteFramebuffer(t.fbo);
      }
      const tex = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      const fbo = gl.createFramebuffer()!;
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      t = { tex, fbo, w, h };
      this.targets[i] = t;
    }
    return t;
  }

  private quad(u0 = 0, v0 = 0, u1 = 1, v1 = 1) {
    return new Float32Array([-1, 1, 0, 1, u0, v0, 1, 1, 0, 1, u1, v0, -1, -1, 0, 1, u0, v1, 1, -1, 0, 1, u1, v1]);
  }

  /**
   * Gaussian blur with standard deviation `sigma` device px (CSS blur semantics). The source is padded
   * by 3σ so the blur can spread; the returned canvas is (w + 2·pad) × (h + 2·pad).
   */
  blur(src: Src, w: number, h: number, sigma: number, slot = 0): { canvas: AnyCanvas; pad: number } {
    const pad = Math.ceil(sigma * 3);
    const ow = w + pad * 2, oh = h + pad * 2;
    // Downsample so the per-pass sigma stays within the 17-tap kernel.
    let k = 1;
    while (sigma / k > 2.7 && k < 32) k *= 2;
    const sw = Math.max(1, Math.ceil(ow / k)), sh = Math.max(1, Math.ceil(oh / k));
    const s = sigma / k;
    const gl = this.gl;
    gl.disable(gl.BLEND);
    // Pass 0: place the source with padding into A.
    this.upload(src, k > 1);
    const A = this.target(0, sw, sh), B = this.target(1, sw, sh);
    gl.bindFramebuffer(gl.FRAMEBUFFER, A.fbo);
    gl.viewport(0, 0, sw, sh);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    const px = pad / ow, py = pad / oh;
    // FBO textures are bottom-up; render source flipped so the final copy-out is upright.
    const verts = new Float32Array([
      -1 + 2 * px, 1 - 2 * py, 0, 1, 0, 1,
      1 - 2 * px, 1 - 2 * py, 0, 1, 1, 1,
      -1 + 2 * px, -1 + 2 * py, 0, 1, 0, 0,
      1 - 2 * px, -1 + 2 * py, 0, 1, 1, 0,
    ]);
    gl.useProgram(this.copy.p);
    gl.uniform1i(this.copy.u.uTex, 0);
    gl.uniform1f(this.copy.u.uAlpha, 1);
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    this.draw(this.copy, verts);
    // Pass 1: horizontal A → B; Pass 2: vertical B → A.
    gl.useProgram(this.blurP.p);
    gl.uniform1i(this.blurP.u.uTex, 0);
    gl.uniform1f(this.blurP.u.uSigma, Math.max(0.01, s));
    gl.bindFramebuffer(gl.FRAMEBUFFER, B.fbo);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindTexture(gl.TEXTURE_2D, A.tex);
    gl.uniform2f(this.blurP.u.uDir, 1 / sw, 0);
    this.draw(this.blurP, this.quad(0, 1, 1, 0));
    gl.bindFramebuffer(gl.FRAMEBUFFER, A.fbo);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindTexture(gl.TEXTURE_2D, B.tex);
    gl.uniform2f(this.blurP.u.uDir, 0, 1 / sh);
    this.draw(this.blurP, this.quad(0, 1, 1, 0));
    // Copy out at full size into the default framebuffer (top-left region), upright.
    this.ensure(ow, oh);
    const H = this.canvas.height;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, H - oh, ow, oh);
    gl.enable(gl.SCISSOR_TEST);
    gl.scissor(0, H - oh, ow, oh);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.copy.p);
    gl.bindTexture(gl.TEXTURE_2D, A.tex);
    this.draw(this.copy, this.quad(0, 0, 1, 1));
    gl.disable(gl.SCISSOR_TEST);
    gl.enable(gl.BLEND);
    let o = this.out[slot];
    if (!o || o.canvas.width < ow || o.canvas.height < oh) {
      const canvas = createCanvas(Math.ceil(ow / 64) * 64, Math.ceil(oh / 64) * 64);
      o = { canvas, ctx: get2d(canvas) };
      this.out[slot] = o;
    }
    o.ctx.setTransform(1, 0, 0, 1, 0, 0);
    o.ctx.clearRect(0, 0, o.canvas.width, o.canvas.height);
    o.ctx.drawImage(this.canvas as CanvasImageSource, 0, 0, ow, oh, 0, 0, ow, oh);
    return { canvas: o.canvas, pad };
  }
}

let kit: GLKit | null | undefined;
export function gl(): GLKit | null {
  if (kit === undefined) {
    try {
      kit = new GLKit();
    } catch {
      kit = null;
    }
  }
  return kit;
}
export type { GLKit };
