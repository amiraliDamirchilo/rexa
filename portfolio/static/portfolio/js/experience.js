/* ==========================================================================
   VOX — 3D reel
   One continuous camera move through six scenes. Scroll is the playhead.

   0  HERO      the portrait, rebuilt from halftone dots ("information")
                that assemble out of chaos; the cursor turns dots yellow.
   1  SERVICES  three slabs dealt like cards.
   2  WORK      a film-reel carousel; click a frame to play it.
   3  PROCESS   an edit timeline; the playhead follows your scroll.
   4  ABOUT     prints fall onto a contact sheet; one gets circled.
   5  CONTACT   a clapperboard that claps when you arrive.
   ========================================================================== */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/* ------------------------------------------------------------------ setup */
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const easeOutBack = (t) => { const c1 = 1.70158; const c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isTouch = window.matchMedia('(hover: none)').matches;
const cfg = $('#xp-config').dataset;
const projects = JSON.parse($('#projects-data').textContent || '[]');

const HEX = { yellow: '#F7C800', ink: '#101010', paper: '#F3F2EE' };
const COL = {
  yellow: new THREE.Color(HEX.yellow),
  ink: new THREE.Color(HEX.ink),
  paper: new THREE.Color(HEX.paper),
};

const CHAPTERS = 6;
const SPACING = 64;
const BG = [COL.paper, COL.paper, COL.ink, COL.yellow, COL.paper, COL.ink];
const THEME = ['light', 'light', 'dark', 'yellow', 'light', 'dark'];

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas: $('.webgl'), antialias: false, powerPreference: 'high-performance' });
} catch (err) {
  $('.fallback').hidden = false;
  $('.loader').classList.add('is-gone');
  throw err;
}
const DPR = Math.min(window.devicePixelRatio, isTouch ? 1.5 : 1.8);
renderer.setPixelRatio(DPR);
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping; // keep the palette exact

const scene = new THREE.Scene();
scene.background = COL.paper.clone();
scene.fog = new THREE.Fog(COL.paper.clone(), 20, 60);

const camera = new THREE.PerspectiveCamera(35, innerWidth / innerHeight, 0.1, 400);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;

scene.add(new THREE.HemisphereLight(0xffffff, 0x666666, 0.55));
const key = new THREE.DirectionalLight(0xffffff, 0.9);
key.position.set(6, 10, 8);
scene.add(key);

