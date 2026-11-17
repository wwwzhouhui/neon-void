// Hitscan weapons: raycast from the camera, spread per pellet, damage
// falloff for the shotgun, tracers and muzzle flash through the fx pool.
import * as THREE from 'three';
import { WEAPONS } from './config.js';
import { clamp } from './random.js';

const raycaster = new THREE.Raycaster();
const tmpDir = new THREE.Vector3();
const tmpOrigin = new THREE.Vector3();
const tmpHit = new THREE.Vector3();

export function tryFire(player, camera, enemyManager, fx, audio, now) {
  const p = player.state;
  if (!p.alive || p.reloading) return false;
  if (now < p.fireCooldownUntil) return false;
  const def = WEAPONS[p.currentWeapon];
  const mag = p.weapons[p.currentWeapon];
  if (mag.mag <= 0) {
    audio.emptyClick();
    p.fireCooldownUntil = now + 0.3;
    return false;
  }
  mag.mag -= 1;
  p.fireCooldownUntil = now + def.fireInterval;

  player.eyePosition(tmpOrigin);
  camera.getWorldDirection(tmpDir);
  const muzzle = tmpOrigin.clone().addScaledVector(tmpDir, 0.7);
  muzzle.y -= 0.12;
  fx.muzzleFlash(muzzle);

  let anyHit = false;
  for (let pellet = 0; pellet < def.pellets; pellet++) {
    const dir = tmpDir.clone();
    dir.x += (Math.random() - 0.5) * 2 * def.spreadRadians;
    dir.y += (Math.random() - 0.5) * 2 * def.spreadRadians;
    dir.z += (Math.random() - 0.5) * 2 * def.spreadRadians;
    dir.normalize();
    raycaster.set(tmpOrigin, dir);
    raycaster.far = def.range;
    const hits = raycaster.intersectObjects(enemyManager.hitMeshes, false);
    let end;
    if (hits.length > 0) {
      const hit = hits[0];
      end = hit.point.clone();
      let damage = def.damage;
      if (def.falloffStart && hit.distance > def.falloffStart) {
        damage *= clamp(1 - (hit.distance - def.falloffStart) / def.range, 0.45, 1);
      }
      const killed = enemyManager.damageEnemy(hit.object, Math.round(damage), now);
      fx.spawnBurst(hit.point, 0xffffff, killed ? 14 : 6, killed ? 7 : 4, 0.4);
      anyHit = true;
    } else {
      end = tmpOrigin.clone().addScaledVector(dir, def.range);
    }
    fx.spawnTracer(muzzle, end, def.tracerColor);
  }

  if (p.currentWeapon === 'rifle') audio.shootRifle();
  else audio.shootShotgun();
  if (anyHit) audio.hit();
  return true;
}

export function weaponHudState(player) {
  const p = player.state;
  const def = WEAPONS[p.currentWeapon];
  return {
    name: def.name,
    mag: p.weapons[p.currentWeapon].mag,
    magSize: def.magSize,
    reloading: p.reloading,
    reloadProgress: p.reloading ? clamp(1 - (p.reloadEndsAt - performance.now() / 1000) / def.reloadSeconds, 0, 1) : 0,
    weaponKey: p.currentWeapon,
  };
}
