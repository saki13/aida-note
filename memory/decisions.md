# 跨会话决策日志

> 用途：记录跨会话的关键阶段性决策（L3 决策日志）。
> 版本：v0.1.0
> 保留策略：保留最近 20 条。

## 决策记录

### decision-026 · 2026-08-22 · Sprint 5（使用手册 + 安装包）：打包元数据规范化 + 沙箱 bundler 限制对策（绿色版交付 / PO 本地兜底）

- **背景**：项目交付（Backlog 19/19 燃尽、报告 PO 确认）后，PO 追加授权第 5 次短 Sprint：「还需要使用手册 + 安装包」。
- **决策**：
  1. **打包元数据规范化**：`tauri.conf.json` productName=aida-note、identifier=com.aidanote.editor、窗口 1200×800（min 640×480）、bundle.targets=all（MSI+NSIS）、short/longDescription 中文描述；`Cargo.toml` name=aida-note（lib 名 app_lib 保留，main.rs/lib.rs 零改动）；exe 版本信息实测 ProductName=aida-note/0.1.0。
  2. **沙箱对 tauri bundler 工具下载（WiX/NSIS）特定阻断**：github.com HEAD 200 可达、但下载连接停滞（缓存目录不生成、进程 CPU≈0）、ghproxy.net 403 → 判定非全局网络故障，而是沙箱对 bundler 下载的特定阻断。对策：**绿色版 ZIP（便携）立即交付**（release exe 自包含前端，解压即用，4.6MB，启动冒烟 15s 存活）+ MSI/NSIS 前置全就绪（dist 已刷新 / cargo release 缓存 / 配置规范化）列 PO 本地终端 `npm run tauri build` 一键兜底，产物 `app/src-tauri/target/release/bundle/`。
  3. **`--config <file>` 覆盖技巧**：独立 JSON 配置文件（`tauri.bundle.config.json`）的 `build.beforeBuildCommand: "echo ..."` 可跳过 tauri build 前置前端构建（PowerShell 内联 JSON 引号会被损坏，内联不可行）；收口后删除该临时文件。
  4. **沙箱长命令存活法（第三次验证）**：前台长命令（cargo build / tauri build / vue-tsc 段）被静默击杀（退出码 0 无输出），后台孤儿进程（`cmd 2>&1 | Out-String` 或 Start-Process 分离）可存活并推进——本 Sprint 完成 release 编译与 dist 刷新均靠此机制。
- **依据**：Sprint_5_DoD对照表（使用手册 5/5 ✅；安装包：元数据/exe/启动验证/绿色版 ZIP/dist 最新 ✅；MSI+NSIS ⏳ PO 兜底）；实测（exe 12.95MB、启动 15s 存活、zip 4.6MB、dist 19:43 刷新）。
- **影响范围**：tauri.conf.json / Cargo.toml（元数据）；`app/dist-install/`（aida-note.exe + aida-note-portable.zip 交付物）；`project/使用手册.md`（10 节完整手册）；Sprint_5_启动收口.md / Sprint_5_DoD对照表.md；change_log CHG-001；MSI/NSIS 正式安装包由 PO 本地产出。

---

### decision-025 · 2026-08-22 · AI-1 完成（AI 接入）+ 沙箱流式限制对策与选区缓存 Bug

