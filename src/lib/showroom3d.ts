import * as THREE from 'three';
import type { ExhibitKind } from '../types';

// ---------------------------------------------------------------------------
// Reusable showroom engine: dark floor, single spotlight, slow auto-rotation.
// Each exhibit is a builder returning an update(progress, dt, t) hook.
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

// --- PANAMERA: silhouette in fog; fog lifts with progress, headlights at 90% ---
function buildPanamera(scene: THREE.Scene, stage: THREE.Group): BuildResult {
  const fog = new THREE.FogExp2(0x030303, 0.35);
  scene.fog = fog;

  const paint = mat(0x14141a, { metalness: 0.95, roughness: 0.25 });
  const dark = mat(0x060608, { metalness: 0.3, roughness: 0.8 });

  const body = box(2.7, 0.42, 1.15, paint); body.position.y = 0.45; stage.add(body);
  const nose = box(0.7, 0.28, 1.05, paint); nose.position.set(1.55, 0.38, 0); stage.add(nose);
  const cabin = box(1.5, 0.34, 0.98, paint); cabin.position.set(-0.15, 0.82, 0); stage.add(cabin);
  const glass = box(1.52, 0.16, 0.9, mat(0x0a1418, { metalness: 0.2, roughness: 0.1 }));
  glass.position.set(-0.15, 0.98, 0); stage.add(glass);

  for (const [x, z] of [[0.95, 0.58], [0.95, -0.58], [-0.95, 0.58], [-0.95, -0.58]] as const) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.2, 18), dark);
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(x, 0.3, z);
    stage.add(wheel);
  }

  const lightMat = new THREE.MeshStandardMaterial({ color: 0xfff6d8, emissive: 0xfff2c0, emissiveIntensity: 0 });
  const hlL = box(0.06, 0.09, 0.22, lightMat); hlL.position.set(1.91, 0.42, 0.35); stage.add(hlL);
  const hlR = hlL.clone(); hlR.position.z = -0.35; stage.add(hlR);
  const beamL = new THREE.SpotLight(0xfff2c0, 0, 8, 0.5, 0.6);
  beamL.position.set(1.95, 0.42, 0.35);
  beamL.target.position.set(6, 0.1, 0.5);
  stage.add(beamL, beamL.target);
  const beamR = new THREE.SpotLight(0xfff2c0, 0, 8, 0.5, 0.6);
  beamR.position.set(1.95, 0.42, -0.35);
  beamR.target.position.set(6, 0.1, -0.5);
  stage.add(beamR, beamR.target);

  return {
    update(progress) {
      fog.density = 0.02 + (1 - Math.min(progress, 1)) * 0.33;
      const lightsOn = progress >= 0.9;
      lightMat.emissiveIntensity = lightsOn ? 2.2 : 0;
      beamL.intensity = lightsOn ? 18 : 0;
      beamR.intensity = lightsOn ? 18 : 0;
    },
  };
}

// --- MOTORCYCLE: tarp lifts from the ground up — wheels first, tank last ---
function buildMotorcycle(_scene: THREE.Scene, stage: THREE.Group): BuildResult {
  const chrome = mat(0x2a2a30, { metalness: 0.95, roughness: 0.2 });
  const dark = mat(0x08080a, { metalness: 0.3, roughness: 0.8 });

  for (const x of [0.62, -0.62]) {
    const tyre = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.075, 10, 24), dark);
    tyre.position.set(x, 0.33, 0);
    stage.add(tyre);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.1, 12), chrome);
    hub.rotation.x = Math.PI / 2;
    hub.position.set(x, 0.33, 0);
    stage.add(hub);
  }
  const beam = box(1.05, 0.07, 0.07, chrome); beam.position.set(0, 0.55, 0); beam.rotation.z = 0.14; stage.add(beam);
  const beam2 = box(0.7, 0.06, 0.06, chrome); beam2.position.set(-0.25, 0.42, 0); beam2.rotation.z = -0.5; stage.add(beam2);
  const tank = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), mat(0x8a1111, { metalness: 0.9, roughness: 0.3 }));
  tank.scale.set(1.7, 0.9, 0.85); tank.position.set(0.14, 0.72, 0); stage.add(tank);
  const seat = box(0.42, 0.09, 0.24, dark); seat.position.set(-0.32, 0.72, 0); stage.add(seat);
  const bars = box(0.05, 0.05, 0.55, chrome); bars.position.set(0.58, 0.88, 0); stage.add(bars);
  const fork = box(0.05, 0.5, 0.05, chrome); fork.position.set(0.6, 0.6, 0); fork.rotation.z = 0.35; stage.add(fork);

  const TARP_H = 1.3;
  const tarp = box(1.95, TARP_H, 0.85, mat(0x17171d, { metalness: 0.05, roughness: 1 }));
  stage.add(tarp);

  return {
    update(progress) {
      const s = Math.max(0.001, 1 - Math.min(progress, 1));
      tarp.visible = progress < 1;
      tarp.scale.y = s;
      tarp.position.y = 1.18 - (TARP_H * s) / 2; // top edge pinned — bottom rises
    },
  };
}

