# 跨会话决策日志

> 用途：记录跨会话的关键阶段性决策（L3 决策日志）。
> 版本：v0.1.0
> 保留策略：保留最近 20 条。

---

## 决策记录

### decision-001 · 2026-08-19 · 项目定位与技术栈锁定

- **背景**：项目启动（目标：轻便全能文本编辑器），grill 需求收集完成。
- **决策**：
  1. 定位：轻便 + 功能全面的自用文本编辑器，对标 Notepad++ + Typora 杂交；自用刚需，必须好用，不追求产品化但架构保留可移植性。
  2. 平台：Windows 优先，代码保持跨平台。
  3. 技术栈：Tauri 2（Rust + WebView2 + 崩溃 reload 防护）+ Vue 3 + TypeScript + Vite + CodeMirror 6（Typora 式同屏所见即所得）+ mermaid.js + Prettier（SQL 格式化暂不支持）+ 轻量 diff 库。
  4. 功能范围：P0（8 项核心）+ P1（AI/主题/自动保存/最近文件）+ 明确不做（跨文件搜索、多窗口、文件树、运行脚本）。
  5. AI 接入：前端直连自定义第三方 API（OpenAI 兼容协议），能力 = 润色 + 问答 + mermaid 修复。
- **依据**：PO 逐项拍板（grill 决策树 A/B/C/D 四分支全部走完）。
- **影响范围**：PCB 第 1/2/3/7 章、Backlog 全部 19 项 Story、后续全部 Sprint。

### decision-002 · 2026-08-19 · 进入 Backlog Grooming 阶段

- **背景**：项目准备阶段收口完成（PCB 草稿 + 初始 Backlog 19 项已落盘，4 同步点核对通过）。
- **决策**：经 PO 批准，从 `项目准备` 切换至 `Backlog Grooming` 阶段。
- **依据**：程序正义（7.1b）阶段切换需显式申请并等 PO 批准；PO 于 2026-08-19 批准。
- **影响范围**：state / manifest / data.json 的 stage 字段已同步更新；Grooming 收口前必须完成 PCB 定稿（硬约束）。

### decision-003 · 2026-08-19 · Grooming 未决议题定案（U-1~U-5）

- **背景**：Backlog Grooming 首轮梳理，5 项实现细节未决（U-1~U-5）。
- **决策**：
  1. UI 组件库 = Naive UI（U-1）。
  2. **功能范围变更（做减法）**：格式化只用 Prettier，覆盖 html/js/json/markdown 4 种；**SQL 格式化暂不支持**（SQL 语法高亮仍保留）（U-2）。
  3. 文件对比源 = 两个独立文件 + 当前文件 vs 剪贴板（均 P0）；历史版本对比往后放（U-3）。
  4. 设置持久化 = Tauri app config 目录 JSON（U-4）。
  5. 崩溃恢复草稿 = 临时目录，退出/恢复后清理、不留碎片（U-5）。
- **依据**：PO 逐项拍板（2026-08-19）。
- **影响范围**：Backlog FUNC-5/FUNC-6/FUNC-10、PCB 技术栈与术语表、data.json。

### decision-004 · 2026-08-19 · PCB v0.1.0 定稿 + Backlog 首版定稿

- **背景**：Backlog Grooming 收口，PCB 草稿经逐章对齐（grill + U-1~U-5 定案）。
- **决策**：PCB v0.1.0 **定稿**（PO 确认，Grooming 收口硬约束达成）；Backlog 首版定稿（19 项，主事实源重命名）。
- **依据**：PCB 定稿为 Grooming 收口硬约束（白皮书）；PO 于 2026-08-19 确认。
- **影响范围**：PCB 状态「待确认」→「已定稿」；Backlog 文件重命名；后续 Planning / Sprint 以此为唯一事实源。

### decision-005 · 2026-08-19 · 进入 Planning 阶段

