# SIS 标准模板（结构化指令集）

> 版本：v0.1.0
> 资产归类：产品资产 -> 标准模板
> 作用：定义 AidaPulse 框架中 SIS（Structured Instruction Set，结构化指令集）的标准结构。SIS 是框架的主要任务数据形式，与 Backlog 一一对应，是 AI 执行任务的唯一输入载体。
> 设计原则：AI 只依赖 SIS + 上下文（PCB/规则/记忆系统）即可完成任务，不需要长会话历史。

---

## 1. SIS 与 Backlog 的关系

- 每个 Backlog Story 对应且仅对应一个 SIS
- Backlog 是人类侧概览视图（PO 管理优先级和状态）
- SIS 是 AI 侧执行视图（包含完成任务所需的全部信息）
- 两者通过 `sis_id` 和 `related_backlog_id` 双向链接
- 任何 SIS 状态变更，即时同步到 Backlog

---

## 2. SIS 标准结构

一个 SIS 文件由两部分组成：

1. YAML Frontmatter：机器优先读取的元数据（6 个字段）
2. Markdown 正文：人机共读的任务信息（5 个章节）

### 2.1 Frontmatter 标准字段

```yaml
---
sis_id: SIS-{StoryID}
related_backlog_id: {Story ID}
priority: P0|P1|P2
stage: draft|active|in_progress|review|done|blocked|archived
status: pending|confirmed|executing|completed|failed
linked_skills:
  - {Skill 名称或路径}
---
```

### 2.2 Frontmatter 字段说明

| 字段 | 必填 | 说明 |
|------|------|------|
| `sis_id` | 是 | SIS 唯一标识，格式 `SIS-{StoryID}`，与 Backlog Story ID 直接对应 |
| `related_backlog_id` | 是 | 关联的 Backlog Story ID，建立双向链接 |
| `priority` | 是 | 优先级，与 Backlog 保持一致 |
| `stage` | 是 | 当前流程阶段：draft(草稿) -> active(已确认) -> in_progress(执行中) -> review(待审查) -> done(已完成) / blocked(阻塞) |
| `status` | 是 | 执行状态：pending(待执行) / confirmed(已确认) / executing(执行中) / completed(已完成) / failed(未通过) |
| `linked_skills` | 否 | 依赖的 Skill 名称或路径 |

### 2.3 Markdown 正文标准章节

```md
# SIS：{任务名称}

## 1. 任务目标

## 2. 人类意图

## 3. 输入 / 输出契约

## 4. 边界与约束

## 5. 验收标准
```

---

## 3. 章节说明

### 3.1 任务目标

用 2-3 句话说明：做什么、为什么做、预期结果是什么。

区分：
- 必须完成
- 建议完成
- 当前不做

### 3.2 人类意图

保留 PO 的原始表达，避免任务在结构化过程中丢失真实诉求。PO 口述或书写的原话，不做加工。

### 3.3 输入 / 输出契约

必须定义：
- **输入**：执行本任务需要什么材料、数据、上下文
- **输出**：执行完成后产出什么文件、数据、状态变更
- **输出位置**：产出物存放在哪个路径

这是 AI 能否独立完成任务的关键章节。

### 3.4 边界与约束

明确：
- 什么可以改
- 什么不能改
- 必须遵守的规则
- 不允许越过的决策边界

### 3.5 验收标准

定义完成条件（即 DoD），至少包括：
- 交付物是否完整
- 是否满足可读性与可解析性
- 是否能进入下一阶段

验收标准必须可验证，不能是模糊描述。

---

## 4. 最小可用 SIS 模板

```md
---
sis_id: SIS-{StoryID}
related_backlog_id: {Story ID}
priority: P0
stage: draft
status: pending
linked_skills:
  - {Skill}
---

# SIS：{任务名称}

## 1. 任务目标

{做什么、为什么、预期结果}

- 必须完成：
- 建议完成：
- 当前不做：

## 2. 人类意图

{PO 原话}

## 3. 输入 / 输出契约

- 输入：
- 输出：
- 输出位置：

## 4. 边界与约束

- 可以改：
- 不能改：
- 必须遵守：

## 5. 验收标准

- [ ] {可验证的完成条件 1}
- [ ] {可验证的完成条件 2}
```

---

## 5. SIS 生命周期

| 阶段 | SIS stage | SIS status | Backlog 状态 | 触发条件 |
|------|-----------|-----------|-------------|---------|
| Planning 中创建 | draft | pending | 未确认 | Aida 根据 Backlog Story 生成 SIS 草稿 |
| PO 确认 | active | confirmed | 已排期 | PO 审核 SIS 草稿通过 |
| 执行中 | in_progress | executing | 执行中 | Aida 或子 agent 开始执行 |
| 执行完成 | review | executing | 待审查 | 执行完毕，等待 DoD 评估 |
| 验收通过 | done | completed | ✅ 已完成 | DoD 评估全部通过 |
| 验收未过 | blocked | failed | 阻塞 | DoD 评估存在未通过项 |

### 5.1 SIS 创建规则

- Aida 在 Planning 阶段根据 Backlog Story + PCB + 规则生成 SIS 草稿
- 若 6 个 Frontmatter 字段无法全部填写，标记为"待补充"
- "待补充"的 SIS 对应的 Backlog Story 标记为"未确认"
- Planning 阶段 Aida 向 PO 询问补充信息，或留待后续决定

### 5.2 SIS -> Backlog 同步规则

任何 SIS 状态变更，即时同步到 Backlog：

| SIS 变化 | Backlog 同步动作 |
|---------|----------------|
| stage 变化 | 更新 Backlog 状态标记 |
| priority 变化 | 更新 Backlog 优先级 |
| 任务范围变更 | 更新 Backlog 描述 |
| 遇到阻塞 | Backlog 标记阻塞 |
| 验收结果 | Backlog checkbox + 日期 |

---

## 6. SIS 文件管理

- **存放位置**：`project/sis/`
- **命名规则**：`SIS-{StoryID}-{简短描述}.md`
- **归档**：done 的 SIS 保留在 `project/sis/` 中，项目级归档时移到 `archive/`

---

## 7. 当前不做什么

- 不在 SIS 中重复 PCB、规则等上下文信息（从 context_cache + 按需装载获取）
- 不在 SIS 中定义执行步骤（AI 从 SKILL + AS 规则自行决定）
- 不在 SIS 中定义状态回写规则（标准化在 SKILL 中）
- 不添加额外章节，除非"没有这节 AI 就无法完成任务"
