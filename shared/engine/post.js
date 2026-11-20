// Post-processing: the scene and the viewmodel are rendered into a low-resolution target, then
// one full-screen pass adds bloom (glow around bright lights, muzzle flashes, fire, plasma),
// per-floor colour grading, a vignette, the retro filter (ordered dithering, colour crunch and
// scanlines), damage / low-health effects, chromatic aberration on big hits, and the
// pixel-dissolve used for floor transitions. Kept cheap: bloom works at half resolution.
import * as THREE from '../vendor/three.module.min.js';

const VERT = `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const BRIGHT = `
uniform sampler2D tSrc; uniform float threshold; varying vec2 vUv;
void main() {
  vec3 c = texture2D(tSrc, vUv).rgb;
  float l = max(c.r, max(c.g, c.b));
  float k = smoothstep(threshold, threshold + 0.35, l);
  gl_FragColor = vec4(c * k, 1.0);
}`;

const BLUR = `
uniform sampler2D tSrc; uniform vec2 dir; varying vec2 vUv;
void main() {
  vec3 c = texture2D(tSrc, vUv).rgb * 0.227;
  c += texture2D(tSrc, vUv + dir * 1.38).rgb * 0.316;
  c += texture2D(tSrc, vUv - dir * 1.38).rgb * 0.316;
  c += texture2D(tSrc, vUv + dir * 3.23).rgb * 0.070;
  c += texture2D(tSrc, vUv - dir * 3.23).rgb * 0.070;
  gl_FragColor = vec4(c, 1.0);
}`;

const COMPOSITE = `
uniform sampler2D tScene; uniform sampler2D tBloom;
uniform vec2 res; uniform float time;
uniform float bloom, retro, scan, vign, hurt, lowHp, chroma, dissolve, flash, sat, contrast, useBloom;
uniform vec3 tint, lift, flashCol;
uniform vec3 hole; // x, y (uv), strength: black hole lens
varying vec2 vUv;
float bayer(vec2 p) {
  vec2 q = mod(p, 4.0);
  int i = int(q.x) + int(q.y) * 4;
  float m[16];
  m[0]=0.;m[1]=8.;m[2]=2.;m[3]=10.;m[4]=12.;m[5]=4.;m[6]=14.;m[7]=6.;m[8]=3.;m[9]=11.;m[10]=1.;m[11]=9.;m[12]=15.;m[13]=7.;m[14]=13.;m[15]=5.;
  for (int k = 0; k < 16; k++) if (k == i) return m[k] / 16.0;
  return 0.0;
}
vec3 toSRGB(vec3 c) { c = max(c, 0.0); return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  vec2 uv = vUv;
  if (hole.z > 0.001) {
    vec2 hv = uv - hole.xy; hv.x *= res.x / res.y;
    float hd = length(hv);
    float pinch = hole.z * 0.06 * smoothstep(0.32, 0.0, hd) / max(hd, 0.02) * hd;
    uv -= normalize(uv - hole.xy + 0.0001) * pinch;
  }
  vec2 d = uv - 0.5;
  vec3 c;
  if (chroma > 0.001) {
    vec2 o = d * chroma * 0.035;
    c = vec3(texture2D(tScene, uv + o).r, texture2D(tScene, uv).g, texture2D(tScene, uv - o).b);
  } else c = texture2D(tScene, uv).rgb;
  if (useBloom > 0.5) c += texture2D(tBloom, uv).rgb * bloom;
  c = toSRGB(c);
  // grade: lift shadows, contrast, saturation, tint
  c = c + lift * (1.0 - c);
  c = (c - 0.5) * contrast + 0.5;
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  float s = sat * (1.0 - lowHp * 0.75);
  c = mix(vec3(l), c, s) * tint;
  // vignette (stronger and redder at low health, with a heartbeat)
  float r2 = dot(d * vec2(1.0, 1.15), d * vec2(1.0, 1.15));
  float beat = lowHp * (0.55 + 0.45 * pow(abs(sin(time * 3.2)), 6.0));
  c *= 1.0 - smoothstep(0.18, 0.75, r2) * (vign + beat * 0.5);
  c = mix(c, vec3(0.55, 0.0, 0.0), smoothstep(0.12, 0.6, r2) * (hurt * 0.85 + beat * 0.35));
  c += flashCol * flash;
  // retro filter: ordered dither into a reduced colour range + scanlines
  if (retro > 0.001) {
    float levels = mix(48.0, 10.0, retro);
    vec3 q = floor(c * levels + bayer(gl_FragCoord.xy) - 0.5 + 0.5) / levels;
    c = mix(c, q, min(1.0, retro * 1.5));
  }
  if (scan > 0.001) c *= 1.0 - scan * 0.22 * step(1.0, mod(gl_FragCoord.y, 2.0));
  // pixel dissolve to black (transitions)
  if (dissolve > 0.001) {
    vec2 cell = floor(gl_FragCoord.xy / 3.0);
    if (hash(cell) < dissolve) c = vec3(0.0);
  }
  gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}`;

export class Post {
  constructor(renderer) {
    this.renderer = renderer;
    const opt = { depthBuffer: true, type: THREE.HalfFloatType };
    this.rt = new THREE.WebGLRenderTarget(4, 4, { ...opt, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
    this.rtA = new THREE.WebGLRenderTarget(2, 2, { depthBuffer: false, type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
    this.rtB = this.rtA.clone();
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    this.quad.frustumCulled = false;
    this.qs = new THREE.Scene(); this.qs.add(this.quad);
    const mk = (frag, uniforms) => new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: frag, uniforms, depthTest: false, depthWrite: false });
    this.mBright = mk(BRIGHT, { tSrc: { value: null }, threshold: { value: 0.82 } });
    this.mBlur = mk(BLUR, { tSrc: { value: null }, dir: { value: new THREE.Vector2() } });
    this.u = {
      tScene: { value: this.rt.texture }, tBloom: { value: this.rtA.texture }, res: { value: new THREE.Vector2() }, time: { value: 0 },
      bloom: { value: 0.9 }, useBloom: { value: 1 }, retro: { value: 0 }, scan: { value: 0 }, vign: { value: 0.35 }, hurt: { value: 0 }, lowHp: { value: 0 },
      chroma: { value: 0 }, dissolve: { value: 0 }, flash: { value: 0 }, flashCol: { value: new THREE.Color(1, 1, 1) },
      hole: { value: new THREE.Vector3() },
      sat: { value: 1.08 }, contrast: { value: 1.06 }, tint: { value: new THREE.Color(1, 1, 1) }, lift: { value: new THREE.Color(0, 0, 0) },
    };
    this.mComp = mk(COMPOSITE, this.u);
    this.enabled = true;
    // targets the grade eases toward (set per floor mood)
    this.goal = { tint: new THREE.Color(1, 1, 1), lift: new THREE.Color(0, 0, 0), sat: 1.08, contrast: 1.06 };
  }

  setSize(w, h) {
    this.rt.setSize(w, h);
    const bw = Math.max(1, w >> 1), bh = Math.max(1, h >> 1);
    this.rtA.setSize(bw, bh); this.rtB.setSize(bw, bh);
    this.u.res.value.set(w, h);
    this.bw = bw; this.bh = bh;
  }

  // per-floor colour grade (eased in over a second)
  grade({ tint = 0xffffff, lift = 0x000000, sat = 1.08, contrast = 1.06 } = {}) {
    this.goal.tint.set(tint); this.goal.lift.set(lift); this.goal.sat = sat; this.goal.contrast = contrast;
  }

  update(dt) {
    const u = this.u, g = this.goal, k = Math.min(1, dt * 2);
    u.time.value += dt;
    u.tint.value.lerp(g.tint, k); u.lift.value.lerp(g.lift, k);
    u.sat.value += (g.sat - u.sat.value) * k; u.contrast.value += (g.contrast - u.contrast.value) * k;
    u.hurt.value = Math.max(0, u.hurt.value - dt * 2.2);
    u.chroma.value = Math.max(0, u.chroma.value - dt * 3);
    u.flash.value = Math.max(0, u.flash.value - dt * 4);
  }

  begin() {
    if (!this.enabled) { this.renderer.setRenderTarget(null); return; }
    this.renderer.setRenderTarget(this.rt);
  }

  end() {
    if (!this.enabled) return;
    const r = this.renderer;
    if (this.u.useBloom.value > 0.5) {
      this.quad.material = this.mBright; this.mBright.uniforms.tSrc.value = this.rt.texture;
      r.setRenderTarget(this.rtB); r.render(this.qs, this.cam);
      this.quad.material = this.mBlur;
      for (let i = 0; i < 2; i++) {
        this.mBlur.uniforms.tSrc.value = this.rtB.texture; this.mBlur.uniforms.dir.value.set((1 + i) / this.bw, 0);
        r.setRenderTarget(this.rtA); r.render(this.qs, this.cam);
        this.mBlur.uniforms.tSrc.value = this.rtA.texture; this.mBlur.uniforms.dir.value.set(0, (1 + i) / this.bh);
        r.setRenderTarget(this.rtB); r.render(this.qs, this.cam);
      }
      this.u.tBloom.value = this.rtB.texture;
    }
    this.quad.material = this.mComp;
    r.setRenderTarget(null); r.render(this.qs, this.cam);
  }
}
