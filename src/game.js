import * as THREE from 'three';
import {
  addResource, yieldMultiplier, state, BUILDINGS, canAfford, spendResources, selectBuilding, onChange,
} from './state.js';
import { openChestMenu } from './chestMenu.js';

const WIDTH = 800;
const HEIGHT = 600;
const WORLD_HALF_X = 40;
const WORLD_HALF_Z = 30;
const PLAYER_SPEED = 9;
const INTERACT_RADIUS = 4.2;
const PLACEMENT_RADIUS = 9;
const GRID_SIZE = 2;
const PLACEMENT_MIN_DIST = 1.1;
const NODE_MARGIN = 2;
const NODE_MIN_DIST = 2.4;
const CAMERA_OFFSET = new THREE.Vector3(0, 22, 15);
const SUN_OFFSET = new THREE.Vector3(8, 16, 6);

const DAY_LENGTH_MS = 90000;
const DAY_BG = new THREE.Color(0x151a12);
const NIGHT_BG = new THREE.Color(0x03040a);
const DAY_FOG = { near: 32, far: 78 };
const NIGHT_FOG = { near: 16, far: 46 };
const DAY_AMBIENT = { intensity: 0.6, color: new THREE.Color(0xffffff) };
const NIGHT_AMBIENT = { intensity: 0.12, color: new THREE.Color(0x4a5a8f) };
const DAY_SUN = { intensity: 1.1, color: new THREE.Color(0xffffff) };
const NIGHT_SUN = { intensity: 0.15, color: new THREE.Color(0x8fa8ff) };

const RESOURCE_DEFS = {
  wood: { color: 0x3f8f4f, respawnMs: 5000, counts: 36, label: 'Tree' },
  stone: { color: 0x9a9a9a, respawnMs: 7000, counts: 26, label: 'Rock' },
  fiber: { color: 0x9fe08f, respawnMs: 3500, counts: 36, label: 'Bush' },
};

// A tiny 4-step gradient (nearest-filtered, so no blending between steps) turns
// MeshToonMaterial's lighting into flat retro color bands instead of smooth PBR
// shading - combined with blocky BoxGeometry everywhere, this is what gives the
// player/resources their 8-bit look.
function makeToonGradient() {
  const levels = new Uint8Array([70, 130, 195, 255]);
  const texture = new THREE.DataTexture(levels, levels.length, 1, THREE.RedFormat);
  texture.needsUpdate = true;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  return texture;
}
const TOON_GRADIENT = makeToonGradient();
const toonMat = (color) => new THREE.MeshToonMaterial({ color, gradientMap: TOON_GRADIENT });

function buildTree(color) {
  const group = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.6, 0.26), toonMat(0x6b4a2f));
  trunk.position.y = 0.3;
  trunk.castShadow = true;
  const foliageLow = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.7, 1.0), toonMat(color));
  foliageLow.position.y = 0.95;
  foliageLow.castShadow = true;
  const foliageHigh = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.6, 0.62), toonMat(color));
  foliageHigh.position.y = 1.55;
  foliageHigh.castShadow = true;
  group.add(trunk, foliageLow, foliageHigh);
  return group;
}

function buildRock(color) {
  const sx = THREE.MathUtils.randFloat(0.7, 1.15);
  const sy = THREE.MathUtils.randFloat(0.6, 0.95);
  const sz = THREE.MathUtils.randFloat(0.7, 1.15);
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.6 * sx, 0.5 * sy, 0.6 * sz), toonMat(color));
  mesh.position.y = 0.25 * sy;
  mesh.rotation.y = Math.random() * Math.PI * 2;
  mesh.castShadow = true;
  return mesh;
}

function buildBush(color) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.5, 0.55), toonMat(color));
  mesh.position.y = 0.25;
  mesh.rotation.y = Math.random() * Math.PI * 2;
  mesh.castShadow = true;
  return mesh;
}

