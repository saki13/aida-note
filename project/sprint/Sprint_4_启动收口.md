# Sprint 启动收口：Sprint 4（体验/AI）

> 版本：v0.1.0
> 资产归类：建设资产 -> Sprint 运行资产
> 阶段说明：承接 Sprint 3 Review 收口（Passed With Observation，2026-08-22）与阶段 8 候选清单，作为 Sprint 4 进入执行前的统一启动约定。Sprint 4 为 AS-8 第 4 次（最后一次）授权，燃尽后转项目交付。

## 1. Sprint 基本信息

- Sprint 名称：Sprint 4 - 体验/AI
- Sprint 定位：第 4 个正式执行 Sprint（AS-8 授权第 4 次 = 最后一次，燃尽即交付）
- Sprint 目标：
  - 完成主题切换（明 / 暗 / 跟随系统三态 + 蓝/绿/紫强调色，工具栏+设置入口，持久化）
  - 完成最近文件列表（菜单 + 空态入口，20 个去重置顶，失效提示可移除，settings.json 持久化）
  - 完成自动保存 / 崩溃恢复草稿（防抖草稿 + 恢复/丢弃弹窗 + 完整清理不留碎片）
  - 完成 AI 接入（OpenAI 兼容单套配置 + 润色四选流式原位替换 + 问答侧栏 + mermaid 修复）
- 执行模式：短 Sprint 自主执行（AS-8 授权边界，decision-008 第 4 次用量 = 最后一次；Backlog 燃尽检查）

## 2. 本轮正式输入

| # | ID | 名称 | 优先级 | DoD | 前置依赖 |
|---|----|------|--------|-----|---------|
| 1 | FUNC-9 | 主题切换（明/暗/跟随系统 + 多套强调色） | P1 | 见 SIS-FUNC-9 验收标准 | UI-3（视觉基线 ui-visual.md）；settingsStore（theme 字段已就位，decision-020）；themeCompartment 已有明暗能力（FUNC-2）；Naive UI 明暗 provider |
| 2 | FUNC-11 | 打开最近文件列表 | P1 | 见 SIS-FUNC-11 验收标准 | FUNC-1（打开/保存事件）；settingsStore（recentFiles 字段已就位，decision-020）；fileService |
| 3 | FUNC-10 | 自动保存 / 崩溃恢复草稿 | P1 | 见 SIS-FUNC-10 验收标准 | FUNC-1（脏标记/标签内容）；ARCH-2（临时目录约定）；Tauri fs 插件 |
| 4 | AI-1 | AI 接入（润色/问答/mermaid 修复） | P1 | 见 SIS-AI-1 验收标准 | settingsStore（aiConfig 字段已就位，decision-020）；FUNC-1（编辑器读写/撤销）；FUNC-4（mermaid 修复入口占位）；UI-2 §3/§4（润色/问答交互蓝图）；fetch 流式 |

执行顺序：FUNC-9 -> FUNC-11 -> FUNC-10 -> AI-1（FUNC-9 最轻量且打通「settings 完整化 + 主题通道」，FUNC-11 复用 settings 通道；FUNC-10 涉 Tauri 临时目录独立性强；AI-1 主峰最后，需要真实 API 交互与流式）

## 3. 候选池（本轮不纳入）

- 无（Sprint 4 = Backlog 剩余全部 4 项，燃尽即交付）

## 4. 暂缓项

- 无

## 5. 本轮不做什么

- 不做自定义主题编辑器 / 用户自定义配色上传（FUNC-9 边界）
- 不做最近文件夹 / 工作区列表（FUNC-11 边界）
- 不做全量自动保存到原文件（FUNC-10 不替代显式 Ctrl+S）
- 不做多套 API 配置切换 / 工具调用 / RAG（AI-1 边界）；不做 AI 代码生成补全（PCB 反面教材）
- 不引入新 npm/cargo 依赖（四项所需能力均可用现有栈实现；AI 请求走原生 fetch）

## 6. 执行模式