- **背景**：Backlog Grooming 收口完成（PCB v0.1.0 定稿 + Backlog 首版定稿 19 项）。
- **决策**：经 PO 批准，从 `Backlog Grooming` 切换至 `Planning` 阶段。
- **依据**：程序正义（7.1b）阶段切换需显式申请并等 PO 批准；PO 于 2026-08-19 批准。
- **影响范围**：state / manifest / data.json 的 stage 字段已同步更新；Planning 执行候选收集 + 三级收敛 + 顺序确认。

### decision-006 · 2026-08-20 · 全部 19 项需求 SIS 完成（逐项问答收口）

- **背景**：PO 要求先完整过一遍全部 19 项需求、逐项问答生成 SIS，为后续短 Sprint 提供可执行条件。
- **决策**：19 项需求全部完成 SIS（ENV-1/2、ARCH-1/2、UI-1/2/3、FUNC-1~11、AI-1），均 stage=active、status=confirmed，Backlog 全部标记「已排期」。
- **依据**：PO 逐项「照推荐/确认/定稿」拍板（2026-08-19 至 2026-08-20）。
- **影响范围**：project/sis/ 下 19 个 SIS 文件；Backlog 全部 19 项标记「已排期」；data.json backlog 值域修正（open→pending）；state/manifest 进度。

### decision-007 · 2026-08-20 · Planning 收口：4 短 Sprint 划分锁定

- **背景**：19 项 SIS 全部完成，Planning 进入正式收尾（三级收敛 + 顺序确认）。
- **决策**：三级收敛锁定全部 19 项为正式输入，分 4 个短 Sprint：S1 地基（ENV-1/2、ARCH-1/2）→ S2 核心（UI-1/2/3、FUNC-1/2）→ S3 增强（FUNC-3~8）→ S4 体验/AI（FUNC-9~11、AI-1）；无候补/暂缓项。
- **依据**：PO 三级收敛 + 顺序确认拍板（2026-08-20）。
- **影响范围**：Sprint 1 启动收口文档；Backlog Sprint 划分；data.json sprint/sprints；state/manifest。

### decision-008 · 2026-08-20 · PO 授权 4 次短 Sprint（AS-8）+ 进入 Sprint 1 执行

- **背景**：Planning 收口完成（decision-007），Aida 申请短 Sprint 授权（AS-8），PO 明确授权。
- **决策**：
  1. PO 授权 Aida **4 次短 Sprint**（按 AS-8「次」计量，一次授权 = 一个完整 Sprint 闭环：阶段 3-8），预计 4 次燃尽 Backlog 池（项目进入尾声）。
  2. PO 附加三条硬性要求：①严格按工作流程执行，无 PO 干预也坚持流程正义；②记录中间过程资产；③及时更新 Evolution Log（Aida 第一个独立项目，积累有效经验）。
  3. 授权生效即进入 **Sprint 1 执行**（ENV-1 -> ENV-2 -> ARCH-1/ARCH-2），执行模式 = 短 Sprint 自主执行。
- **依据**：PO 文本授权（2026-08-20）："授权给aida4次短sprint，按照预定计划不出意外 4次将燃尽backlog池……一定要严格按照工作流程来工作，即便没有我的干预，也要坚持流程正义记录中间的过程资产……一定要及时更新 Evolution Log。看你的了 aida 加油"
- **影响范围**：state / manifest / data.json（stage 切换至 Sprint In Progress、events[] 记录授权事件）；Sprint 1 执行全程；evolution_log.md；剩余 3 次授权余量。

### decision-009 · 2026-08-20 · ENV-1 完成 + 沙箱下载对策（cargo 镜像加速方案）