function buildPlayer(color) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.32), toonMat(color));
  body.position.y = 0.35;
  body.castShadow = true;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.36, 0.36), toonMat(color));
  head.position.y = 0.83;
  head.castShadow = true;
  group.add(body, head);
  return group;
}

const BUILDERS = { wood: buildTree, stone: buildRock, fiber: buildBush };

function buildWall() {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 1.0, 0.25),
    new THREE.MeshStandardMaterial({ color: 0x8a6a45 }),
  );
  mesh.position.y = 0.5;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function buildCampfire() {
  const group = new THREE.Group();
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x5c5c5c, flatShading: true });
  for (let i = 0; i < 6; i++) {
    const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(0.18, 0), rockMat);
    const a = (i / 6) * Math.PI * 2;
    rock.position.set(Math.cos(a) * 0.5, 0.15, Math.sin(a) * 0.5);
    rock.castShadow = true;
    group.add(rock);
  }
  const flame = new THREE.Mesh(
    new THREE.ConeGeometry(0.22, 0.5, 8),
    new THREE.MeshStandardMaterial({ color: 0xff8a3d, emissive: 0xff5500, emissiveIntensity: 0.6 }),
  );
  flame.position.y = 0.35;
  group.add(flame);
  const light = new THREE.PointLight(0xffa040, 1.8, 9, 2);
  light.position.y = 0.5;
  light.userData.baseIntensity = 1.8;
  group.add(light);
  return group;
}

function buildChest() {
  const group = new THREE.Group();
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.5, 0.6),
    new THREE.MeshStandardMaterial({ color: 0x8a6a45 }),
  );
  base.position.y = 0.25;
  base.castShadow = true;
  const lid = new THREE.Mesh(
    new THREE.BoxGeometry(0.95, 0.15, 0.65),
    new THREE.MeshStandardMaterial({ color: 0x6b4a2f }),
  );
  lid.position.y = 0.575;
  lid.castShadow = true;
  group.add(base, lid);
  return group;
}

const STRUCTURE_BUILDERS = { wall: buildWall, campfire: buildCampfire, chest: buildChest };

// Attached directly to the player group (not placed in the world) once the Torch recipe
// is crafted - see syncHeldTorch() in initGame. Boxy + toon-shaded to match buildPlayer.
function buildHeldTorch() {
  const group = new THREE.Group();
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 0.08), toonMat(0x6b4a2f));
  post.position.y = 0.25;
  post.castShadow = true;
  const flame = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.18, 0.16), toonMat(0xff8a3d));
  flame.position.y = 0.55;
  group.add(post, flame);
  const light = new THREE.PointLight(0xffa040, 1.3, 7, 2);
  light.position.y = 0.55;
  light.userData.baseIntensity = 1.3;
  group.add(light);

  group.position.set(0.32, 0.35, 0.12);
  group.rotation.z = -0.35;
  return group;
}

