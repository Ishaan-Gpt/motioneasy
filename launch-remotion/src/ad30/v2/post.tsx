import React from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

// Hand-rolled post pipeline (pmndrs/postprocessing renders black/white under Remotion + ANGLE on this machine):
// scene → MSAA target with depth → half/quarter gaussian chains → bloom chain → composite (DOF from depth,
// bloom, camera motion/zoom blur, flash, vignette, grain) → screen in sRGB.

export type PostParams = {
  focus: number; // world distance in focus
  aperture: number; // DOF strength (0 = everything sharp)
  bloom: number;
  threshold: number;
  blurDir: [number, number]; // uv units, camera motion blur
  zoomBlur: number; // radial blur amount (uv)
  vignette: number;
  grain: number;
  flash: number; // 0..1 white
  exposure: number;
};

const VERT = "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }";

const COPY_FRAG = `
uniform sampler2D tSrc; uniform vec2 texel; uniform float threshold; uniform float useThreshold; varying vec2 vUv;
void main(){
  vec3 c = 0.25 * (texture2D(tSrc, vUv + texel * vec2(-1.0,-1.0)).rgb + texture2D(tSrc, vUv + texel * vec2(1.0,-1.0)).rgb
         + texture2D(tSrc, vUv + texel * vec2(-1.0,1.0)).rgb + texture2D(tSrc, vUv + texel * vec2(1.0,1.0)).rgb);
  if (useThreshold > 0.5) { float l = max(max(c.r, c.g), c.b); c *= smoothstep(threshold, threshold + 0.25, l); }
  gl_FragColor = vec4(c, 1.0);
}`;

const BLUR_FRAG = `
uniform sampler2D tSrc; uniform vec2 dir; varying vec2 vUv;
void main(){
  vec3 c = texture2D(tSrc, vUv).rgb * 0.2270270270;
  c += texture2D(tSrc, vUv + dir * 1.3846153846).rgb * 0.3162162162;
  c += texture2D(tSrc, vUv - dir * 1.3846153846).rgb * 0.3162162162;
  c += texture2D(tSrc, vUv + dir * 3.2307692308).rgb * 0.0702702703;
  c += texture2D(tSrc, vUv - dir * 3.2307692308).rgb * 0.0702702703;
  gl_FragColor = vec4(c, 1.0);
}`;

const COMPOSITE_FRAG = `
uniform sampler2D tMain; uniform sampler2D tDepth; uniform sampler2D tHalf; uniform sampler2D tQuarter; uniform sampler2D tBloom;
uniform float cnear; uniform float cfar; uniform float focus; uniform float aperture; uniform float bloomStr;
uniform vec2 blurDir; uniform float zoomBlur; uniform float vig; uniform float grain; uniform float seed; uniform float flash; uniform float exposure;
uniform vec2 res;
varying vec2 vUv;
float lin(float d){ float z = d * 2.0 - 1.0; return 2.0 * cnear * cfar / (cfar + cnear - z * (cfar - cnear)); }
vec3 dof(vec2 uv){
  float dist = lin(texture2D(tDepth, uv).r);
  float coc = clamp(abs(dist - focus) * aperture / max(dist, 0.05), 0.0, 1.0);
  vec3 s = texture2D(tMain, uv).rgb;
  vec3 h = texture2D(tHalf, uv).rgb;
  vec3 q = texture2D(tQuarter, uv).rgb;
  vec3 b = mix(h, q, smoothstep(0.35, 1.0, coc));
  return mix(s, b, smoothstep(0.02, 0.5, coc));
}
void main(){
  vec3 c = dof(vUv);
  float mb = length(blurDir) + zoomBlur;
  if (mb > 0.0006) {
    vec3 acc = vec3(0.0);
    for (int i = 0; i < 12; i++) {
      float t = float(i) / 11.0 - 0.5;
      vec2 off = blurDir * t + (vUv - 0.5) * zoomBlur * t;
      acc += texture2D(tHalf, vUv + off).rgb;
    }
    c = mix(c, acc / 12.0, clamp(mb * 60.0, 0.0, 1.0));
  }
  c += texture2D(tBloom, vUv).rgb * bloomStr;
  c *= exposure;
  c = mix(c, vec3(1.0), flash);
  float v = smoothstep(0.95, 0.25, length((vUv - 0.5) * vec2(1.0, 0.9)));
  c *= mix(1.0 - vig, 1.0, v);
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
  float n = fract(sin(dot(vUv * res + seed, vec2(12.9898, 78.233))) * 43758.5453);
  gl_FragColor.rgb += (n - 0.5) * grain;
}`;