/* ---------------------------------------------------------- post effects */
const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(innerWidth * DPR, innerHeight * DPR, {
  samples: isTouch ? 0 : 4,
  type: THREE.HalfFloatType,
}));
composer.addPass(new RenderPass(scene, camera));
// Lens: chromatic split that grows with scroll speed, a soft vignette, film grain.
const fx = new ShaderPass({
  uniforms: {
    tDiffuse: { value: null },
    uShift: { value: 0 },
    uTime: { value: 0 },
    uRes: { value: new THREE.Vector2(innerWidth, innerHeight) },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform float uShift;
    uniform float uTime;
    uniform vec2 uRes;
    varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec2 d = vUv - 0.5;
      float s = uShift * 0.018 * length(d);
      vec4 c;
      c.r = texture2D(tDiffuse, vUv + d * s).r;
      c.g = texture2D(tDiffuse, vUv).g;
      c.b = texture2D(tDiffuse, vUv - d * s).b;
      c.a = 1.0;
      c.rgb *= mix(0.9, 1.0, smoothstep(0.85, 0.25, length(d)));
      c.rgb += (hash(vUv * uRes + fract(uTime) * 100.0) - 0.5) * 0.01;
      gl_FragColor = c;
    }`,
});
composer.addPass(fx);
composer.addPass(new OutputPass());

/* ------------------------------------------------------- canvas textures */
const maxAniso = renderer.capabilities.getMaxAnisotropy();
const toTexture = (canvas) => {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = maxAniso;
  return t;
};
const makeCanvas = (w, h) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
};
const setFont = (ctx, { weight = 400, size = 100, family = 'Anton', stretch = 'normal', style = 'normal' } = {}) => {
  // Anton ships a single weight; asking for more would fake-bold it.
  if (family === 'Anton') weight = 400;
  ctx.font = `${style} ${weight} ${size}px ${family}`;
  if ('fontStretch' in ctx) ctx.fontStretch = stretch;
};
// Shrink a line until it fits the width.
const fitFont = (ctx, text, maxW, opts) => {
  let size = opts.size;
  setFont(ctx, { ...opts, size });
  while (ctx.measureText(text).width > maxW && size > 10) {
    size -= 2;
    setFont(ctx, { ...opts, size });
  }
  return size;
};
const wrapLines = (ctx, text, maxW) => {
  const words = text.split(/\s+/);
  const lines = [];
  let line = '';
  words.forEach((w) => {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; } else line = test;
  });
  if (line) lines.push(line);
  return lines;
};

/* ---------------------------------------------------------------- loading */
const pctEl = $('[data-loader-pct]');
const barEl = $('.loader__bar');
let loaded = 0;
let total = 0;
const bump = () => {
  loaded += 1;
  const p = total ? loaded / total : 1;
  pctEl.textContent = Math.round(p * 100);
  barEl.style.setProperty('--p', p);
};
const loadImage = (src) => {
  total += 1;
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => { bump(); resolve(img); };
    img.onerror = () => { bump(); resolve(null); };
    img.src = src;
  });
};
const loadFonts = () => {
  total += 1;
  const fonts = [
    '400 100px Anton',
    '400 20px Inter',
    'italic 400 100px Inter',
    '700 20px Satoshi',
  ];
  return Promise.race([
    Promise.all(fonts.map((f) => document.fonts.load(f))),
    new Promise((r) => setTimeout(r, 2500)),
  ]).then(bump);
};

/* ===================================================================== */
/*                               SCENES                                  */
/* ===================================================================== */
const chapters = []; // { group, update(local, near, time, dt), layout(narrow), hits? }
const hitTargets = [];
const pointer = new THREE.Vector2(0, 0); // NDC
const pointerSmooth = new THREE.Vector2(0, 0);
const raycaster = new THREE.Raycaster();
let hovered = null;

const anchor = (i) => {
  const g = new THREE.Group();
  g.position.z = -i * SPACING;
  scene.add(g);
  return g;
};

// Glossy, but anchored to the palette: a share of the colour is emissive,
// so faces toward the camera read as the brand colour, not a lit tint of it.
const physical = (color, extra = {}) => new THREE.MeshPhysicalMaterial({
  color,
  emissive: color.clone().multiplyScalar(0.42),
  roughness: 0.4,
  metalness: 0,
  clearcoat: 1,
  clearcoatRoughness: 0.25,
  envMapIntensity: 0.6,
  ...extra,
});

/* ---------------------------------------------- floating frames (travel) */
function buildTravelFrames() {
  const shape = new THREE.Shape();
  shape.moveTo(-0.9, -1.4); shape.lineTo(0.9, -1.4); shape.lineTo(0.9, 1.4); shape.lineTo(-0.9, 1.4); shape.lineTo(-0.9, -1.4);
  const hole = new THREE.Path();
  hole.moveTo(-0.78, -1.28); hole.lineTo(-0.78, 1.28); hole.lineTo(0.78, 1.28); hole.lineTo(0.78, -1.28); hole.lineTo(-0.78, -1.28);
  shape.holes.push(hole);
  const geo = new THREE.ShapeGeometry(shape);
  const count = 140;
  const mesh = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), count);
  const dummy = new THREE.Object3D();
  const palette = [COL.yellow, COL.ink, COL.ink, COL.paper];
  const seeds = [];
  for (let i = 0; i < count; i += 1) {
    const a = Math.random() * Math.PI * 2;
    const r = 9 + Math.random() * 14;
    const z = 20 - Math.random() * (SPACING * (CHAPTERS - 1) + 40);
    const s = 0.4 + Math.random() * 1.1;
    seeds.push({ x: Math.cos(a) * r * 1.4, y: Math.sin(a) * r * 0.8, z, s, rx: Math.random() * 6, ry: Math.random() * 6, v: (Math.random() - 0.5) * 0.4 });
    mesh.setColorAt(i, palette[i % palette.length]);
  }
  mesh.instanceColor.needsUpdate = true;
  scene.add(mesh);
  return (time) => {
    seeds.forEach((sd, i) => {
      dummy.position.set(sd.x, sd.y + Math.sin(time * 0.4 + i) * 0.4, sd.z);
      dummy.rotation.set(sd.rx + time * sd.v, sd.ry + time * sd.v * 0.7, 0);
      dummy.scale.setScalar(sd.s);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  };
}

/* ------------------------------------------------- 0 · HERO: halftone me */
function buildHero(img) {
  const group = anchor(0);
  const portrait = new THREE.Group();
  group.add(portrait);

  // Yellow slab behind the face — same cut-paper move as the 2D site.
  const slab = new THREE.Mesh(new THREE.PlaneGeometry(8.6, 10.6), new THREE.MeshBasicMaterial({ color: COL.yellow }));
  slab.position.set(0.35, -0.3, -0.8);
  slab.rotation.z = 0.035;
  portrait.add(slab);

  // Sample the photo into a halftone grid: darker pixel → bigger dot.
  const cols = isTouch ? 84 : 120;
  const W = 8;
  const H = 10;
  const rows = Math.round(cols * (H / W));
  const [cv, cx] = makeCanvas(cols, rows);
  const target = [];
  const sizes = [];
  if (img) {
    const sw = img.naturalWidth * 0.8;
    cx.drawImage(img, img.naturalWidth * 0.1, 0, sw, img.naturalHeight, 0, 0, cols, rows);
    const px = cx.getImageData(0, 0, cols, rows).data;
    const step = W / cols;
    const lums = new Float32Array(cols * rows);
    for (let k = 0; k < cols * rows; k += 1) lums[k] = (0.299 * px[k * 4] + 0.587 * px[k * 4 + 1] + 0.114 * px[k * 4 + 2]) / 255;
    // Auto-levels: stretch the 4th–96th percentile to full range.
    const sorted = Array.from(lums).sort((a, b) => a - b);
    const lo = sorted[Math.floor(sorted.length * 0.04)];
    const hi = sorted[Math.floor(sorted.length * 0.96)];
    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        const lum = clamp((lums[y * cols + x] - lo) / Math.max(0.05, hi - lo), 0, 1);
        const d = Math.pow(clamp((0.94 - lum) / 0.8, 0, 1), 0.85);
        if (d < 0.1) continue;
        target.push(x * step - W / 2 + step / 2, H / 2 - y * step - step / 2, 0);
        sizes.push(d);
      }
    }
  }
  const n = sizes.length;
  const chaos = new Float32Array(n * 3);
  const rand = new Float32Array(n);
  const tint = new Float32Array(n);
  for (let i = 0; i < n; i += 1) {
    const u = Math.random() * 2 - 1;
    const th = Math.random() * Math.PI * 2;
    const r = 10 + Math.random() * 22;
    const s = Math.sqrt(1 - u * u);
    chaos[i * 3] = Math.cos(th) * s * r * 1.6;
    chaos[i * 3 + 1] = u * r;
    chaos[i * 3 + 2] = Math.sin(th) * s * r - 4;
    rand[i] = Math.random();
    tint[i] = Math.random() < 0.035 ? 1 : 0;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(target, 3));
  geo.setAttribute('aChaos', new THREE.BufferAttribute(chaos, 3));
  geo.setAttribute('aSize', new THREE.Float32BufferAttribute(sizes, 1));
  geo.setAttribute('aRand', new THREE.BufferAttribute(rand, 1));
  geo.setAttribute('aTint', new THREE.BufferAttribute(tint, 1));

  const uniforms = {
    uAssemble: { value: reduceMotion ? 1 : 0 },
    uScatter: { value: 0 },
    uTime: { value: 0 },
    uMouse: { value: new THREE.Vector2(99, 99) },
    uMouseOn: { value: 0 },
    uDot: { value: (W / cols) * 1.18 },
    uProj: { value: 1 },
    uScale: { value: 1 },
    uInk: { value: COL.ink },
    uYellow: { value: COL.yellow },
    uPaper: { value: COL.paper },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: /* glsl */`
      attribute vec3 aChaos;
      attribute float aSize;
      attribute float aRand;
      attribute float aTint;
      uniform float uAssemble, uScatter, uTime, uMouseOn, uDot, uProj, uScale;
      uniform vec2 uMouse;
      varying float vYellow;
      varying float vLit;
      void main() {
        float delay = aRand * 0.45;
        float a = clamp((uAssemble - delay) / 0.55, 0.0, 1.0);
        a = 1.0 - pow(1.0 - a, 3.0);
        vec3 p = mix(aChaos, position, a);
        // A swirl while flying in
        float sw = (1.0 - a) * 2.4;
        p.xz = mat2(cos(sw), -sin(sw), sin(sw), cos(sw)) * p.xz;
        // Breathing
        p.z += sin(uTime * 1.3 + aRand * 6.2831) * 0.06 * a;
        // The cursor pushes dots aside and turns them yellow
        vec2 d = p.xy - uMouse;
        float f = smoothstep(1.9, 0.0, length(d)) * uMouseOn * a;
        p.xy += normalize(d + 1e-4) * f * 0.7;
        p.z += f * 1.4;
        vYellow = aTint;
        vLit = smoothstep(0.1, 0.6, f);
        // Leaving the hero: information bursts toward the lens
        p.z += uScatter * (6.0 + aRand * 34.0);
        p.xy *= 1.0 + uScatter * (0.4 + aRand * 1.8);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float size = uDot * mix(0.55, aSize, a) * (1.0 + f * 0.6) * uScale;
        gl_PointSize = max(1.0, size * uProj / -mv.z);
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uInk, uYellow, uPaper;
      varying float vYellow;
      varying float vLit;
      void main() {
        if (length(gl_PointCoord - 0.5) > 0.5) discard;
        vec3 c = mix(uInk, uYellow, vYellow);
        gl_FragColor = vec4(mix(c, uPaper, vLit), 1.0);
      }`,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  portrait.add(points);

  // A few glossy objects for depth — yellow and ink only.
  const props = new THREE.Group();
  group.add(props);
  const shapes = [
    [new RoundedBoxGeometry(1.2, 1.2, 1.2, 4, 0.18), COL.yellow, [-8.5, 4.2, -6]],
    [new THREE.TorusGeometry(0.8, 0.26, 24, 64), COL.ink, [9.5, 3.8, -4]],
    [new RoundedBoxGeometry(0.7, 2.2, 0.7, 4, 0.14), COL.ink, [-6, -4.6, -3]],
    [new THREE.SphereGeometry(0.55, 48, 48), COL.yellow, [8.6, -4.4, -2]],
    [new THREE.ConeGeometry(0.6, 1.2, 4), COL.yellow, [1.2, 5.6, -8]],
  ];
  const propMeshes = shapes.map(([g, c, pos], i) => {
    const m = new THREE.Mesh(g, physical(c));
    m.position.set(...pos);
    m.userData = { base: new THREE.Vector3(...pos), seed: i * 1.7 };
    props.add(m);
    return m;
  });

  let intro = reduceMotion ? 1 : 0;
  const local = new THREE.Vector2();

  return {
    group,
    start() { intro = 0.0001; },
    layout(narrow) {
      if (narrow) { portrait.position.set(0, 2.9, 0); portrait.scale.setScalar(0.58); } else { portrait.position.set(4.3, -0.2, 0); portrait.scale.setScalar(0.84); }
      uniforms.uScale.value = portrait.scale.x;
    },
    update({ t, time, dt }) {
      if (intro > 0 && intro < 1) intro = Math.min(1, intro + dt / 2.8);
      uniforms.uAssemble.value = intro;
      uniforms.uTime.value = time;
      uniforms.uScatter.value = reduceMotion ? 0 : smooth(0.08, 0.95, t);
      uniforms.uProj.value = renderer.domElement.height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));

      // Cursor → portrait-local plane
      raycaster.setFromCamera(pointer, camera);
      const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -portrait.getWorldPosition(new THREE.Vector3()).z);
      const hit = new THREE.Vector3();
      if (!isTouch && raycaster.ray.intersectPlane(plane, hit)) {
        portrait.worldToLocal(hit);
        local.lerp(new THREE.Vector2(hit.x, hit.y), 0.18);
        uniforms.uMouse.value.copy(local);
        uniforms.uMouseOn.value = lerp(uniforms.uMouseOn.value, t < 0.3 ? 1 : 0, 0.08);
      }
      slab.scale.y = easeOutCubic(smooth(0.25, 0.85, intro));
      slab.rotation.z = 0.035 + t * 0.4;

      propMeshes.forEach((m) => {
        const { base, seed } = m.userData;
        m.position.set(base.x + Math.sin(time * 0.5 + seed) * 0.4, base.y + Math.cos(time * 0.6 + seed) * 0.5, base.z);
        m.rotation.x = time * 0.3 + seed;
        m.rotation.y = time * 0.4 + seed;
        m.scale.setScalar(easeOutBack(smooth(0.5 + seed * 0.05, 1, intro)));
      });
    },
  };
}

/* -------------------------------------------- 1 · SERVICES: dealt slabs */
function buildServices() {
  const group = anchor(1);
  const items = [
    { title: cfg.sa, desc: cfg.sad, body: COL.yellow, fg: HEX.ink, accent: HEX.ink },
    { title: cfg.sb, desc: cfg.sbd, body: COL.ink, fg: HEX.paper, accent: HEX.yellow },
    { title: cfg.sc, desc: cfg.scd, body: COL.paper, fg: HEX.ink, accent: HEX.ink },
  ].filter((it) => it.title);
  const mid = (items.length - 1) / 2;
  const W = 4.2;
  const H = 5.6;
  const slabs = items.map((it, i) => {
    const holder = new THREE.Group();
    const body = new THREE.Mesh(new RoundedBoxGeometry(W, H, 0.5, 6, 0.2), physical(it.body));
    holder.add(body);

    const [cv, cx] = makeCanvas(840, 1120);
    cx.fillStyle = it.fg;
    setFont(cx, { weight: 700, size: 34, family: 'Satoshi' });
    cx.fillStyle = it.accent;
    cx.fillText(`(0${i + 1})`, 60, 100);
    cx.fillStyle = it.fg;
    const words = (it.title || '').toUpperCase().split(/\s+/);
    let y = 760 - (words.length - 1) * 150;
    words.forEach((w) => {
      fitFont(cx, w, 720, { weight: 900, size: 190 });
      cx.fillText(w, 56, y);
      y += 150;
    });
    setFont(cx, { weight: 400, size: 32, family: 'Inter' });
    cx.globalAlpha = 0.8;
    wrapLines(cx, (it.desc || '').replace(/\s+/g, ' '), 720).slice(0, 3).forEach((l, li) => cx.fillText(l, 60, 900 + li * 46));
    cx.globalAlpha = 1;
    const face = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.1, H - 0.1), new THREE.MeshBasicMaterial({ map: toTexture(cv), transparent: true }));
    face.position.z = 0.26;
    holder.add(face);

    body.userData.slab = holder;
    face.userData.slab = holder;
    hitTargets.push({ mesh: body, chapter: 1 }, { mesh: face, chapter: 1 });
    holder.userData = { lift: 0, home: new THREE.Vector3(), homeRot: 0, i };
    group.add(holder);
    return holder;
  });

  return {
    group,
    layout(narrow) {
      slabs.forEach((s, i) => {
        if (narrow) {
          s.userData.home.set(i % 2 ? 0.5 : -0.5, 1.4 - i * 3.3, 0);
          s.userData.homeRot = (i - mid) * -0.08;
          s.scale.setScalar(0.56);
        } else {
          s.userData.home.set((i - mid) * 4.9, -1.5, -Math.abs(i - mid) * 0.8);
          s.userData.homeRot = (i - mid) * -0.22;
          s.scale.setScalar(0.92);
        }
      });
    },
    update({ t, time }) {
      // Deal in as the camera approaches; each card lands a beat later.
      slabs.forEach((s, i) => {
        const k = easeOutCubic(smooth(0.25 + i * 0.12, 0.85 + i * 0.08, t));
        const { home, homeRot } = s.userData;
        const isHover = hovered && hovered.userData.slab === s;
        s.userData.lift = lerp(s.userData.lift, isHover ? 1 : 0, 0.12);
        s.position.set(
          lerp(home.x + (i - mid) * 6, home.x, k),
          lerp(home.y - 9, home.y, k) + Math.sin(time * 0.9 + i) * 0.12 + s.userData.lift * 0.5,
          home.z + s.userData.lift * 1.2,
        );
        s.rotation.set(
          lerp(-1.2, 0, k) + pointerSmooth.y * 0.12 * s.userData.lift,
          lerp(Math.PI * (i % 2 ? 1 : -1), homeRot, k) + pointerSmooth.x * 0.2 * s.userData.lift,
          lerp(0.6 * (i - mid), 0, k),
        );
      });
    },
  };
}

/* ------------------------------------------------ 2 · WORK: reel carousel */
function buildWork(thumbs) {
  const group = anchor(2);
  const carousel = new THREE.Group();
  group.add(carousel);

  const list = projects.length ? projects : [{ title: cfg.empty || 'NEW WORK SOON', videoId: '' }];
  const N = Math.max(8, list.length);
  const FW = 2.4;
  const FH = FW * 16 / 9;
  const R = Math.max(4.4, (N * (FW + 0.9)) / (Math.PI * 2));

  const frames = [];
  for (let k = 0; k < N; k += 1) {
    const proj = list[k % list.length];
    const img = thumbs[k % list.length];
    const holder = new THREE.Group();
    const a = (k / N) * Math.PI * 2;
    holder.position.set(Math.sin(a) * R, 0, Math.cos(a) * R);
    holder.rotation.y = a;

    // Yellow border appears on hover
    const border = new THREE.Mesh(new THREE.PlaneGeometry(FW + 0.24, FH + 0.24), new THREE.MeshBasicMaterial({ color: COL.yellow }));
    border.position.z = -0.02;
    border.scale.setScalar(0.94);
    holder.add(border);

    let map;
    if (img) {
      map = new THREE.Texture(img);
      map.colorSpace = THREE.SRGBColorSpace;
      map.anisotropy = maxAniso;
      const ia = img.naturalWidth / img.naturalHeight;
      const ta = FW / FH;
      if (ia > ta) { map.repeat.set(ta / ia, 1); map.offset.set((1 - ta / ia) / 2, 0); } else { map.repeat.set(1, ia / ta); map.offset.set(0, (1 - ia / ta) / 2); }
      map.needsUpdate = true;
    } else {
      const [cv, cx] = makeCanvas(400, 712);
      cx.fillStyle = HEX.ink; cx.fillRect(0, 0, 400, 712);
      cx.strokeStyle = HEX.yellow; cx.lineWidth = 6; cx.strokeRect(20, 20, 360, 672);
      cx.fillStyle = HEX.yellow;
      fitFont(cx, (proj.title || '').toUpperCase(), 320, { weight: 900, size: 80 });
      cx.fillText((proj.title || '').toUpperCase(), 40, 660);
      map = toTexture(cv);
    }
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(FW, FH), new THREE.MeshBasicMaterial({ map, side: THREE.DoubleSide }));
    holder.add(screen);

    // Title card under each frame
    const [tv, tx] = makeCanvas(600, 150);
    tx.fillStyle = HEX.yellow;
    setFont(tx, { weight: 700, size: 26, family: 'Satoshi' });
    tx.fillText(String((k % list.length) + 1).padStart(2, '0'), 4, 34);
    tx.fillStyle = HEX.paper;
    const title = (proj.title || '').toUpperCase();
    fitFont(tx, title, 590, { weight: 900, size: 64 });
    tx.fillText(title, 0, 112);
    const label = new THREE.Mesh(new THREE.PlaneGeometry(FW, FW / 4), new THREE.MeshBasicMaterial({ map: toTexture(tv), transparent: true }));
    label.position.set(0, -FH / 2 - 0.5, 0);
    holder.add(label);

    holder.userData = { proj, border, hover: 0 };
    screen.userData.frame = holder;
    if (proj.videoId) hitTargets.push({ mesh: screen, chapter: 2 });
    carousel.add(holder);
    frames.push(holder);
  }

  // Film-strip rings above and below the reel.
  const [pv, px] = makeCanvas(2048, 64);
  px.fillStyle = HEX.ink; px.fillRect(0, 0, 2048, 64);
  px.fillStyle = HEX.paper;
  for (let x = 8; x < 2048; x += 32) px.fillRect(x, 20, 16, 24);
  const perfTex = toTexture(pv);
  perfTex.wrapS = THREE.RepeatWrapping;
  perfTex.repeat.set(Math.round(R * 1.5), 1);
  [FH / 2 + 0.45, -FH / 2 - 1.15].forEach((y) => {
    const ring = new THREE.Mesh(
      new THREE.CylinderGeometry(R + 0.05, R + 0.05, 0.38, 128, 1, true),
      new THREE.MeshBasicMaterial({ map: perfTex, side: THREE.DoubleSide }),
    );
    ring.position.y = y;
    carousel.add(ring);
  });

  let spin = 0;
  return {
    group,
    layout(narrow) {
      carousel.scale.setScalar(narrow ? 0.72 : 0.88);
      carousel.position.set(narrow ? 0 : 1.6, narrow ? -0.9 : -1.35, -R + (narrow ? 4 : 2));
    },
    update({ local, near, time, t }) {
      const arrive = easeOutCubic(smooth(1.2, 2, t));
      spin = lerp(spin, local * Math.PI * 2 * 0.9 + time * 0.04, 0.08);
      carousel.rotation.y = -spin + (1 - arrive) * 2.2;
      carousel.rotation.x = pointerSmooth.y * 0.06;
      carousel.rotation.z = pointerSmooth.x * -0.03;
      carousel.scale.y = carousel.scale.x * (0.6 + 0.4 * arrive);
      frames.forEach((f) => {
        const isHover = hovered && hovered.userData.frame === f;
        f.userData.hover = lerp(f.userData.hover, isHover ? 1 : 0, 0.15);
        const h = f.userData.hover;
        f.scale.setScalar(1 + h * 0.08);
        f.userData.border.scale.setScalar(0.94 + h * 0.08);
      });
      group.visible = near > 0;
    },
  };
}

/* -------------------------------------------- 3 · PROCESS: edit timeline */
function buildProcess() {
  const group = anchor(3);
  const rig = new THREE.Group();
  group.add(rig);
  const names = [cfg.pa, cfg.pb, cfg.pc, cfg.pd];
  const TRACK_W = 14;
  const track = new THREE.Mesh(new RoundedBoxGeometry(TRACK_W + 0.6, 0.5, 2.4, 4, 0.12), physical(COL.ink));
  track.position.y = -0.25;
  rig.add(track);

  const clipW = TRACK_W / 4 - 0.25;
  const makeLabel = (text, fg, bg) => {
    const [cv, cx] = makeCanvas(512, 128);
    cx.fillStyle = bg; cx.fillRect(0, 0, 512, 128);
    cx.fillStyle = fg;
    fitFont(cx, text.toUpperCase(), 460, { weight: 900, size: 84 });
    cx.fillText(text.toUpperCase(), 26, 100);
    return toTexture(cv);
  };
  const clips = names.map((name, i) => {
    const holder = new THREE.Group();
    const mat = physical(COL.paper.clone());
    const body = new THREE.Mesh(new RoundedBoxGeometry(clipW, 0.8, 1.7, 4, 0.12), mat);
    holder.add(body);
    const off = makeLabel(name || '', HEX.ink, HEX.paper);
    const on = makeLabel(name || '', HEX.yellow, HEX.ink);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(clipW - 0.2, (clipW - 0.2) / 4), new THREE.MeshBasicMaterial({ map: off }));
    face.position.set(0, 0, 0.86);
    holder.add(face);
    holder.position.set(-TRACK_W / 2 + clipW / 2 + 0.125 + i * (clipW + 0.25), 0.4, 0);
    holder.userData = { mat, face, off, on, lift: 0 };
    rig.add(holder);
    return holder;
  });

  // Playhead
  const head = new THREE.Group();
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 3.6, 0.08), new THREE.MeshBasicMaterial({ color: COL.ink }));
  bar.position.y = 1.1;
  head.add(bar);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.5, 3), new THREE.MeshBasicMaterial({ color: COL.ink }));
  cap.rotation.z = Math.PI;
  cap.position.y = 3.05;
  head.add(cap);
  head.position.z = 1.3;
  rig.add(head);

  // Audio track: bars that get loud as the playhead passes.
  const BARS = 72;
  const wave = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 0.3), physical(COL.ink), BARS);
  const dummy = new THREE.Object3D();
  const waveY = -1.5;
  rig.add(wave);

  const steps = $$('.step-card li');
  let current = -1;
  let headX = -TRACK_W / 2;

  return {
    group,
    layout(narrow) {
      rig.scale.setScalar(narrow ? 0.42 : 0.92);
      rig.position.set(0, narrow ? -1.4 : -2.6, 0);
      rig.rotation.x = 0.32;
    },
    update({ local, time, t }) {
      const arrive = easeOutCubic(smooth(2.25, 3, t));
      rig.rotation.y = (1 - arrive) * -0.9 + pointerSmooth.x * 0.08;
      headX = lerp(headX, -TRACK_W / 2 + local * TRACK_W, 0.15);
      head.position.x = headX;
      const active = Math.min(3, Math.floor(local * 4));
      clips.forEach((c, i) => {
        const on = i === active;
        c.userData.lift = lerp(c.userData.lift, on ? 1 : 0, 0.12);
        c.position.y = 0.4 + c.userData.lift * 0.9;
        c.rotation.x = -c.userData.lift * 0.18;
        c.userData.mat.color.lerp(on ? COL.ink : COL.paper, 0.15);
        c.userData.mat.emissive.copy(c.userData.mat.color).multiplyScalar(0.42);
        c.userData.face.material.map = on ? c.userData.on : c.userData.off;
      });
      for (let i = 0; i < BARS; i += 1) {
        const x = -TRACK_W / 2 + (i + 0.5) * (TRACK_W / BARS);
        const near = Math.exp(-Math.pow((x - headX) / 1.4, 2));
        const h = 0.15 + Math.abs(Math.sin(i * 0.7 + time * 3) * Math.cos(i * 0.31)) * (0.3 + near * 1.6);
        dummy.position.set(x, waveY + h / 2 - 0.5, 0.6);
        dummy.scale.set(TRACK_W / BARS * 0.6, h, 1);
        dummy.updateMatrix();
        wave.setMatrixAt(i, dummy.matrix);
      }
      wave.instanceMatrix.needsUpdate = true;
      if (active !== current) {
        current = active;
        steps.forEach((s, i) => s.classList.toggle('is-current', i === active));
      }
    },
  };
}

/* --------------------------------------------- 4 · ABOUT: contact sheet */
function buildAbout(img) {
  const group = anchor(4);
  const rig = new THREE.Group();
  group.add(rig);

  const PW = 6.4;
  const PH = 8;
  const plate = new THREE.Mesh(new RoundedBoxGeometry(PW, PH, 0.2, 4, 0.06), physical(COL.ink));
  rig.add(plate);
  const [pv, px] = makeCanvas(640, 800);
  px.fillStyle = HEX.ink; px.fillRect(0, 0, 640, 800);
  px.fillStyle = HEX.paper;
  for (let x = 18; x < 640; x += 40) { px.fillRect(x, 16, 20, 22); px.fillRect(x, 762, 20, 22); }
  const perf = new THREE.Mesh(new THREE.PlaneGeometry(PW, PH), new THREE.MeshBasicMaterial({ map: toTexture(pv) }));
  perf.position.z = 0.11;
  rig.add(perf);

  // Four prints with different crops; grayscale except the chosen one on hover.
  const crops = [
    { sx: 0.1, sy: 0, sw: 0.8, sh: 1 },
    { sx: 0.3, sy: 0.08, sw: 0.4, sh: 0.5 },
    { sx: 0.2, sy: 0.45, sw: 0.6, sh: 0.55 },
    { sx: 0.05, sy: 0.15, sw: 0.9, sh: 0.85 },
  ];
  const cw = 2.85;
  const ch = 3.4;
  const printTex = (crop, gray) => {
    const [cv, cx] = makeCanvas(456, 544);
    cx.fillStyle = '#222'; cx.fillRect(0, 0, 456, 544);
    if (img) {
      if (gray) cx.filter = 'grayscale(1) contrast(1.1)';
      const W = img.naturalWidth;
      const H = img.naturalHeight;
      // keep the print's aspect inside the crop
      let sw = crop.sw * W;
      let sh = sw * (544 / 456);
      if (sh > crop.sh * H) { sh = crop.sh * H; sw = sh * (456 / 544); }
      cx.drawImage(img, crop.sx * W, crop.sy * H, sw, sh, 0, 0, 456, 544);
    }
    return toTexture(cv);
  };
  const homes = [[-1.5, 1.85], [1.5, 1.85], [-1.5, -1.85], [1.5, -1.85]];
  const prints = crops.map((crop, i) => {
    const gray = printTex(crop, true);
    const color = i === 1 ? printTex(crop, false) : gray;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(cw, ch), new THREE.MeshBasicMaterial({ map: gray, transparent: true }));
    m.userData = {
      gray, color, i,
      home: new THREE.Vector3(homes[i][0], homes[i][1], 0.14 + i * 0.002),
      from: new THREE.Vector3((Math.random() - 0.5) * 16, 8 + Math.random() * 6, 4 + Math.random() * 4),
      spin: (Math.random() - 0.5) * 3,
    };
    m.userData.print = m;
    hitTargets.push({ mesh: m, chapter: 4 });
    rig.add(m);
    return m;
  });

  // Yellow grease-pencil circle around frame 15A, drawn on arrival.
  const pts = [];
  for (let i = 0; i <= 120; i += 1) {
    const a = (i / 120) * Math.PI * 2.15 - 0.6;
    const wob = 1 + Math.sin(a * 3) * 0.03;
    pts.push(new THREE.Vector3(Math.cos(a) * 1.7 * wob, Math.sin(a) * 2.05 * wob, 0));
  }
  const tube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 240, 0.06, 8, false);
  const circle = new THREE.Mesh(tube, new THREE.MeshBasicMaterial({ color: COL.yellow }));
  circle.position.set(homes[1][0], homes[1][1], 0.3);
  rig.add(circle);
  const totalIdx = tube.index.count;

  let counted = false;
  return {
    group,
    layout(narrow) {
      rig.scale.setScalar(narrow ? 0.5 : 0.95);
      rig.position.set(narrow ? 0 : -4.6, narrow ? 3.1 : -0.2, 0);
    },
    update({ t, time, near }) {
      const arrive = smooth(3.2, 3.95, t);
      rig.rotation.set(pointerSmooth.y * 0.08, pointerSmooth.x * 0.14 + (1 - arrive) * 0.5, -0.04);
      prints.forEach((p) => {
        const { home, from, spin, i } = p.userData;
        const k = easeOutCubic(smooth(0.1 + i * 0.12, 0.7 + i * 0.08, arrive));
        p.position.lerpVectors(from, home, k);
        p.rotation.z = (1 - k) * spin;
        p.rotation.x = (1 - k) * -1.2;
        const isHover = hovered && hovered.userData.print === p;
        const anyHover = hovered && hovered.userData.print;
        p.material.map = isHover || (anyHover && i === 1) ? p.userData.color : p.userData.gray;
        p.material.opacity = lerp(p.material.opacity, anyHover && i !== 1 && !isHover ? 0.45 : 1, 0.15);
      });
      const draw = smooth(0.75, 1, arrive);
      tube.setDrawRange(0, Math.floor(totalIdx * draw / 3) * 3);
      circle.rotation.z = Math.sin(time * 0.8) * 0.02;
      if (!counted && near > 0.8) { counted = true; countStats(); }
    },
  };
}

/* ------------------------------------------- 5 · CONTACT: clapperboard */
function buildContact() {
  const group = anchor(5);
  const rig = new THREE.Group();
  group.add(rig);

  const SW = 6.2;
  const SH = 4.6;
  const body = new THREE.Mesh(new RoundedBoxGeometry(SW, SH, 0.36, 4, 0.08), physical(COL.paper));
  rig.add(body);

  const [cv, cx] = makeCanvas(1240, 920);
  cx.fillStyle = HEX.paper; cx.fillRect(0, 0, 1240, 920);
  cx.strokeStyle = HEX.ink; cx.lineWidth = 6;
  cx.strokeRect(40, 40, 1160, 840);
  cx.beginPath(); cx.moveTo(40, 560); cx.lineTo(1200, 560); cx.moveTo(620, 560); cx.lineTo(620, 880); cx.stroke();
  cx.fillStyle = HEX.ink;
  fitFont(cx, cfg.brand.toUpperCase(), 1080, { weight: 900, size: 420, stretch: 'normal' });
  cx.fillText(cfg.brand.toUpperCase(), 80, 470);
  setFont(cx, { weight: 700, size: 34, family: 'Satoshi' });
  cx.fillText('SCENE', 80, 630);
  cx.fillText('TAKE', 660, 630);
  setFont(cx, { weight: 900, size: 170 });
  cx.fillText('01', 80, 820);
  cx.fillStyle = HEX.ink;
  cx.fillText('01', 660, 820);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(SW - 0.1, SH - 0.1), new THREE.MeshBasicMaterial({ map: toTexture(cv) }));
  face.position.z = 0.19;
  rig.add(face);

  const [sv, sx] = makeCanvas(1240, 140);
  sx.fillStyle = HEX.paper; sx.fillRect(0, 0, 1240, 140);
  sx.fillStyle = HEX.ink;
  for (let x = -140; x < 1300; x += 140) {
    sx.beginPath(); sx.moveTo(x, 140); sx.lineTo(x + 70, 140); sx.lineTo(x + 140, 0); sx.lineTo(x + 70, 0); sx.closePath(); sx.fill();
  }
  const stripes = toTexture(sv);
  const stickGeo = new RoundedBoxGeometry(SW, 0.7, 0.36, 3, 0.06);
  const stickMats = [physical(COL.ink), physical(COL.ink), physical(COL.ink), physical(COL.ink), new THREE.MeshBasicMaterial({ map: stripes }), physical(COL.ink)];
  const base = new THREE.Mesh(stickGeo, stickMats);
  base.position.y = SH / 2 + 0.35;
  rig.add(base);

  const hinge = new THREE.Group();
  hinge.position.set(-SW / 2, SH / 2 + 0.7, 0);
  rig.add(hinge);
  const top = new THREE.Mesh(stickGeo, stickMats);
  top.position.set(SW / 2, 0.35, 0);
  hinge.add(top);

  [body, face, top, base].forEach((m) => { m.userData.clapper = true; hitTargets.push({ mesh: m, chapter: 5 }); });

  // Confetti of yellow paper when it claps.
  const BITS = 90;
  const bits = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.16, 0.24), new THREE.MeshBasicMaterial({ color: COL.yellow, side: THREE.DoubleSide }), BITS);
  bits.count = 0;
  rig.add(bits);
  const parts = [];
  const dummy = new THREE.Object3D();

  let angle = 0.55;
  let clapT = -1;
  let clapped = false;
  const clap = () => {
    clapT = 0;
    parts.length = 0;
    if (reduceMotion) return;
    for (let i = 0; i < BITS; i += 1) {
      parts.push({
        p: new THREE.Vector3(-SW / 2 + Math.random() * SW, SH / 2 + 0.7, 0.3),
        v: new THREE.Vector3((Math.random() - 0.5) * 6, 3 + Math.random() * 6, 2 + Math.random() * 4),
        r: new THREE.Vector3(Math.random() * 6, Math.random() * 6, 0),
        w: (Math.random() - 0.5) * 12,
      });
    }
  };

  return {
    group,
    clap,
    layout(narrow) {
      rig.scale.setScalar(narrow ? 0.5 : 0.82);
      rig.position.set(narrow ? 0 : 4.6, narrow ? 2.6 : -1.4, 0);
    },
    update({ t, dt }) {
      const arrive = easeOutCubic(smooth(4.2, 4.95, t));
      rig.rotation.set(-0.12 + pointerSmooth.y * 0.1, -0.35 + pointerSmooth.x * 0.25 + (1 - arrive) * -1.4, 0.04);
      rig.position.y += 0;
      if (!clapped && t > 4.85) { clapped = true; clap(); }
      if (t < 4.3) clapped = false;
      if (clapT >= 0) {
        clapT += dt;
        // snap shut, then spring back open
        angle = clapT < 0.12 ? lerp(0.55, 0, clapT / 0.12) : lerp(0, 0.38, easeOutBack(clamp((clapT - 0.25) / 0.6, 0, 1)));
        if (clapT > 1) clapT = -1;
      } else {
        angle = lerp(angle, 0.38 + Math.sin(performance.now() / 900) * 0.03, 0.05);
      }
      hinge.rotation.z = angle;
      bits.count = parts.length;
      parts.forEach((pt, i) => {
        pt.v.y -= 9.8 * dt;
        pt.v.multiplyScalar(0.985);
        pt.p.addScaledVector(pt.v, dt);
        pt.r.x += pt.w * dt;
        pt.r.y += pt.w * 0.7 * dt;
        dummy.position.copy(pt.p);
        dummy.rotation.set(pt.r.x, pt.r.y, 0);
        dummy.updateMatrix();
        bits.setMatrixAt(i, dummy.matrix);
      });
      bits.instanceMatrix.needsUpdate = true;
      if (parts.length && parts[0].p.y < -14) parts.length = 0;
    },
  };
}

/* ------------------------------------------------------------ stats */
function countStats() {
  $$('[data-count]').forEach((el) => {
    const final = el.dataset.final || el.textContent.trim();
    el.dataset.final = final;
    const m = final.match(/^(\D*)(\d+)(.*)$/s);
    if (!m || reduceMotion) return;
    const [, pre, digits, suf] = m;
    const target = parseInt(digits, 10);
    const start = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - start) / 1600);
      const v = k === 1 ? target : Math.round(target * (1 - Math.pow(2, -10 * k)));
      el.textContent = `${pre}${String(v).padStart(digits.length, '0')}${suf}`;
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

/* ===================================================================== */
/*                         SCROLL · CAMERA · LOOP                         */
/* ===================================================================== */
const lenis = !reduceMotion && typeof window.Lenis === 'function' ? new window.Lenis({ lerp: 0.075, smoothWheel: true }) : null;
const maxScroll = () => Math.max(1, document.documentElement.scrollHeight - innerHeight);
const scrollToChapter = (i) => {
  const y = (i / (CHAPTERS - 1)) * maxScroll();
  if (lenis) lenis.scrollTo(y, { duration: 1.8 });
  else window.scrollTo({ top: y, behavior: reduceMotion ? 'auto' : 'smooth' });
};
$$('[data-goto]').forEach((b) => b.addEventListener('click', () => scrollToChapter(Number(b.dataset.goto))));

const sections = $$('.chapter');
const navButtons = $$('[data-goto]');
const progressBar = $('.progress');
let narrow = innerWidth / innerHeight < 0.85 || innerWidth < 700;
let camDist = narrow ? 25 : 16;

let travel;
let built = [];
let started = false;
let lastY = window.scrollY;
let velocity = 0;
let tSmooth = 0;
const clock = new THREE.Clock();
const lookTarget = new THREE.Vector3();

const applyLayout = () => {
  narrow = innerWidth / innerHeight < 0.85 || innerWidth < 700;
  camDist = narrow ? 25 : 16;
  scene.fog.near = camDist + 6;
  scene.fog.far = camDist + 50;
  built.forEach((c) => c.layout && c.layout(narrow));
};

const resize = () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
  fx.uniforms.uRes.value.set(innerWidth, innerHeight);
  applyLayout();
};
window.addEventListener('resize', resize);

window.addEventListener('pointermove', (e) => {
  pointer.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
}, { passive: true });

// Hover + click on 3D objects
const pick = (t) => {
  const ch = Math.round(t);
  if (Math.abs(t - ch) > 0.3) return null;
  raycaster.setFromCamera(pointer, camera);
  const meshes = hitTargets.filter((h) => h.chapter === ch).map((h) => h.mesh);
  const hit = raycaster.intersectObjects(meshes, false)[0];
  return hit ? hit.object : null;
};

const modal = $('.modal');
const modalScreen = $('.modal__screen');
const openVideo = (proj) => {
  if (!proj || !proj.embed) return;
  modalScreen.innerHTML = '';
  const f = document.createElement('iframe');
  f.src = `${proj.embed}&autoplay=1`;
  f.title = proj.title;
  f.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
  f.allowFullscreen = true;
  modalScreen.appendChild(f);
  $('.modal__title').textContent = (proj.title || '').toUpperCase();
  modal.hidden = false;
  if (lenis) lenis.stop();
  $('.modal__close').focus();
};
const closeVideo = () => {
  modal.hidden = true;
  modalScreen.innerHTML = '';
  if (lenis) lenis.start();
};
$('.modal__close').addEventListener('click', closeVideo);
modal.addEventListener('click', (e) => { if (e.target === modal) closeVideo(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.hidden) closeVideo(); });

renderer.domElement.style.pointerEvents = 'auto';
window.addEventListener('click', (e) => {
  if (e.target.closest('a, button, .modal')) return;
  pointer.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  const obj = pick(tSmooth);
  if (!obj) return;
  if (obj.userData.frame) openVideo(obj.userData.frame.userData.proj);
  else if (obj.userData.clapper) built[5].clap();
});

// Page transitions back to the 2D site
const wipe = $('.page-wipe');
$$('[data-transition]').forEach((link) => {
  link.addEventListener('click', (e) => {
    if (reduceMotion || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    wipe.classList.add('is-active');
    setTimeout(() => { window.location.href = link.href; }, 850);
  });
});
window.addEventListener('pageshow', () => wipe.classList.toggle('is-active', false));

function cameraRail(t) {
  const i = Math.min(Math.floor(t), CHAPTERS - 2);
  const f = t - i;
  const m = smooth(0.3, 0.7, f); // dwell at each chapter, glide between
  const arc = Math.sin(m * Math.PI);
  const dir = i % 2 ? -1 : 1;
  return {
    x: arc * 7 * dir,
    y: arc * 2.4,
    z: -(i + m) * SPACING,
    roll: arc * 0.12 * dir,
    i,
    m,
  };
}

function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const time = clock.elapsedTime;
  if (lenis) lenis.raf(time * 1000);

  const y = window.scrollY;
  velocity = lerp(velocity, y - lastY, 0.1);
  lastY = y;
  const p = clamp(y / maxScroll(), 0, 1);
  const tTarget = p * (CHAPTERS - 1);
  tSmooth = lerp(tSmooth, tTarget, 0.12);
  const t = tSmooth;

  pointerSmooth.lerp(pointer, 0.06);

  // Camera
  const rail = cameraRail(t);
  camera.position.set(rail.x + pointerSmooth.x * 0.7, rail.y + pointerSmooth.y * 0.45, rail.z + camDist);
  lookTarget.set(rail.x * 0.35, rail.y * 0.3, rail.z);
  camera.lookAt(lookTarget);
  camera.rotateZ(rail.roll);

  // Background & fog crossfade between chapter colours
  const bg = BG[rail.i].clone().lerp(BG[rail.i + 1], rail.m);
  scene.background.copy(bg);
  scene.fog.color.copy(bg);
  const themeIdx = Math.round(t);
  document.body.classList.toggle('theme-is-dark', THEME[themeIdx] === 'dark');
  document.body.classList.toggle('theme-is-yellow', THEME[themeIdx] === 'yellow');

  // Overlay chapters
  sections.forEach((s, i) => {
    const near = 1 - smooth(0.14, 0.42, Math.abs(t - i));
    s.style.setProperty('--o', near.toFixed(3));
    s.classList.toggle('is-visible', near > 0.001);
    s.classList.toggle('is-active', near > 0.6);
  });
  navButtons.forEach((b, i) => b.classList.toggle('is-active', i === themeIdx));
  progressBar.style.setProperty('--p', p.toFixed(4));

  // Hover
  if (!isTouch && started) {
    const obj = pick(t);
    hovered = obj;
    renderer.domElement.classList.toggle('is-hover', Boolean(obj && (obj.userData.frame || obj.userData.clapper)));
    document.body.style.cursor = obj && (obj.userData.frame || obj.userData.clapper) ? 'pointer' : '';
  }

  // Scenes
  built.forEach((c, i) => {
    const near = 1 - smooth(0.5, 1.25, Math.abs(t - i));
    const local = clamp((t - (i - 0.3)) / 0.6, 0, 1);
    c.group.visible = near > 0;
    if (c.group.visible) c.update({ t, local, near, time, dt });
  });
  travel(time);

  fx.uniforms.uShift.value = reduceMotion ? 0 : lerp(fx.uniforms.uShift.value, clamp(Math.abs(velocity) / 18, 0, 3), 0.1);
  fx.uniforms.uTime.value = time;
  composer.render();
  requestAnimationFrame(frame);
}

/* ------------------------------------------------------------ boot */
async function boot() {
  if (lenis) lenis.stop();
  const fontsP = loadFonts();
  const portraitP = loadImage(cfg.portrait);
  const thumbsP = Promise.all(projects.map((pr) => (pr.videoId ? loadImage(`https://i.ytimg.com/vi/${pr.videoId}/hqdefault.jpg`) : Promise.resolve(null))));
  const [, portrait, thumbs] = await Promise.all([fontsP, portraitP, thumbsP]);

  $$('[data-count]').forEach((el) => { el.dataset.final = el.textContent.trim(); if (!reduceMotion) el.textContent = el.dataset.final.replace(/\d/g, '0'); });

  travel = buildTravelFrames();
  built = [buildHero(portrait), buildServices(), buildWork(thumbs), buildProcess(), buildAbout(portrait), buildContact()];
  resize();
  renderer.compile(scene, camera);
  requestAnimationFrame(frame);

  // Out of the loader and into the scene.
  const loader = $('.loader');
  setTimeout(() => {
    loader.classList.add('is-done');
    setTimeout(() => {
      started = true;
      document.body.classList.add('is-started');
      built[0].start();
      if (lenis) lenis.start();
    }, 420);
    setTimeout(() => loader.classList.add('is-gone'), 1100);
  }, reduceMotion ? 0 : 350);
}

boot();