export function initGame(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(WIDTH, HEIGHT);
  renderer.shadowMap.enabled = true;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = DAY_BG.clone();
  scene.fog = new THREE.Fog(DAY_BG.getHex(), DAY_FOG.near, DAY_FOG.far);

  const camera = new THREE.PerspectiveCamera(45, WIDTH / HEIGHT, 0.1, 100);
  camera.position.copy(CAMERA_OFFSET);
  camera.lookAt(0, 0, 0);
  scene.userData.camera = camera;

  const ambient = new THREE.AmbientLight(DAY_AMBIENT.color, DAY_AMBIENT.intensity);
  scene.add(ambient);
  const sun = new THREE.DirectionalLight(DAY_SUN.color, DAY_SUN.intensity);
  sun.position.copy(SUN_OFFSET);
  sun.castShadow = true;
  sun.shadow.camera.left = -22;
  sun.shadow.camera.right = 22;
  sun.shadow.camera.top = 22;
  sun.shadow.camera.bottom = -22;
  scene.add(sun);
  scene.add(sun.target);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD_HALF_X * 2, WORLD_HALF_Z * 2),
    new THREE.MeshStandardMaterial({ color: 0x23361f }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  const gridHelper = new THREE.GridHelper(WORLD_HALF_X * 2, WORLD_HALF_X, 0x2f4a29, 0x2f4a29);
  scene.add(gridHelper);

  let isDay = true;
  let dayFactor = 1;

  const player = buildPlayer(0x4fd1ff);
  scene.add(player);

  let heldTorchLight = null;
  function syncHeldTorch() {
    if (state.crafted.torch && !heldTorchLight) {
      const torch = buildHeldTorch();
      player.add(torch);
      torch.traverse((obj) => { if (obj.isLight) heldTorchLight = obj; });
    }
  }
  syncHeldTorch();
  onChange(syncHeldTorch);

  const ringGeo = new THREE.RingGeometry(INTERACT_RADIUS - 0.05, INTERACT_RADIUS, 48);
  const rangeRing = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({
    color: 0x4fd1ff, transparent: true, opacity: 0.18, side: THREE.DoubleSide,
  }));
  rangeRing.rotation.x = -Math.PI / 2;
  rangeRing.position.y = 0.02;
  scene.add(rangeRing);

  const nodes = spawnNodes(scene);
  const structures = [];

  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const ghostGroup = new THREE.Group();
  ghostGroup.name = 'placementGhost';
  ghostGroup.visible = false;
  scene.add(ghostGroup);
  let ghostBuiltFor = null;

  const keys = new Set();
  window.addEventListener('keydown', (e) => {
    keys.add(e.code);
    if (e.code === 'Escape' && state.selectedBuilding) selectBuilding(state.selectedBuilding);
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let hasPointer = false;

  renderer.domElement.addEventListener('pointermove', (e) => {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    hasPointer = true;
  });

  renderer.domElement.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    hasPointer = true;

    if (state.selectedBuilding) {
      raycaster.setFromCamera(pointer, camera);
      const point = new THREE.Vector3();
      if (raycaster.ray.intersectPlane(groundPlane, point)) {
        const snapped = snapToGrid(point.x, point.z);
        tryPlace(state.selectedBuilding, snapped.x, snapped.z, scene, structures, nodes, player);
      }
      return;
    }

    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(nodes.map((n) => n.mesh), true);
    if (!hits.length) return;
    let obj = hits[0].object;
    while (obj.parent && !obj.userData.node) obj = obj.parent;
    const node = obj.userData.node;
    if (node) tryGather(node, player, scene, nodes, structures);
  });

  renderer.domElement.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(structures.map((s) => s.mesh), true);
    if (!hits.length) return;
    let obj = hits[0].object;
    while (obj.parent && !obj.userData.structure) obj = obj.parent;
    const structure = obj.userData.structure;
    if (!structure) return;

    if (structure.id === 'chest') {
      const dist = Math.hypot(structure.x - player.position.x, structure.z - player.position.z);
      if (dist > PLACEMENT_RADIUS) {
        floatText(scene, structure.mesh.position, 'Too far', '#e86a6a');
        return;
      }
      openChestMenu(structure, e.clientX, e.clientY, {
        onRemove: () => tryRemove(structure, player, scene, structures),
      });
    } else {
      tryRemove(structure, player, scene, structures);
    }
  });

  const timer = new THREE.Timer();
  function animate() {
    requestAnimationFrame(animate);
    timer.update();
    const dt = Math.min(0.05, timer.getDelta());

    const left = keys.has('ArrowLeft') || keys.has('KeyA');
    const right = keys.has('ArrowRight') || keys.has('KeyD');
    const up = keys.has('ArrowUp') || keys.has('KeyW');
    const down = keys.has('ArrowDown') || keys.has('KeyS');
    const dx = (right ? 1 : 0) - (left ? 1 : 0);
    const dz = (down ? 1 : 0) - (up ? 1 : 0);
    if (dx !== 0 || dz !== 0) {
      const len = Math.hypot(dx, dz);
      player.position.x = THREE.MathUtils.clamp(player.position.x + (dx / len) * PLAYER_SPEED * dt, -WORLD_HALF_X + 0.5, WORLD_HALF_X - 0.5);
      player.position.z = THREE.MathUtils.clamp(player.position.z + (dz / len) * PLAYER_SPEED * dt, -WORLD_HALF_Z + 0.5, WORLD_HALF_Z - 0.5);
    }
    rangeRing.position.x = player.position.x;
    rangeRing.position.z = player.position.z;

    camera.position.set(
      player.position.x + CAMERA_OFFSET.x,
      player.position.y + CAMERA_OFFSET.y,
      player.position.z + CAMERA_OFFSET.z,
    );
    camera.lookAt(player.position);

    sun.position.set(
      player.position.x + SUN_OFFSET.x,
      player.position.y + SUN_OFFSET.y,
      player.position.z + SUN_OFFSET.z,
    );
    sun.target.position.copy(player.position);

    const elapsedMs = timer.getElapsed() * 1000;
    const cycleT = (elapsedMs % DAY_LENGTH_MS) / DAY_LENGTH_MS;
    dayFactor = (Math.sin(cycleT * Math.PI * 2 + Math.PI / 2) + 1) / 2;
    isDay = dayFactor > 0.5;

    scene.background.copy(NIGHT_BG).lerp(DAY_BG, dayFactor);
    scene.fog.color.copy(scene.background);
    scene.fog.near = THREE.MathUtils.lerp(NIGHT_FOG.near, DAY_FOG.near, dayFactor);
    scene.fog.far = THREE.MathUtils.lerp(NIGHT_FOG.far, DAY_FOG.far, dayFactor);
    ambient.intensity = THREE.MathUtils.lerp(NIGHT_AMBIENT.intensity, DAY_AMBIENT.intensity, dayFactor);
    ambient.color.copy(NIGHT_AMBIENT.color).lerp(DAY_AMBIENT.color, dayFactor);
    sun.intensity = THREE.MathUtils.lerp(NIGHT_SUN.intensity, DAY_SUN.intensity, dayFactor);
    sun.color.copy(NIGHT_SUN.color).lerp(DAY_SUN.color, dayFactor);
    gridHelper.material.color.setScalar(THREE.MathUtils.lerp(0.35, 1, dayFactor));

    const t = elapsedMs / 1000;
    structures.forEach((s) => {
      s.mesh.traverse((obj) => { flickerLight(obj, t); });
    });
    if (heldTorchLight) flickerLight(heldTorchLight, t);

    updateGhost();

    renderer.render(scene, camera);
  }

  function updateGhost() {
    const buildId = state.selectedBuilding;
    if (!buildId || !hasPointer) {
      ghostGroup.visible = false;
      ghostBuiltFor = null;
      return;
    }
    raycaster.setFromCamera(pointer, camera);
    const point = new THREE.Vector3();
    if (!raycaster.ray.intersectPlane(groundPlane, point)) {
      ghostGroup.visible = false;
      return;
    }
    const snapped = snapToGrid(point.x, point.z);
    if (ghostBuiltFor !== buildId) {
      ghostGroup.clear();
      ghostGroup.add(STRUCTURE_BUILDERS[buildId]());
      ghostBuiltFor = buildId;
    }
    ghostGroup.position.set(snapped.x, 0, snapped.z);
    const def = BUILDINGS.find((b) => b.id === buildId);
    const inRange = Math.hypot(snapped.x - player.position.x, snapped.z - player.position.z) <= PLACEMENT_RADIUS;
    const valid = inRange && !isBlocked(snapped.x, snapped.z, structures, nodes) && canAfford(def.cost);
    tintGhost(ghostGroup, valid ? 0x7fd97f : 0xe86a6a);
    ghostGroup.visible = true;
  }

  animate();

  return {
    scene, camera, renderer, player, nodes, structures,
    getTimeOfDay: () => ({ isDay, dayFactor }),
  };
}

