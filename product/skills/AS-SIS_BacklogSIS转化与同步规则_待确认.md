# AS-SIS Backlog↔SIS 转化与同步规则

> 版本：v0.1.0
> 资产归类：产品资产 -> SKILL 能力规则
> 对应 Backlog：`D4` Backlog↔SIS 语义转换验证 / `D5` backlog->sis 转化规则 / `D6` sis->backlog 转化规则 / `D7` 追问与纠偏机制 / `D8` 状态同步与版本管理
> 作用：定义 Aida 创建 SIS、验证 SIS 完整性、同步 Backlog 状态的行为规则，确保 Backlog 与 SIS 双向转换语义不失真。
> 依赖文档：[SIS 标准模板](../templates/SIS标准模板_待确认.md)

---

## 1. 设计目标

SIS 是 AI 执行任务的唯一输入载体。本规则确保：

1. 每个 Backlog Story 都能转化为一个完整的 SIS
2. AI 只依赖 SIS + 上下文（PCB/规则/记忆系统）即可完成任务
3. SIS 的任何状态变更即时同步到 Backlog，保证 Backlog 始终是全局实时状态看板
4. 多个子 agent 并行执行不同 SIS 时，Aida 通过 Backlog 掌控全局不混乱

---

## 2. 什么时候调用

### 2.1 触发创建 SIS 的场景

| 场景 | 触发时机 | 说明 |
|------|---------|------|
| Planning 阶段 | PO 锁定正式输入后 | Aida 为每个正式输入 Backlog Story 创建对应 SIS |
| 新 Story 进入执行 | Sprint 执行中启动下一个任务时 | 从 manifest 任务清单取下一个 pending 项，创建 SIS |

### 2.2 触发同步的场景

| 场景 | 触发时机 | 说明 |
|------|---------|------|
| SIS stage 变更 | 任何 stage 字段变化后 | 即时同步到 Backlog |
| SIS priority 变更 | 优先级调整后 | 即时同步到 Backlog |
| SIS 任务范围变更 | 输入/输出契约或验收标准被修改后 | 即时同步 Backlog 描述 |
| SIS 遇到阻塞 | stage 变为 blocked 后 | 即时标记 Backlog |
| SIS 验收完成 | stage 变为 done 或 review 后 | 即时更新 Backlog checkbox |

### 2.3 不创建 SIS 的场景

- Backlog Story 处于候补或暂缓状态时不创建 SIS
- PO 未确认的 Story 不创建 SIS
- 已归档的 Story 不创建 SIS

---

## 3. 如何创建 SIS（Backlog -> SIS）

### 3.1 创建流程

```
1. 读取 Backlog Story
   -> 获取 Story ID、名称、优先级、描述

2. 读取上下文
   -> 从 PCB 获取项目背景
   -> 从 context_cache 获取相关规则摘要
   -> 从 AS 系列获取适用规则
   -> 从 Sprint 启动文档获取 DoD 要求

3. 生成 SIS 草稿
   -> 填写 6 个 Frontmatter 字段
   -> 填写 5 个正文章节
   -> 若无法全部填写，标记"待补充"

4. PO 确认
   -> PO 审核 SIS 草稿
   -> 通过：stage 改为 active，同步 Backlog 为"已排期"
   -> 不通过：修改后重新审核
   -> 待补充：Backlog 标记"未确认"，Planning 中向 PO 询问或留待后续
```

### 3.2 各章节填写规则

**Frontmatter 字段填写**：

| 字段 | 来源 | 填写规则 |
|------|------|---------|
| `sis_id` | Story ID | 格式 `SIS-{StoryID}`，如 `SIS-AS6` |
| `related_backlog_id` | Backlog Story | 直接取 Story ID，如 `AS-6` |
| `priority` | Backlog Story | 直接取 Backlog 中的优先级 |
| `stage` | Aida 设定 | 新建时固定为 `draft` |
| `status` | Aida 设定 | 新建时固定为 `pending` |
| `linked_skills` | Aida 分析 | 根据任务类型匹配适用的 AS 规则 |

**正文章节填写**：