- **背景**：ENV-1 六项验收全部通过（脚手架/功能分层/TS strict/ESLint/git 基线 d704a31/Tauri 窗口弹出，窗口验证由 PO 系统终端完成）。期间两次撞 IDE 沙箱限制（rustup 工具链下载、cargo crates 下载），均由 PO 接手。PO 反馈：「短 sprint 经常把工作交给我不是明智之举，要么不用沙箱，要么做个 skill 通过真实环境做下载任务」。
- **决策**：
  1. ENV-1 收口（DoD 全过），进入 ENV-2。
  2. 沙箱下载问题采用**镜像加速方案**：配置 cargo 国内镜像（rsproxy.cn，用户级 `~/.cargo/config.toml`）把 crates 下载时间压进沙箱可承受范围，后续编译类命令由 Aida 在沙箱内自主完成，不再转交 PO。该配置属低风险环境配置（不改项目代码、不影响 Sprint 目标），按 T3 5.1/6 自批。
  3. skill 方案（AS 沙箱长时命令执行规则）列入 Evolution Log 观察项：若镜像方案在后续 Sprint 仍不够用，正式立项为 product/skills/ 新资产。
- **依据**：PO 反馈（2026-08-20）+ 沙箱实测（cargo fetch 被截断，与 rustup 同型）。
- **影响范围**：`~/.cargo/config.toml`（用户级，不入库）；ENV-2 起的执行方式；evolution_log.md。

### decision-010 · 2026-08-20 · ENV-2 完成（核心依赖接入）

