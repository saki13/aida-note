# AS-Panel 看板数据源同步规则

> 版本：v0.1.0
> 资产归类：产品资产 -> SKILL 能力规则
> 对应 Backlog：`Panel-1b`（数据绑定）、`Panel-3`（看板优化，待后续）
> 作用：定义 `project/panel/workflow/data.json` 的更新机制，确保看板展示的数据始终与主事实源（state.md、Product_Backlog.md）一致。
> 上级文档：[AidaPulse 白皮书 v0.1.0](../whitepaper/AidaPulse白皮书_待确认.md) 第 8 节
> 关联规则：[AS-SIS Backlog↔SIS 转化与同步规则](AS-SIS_BacklogSIS转化与同步规则_待确认.md)、[AS-6-Cache context_cache 结构设计](AS-6-Cache_context_cache结构设计_待确认.md)
> 演进：本规则是"派生资产同步"机制的聚焦版（针对看板）。后续 Backlog T3（变更管理能力）讨论时，本规则将作为其具体案例升级为通用派生资产同步机制。

---

## 1. 设计目标

看板（`project/panel/workflow/index.html`）通过读取 `data.json` 展示项目状态。data.json 是**派生资产**--它的内容全部来自主事实源，不是独立的事实：

| 主事实源 | 派生到 data.json 的字段 |
|---------|------------------------|
| `memory/state.md` | `current`（sprint/stage/status/next/blocked） |
| `project/backlog/Product_Backlog.md` | `backlog[]`（id/priority/title/status） |
| `product/agents/aida/工作流图与检查表_待确认.md` | `checklist`（阶段检查项，相对静态） |

本规则确保：**主事实源变更后，data.json 及时同步，看板不脱节。**

### 1.1 暴露的问题背景

Sprint D Review 期间发现：阶段从 `Sprint In Progress` 切换到 `Review`、再切到 `Review Passed With Observation` 时，state.md 已更新，但 data.json 未同步，导致看板显示过期状态。根因是缺少明确的更新机制。

---

## 2. 更新时机

data.json 在以下时机**必须**同步更新：

| # | 触发场景 | 更新内容 |
|---|---------|---------|
| 1 | `current_stage` 变更（阶段切换） | `current` 对象全部字段 |
| 2 | `current_sprint` 变更 | `current.sprint` |
| 3 | Backlog 任一 Story 状态变更 | `backlog[]` 对应条目 + `current`（若影响阶段） |
| 4 | 阻塞状态变更 | `current.blocked` |
| 5 | 主事实源一次批量变更后（如 Sprint 收口） | 全量刷新 |

### 2.1 与 AS-SIS 同步的关系

AS-SIS 定义了"SIS 状态变更 -> 即时同步 Backlog"。**data.json 的更新应随 Backlog 更新之后执行**，作为同一变更动作链的收尾：

```
SIS 状态变更
  -> 更新 Product_Backlog.md（AS-SIS 同步规则）
  -> 更新 memory/state.md + manifest.md（记忆系统）
  -> 追加 memory/decisions.md（决策类变更时）
  -> 更新 data.json（本规则）          <- 最后执行
  -> 标记 context_cache 对应条目 stale（AS-6-Cache）
```

### 2.2 与 context_cache 的关系

data.json 与 context_cache 同为派生资产，但作用不同：

| 资产 | 服务对象 | 数据来源 |
|------|---------|---------|
| context_cache | 新会话恢复（Aida 读取） | 全部核心文档摘要 |
| data.json | 看板展示（浏览器读取） | state + Backlog + 工作流图 |

两者独立维护，但可在同一"批量刷新"动作中顺带完成。

---

## 3. 值域对齐

### 3.1 阶段值域

data.json 的 `current.stage` 必须与 `memory/state.md` 的 `current_stage` **完全一致**（精确到细分状态），同时新增 `stage_main` 字段记录主阶段用于看板高亮：

```json
{
  "current": {
    "sprint": "Sprint D",
    "stage": "Review Passed With Observation",
    "stage_main": "Review",
    "status": "Review Passed",
    "next": "Planning Input Ready",
    "blocked": "无"
  }
}
```

| 字段 | 含义 | 值来源 |
|------|------|--------|
| `stage` | 细分状态（与 state.md 一致） | `state.md` 的 `current_stage` 原样复制 |
| `stage_main` | 主阶段（看板高亮匹配用） | 按下方映射表从细分状态推导 |

**细分状态 -> 主阶段映射表**（对应工作流图 9 个主阶段）：

| 细分状态（state.md 可能的值） | 主阶段（stage_main） |
|------------------------------|---------------------|
| 项目准备阶段 | 项目准备阶段 |
| Backlog Grooming | Backlog Grooming |
| Planning / Planning Input Ready | Planning Input Ready |
| Sprint In Progress | Sprint In Progress |
| Sprint Completed | Sprint Completed |
| Review / Review Passed / Review Passed With Observation / Review Failed | Review |
| Retrospective | Retrospective |
| 项目交付 / Done | 项目交付 |

> 规则：`stage_main` 是细分状态映射到主阶段后的值，看板节点 `data-stage` 属性值必须与 `stage_main` 匹配。映射表若需扩充，优先更新本规则而非直接改看板代码。

