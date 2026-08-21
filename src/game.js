import * as THREE from 'three';
import { addResource, yieldMultiplier } from './state.js';

const WIDTH = 800;
const HEIGHT = 600;
const WORLD_HALF_X = 18;
const WORLD_HALF_Z = 13;
const PLAYER_SPEED = 9;
const INTERACT_RADIUS = 4.2;

const RESOURCE_DEFS = {
  wood: { color: 0x3f8f4f, respawnMs: 5000, counts: 8, label: 'Tree' },
  stone: { color: 0x9a9a9a, respawnMs: 7000, counts: 6, label: 'Rock' },
  fiber: { color: 0x9fe08f, respawnMs: 3500, counts: 8, label: 'Bush' },
};

function buildTree(color) {
  const group = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.2, 0.6, 6),
    new THREE.MeshStandardMaterial({ color: 0x6b4a2f }),
  );
  trunk.position.y = 0.3;
  trunk.castShadow = true;
  const foliage = new THREE.Mesh(
    new THREE.ConeGeometry(0.6, 1.2, 8),
    new THREE.MeshStandardMaterial({ color }),
  );
  foliage.position.y = 1.2;
  foliage.castShadow = true;
  group.add(trunk, foliage);
  return group;
}

function buildRock(color) {
  const mesh = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.5, 0),
    new THREE.MeshStandardMaterial({ color, flatShading: true }),
  );
  mesh.position.y = 0.35;
  mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
  mesh.castShadow = true;
  return mesh;
}

function buildBush(color) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.4, 10, 8),
    new THREE.MeshStandardMaterial({ color }),
  );
  mesh.position.y = 0.4;
  mesh.castShadow = true;
  return mesh;
}

const BUILDERS = { wood: buildTree, stone: buildRock, fiber: buildBush };

export function initGame(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(WIDTH, HEIGHT);
  renderer.shadowMap.enabled = true;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x151a12);

  const camera = new THREE.PerspectiveCamera(45, WIDTH / HEIGHT, 0.1, 100);
  camera.position.set(0, 22, 15);
  camera.lookAt(0, 0, 0);
  scene.userData.camera = camera;

  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const sun = new THREE.DirectionalLight(0xffffff, 1.1);
  sun.position.set(8, 16, 6);
  sun.castShadow = true;
  sun.shadow.camera.left = -WORLD_HALF_X;
  sun.shadow.camera.right = WORLD_HALF_X;
  sun.shadow.camera.top = WORLD_HALF_Z;
  sun.shadow.camera.bottom = -WORLD_HALF_Z;
  scene.add(sun);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD_HALF_X * 2, WORLD_HALF_Z * 2),
    new THREE.MeshStandardMaterial({ color: 0x23361f }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  scene.add(new THREE.GridHelper(WORLD_HALF_X * 2, 18, 0x2f4a29, 0x2f4a29));

  const player = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.35, 0.6, 4, 8),
    new THREE.MeshStandardMaterial({ color: 0x4fd1ff }),
  );
  player.position.set(0, 0.65, 0);
  player.castShadow = true;
  scene.add(player);

  const ringGeo = new THREE.RingGeometry(INTERACT_RADIUS - 0.05, INTERACT_RADIUS, 48);
  const rangeRing = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({
    color: 0x4fd1ff, transparent: true, opacity: 0.18, side: THREE.DoubleSide,
  }));
  rangeRing.rotation.x = -Math.PI / 2;
  rangeRing.position.y = 0.02;
  scene.add(rangeRing);

  const nodes = spawnNodes(scene);

  const keys = new Set();
  window.addEventListener('keydown', (e) => keys.add(e.code));
  window.addEventListener('keyup', (e) => keys.delete(e.code));

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  renderer.domElement.addEventListener('pointerdown', (e) => {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(nodes.map((n) => n.mesh), true);
    if (!hits.length) return;
    let obj = hits[0].object;
    while (obj.parent && !obj.userData.node) obj = obj.parent;
    const node = obj.userData.node;
    if (node) tryGather(node, player, scene);
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

    renderer.render(scene, camera);
  }
  animate();

  return { scene, camera, renderer, player, nodes };
}

function spawnNodes(scene) {
  const margin = 2;
  const minDist = 2.4;
  const nodes = [];

  Object.entries(RESOURCE_DEFS).forEach(([type, def]) => {
    for (let i = 0; i < def.counts; i++) {
      const pos = pickSpot(nodes, margin, minDist);
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

function tryGather(node, player, scene) {
  if (!node.available) return;
  const dist = Math.hypot(node.x - player.position.x, node.z - player.position.z);
  if (dist > INTERACT_RADIUS) {
    floatText(node, scene, 'Too far', '#e86a6a');
    return;
  }
  const amount = yieldMultiplier(node.type);
  addResource(node.type, amount);
  floatText(node, scene, `+${amount} ${node.def.label}`, '#ffe066');

  node.available = false;
  node.mesh.visible = false;
  setTimeout(() => {
    node.available = true;
    node.mesh.visible = true;
  }, node.def.respawnMs);
}

function floatText(node, scene, msg, color) {
  const canvas = document.querySelector('#app canvas');
  if (!canvas) return;
  const container = canvas.parentElement;
  const el = document.createElement('div');
  el.textContent = msg;
  el.style.cssText = `position:absolute;font:12px monospace;color:${color};pointer-events:none;transition:transform .7s ease-out, opacity .7s ease-out;transform:translate(-50%,-50%);z-index:2;`;
  container.appendChild(el);

  const update = () => {
    const projected = worldToScreen(node.mesh.position, scene.userData.camera, canvas);
    el.style.left = `${projected.x}px`;
    el.style.top = `${projected.y}px`;
  };
  update();
  requestAnimationFrame(() => {
    el.style.opacity = '0';
    el.style.transform = 'translate(-50%, -140%)';
  });
  setTimeout(() => el.remove(), 750);
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
