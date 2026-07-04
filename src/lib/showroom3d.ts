import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { ExhibitKind } from '../types';

// ---------------------------------------------------------------------------
// Reusable showroom engine: dark floor, key spotlight, environment reflections,
// slow auto-rotation. Each exhibit is a builder returning update(progress,dt,t).
// Adding a new exhibit = add an entry to EXHIBITS below.
// ---------------------------------------------------------------------------

interface BuildResult {
  update: (progress: number, dt: number, t: number) => void;
}

interface KindMeta {
  rotate: boolean;
  cameraPos: [number, number, number];
  cameraLook: [number, number, number];
  build: (scene: THREE.Scene, stage: THREE.Group) => BuildResult;
}

export interface ShowroomHandle {
  setProgress: (p: number) => void;
  dispose: () => void;
}

const mat = (color: number, opts: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.6, ...opts });

const box = (w: number, h: number, d: number, m: THREE.Material) =>
  new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);

// Cylinder segment between two points — used for frames, forks, exhausts.
function tube(from: [number, number, number], to: [number, number, number], r: number, m: THREE.Material): THREE.Mesh {
  const a = new THREE.Vector3(...from);
  const b = new THREE.Vector3(...to);
  const dir = b.clone().sub(a);
  const len = dir.length();
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 10), m);
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  return mesh;
}

// --- PANAMERA: extruded fastback silhouette in fog; headlights at 90% -------
function buildPanamera(scene: THREE.Scene, stage: THREE.Group): BuildResult {
  const fog = new THREE.FogExp2(0x0a0a0d, 0.18);
  scene.fog = fog;

  const paint = mat(0x2a2b33, { metalness: 0.9, roughness: 0.28 });
  const glassM = mat(0x0a0e12, { metalness: 0.0, roughness: 0.08 });
  const tyreM = mat(0x0a0a0c, { metalness: 0.1, roughness: 0.9 });
  const rimM = mat(0x9a9aa2, { metalness: 0.95, roughness: 0.25 });

  // Side profile (x = length, y = height), extruded across z = width.
  const body = new THREE.Shape();
  body.moveTo(1.52, 0.3);                     // front bumper, low
  body.lineTo(1.31, 0.2);                     // under-nose
  body.absarc(0.97, 0.2, 0.34, 0, Math.PI, false);   // front wheel arch
  body.lineTo(-0.63, 0.2);                    // rocker panel
  body.absarc(-0.97, 0.2, 0.34, 0, Math.PI, false);  // rear wheel arch
  body.lineTo(-1.46, 0.28);                   // rear valance
  body.lineTo(-1.52, 0.6);                    // rear face
  body.lineTo(-1.47, 0.75);                   // decklid edge
  body.quadraticCurveTo(-0.6, 0.85, 0.5, 0.78);      // beltline sweep
  body.lineTo(1.34, 0.66);                    // hood line
  body.quadraticCurveTo(1.55, 0.6, 1.52, 0.3);       // nose drop
  const bodyGeo = new THREE.ExtrudeGeometry(body, {
    depth: 1.0, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.045, bevelSegments: 3, curveSegments: 24,
  });
  bodyGeo.translate(0, 0, -0.5);
  stage.add(new THREE.Mesh(bodyGeo, paint));

  // Greenhouse: the Panamera fastback roofline, narrower and darker.
  const roof = new THREE.Shape();
  roof.moveTo(-1.42, 0.74);
  roof.quadraticCurveTo(-1.15, 1.0, -0.55, 1.05);    // long sloping rear glass
  roof.lineTo(-0.05, 1.05);
  roof.quadraticCurveTo(0.28, 1.02, 0.52, 0.77);     // raked windshield
  roof.lineTo(-1.42, 0.74);
  const roofGeo = new THREE.ExtrudeGeometry(roof, {
    depth: 0.84, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2, curveSegments: 20,
  });
  roofGeo.translate(0, 0, -0.42);
  stage.add(new THREE.Mesh(roofGeo, glassM));

  // Wheels: tyre + rim + hub
  for (const [x, z] of [[0.97, 0.52], [0.97, -0.52], [-0.97, 0.52], [-0.97, -0.52]] as const) {
    const tyre = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.22, 24), tyreM);
    tyre.rotation.x = Math.PI / 2;
    tyre.position.set(x, 0.3, z);
    stage.add(tyre);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.23, 12), rimM);
    rim.rotation.x = Math.PI / 2;
    rim.position.set(x, 0.3, z);
    stage.add(rim);
  }

  // Mirrors
  const mirL = box(0.09, 0.05, 0.09, paint); mirL.position.set(0.48, 0.82, 0.58); stage.add(mirL);
  const mirR = mirL.clone(); mirR.position.z = -0.58; stage.add(mirR);

  // Headlights + beams (ignite at 90%)
  const headMat = new THREE.MeshStandardMaterial({ color: 0xfff6d8, emissive: 0xfff2c0, emissiveIntensity: 0.08 });
  const hlL = box(0.06, 0.08, 0.2, headMat); hlL.position.set(1.5, 0.5, 0.33); stage.add(hlL);
  const hlR = hlL.clone(); hlR.position.z = -0.33; stage.add(hlR);
  const beamL = new THREE.SpotLight(0xfff2c0, 0, 9, 0.45, 0.6);
  beamL.position.set(1.55, 0.5, 0.33);
  beamL.target.position.set(7, 0.1, 0.6);
  stage.add(beamL, beamL.target);
  const beamR = new THREE.SpotLight(0xfff2c0, 0, 9, 0.45, 0.6);
  beamR.position.set(1.55, 0.5, -0.33);
  beamR.target.position.set(7, 0.1, -0.6);
  stage.add(beamR, beamR.target);

  // Signature full-width tail light bar
  const tailMat = new THREE.MeshStandardMaterial({ color: 0x550808, emissive: 0xff1a1a, emissiveIntensity: 0.15 });
  const tail = box(0.03, 0.05, 0.92, tailMat); tail.position.set(-1.53, 0.66, 0); stage.add(tail);

  return {
    update(progress) {
      const p = Math.min(progress, 1);
      fog.density = 0.015 + (1 - p) * 0.15;
      const on = p >= 0.9;
      headMat.emissiveIntensity = on ? 2.4 : 0.08;
      tailMat.emissiveIntensity = on ? 1.6 : 0.15;
      beamL.intensity = on ? 24 : 0;
      beamR.intensity = on ? 24 : 0;
    },
  };
}

