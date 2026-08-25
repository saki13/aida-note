---
sis_id: SIS-OPT-5
related_backlog_id: OPT-5
priority: P1
stage: active
status: pending（待 PO 确认）
linked_skills: []
---

# SIS：AI 简报悬窗 + 会话缓存

## 1. 任务目标

将现有「AI 文档简报」从随时关闭的弹窗（BriefModal）重构为**程序右上角悬窗**，并建立**当次会话内按文件缓存**：同一文件的简报只生成一次，重开悬窗直接展示缓存；新增**刷新**按钮重新生成；生成中关闭悬窗不中断、后台完成写缓存。功能保持默认关闭（未配置 AI 时入口提示，不生成）。

- 必须完成：
  - 悬窗形态：右上角浮动面板，标题 + 当前文件名 + 刷新 + 收起（最小化为小图标）+ 关闭；关闭后经工具栏「AI 简报」入口可再打开
  - 缓存：aiStore 内存缓存（key=文件路径；未保存标签用 tab.id），同一文件简报只生成一次；重开悬窗不重复调 API
  - 刷新：点击重新生成（abort 旧请求）
  - 后台生成：生成中关闭悬窗请求继续，完成后写缓存；再打开显示缓存（未完成显示 loading）
  - 切换文件：悬窗显示当前文件简报；无缓存显示空态 + 「生成简报」按钮
  - 大纲锚点定位保留（点击滚动到标题行）
  - 默认关闭：未配置 API 不生成并提示；悬窗默认隐藏
- 建议完成：
  - 收起态小图标带状态点（有缓存=可点开，生成中=转圈）
- 当前不做：
  - 缓存跨会话持久化（PO 确认仅当次会话）
  - 悬窗自由拖拽定位（固定右上角）

## 2. 人类意图

PO 原话（2026-08-25）：「弹窗实在是不友好。应该是在程序右上角有一个悬窗展示，可以隐藏，可以关闭，但是再打开依然可以显示已有的简报。即使简报没有生成完，也会在后台完成，再次打开悬窗也会展示缓存。」「我们应该有个缓存。保存已经有的简报内容，并且增加一个刷新的按钮来重新生成。」

## 3. 输入 / 输出契约

- 输入：aiStore（brief 状态改造为 cache + 悬窗 UI 状态）、tabsStore.activeTab（当前文件）、EditorPane.scrollToLine（锚点定位）、aiService.streamChat（简报生成）
- 输出：
  - 悬窗组件（替换 BriefModal：BriefModal 删除或改造为 BriefPanel）
  - aiStore：`briefCache: Map<key, BriefRecord>` + `briefUi: { visible, minimized, key }` + `generateBrief/refreshBrief/closeBrief/ensureBrief`
  - 工具栏入口保留（打开悬窗）
- 输出位置：`d:\lucia\workspace\aida-note\app\src\`（components/*、stores/aiStore、services/aiService 微调）

## 4. 边界与约束

- 可以改：悬窗视觉/布局细节、缓存记录结构（含 status/timestamp）、生成策略（复用进行中请求 vs abort 重启）
- 不能改：
  - 缓存仅当次会话（不持久化）；未配置 API 不生成
  - 锚点定位必须真实滚动（沿用 scrollToLine）
  - AI 调用失败不得破坏文档
- 必须遵守：
  - 关闭悬窗不中断生成（后台完成写缓存）
  - 切换文件不串缓存（按文件 key 隔离）
  - 自测 mock 流式（沿用 page.route）

## 5. 验收标准（opt5-brief-smoke）

- [ ] 悬窗渲染在右上角（非 .n-modal 弹窗），含刷新/收起/关闭按钮与当前文件名（Playwright）
- [ ] 收起为小图标，点击图标重新展开，内容不丢（Playwright）
- [ ] 关闭后工具栏「AI 简报」可重新打开悬窗（Playwright）
- [ ] 同一文件生成一次简报：生成后关闭再打开，不触发第二次 API 请求（page.route 计数断言 =1）
- [ ] 刷新按钮：再次触发 API 请求（计数 +1）且内容更新（Playwright）
- [ ] 生成中关闭悬窗：请求完成（mock 流式有延迟时），重开显示缓存内容（Playwright）
- [ ] 切换文件：显示对应文件简报；无缓存文件显示空态 + 生成按钮（Playwright 双文件场景）
- [ ] 未配置 API：入口点击提示、不生成、无悬窗（Playwright）
- [ ] 大纲锚点点击真实滚动 + 光标定位（沿用）
- [ ] 无页面 JS 错误；既有 ai-smoke / opt1 回归不破坏

## 6. 相关

- 前序：SIS-OPT-1（AI 文档简报 + 大纲锚点，v1 弹窗形态，本任务升级为悬窗+缓存）
- 依赖：EditorPane.scrollToLine（已存在）、aiService.streamChat（已存在）
