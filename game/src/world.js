// The neon arena: floor grid, walls, pillars, crates, lights and stars.
// Also owns the collision model: every solid is an axis-aligned box and the
// player / enemies are circles in XZ, resolved by axis-separated movement.
import * as THREE from 'three';
import { ARENA, PALETTE } from './config.js';

function boxCollider(cx, cz, hx, hz) {
  return { minX: cx - hx, maxX: cx + hx, minZ: cz - hz, maxZ: cz + hz };
}

export function buildArena(scene, rng) {
  const colliders = [];
  const group = new THREE.Group();
  group.name = 'arena';
  const half = ARENA.half;

  // Floor: dark slab + glowing grid.
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(half * 2 + 8, half * 2 + 8),
    new THREE.MeshStandardMaterial({ color: PALETTE.floor, roughness: 0.85, metalness: 0.25 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = false;
  group.add(floor);
  const grid = new THREE.GridHelper(half * 2, 44, PALETTE.gridCyan, 0x14204a);
  grid.position.y = 0.02;
  grid.material.transparent = true;
  grid.material.opacity = 0.5;
  group.add(grid);

  // Perimeter walls with a magenta rim on top.
  const wallMat = new THREE.MeshStandardMaterial({ color: PALETTE.wall, roughness: 0.7, metalness: 0.4 });
  const rimMat = new THREE.MeshBasicMaterial({ color: PALETTE.gridMagenta });
  const wallDefs = [
    { x: 0, z: -half - 0.5, w: half * 2 + 2, d: 1 },
    { x: 0, z: half + 0.5, w: half * 2 + 2, d: 1 },
    { x: -half - 0.5, z: 0, w: 1, d: half * 2 + 2 },
    { x: half + 0.5, z: 0, w: 1, d: half * 2 + 2 },
  ];
  for (const w of wallDefs) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w.w, ARENA.wallHeight, w.d), wallMat);
    mesh.position.set(w.x, ARENA.wallHeight / 2, w.z);
    group.add(mesh);
    const rim = new THREE.Mesh(new THREE.BoxGeometry(w.w === 1 ? 0.18 : w.w, 0.18, w.d === 1 ? 0.18 : w.d), rimMat);
    rim.position.set(w.x, ARENA.wallHeight + 0.09, w.z);
    group.add(rim);
  }

  // Pillars: two rings, cyan edge strips so they read at a glance.
  const pillarMat = new THREE.MeshStandardMaterial({ color: PALETTE.pillar, roughness: 0.6, metalness: 0.5 });
  const edgeMat = new THREE.MeshBasicMaterial({ color: PALETTE.pillarEdge });
  const pillarSpots = [
    [-11, -11], [11, -11], [-11, 11], [11, 11],
    [-11, 0], [11, 0], [0, -11], [0, 11],
    [-5.5, -5.5], [5.5, 5.5], [-5.5, 5.5], [5.5, -5.5],
  ];
  for (const [x, z] of pillarSpots) {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(1.4, 4.6, 1.4), pillarMat);
    pillar.position.set(x, 2.3, z);
    group.add(pillar);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.16, 4.6, 0.16), edgeMat);
    strip.position.set(x + 0.72, 2.3, z + 0.72);
    group.add(strip);
    colliders.push(boxCollider(x, z, 0.7, 0.7));
  }

  // Crates: low cover, magenta edges. Scattered but never on the centre spawn.
  const crateMat = new THREE.MeshStandardMaterial({ color: PALETTE.crate, roughness: 0.75, metalness: 0.3 });
  const crateEdgeMat = new THREE.MeshBasicMaterial({ color: PALETTE.crateEdge });
  const crateSpots = [
    [-16, -4, 1.6], [16, 5, 1.6], [-4, -16, 1.6], [6, 16, 1.6],
    [-16, 14, 1.2], [15, -14, 1.2], [-7, 8, 1.2], [8, -7, 1.2],
  ];
  for (const [x, z, s] of crateSpots) {
    const crate = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), crateMat);
    crate.position.set(x, s / 2, z);
    group.add(crate);
    const rim = new THREE.Mesh(new THREE.BoxGeometry(s + 0.06, 0.1, s + 0.06), crateEdgeMat);
    rim.position.set(x, s + 0.05, z);
    group.add(rim);
    colliders.push(boxCollider(x, z, s / 2, s / 2));
  }

  // Corner light towers: tall thin masts with a glowing tip.
  const mastMat = new THREE.MeshStandardMaterial({ color: 0x101024, roughness: 0.5, metalness: 0.6 });
  for (const [x, z, color] of [[-19, -19, PALETTE.gridCyan], [19, -19, PALETTE.gridMagenta], [-19, 19, PALETTE.gridMagenta], [19, 19, PALETTE.gridCyan]]) {
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 8, 8), mastMat);
    mast.position.set(x, 4, z);
    group.add(mast);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 10), new THREE.MeshBasicMaterial({ color }));
    tip.position.set(x, 8.2, z);
    group.add(tip);
    const light = new THREE.PointLight(color, 18, 26, 1.6);
    light.position.set(x, 7.6, z);
    group.add(light);
  }

  // Lights: hemisphere wash + a cool directional key light.
  const hemi = new THREE.HemisphereLight(0x3a4a8a, 0x0a0618, 0.9);
  group.add(hemi);
  const key = new THREE.DirectionalLight(0xbfd4ff, 1.1);
  key.position.set(14, 24, 10);
  group.add(key);

  // Stars: a static field of points above the walls.
  const starCount = 420;
  const positions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    positions[i * 3] = rng.range(-70, 70);
    positions[i * 3 + 1] = rng.range(9, 42);
    positions[i * 3 + 2] = rng.range(-70, 70);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xcfe8ff, size: 0.22, sizeAttenuation: true }));
  group.add(stars);

  scene.add(group);

  const spawnPoints = [
    [-19, -19], [19, -19], [-19, 19], [19, 19],
    [0, -19], [0, 19], [-19, 0], [19, 0],
  ];

  return { colliders, spawnPoints, bounds: half };
}

// Resolve a circle (x, z, radius) against all box colliders and the walls.
// Mutates and returns the position object.
export function collideCircle(pos, radius, colliders, bounds) {
  const limit = bounds - radius;
  pos.x = Math.max(-limit, Math.min(limit, pos.x));
  pos.z = Math.max(-limit, Math.min(limit, pos.z));
  for (const c of colliders) {
    const nearestX = Math.max(c.minX, Math.min(pos.x, c.maxX));
    const nearestZ = Math.max(c.minZ, Math.min(pos.z, c.maxZ));
    const dx = pos.x - nearestX;
    const dz = pos.z - nearestZ;
    const distSq = dx * dx + dz * dz;
    if (distSq >= radius * radius) continue;
    if (distSq > 1e-8) {
      const dist = Math.sqrt(distSq);
      const push = (radius - dist) / dist;
      pos.x += dx * push;
      pos.z += dz * push;
    } else {
      // Centre inside the box: push out along the smallest penetration axis.
      const pushLeft = pos.x - (c.minX - radius);
      const pushRight = (c.maxX + radius) - pos.x;
      const pushBack = pos.z - (c.minZ - radius);
      const pushFront = (c.maxZ + radius) - pos.z;
      const min = Math.min(pushLeft, pushRight, pushBack, pushFront);
      if (min === pushLeft) pos.x = c.minX - radius;
      else if (min === pushRight) pos.x = c.maxX + radius;
      else if (min === pushBack) pos.z = c.minZ - radius;
      else pos.z = c.maxZ + radius;
    }
  }
  return pos;
}
