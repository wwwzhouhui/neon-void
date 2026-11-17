// NEON VOID — boot and the one loop. The game moves between four screens
// (title, play, paused, game over); the world advances in fixed 1/60 s steps.
// ?seed=N fixes the run. ?shot=start|play|action|end stages that scene
// instead of running the loop, paints it twice and sets window.__shotReady.
import * as THREE from 'three';
import { ARENA, PALETTE, PLAYER, WAVES, WEAPONS, waveComposition } from './config.js';
import { createRandom, clamp } from './random.js';
import { createInput } from './input.js';
import { createAudioEngine } from './audio.js';
import { buildArena } from './world.js';
import { createPlayer } from './player.js';
import { tryFire, weaponHudState } from './weapons.js';
import { createEnemyManager } from './enemies.js';
import { createEffects } from './fx.js';
import { createHud } from './hud.js';
import { chainMultiplier, registerKill, resetChain } from './chain.js';
import { createWeaponView } from './viewmodel.js';
import { stageShot } from './shots.js';

const STEP = 1 / 60;
const MAX_FRAME = 0.25;
const BEST_KEY = 'neon-void-best';

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);
const rng = createRandom(seed);

const canvas = document.getElementById('game-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(PALETTE.background);
scene.fog = new THREE.FogExp2(PALETTE.fog, PALETTE.fogDensity);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 220);
camera.rotation.order = 'YXZ';
scene.add(camera);
const weaponView = createWeaponView(camera);

const world = buildArena(scene, rng);
const fx = createEffects(scene);
const audio = createAudioEngine();
const input = createInput(canvas);
const hud = createHud();
const player = createPlayer();

let best = 0;
try {
  best = Number.parseInt(window.localStorage.getItem(BEST_KEY) || '0', 10) || 0;
} catch (e) { best = 0; }

const game = {
  state: 'title', // title | playing | paused | over
  wave: 0,
  score: 0,
  kills: 0,
  restTimer: 0,
  now: 0,
  chain: { count: 0, until: 0, peak: 1 },
  dashUses: 0,
  prevFiring: false,
  prevReloading: false,
};

const enemyManager = createEnemyManager(scene, world, rng, {
  onKill(enemy) {
    const previous = chainMultiplier(game.chain, game.now);
    game.score += registerKill(game.chain, game.now, enemy.def.score);
    const multiplier = chainMultiplier(game.chain, game.now);
    if (multiplier > previous) hud.banner(`CHAIN ×${multiplier}`, 'KEEP MOVING · KEEP THE SIGNAL ALIVE');
    game.kills += 1;
    audio.kill();
    hud.hitmarker();
  },
  onDeathBurst(position, color) {
    fx.spawnBurst(position, color, 22, 6.5, 0.7);
  },
  onEnemyShoot() { /* drone fire is visible enough without a sound */ },
  onMeleeHit(enemy) {
    hurtPlayer(enemy.def.meleeDamage);
  },
  onProjectileHit(damage, now) {
    hurtPlayer(damage, now);
  },
});

function hurtPlayer(amount, now = game.now) {
  const dealt = player.takeDamage(amount, now);
  if (dealt > 0) {
    audio.hurt();
    hud.damageFlash();
    if (!player.state.alive) endGame();
  }
}

function playingState() {
  const ammo = weaponHudState(player, game.now);
  return {
    dash: Math.max(0, player.state.dashReadyAt - game.now),
    multiplier: chainMultiplier(game.chain, game.now),
    chainTime: Math.max(0, game.chain.until - game.now),
    rest: game.restTimer,
    hp: player.state.hp,
    maxHp: player.state.maxHp,
    ammo,
    wave: game.wave,
    score: game.score,
    kills: game.kills,
    enemiesLeft: enemyManager.aliveCount + enemyManager.spawningLeft,
  };
}

function poseCamera() {
  const eye = player.eyePosition(new THREE.Vector3());
  camera.position.copy(eye);
  camera.rotation.y = player.state.yaw;
  camera.rotation.x = player.state.pitch;
  camera.rotation.z = 0;
}

