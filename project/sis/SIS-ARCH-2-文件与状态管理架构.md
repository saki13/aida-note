---
sis_id: SIS-ARCH-2
related_backlog_id: ARCH-2
priority: P0
stage: active
status: confirmed
linked_skills: []
---

# SIS：文件与状态管理架构

## 1. 任务目标

设计 aida-note 编辑器的文件与状态管理架构，定义多标签状态模型、脏标记策略、文件读写（编码处理）与设置持久化结构，作为 FUNC-1（多标签编辑）等后续 SIS 的实现依据。

- 必须完成：
  - tabsStore 统一状态模型（Tab 结构与字段定义）
  - 脏标记策略（立即置位 + 关闭确认）
  - 文件读写契约（UTF-8 + BOM 检测）
  - 设置持久化结构（settings.json + TS schema）
- 建议完成：
  - 状态迁移图（新建→编辑→保存→关闭）
- 当前不做：
  - 不实现任何代码（本 SIS 只产出设计文档）
  - 不做自动保存设计（属 FUNC-10，P1）
  - 不做崩溃恢复设计（属 FUNC-10，P1）

## 2. 人类意图

PO 原始表达（2026-08-19 逐项问答确认，ARCH-2 全部"照推荐"）：

- 多标签状态由 tabsStore 统一管理（单一来源，含当前激活 tab / 标签顺序 / 脏标记）
- 脏标记：内容变更立即置位，关闭标签/窗口时若有 dirty 弹确认（保存/不保存/取消）
- 编码：UTF-8 优先 + BOM 自动检测，保存默认 UTF-8
- 设置持久化：独立 settings.json + TS 接口约束结构（theme / wordWrap / aiConfig / recentFiles）

## 3. 输入 / 输出契约

- 输入：
  - ARCH-1 架构文档（模块分层：tabsStore / settingsStore）
  - PO 的 ARCH-2 决策（见人类意图）
- 输出：
  - 文件与状态管理架构设计文档（状态模型、脏标记、编码契约、设置 schema）
- 输出位置：`d:\lucia\workspace\aida-note\app\docs\state-architecture.md`

## 4. 边界与约束

- 可以改：文档表述、图示形式、TS schema 字段的细节命名
- 不能改：
  - tabsStore 单一来源原则
  - 脏标记策略：立即置位 + 关闭确认
  - 编码策略：UTF-8 + BOM 检测，保存默认 UTF-8
  - 设置持久化：单 settings.json + TS schema
- 必须遵守：
  - 与 ARCH-1 模块分层一致（settingsStore / tabsStore）
  - 文档可被 FUNC-1 直接引用执行

## 5. 验收标准

- [ ] `app/docs/state-architecture.md` 存在且完整
- [ ] 文档定义 Tab 状态模型（id / filePath? / title / content / language / dirty / isNewFile）
- [ ] 文档定义脏标记与关闭确认流程（保存 / 不保存 / 取消）
- [ ] 文档定义文件读写契约（UTF-8 + BOM 检测，保存 UTF-8）
- [ ] 文档定义 settings.json 结构（theme / wordWrap / aiConfig / recentFiles）与 TS 接口
- [ ] 与 ARCH-1 模块分层一致（一致性核查通过）
