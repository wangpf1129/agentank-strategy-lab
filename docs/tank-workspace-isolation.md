# 坦克工作区隔离

当前仓库全局工作台只默认服务 `shield-main`，也就是 tank 4839 `500`。

## 当前默认坦克

- 当前态：`active/CURRENT.md`
- 当前训练空间：`state/training-space.json`
- 当前最新快照：`state/latest.json`
- 策略代码：`active/shield-main.js`
- 回归测试：`lab/scripts/tests/shield-main-strategy.test.mjs`
- 默认 dry-run：`npm run challenge:dry`
- 默认真实挑战：`npm run challenge:run`

默认挑战脚本只跑 `shield-main`，输出目录在 `/tmp/agentank-runs/shield-main/`。

## Dark Edge 隔离区

Dark Edge 的状态快照保存在：

- `state/tanks/dark-edge/CURRENT.md`
- `state/tanks/dark-edge/training-space.json`
- `state/tanks/dark-edge/latest.json`

Dark Edge 只通过显式脚本运行：

- `npm run challenge:dry:dark`
- `npm run challenge:run:dark`

这些脚本输出目录在 `/tmp/agentank-runs/dark-edge/`。

## 维护规则

- 本会话默认只改 `shield-main` 相关文件。
- Dark Edge 策略改动必须进入独立提交，不能和 `shield-main` 策略改动同一提交。
- 共享状态文件只表达当前会话活跃坦克；另一个坦克的状态放到 `state/tanks/<tank>/`。
- 真实挑战仍必须显式确认，不能作为隐藏验证步骤执行。