function updatePresentation() {
  const reduced = document.getElementById('reduced-motion').checked;
  weaponView.update(player.state, game.now, game.state === 'playing', reduced);
  const fov = !reduced && game.now < player.state.dashUntil ? 84 : 75;
  if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
}

function renderFrame() {
  updatePresentation();
  if (game.state === 'title' || game.state === 'over') api.poseTitleCamera();
  else poseCamera();
  renderer.render(scene, camera);
}

function startWave(n) {
  game.wave = n;
  const comp = waveComposition(n);
  enemyManager.setScales(comp.hpScale, comp.speedScale);
  enemyManager.setWaveActive(true);
  enemyManager.queueWave(comp, world.spawnPoints, player.state.position);
  hud.banner(`WAVE ${n}`, n === 1 ? 'ELIMINATE ALL HOSTILES' : `${comp.total} HOSTILES INBOUND`);
  audio.waveHorn();
}

function startGame() {
  player.reset();
  enemyManager.clearAll();
  fx.clear();
  input.clear();
  game.now = 0;
  resetChain(game.chain);
  game.dashUses = 0;
  game.prevFiring = false;
  game.prevReloading = false;
  game.overClickArmed = false;
  game.score = 0;
  game.kills = 0;
  game.wave = 0;
  game.restTimer = 0;
  game.state = 'playing';
  hud.showPlaying();
  hud.updatePlaying(playingState());
  hud.setMuted(audio.isMuted());
  startWave(1);
}

function endGame() {
  if (game.state === 'over') return;
  game.state = 'over';
  input.clear();
  input.exitLock();
  audio.gameOver();
  const isNewBest = game.score > best;
  if (isNewBest) {
    best = game.score;
    try { window.localStorage.setItem(BEST_KEY, String(best)); } catch (e) { /* ignore */ }
  }
  hud.showGameOver({ wave: game.wave, kills: game.kills, score: game.score, best, isNewBest, peak: game.chain.peak, seconds: game.now, dashes: game.dashUses });
}

function pauseGame() {
  if (game.state !== 'playing') return;
  game.prevFiring = false;
  game.state = 'paused';
  input.clear();
  input.exitLock();
  hud.showPaused();
}

function resumeGame() {
  if (game.state !== 'paused') return;
  game.state = 'playing';
  hud.showPlaying();
  input.requestLock();
}

function checkWaveCleared() {
  if (!enemyManager.waveActive) return;
  if (enemyManager.aliveCount === 0 && enemyManager.spawningLeft === 0) {
    enemyManager.setWaveActive(false);
    const bonus = WAVES.clearBonusPerWave * game.wave;
    game.score += bonus;
    player.heal(PLAYER.waveClearHeal);
    audio.waveClear();
    hud.banner('SECTOR CLEAR', `WAVE BONUS +${bonus}  ·  +${PLAYER.waveClearHeal} HP`);
    game.restTimer = WAVES.restSeconds;
  }
}

