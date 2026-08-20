# Sprint 启动收口：Sprint 1（工程地基）

> 版本：v0.1.0
> 资产归类：建设资产 -> Sprint 运行资产
> 阶段说明：承接 Planning 收口（2026-08-20），作为 Sprint 1 进入执行前的统一启动约定。

## 1. Sprint 基本信息

- Sprint 名称：Sprint 1 - 工程地基
- Sprint 定位：第 1 个正式执行 Sprint
- Sprint 目标：
  - 搭建 Tauri 2 + Vue 3 + TypeScript + Vite 项目脚手架（app/ 子目录）
  - 接入核心依赖（CodeMirror 6 及语言包 / mermaid / Prettier / jsdiff / Pinia，不引入 vue-router）
  - 产出系统架构设计文档（app/docs/architecture.md）
  - 产出文件与状态管理架构文档（app/docs/state-architecture.md）
- 执行模式：短 Sprint 自主执行（AS-8 授权边界）

## 2. 本轮正式输入

| # | ID | 名称 | 优先级 | DoD | 前置依赖 |
|---|----|------|--------|-----|---------|
| 1 | ENV-1 | 项目脚手架搭建 | P0 | 见 SIS-ENV-1 验收标准 | - |
| 2 | ENV-2 | 核心依赖接入 | P0 | 见 SIS-ENV-2 验收标准 | ENV-1 |
| 3 | ARCH-1 | 系统架构设计 | P0 | 见 SIS-ARCH-1 验收标准 | ENV-2 |
| 4 | ARCH-2 | 文件与状态管理架构 | P0 | 见 SIS-ARCH-2 验收标准 | ENV-2 |

执行顺序：ENV-1 → ENV-2 → ARCH-1 / ARCH-2（可并行）

## 3. 候选池（本轮不纳入）

- 无（其余 15 项已锁定在 Sprint 2/3/4）

## 4. 暂缓项

- 无

## 5. 本轮不做什么

- 不做任何功能实现（FUNC-*）与 UI 落地（UI-*），仅工程地基与架构文档
- 不做 AI 接入
- 不做产品化 / 分发

## 6. 执行模式

短 Sprint 自主执行（AS-8）：授权期间 Aida 自主主持阶段 3-8，低风险变更可自批（影响 ≤3 文件 + 不影响 Sprint 目标 + 目标偏离 ≤20% + 不涉及 PCB/白皮书）；中/高风险变更由 PO 决定。

## 7. 执行顺序（含整体 4 Sprint 划分）

本轮 Sprint 1 内部顺序：ENV-1 → ENV-2 → ARCH-1 / ARCH-2

整体规划（Planning 锁定，2026-08-20）：

| Sprint | 主题 | 成员 |
|--------|------|------|
| Sprint 1 | 地基 | ENV-1、ENV-2、ARCH-1、ARCH-2 |
| Sprint 2 | 核心 | UI-1、UI-2、UI-3、FUNC-1、FUNC-2 |
| Sprint 3 | 增强 | FUNC-3、FUNC-4、FUNC-5、FUNC-6、FUNC-7、FUNC-8 |
| Sprint 4 | 体验/AI | FUNC-9、FUNC-10、FUNC-11、AI-1 |

## 8. 核心设计决策

1. 技术栈：Tauri 2 + Vue 3 + TS + Vite + Naive UI + CodeMirror 6 + mermaid + Prettier + jsdiff + Pinia（decision-001）
2. 产品代码存放于同仓子目录 app/（ENV-1 问答 Q5）
3. 4 短 Sprint 划分与顺序锁定（decision-007）

## 9. 一句话结论

先打好工程地基与架构蓝图，为后续 3 个 Sprint 的功能落地提供可执行条件。
