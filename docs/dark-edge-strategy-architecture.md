# Dark Edge 策略架构

本文档描述 `active/dark-edge.js` 当前实际决策结构。后续单场复盘先映射到这里的层级，再决定是否进入代码候选，避免把对局细节直接堆进主逻辑。

## 总原则

Dark Edge 是超载坦克，不是盾坦。它的核心不是硬吃枪线，而是用帧数、偏移枪线、草丛和星线制造压力。

优先级从高到低：

1. 生存硬约束
2. 枪线帧经济
3. 超载后复位
4. 星星节奏仲裁
5. 超载压线和逼退
6. 战略草丛/领先控星线
7. 落后或平局制造压力
8. 普通吃星、开路、炸弹、追击、解卡

任何新策略都必须明确属于其中一层。不能新增一个不受优先级管理的 `tryXxx()` 分支。

## 当前实际顺序

代码最后由 `buildStrategyPipeline()` 显式定义行动优先级：

```text
L0 hazard-evasion -> tryHazardEvasion
L0 emergency-defense -> tryEmergencyDefense
L1 post-overload-reset -> tryPostOverloadResetGuard
L1 gunline-reposition -> tryGunlineReposition
L2 star-tempo-arbiter -> tryStarTempoArbiter
L3 immediate-shot -> tryImmediateShot
L3 overload-counter-pressure -> tryOverloadCounterPressure
L3 overload-line-window -> tryOverloadLineWindow
L3 overload-guarded-star-break -> tryOverloadGuardedStarBreak
L3 grass-star-overload-pressure -> tryGrassStarOverloadPressure
L3 overload-star-clearance -> tryOverloadStarClearance
L3 adjacent-star -> tryAdjacentStar
L4 strategic-grass-control -> tryStrategicGrassControl
L4 grass-camper-hold -> tryGrassCamperHold
L4 lead-star-line-control -> tryLeadStarLineControl
L4 lead-grass-control -> tryLeadGrassControl
L4 star-interception -> tryStarInterception
L5 early-lane-pressure -> tryEarlyLanePressure
L5 star-lane-pressure -> tryStarLanePressure
L6 direct-star-advance -> tryDirectStarAdvance
L6 contested-star-line-hold -> tryContestedStarLineHold
L6 late-value-pressure -> tryLateValuePressure
L7 break-dirt-toward-star -> tryBreakDirtTowardStar
L7 star-path -> tryStarPath
L7 bomb-trap -> tryBombTrap
L7 pressure-enemy -> tryPressureEnemy
L8 unstick -> tryUnstick
L8 patrol -> patrol
```

这说明当前代码是“显式优先级 + 顺序短路式”结构：前面的模块一旦返回动作，后面的模块完全没有机会。因此修问题时最危险的不是单个判断错，而是某个新分支放错层级，抢走了更高优先级动作。

`lab/scripts/tests/dark-edge-strategy.test.mjs` 会锁定这个优先级表。新增、删除或挪动模块时，必须同步修改测试里的顺序断言，不能在 `runStrategyPipeline(buildStrategyPipeline())` 后面追加裸动作链。

## 层级定义

### 动作原语约束

所有模块最后必须落到少量动作原语，不能直接在战术分支里随手调用底层动作。

- `fireIfSafe()`：普通射击。必须当前格没有硬弹道、破土线、超载线、隐藏射手/隐藏枪线压力。
- `fireAtIfSafe(target)`：目标化射击守卫。普通弹道必须直线无遮挡；只有 active overload 才能把正偏移弹道当作有效攻击线。
- `fireForTrade()`：显式换血射击。只允许在同枪线帧经济、贴脸领先换血、紧急防守反打这类分支使用。
- `castOverload()`：超载压线。必须通过 `canCastOverloadSafely()`，不能在当前弹道或敌方可即时开火线上硬开。
- `riskyButOverloadable()`：只允许星线附近、无当前子弹/隐藏线/破土线、且能被超载压退的压力位。它不能把“硬危险格”升级成可走格。
- `moveDir()` / `tryDodge()`：走位。`tryDodge()` 只做调度，panic 前置动作在 `tryPanicDodgeSetup()`，方向评分在 `scoreDodgeDirection()`。
- `tryStrategicGrassControl()`：只把能控星线、敌方压力线或超载偏移线的草丛提前到常规追星前；不把普通草丛当默认目的地。