### 3.2 Backlog 状态值域

`backlog[]` 的 `status` 必须与 Backlog 主事实源的 Story 状态一致，仅允许：

| status | 对应 Backlog 标记 |
|--------|------------------|
| `done` | `- [x]` |
| `in_progress` | 执行中标记 |
| `pending` | `- [ ]` |

---

## 4. 更新内容与结构

### 4.1 current 对象

```json
"current": {
  "sprint": "{Sprint 名称}",
  "stage": "{细分状态，与 state.current_stage 一致}",
  "stage_main": "{主阶段，用于高亮}",
  "status": "{阶段状态描述}",
  "next": "{下一步}",
  "blocked": "{阻塞情况，无则填'无'}"
}
```

### 4.2 backlog 数组

`backlog[]` 的每个条目必须与 Product_Backlog.md 中的 Story 一一对应：

```json
{ "id": "Panel-1b", "priority": "P1", "title": "...", "status": "done" }
```

- `id`、`priority`、`title`：从 Backlog 原样复制
- `status`：从 Backlog 勾选状态推导（done/in_progress/pending）

### 4.3 checklist 对象

- `checklist` 内容来自工作流图检查表，**相对静态**，仅在检查表内容更新时同步
- 看板只读展示，不参与阶段/状态同步

### 4.4 updated_at

每次同步必须更新 `updated_at` 为当前日期，看板据此显示数据新鲜度。

---

## 5. 同步操作流程

```
1. 主事实源变更（state.md / Backlog / 工作流图）
2. 判断变更是否影响 data.json（对照第 2 节触发时机）
3. 按值域对齐规则更新 data.json：
   a. current 对象从 state.md 复制
   b. stage_main 按映射表推导
   c. backlog 数组与 Backlog 主事实源逐项核对
   d. 更新 updated_at
4. 自检：对照第 6 节一致性检查
5. 若看板已在浏览器打开，提示 PO 刷新页面查看
```

### 5.1 同步前检查

更新 data.json 前必须确认：

- [ ] state.md 已更新（先更新主事实源，再更新派生资产）
- [ ] Product_Backlog.md 已更新
- [ ] 明确本次变更影响的字段范围

---

## 6. 一致性检查

每次同步后执行，确认看板数据与主事实源一致：

| # | 检查项 | 判定标准 |
|---|--------|---------|
| 1 | 阶段一致 | `data.json.current.stage` == `state.current_stage` |
| 2 | 主阶段可高亮 | `stage_main` 能匹配到看板节点 `data-stage` |
| 3 | Sprint 一致 | `data.json.current.sprint` == `state.current_sprint` |
| 4 | Backlog 状态一致 | `data.json.backlog[]` 每个条目 status 与 Backlog 勾选状态一致 |
| 5 | Backlog 条目完整 | 看板 backlog 数组覆盖 Backlog 主事实源全部 Story（无遗漏） |
| 6 | 数据新鲜度 | `updated_at` 为本轮同步日期 |

### 6.1 收口同步检查表（7.1a）

data.json 的同步是「收口同步检查表」的 4 个同步点之一。完整收口必须 4 点齐全（详见 Aida SKILL 步骤 6）：

| # | 同步点 | 负责规则 |
|---|--------|---------|
| ① | decisions 决策记录 | SKILL 决策步骤 |
| ② | Backlog 主事实源 | AS-SIS / SKILL |
| ③ | data.json 派生数据源 | 本规则（AS-Panel） |
| ④ | state + manifest 记忆系统 | SKILL 运行状态 |

本规则（③）必须在 ② 和 ④ 完成后、作为动作链收尾执行，且每次同步后过第 6 节一致性检查。

---

## 7. 与后续计划的关系

- **T3 变更管理能力**：本规则是"派生资产同步"的具体案例。T3 充分讨论时，将本规则的机制（触发时机/值域对齐/一致性检查）泛化为"变更管理通用流程"，覆盖所有派生资产（data.json、context_cache、看板、审计等）。
- **Panel-3 看板优化**：值域对齐和映射表是看板后续优化的基础，优化时不得破坏本规则定义的字段契约。
- **未来服务器方案**：搭服务器后 data.json 由服务端 API 提供，本规则的值域对齐和一致性检查仍适用（字段契约不变），仅数据来源从文件变为接口。

---

## 8. 当前不做什么

- 不做自动的文件监听/推送（data.json 由 Aida 主动同步，与 context_cache 维护纪律一致）
- 不做 WebSocket 实时推送（搭服务器后另行设计）
- 不把 checklist 纳入状态同步（静态内容）
- 不覆盖 T3 变更管理的完整范围（本规则只聚焦看板数据源）

---

## 9. 结论

data.json 更新机制的缺失会导致看板与项目真实状态脱节，破坏"看板即状态"的可信度。本规则明确了：更新时机（状态变更时）、值域对齐（stage 与 state 一致 + stage_main 主阶段映射）、同步流程（先主事实源后派生资产）、一致性检查（6 项自检）。作为 T3 变更管理的前置聚焦版，本规则同时为后续泛化提供了契约基础。