短 Sprint 自主执行（AS-8）：授权期间 Aida 自主主持阶段 3-8，低风险变更可自批（影响 ≤3 文件 + 不影响 Sprint 目标 + 目标偏离 ≤20% + 不涉 PCB/白皮书）；中/高风险变更由 PO 决定。Sprint 4 收口时授权用量将记为 4/4 燃尽，Backlog 清空后走项目交付（阶段 11）。

## 7. 执行顺序（含风险卡点）

本轮内部顺序：FUNC-9 -> FUNC-11 -> FUNC-10 -> AI-1

风险卡点与预案：

1. **FUNC-9 主题三态与 CM/Naive UI 双层联动**：三态（light/dark/system）解析 + 强调色作用域（UI 主题色变量）+ CodeMirror themeCompartment 联动 + Naive UI darkTheme provider 切换，四层需要一致。预案：先定「状态 -> 生效层」映射表（settingsStore.theme 派生 resolvedTheme -> ①文档根 class ②Naive UI provider ③CM theme compartment），自测用根 class + CM 主题断言；跟随系统用 matchMedia 监听（FUNC-4 已有先例）
2. **FUNC-11 记录时机**：打开/保存成功后写入 recentFiles（去重置顶、上限 20）。注意：写入点在 tabsStore.openTab/markSaved 之外做拦截而非侵入（tabsStore 是事实源，recentFiles 是 settings 副作用）——用 MainView 或 store 动作包装，避免脏标记链路受污染
3. **FUNC-10 草稿与退出清理**：Tauri 临时目录（app config 旁或 temp）写草稿；防抖阈值；正常退出清理 vs 崩溃残留识别（启动扫描）。风险：沙箱浏览器自测无法验证真实崩溃恢复——用「页面关闭前写草稿 → 重启断言弹窗」模拟；Tauri 真实退出清理留 PO 验证（同 FUNC-6 两文件对比先例）
4. **AI-1 主峰（本 Sprint 最高风险）**：真实 API 调用在沙箱浏览器自测受限。预案：①aiService 抽象为可注入 client（测试注入 mock 流式响应，不依赖真实网络）②真实调用走「PO 提供测试配置 or mock 断言流式渲染链路」分层验证 ③key 明文 settings.json（AI-1 边界已确认）。流式解析（SSE）用 fetch + ReadableStream，mock 层用 TransformStream 模拟
5. **settings 通道完整化**：Sprint 4 首任务即 settingsStore 完整化（theme/recentFiles/aiConfig 全字段），复用 decision-020 的 load/save 通道与兼容合并，不新建平行实现

## 8. 核心设计决策

1. 技术栈与分层遵循 ARCH-1 契约，状态管理遵循 ARCH-2 蓝图；AI-1 润色/问答交互回调 ui-interactions.md §3/§4，主题配色回调 ui-visual.md，偏离交互/视觉原则需走 T3 变更
2. 三原则（markRaw / Compartment 槽位 / watch 单点写缓存）继续适用于 CM 相关改动（FUNC-9 CM 主题联动复用 themeCompartment 槽位）；FUNC-6 结论「store 内容类状态以 content 为唯一事实源」延伸：settings 以 settingsStore 为事实源，各消费方只读派生
3. 4 短 Sprint 划分与顺序锁定不变（decision-007 / decision-011）；Sprint 4 燃尽后按白皮书走项目交付（阶段 11），Aida 生成项目报告征询 PO
4. 零新增依赖策略：AI 请求用原生 fetch 流式；主题/最近文件/草稿全部复用现有栈（Naive UI / CM6 / Tauri 插件 / fs）
5. AI-1 沙箱自测边界：aiService 依赖注入 + mock 流式，真实 API 冒烟列 PO 验证项（同 FUNC-6 两文件对比先例）

## 9. 一句话结论

体验与智能收尾：让 aida-note 拥有可记忆的主题皮肤、顺手的最远文件入口、摔不丢的崩溃草稿与原生 AI 三件套（润色/问答/mermaid 修复），四次授权燃尽交付完整产品，主峰是 AI-1，守 settings 事实源与依赖注入双纪律。
