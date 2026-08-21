# Sprint 启动收口：Sprint 2（核心）

> 版本：v0.1.0
> 资产归类：建设资产 -> Sprint 运行资产
> 阶段说明：承接 Sprint 1 Review 收口（Passed With Observation，2026-08-20）与阶段 8 候选清单，作为 Sprint 2 进入执行前的统一启动约定。

## 1. Sprint 基本信息

- Sprint 名称：Sprint 2 - 核心
- Sprint 定位：第 2 个正式执行 Sprint（AS-8 授权第 2 次，余 2 次）
- Sprint 目标：
  - 完成界面布局设计文档（四区布局 + 工具栏清单映射 + 标签交互 + 状态栏定义 + 视图切换），作为 UI-2/3 与 FUNC 实现的布局依据（SIS-UI-1 约定：本任务不实现代码）
  - 完成多标签文件编辑核心链路：打开 / 新建 / 保存 / 另存 / 脏标记（Tauri fs/dialog/store 三插件首次接入，Naive UI 组件首次落地，零自定义 Rust 命令）
  - 完成多语法高亮：html / sql / js / json / markdown 五语言（CodeMirror 6 语言包挂载）
  - 完成交互设计与视觉设计定稿（所见即所得 / AI 面板 / 对比视图交互约定 + 配色与明暗主题方案）
- 执行模式：短 Sprint 自主执行（AS-8 授权边界，decision-008 第 2 次用量）

## 2. 本轮正式输入

| # | ID | 名称 | 优先级 | DoD | 前置依赖 |
|---|----|------|--------|-----|---------|
| 1 | UI-1 | 界面布局设计（标签栏 / 工具栏 / 侧栏 / 状态栏） | P0 | 见 SIS-UI-1 验收标准 | ENV-2；ARCH-1/2 架构文档（产出设计文档，不实现代码） |
| 2 | FUNC-1 | 多标签文件编辑（打开 / 新建 / 保存 / 另存 / 脏标记） | P0 | 见 SIS-FUNC-1 验收标准 | UI-1 布局依据；ARCH-2 蓝图；Tauri 三插件安装 + Naive UI 引入（均在本任务内完成） |
| 3 | FUNC-2 | 多语法高亮（html / sql / js / json / markdown） | P0 | 见 SIS-FUNC-2 验收标准 | FUNC-1 编辑器挂载点 |
| 4 | UI-2 | 交互设计（所见即所得 / AI 面板 / 对比视图） | P0 | 见 SIS-UI-2 验收标准 | UI-1 |
| 5 | UI-3 | 视觉设计（配色 / 明暗主题 / 图标） | P1 | 见 SIS-UI-3 验收标准 | UI-1 |

执行顺序：UI-1 -> FUNC-1 -> FUNC-2 -> UI-2 -> UI-3（先立骨架，再通文件链路，再挂高亮，最后补交互约定与视觉方案；UI-2/3 为设计文档型任务，可穿插）

## 3. 候选池（本轮不纳入）

- 其余 10 项已锁定在 Sprint 3/4（FUNC-3~8 / FUNC-9~11 / AI-1），无候补

## 4. 暂缓项

- 无

## 5. 本轮不做什么

- 不做 Markdown 所见即所得渲染、mermaid 渲染、格式化、diff、搜索替换（Sprint 3 范围）
- 不做主题切换功能实现（UI-3 只出视觉方案，功能在 FUNC-9 / Sprint 4）
- 不做 AI 接入（Sprint 4）
- 不写任何自定义 Rust 命令（守 ARCH-1「Rust 最小化」契约，文件操作全走官方插件）
- 不引入 vue-router（单窗口标签页模型，无路由需求）

## 6. 执行模式

短 Sprint 自主执行（AS-8）：授权期间 Aida 自主主持阶段 3-8，低风险变更可自批（影响 ≤3 文件 + 不影响 Sprint 目标 + 目标偏离 ≤20% + 不涉 PCB/白皮书）；中/高风险变更由 PO 决定。Sprint 2 收口时授权用量将记为 2/4。

## 7. 执行顺序（含风险卡点）

本轮内部顺序：UI-1 -> FUNC-1 -> FUNC-2 -> UI-2 -> UI-3

风险卡点与预案：
1. **FUNC-1 前置的 Tauri 三插件安装**（`@tauri-apps/plugin-fs / plugin-dialog / plugin-store` + Rust 侧 crates）：cargo 国内镜像方案（decision-009，rsproxy.cn）**首次真实考验**。预案：若沙箱内安装/编译仍被截断，按 Evolution Log 观察项触发条件正式立项「沙箱长时命令执行规则」skill，并按 decision-009 的转交模板执行（命令 + 验证 + 恢复条件）。
2. **FUNC-1 内的 Naive UI 引入**：npm 源无截断史（ENV-2 已验证），风险低。
3. **Rust 侧变更**：仅 `src-tauri/Cargo.toml`（插件依赖）+ `lib.rs`（插件注册）+ capabilities 权限配置，属计划内契约落地。

## 8. 核心设计决策

1. 技术栈与分层遵循 ARCH-1 契约（app/docs/architecture.md），状态管理遵循 ARCH-2 蓝图（app/docs/state-architecture.md），FUNC-1 实现以两文档为唯一依据
2. UI 组件库 = Naive UI（PCB 锁定，decision-001）
3. 4 短 Sprint 划分与顺序锁定不变（decision-007 / decision-011）
4. cargo 镜像方案延续（decision-009）：编译类命令沙箱内自主完成，不再默认转交 PO

## 9. 一句话结论

地基之上立骨架：让 aida-note 从「空窗口」变成「能打开、编辑、保存、带高亮的多标签编辑器」，并把 UI 交互与视觉方案定稿到可直接执行。