- **背景**：Sprint 4 最后一项 AI-1 实现（单套 OpenAI 兼容 API 配置 + 润色四选/问答/mermaid 修复三能力 + 流式输出 + 原位替换接受/撤销 + 问答侧栏插光标 + mermaid 双入口修复），Playwright 自测 ai-smoke 9/9 + ai-mermaid-smoke 4/4 全绿，build 通过，全量回归 13 脚本保持。
- **决策**：
  1. **aiService 依赖注入**：`streamChat(cfg, messages, cb, signal)` 原生 fetch + SSE 逐行解析（data: 行 + [DONE] 终止 + delta.content 增量，跳过 reasoning_content），零新增依赖；`isAiConfigured` 全字段非空判断——未配置/失败本地提示不崩溃。
  2. **关键 Bug（问答沿用旧选区上下文）**：AiPanel 曾用 `computed(() => window.__aidaSelection)`——**window 属性非响应式，computed 首次求值即永久缓存**，后续选区变化不刷新 → 无选中时仍拿旧选区发起请求（违反 SIS「仅选中文本、无选中提示」硬约束）。修复：send 时直接读 window 实时值（`currentSelection()`）。经验：**凡 computed 依赖非响应式外部值，必须改为每次读取或显式依赖注入**。
  3. **沙箱限制对策（流式与渲染）**：实测本沙箱①对长运行命令静默击杀（55s 定时器也被杀，阈值 ~30-40s 有波动）②阻断真实 SSE 长连接（非流式 200 正常、流式响应体读取即静默终止）③mermaid 渲染（动态 import + SVG + 系统字体测量）不稳定（同脚本一次 13/13、一次被击杀）。对策：ai-smoke 用 `page.route("**/chat/completions")` 拦截返回模拟 SSE 流确定性验证全链路 UI 行为，并校验请求形状（model+stream+prompt 三类）；ai-mermaid-smoke 在纯文本模式验证修复链路（firstMermaidBlock 正则 + fixMermaid + replaceRange 整块替换，不触发渲染）；真实 API 可达性已用非流式探测验证（200 chatcmpl），真实流式冒烟列 PO 验证项。
  4. **n-message 3s 自关的断言坑**：提示类断言若先「触发动作再统计计数」，消息可能已出现又消失（before=1/now=0 竞态）。对策：确定性信号用副作用轮询（如 localStorage 持久化），提示断言用「存在性轮询」或「动作前计数→递增」。
  5. **浮条/气泡定位坑**：润色气泡/右键菜单绝对定位若以视口为包含块会盖住顶部工具栏（冒烟实测气泡盖住「AI 面板」按钮致点击失效）。修复：.editor-pane 设 position:relative 作包含块。
- **依据**：SIS-AI-1 十项验收（ai-smoke 9/9 + ai-mermaid-smoke 4/4）；沙箱实证（55s 定时器被杀 / 非流式 200 流式被杀 / mermaid 渲染波动）。
- **影响范围**：aiService.ts / aiStore.ts / AiPanel.vue（新建）、EditorPane.vue（选区浮条+右键菜单+结果气泡+replaceRange/insertAtCursor）、ToolBar.vue（AI 面板/AI 润色/修复 mermaid 入口）、MainView.vue（AiPanel 集成 + aiPanelApi）、mermaidWysiwyg.ts（错误占位 AI 修复接线）、ai-smoke.mjs / ai-mermaid-smoke.mjs、package.json（test:ai/test:ai-mermaid）；**Backlog 19/19 全部完成，燃尽，进入项目交付征询 PO**。

---

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

### decision-017 · 2026-08-22 · FUNC-4 完成（mermaid 编写 + 原位实时渲染）

- **背景**：Sprint 3 第二项 FUNC-4 实现，Playwright 自测 13/13 全绿，FUNC-3 回归 28/28 保持，build 通过。
- **决策**：
  1. mermaid 围栏块升级为图表 widget（block replace 替换 FencedCode），块级双态与 FUNC-3 同款（光标外渲染/光标内源码）；复用 StateField 通道与点击进源码交互（decision-016）。
  2. **渲染串行队列 + 超时保护**：mermaid 是全局单例，多块并发渲染时错误块挂起会阻塞后续（实测：有效块永远等不到渲染）；改为 Promise 链串行 + 10s 超时兜底，失败落错误占位。
  3. 防抖 300ms 出图（UI-2 §2.1：渲染是「离开触发」不是输入触发）；主题联动 = 渲染前按 prefers-color-scheme 设 mermaid theme + matchMedia change 时存活 widget 重渲染。
  4. 图交互：只读 + 缩放（CSS 原尺寸/自适应切换）+ 导出 SVG/PNG（mermaid SVG 输出 + canvas 转 PNG + 浏览器下载，零新增依赖）。
  5. 「AI 修复」入口占位：错误占位框内按钮 + dataset.source 存出错源码（数据传递契约），点击占位提示，逻辑归 AI-1（SIS 建议项，不实现 AI 调用）。
