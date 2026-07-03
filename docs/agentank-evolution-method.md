# AgentTank 演进方法

参考来源：https://github.com/tylearymf/agentank-evolution-lab

这个仓库应该作为一个轻量工作台，而不是历史垃圾堆。所有改动都要服务于可验证的强化循环。

## 核心经验

- 不只从失败里学习。胜利对局同样说明哪些行为值得保护。
- 不要把每一场失败都修成更保守的策略，否则坦克会越训越怂。
- 动作评分要同时看价值和风险：星星节奏、枪线控制、压制开火、击杀窗口、子弹危险、敌方技能窗口、路径安全。
- 致命风险是硬约束，不是普通扣分项。
- 模拟只是安全检查，真实天梯结果才是最终评估。
- 目标池必须用实时数据，不能过度依赖过期本地榜单。
- 始终保留一个可回滚基线。候选版本变差时要快速回滚。
- 不要把单场失败直接翻译成代码补丁；除非是可复现硬约束，否则先进入标签聚类。

## 可执行覆盖

参考仓库偏方法论，所以本仓库把每个方法点落到文件级门禁：

| 方法点 | 本地实现 |
| --- | --- |
| 胜负复盘 | `lab/scripts/lib/behavior-score.mjs` 会为每场 replay 输出保留项和修复项。 |
| 动作价值/风险评分 | `active/shield-main.js` 保留本地战术评分；复盘检查星星节奏、开火压制、危险规避、技能节奏和走位清晰度。 |
| 正向行为强化 | `preserve-star-tempo-win`、`preserve-clear-kill-pressure`、`preserve-skill-tempo` 用来保护胜利行为，避免防守过拟合。 |
| 负向行为修复 | `fix-bullet-death`、`fix-breakable-cover-lane`、`fix-late-loop`、`fix-facing-without-shot`、`fix-unshielded-mutual-trade`、`fix-runtime-budget` 描述补丁目标。 |
| 硬约束 | `hard-current-bullet-eta`、`hard-breakable-cover-shot`、`hard-close-aimed-duel` 在没有转换成策略和测试前，会降低发布信心。 |
| 勇敢基准 | `brave-safe-star`、`brave-clear-fire` 和消极风险信号，防止坦克在修失败后变得胆小。 |
| 战斗模块 | `state/training-space.json` 记录有边界的训练轴：危险优先、星星节奏、开火压制、护盾节奏、走位清晰度、弹幕表达。 |
| 发布前审查 | 每次发布前先审查代码质量、模块优先级和策略冲突，确认候选仍然可维护、可迭代、可继续修改。 |
| 目标池冲分 | `lab/scripts/lib/adaptive-grind.mjs` 使用实时榜单、对手记忆、失败/门禁过滤、最大胜场和回撤止损。 |
| 发布说明 | `state/cycle.md` 记录发布/不发布原因、未解决失败和当前候选状态。 |
| 回滚 | `active/CURRENT.md` 记录基线来源，`archive/tanks/` 保留可回滚候选。 |

必要复盘命令：

```sh
npm run review:match -- /tmp/agentank-runs/matches/<match>.json
npm run review:batch -- /tmp/agentank-runs/matches challenger
```

报告必须包含 `Behavior Score`、`Preserve`、`Fix`、`Hard Constraints` 和 `Brave Baseline`。`npm run check` 会通过 `state/training-space.json` 执行这层约束。

## 当前本地规则

shield 主策略只在 `active/shield-main.js` 里开发。

有边界的训练空间在 `state/training-space.json`。它是本仓库的本地契约：

- 每轮只保留一个假设，不堆一组互不相关的 match 修复。
- 把真实胜负转换成评分规则、硬约束和受保护的勇敢行为。
- 致命风险是硬约束：子弹、近距离瞄准、过载枪线、隐藏射手、自己的炸弹范围，都必须先于价值动作。
- 勇敢基准同样必要：安全吃星、星线控制、清晰压枪线，不能因为某场失败需要更多防守就被删掉。
- 目标池冲分使用实时目标池数据；旧本地数据只能作为辅助证据。
- 每个候选版本都要有回滚基线。如果坦克变慢、变怂或丢掉受保护行为，就快速回滚。
- 每次发布前必须做代码质量和策略冲突审查，确认新分支没有绕开优先级管线、没有抢走更高层动作、没有破坏受保护行为。

每轮只保留一个战术假设：

```text
观察真实结果 -> 保留回滚基线 -> 修一个连贯行为组 -> 跑检查 -> 有 key 时做模拟 -> dry-run 目标池 -> 只在确认后跑有边界的真实批次
```

## 复盘聚类门槛

真实失败必须先复盘，但不等于马上改代码。单场 loss、runtime、`hard-current-bullet-eta` 或 `no-pressure loss` 仍然要立刻看 replay；看完以后先记录标签、对手技能、地图形态、领先/落后状态、死亡或丢星帧，而不是直接写 match-id 修复。

只有满足下面任一条件，才进入代码候选：

- 同一失败轴在最近 5-10 场真实样本中反复出现，例如强星慢、超载 setup 过慢、当前弹道硬约束、无压制挂机。
- 单场暴露的是明确可复现硬约束，例如当前弹道上开技能、超载后站枪线、已经面对出口却转向。
- 胜利样本也支持同一个方向，例如赢局里靠星线控制和安全吃星获胜，输局里则因为同一类星线决策变慢。

不满足聚类门槛时，只更新 `state/cycle.md` 的观察结论和 avoid/matchup 记录，不发布新版本。这样可以保留勇敢基准，避免每碰到一个克制策略就把主策略训坏。

## 受保护行为

- 安全吃星不应被恐慌移动阻断。
- 已占住的星线不应在没有真实危险时放弃。
- 相邻敌方枪线是硬危险。
- 活跃子弹是硬危险。
- 过载相邻偏移枪线是硬危险。
- 护盾应该用于挡子弹、挡过载枪线或强行破星点；不要在游走时浪费。
- 炸弹用于近身陷阱和星区封锁，不随机消耗冷却。

## 目标选择

- 优先选择同分段或略高分对手。
- 策略开发时不要反复打已知坏 matchup。
- 真实验证输一场后先停下来分析。
- 从本轮峰值出现明显回撤后先停下来。

## 上下文清理

这些内容不要长期塞进上下文或仓库：

- 原始 replay 大包。
- 一堆旧候选版本。
- 和当前 match、对手或版本无关的长报告。
- 不能落到一个补丁的宽泛策略脑暴。

## 当前瓶颈

shield-main v9 是当前已发布候选版本。当前瓶颈不再是基础冲分，而是传送密集王者池里的高分稳定性。扩展竞技框架见 `docs/agentank-competitive-evolution-plan.md`；在继续打补丁前，先用有边界的真实样本验证 v9。