新增模块时，如果要开火，先判断它是“安全射击”还是“显式换血”。不能为了修一场对局把 `fireForTrade()` 扩散到普通压力模块。
依赖 `overloadAttackLaneSafe()` 的模块不能直接落到普通 `fireIfSafe()`；超载未激活时，硬墙挡住的主弹道不是有效压制。

### L0 生存硬约束

对应模块：

- `tryHazardEvasion`
- `tryEmergencyDefense`
- `tryBombEscape`
- `tryDodge`
- `safeCell`
- `currentHardDanger`

处理内容：

- 当前弹道和长弹道
- 敌方已瞄准枪线
- 破土后一枪线
- 敌方超载线
- 隐身/草丛隐藏射手
- 自己炸弹范围

规则：

- 硬危险不能被星星、超载、草丛、追击覆盖。
- 只有明确“已瞄准且无法一帧离线”的对射可以作为受控例外。

### L1 枪线帧经济

对应模块：

- `trySameGunlineFrameEconomy`
- `tryGunlineReposition`
- `closeContactExitSafe`
- `tryCloseContactEscape`

处理内容：

- 双方同一行/同一列
- 我方当前朝向是否能一帧离线
- 我方是否已经瞄准，可以立刻开火
- 转向是否浪费关键帧

规则：

- 同线且当前朝向垂直于枪线：优先 `go()` 离线。
- 同线且当前已瞄准：可以 `fire()`，但不能开超载。
- 刚超载结束或即将结束：仍然优先离线，不能因为已瞄准就继续站枪线。
- 超载复位层不能先调用反打模块；没有干净出口时也不能让后续价值模块接管这一帧。

### L2 星星节奏仲裁

对应模块：

- `tryStarTempoArbiter`
- `buildStarTempoFrame`
- `collectStarTempoCandidates`
- `etaToStarFrom`
- `starRaceLost`
- `starPickupSafe`
- `starValueHigh`
- `lowValueFarStar`

处理内容：

- 安全近星是否先吃
- 抢星是否已经输了
- 是否领先且远星价值低
- 超载 setup 是否会拖慢强星

规则：

- 安全相邻星和安全近星优先于超载 setup。
- 明显抢不过时，不盲追，转压星线、拦截或早期压线。
- 领先且远星低价值时，不追远星，转控线/控草。
- `tryStarTempoArbiter()` 只负责短路调度；星星局面统一由 `buildStarTempoFrame()` 生成，候选统一由 `collectStarTempoCandidates()` 生成。

### L3 超载压制

对应模块：

- `overloadLineFrom`
- `overloadAttackLaneSafe`
- `tryImmediateShot`
- `tryOverloadCounterPressure`
- `tryOverloadLineWindow`
- `tryOverloadGuardedStarBreak`
- `tryOverloadStarClearance`
- `tryGrassStarOverloadPressure`
- `tryAdjacentStar`

处理内容：

- 已经成立的安全直线射击
- 正偏移超载线
- 用第二条弹道打掩体后目标
- 吃星前先清压力
- 平局/落后时制造枪线窗口
- 经过前面压力窗口判断后的安全相邻星

规则：

- 超载不能当盾用，不能在当前弹道或可回复直线枪线上硬开。
- 优先使用“身体离枪线、偏移线打目标”的形态。
- 开超载后必须关注复位，不允许继续站在对方可回复枪线里。
- 超载偏移线只有在 active overload 下才是开火依据；如果超载不在，普通子弹必须通过 `fireAtIfSafe(target)` 的直线无遮挡检查，不能对着硬墙消耗帧数。
- `tryAdjacentStar()` 只是 L3 末尾的低成本机会，不允许抢在 `tryStarTempoArbiter()` 前面。

### L4 阵地控制

对应模块：

- `tryGrassCamperHold`
- `tryStrategicGrassControl`
- `tryLeadStarLineControl`
- `tryLeadGrassControl`
- `tryStarInterception`
- `grassPressureAt`
- `grassControlsPoint`

处理内容：

- 领先时守草位
- 中盘主动占战略草丛
- 守星线
- 不追低价值远星
- 对抗草丛蹲点
- 抢不过星时的星线拦截

规则：

