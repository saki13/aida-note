# Sprint 6 启动收口（优化 Sprint）

> 用途：Sprint 6（PO 追加的第 6 次短 Sprint，优化型）的启动收口。
> 生成：2026-08-22，Aida v0.1.0 ｜ 模式：AS-8 短 Sprint 自主执行（PO 授权「开始吧」，代码已推 GitHub origin master 5028b0c）
> 状态：**PO 已确认**（2026-08-22 对齐：OPT-1 弹窗浮层 / OPT-2 保留并修复强调色 / OPT-3 按完善版：透明度+对比度+色温（工具栏与编辑区分开调）+双模式+按背景存参数+替换图片+工具栏下拉入口）；**Planning 正式关闭**（2026-08-22 PO 确认 4 任务：OPT-2/3/1/4），进入 Sprint In Progress

## 1. 背景与授权

- 项目已交付（Backlog 19/19 燃尽，PO 确认交付）+ Sprint 5（使用手册 + 安装包）全交付完成（MSI/NSIS ✅）。
- 代码已推 GitHub：`git@github.com:saki13/aida-note.git`（master @ 5028b0c，origin 已配置）。
- PO 提出新一轮优化（2026-08-22）：「加载已有文档可调用 AI 生成文档简报及大纲锚点（锚点快速定位，需 API 信息、默认关闭）；美化系统——暗色工具栏修复 + 强调色生效；上传图片作背景（不挡字、透明度可配）」→ 授权第 6 次短 Sprint。

## 2. Sprint 成员与 DoD

> 每任务详细验收标准见对应 SIS 文档（SIS-OPT-1/2/3，已落盘 `project/sis/`，待 PO 确认）。

| # | 任务 | SIS | 概要 DoD |
|---|------|-----|---------|
| 1 | OPT-2 暗色模式 UI 修复 + 强调色生效 | [SIS-OPT-2](../sis/SIS-OPT-2-暗色模式UI修复与强调色生效.md) | 全局主题变量按 data-theme 定义；暗色下工具栏/标签栏/状态栏/AI 面板/对比视图全深色可读；强调色驱动自定义 UI（--accent）；移除 prefers-color-scheme 依赖；theme-smoke 断言全绿 |
| 2 | OPT-3 自定义背景图片 + 透明度/对比度/色温 | [SIS-OPT-3](../sis/SIS-OPT-3-自定义背景图片与透明度.md) | 双模式（全应用/仅编辑区外）；透明度全局 + 对比度/色温按工具栏区与编辑区分开调；按背景保存参数；替换图片；工具栏「背景」下拉；默认无背景 |
| 3 | OPT-1 AI 文档简报 + 大纲锚点 | [SIS-OPT-1](../sis/SIS-OPT-1-AI文档简报与大纲锚点.md) | 弹窗浮层；未配置 API 默认关闭并提示；配置后生成简报+大纲；锚点点击定位到文档标题；mock 自测 |
| 4 | OPT-4 Windows Shell 集成（右键打开 + 文件关联） | [SIS-OPT-4](../sis/SIS-OPT-4-WindowsShell集成右键打开与文件关联.md) | 右键任意文件「用 aida-note 打开」+ 文本扩展名关联双击打开；HKCU 幂等注册；启动带文件参数自动开标签；右键/双击真实效果 PO 本机验证 |

## 3. 执行顺序

OPT-2（UI 修复，零依赖）→ OPT-3（背景，复用主题/settings 通道）→ OPT-1（AI 简报+大纲，依赖 aiService 通道，工作量最大）→ OPT-4（Shell 集成，Rust 侧独立，最后做，真实效果 PO 本机验证）。

## 4. 风险与对策

| 风险 | 对策 |
|------|------|
| 暗色工具栏白底为 CM/Naive 主题变量未接线（继承默认） | 先定位主题变量来源（EditorPane/MainView/全局样式），统一走 resolvedTheme 三态 + data-theme 锚点；复用 FUNC-9 的 themeCompartment/settingsStore 单点 |
| 强调色三态选择"无效果"可能因 Naive primary 覆盖缺主题感知 | 核对 themeOverrides 在明暗两套下的 primary 注入；用 data-accent 锚点 + CSS 变量双保险 |
| AI 简报/大纲需流式接口且沙箱阻断 SSE | 复用 aiService 非流式/流式封装 + page.route 模拟响应做 Playwright 确定性自测；真实调用列 PO 验证 |
| 背景图片持久化需 Tauri 文件通道 | 复用 settingsStore（store 插件存路径 + 浏览器 localStorage 兜底）；图片经 dialog 选文件存 appData 目录，路径入设置 |
| 沙箱击杀长命令 | 后台孤儿进程跑 build；类型校验用 `vue-tsc --noEmit` 后台落盘日志方式真跑 |

## 5. 交付物位置

- 代码：`app/src/`（组件/服务/store 增量）
- 自测：`app/scripts/`（Playwright smoke 新增/扩展）+ `package.json` test 脚本
- 收口：`project/sprint/Sprint_6_DoD对照表.md`、change_log CHG-002、decision-027、四边同步
