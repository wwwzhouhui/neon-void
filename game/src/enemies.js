// Enemies: Drone (flying, ranged), Runner (fast melee), Brute (slow tank).
// Each is a Group of code-drawn meshes with a distinct silhouette; the AI is
// a small state machine (chase / strafe / attack) with separation steering.
import * as THREE from 'three';
import { ENEMIES, PALETTE } from './config.js';
import { clamp } from './random.js';
import { collideCircle } from './world.js';

const tmpVec = new THREE.Vector3();

function buildDroneMesh(color) {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x0c0c22, roughness: 0.4, metalness: 0.7, emissive: color, emissiveIntensity: 0.35 });
  const glowMat = new THREE.MeshBasicMaterial({ color });
  const body = new THREE.Mesh(new THREE.OctahedronGeometry(0.55), bodyMat);
  group.add(body);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.05, 8, 28), glowMat);
  ring.rotation.x = Math.PI / 2;
  group.add(ring);
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), glowMat);
  eye.position.set(0, 0, 0.5);
  group.add(eye);
  return group;
}

function buildRunnerMesh(color) {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x14141f, roughness: 0.5, metalness: 0.6, emissive: color, emissiveIntensity: 0.3 });
  const glowMat = new THREE.MeshBasicMaterial({ color });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.9, 0.26), bodyMat);
  torso.position.y = 1.05;
  group.add(torso);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.28, 0.3), bodyMat);
  head.position.y = 1.66;
  group.add(head);
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.07, 0.05), glowMat);
  visor.position.set(0, 1.66, 0.16);
  group.add(visor);
  for (const side of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.85, 0.14), bodyMat);
    leg.position.set(side * 0.13, 0.42, 0);
    leg.name = side < 0 ? 'legL' : 'legR';
    group.add(leg);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.7, 0.11), bodyMat);
    arm.position.set(side * 0.3, 1.05, 0);
    arm.name = side < 0 ? 'armL' : 'armR';
    group.add(arm);
  }
  return group;
}

function buildBruteMesh(color) {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1a0e18, roughness: 0.55, metalness: 0.65, emissive: color, emissiveIntensity: 0.3 });
  const glowMat = new THREE.MeshBasicMaterial({ color });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.5, 0.9), bodyMat);
  torso.position.y = 1.35;
  group.add(torso);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.45, 0.6), bodyMat);
  head.position.y = 2.32;
  group.add(head);
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.1, 0.05), glowMat);
  visor.position.set(0, 2.32, 0.31);
  group.add(visor);
  for (const side of [-1, 1]) {
    const pauldron = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.35, 0.9), bodyMat);
    pauldron.position.set(side * 0.95, 2.0, 0);
    group.add(pauldron);
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.85, 0.42), bodyMat);
    leg.position.set(side * 0.4, 0.42, 0);
    group.add(leg);
  }
  const core = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.06), glowMat);
  core.position.set(0, 1.35, 0.47);
  group.add(core);
  return group;
}

const BUILDERS = { drone: buildDroneMesh, runner: buildRunnerMesh, brute: buildBruteMesh };

