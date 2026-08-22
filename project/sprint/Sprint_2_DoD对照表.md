# Sprint 2 DoD 对照表（Review 输入）

> 用途：Sprint Completed 阶段的 DoD 自动评估产出，作为 Sprint 2 Review 的对照依据。
> 生成：2026-08-21，Aida v0.1.0
> 依据：project/sprint/Sprint_2_启动收口.md（DoD 定义 = 各 SIS 验收标准）+ 实际交付物核对
> 评估规则：SKILL 第 15 节（DoD 自动评估规则）

## 一、UI-1：界面布局设计

| 检查项 | 预期（DoD） | 实际 | 结论 |
|--------|------|------|------|
| 1. 布局文档存在且完整 | app/docs/ui-layout.md | `app/docs/ui-layout.md`（7 章节，2026-08-20） | ✅ |
| 2. 三段式 + AI 侧栏 | 工具栏/标签+编辑区/状态栏 + 右侧折叠 | §1 五区 ASCII 布局 + 折叠规则表（320px/默认收起） | ✅ |
| 3. 三视图切换（无路由） | 编辑/对比/设置 | §2 viewMode 组件状态条件渲染 | ✅ |
| 4. 标签交互完整 | 切换/关闭/右键/脏圆点/滚动 | §3 七行交互表（全部映射 tabsStore 动作） | ✅ |
| 5. 工具栏 12 项 Backlog 映射 | 无缺项 | §4 映射表 12/12 + 核查结论 | ✅ |
| 6. 状态栏五槽位 | 行列/编码/语言/换行/缩放 | §5 定义表（含数据来源） | ✅ |
| 7. 与 ARCH-1/2 一致 | 一致性核查 | §7 七项核查全过 | ✅ |

## 二、FUNC-1：多标签文件编辑

| 检查项 | 预期（DoD） | 实际 | 结论 |
|--------|------|------|------|
| 1. 打开/新建/保存/另存 | 完整文件链路 | tabsStore + fileService（Tauri fs/dialog 插件），commit `4648820` | ✅ |
| 2. 脏标记 | 圆点 + 派生复位 | tab.dirty 派生态（updateContent 单点维护），标签圆点 UI | ✅ |
| 3. 关闭确认三选 | 保存/不保存/取消 | Naive UI Dialog 三选（Provider 提升 App 根，白屏修复 f2d7a55） | ✅ |
| 4. 窗口关闭确认 | dirty 拦截 + destroy | onCloseRequested preventDefault + destroy()（capabilities 补 core:window:allow-destroy，`52494ea`），PO 验证「ok 这回行了」 | ✅ |
| 5. 撤销/重做 | CM6 history | basicSetup 内置，Ctrl+Z/Y | ✅ |
| 6. 语言识别 | 扩展名映射 | languageRegistry 5 语言 + plaintext | ✅ |
| 7. 拖拽打开 | 拖文件进窗口 | MainView drop 事件打开 | ✅ |
| 8. Naive UI 首次落地 | 组件库接入 | ToolBar/TabBar/StatusBar/Dialog 全 Naive UI | ✅ |
| 9. Tauri 三插件接入 | fs/dialog/store | npm + cargo 两侧安装注册（镜像方案过关，无转交） | ✅ |

## 三、FUNC-2：多语法高亮

| 检查项 | 预期（DoD） | 实际 | 结论 |
|--------|------|------|------|
| 1. 5 语言高亮 | html/sql/js/json/markdown | languageRegistry 配置化映射 + lang 包挂载，commit `afb510d` | ✅ |
| 2. 语言随文件切换 | 标签语言联动 | createState/applyLanguage Compartment 机制 | ✅ |
| 3. 手动切语言 | 状态栏选择器 | StatusBar NDropdown + setLanguage | ✅ |
| 4. 多标签语言独立 | 各标签各自高亮 | switchToTab 恢复 cmState + 语言对齐（multitab-smoke 验证） | ✅ |
| 5. 主题联动 | 随系统明暗 | themeCompartment + oneDark（ui-smoke 验证 dark/light） | ✅ |
| 6. Compartment 机制 | 动态 reconfigure | language/theme 双槽位（含 emptyState 注册，三重根因修复） | ✅ |
| 7. lint/build 通过 | 双通过 | vue-tsc + vite build + eslint 全过 | ✅ |