function spawnNodes(scene) {
  const nodes = [];

  Object.entries(RESOURCE_DEFS).forEach(([type, def]) => {
    for (let i = 0; i < def.counts; i++) {
      const pos = pickSpot(nodes, NODE_MARGIN, NODE_MIN_DIST);
      const mesh = BUILDERS[type](def.color);
      mesh.position.x = pos.x;
      mesh.position.z = pos.z;
      const node = { type, def, mesh, available: true, x: pos.x, z: pos.z };
      mesh.userData.node = node;
      scene.add(mesh);
      nodes.push(node);
    }
  });
  return nodes;
}

function pickSpot(existing, margin, minDist) {
  const maxX = WORLD_HALF_X - margin;
  const maxZ = WORLD_HALF_Z - margin;
  for (let attempt = 0; attempt < 40; attempt++) {
    const x = THREE.MathUtils.randFloat(-maxX, maxX);
    const z = THREE.MathUtils.randFloat(-maxZ, maxZ);
    const clearOfNodes = existing.every((n) => Math.hypot(n.x - x, n.z - z) > minDist);
    const clearOfSpawn = Math.hypot(x, z) > minDist;
    if (clearOfNodes && clearOfSpawn) return { x, z };
  }
  return { x: THREE.MathUtils.randFloat(-maxX, maxX), z: THREE.MathUtils.randFloat(-maxZ, maxZ) };
}