const mat = (frag: string, uniforms: Record<string, THREE.IUniform>) =>
  new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: frag, uniforms, depthTest: false, depthWrite: false, toneMapped: false });

export const Post: React.FC<{ params: (frame: number) => PostParams; frame: number }> = ({ params, frame }) => {
  const { gl, scene, camera, size } = useThree();
  const pr = gl.getPixelRatio();
  const W = Math.round(size.width * pr);
  const H = Math.round(size.height * pr);

  const P = React.useMemo(() => {
    const rt = (w: number, h: number, samples = 0) => new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples, depthBuffer: samples > 0 });
    const main = rt(W, H, 4);
    main.depthTexture = new THREE.DepthTexture(W, H);
    const half = [rt(W / 2, H / 2), rt(W / 2, H / 2)];
    const quarter = [rt(W / 4, H / 4), rt(W / 4, H / 4)];
    const bloom = [rt(W / 4, H / 4), rt(W / 4, H / 4)];
    const copy = mat(COPY_FRAG, { tSrc: { value: null }, texel: { value: new THREE.Vector2() }, threshold: { value: 0.8 }, useThreshold: { value: 0 } });
    const blur = mat(BLUR_FRAG, { tSrc: { value: null }, dir: { value: new THREE.Vector2() } });
    const comp = mat(COMPOSITE_FRAG, {
      tMain: { value: main.texture }, tDepth: { value: main.depthTexture }, tHalf: { value: half[0].texture }, tQuarter: { value: quarter[0].texture }, tBloom: { value: bloom[0].texture },
      cnear: { value: 0.1 }, cfar: { value: 200 }, focus: { value: 5 }, aperture: { value: 0 }, bloomStr: { value: 0 },
      blurDir: { value: new THREE.Vector2() }, zoomBlur: { value: 0 }, vig: { value: 0.3 }, grain: { value: 0.03 }, seed: { value: 0 }, flash: { value: 0 }, exposure: { value: 1 },
      res: { value: new THREE.Vector2(W, H) },
    });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), copy);
    quad.frustumCulled = false;
    const qs = new THREE.Scene();
    qs.add(quad);
    return { main, half, quarter, bloom, copy, blur, comp, quad, qs, cam: new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1) };
  }, [W, H]);

  useFrame(() => {
    const p = params(frame);
    const pass = (m: THREE.ShaderMaterial, target: THREE.WebGLRenderTarget | null) => {
      P.quad.material = m;
      gl.setRenderTarget(target);
      gl.render(P.qs, P.cam);
    };
    const chain = (src: THREE.Texture, pair: THREE.WebGLRenderTarget[], w: number, h: number, radius: number, threshold?: number) => {
      P.copy.uniforms.tSrc.value = src;
      P.copy.uniforms.texel.value.set(0.5 / w, 0.5 / h);
      P.copy.uniforms.useThreshold.value = threshold === undefined ? 0 : 1;
      P.copy.uniforms.threshold.value = threshold ?? 0;
      pass(P.copy, pair[0]);
      for (let k = 0; k < 2; k++) {
        P.blur.uniforms.tSrc.value = pair[0].texture;
        P.blur.uniforms.dir.value.set((radius * (k + 1)) / w, 0);
        pass(P.blur, pair[1]);
        P.blur.uniforms.tSrc.value = pair[1].texture;
        P.blur.uniforms.dir.value.set(0, (radius * (k + 1)) / h);
        pass(P.blur, pair[0]);
      }
    };
    // 1 · scene
    gl.setRenderTarget(P.main);
    gl.clear();
    gl.render(scene, camera);
    // 2 · blur chains
    chain(P.main.texture, P.half, W / 2, H / 2, 1.0);
    chain(P.half[0].texture, P.quarter, W / 4, H / 4, 1.6);
    chain(P.half[0].texture, P.bloom, W / 4, H / 4, 2.4, p.threshold);
    // 3 · composite
    const u = P.comp.uniforms;
    const cam = camera as THREE.PerspectiveCamera;
    u.cnear.value = cam.near;
    u.cfar.value = cam.far;
    u.focus.value = p.focus;
    u.aperture.value = p.aperture;
    u.bloomStr.value = p.bloom;
    u.blurDir.value.set(p.blurDir[0], p.blurDir[1]);
    u.zoomBlur.value = p.zoomBlur;
    u.vig.value = p.vignette;
    u.grain.value = p.grain;
    u.seed.value = (frame % 97) * 13.37;
    u.flash.value = p.flash;
    u.exposure.value = p.exposure;
    pass(P.comp, null);
  }, 1);
  return null;
};