| 章节 | 来源 | 填写规则 |
|------|------|---------|
| 任务目标 | Aida 分析 | 从 Backlog 描述 + PCB 推导，区分必须/建议/不做 |
| 人类意图 | PO 输入 | 从 Planning 会议记录中提取 PO 原话，不做加工 |
| 输入/输出契约 | Aida 分析 | 从任务类型 + 规则推导输入材料和输出产物 |
| 边界与约束 | Aida 分析 | 从 G5 规则 + 职责边界 + 任务特性推导 |
| 验收标准 | Aida + PO | Aida 从 Sprint 启动文档提取 DoD，PO 补充确认 |

---

## 4. 如何判断 SIS 完整性

### 4.1 完整性检查清单

SIS 创建后，Aida 必须逐项检查以下条件。任何一项不满足，标记为"待补充"：

| # | 检查项 | 判定标准 |
|---|--------|---------|
| 1 | `sis_id` 已填写 | 非空，格式正确 |
| 2 | `related_backlog_id` 已填写 | 非空，Backlog 中存在对应 Story |
| 3 | `priority` 已填写 | 值为 P0/P1/P2 之一 |
| 4 | `stage` 已填写 | 值为合法阶段之一 |
| 5 | `status` 已填写 | 值为合法状态之一 |
| 6 | 任务目标非空 | 至少有"必须完成"项 |
| 7 | 人类意图非空 | 有 PO 的原始表达 |
| 8 | 输入/输出契约非空 | 至少定义了输出和输出位置 |
| 9 | 边界与约束非空 | 至少定义了"不能改"项 |
| 10 | 验收标准非空 | 至少有 1 个可验证的检查项 |

### 4.2 不完整的处理

- 标记 SIS `stage` 为 `draft`，`status` 为 `pending`
- 同步 Backlog Story 状态为"未确认"
- 在 Planning 阶段向 PO 询问缺失信息
- 若 PO 也无法提供，留待后续，Backlog Story 保持"未确认"状态
- "未确认"的 Story 不进入执行

---

## 5. 如何同步 Backlog 状态（SIS -> Backlog）

### 5.1 同步原则

- **即时**：SIS 状态变更后立即同步，不批量、不延迟
- **单向触发**：SIS 变更触发 Backlog 更新，不由 Backlog 反向触发 SIS
- **保留链接**：Backlog 中始终保留对 SIS 的引用

### 5.2 同步映射表

| SIS 变化 | Backlog 同步动作 | 具体格式 |
|---------|----------------|---------|
| stage: draft -> active | 状态改为"已排期" | `- [ ] P0 Story XXX：描述（已排期）` |
| stage: active -> in_progress | 状态改为"执行中" | `- [ ] P0 Story XXX：描述（执行中）` |
| stage: in_progress -> review | 状态改为"待审查" | `- [ ] P0 Story XXX：描述（待审查）` |
| stage: review -> done | checkbox 打勾 + 日期 | `- [x] P0 Story XXX：描述（已完成 YYYY-MM-DD）` |
| stage: * -> blocked | 标记阻塞 | `- [ ] P0 Story XXX：描述（阻塞：{原因}）` |
| priority 变更 | 更新优先级标记 | `- [ ] P{新优先级} Story XXX：描述` |
| 任务范围变更 | 更新描述 | `- [ ] P0 Story XXX：{新描述}` |
| 验收未通过 | 标记未通过 | `- [ ] P0 Story XXX：描述（验收未过：{原因}）` |

### 5.3 同步操作流程

```
1. SIS 文件被修改（Aida 或子 agent 执行后回写）
2. Aida 检测到 SIS stage/status/priority/scope 变化
3. 根据"同步映射表"确定 Backlog 更新动作
4. 更新 Backlog 中对应 Story 行
5. 在 SIS 审计日志中记录本次同步
6. 更新 context_cache 中 Backlog 条目为 stale（按 AS-6 批量刷新规则）
```

---

## 6. 双向转换语义保真验证

### 6.1 正向验证（Backlog -> SIS）

验证 SIS 是否完整保留了 Backlog Story 的语义：

| 检查项 | 验证方法 |
|--------|---------|
| Story ID 保留 | SIS `related_backlog_id` == Backlog Story ID |
| 优先级保留 | SIS `priority` == Backlog 优先级 |
| 任务语义保留 | SIS 任务目标涵盖 Backlog 描述的核心含义 |
| 无信息丢失 | SIS 5 个章节均非空（或已标记"待补充"） |