export function createEnemyManager(scene, world, rng, callbacks) {
  const enemies = [];
  const projectiles = [];
  const hitMeshes = [];
  let spawnQueue = [];
  let spawnTimer = 0;
  let waveActive = false;

  function makeEnemy(type, position, hpScale, speedScale) {
    const def = ENEMIES[type];
    const group = BUILDERS[type](def.color);
    group.position.copy(position);
    group.traverse((child) => {
      if (child.isMesh) {
        child.userData.enemyRef = null; // filled below
        hitMeshes.push(child);
      }
    });
    scene.add(group);
    const enemy = {
      type,
      def,
      group,
      hp: Math.round(def.hp * hpScale),
      maxHp: Math.round(def.hp * hpScale),
      speed: def.speed * speedScale,
      radius: def.radius,
      hoverHeight: def.hoverHeight,
      shootTimer: rng.range(1.2, 2.4),
      meleeTimer: 0,
      strafeDir: rng.chance(0.5) ? 1 : -1,
      strafeTimer: rng.range(1, 2.5),
      bobPhase: rng.range(0, Math.PI * 2),
      walkPhase: rng.range(0, Math.PI * 2),
      dead: false,
    };
    group.traverse((child) => {
      if (child.isMesh) child.userData.enemyRef = enemy;
    });
    enemies.push(enemy);
    return enemy;
  }

  function queueWave(composition, spawnPoints, playerPos) {
    const list = [];
    for (let i = 0; i < composition.drones; i++) list.push('drone');
    for (let i = 0; i < composition.runners; i++) list.push('runner');
    for (let i = 0; i < composition.brutes; i++) list.push('brute');
    // Shuffle, but keep brutes from spawning first so the wave opens readable.
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(rng.next() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    spawnQueue = list.map((type) => {
      let point = spawnPoints[Math.floor(rng.next() * spawnPoints.length)];
      let tries = 0;
      while (Math.hypot(point[0] - playerPos.x, point[1] - playerPos.z) < 10 && tries < 8) {
        point = spawnPoints[Math.floor(rng.next() * spawnPoints.length)];
        tries++;
      }
      return { type, x: point[0] + rng.range(-1.5, 1.5), z: point[1] + rng.range(-1.5, 1.5) };
    });
    spawnTimer = 0.3;
    waveActive = true;
  }

  function damageEnemy(mesh, damage, now) {
    const enemy = mesh.userData.enemyRef;
    if (!enemy || enemy.dead) return false;
    enemy.hp -= damage;
    if (enemy.hp <= 0) {
      killEnemy(enemy, now);
      return true;
    }
    return false;
  }

  function killEnemy(enemy, now) {
    enemy.dead = true;
    callbacks.onKill(enemy, now);
    const pos = enemy.group.position.clone();
    pos.y += enemy.hoverHeight > 0 ? enemy.hoverHeight : 1.2;
    callbacks.onDeathBurst(pos, enemy.def.color);
    scene.remove(enemy.group);
    for (const child of enemy.group.children) {
      if (child.isMesh) {
        const idx = hitMeshes.indexOf(child);
        if (idx >= 0) hitMeshes.splice(idx, 1);
      }
    }
    const idx = enemies.indexOf(enemy);
    if (idx >= 0) enemies.splice(idx, 1);
  }

  function fireProjectile(from, targetPos, speed, damage) {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 10, 8),
      new THREE.MeshBasicMaterial({ color: PALETTE.drone }),
    );
    mesh.position.copy(from);
    scene.add(mesh);
    tmpVec.copy(targetPos).sub(from).normalize();
    projectiles.push({ mesh, velocity: tmpVec.clone().multiplyScalar(speed), damage, life: 4 });
  }

  function update(dt, playerPos, player, now) {
    // Spawn from the queue.
    if (spawnQueue.length > 0) {
      spawnTimer -= dt;
      if (spawnTimer <= 0) {
        const next = spawnQueue.shift();
        makeEnemy(next.type, new THREE.Vector3(next.x, 0, next.z), currentHpScale, currentSpeedScale);
        spawnTimer = 0.55;
      }
    }

    for (const enemy of [...enemies]) {
      if (enemy.dead) continue;
      const g = enemy.group;
      const dx = playerPos.x - g.position.x;
      const dz = playerPos.z - g.position.z;
      const dist = Math.hypot(dx, dz) || 0.001;
      const nx = dx / dist;
      const nz = dz / dist;

      if (enemy.type === 'drone') {
        enemy.strafeTimer -= dt;
        if (enemy.strafeTimer <= 0) {
          enemy.strafeDir *= -1;
          enemy.strafeTimer = rng.range(1, 2.5);
        }
        // Keep a firing band: approach if far, back off if too close, strafe.
        let mx = 0;
        let mz = 0;
        if (dist > 20) { mx = nx; mz = nz; }
        else if (dist < 9) { mx = -nx; mz = -nz; }
        mx += -nz * enemy.strafeDir * 0.7;
        mz += nx * enemy.strafeDir * 0.7;
        const ml = Math.hypot(mx, mz) || 1;
        g.position.x += (mx / ml) * enemy.speed * dt;
        g.position.z += (mz / ml) * enemy.speed * dt;
        g.position.y = enemy.hoverHeight + Math.sin(now * 2 + enemy.bobPhase) * 0.25;
        g.rotation.y = Math.atan2(nx, nz);
        enemy.shootTimer -= dt;
        if (enemy.shootTimer <= 0 && dist < enemy.def.shootRange && player.alive) {
          enemy.shootTimer = enemy.def.shootInterval * rng.range(0.9, 1.2);
          const from = g.position.clone();
          from.y = g.position.y;
          const target = new THREE.Vector3(playerPos.x, playerPos.y + 1.3, playerPos.z);
          fireProjectile(from, target, enemy.def.projectileSpeed, enemy.def.projectileDamage);
          callbacks.onEnemyShoot();
        }
      } else {
        // Ground enemies chase the player, sliding around obstacles.
        const step = enemy.speed * dt;
        const next = { x: g.position.x + nx * step, z: g.position.z + nz * step };
        collideCircle(next, enemy.radius, world.colliders, world.bounds);
        g.position.x = next.x;
        g.position.z = next.z;
        g.position.y = 0;
        g.rotation.y = Math.atan2(nx, nz);
        enemy.walkPhase += dt * (enemy.type === 'runner' ? 11 : 5);
        const legL = g.getObjectByName('legL');
        const legR = g.getObjectByName('legR');
        if (legL && legR) {
          legL.rotation.x = Math.sin(enemy.walkPhase) * 0.6;
          legR.rotation.x = -Math.sin(enemy.walkPhase) * 0.6;
        }
        enemy.meleeTimer -= dt;
        if (dist < enemy.def.meleeRange && enemy.meleeTimer <= 0 && player.alive) {
          enemy.meleeTimer = enemy.def.meleeCooldown;
          callbacks.onMeleeHit(enemy);
        }
      }

      // Separation: keep enemies from stacking.
      for (const other of enemies) {
        if (other === enemy || other.dead) continue;
        const ox = g.position.x - other.group.position.x;
        const oz = g.position.z - other.group.position.z;
        const od = Math.hypot(ox, oz);
        const minDist = enemy.radius + other.radius + 0.15;
        if (od > 0.001 && od < minDist) {
          const push = (minDist - od) * 0.5;
          g.position.x += (ox / od) * push;
          g.position.z += (oz / od) * push;
        }
      }
      collideCircle(g.position, enemy.radius, world.colliders, world.bounds);
    }

    // Projectiles.
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i];
      p.life -= dt;
      p.mesh.position.addScaledVector(p.velocity, dt);
      const d = Math.hypot(
        p.mesh.position.x - playerPos.x,
        p.mesh.position.y - (playerPos.y + 1.3),
        p.mesh.position.z - playerPos.z,
      );
      let done = p.life <= 0 || p.mesh.position.y < 0.05;
      if (d < 1.0 && player.alive) {
        callbacks.onProjectileHit(p.damage, now);
        done = true;
      }
      if (done) {
        scene.remove(p.mesh);
        p.mesh.material.dispose();
        projectiles.splice(i, 1);
      }
    }
  }

  let currentHpScale = 1;
  let currentSpeedScale = 1;

  function clearAll() {
    for (const enemy of [...enemies]) {
      scene.remove(enemy.group);
    }
    enemies.length = 0;
    hitMeshes.length = 0;
    for (const p of projectiles) {
      scene.remove(p.mesh);
      p.mesh.material.dispose();
    }
    projectiles.length = 0;
    spawnQueue = [];
    waveActive = false;
  }

  return {
    get enemies() { return enemies; },
    get hitMeshes() { return hitMeshes; },
    get aliveCount() { return enemies.length; },
    get spawningLeft() { return spawnQueue.length; },
    get waveActive() { return waveActive; },
    setWaveActive(value) { waveActive = value; },
    setScales(hp, speed) { currentHpScale = hp; currentSpeedScale = speed; },
    spawnNow(type, x, z) {
      return makeEnemy(type, new THREE.Vector3(x, 0, z), currentHpScale, currentSpeedScale);
    },
    queueWave,
    damageEnemy,
    update,
    clearAll,
  };
}