// --- MOTORCYCLE: naked bike under a cover that lifts off — wheels first ----
function buildMotorcycle(_scene: THREE.Scene, stage: THREE.Group): BuildResult {
  const chrome = mat(0xb8b8c0, { metalness: 0.95, roughness: 0.18 });
  const steel = mat(0x3a3a42, { metalness: 0.85, roughness: 0.35 });
  const tyreM = mat(0x0a0a0c, { metalness: 0.1, roughness: 0.9 });
  const paintR = mat(0x7a1015, { metalness: 0.85, roughness: 0.25 });
  const darkM = mat(0x101014, { metalness: 0.3, roughness: 0.7 });

  // Wheels: tyre, spokes, brake disc
  for (const x of [0.66, -0.64]) {
    const tyre = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.08, 12, 28), tyreM);
    tyre.position.set(x, 0.34, 0);
    stage.add(tyre);
    for (let i = 0; i < 3; i++) {
      const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.6, 6), chrome);
      spoke.position.set(x, 0.34, 0);
      spoke.rotation.z = (i / 3) * Math.PI;
      stage.add(spoke);
    }
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.02, 20), chrome);
    disc.rotation.x = Math.PI / 2;
    disc.position.set(x, 0.34, 0.05);
    stage.add(disc);
  }

  // Frame
  stage.add(tube([0.48, 0.96, 0], [-0.2, 0.62, 0], 0.035, steel));       // main spar
  stage.add(tube([0.44, 0.9, 0], [0.1, 0.42, 0], 0.03, steel));          // downtube
  stage.add(tube([-0.2, 0.62, 0], [-0.45, 0.76, 0], 0.03, steel));       // seat rail
  stage.add(tube([-0.1, 0.44, 0.06], [-0.64, 0.34, 0.06], 0.025, steel)); // swingarm
  stage.add(tube([-0.1, 0.44, -0.06], [-0.64, 0.34, -0.06], 0.025, steel));

  // Engine block + cases
  const engine = box(0.5, 0.32, 0.3, steel); engine.position.set(0.02, 0.45, 0); stage.add(engine);
  const cases = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.34, 14), chrome);
  cases.rotation.x = Math.PI / 2;
  cases.position.set(-0.12, 0.4, 0);
  stage.add(cases);

  // Exhaust: header pipe sweeping back into a muffler
  stage.add(tube([0.22, 0.32, 0.1], [-0.52, 0.36, 0.13], 0.04, chrome));
  const muffler = tube([-0.5, 0.36, 0.13], [-0.88, 0.44, 0.13], 0.07, chrome);
  stage.add(muffler);

  // Front end: forks, handlebar, headlight, fender
  stage.add(tube([0.62, 0.34, 0.06], [0.46, 1.0, 0.05], 0.026, chrome));
  stage.add(tube([0.7, 0.34, -0.06], [0.5, 1.0, -0.05], 0.026, chrome));
  stage.add(tube([0.46, 1.02, -0.3], [0.46, 1.02, 0.3], 0.022, chrome)); // bars
  const gripL = tube([0.46, 1.02, 0.3], [0.46, 1.02, 0.38], 0.03, darkM); stage.add(gripL);
  const gripR = tube([0.46, 1.02, -0.3], [0.46, 1.02, -0.38], 0.03, darkM); stage.add(gripR);
  const headlight = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 14, 10),
    new THREE.MeshStandardMaterial({ color: 0xfff3cc, emissive: 0xffe9a8, emissiveIntensity: 0.5 })
  );
  headlight.position.set(0.58, 0.96, 0);
  stage.add(headlight);
  const fFender = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.035, 8, 16, Math.PI * 0.7), paintR);
  fFender.position.set(0.66, 0.34, 0);
  fFender.rotation.z = Math.PI * 0.15;
  stage.add(fFender);

  // Tank, seat, tail
  const tank = new THREE.Mesh(new THREE.SphereGeometry(0.24, 18, 14), paintR);
  tank.scale.set(1.5, 0.75, 0.9);
  tank.position.set(0.1, 0.82, 0);
  stage.add(tank);
  const seat = box(0.5, 0.08, 0.26, darkM); seat.position.set(-0.36, 0.75, 0); seat.rotation.z = 0.08; stage.add(seat);
  const tailUnit = box(0.28, 0.1, 0.2, paintR); tailUnit.position.set(-0.66, 0.82, 0); tailUnit.rotation.z = 0.18; stage.add(tailUnit);

  // Cover: draped dome that lifts up and away — wheels appear first, tank last.
  const tarp = new THREE.Mesh(
    new THREE.SphereGeometry(1, 22, 14),
    mat(0x1c1c22, { metalness: 0.05, roughness: 1 })
  );
  tarp.scale.set(1.12, 0.82, 0.52);
  tarp.position.set(0, 0.42, 0);
  stage.add(tarp);

  return {
    update(progress) {
      const p = Math.min(progress, 1);
      tarp.visible = p < 0.999;
      tarp.position.y = 0.42 + p * 2.1;
      tarp.position.x = -p * 0.55;
      tarp.rotation.z = p * 0.5;
    },
  };
}