- 草丛必须控制星线或敌方压力线，不能只是挂机。
- 战略草丛可以抢在普通 `star-path` 前执行，但不能抢在 L0/L1、星星节奏仲裁、安全相邻星或明确超载窗口前执行。
- 草丛评分必须考虑到达帧数和转向成本；超过短路径窗口的草丛不能因为“是草”就被追。
- 领先时用草丛和星线逼对手动，不主动走进草丛枪线。
- 星线拦截不能在不可破坏墙后原地面向星星；如果当前星线被 `x` 墙阻断，应让路径/压制模块接管。`m` 土墙仍可走破土逻辑。
- 争夺星线时，如果星线第一格是 `m` 且后面就是星，不算有效 hold，应先破土，否则会让 L6 等待抢走 L7 开路。

### L5 早期压线

对应模块：

- `tryEarlyLanePressure`
- `tryStarLanePressure`

处理内容：

- 开局和中前期制造直线/偏移枪线压力
- 抢星已落后时，不继续慢走追星，而是压星线或敌方出口

规则：

- 不能替代 L3 的超载安全检查。
- 不能为了“有压力”走进 L0/L1 判定的枪线。
- 星线压力不能把硬墙后的偏移目标误判成普通射击机会；超载未激活时应让路径、拦截或后续模块接管。

### L6 常规价值推进

对应模块：

- `tryDirectStarAdvance`
- `tryContestedStarLineHold`
- `tryLateValuePressure`

处理内容：

- 普通吃星
- 争夺星线
- 后期价值压力

规则：

- 常规价值推进不能覆盖 L0-L5。
- 如果某场输在普通路径慢，要先判断是不是 L2 星星节奏或 L1 枪线帧经济的问题，而不是直接改 `tryDirectStarAdvance`。

### L7 地形、炸弹和追击

对应模块：

- `tryBreakDirtTowardStar`
- `tryStarPath`
- `tryBombTrap`
- `tryPressureEnemy`

处理内容：

- 开土
- 路径跟随
- 炸弹近身陷阱
- 低风险追击

规则：

- 这些模块只处理后置价值，不能抢走控线、压草和抢星的优先级。

### L8 解卡和巡逻

对应模块：

- `tryUnstick`
- `patrol`

处理内容：

- 解卡
- 没有更好动作时的巡逻

规则：

- 这些模块不能覆盖 L0-L7。
- 如果走位看起来奇怪，先确认是不是上游模块持续短路导致，不要直接在 `patrol()` 里补局部特例。

## 当前主要冲突风险

1. `tryImmediateShot`、`tryOverloadCounterPressure`、`tryOverloadLineWindow` 都可能创建攻击动作。必须继续受 `canCastOverloadSafely`、`overloadAttackLaneSafe` 和枪线帧经济保护。
2. `tryStarTempoArbiter` 已拆成 frame/candidates/executor。后续新增星星节奏分支必须进入 `collectStarTempoCandidates()`，不要在调度函数里直接塞动作。
3. `tryLeadStarLineControl` 和 `tryLeadGrassControl` 有等待/控线行为。新增草丛策略时必须证明它控制星线或敌线，否则会重新变成无压制挂机。
4. `tryDodge` 已拆成 panic 前置动作和方向评分。以后若发现走位混乱，只能分别调整 `tryPanicDodgeSetup()` 或 `scoreDodgeDirection()`，不要把新特例重新塞回调度函数。
5. `tryPressureEnemy` 是兜底压力，位置很靠后。单场看到“没压制”时，不应直接加强它，先看前面的星星/草丛/超载模块为什么没有产出压力。

## 单场复盘接入方式

看到一场问题后，先标注：

- `hard-danger`: 当前弹道、超载线、破土线、隐藏射手、自炸弹。
- `gunline-frame`: 同线时该走却转向、该开火却开技能、超载后仍站线。
- `star-tempo`: 安全近星慢、强星输、追低价值远星。
- `overload-pressure`: 开超载时机错、偏移线理解错、没用掩体第二弹道。
- `grass-control`: 草位无压制、领先进草线、草丛蹲点没处理。
- `movement-cleanliness`: 无效转向、循环、进死胡同。
- `late-pressure`: 平局/落后无价值动作、后期没制造窗口。

只有当同一标签聚类出现，或单场是明确硬约束，才进入代码候选。

## 后续结构化方向

短期不要大重构。先保持行为稳定，只做文档和测试约束。

末尾顺序链已经整理成显式优先级表。下一步不要继续堆 `tryXxx()`，而是先判断问题属于哪个已有层级，再在该层级内做小范围修正。

之后如果要进一步结构化，可以让每个模块返回候选动作和理由，统一由仲裁器按优先级、帧成本、风险和价值决定。这一步必须单独开 bounded axis，不能和具体战术修复混在一起。
