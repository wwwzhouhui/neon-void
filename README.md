# neon-void

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/wwwzhouhui/neon-void/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/wwwzhouhui/neon-void/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

NEON VOID is a neon arena wave-survival FPS that runs in a desktop browser from static files: hold the line against waves of drones, runners and brutes with a pulse rifle and a scattergun, and chase the high score.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 . The local server supplies ES module MIME types; no internet connection or build step is needed during play.

---

<sub>Entered on [make.fun](https://make.fun/?ref=4xgwwxgv&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>

## Void Dash & kill chains

Press **E** to dash in your movement direction (or forward when standing), with a three-second cooldown. Keep kills within four seconds of each other: every three additional kills raises the score multiplier, up to **×4**. Clear a wave to restore 25 HP. The HUD shows chain time, dash readiness, reload progress and the next-wave countdown.

Start, pause and results screens have clickable buttons. Losing window focus pauses the run.

## Validation

```sh
node --experimental-loader ./tests/three-loader.mjs tests/gameplay.mjs
MAKEFUN_OUTPUT_DIR=out node main.ts
```

See [competition review](docs/COMPETITION-REVIEW.md) for changes, validation limits and remaining submission steps. The screenshots currently show v1; refresh them from real browser renders before entering this revision.
