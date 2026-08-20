# AS-6-Cache context_cache 结构设计

> 版本：v0.1.0
> 资产归类：产品资产 -> SKILL 能力规则
> 对应 Backlog：`AS-6-Cache` context_cache 结构设计
> 作用：定义 `memory/context_cache.md`（L2.5 上下文缓存）的文件结构、缓存规则、生命周期管理，为 AS-6 按需装载能力提供缓存层支撑。
> 上级文档：[AidaPulse 白皮书 v0.1.0](../whitepaper/AidaPulse白皮书_待确认.md) 第 8 节、[AS-9 模块分层与编排](AS-9_模块分层与编排_待确认.md) 第 5 节

---

## 1. 设计目标

context_cache.md 解决一个核心矛盾：**Aida 需要理解项目全貌才能正确工作，但每次会话都全文装载所有核心文档会快速耗尽上下文预算。**

context_cache 通过以下方式化解这个矛盾：

1. **预压缩**：将大文档提炼为结构化摘要，每个条目控制在可预测的 token 范围内
2. **按需命中**：新会话恢复时先读缓存摘要，仅在需要细节时再回源全文
3. **失效感知**：通过 `last_updated` 时间戳和源文件修改时间对比，判断缓存是否过期

---

## 2. 在记忆系统中的定位

> ✅ 对齐审查结论（2026-08-12）：已与白皮书 8.2 四层记忆模型、C-A2 最小记忆系统设计核对——L2.5 为官方定义层级（白皮书 8.2："L2.5 | memory/context_cache.md | 上下文缓存"；C-A2 第 6 节标题即"L2.5：精简上下文缓存"），本表层级定义与官方一致，无需修正。

| 层级 | 文件 | 职责 | 本文件关系 |
|------|------|------|-----------|
| L1 | `manifest.md` | 恢复清单，定义装载顺序 | manifest 的第 4 项装载目标 |
| L2 | `state.md` | 当前状态快照 | state 引用缓存命中状态 |
| **L2.5** | **`context_cache.md`** | **关键文档精简摘要** | **本文件** |
| L3 | `decisions.md` | 跨会话决策日志 | decisions 不进入缓存（本身已足够精简） |

### 2.1 与 manifest 装载顺序的关系

manifest 的按序装载清单中，context_cache 位于第 4 位（在 state 和 decisions 之后，SKILL 之前）：

```
1. manifest.md      -> 恢复清单本身
2. state.md         -> 当前状态
3. decisions.md     -> 关键决策
4. context_cache.md -> 文档摘要缓存（本文件）
5. SKILL            -> 执行载体
6+. 其他产品/建设资产
```

### 2.2 与 AS-6 的关系

- **AS-6-Cache（本文档）**：定义缓存的结构、规则和生命周期--即"缓存长什么样、怎么用"
- **AS-6**：实现 M9 资产装载模块--即"谁来读写缓存、怎么按需装载"

---

## 3. 文件结构

`memory/context_cache.md` 的标准结构如下：

```markdown
# Context Cache（上下文缓存）

> 用途：存储关键文档的精简摘要，减少新会话恢复时的全文装载开销。
> 层级：L2.5
> 版本：v0.1.0
> 最后更新：{YYYY-MM-DD}
> 更新者：Aida v0.1.0

---

## 缓存状态

| 字段 | 值 |
|------|-----|
| `total_entries` | {N} |
| `last_full_refresh` | {YYYY-MM-DD} |
| `cache_hit_rate` | {上次会话命中率，初始为 N/A} |

---

## 缓存条目

### entry-001: 白皮书

- `source`：`product/whitepaper/AidaPulse白皮书_待确认.md`
- `last_updated`：{YYYY-MM-DD}
- `source_size`：{约 N 行}
- `summary`：
  {结构化摘要，≤500 tokens}

### entry-002: PCB

- `source`：`project/pcb/项目背景蓝图_待确认.md`
- `last_updated`：{YYYY-MM-DD}
- `source_size`：{约 N 行}
- `summary`：
  {结构化摘要，≤500 tokens}

### entry-003: SKILL

- `source`：`product/agents/aida/Aida_v0.1.0_SKILL_待确认.md`
- `last_updated`：{YYYY-MM-DD}
- `source_size`：{约 N 行}
- `summary`：
  {结构化摘要，≤500 tokens}

### entry-004: 工作流图与检查表

- `source`：`product/agents/aida/工作流图与检查表_待确认.md`
- `last_updated`：{YYYY-MM-DD}
- `source_size`：{约 N 行}
- `summary`：
  {结构化摘要，≤500 tokens}

### entry-005: 会议治理总规则

- `source`：`product/rules/会议治理总规则_待确认.md`
- `last_updated`：{YYYY-MM-DD}
- `source_size`：{约 N 行}
- `summary`：
  {结构化摘要，≤300 tokens}

### entry-006: Aida 职责边界总规则

- `source`：`product/rules/Aida职责边界总规则_待确认.md`
- `last_updated`：{YYYY-MM-DD}
- `source_size`：{约 N 行}
- `summary`：
  {结构化摘要，≤300 tokens}

### entry-007: G5 流程守门与阻断机制

- `source`：`product/rules/G5_流程守门与阻断机制_待确认.md`
- `last_updated`：{YYYY-MM-DD}
- `source_size`：{约 N 行}
- `summary`：
  {结构化摘要，≤300 tokens}

### entry-008: AS 系列能力规则汇总

- `sources`：
  - `AS-1_阶段识别与流程守门_待确认.md`
  - `AS-2_会前检查与会前辅助包_待确认.md`
  - `AS-3_会议表单接收与一轮追问_待确认.md`
  - `AS-4_会议结论分流沉淀_待确认.md`
  - `AS-5_会后回写与通知_待确认.md`
  - `AS-9_模块分层与编排_待确认.md`
  - `AS-10_原型工作流_待确认.md`
  - `AS-11_审计日志规则_待确认.md`
  - `AS-12_审查规范_待确认.md`
- `last_updated`：{YYYY-MM-DD}
- `summary`：
  {每个 AS 用 1-2 句话概括核心能力，总≤500 tokens}

### entry-009: Product Backlog

- `source`：`project/backlog/Product_Backlog.md`
- `last_updated`：{YYYY-MM-DD}
- `summary`：
  {Epic 清单 + 已完成/进行中/待办的 Story 计数}

### entry-010: 当前 Sprint 启动文档

- `source`：`project/sprint/Sprint_D_启动收口.md`
- `last_updated`：{YYYY-MM-DD}
- `summary`：
  {Sprint 目标 + 正式输入 + 执行顺序 + 当前进度}
```

