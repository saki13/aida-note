# Sprint Review 报告模板

> 版本：v0.1.0
> 资产归类：产品资产 -> 标准模板
> 作用：定义每个 Sprint 结束后 Review 会议的正式产出。Aida 套用本模板，结合 DoD 对照表与 PO 反馈，生成该 Sprint 的 Review 报告（建设资产）。
> 上级文档：[AidaPulse 白皮书 v0.1.0](../whitepaper/AidaPulse白皮书_待确认.md)

---

## 0. 模板定位

Review 报告是 Review 阶段的正式产出：记录「原始承诺 → 实际交付 → 审查结论 → PO 判定 → 下一步」。它是 Review 会议的结论载体，不重复 DoD 对照表的细粒度核对。

---

## 最小可用模板（占位符）

```md
# Sprint {字母} Review 报告

> 用途：Sprint {字母} Review 的正式产出（含 DoD 对照表引用与审查结论）。
> 时间：{YYYY-MM-DD}
> 主持：Aida v0.1.0 | 结论判定：PO（{姓名}）
> 评审结论：**Review Passed / Passed With Observation / Failed**

## 1. 回顾 Sprint 原始承诺

- Sprint 名称：{名称}
- 正式输入：{输入项}
- 派生任务：{派生项}
- 执行模式：{讨论式推进 / 短 Sprint 自主执行}

## 2. Aida 完成情况汇报

| # | 任务 | 状态 | 完成时间 |
|---|------|------|---------|
| 1 | {任务} | ✅ / ⚠️ / ❌ | {时间} |

## 3. 审查式清单结论

### 3.1 Sprint 目标审查
{目标是否达成}

### 3.2 交付物审查
{DoD 对照表结论 + 是否"声称完成但未产出"}

### 3.3 Aida 表现审查
{场景识别 / 回核主事实源 / 维护纪律}

### 3.4 一致性审查
{Backlog / manifest / state / data.json 是否对齐}

### 3.5 风险与未通过项审查
{未通过项 / 观察项}

## 4. PO 反馈与认可判断

- PO 判定：{Passed / Passed With Observation / Failed}
- 观察项：{逐条}
- Retrospective：{开 / 不开（理由）}

## 5. Backlog 与状态处理

- 关闭：{已完成项}
- 回流：{未通过或新增项}
- 后续方向：{进入下一轮 Planning 候选}

## 6. 下一阶段结论

{Review 结论 → 是否 Retrospective → 下一阶段}

---
*主持：Aida v0.1.0 | {日期}*
```

---

## 审查式清单说明

| 小节 | 审查重点 |
|------|---------|
| 3.1 目标审查 | 本轮 Sprint 目标是否达成，不达成的项是否诚实暴露 |
| 3.2 交付物审查 | 引用 DoD 对照表结论；重点抓「声称完成但未产出」 |
| 3.3 表现审查 | Aida 是否遵守阶段边界、是否回核主事实源、约束执行是否到位 |
| 3.4 一致性审查 | 四方（Backlog / manifest / state / data.json）状态是否对齐 |
| 3.5 风险审查 | 未通过项必须明确，观察项可回流 |

---

## 结论判定口径

| 结论 | 含义 |
|------|------|
| Review Passed | 全部通过，无观察项 |
| Review Passed With Observation | 通过但有观察项（观察项可回流，不阻断收尾） |
| Review Failed | 存在未通过项，需回流修复 |

---

## 当前不做什么

- 不把 Review 报告与 DoD 对照表合并（两者分工：报告是结论，对照表是核对）
- 不在报告中重复 DoD 的逐项细节（只做「索引 + 结论」）
- 不让 Aida 自行判定 Review 结论（结论由 PO 判定）