// ---- staged-shot helpers (used by shots.js; also handy for tests) ----
const api = {
  hud,
  get best() { return best; },
  renderFrame,
  playingState,
  poseTitleCamera() {
    camera.position.set(0, 5.5, 17);
    camera.lookAt(0, 1.6, -8);
    camera.rotation.z = 0;
  },
  spawnTitleDrones() {
    enemyManager.setScales(1, 1);
    enemyManager.spawnNow('drone', -5, -6).group.position.y = 2.6;
    enemyManager.spawnNow('drone', 4, -10).group.position.y = 3.0;
    enemyManager.spawnNow('runner', 7, -4);
    enemyManager.spawnNow('brute', -8, -12);
    for (const e of enemyManager.enemies) e.group.rotation.y = Math.atan2(0 - e.group.position.x, 8 - e.group.position.z);
  },
  startStagedGame(wave) {
    player.reset();
    enemyManager.clearAll();
    fx.clear();
    game.score = wave === 2 ? 650 : 1450;
    game.kills = wave === 2 ? 7 : 16;
    game.wave = wave;
    game.chain = { count: wave === 3 ? 7 : 2, until: 3.2, peak: wave === 3 ? 3 : 1 };
    game.state = 'playing';
    hud.showPlaying();
    const comp = waveComposition(wave);
    enemyManager.setScales(comp.hpScale, comp.speedScale);
    enemyManager.setWaveActive(true);
  },
  spawnStagedEnemies(kind) {
    if (kind === 'play') {
      enemyManager.spawnNow('drone', -5, -8).group.position.y = 2.6;
      enemyManager.spawnNow('drone', 5, -12).group.position.y = 2.9;
      enemyManager.spawnNow('runner', -7, -4);
      enemyManager.spawnNow('runner', 7, -6);
      enemyManager.spawnNow('brute', 0, -15);
    } else {
      enemyManager.spawnNow('drone', -4, -6).group.position.y = 2.6;
      enemyManager.spawnNow('drone', 3, -9).group.position.y = 2.8;
      enemyManager.spawnNow('drone', 8, -13).group.position.y = 3.1;
      enemyManager.spawnNow('runner', -6, -3);
      enemyManager.spawnNow('runner', 6, -5);
      enemyManager.spawnNow('runner', -2, -11);
      enemyManager.spawnNow('brute', 1, -14);
      enemyManager.spawnNow('brute', -9, -9);
    }
    for (const e of enemyManager.enemies) {
      const dx = 0 - e.group.position.x;
      const dz = 10 - e.group.position.z;
      e.group.rotation.y = Math.atan2(dx, dz);
    }
  },
  posePlayCamera() {
    player.state.position.set(0, 0, 10);
    player.state.yaw = 0;
    player.state.pitch = -0.03;
    poseCamera();
  },
  fireStagedShot() {
    player.state.weapons.rifle.mag = 24;
    const eye = player.eyePosition(new THREE.Vector3());
    const dir = new THREE.Vector3(0, 0.02, -1);
    const muzzle = eye.clone().addScaledVector(dir, 0.7);
    muzzle.y -= 0.12;
    fx.muzzleFlash(muzzle);
    fx.spawnTracer(muzzle, new THREE.Vector3(-4.5, 2.4, -8), 0xaefcff);
    fx.spawnBurst(new THREE.Vector3(-4.5, 2.6, -8), 0xffffff, 8, 4, 0.4);
  },
  showStagedGameOver() {
    game.state = 'over';
    game.wave = 4;
    game.score = 2350;
    game.kills = 23;
    hud.showGameOver({ wave: 4, kills: 23, score: 2350, best: Math.max(best, 2350), isNewBest: true, peak: 3, seconds: 143, dashes: 9 });
    camera.position.set(0, 5.5, 17);
    camera.lookAt(0, 1.6, -8);
    camera.rotation.z = 0;
  },
};

function update(dt) {
  if (game.state === 'playing') game.now += dt;
  const now = game.now;

  if (game.state === 'playing') {
    const look = input.consumeLook();
    const sensitivity = Number(document.getElementById('sensitivity').value);
    player.look(look.dx * sensitivity, look.dy * sensitivity);
    player.update(dt, input, world, now);
    poseCamera();
    camera.updateMatrixWorld(true);

    if (player.state.reloading && !game.prevReloading) audio.reloadStart();
    if (!player.state.reloading && game.prevReloading) audio.reloadDone();
    game.prevReloading = player.state.reloading;

    const firingNow = input.isFiring();
    const def = WEAPONS[player.state.currentWeapon];
    if (firingNow && (def.automatic || !game.prevFiring)) {
      tryFire(player, camera, enemyManager, fx, audio, now);
    }
    game.prevFiring = firingNow;

    // Safety net: any path that kills the player must end the run, even if
    // the damage did not flow through hurtPlayer (e.g. a test hook).
    if (!player.state.alive) {
      endGame();
      return;
    }

    enemyManager.update(dt, player.state.position, player.state, now);
    if (game.state !== 'playing') return;
    checkWaveCleared();
    if (game.restTimer > 0) {
      game.restTimer -= dt;
      if (game.restTimer <= 0) startWave(game.wave + 1);
    }
    hud.updatePlaying(playingState());
  }

  fx.update(dt);
  poseCamera();
}

