// The player: first-person movement (WASD + sprint + jump), health, weapons
// state and reload timing. Rendering reads yaw/pitch; the camera is posed by
// main.js from this state.
import * as THREE from 'three';
import { ARENA, PLAYER, WEAPONS } from './config.js';
import { clamp } from './random.js';
import { collideCircle } from './world.js';

export function createPlayer() {
  const state = {
    position: new THREE.Vector3(0, 0, 8),
    velocity: new THREE.Vector3(),
    yaw: 0,
    pitch: 0,
    onGround: true,
    hp: PLAYER.maxHp,
    maxHp: PLAYER.maxHp,
    alive: true,
    invulnUntil: 0,
    currentWeapon: 'rifle',
    weapons: {
      rifle: { mag: WEAPONS.rifle.magSize },
      shotgun: { mag: WEAPONS.shotgun.magSize },
    },
    reloading: false,
    reloadEndsAt: 0,
    reloadWeapon: null,
    fireCooldownUntil: 0,
    lastDamageAt: -10,
  };

  function reset() {
    state.position.set(0, 0, 8);
    state.velocity.set(0, 0, 0);
    state.yaw = 0;
    state.pitch = 0;
    state.onGround = true;
    state.hp = PLAYER.maxHp;
    state.alive = true;
    state.invulnUntil = 0;
    state.currentWeapon = 'rifle';
    state.weapons.rifle.mag = WEAPONS.rifle.magSize;
    state.weapons.shotgun.mag = WEAPONS.shotgun.magSize;
    state.reloading = false;
    state.reloadEndsAt = 0;
    state.reloadWeapon = null;
    state.fireCooldownUntil = 0;
  }

  function look(dx, dy) {
    state.yaw -= dx * 0.0022;
    state.pitch = clamp(state.pitch - dy * 0.0022, -1.45, 1.45);
  }

  function update(dt, input, world, now) {
    if (!state.alive) return;
    const sprinting = input.isDown('ShiftLeft') || input.isDown('ShiftRight');
    const speed = PLAYER.walkSpeed * (sprinting ? PLAYER.sprintMultiplier : 1);
    let forward = 0;
    let strafe = 0;
    if (input.isDown('KeyW') || input.isDown('ArrowUp')) forward += 1;
    if (input.isDown('KeyS') || input.isDown('ArrowDown')) forward -= 1;
    if (input.isDown('KeyA') || input.isDown('ArrowLeft')) strafe -= 1;
    if (input.isDown('KeyD') || input.isDown('ArrowRight')) strafe += 1;
    const len = Math.hypot(forward, strafe) || 1;
    forward /= len;
    strafe /= len;

    const sin = Math.sin(state.yaw);
    const cos = Math.cos(state.yaw);
    // Forward is -Z rotated by yaw; strafe is perpendicular.
    const wishX = (-sin * forward + cos * strafe) * speed;
    const wishZ = (-cos * forward - sin * strafe) * speed;
    const control = state.onGround ? 1 : PLAYER.airControl;
    state.velocity.x += (wishX - state.velocity.x) * Math.min(1, PLAYER.accel * control * dt / speed * 6);
    state.velocity.z += (wishZ - state.velocity.z) * Math.min(1, PLAYER.accel * control * dt / speed * 6);

    if ((input.isDown('Space')) && state.onGround) {
      state.velocity.y = ARENA.jumpSpeed;
      state.onGround = false;
    }
    state.velocity.y += ARENA.gravity * dt;

    const next = {
      x: state.position.x + state.velocity.x * dt,
      z: state.position.z + state.velocity.z * dt,
    };
    collideCircle(next, ARENA.playerRadius, world.colliders, world.bounds);
    state.position.x = next.x;
    state.position.z = next.z;
    state.position.y += state.velocity.y * dt;
    if (state.position.y <= 0) {
      state.position.y = 0;
      state.velocity.y = 0;
      state.onGround = true;
    }

    if (state.reloading && now >= state.reloadEndsAt) {
      const def = WEAPONS[state.reloadWeapon];
      state.weapons[state.reloadWeapon].mag = def.magSize;
      state.reloading = false;
      state.reloadWeapon = null;
    }
  }

  function startReload(now, onDone) {
    const key = state.currentWeapon;
    const def = WEAPONS[key];
    if (state.reloading || state.weapons[key].mag >= def.magSize) return false;
    state.reloading = true;
    state.reloadWeapon = key;
    state.reloadEndsAt = now + def.reloadSeconds;
    if (onDone) onDone();
    return true;
  }

  function finishReloadNow() {
    if (!state.reloading) return;
    const def = WEAPONS[state.reloadWeapon];
    state.weapons[state.reloadWeapon].mag = def.magSize;
    state.reloading = false;
    state.reloadWeapon = null;
  }

  function takeDamage(amount, now) {
    if (!state.alive || now < state.invulnUntil) return 0;
    state.hp = Math.max(0, state.hp - amount);
    state.invulnUntil = now + PLAYER.hurtInvulnSeconds;
    state.lastDamageAt = now;
    if (state.hp <= 0) state.alive = false;
    return amount;
  }

  function heal(amount) {
    if (!state.alive) return;
    state.hp = Math.min(state.maxHp, state.hp + amount);
  }

  function eyePosition(out) {
    out.set(state.position.x, state.position.y + ARENA.eyeHeight, state.position.z);
    return out;
  }

  function forwardVector(out) {
    out.set(-Math.sin(state.yaw) * Math.cos(state.pitch), Math.sin(state.pitch), -Math.cos(state.yaw) * Math.cos(state.pitch));
    return out;
  }

  return {
    state,
    reset,
    look,
    update,
    startReload,
    finishReloadNow,
    takeDamage,
    heal,
    eyePosition,
    forwardVector,
    switchWeapon(key) {
      if (!WEAPONS[key] || key === state.currentWeapon) return false;
      state.currentWeapon = key;
      state.reloading = false;
      state.reloadWeapon = null;
      return true;
    },
  };
}
