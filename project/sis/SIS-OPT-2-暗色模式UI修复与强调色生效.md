---
sis_id: SIS-OPT-2
related_backlog_id: OPT-2
priority: P1
stage: active
status: pending（待 PO 确认）
linked_skills: []
---

# SIS：暗色模式 UI 修复 + 强调色生效

## 1. 任务目标

修复暗色模式下的观感问题：工具栏等自定义 UI 出现白底白字（CSS 变量 `--toolbar-bg` 等从未定义，暗色下全部回退亮色）；强调色（蓝/绿/紫）只在 Naive 组件上生效，自定义 UI 完全无感。目标：明暗两主题下自定义 UI 全面适配变量配色，强调色实际驱动自定义 UI（激活态/悬浮按钮/AI 消息等），且手动选择「暗色」时同样生效（不依赖系统 prefers-color-scheme）。

- 必须完成：
  - 全局定义主题 CSS 变量（`--toolbar-bg/--border-color/--editor-bg/--text-color/--floating-bg/...`），按 `[data-theme]`（resolvedTheme 驱动）区分明暗两套值
  - 暗色模式下：工具栏 / 标签栏 / 状态栏 / AI 面板 / 对比视图 / 浮条气泡 / 搜索面板 全部深色背景 + 浅色可读文字（不再白底白字）
  - 强调色驱动自定义 UI：`--accent/--primary-color` CSS 变量随强调色切换（激活标签条、脏标记、AI 用户消息气泡、悬浮按钮 hover 等跟随）
  - 手动选择「暗色」（系统为亮）时暗色样式同样生效——移除组件内 `@media (prefers-color-scheme)` 写法，统一走 data-theme 变量
  - 原有功能/持久化行为不变
- 建议完成：
  - 对比视图 diff 高亮色（新增/删除行与字符）也按主题适配
- 当前不做：
  - 不新增主题/强调色方案（保持现有 明/暗/system + 蓝/绿/紫）
  - 不做自定义主题编辑器

## 2. 人类意图

PO 原始表达（2026-08-22）：「现在暗色模式的工具栏是白色 字都看不清，几个强调色选择了没有任何效果」「美化一下我们的系统」。

## 3. 输入 / 输出契约

- 输入：SIS-FUNC-9 主题切换实现（data-theme/data-accent 锚点、ACCENT_OVERRIDES）、各组件现有 var() 使用面
- 输出：
  - 全局主题变量定义（App.vue 非 scoped style 或独立 css）
  - 各组件硬编码颜色 → 变量化（MainView editor-area / TabBar 强调色 / StatusBar / AiPanel / CompareView diff 色 / EditorPane 移除 prefers-color-scheme 块）
  - theme-smoke.mjs 新增暗色工具栏 + 强调色断言
- 输出位置：`d:\lucia\workspace\aida-note\app\src\`（App.vue、views/MainView.vue、components/*）

## 4. 边界与约束

- 可以改：具体色值、变量命名、个别组件样式写法
- 不能改：
  - 主题三态（明/暗/跟随系统）与强调色三方案（蓝/绿/紫）的范围
  - 数据模型与持久化行为
- 必须遵守：
  - 明暗切换以 resolvedTheme + data-theme 为唯一真相（与 FUNC-9 一致）
  - 不以系统偏好查询替代手动主题选择

## 5. 验收标准

- [ ] 暗色模式工具栏背景为深色（非白），按钮实际可见文字为浅色（Playwright 断言）
- [ ] 暗色模式标签栏 / 状态栏 / AI 面板 / 对比视图背景与文字均适配（人工 + 抽查断言）
- [ ] 手动选「暗色」且系统为亮时，暗色样式仍生效（Playwright emulateMedia 组合断言）
- [ ] 强调色切换后 `--accent/--primary-color` 变量随之变化（Playwright）
- [ ] 激活标签条 / 脏标记颜色跟随强调色（人工可辨，断言抽查）
- [ ] 明暗两主题下对比视图 diff 高亮（增/删行与字符）均清晰可辨
- [ ] 原有功能回归不破坏：`npm run test:theme` 全绿 + 全量回归 13 脚本不回归
- [ ] `npm run build`（vue-tsc + vite build）通过