// --- QUIT MY JOB: exit door at the end of a dark hallway ---
function buildExitDoor(_scene: THREE.Scene, stage: THREE.Group): BuildResult {
  const wallM = mat(0x0a0a0d, { metalness: 0.1, roughness: 0.95 });
  const floorM = mat(0x0c0c10, { metalness: 0.4, roughness: 0.6 });

  const floor = box(2.4, 0.05, 10, floorM); floor.position.set(0, 0, -2); stage.add(floor);
  const ceil = box(2.4, 0.05, 10, wallM); ceil.position.set(0, 2.5, -2); stage.add(ceil);
  const wallL = box(0.08, 2.5, 10, wallM); wallL.position.set(-1.2, 1.25, -2); stage.add(wallL);
  const wallR = wallL.clone(); wallR.position.x = 1.2; stage.add(wallR);

  // dim ceiling strips
  for (const z of [-1, -3, -5]) {
    const strip = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.02, 0.12),
      new THREE.MeshStandardMaterial({ color: 0x333333, emissive: 0x8a8a70, emissiveIntensity: 0.35 })
    );
    strip.position.set(0, 2.46, z);
    stage.add(strip);
  }

  // door frame
  const frameM = mat(0x1a1a20, { metalness: 0.7, roughness: 0.4 });
  const header = box(1.2, 0.12, 0.14, frameM); header.position.set(0, 2.06, -6.5); stage.add(header);
  const jambL = box(0.12, 2.1, 0.14, frameM); jambL.position.set(-0.56, 1.0, -6.5); stage.add(jambL);
  const jambR = jambL.clone(); jambR.position.x = 0.56; stage.add(jambR);

  // door on a hinge group
  const hinge = new THREE.Group();
  hinge.position.set(-0.5, 0, -6.5);
  const door = box(1.0, 2.0, 0.07, mat(0x101014, { metalness: 0.6, roughness: 0.5 }));
  door.position.set(0.5, 1.0, 0);
  hinge.add(door);
  stage.add(hinge);

  // EXIT glow above the door
  const exitSign = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.14, 0.05),
    new THREE.MeshStandardMaterial({ color: 0x00ff87, emissive: 0x00ff87, emissiveIntensity: 1.4 })
  );
  exitSign.position.set(0, 2.25, -6.42);
  stage.add(exitSign);

  // light beyond the door
  const flood = new THREE.PointLight(0xfff4d6, 0, 14, 1.6);
  flood.position.set(0, 1.3, -7.4);
  stage.add(flood);
  const glowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(2.6, 3),
    new THREE.MeshBasicMaterial({ color: 0xfff6dc, transparent: true, opacity: 0 })
  );
  glowPlane.position.set(0, 1.3, -7.8);
  stage.add(glowPlane);

  // name tag on the wall — falls when you're free
  const tag = box(0.24, 0.16, 0.02, new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.4 }));
  tag.position.set(-1.13, 1.35, -5.4);
  tag.rotation.y = Math.PI / 2;
  stage.add(tag);
  let tagVy = 0;
  let fell = false;

  return {
    update(progress, dt) {
      const p = Math.min(progress, 1);
      hinge.rotation.y = -p * (p >= 1 ? 1.9 : 1.1); // ajar with progress, swings wide at 100%
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
    cameraPos: [3.4, 1.7, 3.6],
    cameraLook: [0, 0.5, 0],
    build: buildPanamera,
  },
  motorcycle: {
    rotate: true,
    cameraPos: [2.4, 1.4, 2.8],
    cameraLook: [0, 0.55, 0],
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
  scene.background = new THREE.Color(0x030303);

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 60);
  camera.position.set(...meta.cameraPos);
  camera.lookAt(...meta.cameraLook);

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  renderer.domElement.style.display = 'block';

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

  // showroom shell: circular floor + key spotlight + dim gold rim
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(7, 48),
    new THREE.MeshStandardMaterial({ color: 0x0a0a0c, metalness: 0.75, roughness: 0.45 })
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  const key = new THREE.SpotLight(0xfff1d0, 60, 25, 0.55, 0.7);
  key.position.set(0, 6.5, 1.5);
  key.target.position.set(0, 0.4, 0);
  scene.add(key, key.target);
  scene.add(new THREE.AmbientLight(0x404040, 0.5));
  const rim = new THREE.PointLight(0xd4af37, 4, 12);
  rim.position.set(-4, 1.2, -3);
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
    shown += (targetProgress - shown) * Math.min(1, dt * 2.5); // ease toward real progress
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