function tryGather(node, player, scene, nodes, structures) {
  if (!node.available) return;
  const dist = Math.hypot(node.x - player.position.x, node.z - player.position.z);
  if (dist > INTERACT_RADIUS) {
    floatText(scene, node.mesh.position, 'Too far', '#e86a6a');
    return;
  }
  const amount = yieldMultiplier(node.type);
  addResource(node.type, amount);
  floatText(scene, node.mesh.position, `+${amount} ${node.def.label}`, '#ffe066');

  node.available = false;
  node.mesh.visible = false;
  setTimeout(() => {
    const others = nodes.filter((n) => n !== node).concat(structures);
    const pos = pickSpot(others, NODE_MARGIN, NODE_MIN_DIST);
    node.x = pos.x;
    node.z = pos.z;
    node.mesh.position.x = pos.x;
    node.mesh.position.z = pos.z;
    node.available = true;
    node.mesh.visible = true;
  }, node.def.respawnMs);
}

function flickerLight(light, t) {
  if (!light.isLight || light.userData.baseIntensity === undefined) return;
  const wiggle = Math.sin(t * 3 + light.id) * 0.18 + Math.sin(t * 7.3 + light.id * 2) * 0.09;
  light.intensity = Math.max(0.3, light.userData.baseIntensity + wiggle);
}

function snapToGrid(x, z) {
  return {
    x: THREE.MathUtils.clamp(Math.round(x / GRID_SIZE) * GRID_SIZE, -WORLD_HALF_X + 1, WORLD_HALF_X - 1),
    z: THREE.MathUtils.clamp(Math.round(z / GRID_SIZE) * GRID_SIZE, -WORLD_HALF_Z + 1, WORLD_HALF_Z - 1),
  };
}

function isBlocked(x, z, structures, nodes) {
  const occupied = structures.concat(nodes);
  return occupied.some((p) => Math.hypot(p.x - x, p.z - z) < PLACEMENT_MIN_DIST);
}

function tintGhost(group, hex) {
  group.traverse((obj) => {
    if (obj.isMesh) {
      obj.material.transparent = true;
      obj.material.opacity = 0.55;
      obj.material.color.set(hex);
      if (obj.material.emissive) obj.material.emissive.set(0x000000);
    }
    if (obj.isLight) obj.visible = false;
  });
}

