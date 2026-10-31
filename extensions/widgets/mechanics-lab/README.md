# 《经典力学实验室》(`mechanics-lab`) 架构设计与扩展开发指南

## 1. 设计背景与核心目标

在少儿与青少年物理启蒙中，**基础经典力学（Classical Mechanics）** 是建立物理直觉的基石。用户与学生在学习力学时，往往需要将**受力分析、运动轨迹、速度与动量变化、机械能转化**结合起来观察。

如果将不同力学实验拆分为多个零散的小组件，学生很难建立统一的“机械能守恒与转化”认知框架；但如果把所有实验硬编码在同一个巨型组件里，每增加一个实验台就会导致状态耦合、条件分支爆炸（`if/else` 地狱），极难维护。

为此，《经典力学实验室》(`mechanics-lab`) 采用了 **“单一宿主小组件 + 零耦合插件化实验台契约 (`ExperimentBench`)”** 架构：

1. **用户体验统一**：一个组件内集成 **4 大经典力学实验台**（斜面正交分解、抛体与自由落体同屏对比、气垫导轨碰撞与动量守恒、弹簧振子简谐运动与纸带波形图），共享统一的时间轴控制（播放、暂停、单步、倍速、重置）、实时能量守恒仪表盘、物理声学合成器与多语言支持。
2. **代码彻底解耦**：**新增、修改或删除任何一个实验台，对宿主壳（`App.tsx`、`game.ts`、`sound.ts`、`style.css`）和其它实验台的源码侵入量为 0 行**。

---

## 2. 目录结构与职责边界

```text
mechanics-lab/
├── manifest.json                         # 小组件包清单 (teatak/pudding-hub/widgets/mechanics-lab)
├── assets/
│   └── icon.svg                          # 实验室矢量图标
├── test/
│   └── mechanics-lab.test.mjs            # 物理引擎精度与零耦合隔离性自动化测试
└── source/
    ├── widget.json                       # 窗口尺寸与权限配置
    └── src/
        ├── types.ts                      # 【核心】ExperimentBench<TParams, TState> 插件契约定义
        ├── text.ts                       # 宿主壳通用多语言字典 (zh-CN / zh-TW / en)
        ├── sound.ts                      # Web Audio API 物理声学合成器（碰撞/发射/平衡点滴答/命中）
        ├── game.ts                       # MCP 工具接口层（按 benchId 多态分发，零硬编码分支）
        ├── App.tsx                       # 宿主外壳 UI（顶部实验台切换、统一播放栏、参数面板、能量仪表盘）
        ├── style.css                     # 统一实验室视觉样式
        └── benches/                      # 【插件目录】所有实验台相互独立，互不引用
            ├── index.ts                  # 实验台插件注册表 (BENCH_REGISTRY)
            ├── ramp.tsx                  # 实验台 1：斜面滑块与重力正交分解 (mg·sinθ / mg·cosθ)
            ├── projectile.tsx            # 实验台 2：抛体运动与平抛/自由落体同屏对比
            ├── collision.tsx             # 实验台 3：一维气垫导轨碰撞与动量守恒 (m₁v₁ + m₂v₂)
            └── harmonic.tsx              # 实验台 4：弹簧振子简谐运动与卷轴纸带 x(t) 波形记录仪
```

---

## 3. 核心插件契约 (`ExperimentBench<TParams, TState>`)

所有实验台插件均实现 `src/types.ts` 中定义的泛型接口 `ExperimentBench<TParams, TState>`。宿主外壳只面向该接口编程，不感知任何特定实验台的物理量：

```ts
export interface ExperimentBench<
  TParams extends BenchParamsRecord = BenchParamsRecord,
  TState extends BenchSimState = BenchSimState,
> {
  /** 实验台唯一标识符（如 'ramp' | 'projectile' | 'collision' | 'harmonic'） */
  readonly id: string;
  /** 顶部切换栏图标（SVG 标识或 Emoji） */
  readonly icon: string;
  /** 主题强调色（用于滑块、能量高亮与实验台徽章） */
  readonly accentColor: string;
  /** 实验台多语言名称 */
  readonly title: LocalizedText;
  /** 实验台一句话副标题 */
  readonly subtitle: LocalizedText;
  /** 核心物理公式与原理解析卡片文案 */
  readonly formulaSummary: {
    readonly equation: string;
    readonly explanation: LocalizedText;
  };
  /** 可调节物理参数声明列表（宿主自动渲染滑块与单位） */
  readonly paramSpecs: readonly BenchParamSpec[];
  /** 经典教学预设场景列表（宿主自动渲染一键预设胶囊） */
  readonly presets: readonly BenchPresetSpec<TParams>[];

  /** 返回默认物理参数 */
  getDefaultParams(): TParams;
  /** 根据当前参数生成初始仿真状态 (t = 0) */
  createInitialState(params: TParams): TState;
  /** 纯函数物理步进：推进 dt 秒，返回新状态与可选物理音效事件 */
  step(params: TParams, state: TState, dt: number): BenchStepResult<TState>;
  /** 计算当前时刻的能量分解（动能 Ek、势能 Ep、耗散热能 Q、总能量 E_total） */
  computeEnergy(params: TParams, state: TState): EnergyBreakdown;
  /** 生成右侧/底部实时物理遥测读数卡片 */
  getTelemetry(params: TParams, state: TState, locale: LocaleKey): readonly TelemetryItem[];
  /** 可选：采样时域波形点（宿主自动在底部渲染实时示波器/纸带记录仪） */
  sampleWaveform?(params: TParams, state: TState): WaveformSample;
  /** 专属 SVG 交互实验台画布渲染组件 */
  readonly StageComponent: React.FC<BenchStageProps<TParams, TState>>;
}
```

