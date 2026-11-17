// HUD: DOM overlay (health / ammo / wave / score / kills), hitmarker,
// damage vignette, wave banner, and the title / pause / game-over screens.
// All screens are plain DOM so they read clearly even at 768x480.
export function createHud() {
  const el = (id) => document.getElementById(id);
  const nodes = {
    hud: el('hud'),
    healthFill: el('health-fill'),
    healthText: el('health-text'),
    ammoMag: el('ammo-mag'),
    ammoWeapon: el('ammo-weapon'),
    reloadHint: el('reload-hint'),
    waveText: el('wave-text'),
    scoreText: el('score-text'),
    killsText: el('kills-text'),
    enemiesText: el('enemies-text'),
    crosshair: el('crosshair'),
    hitmarker: el('hitmarker'),
    vignette: el('damage-vignette'),
    banner: el('wave-banner'),
    titleScreen: el('screen-title'),
    pauseScreen: el('screen-pause'),
    overScreen: el('screen-over'),
    bestTitle: el('best-title'),
    overWave: el('over-wave'),
    overKills: el('over-kills'),
    overScore: el('over-score'),
    overBest: el('over-best'),
    muteText: el('mute-text'),
  };

  let bannerTimer = null;
  let hitTimer = null;

  function showOnly(screen) {
    for (const key of ['titleScreen', 'pauseScreen', 'overScreen']) {
      if (nodes[key]) nodes[key].classList.toggle('hidden', key !== screen);
    }
    nodes.hud.classList.toggle('hidden', screen !== null && screen !== 'none');
    if (nodes.crosshair) nodes.crosshair.classList.toggle('hidden', screen !== 'none');
  }

  function showTitle(best) {
    showOnly('titleScreen');
    if (nodes.bestTitle) nodes.bestTitle.textContent = best > 0 ? `BEST SCORE ${best}` : 'SURVIVE THE VOID';
  }

  function showPlaying() {
    showOnly('none');
  }

  function showPaused() {
    showOnly('pauseScreen');
  }

  function showGameOver(stats) {
    showOnly('overScreen');
    if (nodes.overWave) nodes.overWave.textContent = `WAVE REACHED ${stats.wave}`;
    if (nodes.overKills) nodes.overKills.textContent = `ELIMINATIONS ${stats.kills}`;
    if (nodes.overScore) nodes.overScore.textContent = `SCORE ${stats.score}`;
    if (nodes.overBest) nodes.overBest.textContent = stats.isNewBest ? '★ NEW BEST SCORE ★' : `BEST ${stats.best}`;
  }

  function updatePlaying(state) {
    const hpPct = Math.max(0, Math.round((state.hp / state.maxHp) * 100));
    if (nodes.healthFill) {
      nodes.healthFill.style.width = `${hpPct}%`;
      nodes.healthFill.style.background = hpPct > 50 ? '#00f0ff' : hpPct > 25 ? '#ffb300' : '#ff2d78';
    }
    if (nodes.healthText) nodes.healthText.textContent = `${Math.ceil(state.hp)}`;
    if (nodes.ammoMag) nodes.ammoMag.textContent = state.ammo.reloading ? '--' : `${state.ammo.mag}`;
    if (nodes.ammoWeapon) nodes.ammoWeapon.textContent = state.ammo.name;
    if (nodes.reloadHint) nodes.reloadHint.classList.toggle('hidden', !state.ammo.reloading);
    if (nodes.waveText) nodes.waveText.textContent = `WAVE ${state.wave}`;
    if (nodes.scoreText) nodes.scoreText.textContent = `SCORE ${state.score}`;
    if (nodes.killsText) nodes.killsText.textContent = `KILLS ${state.kills}`;
    if (nodes.enemiesText) nodes.enemiesText.textContent = state.enemiesLeft > 0 ? `HOSTILES ${state.enemiesLeft}` : 'SECTOR CLEAR';
  }

  function banner(text, subtext) {
    if (!nodes.banner) return;
    nodes.banner.innerHTML = subtext ? `${text}<span>${subtext}</span>` : text;
    nodes.banner.classList.remove('hidden');
    nodes.banner.classList.remove('banner-pop');
    void nodes.banner.offsetWidth; // restart the animation
    nodes.banner.classList.add('banner-pop');
    if (bannerTimer) clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => nodes.banner.classList.add('hidden'), 2400);
  }

  function hitmarker() {
    if (!nodes.hitmarker) return;
    nodes.hitmarker.classList.remove('hidden');
    nodes.hitmarker.classList.remove('hit-pop');
    void nodes.hitmarker.offsetWidth;
    nodes.hitmarker.classList.add('hit-pop');
    if (hitTimer) clearTimeout(hitTimer);
    hitTimer = setTimeout(() => nodes.hitmarker.classList.add('hidden'), 160);
  }

  function damageFlash() {
    if (!nodes.vignette) return;
    nodes.vignette.classList.remove('hidden');
    nodes.vignette.classList.remove('dmg-pop');
    void nodes.vignette.offsetWidth;
    nodes.vignette.classList.add('dmg-pop');
    setTimeout(() => nodes.vignette.classList.add('hidden'), 450);
  }

  function setMuted(muted) {
    if (nodes.muteText) nodes.muteText.textContent = muted ? 'SOUND OFF [M]' : 'SOUND ON [M]';
  }

  return {
    showTitle,
    showPlaying,
    showPaused,
    showGameOver,
    updatePlaying,
    banner,
    hitmarker,
    damageFlash,
    setMuted,
  };
}