- **依据**：SIS-FUNC-4 九项验收（mermaid-smoke.mjs 13/13 PASS）；UI-2 §2 蓝图；mermaid 11 API（render/initialize，dist 源码实证）。
- **影响范围**：mermaidWysiwyg.ts/css、markdownWysiwyg.ts（FencedCode 分支接入）、wysiwyg-smoke.mjs（mermaid 断言升级为 widget）、package.json（test:mermaid）；FUNC-4 与 FUNC-3 协同（普通代码块保持源码展示）。

### decision-018 · 2026-08-22 · FUNC-5 完成（代码格式化）+ 快捷键与自测三条经验

- **背景**：Sprint 3 第三项 FUNC-5 实现（Prettier standalone + 按语言动态插件，html/js/json/markdown），Playwright 自测 11/11 全绿，FUNC-3/4 回归 28/28 + 13/13 保持，build 通过。
- **决策**：
  1. **Ctrl+Shift+F 不用 CM6 keymap（"Mod-Shift-f"），改 `Prec.highest(EditorView.domEventHandlers({keydown}))` 直接拦截**：实测 "Mod-Shift-f" 绑定在 Shift 组合下被搜索面板 "Mod-f" 抢先命中——Playwright 合成事件 `event.key` 是小写 "f"，CM6 keyName 走 A 分支拼出 "Ctrl-f" 命中 openSearchPanel；真实键盘 `event.key` 为大写 "F"，需 fallback 的 base[70]="f" 分支（B1）才能命中，环境相关。domEventHandlers 双兼容 `e.key === "f" || "F"`，返回 true 停止后续 handler。
  2. **EditorView.domEventHandlers 的 handler 参数顺序是 `(event, view)`**（bindHandler 内 `handler.call(plugin, event, view)`），写反会静默失效（条件恒 false，无报错无日志——「无报错但功能失效」类问题新一例）。
  3. **CM6 的 `.cm-content` textContent 不含 `\n`**（CM6 用 CSS 渲染行，块间不产生换行符）：多行内容断言不能用 `\n`，改用缩进空格子串（如 `"  <p>hi</p>"`）。
  4. Naive UI toast 3s 存留期：等 toast 元素会被前一步旧 toast 骗过，须轮询「内容变化」（waitForFunction 目标文本）而非等元素出现。
- **依据**：SIS-FUNC-5 九项验收（format-smoke.mjs 11/11 PASS）；CM6 view dist 源码实证（buildKeymap 同 key run 顺序、bindHandler 参数顺序、contentDOM 事件绑定、domEventHandlers runHandlers）；w3c-keyname base[70]="f"。
- **影响范围**：EditorPane.vue（formatKeydownHandler 替换 formatKeymap）、formatService.ts、ToolBar.vue（canFormat 置灰）、MainView.vue（EditorApi.format）、format-smoke.mjs、package.json（test:format）；后续 FUNC-7~8 的自测断言遵循「无 \n」与「轮询内容」经验。

### decision-019 · 2026-08-22 · FUNC-7 完成（搜索/替换）+ CM6 搜索面板三条经验