// --- QUIT MY JOB: exit door at the end of a dark hallway --------------------
function buildExitDoor(_scene: THREE.Scene, stage: THREE.Group): BuildResult {
  const wallM = mat(0x0e0e12, { metalness: 0.1, roughness: 0.95 });
  const floorM = mat(0x111116, { metalness: 0.4, roughness: 0.55 });

  const floor = box(2.4, 0.05, 10, floorM); floor.position.set(0, 0, -2); stage.add(floor);
  const ceil = box(2.4, 0.05, 10, wallM); ceil.position.set(0, 2.5, -2); stage.add(ceil);
  const wallL = box(0.08, 2.5, 10, wallM); wallL.position.set(-1.2, 1.25, -2); stage.add(wallL);
  const wallR = wallL.clone(); wallR.position.x = 1.2; stage.add(wallR);

  for (const z of [-1, -3, -5]) {
    const strip = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.02, 0.12),
      new THREE.MeshStandardMaterial({ color: 0x333333, emissive: 0x8a8a70, emissiveIntensity: 0.5 })
    );
    strip.position.set(0, 2.46, z);
    stage.add(strip);
  }

  const frameM = mat(0x22222a, { metalness: 0.7, roughness: 0.4 });
  const header = box(1.2, 0.12, 0.14, frameM); header.position.set(0, 2.06, -6.5); stage.add(header);
  const jambL = box(0.12, 2.1, 0.14, frameM); jambL.position.set(-0.56, 1.0, -6.5); stage.add(jambL);
  const jambR = jambL.clone(); jambR.position.x = 0.56; stage.add(jambR);

  const hinge = new THREE.Group();
  hinge.position.set(-0.5, 0, -6.5);
  const door = box(1.0, 2.0, 0.07, mat(0x16161c, { metalness: 0.6, roughness: 0.5 }));
  door.position.set(0.5, 1.0, 0);
  hinge.add(door);
  stage.add(hinge);

  const exitSign = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.14, 0.05),
    new THREE.MeshStandardMaterial({ color: 0x00ff87, emissive: 0x00ff87, emissiveIntensity: 1.6 })
  );
  exitSign.position.set(0, 2.25, -6.42);
  stage.add(exitSign);

  const flood = new THREE.PointLight(0xfff4d6, 0, 14, 1.6);
  flood.position.set(0, 1.3, -7.4);
  stage.add(flood);
  const glowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(2.6, 3),
    new THREE.MeshBasicMaterial({ color: 0xfff6dc, transparent: true, opacity: 0 })
  );
  glowPlane.position.set(0, 1.3, -7.8);
  stage.add(glowPlane);

  const tag = box(0.24, 0.16, 0.02, new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.4 }));
  tag.position.set(-1.13, 1.35, -5.4);
  tag.rotation.y = Math.PI / 2;
  stage.add(tag);
  let tagVy = 0;
  let fell = false;

  return {
    update(progress, dt) {
      const p = Math.min(progress, 1);
      hinge.rotation.y = -p * (p >= 1 ? 1.9 : 1.1);
      flood.intensity = p * 3 + (p >= 1 ? 9 : 0);
      glowPlane.material.opacity = p >= 1 ? 0.55 : p * 0.18;
      if (p >= 1 && !fell) {
        tagVy -= 4.5 * dt;
        tag.position.y += tagVy * dt;
        tag.rotation.z += 2.2 * dt;
        if (tag.position.y <= 0.1) {
          tag.position.y = 0.1;
          tag.rotation.z = 1.35;
          fell = true;
        }
      }
    },
  };
}

