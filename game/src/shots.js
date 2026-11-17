// Deterministic screenshot staging: ?shot=start|play|action|end (with
// &seed=N) poses one readable scene instead of running the loop, renders it
// twice and sets window.__shotReady for the screenshot script.
export function stageShot(name, game) {
  const api = game.api;
  if (name === 'start') {
    api.poseTitleCamera();
    api.spawnTitleDrones();
    api.hud.showTitle(api.best);
    api.renderFrame();
    api.renderFrame();
  } else if (name === 'play') {
    api.startStagedGame(2);
    api.spawnStagedEnemies('play');
    api.posePlayCamera();
    api.hud.updatePlaying(api.playingState());
    api.renderFrame();
    api.renderFrame();
  } else if (name === 'action') {
    api.startStagedGame(3);
    api.spawnStagedEnemies('action');
    api.posePlayCamera();
    api.fireStagedShot();
    api.hud.updatePlaying(api.playingState());
    api.renderFrame();
    api.renderFrame();
  } else if (name === 'end') {
    api.showStagedGameOver();
    api.renderFrame();
    api.renderFrame();
  } else {
    return false;
  }
  window.__shotReady = true;
  return true;
}
