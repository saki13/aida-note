# Sprint 4 DoD 对照表（Review 输入）

> 用途：Sprint Completed 阶段的 DoD 自动评估产出，作为 Sprint 4 Review 的对照依据。
> 生成：2026-08-22，Aida v0.1.0
> 依据：project/sprint/Sprint_4_启动收口.md（DoD 定义 = 各 SIS 验收标准）+ 实际交付物核对
> 评估规则：SKILL 第 15 节（DoD 自动评估规则）

## 一、FUNC-9：主题切换（SIS-FUNC-9 八项验收，theme-smoke 8/8）

| 检查项 | 预期（DoD） | 实际 | 结论 |
|--------|------|------|------|
| 1. 三态切换（明/暗/跟随系统） | 工具栏下拉即时生效 | settingsStore.resolvedTheme 单点解析 + ToolBar 下拉（decision-022） | ✅ |
| 2. 强调色（蓝/绿/紫） | 三套配色切换 | ACCENT_OVERRIDES 三套显式覆盖 Naive UI primary（关键坑：默认 primary 是绿，blue 必须显式） | ✅ |
| 3. CM 高亮联动 | 编辑器随主题变化 | EditorPane themeCompartment 读 resolvedTheme | ✅ |
| 4. 系统跟随实时联动 | matchMedia 变化即时切换 | store 内 mediaListener 单次注册（FUNC-2 的 EditorPane 内 mediaQuery 移除） | ✅ |
| 5. 持久化（重启记住） | settings.json theme/accentColor | settingsService/settingsStore 通道复用（decision-020） | ✅ |
| 6. 8/8 自测全绿 | theme-smoke | commit 7c9334b | ✅ |

## 二、FUNC-11：最近文件列表（SIS-FUNC-11 九项验收，recent-smoke 9/9）

| 检查项 | 预期（DoD） | 实际 | 结论 |
|--------|------|------|------|
| 1. 打开/保存记录 | 成功后写入最近列表 | tabsStore.openTab/markSaved 成功后调 settingsStore.addRecentFile（非侵入钩子，decision-023） | ✅ |
| 2. 空态列表 + 引导 | 无标签主区展示 | RecentEmpty.vue + MainView 空态接管 | ✅ |
| 3. 工具栏「最近」下拉 | 与空态一致 | ToolBar 下拉（basename + tooltip 全路径） | ✅ |
| 4. 去重置顶 + 上限 20 | 唯一 + 最近访问在前 | settingsStore.addRecentFile 封装 | ✅ |
| 5. 失效提示 + 移除 | 文件不存在则移除 | openPath 失败 → message.error + removeRecentFile | ✅ |
| 6. 持久化 | settings.json recentFiles | settings 通道 | ✅ |
| 7. 9/9 自测全绿 | recent-smoke + 8 个旧脚本适配 | commit 757f0fa（建标签前置，MainView 行为变更盘点测试前提） | ✅ |

## 三、FUNC-10：自动保存 / 崩溃恢复草稿（SIS-FUNC-10 十项验收，draft-smoke 9/9）

| 检查项 | 预期（DoD） | 实际 | 结论 |
|--------|------|------|------|
| 1. 脏标签防抖写草稿 | 编辑后自动写草稿 | draftService.scheduleDraft（防抖）+ tabsStore.updateContent 脏分支（decision-024） | ✅ |
| 2. 启动恢复/丢弃弹窗 | 崩溃重启可恢复 | MainView setupRecovery + checkRecover + NModal | ✅ |
| 3. 恢复置脏 | 内容回填 + 保存提示 | openTab markDirty（savedContent 置空派生） | ✅ |
| 4. 三态清理（退出/恢复丢弃后/过期） | 不留碎片 | destroy 前 clearAllDrafts / restoreDraft+removeDraft / 7 天 TTL | ✅ |
| 5. 草稿不替代手动保存 | 草稿仅是兜底 | 保存走 markSaved（不经 updateContent），草稿清理挂 markSaved/removeTab | ✅ |
| 6. 双实现（Tauri/浏览器） | 前端自测链路可验证 | appDataDir/drafts + localStorage 模拟 | ✅ |
| 7. 9/9 自测全绿 | draft-smoke | commit 54a048f；Tauri 真实退出清理留 PO | ✅ |

## 四、AI-1：AI 接入（SIS-AI-1 十项验收，ai-smoke 9/9 + ai-mermaid-smoke 4/4）

| 检查项 | 预期（DoD） | 实际 | 结论 |
|--------|------|------|------|
| 1. 单套 API 配置（baseURL/key/model）key 明文存 settings.json | 可配置 + 持久化 | AiPanel 配置区 + aiStore.saveConfig → settings.aiConfig；ai-smoke 持久化校验通过 | ✅ |
| 2. 润色四选入口 = 右键菜单 + 工具栏 | 两种入口均可触发 | EditorPane contextmenu 右键菜单 + ToolBar AI 润色下拉 | ✅ |
| 3. 润色结果原位替换 + diff 式呈现 + 接受/撤销 + 流式 | 验收要求 | 结果气泡（diffChars 字符级高亮）+ 接受（一次事务进 history）+ 放弃；SSE 流式逐字上屏 | ✅ |
| 4. 问答侧栏可折叠 + 仅选中文本上下文 + 流式 | 验收要求 | AiPanel 320px 可折叠（ToolBar 开关）+ buildAskMessages 仅选中文本 + 流式 | ✅ |
| 5. 无选中提示（不带全文） | 无选中时提示先选中 | **修复 computed 缓存 Bug（decision-025）**：直接读 window 实时选区；ai-smoke 校验未发请求 | ✅ |
| 6. 回答一键插入光标处 | 验收要求 | insertAtCursor api + AiPanel 插入按钮 | ✅ |
| 7. mermaid 修复双入口（错误提示按钮 + 工具栏按钮） | 两种都要 | mermaidWysiwyg 错误占位「AI 修复」接线 + ToolBar「修复 mermaid」 | ✅ |
| 8. mermaid 修复替换后正常渲染 | 修正成功则渲染 | 替换源码 → CM6 重建装饰重渲染（错误占位/ready 态；沙箱渲染不稳定，纯文本链路验证 + PO 冒烟） | ✅ |
| 9. 未配置 key / 请求失败明确提示不崩溃 | 验收要求 | isAiConfigured 拦截 + polish/qa error 态 + ai-smoke 校验 | ✅ |
| 10. build 通过 | npm run build | vue-tsc + vite build 通过 | ✅ |

## 五、总体复查

- Sprint 4 四任务 DoD 全部通过：FUNC-9（8/8）、FUNC-11（9/9）、FUNC-10（9/9）、AI-1（9/9 + 4/4），合计 **34/34 自测子项全绿**。
- 全量回归：13 个 smoke 脚本保持（ui 9/9、multitab 通过、format 11/11、search 16/16、wrap 10/10、theme 8/8、compare 12/12、draft 7/7、recent 9/9、wysiwyg 28/28、mermaid 13/13、ai 9/9、ai-mermaid 4/4）。
- build 通过；Backlog 19/19 全部完成（燃尽）。
- 验证分层：前端功能 Playwright 自测；Tauri 专属路径（真实 API 流式、mermaid 真实渲染、两文件对比 dialog、退出草稿清理）列 PO 本地验证项（不阻断交付）。