### 6.2 反向验证（SIS -> Backlog）

验证 Backlog 是否准确反映了 SIS 的当前状态：

| 检查项 | 验证方法 |
|--------|---------|
| 状态一致 | Backlog 状态标记 == SIS stage 对应状态 |
| 优先级一致 | Backlog 优先级 == SIS `priority` |
| 描述一致 | Backlog 描述反映 SIS 当前任务范围 |
| 完成标记一致 | Backlog checkbox == (SIS stage == done) |

### 6.3 不失真的判定标准

当且仅当以下条件全部满足时，判定为"语义不失真"：

1. 正向验证 4 项全部通过
2. 反向验证 4 项全部通过
3. SIS 完整性检查 10 项全部通过
4. Backlog 中该 Story 的状态与 SIS 的 stage 一致

---

## 7. 追问与纠偏机制

### 7.1 何时追问

- SIS 完整性检查不通过时，向 PO 追问缺失信息
- SIS 执行中发现任务范围需要扩大时，向 PO 确认
- SIS 验收标准模糊不可验证时，向 PO 追问具体标准

### 7.2 追问规则

- 只允许一轮追问（与 AS-3 一轮追问规则一致）
- 追问后必须收束为明确的状态判断：补充完成 / 仍待补充
- 仍待补充的 SIS 对应 Backlog 保持"未确认"

### 7.3 纠偏场景

| 场景 | 纠偏动作 |
|------|---------|
| SIS 执行中发现 Backlog 描述与实际任务不符 | 更新 SIS 任务目标，同步 Backlog 描述 |
| SIS 验收标准过于宽松或严格 | 更新 SIS 验收标准，同步 Backlog |
| SIS 执行中发现需要调整优先级 | 向 PO 确认后更新 SIS priority，同步 Backlog |
| SIS 被判定为不可执行 | stage 改为 blocked，同步 Backlog，退回 Planning |

---

## 8. SIS 文件管理

- **存放位置**：`project/sis/`
- **命名规则**：`SIS-{StoryID}-{简短描述}.md`
- **创建时机**：Planning 阶段 PO 锁定正式输入后
- **归档时机**：项目级归档时移到 `archive/`
- **版本管理**：SIS 修改时更新 `updated_at`，重大变更在文件内追加变更记录

---

## 9. 与其他规则的关系

| 关联文档 | 关系 |
|---------|------|
| SIS 标准模板 | 本规则使用模板定义的结构 |
| AS-3 会议表单接收与一轮追问 | SIS 追问复用 AS-3 的一轮追问规则 |
| AS-4 会议结论分流沉淀 | Planning 结论分流时触发 SIS 创建 |
| AS-5 会后回写与通知 | SIS 状态变更同步复用 AS-5 的回写机制 |
| AS-6 按需资产装载 | SIS 执行时通过 M9 按需装载上下文 |
| AS-11 审计日志规则 | SIS 创建、变更、同步均记录审计日志 |
| SKILL 第 12 节 | 阶段驱动自主行为中，Sprint In Progress 阶段触发 SIS 创建和同步 |
| manifest 装载清单 | SIS 不进入 manifest 装载清单（是运行时按需创建的） |

---

## 10. 当前不做什么

- 不做 SIS 的自动执行引擎（待子 agent 派发能力实现）
- 不做 SIS 的可视化渲染（待 Panel 实现时覆盖）
- 不做 SIS 的多版本 diff 对比（当前只保留最新版）
- 不做 SIS 的跨项目复用（SIS 是项目级建设资产）

---

## 11. 结论

SIS 是 AidaPulse 框架中连接人类意图和 AI 执行的核心桥梁。Backlog 是 PO 管理的概览看板，SIS 是 AI 执行的详细输入。两者一一对应、即时同步，确保：

1. PO 只需要管理 Backlog 的优先级和状态
2. AI 只需要读取 SIS 就能知道做什么、怎么做、怎么算完成
3. Aida 通过即时同步确保 Backlog 始终反映所有 SIS 的实时状态
4. 未来多个子 agent 并行执行时，Aida 通过 Backlog 全局掌控不混乱
