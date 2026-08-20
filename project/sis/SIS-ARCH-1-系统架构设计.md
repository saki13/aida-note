---
sis_id: SIS-ARCH-1
related_backlog_id: ARCH-1
priority: P0
stage: active
status: confirmed
linked_skills: []
---

# SIS：系统架构设计

## 1. 任务目标

产出 aida-note 编辑器的系统架构设计文档，明确 Tauri 主进程与前端之间的职责划分、IPC 接口契约与前端模块分层，作为后续全部 FUNC 系列 SIS 的执行依据。

- 必须完成：
  - 职责划分：文件系统操作走 Tauri 官方插件（fs + dialog + store），Rust 侧保持最小化
  - IPC 契约表：列出使用到的插件与调用方式，前端 API 封装层（services/）
  - 模块分层：services/（fileService / settingsService / aiService / formatService / diffService）+ stores/（tabsStore / settingsStore / aiStore）
  - 架构文档落盘
- 建议完成：
  - 模块依赖方向图（mermaid/ASCII）
  - 数据流说明（打开文件 → 编辑 → 保存 → 脏标记）
- 当前不做：
  - 不实现任何代码（本 SIS 只产出设计文档）
  - 不设计 UI 布局细节（属 UI-1）

## 2. 人类意图

PO 原始表达（2026-08-19 逐项问答确认，ARCH-1 全部"照推荐"）：

- 文件系统操作走 Tauri 官方插件（fs + dialog + store），零自定义 Rust 代码负担
- 自定义 IPC 尽量少：高亮 / 格式化 / 对比 / AI 全部前端完成，Rust 侧保持最小
- 模块分层按 ENV-1 功能分层：services/ 与 stores/ 分工
- 产出独立 Markdown 架构文档（app/docs/architecture.md）

## 3. 输入 / 输出契约

- 输入：
  - PCB 定稿技术栈结论
  - ENV-1 目录结构约定（components / services / stores / views）
  - ENV-2 依赖接入结论（CodeMirror / mermaid / Prettier / jsdiff / Pinia）
  - PO 的 ARCH-1 决策（见人类意图）
- 输出：
  - 系统架构设计文档（职责划分、IPC 契约、模块分层、依赖方向、数据流）
- 输出位置：`d:\lucia\workspace\aida-note\app\docs\architecture.md`

## 4. 边界与约束

- 可以改：架构文档的具体表述、图示形式（mermaid/ASCII）
- 不能改：
  - 职责划分原则：文件系统走官方插件，Rust 侧最小化
  - 前端模块分层：services/ 五服务 + stores/ 三 store
  - 技术栈：Tauri 2 + Vue 3 + TS + Vite + Naive UI + CodeMirror 6 + mermaid + Prettier + jsdiff + Pinia
- 必须遵守：
  - 与 ENV-1 目录结构一致
  - 不引入 vue-router
  - 架构文档可被后续 FUNC SIS 直接引用执行

## 5. 验收标准

- [ ] `app/docs/architecture.md` 存在且完整
- [ ] 文档含职责划分说明（主进程 vs 前端，文件操作走官方插件）
- [ ] 文档含 IPC/插件调用契约表
- [ ] 文档含模块分层（services/ 五服务、stores/ 三 store）及依赖方向
- [ ] 文档含核心数据流说明（打开→编辑→保存→脏标记）
- [ ] 与 PCB 技术栈、ENV-1 目录结构无冲突（一致性核查通过）