- **背景**：ENV-1 收口后立即执行 ENV-2，npm 安装顺利（沙箱内 15 秒完成，npm 源无沙箱截断问题）。
- **决策**：
  1. 依赖清单锁定：codemirror ^6.0.2（+ @codemirror/state / @codemirror/view 显式声明）、5 语言包（lang-html/javascript/json/markdown/sql）、mermaid ^11.17.0、prettier ^3.9.6（移入 dependencies，FUNC-5 运行时用）、diff ^9.0.0、pinia ^4.0.3；无 vue-router。
  2. 验证方式：main.ts 注册 Pinia + src/services/dependencies.ts 静态 import 验证（vue-tsc 全量类型检查覆盖），lint + build 双通过。
  3. ESLint 补充 ignore：src-tauri/target/**（PO 编译产物误报）。
- **依据**：SIS-ENV-2 验收标准 5/5 通过（2026-08-20）。
- **影响范围**：app/package.json / package-lock.json（lockfile 入库实现版本锁定）；main.ts；services/dependencies.ts；eslint.config.js。

### decision-011 · 2026-08-20 · Sprint 1 闭环（ARCH-1/2 完成 + Review 通过 + 授权用量 1/4）

- **背景**：Sprint 1 四任务全部完成（ENV-1 d704a31 / ENV-2 6d9ddfa / ARCH-1 762409d / ARCH-2 6e8bc8a），逐任务 DoD 已过，进入阶段 4-8 闭环收口。ARCH-1/2 为同型纯文档任务、同日连续完成、无中间阻塞与 PO 交互，按 Evolution Log 经验合并为本条决策留痕（异型任务仍逐任务收口）。
- **决策**：
  1. ARCH-1 收口：`app/docs/architecture.md` 产出（Rust 最小化 + IPC 插件契约 + services/stores 分层 + 单向依赖规则），commit 762409d。
  2. ARCH-2 收口：`app/docs/state-architecture.md` 产出（Tab 接口 / 脏标记派生态 / 关闭确认状态机 / UTF-8+BOM 契约 / 设置浅合并），commit 6e8bc8a。两文档成为 FUNC-1/2 与全部 UI 任务的实现蓝图。
  3. Sprint 1 Review 结论：**Passed With Observation**（23/23 子检查项通过，2 观察项：沙箱转交史已对策化 / Tauri 插件延后属计划内）。Aida 按 AS-8 代行判定，PO 保留翻案权。
  4. 阶段 7 轻量 Retrospective：反思并入 evolution_log.md（Sprint 1 收口回填记录），不开独立会议。阶段 8 产出 Sprint 2 候选清单（UI-1/2/3、FUNC-1/2）。
  5. 授权用量：**1/4**，余 3 次。Backlog 未燃尽（4/19），按流程进入 Sprint 2 Planning。
- **依据**：SIS-ARCH-1/ARCH-2 验收标准全过（2026-08-20）；Sprint_1_DoD对照表（23/23）；AS-8 阶段 3-8 闭环要求；Sprint_1_Review报告。
- **影响范围**：app/docs/（两架构文档）；project/sprint/（DoD 对照表 / Review 报告 / Sprint 2 候选清单）；project/traces/（audit_trace_sprint1 + events_sprint1）；Backlog / data.json / state / manifest（四边同步收口）；evolution_log.md。

### decision-012 · 2026-08-21 · FUNC-1 完成（多标签文件编辑）+ 关窗口/白屏/沙箱三类问题对策定案

- **背景**：FUNC-1 前端实现与窗口验证完成，期间连遇三类技术问题：①关闭窗口确认失效（用户「关窗口无效」）；②白屏（用户「现在打开白屏了」）；③关窗口确认后仍无法关闭（用户「好家伙不白屏 就不能关闭」）。均已修复并经 PO 系统终端验证通过。
- **决策**：
  1. FUNC-1 收口（DoD 9/9 过，commit 4648820 + 52494ea），进入 FUNC-2。
  2. **白屏根因与对策**：Naive UI `useDialog()` 必须在其 `NDialogProvider` 后代组件中调用；MainView setup 顶层在 Provider 挂载前调用导致崩溃白屏。对策：Provider 提升到 App 根部（commit f2d7a55）。
  3. **关窗口根因与对策**：`destroy()` 属破坏性操作，不在 `core:default` 权限内，需单独授权 `core:window:allow-destroy`，缺失时被权限系统静默拒绝导致拦截后二次关闭失败；且二次关闭必须用 `destroy()` 而非 `close()`（close 会重新触发 onCloseRequested 造成无法关闭）。对策：capabilities 补 `core:window:allow-destroy` + 确认后调 destroy()（commit 52494ea）。
  4. **沙箱教训（回填）**：IDE 沙箱无法承载 rustup 组件分发（300MB+ 截断），cargo 镜像方案对 crates 索引有效但组件分发仍受限——「沙箱长时命令执行规则」skill 立项评估继续保留观察。
- **依据**：PO 验证反馈（2026-08-21「ok 这回行了」）；Tauri 2 官方权限模型与 onCloseRequested/destroy 文档；SIS-FUNC-1 验收标准 9/9。
- **影响范围**：app/src/views/MainView.vue、app/src/App.vue、app/src-tauri/capabilities/default.json；Backlog / data.json / state / manifest（四边同步）；evolution_log.md。

### decision-013 · 2026-08-21 · FUNC-2 完成（多语法高亮）+ markRaw 原则确立 + 前端自测能力建立

- **背景**：FUNC-2 实现后高亮/主题切换完全不生效但无任何报错。经 27 个渐进式诊断脚本定位出**三重根因**：①初始 view state 未注册 Compartment 槽位（`view.state.config.compartments.size === 0` 为证）-> reconfigure 被 CM6 静默忽略；②Ctrl+N 时 language watch 先于 activeTabId watch 触发，applyLanguage 把空 state 污染进新标签 cmState 缓存；③**决定性根因**：EditorState 存入 Pinia reactive 数组后被 Vue 深度代理，`config.compartments` Map 的 key 变 proxy 实例，与模块级原始 Compartment `===` 比较失败（diag22/27 铁证：多标签恢复后 sameLang=false、单标签 true）-> `markRaw()` 修复。同时 PO 明确要求建立前端自主测试能力（「后边的功能都是前端的内容你完全可以自己测试……大不了手动做一个测试 skill」），并授权 Aida 短 Sprint 内自主决策（「这是短sprint 你自己决定就可以」）。
- **决策**：
  1. FUNC-2 收口（DoD 7/7 过，commit afb510d），Sprint 2 剩 UI-2/UI-3。
  2. **markRaw 原则确立（架构级）**：外部库复杂对象（EditorState/Compartment 实例等）存入 Vue reactive store 时必须 `markRaw()`，否则深度代理破坏对象内部身份比较（Map key/`===`），导致依赖实例身份的库机制静默失效。同理：所有创建的 CM6 state（含初始空 state）必须注册同一对 Compartment 实例。
  3. **前端自测能力落地**：Playwright + 系统 Edge（`channel: "msedge"`，免下载 chromium）链路跑通，产出 `test:ui`（单标签 9 项）/ `test:multitab`（多标签 3 组）两个可复用 npm scripts 作为正式测试资产；后续前端功能验证由 Aida 自主完成，不再转交 PO。测试 skill 沉淀列 Evolution Log 观察项（test:ui/test:multitab 已是雏形）。
- **依据**：SIS-FUNC-2 验收标准 7/7（2026-08-21）；diag22/27 实例一致性铁证；PO 指令（2026-08-21 自测能力建设 + 短 Sprint 自主决策授权）。
- **影响范围**：app/src/components/EditorPane.vue、app/src/stores/tabsStore.ts、app/src/services/languageRegistry.ts、app/src/components/StatusBar.vue、app/scripts/（ui-smoke + multitab-smoke）、app/package.json；Backlog / data.json / state / manifest（四边同步）；evolution_log.md；后续全部前端组件的 store 编写方式。

### decision-014 · 2026-08-21 · UI-2/UI-3 完成（交互设计 + 视觉设计，同型合并收口）

- **背景**：FUNC-2 收口后 Sprint 2 剩 UI-2/UI-3 两项纯设计文档任务，PO 已授权短 Sprint 内自主决策（「这是短sprint 你自己决定就可以」）。两任务同型（纯文档）、同日连续完成、无中间阻塞与 PO 交互，符合 decision-011 确立的合并收口判定标准。
- **决策**：
  1. UI-2 收口：`app/docs/ui-interactions.md` 产出（四条交互链路：所见即所得块级双态 Typora 式 / mermaid 原位渲染 + 点击进编辑 + AI 修复入口 / AI 润色选区现场四动作 + diff 气泡接受撤销 + 问答侧栏回答插光标 / 对比双栏行映射滚动联动 + 差异跳转），SIS-UI-2 验收 7/7 过。
  2. UI-3 收口：`app/docs/ui-visual.md` 产出（明暗双主题三态解析 light/dark/system / CM 主题复用 FUNC-2 themeCompartment 联动 / xicons 图标语义锁定含 UI-1 工具栏 12 项映射 / 系统字体栈 + 等宽代码栈 / 应用图标约定），SIS-UI-3 验收 6/6 过。
  3. 两文档与 UI-1/ARCH-1/ARCH-2/FUNC-2 机制一致性核查通过；成为 FUNC-3/4/6/9 与 AI-1 的直接实现依据。
  4. Sprint 2 全部 5 任务完成（UI-1/2/3 + FUNC-1/2），commit 5658ab8，进入 Sprint 2 收口（阶段 4-8）。
- **依据**：SIS-UI-2 §5 验收 7/7、SIS-UI-3 §5 验收 6/6（2026-08-21）；decision-011 合并收口先例；PO 自主决策授权。
- **影响范围**：app/docs/ui-interactions.md、app/docs/ui-visual.md；Backlog / data.json / state / manifest（四边同步）；FUNC-3/FUNC-4/FUNC-6/FUNC-9/AI-1 的实现依据。

### decision-015 · 2026-08-21 · Sprint 2 闭环（UI/核心五任务完成 + Review 通过 + 授权用量 2/4）

- **背景**：Sprint 2 五任务全部完成（UI-1 1169dc4 / FUNC-1 4648820+52494ea / FUNC-2 8383d5f+afb510d / UI-2+UI-3 5658ab8），逐任务 DoD 已过，走阶段 4-8 闭环。期间 PO 两个关键介入均闭环：①FUNC-1 关窗口修复验证（「ok 这回行了」）；②自测能力指令（「后边的功能都是前端的内容你完全可以自己测试」-> Playwright 资产落地）。
- **决策**：
  1. Sprint 2 DoD 总体复查 36/36 过（Sprint_2_DoD对照表）。
  2. Sprint 2 Review 结论：**Passed With Observation**（3 观察项：窗口关闭三选边界待复验 / 自测资产 skill 化评估 / 打开文件闪退一次留观）。Aida 代行判定，PO 保留翻案权，events[] 广播。
  3. 阶段 7 轻量 Retrospective：反思并入 evolution_log.md（Sprint 2 收口回填记录，含 markRaw 三重根因方法论 + Playwright 自测链路两条本 Sprint 重大经验）。
  4. 阶段 8 产出 Sprint 3 候选清单（FUNC-3~8 六项，执行顺序 FUNC-3 -> 4 -> 5 -> 7 -> 8 -> 6）。
  5. 授权用量：**2/4**，余 2 次。Backlog 累计 9/19，按流程进入 Sprint 3 Planning。
- **依据**：SIS-UI-1/2/3、SIS-FUNC-1/2 验收标准全过（2026-08-20~21）；Sprint_2_DoD对照表（36/36）；AS-8 阶段 3-8 闭环要求；Sprint_2_Review报告。
- **影响范围**：project/sprint/（DoD 对照表 / Review 报告 / Sprint 3 候选清单）；Backlog / data.json / state / manifest（四边同步收口）；evolution_log.md；Sprint 3 执行全程。

### decision-016 · 2026-08-22 · FUNC-3 完成（Markdown 同屏所见即所得）+ 四项 CM6 关键经验

- **背景**：Sprint 3 主峰 FUNC-3 实现，Playwright 自测 28/28 全绿，build 通过，收口四边同步。
- **决策**：
  1. decorations 提交通道：块级装饰（block widget / 行级 class）必须经 StateField + `EditorView.decorations.from`（compute 型直接值）提供；ViewPlugin 的 `decorations` spec 是函数形式，CM6 强制禁止含块级装饰（抛 `RangeError: Block decorations may not be specified via plugins`，view d.ts §EditorView.decorations：仅直接提供的 set 可影响垂直布局）。
  2. markdown 语言配置：`markdown()` 默认 base 是 commonmarkLanguage（无 GFM，删除线/表格不解析），须显式 `markdown({ extensions: GFM })`（GFM 自 @lezer/markdown 导入）；**不用** `markdownLanguage`——其自带 `foldNodeProp.add({Table})` 在增量解析时对未对齐旧树位置调 lineAt 抛 TypeError（本任务实测）。
  3. 行级装饰 range 必须零长度（`Decoration.line(...).range(lineStart)`，CM6 校验非零即抛）；表格/分隔线块 widget 点击进源码态 = mousedown preventDefault + dispatch selection 到块起点（SIS 建议项，验收通过）。
  4. 语法树增量解析滞后防御：StateField.update 中 `syntaxTree(tr.state).length !== doc.length` 时沿用旧 deco（CM6 绘制时按事务 changes 自动映射），避免 lineAt 越界。
- **依据**：SIS-FUNC-3 九项验收（wysiwyg-smoke.mjs 28/28 PASS）；CM6 view/state dist 源码实证（disallowBlockEffectsFor / LineDecoration.range / markdown() base 默认值）。
- **影响范围**：markdownWysiwyg.ts/css、languageRegistry.ts、tabsStore.ts（openTab 联合类型 `in` 收窄，历史遗留 TS 错误修复）、wysiwyg-smoke.mjs（含 fs 落盘报告）、package.json（test:wysiwyg）；FUNC-4~8 复用 StateField 通道与自测资产；看板实例归位 project/panel/workflow/（此前读模板导致「未启动」显示）。

---

<!-- 后续在此追加，格式：

### decision-00X · YYYY-MM-DD · 决策摘要

- **背景**：
- **决策**：
- **依据**：
- **影响范围**：

-->
