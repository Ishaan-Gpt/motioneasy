import React from "react";
import { ThreeCanvas } from "@remotion/three";
import { continueRender, delayRender, staticFile, useCurrentFrame } from "remotion";
import { Environment, Lightformer, RoundedBox, Text } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
// @ts-expect-error troika ships no types
import { preloadFont } from "troika-three-text";

const SKY_FRAG = `
uniform vec3 top; uniform vec3 mid; uniform vec3 bot; varying vec3 vP;
void main(){
  float h = vP.y * 0.5 + 0.5;
  vec3 c = mix(bot, mid, smoothstep(0.0, 0.5, h));
  c = mix(c, top, smoothstep(0.45, 0.9, h));
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}`;

const GradientSky: React.FC = () => {
  const mat = React.useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide, depthWrite: false, toneMapped: false,
        uniforms: { top: { value: new THREE.Color("#F4F1FF") }, mid: { value: new THREE.Color("#C9CDFC") }, bot: { value: new THREE.Color("#6E7BF2") } },
        vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
        fragmentShader: SKY_FRAG,
      }),
    [],
  );
  return (
    <mesh material={mat}>
      <sphereGeometry args={[60, 32, 32]} />
    </mesh>
  );
};

const useFonts = (urls: string[]) => {
  const [h] = React.useState(() => delayRender("troika fonts"));
  React.useEffect(() => {
    let n = urls.length;
    urls.forEach((font) => preloadFont({ font, characters: "abcdefghijklmnopqrstuvwxyz" }, () => { if (--n === 0) continueRender(h); }));
  }, []);
};

/** Minimal custom post: scene → render target (with depth) → full-screen shader. */
const Post: React.FC = () => {
  const { gl, scene, camera, size } = useThree();
  const rt = React.useMemo(() => {
    const pr = gl.getPixelRatio();
    const t = new THREE.WebGLRenderTarget(size.width * pr, size.height * pr, { type: THREE.UnsignedByteType, samples: 4 });
    t.depthTexture = new THREE.DepthTexture(size.width * pr, size.height * pr);
    return t;
  }, [gl, size]);
  const post = React.useMemo(() => {
    const m = new THREE.ShaderMaterial({
      uniforms: { tColor: { value: null }, tDepth: { value: null } },
      vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }",
      fragmentShader:
        "uniform sampler2D tColor; uniform sampler2D tDepth; varying vec2 vUv; void main(){ vec4 c = texture2D(tColor, vUv); float v = smoothstep(0.95, 0.3, length(vUv - 0.5)); gl_FragColor = vec4(c.rgb * mix(0.6, 1.0, v), 1.0); }",
      depthTest: false, depthWrite: false, toneMapped: false,
    });
    const s = new THREE.Scene();
    s.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), m));
    return { s, m, cam: new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1) };
  }, []);
  useFrame(() => {
    gl.setRenderTarget(rt);
    gl.clear();
    gl.render(scene, camera);
    gl.setRenderTarget(null);
    post.m.uniforms.tColor.value = rt.texture;
    post.m.uniforms.tDepth.value = rt.depthTexture;
    gl.render(post.s, post.cam);
  }, 1);
  return null;
};

export const GlTest: React.FC<{ fx?: string }> = ({ fx = "" }) => {
  const f = useCurrentFrame();
  const font = staticFile("ad30/fonts/PlusJakartaSans-700.ttf");
  useFonts([font]);
  return (
    <ThreeCanvas width={1920} height={1080} camera={{ position: [0, 1.2, 6], fov: 35 }} gl={{ antialias: true, toneMapping: THREE.NoToneMapping }}>
      <GradientSky />
      <Environment resolution={256}>
        <Lightformer intensity={3} position={[0, 5, 2]} scale={[10, 2, 1]} />
        <Lightformer intensity={2} position={[-5, 1, 3]} scale={[2, 6, 1]} color="#BEC3FB" />
        <Lightformer intensity={1.5} position={[5, 0, -2]} scale={[2, 6, 1]} color="#5163FF" />
      </Environment>
      <ambientLight intensity={0.4} />
      <group rotation={[0.15, f * 0.01, 0]}>
        <RoundedBox args={[4.2, 0.6, 0.25]} radius={0.12} smoothness={6}>
          <meshPhysicalMaterial transmission={1} roughness={0.12} thickness={0.6} ior={1.45} clearcoat={1} attenuationColor="#BEC3FB" attenuationDistance={2} color="#ffffff" />
        </RoundedBox>
        <Text font={font} fontSize={0.28} position={[0, 0, 0.14]} color="#0B0C1A" anchorX="center" anchorY="middle">
          free animated captions
        </Text>
      </group>
      <mesh position={[0, 0.2, -3]}>
        <sphereGeometry args={[0.6, 48, 48]} />
        <meshStandardMaterial color="#2B3BD9" emissive="#5163FF" emissiveIntensity={1.4} />
      </mesh>
      {fx === "post" && <Post />}
    </ThreeCanvas>
  );
};