const EXHIBITS: Record<ExhibitKind, KindMeta> = {
  panamera: {
    rotate: true,
    cameraPos: [3.7, 1.6, 4.0],
    cameraLook: [0, 0.55, 0],
    build: buildPanamera,
  },
  motorcycle: {
    rotate: true,
    cameraPos: [2.5, 1.35, 2.9],
    cameraLook: [0.05, 0.6, 0],
    build: buildMotorcycle,
  },
  exitdoor: {
    rotate: false,
    cameraPos: [0, 1.45, 2.6],
    cameraLook: [0, 1.2, -6.5],
    build: buildExitDoor,
  },
};

export function createShowroom(container: HTMLElement, kind: ExhibitKind): ShowroomHandle {
  const meta = EXHIBITS[kind];
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050506);

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 60);
  camera.position.set(...meta.cameraPos);
  camera.lookAt(...meta.cameraLook);

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  container.appendChild(renderer.domElement);
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  renderer.domElement.style.display = 'block';

  // Environment reflections — without this, metallic paint renders black.
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;
  scene.environmentIntensity = 0.45;
  pmrem.dispose();

  const resize = () => {
    const w = container.clientWidth, h = container.clientHeight;
    if (w === 0 || h === 0) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(container);

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(7, 48),
    new THREE.MeshStandardMaterial({ color: 0x0d0d10, metalness: 0.5, roughness: 0.4 })
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  const key = new THREE.SpotLight(0xfff3d6, 110, 30, 0.6, 0.65);
  key.position.set(0, 7, 2);
  key.target.position.set(0, 0.4, 0);
  scene.add(key, key.target);
  scene.add(new THREE.AmbientLight(0xffffff, 0.35));
  const fill = new THREE.SpotLight(0xaaccff, 30, 25, 0.8, 1);
  fill.position.set(4.5, 3, 4.5);
  fill.target.position.set(0, 0.5, 0);
  scene.add(fill, fill.target);
  const rim = new THREE.PointLight(0xd4af37, 9, 14);
  rim.position.set(-4, 1.5, -3);
  scene.add(rim);

  const stage = new THREE.Group();
  scene.add(stage);
  const exhibit = meta.build(scene, stage);

  let targetProgress = 0;
  let shown = 0;
  let raf = 0;
  let last = performance.now();
  let disposed = false;

  const loop = (now: number) => {
    if (disposed) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    shown += (targetProgress - shown) * Math.min(1, dt * 2.5);
    if (Math.abs(targetProgress - shown) < 0.002) shown = targetProgress;
    if (meta.rotate) stage.rotation.y += dt * 0.18;
    exhibit.update(shown, dt, now / 1000);
    renderer.render(scene, camera);
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);

  return {
    setProgress(p) { targetProgress = Math.max(0, p); },
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      scene.traverse(obj => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const m = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(m)) m.forEach(x => x.dispose());
        else if (m) m.dispose();
      });
      envTex.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

// Synthesized engine start — no audio assets needed.
export function playEngineSound(): void {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const master = ctx.createGain();
    master.gain.value = 0.0001;
    master.connect(ctx.destination);

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(38, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.9);
    osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 2.0);

    const sub = ctx.createOscillator();
    sub.type = 'square';
    sub.frequency.setValueAtTime(19, ctx.currentTime);
    sub.frequency.exponentialRampToValueAtTime(55, ctx.currentTime + 0.9);
    sub.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 2.0);

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 320;
    lp.Q.value = 4;

    osc.connect(lp); sub.connect(lp); lp.connect(master);

    master.gain.exponentialRampToValueAtTime(0.5, ctx.currentTime + 0.25);
    master.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + 1.2);
    master.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 2.4);

    osc.start(); sub.start();
    osc.stop(ctx.currentTime + 2.5); sub.stop(ctx.currentTime + 2.5);
    setTimeout(() => ctx.close(), 2800);
  } catch { /* audio unavailable — stay silent */ }
}