- **背景**：Sprint 3 第四项 FUNC-7 实现（复用 CM6 search 扩展），Playwright 自测 16/16 全绿，mermaid 回归 13/13 保持，build 通过。
- **决策**：
  1. **CM6 搜索面板无视觉计数/空态提示**（仅 announceMatch 屏幕阅读器播报）——SIS 要求可见计数，自研 `SearchCount` ViewPlugin：监听查询变化（getSearchQuery 的 spec 键），用 `new SearchQuery(spec).getCursor(state)` 遍历计数，渲染 `.cm-search-count` span（「N 个匹配」/「无结果」/「正则无效」三态），零新增依赖。
  2. **面板顶部浮动**：`search({ top: true })` 预注册 searchExtensions（basicSetup 仅含 searchKeymap，面板首次打开才动态 appendConfig）+ CSS absolute 悬浮（VS Code 风格，临时覆盖不压缩编辑区）。**注意**：openSearchPanel 在 searchExtensions 未注册时用 StateEffect.appendConfig 注入，注册后走 togglePanel 分支。
  3. **Playwright fill 在搜索面板二次打开后不触发 commit**：CM6 搜索框 commit 走 onkeyup/onchange（无 oninput），fill 的 change 在「Esc 关闭→重开」会话中实测失效（同面板内 fill 有效）——自测统一改用「点击 + Ctrl+A + type」（type 触发 keyup）。
  4. **替换后撤销须先聚焦编辑器**：替换按钮点击后焦点留在搜索面板，Ctrl+Z 在 "search-panel" scope 无 undo 绑定，需点击 .cm-content 聚焦后撤销。
- **依据**：SIS-FUNC-7 八项验收（search-smoke.mjs 16/16 PASS）；CM6 search dist 源码实证（SearchPanel commit/onkeyup、openSearchPanel appendConfig、SearchQuery.getCursor、searchConfigFacet 默认 top:false）。
- **影响范围**：EditorPane.vue（search({top:true}) + searchCountExtension + ready.search + 面板样式）、searchCount.ts、ToolBar.vue（搜索按钮解锁）、MainView.vue（EditorApi.search）、search-smoke.mjs、package.json（test:search）；FUNC-8 软换行同理在 extensions 加配置。

### decision-020 · 2026-08-22 · FUNC-8 完成（软换行）+ settings 基础设施最小子集落地

- **背景**：Sprint 3 第五项 FUNC-8 实现（CM6 lineWrapping + 全局开关 + 持久化），Playwright 自测 10/10 全绿，build 通过。
- **决策**：
  1. **软换行 = `EditorView.lineWrapping` + Compartment 动态切换**：lineWrapping 本质是 `contentAttributes({class:"cm-lineWrapping"})`（.cm-content 加 class），reconfigure 即时生效、不触碰文档（折行不写入 \n，验收由内容不变断言覆盖）；复用 FUNC-2 槽位模式（所有 state 注册同一 wrapCompartment 实例）。
  2. **switchToTab 恢复旧 state 后 applyWrap 校正**：cmState 缓存的 wrap 配置可能过期（与 applyLanguage/applyTheme 同款防过期模式）。
  3. **settingsService/settingsStore 最小子集**：按 ARCH-2 §4.2 schema（AppSettings：theme/wordWrap/recentFiles/aiConfig + DEFAULT_SETTINGS 兜底 + aiConfig 深合并 + 未知字段忽略前向兼容）；Tauri 用 plugin-store（settings.json），浏览器（前端自测）localStorage 兜底；save 为读-合-写整体回写。**字段命名取 ARCH-2 的 `wordWrap`**（SIS-FUNC-8 建议 wrapLines，可改字段命名，架构对齐优先避免 Sprint 4 返工）。
  4. **设置项 = 工具栏按钮（最简形态）**：FUNC-8 无独立设置视图（ARCH-2 settingsStore 完整视图在 Sprint 4），工具栏「换行」开关即设置项入口（全局生效 + 持久化），Sprint 4 设置视图复用 settingsStore.wordWrap。
- **依据**：SIS-FUNC-8 七项验收（wrap-smoke.mjs 10/10 PASS）；ARCH-2 §4.2（state-architecture.md AppSettings schema + 兼容策略）；CM6 view dist 源码（lineWrapping = contentAttributes）。
- **影响范围**：settingsService.ts、settingsStore.ts（新建）、EditorPane.vue（wrapCompartment/applyWrap/init）、ToolBar.vue（换行按钮）、wrap-smoke.mjs、package.json（test:wrap）；FUNC-9 主题/设置视图复用 settings 通道（theme 字段已就位）。

