# 构建记录与截图交付

本项目新增的自动化记录是**补充证据**，不能代替 make.fun 要求的原始 agent 会话，也不能证明已取得奖金资格。

## 可重复运行

Node 24（或比赛要求的兼容版本）：

```sh
node --experimental-loader ./tests/three-loader.mjs tests/gameplay.mjs
npm install --no-save --package-lock=false playwright@1.56.1
npx playwright install --with-deps chromium
node serve.ts
```

另开终端运行：

```sh
node scripts/capture.mjs
MAKEFUN_OUTPUT_DIR=out node main.ts
node scripts/evidence.mjs
```

GitHub Actions 的 `Gameplay and screenshot evidence` 会执行同一流程，产出 `neon-void-evidence` 下载包：

- 四张1280×720游戏自身WebGL渲染截图，单张检查≤256KiB。
- 768×480标题截图与浏览器测试结果。
- dossier.json 与文件SHA-256、运行commit、Node版本。
- 原始会话是否提供、官方bundle是否生成的明确状态。

四张主截图采用仓库已有的 `?shot=` 固定场景，包含开始、HUD、交火、结算。它们是真实代码渲染，但分数和敌人位置由分镜fixture设置，**不是连续试玩成绩证明**。浏览器交互测试另行通过正常开始/暂停/换弹和实际敌人伤害回调验证，不把fixture成绩冒充试玩成绩。

## 原始会话仍需补齐

| 材料 | 本次能否生成 | 说明 |
|---|---|---|
| 源码、测试、文件哈希、截图 | 可以，浏览器检查成功后生成截图 | 对应commit可追溯 |
| v1原始Muse构建会话 | 当前环境未提供 | 需求文档中的旧机器路径不是当前可访问文件 |
| 本次ChatGPT原生会话导出 | 当前接口未提供可验证导出 | 不能用手写摘要伪装原始会话 |
| provider真实逐次用量 | 当前接口未提供 | 不能估算、补写或改造成其他工具的日志 |
| 官方kit transcript bundle及服务端检查 | 未执行 | 需上述原始材料和原kit |

如已持有原始导出，可把其放在**仓库以外**的目录，运行 `NEON_TRANSCRIPT_DIR=/实际导出目录 node scripts/evidence.mjs` 建立文件清单与哈希；状态仅为 `provided_unverified`，仍须用官方kit检查。这些材料可能含敏感信息，不会自动上传GitHub。

## 参赛前顺序

1. 确认GitHub自动检查为绿色，查看截图及768×480可读性，下载生成物。
2. 将同一commit生成的四张截图纳入提交；重新运行入口并重算dossier，确保截图、源码、dossier一致。
3. 从原生构建工具取得v1及后续全部构建会话和真实usage。导出缺失时，不应把“开发日志”当作可获得奖金的证据。
4. 按官网最新要求准备真实run record、provider/model及会话信息，打bundle并运行完整check；不能仅凭本仓库测试认为官方gate通过。
5. 使用本人账户和钱包签名提交新commit，确认服务端结果。本次代码更新不自动提交比赛。

官方规则以 https://make.fun/api/competitions/best-game-01/requirements 为准。