---

## 4. 摘要编写规则

### 4.1 摘要必须包含的信息

每个缓存条目的摘要必须回答以下问题（按文档类型有所侧重）：

**规则类文档**（治理规则、AS 系列）：
- 这条规则管什么
- 关键约束是什么（允许什么、禁止什么、阻断什么）
- 有哪些例外条件

**载体类文档**（SKILL、工作流图）：
- 核心执行步骤是什么
- 关键决策点在哪里
- 输入输出契约是什么

**项目类文档**（PCB、Backlog、Sprint）：
- 当前项目/Sprint 的核心目标是什么
- 当前进度如何
- 下一步是什么

### 4.2 摘要禁止包含的信息

- 完整的表格数据（只保留结构和关键值）
- 示例和说明性文字
- 重复的标题和分隔线
- 已过期的历史信息

### 4.3 token 预算

| 文档类型 | 单条目上限 |
|---------|-----------|
| 白皮书 | 500 tokens |
| PCB | 400 tokens |
| SKILL | 500 tokens |
| 工作流图 | 300 tokens |
| 治理规则（每个） | 300 tokens |
| AS 系列（汇总） | 500 tokens |
| Backlog | 300 tokens |
| Sprint 文档 | 300 tokens |
| **总计上限** | **~3500 tokens** |

---

## 5. 缓存生命周期

### 5.1 何时读取缓存

新会话恢复时，在 manifest 装载顺序的第 4 步读取 context_cache.md。

读取后的行为：

1. 逐条检查 `last_updated` 与源文件实际修改时间
2. 若源文件更新于 `last_updated`，标记该条目为 `stale`
3. `stale` 条目仍可使用，但 Aida 应在需要精确信息时回源全文
4. 若整个缓存文件不存在，回退到 manifest 的完整装载流程（无缓存模式）

### 5.2 何时写入/更新缓存

以下场景触发缓存更新：

| 场景 | 更新范围 |
|------|---------|
| 源文件被修改后（Aida 执行回写后） | 更新对应条目 |
| 新会话恢复时发现 stale 条目 | 回源全文后更新对应条目 |
| 新文档首次进入装载清单 | 新增缓存条目 |
| 文档从装载清单移除 | 删除对应缓存条目 |
| Aida 主动判断摘要已过时 | 全量刷新 |

### 5.3 缓存失效判定

缓存条目是否有效通过以下规则判定：

```
IF source_file 不存在
    -> 删除该条目
ELSE IF source_file.last_modified > entry.last_updated
    -> 标记为 stale，可继续使用但需注意
ELSE
    -> 条目有效，可直接使用
```

### 5.4 缓存缺失时的回退策略

当 context_cache.md 不存在或为空时：

1. 不阻断恢复流程
2. 跳过缓存步骤，直接按 manifest 装载顺序逐个读取全文
3. 在装载完成后，Aida 自动生成首次缓存

---

## 6. 与 manifest 装载流程的集成

### 6.1 有缓存时的装载流程

