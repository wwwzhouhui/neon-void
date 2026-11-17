// NEON VOID — tuning constants. All gameplay numbers live here so the
// build can be rebalanced from one place.
export const ARENA = {
  half: 22, // playable half-extent in metres (walls at +/-22)
  wallHeight: 6,
  eyeHeight: 1.7,
  playerRadius: 0.45,
  gravity: -22,
  jumpSpeed: 7.5,
};

export const PALETTE = {
  background: 0x050512,
  fog: 0x050512,
  fogDensity: 0.026,
  floor: 0x0a0a1e,
  gridCyan: 0x00f0ff,
  gridMagenta: 0xff2d78,
  pillar: 0x141432,
  pillarEdge: 0x00f0ff,
  crate: 0x1a1a3a,
  crateEdge: 0xff2d78,
  wall: 0x0d0d24,
  wallEdge: 0x7b2dff,
  drone: 0x00f0ff,
  runner: 0xffb300,
  brute: 0xff2d78,
  tracer: 0xaefcff,
  playerBullet: 0xffffff,
};

export const PLAYER = {
  maxHp: 100,
  walkSpeed: 6.2,
  sprintMultiplier: 1.55,
  accel: 42,
  friction: 9,
  airControl: 0.35,
  hurtInvulnSeconds: 0.35,
  waveClearHeal: 25,
};

export const WEAPONS = {
  rifle: {
    name: 'PULSE RIFLE',
    key: '1',
    magSize: 30,
    reserveInfinite: true,
    damage: 34,
    headshotMultiplier: 1,
    fireInterval: 0.125, // 8 shots / s, hold to fire
    automatic: true,
    reloadSeconds: 1.25,
    spreadRadians: 0.016,
    pellets: 1,
    range: 90,
    tracerColor: 0xaefcff,
  },
  shotgun: {
    name: 'SCATTERGUN',
    key: '2',
    magSize: 5,
    reserveInfinite: true,
    damage: 17, // per pellet
    headshotMultiplier: 1,
    fireInterval: 0.9,
    automatic: false,
    reloadSeconds: 1.9,
    spreadRadians: 0.085,
    pellets: 8,
    range: 32,
    falloffStart: 9, // damage halves past this distance
    tracerColor: 0xffd166,
  },
};

export const ENEMIES = {
  drone: {
    name: 'DRONE',
    hp: 60,
    speed: 3.4,
    radius: 0.7,
    hoverHeight: 2.6,
    score: 100,
    color: PALETTE.drone,
    ranged: true,
    shootInterval: 2.4,
    shootRange: 26,
    projectileSpeed: 15,
    projectileDamage: 8,
    meleeDamage: 0,
  },
  runner: {
    name: 'RUNNER',
    hp: 80,
    speed: 5.4,
    radius: 0.55,
    hoverHeight: 0,
    score: 150,
    color: PALETTE.runner,
    ranged: false,
    meleeRange: 1.9,
    meleeDamage: 12,
    meleeCooldown: 0.8,
  },
  brute: {
    name: 'BRUTE',
    hp: 320,
    speed: 2.1,
    radius: 1.05,
    hoverHeight: 0,
    score: 300,
    color: PALETTE.brute,
    ranged: false,
    meleeRange: 2.4,
    meleeDamage: 26,
    meleeCooldown: 1.1,
  },
};

export function waveComposition(wave) {
  // Wave 1: 6 drones. Then +2 enemies per wave, runners from wave 2,
  // brutes from wave 3. HP scales +10% per wave.
  const total = 4 + 2 * wave;
  const brutes = wave >= 3 ? Math.min(1 + Math.floor((wave - 3) / 2), 4) : 0;
  const runners = wave >= 2 ? Math.min(2 + (wave - 2), Math.max(0, total - brutes - 2)) : 0;
  const drones = Math.max(2, total - brutes - runners);
  const hpScale = 1 + 0.1 * (wave - 1);
  const speedScale = 1 + 0.03 * (wave - 1);
  return { total, drones, runners, brutes, hpScale, speedScale };
}

export const WAVES = {
  restSeconds: 5,
  spawnInterval: 0.55, // seconds between spawns within a wave
  clearBonusPerWave: 100,
};

export const SHOTS = {
  width: 1280,
  height: 720,
};