### decision-021 · 2026-08-22 · FUNC-6 完成（文件对比）+ 双栏 diff 四条经验

- **背景**：Sprint 3 第六项 FUNC-6 实现（双栏 diff：行级+行内字符级高亮 / 滚动联动 / 跳转计数 / 接受左或右合并 / 剪贴板只读），Playwright 自测 12/12 全绿，build 通过。
- **决策**：
  1. **对比能力 = jsdiff（diffLines+diffChars）+ 自研行模型**：配对 removed+added 块内做行内字符级 diff；行模型按左右两栏分别产出（lineNo 0=占位），差异块记录双栏行索引区间供跳转与合并。**合并 = 按行号区间替换目标侧**（全占位块追加末尾），写回经 emit 交 MainView 更新 tabsStore 并置脏。
  2. **配对块 rightText 漏更（首个运行时 bug）**：pairs 构建时 removed 先入队（rightText=""），added 配对只写了 `prev.added = c`，**未同步 `prev.rightText`**——导致 paired 块渲染时右侧行数为 0（右栏空白、计数 0/1、行级高亮只有 removed）。修复：配对时补 `prev.rightText = c.value`。经验：对象字段的「对称更新」必须成对检查，单侧赋值必埋坑。
  3. **剪贴板 CRLF 需归一**：Edge 剪贴板 readText 会把 LF 存为 CRLF，jsdiff 整行不匹配 → 整篇视为差异。computeDiff 入口统一行尾（`\r\n?` → `\n`）。判断启发：任何「外部文本源 vs 编辑器文本」对比前先归一行尾。
  4. **cmState 与 content 一致性以 content 为准**：外部写回（对比合并）只改 tab.content，EditorPane 重挂载时 switchToTab 恢复的是**旧 cmState**（内容过期）。曾尝试在 store 里 `cmState.update({changes})` 同步，但 Pinia 响应式代理使更新后的 state 在 setState 时抛 `state.facet is not a function`（Vue 深度代理破坏 EditorState 内部引用，markRaw 包裹 update 返回值仍无法还原实例身份）。最终方案：**switchToTab 比较 `cmState.doc.toString() === tab.content`，不一致则以 content 重建 state**——内容一致性以 store 的 content 为唯一事实源，cmState 仅是「未过期的缓存」。
  5. **Naive UI 按需导入缺 NButton（对比弹窗第二次不显示的根因之一）**：MainView 补 NModal 后弹窗出现，但 CompareView 的 `n-button` 仍是未知组件（template 原样输出 `<n-button>` 标签、无 button 元素）→ 工具栏按钮不可点击。修复：CompareView 显式 `import { NButton }`。经验：**按需导入模式下，每个用到 n-xxx 的 SFC 必须自己 import**（MainView 修复只解决 MainView 的标签）。
  6. **自测数据要「够长」**：跳转/滚动联动断言依赖内容超出面板高度产生可滚动空间；首版 3~4 行内容 scrollTop 恒 0（jumpTo 设值被 clamp），改 31 行数据后 before=0/after=87/rightTop=30 验证成立。经验：滚动类断言先确认有滚动空间，否则「功能正常」会被误判 FAIL。
- **依据**：SIS-FUNC-6 九项验收（compare-smoke.mjs 12/12 PASS）；jsdiff dist 源码实证（diffLines 整行含行尾匹配、token 化含 \n）；CM6 view dist（ViewState 构造读 state.facet）。
- **影响范围**：diffService.ts（新建）、CompareView.vue（新建）、MainView.vue（对比编排+NModal/NButton）、ToolBar.vue（对比入口）、EditorPane.vue（switchToTab 一致性判定）、tabsStore.ts（内容事实源不变）、compare-smoke.mjs、package.json（test:compare）；FUNC-9/11/AI-1 无直接依赖，Sprint 3 六项至此全部闭环。