function tryPlace(buildId, x, z, scene, structures, nodes, player) {
  const def = BUILDINGS.find((b) => b.id === buildId);
  if (!def) return;
  const marker = new THREE.Vector3(x, 1, z);
  if (Math.hypot(x - player.position.x, z - player.position.z) > PLACEMENT_RADIUS) {
    floatText(scene, marker, 'Too far', '#e86a6a');
    return;
  }
  if (isBlocked(x, z, structures, nodes)) {
    floatText(scene, marker, 'Blocked', '#e86a6a');
    return;
  }
  if (!canAfford(def.cost)) {
    floatText(scene, marker, 'Not enough resources', '#e86a6a');
    return;
  }
  spendResources(def.cost);
  const mesh = STRUCTURE_BUILDERS[buildId]();
  mesh.position.x = x;
  mesh.position.z = z;
  scene.add(mesh);
  const structure = { id: buildId, mesh, x, z };
  if (buildId === 'chest') structure.storage = { wood: 0, stone: 0, fiber: 0 };
  mesh.userData.structure = structure;
  structures.push(structure);
  floatText(scene, marker, `${def.name} built`, '#7fd97f');
}

function tryRemove(structure, player, scene, structures) {
  const dist = Math.hypot(structure.x - player.position.x, structure.z - player.position.z);
  if (dist > PLACEMENT_RADIUS) {
    floatText(scene, structure.mesh.position, 'Too far', '#e86a6a');
    return false;
  }
  const idx = structures.indexOf(structure);
  if (idx !== -1) structures.splice(idx, 1);
  scene.remove(structure.mesh);
  disposeMesh(structure.mesh);

  const def = BUILDINGS.find((b) => b.id === structure.id);
  const marker = structure.mesh.position.clone();
  const refundParts = [];
  if (def) {
    Object.entries(def.cost).forEach(([res, amt]) => {
      addResource(res, amt);
      refundParts.push(`+${amt} ${res}`);
    });
  }
  if (structure.storage) {
    Object.entries(structure.storage).forEach(([res, amt]) => {
      if (amt <= 0) return;
      addResource(res, amt);
      refundParts.push(`+${amt} ${res}`);
    });
  }
  const label = def ? def.name : 'Structure';
  floatText(scene, marker, refundParts.length ? `${label} removed (${refundParts.join(', ')})` : `${label} removed`, '#7fd97f');
  return true;
}

function disposeMesh(mesh) {
  mesh.traverse((obj) => {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      (Array.isArray(obj.material) ? obj.material : [obj.material]).forEach((m) => m.dispose());
    }
  });
}

function floatText(scene, position, msg, color) {
  const canvas = document.querySelector('#app canvas');
  if (!canvas) return;
  const container = canvas.parentElement;
  const el = document.createElement('div');
  el.textContent = msg;
  el.style.cssText = `position:absolute;font:12px monospace;color:${color};pointer-events:none;transition:transform .7s ease-out, opacity .7s ease-out;transform:translate(-50%,-50%);z-index:2;`;
  container.appendChild(el);

  const start = performance.now();
  const duration = 750;
  const update = () => {
    const projected = worldToScreen(position, scene.userData.camera, canvas);
    el.style.left = `${projected.x}px`;
    el.style.top = `${projected.y}px`;
    if (performance.now() - start < duration) requestAnimationFrame(update);
  };
  update();
  requestAnimationFrame(() => {
    el.style.opacity = '0';
    el.style.transform = 'translate(-50%, -140%)';
  });
  setTimeout(() => el.remove(), duration);
}

function worldToScreen(position, camera, canvas) {
  const vector = position.clone();
  vector.project(camera);
  return {
    x: (vector.x * 0.5 + 0.5) * canvas.clientWidth,
    y: (-vector.y * 0.5 + 0.5) * canvas.clientHeight,
  };
}

export { WIDTH, HEIGHT };