### 为什么这套契约能保证“增加实验台不影响其它实验台”？

1. **命名空间按 `bench.id` 严格隔离**：
   在持久化状态 `LabPersistedState` 中，每个实验台的参数、瞬态仿真状态和波形缓存分别存储在 `paramsByBench[bench.id]`、`stateByBench[bench.id]` 和 `waveformByBench[bench.id]` 独立槽位下。用户在“斜面实验台”把摩擦系数调到最大，或暂停在半山腰，切换到“碰撞实验台”做实验后再切回来，斜面实验台依然保持原样。
2. **宿主自动向后兼容升级 (`readLabPersistedState`)**：
   当未来版本向 `BENCH_REGISTRY` 新增第 5、第 6 个实验台时，老用户的存档里没有新实验台的键；`game.ts` 中的 `readLabPersistedState()` 会先用 `createDefaultLabState()` 为所有已注册实验台生成默认槽位，再按 `bench.id` 增量合并历史存档，不会出现空指针或存档失效。
3. **纯函数物理步进 (`step`)**：
   每个实验台的 `step(params, state, dt)` 都是无副作用纯函数，连触发的音效都以声明式的 `soundEvents: ["collision", "targetHit"]` 返回给宿主统一调度，彻底杜绝了定时器泄漏和跨组件副作用。

---

## 4. 四大经典力学实验台物理模型说明

| 实验台 ID | 名称 | 核心物理定律与公式 | 教学亮点与交互特色 |
| :--- | :--- | :--- | :--- |
| `ramp` | **斜面与受力分解** | $a = g(\sin\theta - \mu\cos\theta)$<br>静摩擦自锁：$\tan\theta \le \mu$ | 实时绘制重力 $mg$、平行下滑分力 $mg\sin\theta$、垂直压紧分力 $mg\cos\theta$、支持力 $N$ 与摩擦力 $f$ 五大矢量箭头；支持开关正交分解虚线平行四边形；精确计算摩擦生热 $Q = f \cdot s$ 并展示机械能向内能转化。 |
| `projectile` | **抛体与自由落体** | $x(t) = v_0\cos\theta \cdot t$<br>$y(t) = h_0 + v_0\sin\theta \cdot t - \frac{1}{2}gt^2$ | 当发射角设为 $\theta = 0^\circ$（平抛）且无风阻时，左侧同步释放一颗**自由落体对比参考球**，并绘制实时等高水平虚线，直观证明“平抛运动的竖直分运动就是自由落体运动”；内置频闪相机残影与靶心命中判定。 |
| `collision` | **碰撞与动量守恒** | $m_1 v_1 + m_2 v_2 = m_1 v_1' + m_2 v_2'$<br>$e = -\frac{v_2' - v_1'}{v_2 - v_1} \in [0, 1]$ | 支持连续调节恢复系数 $e$（从 $e=1$ 完全弹性碰撞到 $e=0$ 完全非弹性粘连碰撞）；内置碰撞前后总动量对比条与机械能损耗 $\Delta E_{\text{loss}}$ 读数；涵盖“等质量速度交换”、“以小博大反弹”等经典题型。 |
| `harmonic` | **简谐运动与弹簧振子** | $F = -kx - cv$<br>$T = 2\pi\sqrt{\frac{m}{k}}$ | 真实绘制随压缩/拉伸动态形变的锯齿弹簧、回复力 $F=-kx$ 与速度 $v$ 相位差矢量；无阻尼时采用解析解消除欧拉积分漂移，底部内置实时滚动的 **$x(t)$ 纸带波形记录仪**。 |

---

## 5. 三步新增第 5 个实验台（例如：单摆实验台 `pendulum`）

未来如果要升级加入第 5 个实验台（例如**单摆周期与小角度近似实验台 `pendulum`**），只需 3 步，**无需修改任何现有实验台或宿主文件**：

### 第一步：新建 `source/src/benches/pendulum.tsx`
在该文件中定义 `PendulumParams`（摆长 $L$、摆球质量 $m$、初始摆角 $\theta_0$、阻尼 $c$）与 `PendulumState`（当前角位移 $\theta$、角速度 $\omega$），并导出 `pendulumBench: ExperimentBench<PendulumParams, PendulumState>`。

### 第二步：在 `source/src/benches/index.ts` 注册一行代码
打开 `source/src/benches/index.ts`，导入 `pendulumBench` 并追加到 `BENCH_REGISTRY` 数组末尾：

```ts
import { rampBench } from "./ramp";
import { projectileBench } from "./projectile";
import { collisionBench } from "./collision";
import { harmonicBench } from "./harmonic";
import { pendulumBench } from "./pendulum"; // 新增导入

export const BENCH_REGISTRY: readonly ExperimentBench<any, any>[] = [
  rampBench,
  projectileBench,
  collisionBench,
  harmonicBench,
  pendulumBench, // 一行注册，宿主自动渲染切换标签、参数滑块、能量条与 MCP 接口！
];
```

### 第三步：运行自动化测试
执行 `node test/mechanics-lab.test.mjs`，验证新实验台的能量守恒与契约完整性即可发布新版本。