### decision-022 · 2026-08-22 · FUNC-9 完成（主题切换）+ 三态解析与库默认值四条经验

- **背景**：Sprint 4 第一项 FUNC-9 实现（明/暗/跟随系统三态 + 蓝/绿/紫强调色 + 工具栏下拉 + 持久化 + CM 联动），Playwright 自测 8/8 全绿，build 通过（wrap/compare 回归 10/10、12/12 保持）。
- **决策**：
  1. **resolvedTheme 解析层收敛到 settingsStore 单点**：settingsStore 持有 theme 偏好（light/dark/system）+ systemDark（matchMedia 监听，init 单次注册防重挂载重复监听），computed 派生 resolvedTheme；App.vue（Naive UI provider）、EditorPane（CM themeCompartment）、ToolBar（下拉状态）全部只读派生，不各自维护 matchMedia。system 模式实时联动由 store 的 mediaListener 统一驱动（FUNC-2 的 EditorPane 内 mediaQuery 逻辑移除）。
  2. **强调色 = Naive UI themeOverrides primary 色系**：蓝/绿/紫三套显式定义 primaryColor/Hover/Pressed/Suppl，经 NConfigProvider :theme-overrides 注入。**关键坑：Naive UI 官方默认 primary 是绿 #18a058，不是蓝**——「blue 用默认」想当然错误，三套都必须显式覆盖（首版 blue 无 override 实际显示绿色）。
  3. **settingsStore 完整化**：AppSettings 加 accentColor 字段（SIS 允许字段命名微调；theme/wordWrap/recentFiles/aiConfig 已有），DEFAULT_SETTINGS 兜底 + 兼容合并（decision-020 通道复用，Sprint 4 首任务即完整化）。
  4. **自测锚点**：根元素 `.app-root` 挂 `data-theme`/`data-accent` 属性作断言锚点（Naive provider 无稳定 class）；CM oneDark 背景 rgb(40,44,52)；primary 按钮 `--n-ripple-color` 反映强调色。已知库噪声：Naive UI dropdown 快速点击关闭时 handleMouseMoveOutside null.contains 内部竞态（库 bug，功能无影响），自测过滤。
- **依据**：SIS-FUNC-9 八项验收（theme-smoke.mjs 8/8 PASS）；Naive UI dist 源码（dropdown option class 为 .n-dropdown-option；default primary #18a058）；ui-visual.md §1/§2（三态解析规则 + CM 联动）。
- **影响范围**：settingsService.ts（accentColor 字段）、settingsStore.ts（resolvedTheme/systemDark/ACCENT_OVERRIDES）、App.vue（NConfigProvider）、EditorPane.vue（themeExtension 读 store）、ToolBar.vue（主题下拉）、theme-smoke.mjs、package.json（test:theme）；FUNC-11/AI-1 复用 settings 通道（recentFiles/aiConfig 字段待扩展）。

### decision-023 · 2026-08-22 · FUNC-11 完成（最近文件）+ 行为变更连动测试与 store 钩子自测方法

- **背景**：Sprint 4 第二项 FUNC-11 实现（打开/保存记录最近文件 + 空态列表 + 工具栏下拉 + 去重置顶上限 20 + 失效提示移除 + settings.json 持久化），Playwright 自测 9/9 全绿，build 通过；全部 9 个 smoke 脚本回归保持。
- **决策**：
  1. **记录钩子 = tabsStore 成功后副作用（非侵入）**：openTab（含重新激活已有标签，算最近访问置顶）与 markSaved（含另存新路径）成功后调 `settingsStore.addRecentFile`——settings 是副作用，不改 tabsStore 事实源与脏标记链路；去重置顶 + 上限 20 + 持久化全部封装在 settingsStore。
  2. **失效处理**：tabsStore.openPath 读盘失败返回 false，调用方（空态/下拉）message.error「文件不存在」+ settingsStore.removeRecentFile——提示与移除在 UI 层，openPath 保持纯打开语义。
  3. **空态接管无标签主区**：MainView 由「无标签也渲染 EditorPane 空编辑器」改为「无标签显示 RecentEmpty 最近文件列表」——符合 SIS，但**连带影响全部依赖『启动即有 .cm-editor』的旧测试假设**（8 个脚本 goto 后等 .cm-editor 全部超时），批量改为 goto 后先 Ctrl+n 建标签；reload 后同理。经验：**UI 行为变更必须先盘点对现有测试断言的前提假设**。
  4. **浏览器自测 store 钩子的方法**：`page.evaluate` 里 `document.querySelector('#app').__vue_app__.config.globalProperties.$pinia` 拿 pinia，`await import('/src/stores/xxx.ts')` 后 `useStore(pinia)` 显式传实例——**Pinia useStore 显式传参时会 setActivePinia**，store 内无参 use 其他 store 可正常解析；裸 `import('pinia')` 在 Vite 浏览器环境不可解析（用 /src 路径 + Vite 转换）。
