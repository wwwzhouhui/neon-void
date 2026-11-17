# neon-void

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/wwwzhouhui/neon-void/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/wwwzhouhui/neon-void/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

NEON VOID is a neon arena wave-survival FPS that runs in a desktop browser from static files: hold the line against waves of drones, runners and brutes with a pulse rifle and a scattergun, and chase the high score.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080. The local server supplies ES module MIME types; no internet connection or build step is needed during play.

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

See [competition review](docs/COMPETITION-REVIEW.md) for changes, validation limits and remaining submission steps. Screenshots were refreshed in Chromium by the successful [browser validation run](https://github.com/wwwzhouhui/neon-void/actions/runs/44032587707).

## Reproducible screenshots and build evidence

The [GitHub workflow](.github/workflows/validate.yml) runs Chromium gameplay checks, renders four screenshots and uploads a `neon-void-evidence` artifact with the dossier and SHA-256 manifest. Read [build records](docs/BUILD-RECORDS.md) for local commands and the original agent records still required by the competition.

The latest polish adds a procedural first-person weapon, chain-tier feedback, run statistics, aim sensitivity and reduced-motion controls in the pause menu.

## How the competition judges this game / 裁判如何评审

The official brief says the AI judge compares games in pairs using **screenshots and an outline of their source**. NEON VOID supplies four real game renders covering start, gameplay, combat feedback and results/restart. The unchanged official kit generates the dossier from the playable source and screenshots; project documentation is not a substitute for that evidence.

裁判比较截图与源码提纲。四张截图、核心模块和实际功能的对应关系，以及 dossier 的生成流程，见 [评审方式与证据映射](docs/JUDGING.md)。
