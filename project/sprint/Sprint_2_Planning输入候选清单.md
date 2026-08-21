# Sprint 2 Planning 输入候选清单

> 版本：v0.1.0
> 资产归类：建设资产 -> Sprint 运行资产
> 阶段说明：阶段 08（Planning Input Ready）输出，承接 Sprint 1 Review 收口（Passed With Observation，2026-08-20）。
> 授权状态：AS-8 第 2 次授权（余 2 次），Sprint 2 成员按 Planning 锁定不变。

## 1. 候选项提取（Backlog 剩余 15 项中本轮锁定 5 项）

按 Planning 收口（decision-007）锁定的 Sprint 2 成员：

| # | ID | 名称 | 优先级 | DoD | 前置依赖 |
|---|----|------|--------|-----|---------|
| 1 | UI-1 | 界面布局设计（标签栏 / 工具栏 / 侧栏 / 状态栏） | P0 | 见 SIS-UI-1 验收标准 | ENV-2（脚手架就绪）；**首次引入 Naive UI** |
| 2 | UI-2 | 交互设计（所见即所得 / AI 面板 / 对比视图交互） | P0 | 见 SIS-UI-2 验收标准 | UI-1 |
| 3 | UI-3 | 视觉设计（配色 / 明暗主题 / 图标） | P1 | 见 SIS-UI-3 验收标准 | UI-1 |
| 4 | FUNC-1 | 多标签文件编辑（打开 / 新建 / 保存 / 另存 / 脏标记） | P0 | 见 SIS-FUNC-1 验收标准 | ARCH-2（state-architecture.md 蓝图）；**首次安装 Tauri fs/dialog/store 三插件** |
| 5 | FUNC-2 | 多语法高亮（html / sql / js / json / markdown） | P0 | 见 SIS-FUNC-2 验收标准 | UI-1（编辑器挂载点）；ENV-2（语言包已装） |

执行顺序建议：UI-1 -> FUNC-1 -> FUNC-2 -> UI-2 -> UI-3（先立骨架再填交互与视觉；FUNC-1 与 UI-2/3 可穿插）

## 2. 关键依赖与风险预告

1. **Tauri 三插件安装（FUNC-1 前置）**：`@tauri-apps/plugin-fs / plugin-dialog / plugin-store` + Rust 侧 crates 拉取。这是 cargo 国内镜像方案（decision-009，rsproxy.cn sparse 源）**首次真实考验**。若再遇沙箱截断 -> 触发 Evolution Log 观察项条件，正式立项「沙箱长时命令执行规则」skill。
2. **Naive UI 批量引入（UI-1 前置）**：npm 侧新依赖，源无截断史（ENV-2 验证 206 包 21s），风险低。
3. **Rust 侧变更**：插件注册需改 `src-tauri/Cargo.toml` + `lib.rs`（capabilities 权限配置），仍守「零自定义 Rust 命令」原则（ARCH-1 契约）。
4. **回调 ARCH-2 契约**：FUNC-1 实现须对照 `app/docs/state-architecture.md` 的 Tab 接口 / 脏标记派生态 / UTF-8+BOM 契约 / 关闭确认三选流程，架构文档为唯一实现蓝图。

## 3. Backlog 剩余状态

- 已完成：4 / 19（ENV-1、ENV-2、ARCH-1、ARCH-2 -- Sprint 1 闭环）
- 本轮锁定：5 / 19（UI-1、UI-2、UI-3、FUNC-1、FUNC-2）
- Sprint 3 预留：6 项（FUNC-3~FUNC-8）
- Sprint 4 预留：4 项（FUNC-9~FUNC-11、AI-1）
- **未燃尽，按流程进入 Sprint 2 Planning（阶段 03）**；预计第 4 次授权后燃尽转项目交付。

## 4. 一句话结论

Sprint 1 地基已验收，Sprint 2 携 5 项核心任务进入 Planning，最大变数是 Tauri 插件安装对镜像方案的首次考验。