- **依据**：SIS-FUNC-11 八项验收（recent-smoke.mjs 9/9 PASS）；ARCH-2 §4.2（recentFiles 字段）+ decision-020（settings 通道复用）。
- **影响范围**：settingsStore.ts（recentFiles/addRecentFile/removeRecentFile）、tabsStore.ts（recordRecent/openPath 钩子）、RecentEmpty.vue（新建空态）、ToolBar.vue（最近下拉）、MainView.vue（空态接管）、recent-smoke.mjs + 8 个旧 smoke 脚本适配（建标签前置）、package.json（test:recent）；FUNC-10/AI-1 复用 tabsStore.openPath 与 settings 通道。

### decision-024 · 2026-08-22 · FUNC-10 完成（自动保存/崩溃恢复草稿）+ 草稿生命周期与双实现

- **背景**：Sprint 4 第三项 FUNC-10 实现（脏标签防抖写草稿 + 启动恢复/丢弃弹窗 + 退出/恢复后/过期三态清理，草稿不替代手动保存），Playwright 自测 9/9 全绿，build 通过（recent/wrap 回归保持）。
- **决策**：
  1. **draftService 独立双实现**：Tauri 用 appDataDir/drafts 真实文件（依 ARCH-2 契约 #7），浏览器（前端自测）用 localStorage 模拟同一接口——decision-020 同款分流思路，全前端自测链路可验证崩溃恢复。
  2. **草稿生命周期三态清理**：①正常退出（MainView onCloseRequested 确认通过后 destroy 前 clearAllDrafts）②恢复/丢弃后（restoreDraft/removeDraft）③过期残留（checkRecover 启动扫描，7 天 TTL）——不留碎片是验收硬约束。
  3. **写入口 = tabsStore.updateContent 脏分支 + markSaved/removeTab 清理**：保存成功是 markSaved（不经 updateContent），草稿清理必须放 markSaved（新旧 key 均清）与 removeTab（关闭/丢弃）；updateContent 非脏分支兜底「内容回退到 saved」场景。**关键：找对「成功信号」所在的函数**，不能只挂在 updateContent。
  4. **恢复置脏 = openTab markDirty 参数**：savedContent 置空派生 dirty（内容为草稿、基线为空 -> 置脏），未命名草稿走 openTab({title})+updateContent 同效。
  5. **草稿标识**：有路径用绝对路径（恢复后文件路径保留，保存覆盖原文件）；未命名用 `__untitled_<title>`。
- **依据**：SIS-FUNC-10 十项验收（draft-smoke.mjs 9/9 PASS，Tauri 真实退出清理留 PO）；ARCH-2 契约 #7 + 崩溃恢复流程。
- **影响范围**：draftService.ts（新建）、tabsStore.ts（scheduleDraft/markSaved/removeTab/restoreDraft/openTab markDirty）、MainView.vue（启动恢复弹窗 + 退出清理）、draft-smoke.mjs、package.json（test:draft）；AI-1 无直接依赖，Sprint 4 余 AI-1 最后一项。

---