// ---- input wiring ----
input.onAction('Enter', () => {
  audio.unlock();
  if (game.state === 'title' || game.state === 'over') {
    audio.click();
    startGame();
    input.requestLock();
  }
});
input.onAction('KeyR', () => {
  if (game.state === 'playing') player.startReload(game.now);
  else if (game.state === 'over') { audio.click(); startGame(); input.requestLock(); }
});
input.onAction('FocusLost', pauseGame);
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseGame(); });
input.onAction('KeyE', () => {
  if (game.state === 'playing' && player.dash(game.now)) { game.dashUses++; audio.click(); }
});
input.onAction('KeyP', () => {
  if (game.state === 'playing') pauseGame();
  else if (game.state === 'paused') resumeGame();
});
input.onAction('PointerUnlock', () => {
  if (game.state === 'playing') pauseGame();
});
input.onAction('KeyM', () => {
  audio.setMuted(!audio.isMuted());
  hud.setMuted(audio.isMuted());
});
input.onAction('Digit1', () => {
  if (game.state === 'playing' && player.switchWeapon('rifle')) audio.click();
});
input.onAction('Digit2', () => {
  if (game.state === 'playing' && player.switchWeapon('shotgun')) audio.click();
});
document.getElementById('deploy').addEventListener('click', () => { audio.unlock(); startGame(); input.requestLock(); });
document.getElementById('resume').addEventListener('click', resumeGame);
document.getElementById('redeploy').addEventListener('click', () => { audio.unlock(); startGame(); input.requestLock(); });
canvas.addEventListener('click', () => {
  audio.unlock();
  if (game.state === 'title') {
    audio.click();
    startGame();
    input.requestLock();
  } else if (game.state === 'paused') {
    resumeGame();
  } else if (game.state === 'over') {
    // Let the player read the results; a second click restarts.
    if (game.overClickArmed) { audio.click(); startGame(); input.requestLock(); }
    game.overClickArmed = true;
    setTimeout(() => { game.overClickArmed = false; }, 1200);
  } else if (game.state === 'playing') {
    input.requestLock();
  }
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Test / debug hook (also used by the screenshot script).
window.__game = {
  game,
  player,
  enemyManager,
  api,
  start: startGame,
  state: () => ({
    screen: game.state,
    wave: game.wave,
    score: game.score,
    kills: game.kills,
    dash: Math.max(0, player.state.dashReadyAt - game.now),
    multiplier: chainMultiplier(game.chain, game.now),
    chainTime: Math.max(0, game.chain.until - game.now),
    rest: game.restTimer,
    hp: player.state.hp,
    alive: player.state.alive,
    enemies: enemyManager.aliveCount,
    spawning: enemyManager.spawningLeft,
  }),
};

// ---- boot ----
hud.showTitle(best);
hud.setMuted(false);
document.getElementById('reduced-motion').checked = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (shot) {
  stageShot(shot, { api });
} else {
  let last = performance.now();
  let accumulator = 0;
  function frame(nowMs) {
    requestAnimationFrame(frame);
    const frameDt = Math.min((nowMs - last) / 1000, MAX_FRAME);
    last = nowMs;
    accumulator += frameDt;
    let steps = 0;
    while (accumulator >= STEP && steps < 5) {
      update(STEP);
      accumulator -= STEP;
      steps++;
    }
    if (steps === 5) accumulator = 0;
    if (game.state === 'title') api.poseTitleCamera();
    updatePresentation();
    renderer.render(scene, camera);
  }
  api.spawnTitleDrones();
  requestAnimationFrame(frame);
}