```
1. 读取 manifest.md
   -> 获取当前状态、任务、装载清单
2. 读取 state.md
   -> 获取状态快照
3. 读取 decisions.md
   -> 获取近期决策
4. 读取 context_cache.md
   -> 获取所有缓存摘要
   -> 标记 stale 条目
5. 读取 SKILL（全文）
   -> SKILL 是执行载体，不使用缓存，必须全文装载
6. 对 manifest 清单中剩余资产：
   -> 若缓存命中且非 stale，跳过全文装载
   -> 若缓存 miss 或 stale，按需全文装载
```

### 6.2 无缓存时的装载流程

```
1. 读取 manifest.md
2. 读取 state.md
3. 读取 decisions.md
4. context_cache.md 不存在 -> 跳过
5. 按 manifest 装载顺序逐个读取全文
6. 装载完成后，生成首次 context_cache.md
```

### 6.3 上下文预算不足时的降级策略

当上下文预算紧张时，按以下优先级保留：

| 优先级 | 保留内容 | 说明 |
|--------|---------|------|
| P0 | manifest + state + decisions | 恢复最小状态必须 |
| P1 | SKILL 全文 | 执行载体不可省略 |
| P2 | context_cache 全部摘要 | 用摘要替代全文 |
| P3 | 工作流图全文 | 阶段判断需要 |
| P4 | 治理规则全文 | 仅在需要精确判断时回源 |
| P5 | Backlog 全文 | 仅在需要更新状态时回源 |
| P6 | AS 系列全文 | 仅在执行特定能力时回源 |

---

## 7. 模块级上下文按需装载规则

context_cache 提供的是**全局级**的文档摘要。在此基础上，AS-6 的 M9 模块还负责**模块级**的按需装载。

### 7.1 模块级装载原则

引用 AS-9 第 5.2 节的定义：每个模块只应获得完成当前任务所需的最小信息。

### 7.2 模块级上下文提取规则

当某个工作模块（M1-M14）被激活时，M9 从缓存或全文中提取该模块所需的特定字段：

| 模块 | 需要的上下文 | 来源 |
|------|------------|------|
| M1 阶段识别 | 当前阶段、阶段定义、阻断条件 | state + G5 + AS-1 |
| M2 会前检查 | 会议类型、当前阶段、输入清单 | state + AS-2 |
| M4 表单接收 | 当前表单、校验规则 | 输入 + AS-3 |
| M5 追问 | 当前表单、缺口字段、追问规则 | 输入 + AS-3 |
| M6 结论分流 | 会议结论、分流规则、Backlog 引用 | 输入 + AS-4 + Backlog |
| M7 会后回写 | 分流结果、回写目标、Backlog 当前状态 | M6 输出 + AS-5 + Backlog |
| M8 通知 | 通知对象、通知内容、通知模板 | M7 输出 + AS-5 + 通知模板 |
| M12 DoD 评估 | DoD 定义、实际产出 | Sprint 文档 + 交付物 |

### 7.3 模块级上下文不共享

引用 AS-9 第 5.4 节：模块间的推理过程、历史会议详情、无关项目背景、内部判断草稿不共享。

---

## 8. context_cache.md 维护规则

### 8.1 维护责任

- **写入者**：Aida v0.1.0（自动维护）
- **审查者**：PO（可在 Review 时检查缓存质量）
- **不需要 PO 手动维护**

### 8.2 更新频率

- 每次会话恢复时检查一次（读取时）
- 每次源文件被修改后更新对应条目（写入时）
- 不需要定时刷新

### 8.3 版本兼容

- context_cache.md 的结构版本号与本文件（AS-6-Cache 设计文档）的版本号对应
- 若 AS-6-Cache 设计文档升级，context_cache.md 需在下次会话恢复时按新结构重建

---

## 9. 当前阶段不做什么

- 不做自动的文档变更检测（依赖 Aida 在回写时主动更新）
- 不做缓存压缩算法优化（用固定 token 上限控制）
- 不做多版本缓存（只保留最新一份）
- 不做跨项目的缓存复用（context_cache 是项目级记忆）
- 不把 decisions.md 纳入缓存（本身已足够精简）

---

## 10. 与后续条目的关系

- **AS-6**：实现 M9 资产装载模块，使用本文件定义的缓存结构
- **验证-1**：新会话恢复验证将测试缓存命中和回退流程
- **AS-9**：本文件遵循 AS-9 第 5 节定义的上下文边界设计
- **manifest.md**：本文件在 manifest 装载清单中位于第 4 位

---

## 11. 结论

context_cache 是 Aida 上下文管理的"性价比层"：用最小的存储成本（~3500 tokens），覆盖最大范围的项目上下文理解需求。它不是全文的替代品，而是全文的"目录索引+摘要"--让 Aida 在需要细节时知道去哪里找，在不需要细节时不被冗余信息淹没。