## 四、UI-2：交互设计

| 检查项 | 预期（DoD） | 实际 | 结论 |
|--------|------|------|------|
| 1. 文档存在且完整 | app/docs/ui-interactions.md | `app/docs/ui-interactions.md`（7 章节），commit `5658ab8` | ✅ |
| 2. 所见即所得规则 | 光标行内标记隐藏/效果实时 | §1 块级双态机制（光标块源码/其余渲染 + 移开恢复） | ✅ |
| 3. mermaid 交互 | 原位渲染/点击进编辑/修复入口 | §2 双态图 + 修复流程（AI 修复 + diff 预览 + 应用） | ✅ |
| 4. AI 润色交互 | 四动作/接受/撤销/diff | §3 选区浮条四动作 + 结果气泡 diff 高亮 + CM6 history 撤销 | ✅ |
| 5. AI 问答交互 | 侧栏聊天/插光标 | §4 320px 侧栏流式聊天 + 每条回答[插入到光标处] | ✅ |
| 6. 对比交互 | 双栏/滚动联动/差异跳转 | §5 双源入口 + 行偏移对齐联动 + 跳转计数 | ✅ |
| 7. 一致性核查 | 与 UI-1/ARCH 一致 | §7 五项核查全过 | ✅ |

## 五、UI-3：视觉设计

| 检查项 | 预期（DoD） | 实际 | 结论 |
|--------|------|------|------|
| 1. 文档存在且完整 | app/docs/ui-visual.md | `app/docs/ui-visual.md`（6 章节），commit `5658ab8` | ✅ |
| 2. 明暗双主题 + 跟随系统 | 三态 + 设置覆盖 | §1.1 解析规则（light/dark/system + matchMedia 实时跟随） | ✅ |
| 3. CM 主题联动 | 随全局、不单独维护 | §2 复用 FUNC-2 themeCompartment（light=默认/dark=oneDark） | ✅ |
| 4. 图标 + 字体栈 | xicons + 系统栈/等宽栈 | §3 映射表（UI-1 12 项 + UI-2 交互元素）/ §4 双栈定义 | ✅ |
| 5. 应用图标约定 | 建议项 | §5 Tauri icons 全套约定（不阻塞，FUNC-9 同期可换） | ✅ |
| 6. 与 UI-1/UI-2 一致 | 一致性核查 | §6 七项核查全过 | ✅ |

## 六、汇总结论

- 总任务数：5 项（UI-1 / FUNC-1 / FUNC-2 / UI-2 / UI-3）
- 通过：5 项（子检查项 36/36 全过）
- 未通过：0 项
- DoD 总体评估：Sprint 2 五项任务全部按 SIS 验收标准交付。代码型任务（FUNC-1/2）经 PO 系统终端验证（关窗口「ok 这回行了」）或 Playwright 自测（ui-smoke 9/9 + multitab-smoke ALL PASS）；文档型任务（UI-1/2/3）一致性核查全过。无「声称完成但未产出」项。

**观察项（不阻断）**：
1. 窗口关闭确认的完整三选边界（保存全部/不保存/取消逐项路径）PO 仅验证主路径，Sprint 3 期间可顺带复验。
2. 前端自测资产（test:ui / test:multitab）为一次性脚本形态，Sprint 3（FUNC-3~8 全前端）将高频复用，skill 化沉淀列 Evolution Log 观察项（PO 建议过「手动做一个测试 skill」）。
3. 打开文件曾出现一次闪退（未复现），留观；如 Sprint 3 再现即定位。

**下一步**：发起 Sprint 2 Review，按 AS-8 授权模式由 Aida 主持（第 2 次/共 4 次），结论异步广播 PO（data.json events[]）。

---
*生成：Aida v0.1.0 | 2026-08-21 | 供 Review 对照使用*
