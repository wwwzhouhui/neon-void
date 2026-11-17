# 裁判评审方式与本项目证据映射

## 官方评审方式

make.fun 的 best-game-01 比赛说明：AI 裁判通过游戏截图和源码提纲，对两个游戏进行成对比较，再按被选中的频率排名。截图应展示游戏从开始到重开的完整性，以及实际玩法和反馈。

来源：[比赛官网 Full brief](https://make.fun/bounty/best-game-01)、[完整要求](https://make.fun/api/competitions/best-game-01/requirements)。提交时以官方最新规则为准。这里不假定截图和源码有固定百分比权重，也不承诺名次。

本项目的实现策略是让可玩的真实功能，同时在截图和源码中可核对。README 和本说明帮助开发者理解项目；不能假定根目录文档会自动出现在裁判视图中，也不能靠添加宣传文字替代功能实现。

## 四张截图各自证明什么

| 顺序与文件 | 游戏场景入口 | 展示内容 | 人工检查重点 |
|---|---|---|---|
| 1 · `screenshots/1-start.jpg` | `?shot=start&seed=1` | 游戏名、冲刺/连杀主题、规则、操作和开始按钮 | 封面缩小后，名称、玩法特色与开始入口可辨认 |
| 2 · `screenshots/2-play.jpg` | `?shot=play&seed=1` | 第一人称武器、敌人、血量、弹药、波次、分数和冲刺状态 | HUD与实际场景一致，战斗目标明确 |
| 3 · `screenshots/3-action.jpg` | `?shot=action&seed=1` | 曳光、命中特效、不同敌人、连杀倍率及剩余窗口 | 能看出射击玩法、敌人差异及特色反馈 |
| 4 · `screenshots/4-end.jpg` | `?shot=end&seed=1` | 失败结算、得分、击杀、峰值倍率、生存数据和重开按钮 | 胜负/计分与重开流程完整 |

官方 kit 按截图文件名排序，第一张为封面；根目录 `shots.json` 保存截图场景配置。当前截图为1280×720，单张≤256KiB，并另检验768×480标题画面的开始按钮是否在可视区域。人工可读性检查与尺寸检查是两件事，都需要做。

截图由游戏自身代码在 Chromium WebGL 中渲染，没有使用外部生成图替代。`?shot=` 是固定场景模式，分数、敌人位置等由fixture设置；这些图片不代表连续试玩成绩。正常交互由独立浏览器测试验证，详见 [构建记录](BUILD-RECORDS.md)。

## 源码提纲与实际功能映射

| 源码位置 | 关键声明/函数 | 对应实际功能 |
|---|---|---|
| `game/index.html` | 标题、HUD、暂停、结算DOM | 操作说明、按钮、反馈与完整界面 |
| `game/src/main.js` | `startGame`、`startWave`、`pauseGame`、`resumeGame`、`endGame`、`checkWaveCleared` | 开始→波次战斗→清波→失败→重开，暂停与最高分保存 |
| `game/src/player.js` | `createPlayer`、`dash`、`startReload`、`takeDamage`、`reset` | 移动、冲刺冷却、换弹、受伤和重置 |
| `game/src/chain.js` | `registerKill`、`chainMultiplier`、`resetChain` | 4秒连杀窗口、最高×4分数倍率及重置 |
| `game/src/weapons.js` | `tryFire`、`weaponHudState` | 双武器射线命中、散射、弹药与模拟时钟换弹进度 |
| `game/src/enemies.js` | `createEnemyManager`、`queueWave`、`damageEnemy` | 三类敌人、波次生成、敌人行为与击杀回调 |
| `game/src/world.js` | `buildArena`、`collideCircle` | 霓虹竞技场、掩体与移动碰撞 |
| `game/src/viewmodel.js` | `createWeaponView` | 第一人称双武器轮廓、换弹姿态与减少动态效果 |
| `game/src/hud.js` | `createHud`、`updatePlaying`、`showGameOver` | 血量/弹药/连杀/冲刺反馈与结算 |
| `game/src/input.js` | `createInput` | 键鼠、指针锁定、失焦输入清理 |
| `game/src/audio.js`、`game/src/fx.js` | `createAudioEngine`、`createEffects` | 程序化音效、射击与受伤反馈 |
| `game/src/shots.js` | `stageShot` | 四种固定截图场景 |

源码函数保持与功能相符的名称，便于提纲识别；不添加针对裁判的指令、隐藏宣传文本或未实现的功能声明。

## 从代码生成实际评审材料

`main.ts` 将 `game/` 和 `screenshots/` 复制到输出目录，再调用未修改的 `vendor/makefun-game.ts` 中的 `buildDossier`。

官方 kit 生成的 dossier 包含截图和源码文本。源码按入口和静态依赖顺序组织，vendor和压缩库单独统计；平台再据其形成评审视图中的源码提纲。**本项目不手工编造源码提纲，也不修改dossier插入额外评审提示。**

```sh
# 先运行截图与浏览器检查，再生成匹配的dossier。
node scripts/capture.mjs
MAKEFUN_OUTPUT_DIR=out node main.ts
node scripts/evidence.mjs
```

运行截图脚本前需安装Playwright并启动本地服务器，完整步骤见 [BUILD-RECORDS.md](BUILD-RECORDS.md)。dossier文本上限160KiB，当前入口同时限制截图张数/体积、游戏文件数/总体积。总JSON包含base64图片，不能用其整体大小代替文本字段大小。

每次涉及界面或玩法的修改后，应重新生成真实截图、dossier和验证证据，并检查三者来自一致的源码版本。可读文档与自动测试不能替代官方完整check、原始构建会话及正式签名提交。
