# 框架演进记录 Evolution Log

> 记录规则、字段、触发时机见产品资产：../product/rules/框架演进记录规则_待确认.md。
> 本文件是本项目按规则产生的记录实例，与 change_log.md 平行。
> 资产归类：建设资产 -> 演进记录实例

---

## 记录列表

### 2026-08-25 · Sprint 收口 · Sprint 8（OPT-8a 背景图 ACL 修复 / OPT-8b AI 工具整合下拉 / OPT-8c AI 翻译双屏对比）收口回填（轻量 Retrospective，随收口合并）

- **背景**：Sprint 7 收口后 PO 提出「AI 翻译双屏对比 + 鼠标移动同时高亮两边文字」「AI 工具整合成下拉不要再堆按钮」「固定译中文」「按语义断句对应（拒绝按行丢上下文）」；同时背景图上传报 `fs/read_file not allowed by ACL`。Planning（Sprint_8_启动收口 + SIS-OPT-8）经 NotifyUser 确认后执行。
- **关联 decision**：decision-030（Sprint 8 三任务）
- **影响范围**：capabilities/default.json（fs:allow-read-file/mkdir）、ToolBar.vue（AI 工具分组下拉 + 删未用 onToggleAiPanel/polishOptions）、aiService.ts（buildTranslateMessages/parseTranslatePairs/TRANSLATE_MAX_CHARS）、aiStore.ts（translate 状态 + startTranslate/translateStop/translateClear）、sentenceService.ts（新，语义断句）、TranslateView.vue（新，双屏 + hover 双向高亮 + 滚动联动；收口期修复布局 height:100%/overflow:hidden + translate-body flex 链 + 字符串 ref 改函数 ref）、MainView.vue（translateOpen/openTranslate/onTranslateClose/translateApi）；scripts（opt8-translate-smoke 新且 DOC/译句加长修滚动联动，run-all-smoke 扩至 17 项 + 退出码兜底修复，ai/ai-mermaid/opt5 适配 AI 工具下拉，ai-mermaid 过滤 syncPosition 良性竞态）；package.json（test:opt8-translate）；Sprint_8_DoD对照表.md；change_log CHG-005
- **过程数据**：vue-tsc 0 错误；opt8-translate-smoke 12/12（整合/未配置提示/双屏/断句 11 句/双向高亮/滚动联动/关闭无损+状态重置/无 JS 错误）；全量回归 17 脚本全绿（15/17 直接 =0，opt6/opt8 因 dev server 中途被沙箱压崩单独重跑 7/7、12/12 验证）；vite build 通过（20.14s）
- **经验与教训（Sprint 8 专项）**：
  1. **Tauri 2 fs 插件是「命令级 ACL」而非「目录级」**：capabilities 里只给了 read/write-text-file，背景图的二进制 `readFile` 走的是另一个权限标识 `fs:allow-read-file` → `not allowed by ACL`。排查入口：报错串 `plugin:fs/read_file` 直接对应 permission identifier；文本读取一直正常 ≠ 二进制读取有权限。
  2. **「语义断句」≠「按行」**：PO 明确指出按行翻译丢换行上下文。落地折中——前端断句只服务左栏展示与 hover 索引对齐（段落优先+终止符+排除小数点+换行不强制断），翻译请求传**完整原文（保留换行）**让 LLM 内部语义翻译，返回 JSON 句数组按序索引对齐。断句精度交给宽松规则 + 长度下限，不做 NLP。
  3. **Playwright 脚本自写 report 文件时，运行命令禁止把 stdout 重定向到同名文件**：`node xxx.mjs 2>&1 | Out-File scripts/opt8-report.txt` 与脚本内 writeFileSync 同名 → EBUSY 假失败（还叠加 uncaughtException 双写）。规范：stdout 重定向到独立 console 文件，report 由脚本独占写；另外 `waitUntil:"networkidle"` 在 SPA 有长连接时可能永不满足，改 `"load"` 可显著缩短（也规避沙箱前台长命令超时）。
  4. **滚动联动测试「右栏内容不足一屏」会让 scrollTop 被 clamp 恒 0**：opt8 滚动联动自测反复 FAIL，探测发现左栏 sh=615>583 可滚动但右栏 rsh=583=583 不可滚——mock 译句太短（11 行≈330px<视口）。设 scrollTop 对不可滚动元素无效。修复：mock 译句加长至每句 70+ 字（rsh=770>583）。**排查手法**：直接在 evaluate 里设 `right.scrollTop=x` 读回，若读回 0 说明该栏不可滚动，先修测试数据再怀疑组件。
  5. **调试中发现的真实组件 bug（随收口修复）**：① TranslateView 双栏缺少 `height:100% + overflow:hidden`（.translate-view）与 `.translate-body` 的 `flex:1 + min-height:0` 约束 → 双栏高度被内容撑开，**内容永不产生滚动条**（CompareView 有正确 flex 链对照）；② `.t-pane` 上的**字符串 ref 在 `<template v-else-if="status==='done'">` 分支下未绑定**（setupState.value 为 null）→ 改函数 ref + let 变量后绑定成功。滚动联动功能最终可用，但根因一半在测试数据、一半在组件布局。
  6. **全量回归中途 dev server 崩溃 + 退出码统计错乱（沙箱环境限制）**：连续 17 个 msedge headless 顺序跑，vite dev server 中途 `ERR_CONNECTION_REFUSED`（疑似资源压崩），此后脚本 goto/reload 全失败，且 run-all 的 `$LASTEXITCODE` 在该场景下统计错乱（log 段 PASS 而 summary=1 或反之）。**判断「本轮回归是否真绿」不能只看 regression-summary**，要结合「dev server 存活检查 + 失败脚本单独重跑」。本轮 15/17 直接 =0，opt6/opt8 因 dev server 挂掉单独重跑 7/7、12/12 验证通过。
- **改进项清单（回流方向）**：
  1. PO 本机验证清单（Sprint 8）：背景图真实上传（Tauri 打包环境，capabilities 已修）；AI 翻译真实 API key 实测翻译质量与 JSON 返回；AI 工具下拉窗口观感
  2. 翻译后续候选：断句/对齐精度提升（语义段落对齐）、译文可编辑/写回、翻译语言可选（当前固定中文）

### 2026-08-25 · Sprint 收口 · Sprint 7（OPT-5 AI 简报悬窗+会话缓存 / OPT-6 上次文件标签恢复）收口回填（轻量 Retrospective，随收口合并）

- **背景**：Sprint 6 收口后 PO 反馈简报体验问题（弹窗随时关闭、无缓存、每次点开重调 API）与 notepad++ 式会话恢复诉求；Sprint 7 启动收口经三轮 Planning 确认（简报缓存仅当次会话 + 按文件各存一份；恢复=已保存+未保存合并）后执行。OPT-5/6 均完成自测与全量回归，收口中。
- **关联 decision**：decision-028（Sprint 7 两任务）
- **影响范围**：aiStore.ts / BriefPanel.vue（新，BriefModal.vue 删）/ MainView.vue / sessionService.ts（新）/ EditorPane 联动；scripts（opt5-brief-smoke / opt6-session-smoke 新，opt1-brief-smoke 删，run-all-smoke 扩至 16 项）；package.json（test:opt5-brief + test:opt6-session）；Sprint_7_DoD对照表.md；change_log CHG-003
- **过程数据**：opt5-brief-smoke 13/13；opt6-session-smoke 7/7（含重跑）；全量回归 16 脚本全绿；vue-tsc 0 错误；npm run build 通过（49.90s / 4218 modules）；git commit 收口中
- **经验与教训（Sprint 7 专项）**：
  1. **beforeunload 在 reload 时也触发 → 会话恢复不能无脑弹**：OPT-6 初期「reload 触发 beforeunload 写快照 → 每次都弹恢复框」会破坏常规刷新与既有回归。解法：`sessionStorage` 标记区分「首次加载/真实重启」与「同页 reload」——首次加载才检查快照，reload 跳过快照检查直接走草稿恢复；自测用 close+newPage 模拟真实重启（避免 beforeunload 覆盖快照）。
  2. **追加式回归日志甄别新旧轮**：run-all-smoke 的 regression.log 用 `*>>` 追加，多轮内容混存；判断「本轮是否跑完」看 regression-done.txt 的修改时间与内容（含 opt5/opt6 即新轮），别被旧轮 opt1-brief-smoke=0 误导。
  3. **删除旧脚本要同步回归清单与 package.json**：opt1-brief-smoke.mjs 被 opt5 替代删除，run-all-smoke.ps1 同步去掉该名（否则 MODULE_NOT_FOUND 假失败，延续 Sprint 6 教训）；npm scripts 同步增删 test:opt5-brief / test:opt6-session。
- **改进项清单（回流方向）**：
  1. PO 本机验证清单（Sprint 7）：OPT-6 已保存文件真实重开（Tauri）+ 真实窗口退出快照写入（沙箱仅模拟）；OPT-5 真实 AI 简报体验（真实 API 流式）；OPT-4 遗留（真实右键/双击 + `npm run tauri build` 完整打包）
  2. 悬窗自由拖拽定位、简报缓存跨会话持久化（PO 明确暂缓，后续按需立项）

### 2026-08-25 · Sprint 执行中 · Sprint 6（OPT-1 简报+锚点 / OPT-2 暗色修复+强调色 / OPT-3 自定义背景 / OPT-4 Shell 集成）收口前回填（轻量 Retrospective，随收口合并）

- **背景**：PO 在 Sprint 5 交付后发起新一轮优化，Sprint 6 启动收口经严格 Planning（PO 两次流程纠偏：必须先 Planning 产出 SIS 再执行、Planning 未确认不得跑回归）确认 4 任务。OPT-2/3/1 完成自测全绿，OPT-4 代码完成（cargo check 通过）列 PO 本机验证，收口中。
- **关联 decision**：decision-027（Sprint 6 四任务）
- **影响范围**：App.vue / MainView.vue / ToolBar.vue / settingsStore.ts / settingsService.ts / BriefModal.vue（新）/ aiService.ts / aiStore.ts / EditorPane.vue；src-tauri（Cargo.toml + lib.rs）；scripts（opt3-bg-smoke / opt1-brief-smoke 新，run-all-smoke 扩至 15 项）；Sprint_6_DoD对照表.md；change_log CHG-002
- **过程数据**：opt3-bg-smoke 14/14；opt1-brief-smoke 7/7；theme-smoke 11/11；全量回归 15 脚本全绿；vue-tsc 0 错误；cargo check 通过（2m38s）；git commit 收口中
- **经验与教训（Sprint 6 专项）**：
  1. **「已改完」的代码也可能缺整块**：OPT-3 三处实现遗漏（settingsStore 5 个 action 无函数体、ToolBar 缺 ref/NModal/NSlider import、MainView 模板漏渲染背景层）全部表现为「自测超时/白屏」而非编译错误——**自测超时优先怀疑运行时 ReferenceError（页面白屏），用 pageerror 直接定位**；模板未用 computed 会被 vue-tsc unused 捕获（bgChromeStyle/hasBg never read）。
  2. **UI 组件库键盘交互不可假设**：Naive UI NSlider 的 ArrowRight 键盘步进只作用于「第一个滑杆」（focus 不转移或 keydown 冒泡处理缺陷），多滑杆表单自测必须用真实鼠标交互（click handle 聚焦 + ArrowRight / 拖拽 handle）替代键盘模拟。
  3. **page.evaluate 回调不能闭包 node 变量**：evaluate 序列化参数传入（LS_KEY 教训）；reload 会丢未保存标签并触发草稿恢复弹窗，测试注入配置优先走 store action（saveConfig）而非 reload。
  4. **回归运行器脚本名即文件名**：run-all-smoke.ps1 加脚本时用 `xxx-smoke`（.mjs 文件名去后缀），拼错（opt3-bg）导致 MODULE_NOT_FOUND 假失败——看 done 文件与日志尾部甄别「真失败」与「调度失败」。
- **改进项清单（回流方向）**：
  1. PO 本机验证清单（Sprint 6）：OPT-4 真实右键/双击/argv 多文件打开 + `npm run tauri build` 完整打包（bundler 已缓存，挂梯可跑）；OPT-1/3 真实环境体验（真实 AI 简报、真实背景图）
  2. 自测技能沉淀继续候补：本次「多滑杆键盘不可用」与「page.evaluate 序列化」为新坑，可并入自测 skill 立项评估

### 2026-08-22 · Sprint 闭环 · Sprint 4 收口回填（轻量 Retrospective，AS-8 第 4 次授权闭环 = 授权燃尽，Backlog 19/19 燃尽）

- **背景**：Sprint 4 四任务全部完成（FUNC-9 7c9334b / FUNC-11 757f0fa / FUNC-10 54a048f / AI-1 bf335f7 + daa706c），走完阶段 4->5->6->7->8 完整闭环。Review 结论 Passed With Observation（Aida 代行判定，已广播 PO）。本记录承担阶段 7 反思纪要职能（轻量形态：反思并入 Evolution Log，不开独立会议）。
- **关联 decision**：decision-022~025（Sprint 4 四任务各一）
- **影响范围**：Sprint_4_DoD对照表.md + Sprint_4_Review报告.md 产出；Backlog 19/19 燃尽 → 项目交付（阶段 11）征询 PO
- **过程数据**：任务 4/4 DoD 通过（34/34 自测子项）；全量回归 13 脚本全绿；events 追加 5 条（FUNC-9/11/10/AI-1 任务完成 + AI-1 完成燃尽）；低风险自批 0 次转交 0 次；git commit 8 个（7c9334b/757f0fa/54a048f/bf335f7/daa706c 等）
- **经验与教训（Sprint 4 专项）**：
  1. **沙箱「长运行/长连接」隐性击杀是本 Sprint 最大环境教训**：55s 纯定时器被杀（退出码 0 伪装）、SSE 流式读取被杀、mermaid 渲染同脚本波动（一次 13/13 一次被杀）。特征：静默、无异常可捕、退出码伪装 0。对策已沉淀：自测拆短（<25s）、流式 page.route 拦截模拟、渲染类降级纯文本链路验证 + 列 PO 真实环境验证项（详见 decision-025）。
  2. **computed 依赖非响应式外部值的缓存陷阱**：自测捕获真实 Bug（问答沿用旧选区上下文，违反 SIS 硬约束）——computed 的依赖必须全部响应式，否则用函数每次读取。
  3. **n-message 3s 自关的断言竞态**：提示类断言先「触发动作再统计计数」会 before=1/now=0；确定性信号用副作用轮询，提示断言用存在性轮询或动作前计数。
  4. **UI 行为变更必须先盘点测试前提假设**：FUNC-11 空态接管无标签主区 → 8 个旧 smoke 脚本「启动即有 .cm-editor」假设全破（FUNC-11 教训，延续决策-023）。
- **改进项清单（回流方向）**：
  1. 沙箱长时命令/流式连接限制 →「自测脚本运行约束（拆短 + 拦截模拟 + 降级）」纳入自测 skill 立项评估（10+ smoke 脚本模式成熟，多次触发：Sprint 1 rustup、Sprint 4 SSE+mermaid）
  2. PO 本地验证清单（项目交付观察项）：AI-1 真实流式冒烟 / mermaid 修复真实渲染 / 两文件对比入口 / Tauri 真实退出草稿清理
  3. 项目交付：项目报告（交付范围/验证/观察项/使用说明）征询 PO → 同意即交付产品 + 项目资产，流程结束

### 2026-08-22 · 任务完成 · AI-1 闭环：Backlog 19/19 燃尽，AS-8 四次授权全部用尽

- **背景**：Sprint 4 最后一项 AI-1（AI 接入）完成——单套 OpenAI 兼容 API（baseURL/key/model）+ 润色四选（改写/润色/缩短/扩写，流式原位替换接受/撤销 + diff 气泡）+ 问答侧栏（仅选中上下文，回答一键插光标）+ mermaid 修复（错误占位按钮 + 工具栏按钮双入口）。ai-smoke 9/9 + ai-mermaid-smoke 4/4 全绿，build 通过，全量回归 13 脚本保持。Backlog 19/19 全部完成（燃尽）。
- **关联 decision**：decision-025（AI-1 完成 + 沙箱流式限制对策 + 选区缓存 Bug）
- **影响范围**：aiService.ts/aiStore.ts/AiPanel.vue（新建）、EditorPane.vue/ToolBar.vue/MainView.vue/mermaidWysiwyg.ts（改造）、ai-smoke.mjs/ai-mermaid-smoke.mjs（新建）；Backlog 燃尽 → Sprint 4 整体收口（阶段 5-8）→ 项目交付（阶段 11）征询 PO
- **过程数据**：自测 ai-smoke 9/9 + ai-mermaid-smoke 4/4；全量回归 13 脚本保持；commit bf335f7
- **经验与教训**：
  1. **沙箱对「长连接/长运行」的隐性击杀（本次最大环境教训）**：55s 纯定时器命令被静默击杀（退出码 0、无异常、无输出），SSE 流式响应体读取同样被杀（非流式 200 正常），mermaid 渲染（动态 import + SVG + 系统字体）同脚本一次 13/13、下一次被击杀。特征：**静默、无异常可捕、退出码伪装为 0**——排查时先怀疑环境而非代码。对策：自测拆短（每个 <25s）、流式用 page.route 拦截模拟、渲染类验证降级为纯文本链路验证 + 列 PO 真实环境验证项。
  2. **computed 依赖非响应式外部值的缓存陷阱**：`computed(() => window.xxx)` 首次求值后永久缓存，后续外部值变化不刷新——自测捕获真实 Bug（问答沿用旧选区上下文，违反 SIS「不带全文」硬约束）。经验：computed 的依赖必须全部响应式，否则用函数每次读取。
  3. **提示类 UI 断言的时间竞态**：n-message 3s 自动关闭，动作后统计计数可能「已出现又消失」（before=1/now=0）。对策：确定性信号用副作用轮询（localStorage 等），提示断言用存在性轮询或动作前计数。
- **改进项清单（回流方向）**：
  1. 沙箱长时命令/流式连接限制 →「自测脚本运行约束」纳入自测 skill 立项评估（10+ 个 smoke 脚本模式已成熟，触发条件已多次命中：Sprint 1 rustup、本次 SSE+mermaid）
  2. PO 本地验证清单：AI-1 真实流式冒烟（Modelscope 配置已提供）、mermaid 错误占位「AI 修复」真实渲染、两文件对比入口（Tauri dialog）、Tauri 真实退出草稿清理
  3. 项目交付：Sprint 4 整体收口（DoD 对照表/Review/Retrospective 并入本文件）→ 项目报告征询 PO

### 2026-08-20 · 模式启用 · AS-8 短 Sprint 授权模式首次投入实战（Aida 第一个独立项目）

- **背景**：aida-note 项目 Planning 收口完成（19 项 SIS + 4 短 Sprint 划分锁定），Aida 向 PO 申请短 Sprint 授权。PO 首次对 Aida 完全放手（"全部短sprint我们还没试过，不过我倒是愿意相信你，aida你要挑战下自己吗？"），授权 4 次短 Sprint 并附加三条硬性要求：①无干预也坚持流程正义；②记录中间过程资产；③及时更新 Evolution Log。
- **关联 decision**：decision-007（4 短 Sprint 划分锁定）、decision-008（授权 4 次 + 进入 Sprint 1 执行）
- **影响范围**：state/manifest/data.json（stage 切换至 Sprint In Progress + events[] 开始记录授权期事件流）；Sprint 1-4 全部执行过程
- **观察点（Sprint 1 收口回填验证，2026-08-20）**：
  1. 授权期间「程序正义 vs 效率」的实际张力：**已验证**--无 PO 在场时全部收口/回写/同步动作实际执行（4 任务 × DoD 检查 + 四边同步 + events 12 条）。代价：收口类动作约占执行时间 1/3。效率取舍样本：ARCH-1/2 同日连续完成，decision 合并留痕（decision-011）而非逐任务拆分--同型纯文档任务可合并，异型任务不合并
  2. 低风险变更自批（T3 5.1/6）的实际触发频率与判断一致性：**已验证**--Sprint 1 触发 1 次（decision-009 cargo 镜像，用户级环境配置），判定边界（≤3 文件/不影响目标/偏离≤20%/不涉 PCB）够用，无模糊地带
  3. events[] 事件流记录的粒度是否合理：**已验证**--Sprint 1 共 12 条（任务级 4 + 阻塞/解除 2 + 阶段切换 4 + 授权 1 + 闭环 1），粒度合适；P0 级尚未出现（无阻断级决策事件），P0/P1/P2 分级保持
  4. 「每任务即做 DoD 检查（不等阶段 5）」对发现问题的前置效应：**已验证，正向**--4/4 任务完成当时即过 DoD，阶段 5 总体复查退化为汇总核对（快速通过）；ENV-1 的窗口验证项因前置检查及时识别出沙箱限制并转对策
  5. 自主执行边界（环境转交频率）：**部分验证**--2 次转交均发生在 ENV-1 环境准备期（工具链/crates），ENV-2 起零转交（npm 无碍）；镜像方案对 cargo 的有效性待 Sprint 2 验证（届时需装 Tauri 三插件，是首次真实考验）

### 2026-08-20 · Sprint 闭环 · Sprint 1 收口回填（轻量 Retrospective，AS-8 第 1 次授权闭环）

- **背景**：Sprint 1（工程地基）四任务全部完成（ENV-1 d704a31 / ENV-2 6d9ddfa / ARCH-1 762409d / ARCH-2 6e8bc8a），走完阶段 4->5->6->7->8 完整闭环。Review 结论 Passed With Observation（Aida 代行判定，已广播 PO）。本记录承担阶段 7 反思纪要职能（轻量形态：反思并入 Evolution Log，不开独立会议）。
- **关联 decision**：decision-011（Sprint 1 闭环）
- **影响范围**：project/traces/（audit_trace_sprint1 + events_sprint1 首批审计资产）；后续 Sprint 的执行模式
- **过程数据**：任务 4/4 DoD 通过（23/23 子项）；events 12 条（P1×8 / P2×4 / P0×0）；低风险自批 1 次；环境转交 PO 2 次（均 ENV-1 期）；git commit 4 个；新增建设资产 6 个文件
- **经验与教训**：
  1. **AS-11 timestamp 硬约束与工具能力落差**：规则要求精确到秒，但会话工具无秒级时钟。当前解法：日期 + 顺序号（Seq）保序 + 显式标注 timestamp 不可用原因。框架层改进方向：AS-11 §7.4 增补「会话内连续执行场景的降级格式」条款（回流为规则修订候选）
  2. **审计轨迹的事后补齐 vs 实时留痕**：Sprint 1 的 audit_trace 是收口时一次性回溯整理的（事件内容来自会话记忆与 data.json）。可靠性依赖 events[] 的实时记录纪律（本次 P1/P2 均实时）。改进：长 Sprint 或多会话场景必须逐任务即时追加 trace，不能收口时回溯
  3. **「镜像压缩耗时」是沙箱限制的通用解法**：npm 源本身无截断问题（206 包 21s），cargo 直连被截断。判断启发：转交前先测镜像/缓存路径，而不是默认转交
  4. **纯文档任务的收口可以合并**：ARCH-1/2 同日连续完成，decision 与四边同步合并为一次（decision-011）。判定标准：同型交付（纯文档）+ 无中间阻塞 + 无 PO 交互。异型任务（代码+文档混合）仍逐任务收口
- **改进项清单（回流方向）**：
  1. AS-11 §7.4 时间精度条款修订（回流产品规则，框架演进候选）
  2. 沙箱长时命令 skill 立项评估（保持观察，触发条件：Sprint 2 镜像方案再遇截断）
  3. Sprint 2 关注点：Tauri 三插件安装（镜像方案首考）+ UI 落地首次引入 Naive UI（新依赖批量）

### 2026-08-20 · 执行环境 · 短 Sprint 自主性原则：环境转交 PO 是降级方案，不是默认方案（PO 反馈）

- **背景**：ENV-1 执行期间两次将下载类工作转交 PO（rustup 工具链、cargo crates 下载），PO 完成后明确反馈："短 sprint 经常把工作交给我不是明智之举，要么这种工作你不用沙盒，要么你做个 skill 去通过真实的环境去做下载任务"。
- **关联 decision**：decision-009（ENV-1 完成 + cargo 镜像加速方案）
- **影响范围**：后续所有 Sprint 的环境/编译类命令执行方式
- **经验**：
  1. AS-8 授权模式的灵魂是「自主」，转交 PO 等于把授权退化回普通模式--转交本身是失败信号，每次转交都应有对策防止同类转交再现
  2. 沙箱物理限制（长时大体积下载被截断）无法绕过，但可以**压缩任务耗时到沙箱可承受范围**：国内镜像（rsproxy.cn / npmmirror）是首选解，本例 cargo 直连 crates.io 极慢且被截断，镜像后预期压到分钟级
  3. 转交 PO 时的正确姿势（本例已做到）：给出可直接复制的命令 + 验证命令 + 明确的恢复条件，PO 的操作成本压到最低
  4. 【观察项】若镜像方案在 Sprint 2-4 仍遇沙箱截断，正式立项 product/skills/ 新资产（AS：沙箱长时命令执行规则），定义「何时转交 / 转交模板 / 恢复验证」标准动作

### 2026-08-20 · 流程实践 · Planning 全程逐项问答砸实 19 项 SIS 的节奏经验

- **背景**：PO 要求 19 项需求逐项问答砸实（不批量执行），每项经 3-4 个细节问题确定交互决策后生成 SIS 草稿、确认、收口同步。全程 PO 仅用「照推荐/确认/定稿/确定」单字确认词即可推进，说明推荐选项质量已获得 PO 信任。
- **关联 decision**：decision-006（19 项 SIS 完成）
- **影响范围**：project/sis/ 全部 19 个文件；后续 Sprint 的可执行条件
- **经验**：
  1. 「问题前置砸实」模式使 SIS 草稿一次通过率极高（19/19 无返工重写，仅 2 次格式修正）
  2. 推荐选项应标注理由与代价，PO 单字确认才有效（否则确认无信息量）
  3. 已踩坑：AskUserQuestion 被用户取消时，PO 倾向于直接文本授权——重大授权类提问应准备好文本回复的承接路径
  4. 已踩坑：data.json backlog status 值域须先查 AS-Panel 规则（pending/done），不可凭直觉写 open

### 2026-08-20 · 执行环境 · IDE 沙箱无法承载长时下载安装类命令（环境准备经验）

- **背景**：Sprint 1 ENV-1 执行需 Rust 工具链（Tauri 2 编译必需）。Aida 在 IDE 终端尝试 rustup 安装：命令显示 exit 0 但实际进程在「syncing channel updates」阶段被沙箱截断（rustup 本体 shim 已落盘、toolchains 目录为空）。重试与直接验证均确认工具链未装成。PO 主动接手环境安装（"这种环境的事情我来弄吧"）。
- **关联 decision**：decision-008（AS-8 授权）
- **影响范围**：data.json events[]（P1 环境阻塞事件）、state.md 阻塞项
- **经验**：
  1. IDE 沙箱对「大体积网络下载 + 系统级安装」类命令不可靠：exit code 可能失真（返回 0 但进程被截断），必须用落盘文件实际验证（Test-Path toolchains 目录 + rustc --version），不能只信 exit code
  2. 沙箱被拒时（如 winget 写日志受限）会直接报 restricted 错误，这类错误可快速识别；更危险的是静默截断类失败
  3. 环境准备类阻塞的处置路径：先盘点已就绪项（本例 Node/MSVC 均在）-> 只补缺失项 -> 明确给出 PO 可直接复制的安装命令与验证命令 -> 阻塞与恢复条件写入 state/events 留痕，避免会话中断后丢失上下文

### 2026-08-21 · 功能实现 · FUNC-1 多标签文件编辑落地：白屏 / 关窗口 / 权限模型三类坑的经验（Sprint 2）

- **背景**：FUNC-1（多标签文件编辑）实现完成，验证期连遇三类问题并经 PO 验证闭环：①关窗口确认首次无效（PO「测试完了 关窗口无效」）；②白屏（PO「现在打开白屏了」）；③白屏修复后关窗口确认后仍无法关闭（PO「好家伙不白屏 就不能关闭」）。全部由 Aida 定位根因并修复（commit ef68836 / f2d7a55 / 87334d2 / 52494ea），PO 系统终端验证通过（2026-08-21「ok 这回行了」）。
- **关联 decision**：decision-012（FUNC-1 完成 + 三类问题对策定案）
- **影响范围**：app/src/App.vue、app/src/views/MainView.vue、app/src/stores/tabsStore.ts、app/src/components/TabBar.vue、app/src-tauri/capabilities/default.json；FUNC-2 及后续 UI/功能任务的组件编写方式
- **经验**：
  1. **Naive UI `useDialog()` 上下文陷阱（白屏根因）**：`useDialog()` 必须在 `NDialogProvider` 的**后代组件**中调用；在 provider 挂载前调用会抛错导致整棵树崩溃白屏。最早把 Provider 放 MainView 子树内、MainView 顶层又用 useDialog 属自相矛盾。解法：Provider 提升到 App 根部，Provider 内任何后代组件均可安全 useDialog。**通用教训：Provider 型 API 的注入点必须高于所有使用者**
  2. **Tauri 2 `destroy()` 是受限权限，缺了会被静默拒绝**：`onCloseRequested` 里 `preventDefault()` 后需要二次关闭，官方正确方式是用 `destroy()`（`close()` 会再次触发 close requested）。但 `destroy` 不在 `core:default` 里，需在 capabilities 显式加 `core:window:allow-destroy`，否则调用被权限系统静默忽略——表现就是「确认框正常、保存正常、窗口就是关不掉」，且 Alt+F4/任务栏关闭全部失效（都被 preventDefault 拦截）。**诊断启发：capabilities 权限缺失是静默失败，排查 Tauri 权限类 bug 先核对 capabilities**
  3. **「白屏时能关、正常时不能关」是绝佳隔离线索**：用户观察到白屏时窗口能正常关闭，直接证明无进程守护/秒开问题，问题必然出在 onCloseRequested 监听器本身——把排查范围从「系统层」收缩到「应用层监听逻辑」
  4. **沙箱环境对 Tauri dev 的不利因素再确认**：rustup 组件分发（300MB+）仍超沙箱承载上限；「沙箱长时命令执行规则」skill 立项评估继续保留观察（触发条件已两次命中）
- **改进项清单（回流方向）**：
  1. 白屏/关闭类 Tauri 常见坑写入 app/docs/ 技术备忘（Sprint 2 收口时归并进 Review 报告）
  2. 「沙箱长时命令执行规则」skill 立项评估：触发条件两次命中，建议 Sprint 2 收口时正式决策

### 2026-08-21 · 能力建设 · 前端自测能力建立：Playwright + 系统 Edge 链路（PO 指令响应，AS-8 自主执行模式升级）

- **背景**：FUNC-2 排障期间 PO 明确指令："我们后边的功能都是前端的内容其实你完全可以自己测试吧 比如用browser-use或者playwright之类的。如果这些环境没好 我们也可以先解决嘛，大不了我们现在就手动做一个测试skill或者agent出来"。此前前端功能验证依赖 PO 手工操作（FUNC-1 关窗口验证即转交 PO），与 AS-8「自主执行」原则相悖。
- **关联 decision**：decision-013（前端自测能力落地）
- **影响范围**：app/scripts/ui-smoke.mjs、app/scripts/multitab-smoke.mjs、app/package.json（test:ui / test:multitab）；后续全部 Sprint（3/4 全是前端功能）的验证方式
- **经验**：
  1. **Playwright + 系统 Edge 是沙箱内最低成本自测链路**：`channel: "msedge"` 直接复用系统已装的 Edge，免下载 chromium（下载会被沙箱截断）；`npm run dev` 起 1420 + Playwright 连 localhost 即可全流程自动化
  2. **断言设计要点（踩坑后修正）**：纯文本下不应断言高亮 token（本就不该有）；CM6 的 unicode 类名（ͼ 开头）CSS 选择器匹配不可靠，改用 `page.evaluate` 计数；light 主题断言须接受 `rgba(0,0,0,0)`（透明背景不是黑）
  3. **沙箱吞 stdout 的解法**：长输出命令重定向到项目根目录文件再 Read（`node xx.mjs > out.log 2>&1`）
  4. **自测建立后节奏变化**：FUNC-2 验证全程零转交 PO（对照 FUNC-1 的 3 次转交），符合 AS-8 自主原则
- **改进项清单（回流方向）**：
  1. 【观察项】前端自测 skill/agent 沉淀：test:ui/test:multitab 是雏形，Sprint 3（FUNC-3~8 全是前端功能）将高频复用；若模板化收益明确，Sprint 3 收口时正式立项 product/skills/ 新资产（PO 建议过"手动做一个测试skill"）

### 2026-08-21 · 技术攻坚 · Vue reactive 深度代理破坏 CodeMirror Compartment 身份：「无报错但功能失效」类问题的三重根因排查（FUNC-2）

- **背景**：FUNC-2（多语法高亮）代码实现后，语言高亮与主题切换**完全不生效但无任何报错/警告**。此类"静默失效"问题无法靠读报错定位，动用 27 个渐进式诊断脚本（独立复现 -> 对照实验 -> CM6 内部结构 dump -> 实例一致性检查）逐层剥离。
- **关联 decision**：decision-013（markRaw 原则确立）
- **影响范围**：app/src/components/EditorPane.vue、app/src/stores/tabsStore.ts；后续所有"Vue store 持有外部库对象"的场景
- **经验与教训**：
  1. **【架构级】markRaw 原则**：Vue reactive/Pinia 深度代理外部库复杂对象时，对象内部结构中的实例身份（Map key、`===` 比较）全部失真--本例 EditorState 的 `config.compartments` Map 的 key 被 proxy 化，与模块级原始 `Compartment` `===` 失败，`reconfigure()` 被 CM6 静默忽略。**存入 reactive store 的外部对象必须 `markRaw()`**（CodeMirror EditorState、任何携带实例身份语义的对象）
  2. **Compartment 槽位注册原则**：CM6 的 Compartment reconfigure 只对"创建 state 时已注册槽位"的 state 生效；初始空 state（如无标签时的 `emptyState()`）也必须带上同一对 Compartment 实例，否则后续 reconfigure 找不到槽被静默忽略（诊断特征：`view.state.config.compartments.size === 0`）
  3. **Vue watch 时序陷阱**：新建标签时 language watch 先于 activeTabId watch 触发，若在 language 回调里写 cmState 会把上一个（空）state 污染进新标签缓存。原则：**watch 回调只做 dispatch（作用于当前 view），不做 state 缓存写入；缓存写入只在 switchToTab/createState 单点发生**
  4. **「无报错但失效」问题的排查方法论**：①先独立最小复现（脱离项目代码的纯 CM6 页面）确认库本身行为正常 ②对照实验（单标签 vs 多标签、新建 vs 恢复）锁定差异面 ③dump 库内部结构（`view.state.config.compartments`）比对 ④实例一致性检查（`===` 比较 + 遍历 Map key）。`window.__view`/`__comps` 暴露 + `__vue_app__` 取 pinia 是有效的运行时调试手段
  5. **导入源细节**：`Compartment` 必须从 `@codemirror/state` 导入；`@codemirror/view` 不导出它（vite 预构建后运行时才报 SyntaxError，不是编译期）
- **改进项清单（回流方向）**：
  1. markRaw 原则 + Compartment 槽位原则 + watch 时序原则写入 app/docs/ 技术备忘（Sprint 2 收口时随 Review 报告归并）
  2. 27 个诊断脚本的渐进式排查法可模板化（独立复现/对照/内部结构/一致性四步），候选进前端自测 skill

### 2026-08-21 · Sprint 闭环 · Sprint 2 收口回填（轻量 Retrospective，AS-8 第 2 次授权闭环）

- **背景**：Sprint 2（核心）五任务全部完成（UI-1 1169dc4 / FUNC-1 4648820+52494ea / FUNC-2 8383d5f+afb510d / UI-2+UI-3 5658ab8），走完阶段 4->5->6->7->8 完整闭环。Review 结论 Passed With Observation（Aida 代行判定，events[] 广播 PO）。本记录承担阶段 7 反思纪要职能（轻量形态，沿 Sprint 1 先例）。
- **关联 decision**：decision-012（FUNC-1 三类坑）、decision-013（FUNC-2 markRaw 原则+自测能力）、decision-014（UI-2/3 合并收口）、decision-015（Sprint 2 闭环）
- **影响范围**：project/sprint/（Sprint_2_DoD对照表 + Sprint_2_Review报告 + Sprint_3_Planning输入候选清单）；Sprint 3 执行模式
- **过程数据**：任务 5/5 DoD 通过（36/36 子项）；events 本 Sprint 新增 7 条（任务级 4 + 能力建设 1 + 阶段切换 2 + 闭环 1 计入收口批次）；git commit 主线 8 个（1169dc4/4648820/ef68836/f2d7a55/87334d2/52494ea/8383d5f/afb510d + 收口 3 个）；PO 转交 1 次（FUNC-1 关窗口验证，FUNC-2 起 0 次）；新增正式测试资产 2 个（test:ui/test:multitab）
- **经验与教训**：
  1. **AS-8 观察点 5（自主执行边界）Sprint 2 期结论：自测能力是自主性的分水岭**--FUNC-1 验证转交 PO 1 次，Playwright 自测链路建立后 FUNC-2/UI-2/3 验证零转交。「转交 PO 是降级方案」在验证环节的最终解不是转交模板，而是把验证能力自建（PO 的「你可以自己测试」指令本质是授权 Aida 扩张能力边界）
  2. **同型任务合并收口先例稳定复用**：UI-2/3 循 decision-011 标准合并（同型纯文档+同日+无 PO 交互），收口成本从 2 次降为 1 次，判定标准无需修订
  3. **重大技术坑的前置化**：FUNC-2 的 markRaw 坑若发生在 Sprint 3（FUNC-3 所见即所得装饰机制更复杂）成本会更高；教训是「外部对象入 reactive store」类风险应在引入时即评估，而非失效后排查（本 Sprint 用了 27 个诊断脚本）
  4. **PO 实时反馈的处理节奏**：PO 在排障中途的观察（「白屏的时候可以关闭」「会不会配置了进程守护」）是高价值线索，应在 decision/日志中显式记录用户原话与推断价值
- **改进项清单（回流方向）**：
  1. Sprint 3 观察：窗口关闭三选边界复验（顺带）；自测脚本 skill 化立项评估（Sprint 3 六任务全前端，高频复用触发条件）；闪退留观
  2. FUNC-3 实现前置宣贯三原则（markRaw/Compartment 槽位/watch 单点写缓存），写进 Sprint 3 启动收口风险卡点

### 2026-08-22 · 任务经验 · FUNC-3 排障方法论：CM6 装饰机制的四次「无报错/报错定位」实证

- **背景**：Sprint 3 主峰 FUNC-3（同屏所见即所得）实现，Playwright 自测从 0/19 逐项追到 28/28 全绿，途中踩穿 CM6 装饰机制的 4 个隐性规则，全部用「读 dist 源码实证」而非猜测解决。
- **关联 decision**：decision-016（四项 CM6 经验定案）
- **影响范围**：markdownWysiwyg.ts/css（StateField 通道）；languageRegistry.ts（GFM 显式配置）；wysiwyg-smoke.mjs（fs 落盘报告防沙箱截断 stdout）；FUNC-4~8 复用
- **经验与教训**：
  1. **「报错堆栈指向的模块 ≠ 报错来源」**：`RangeError: Block decorations may not be specified via plugins` 的抛错点在 @codemirror/view，初判误入「Compartment 槽位」方向；实为 ViewPlugin `decorations` spec 是函数形式、CM6 强制禁止块级装饰（view d.ts §EditorView.decorations 明文）。解法：读 dist 源码 + d.ts 对照，别凭记忆
  2. **库的默认值必须实测**：`markdown()` 默认 base 是 commonmarkLanguage（无 GFM），此前语法树 dump 用的是自配 GFM parser 才「误以为」运行时支持删除线/表格。教训：运行时语法树要用运行时配置 dump（debug-tree 先踩了这坑，后改用与注册表一致的配置验证）
  3. **「没传参数」类 bug 比想象隐蔽**：HrWidget 少传 `from`（undefined）导致 dispatch `{selection:{anchor:undefined}}` → bracketState 的 lineAt 死循环越界 → **整个事务构造失败** → 表现为「点击后无效果」而非报错。排障靠给 mousedown handler 打印 `this` 的 keys+值，一行日志破案
  4. **CM6 事务失败的连带症状**：selection 越界目标在事务构造期被某字段（closeBrackets/bracketState）读坏 → 事务整体失败 → 界面「静默无效」。排查思路：pageerror 捕获堆栈 + 逐步复现最小交互（debug-89 系列），而非全链路重跑
  5. **测试脚本自身的断言缺陷会伪装成实现 bug**：check 6 点击引用块后用「即将消失的 class 选择器」读取 → 30s 超时挂死（沙箱还截断了 stdout 掩盖真相）。解法：断言按文本定位行元素；脚本增量落盘（node fs 直写，绕过沙箱 stdout 截断）
- **改进项清单（回流方向）**：
  1. 自测脚本 skill 化立项评估（wysiwyg-smoke 的增量落盘 + 异常钩子模式值得固化；Sprint 3 六任务高频复用）
  2. CM6 系列经验（StateField 块级装饰通道 / GFM 显式配置 / 行级零长度 range / 树滞后防御）已入 decision-016，供 FUNC-4~8 直接复用，避免重复踩坑

### 2026-08-22 · 任务经验 · FUNC-4 排障：全局单例异步渲染的「并发挂起」与测试链路复用

- **背景**：FUNC-4（mermaid 原位渲染）实现，Playwright 自测 13/13 全绿（FUNC-3 回归 28/28 保持）。首个自测版本挂死——报告只到第 1 步，且无任何异常/超时输出（沙箱截断 stdout 掩盖）。
- **关联 decision**：decision-017
- **影响范围**：mermaidWysiwyg.ts/css（串行渲染队列 + 超时保护）；wysiwyg-smoke.mjs（mermaid 断言升级为 widget）；FUNC-5~8 复用
- **经验与教训**：
  1. **全局单例异步 API 的并发陷阱**：mermaid 是模块级单例，两个块同时触发 render 时，错误块挂起（Promise 不 settle）会**阻塞后续所有渲染**——有效块永远等不到 ready，表现为「页面静默无图」而非报错。解法：渲染进 Promise 链串行队列 + 独立超时（Promise.race），失败落错误占位不拖累队列。FUNC-3 排障的「读源码实证」方法论再次命中
  2. **「测试等不到目标态」优先怀疑并发/挂起，而非实现不存在**：首版自测 15s 等 ready 超时且零报错——先用最小复现（单块 debug-mm，3.5s 即 ready）排除实现问题，再用双块复现锁定并发，避免在正确实现上反复打转
  3. **自测资产复用验证成功**：mermaid-smoke 沿用 wysiwyg-smoke 的增量落盘 + 异常钩子 + 文本定位模式，13 项一次写对；FUNC-3 的「断言用即将消失的 class 选择器会挂死」教训直接规避
- **改进项清单（回流方向）**：
  1. 自测脚本 skill 化立项评估条件进一步增强（串行队列 + 超时保护模式可复用为通用「异步渲染自测模板」；Sprint 3 剩余 FUNC-5/7/8/6 高频复用）
  2. 全局单例异步 API（mermaid 类）在本项目内的使用规范：任何并发调用点必须串行化 + 超时（写入 FUNC-6 等后续任务的前置认知）

### 2026-08-22 · 任务经验 · FUNC-5 排障：CM6 快捷键与 Playwright 合成事件的「环境相关」陷阱 + 断言时机

- **背景**：FUNC-5（代码格式化）实现，Playwright 自测 11/11 全绿（FUNC-3/4 回归保持）。两个 FAIL 的根因都是「断言/触发与真实环境的差异」，非实现缺失。
- **关联 decision**：decision-018
- **影响范围**：EditorPane.vue（formatKeydownHandler）、format-smoke.mjs；FUNC-7/8 自测与快捷键实现复用
- **经验与教训**：
  1. **CM6 keymap 的 `Mod-Shift-f` 在 Shift 组合下被 `Mod-f`（搜索面板）抢先命中，且行为随事件源变化**：Playwright 合成 Ctrl+Shift+f 的 `event.key` 是小写 "f"（CM6 A 分支拼 "Ctrl-f" 直接命中 openSearchPanel），真实键盘是大写 "F"（需 fallback base[70] 分支才命中）。同一绑定、两种事件、两种命运——**快捷键实现不要依赖 CM6 对 Shift 组合的降级匹配，用 `Prec.highest(EditorView.domEventHandlers({keydown}))` 显式匹配 `e.key === "f" || "F"` 最稳**。
  2. **domEventHandlers 参数顺序是 `(event, view)`**：bindHandler 内部 `handler.call(plugin, event, view)`。写反静默失效（「无报错但功能失效」类问题第三例——前两例：reconfigure 槽位、Vue 代理破坏 Compartment 身份）。判断启发：CM6 的 DOM 回调沿用 DOM 惯例（事件参数在前），不要照搬 ViewPlugin 的 (view) 直觉。
  3. **CM6 `.cm-content` 的 textContent 不含 `\n`**（CSS 渲染行，块间无换行符）：多行断言用 `\n` 永远不命中且不报错（waitForFunction 空等）。改用缩进空格子串断言（`"  <p>hi</p>"`）。
  4. **toast 断言轮询「内容」而非「元素」**：Naive UI message 3s 存留期，`waitForSelector(".n-message")` 会被前一步旧 toast 骗过，内容尚未格式化完就断言失败；改为 waitForFunction 轮询目标文本。
  5. 沙箱 stdout 截断会掩盖脚本实际完成度（报告文件才是真相）：format-smoke 完整 11 项跑完，沙箱只显示前 3~6 行且 exit 0，误判「脚本卡停」——**自测脚本务必 fs 落盘报告并以其为准**。
- **改进项清单（回流方向）**：
  1. CM6 快捷键规范：组合键走 `Prec.highest domEventHandlers` + `e.key` 大小写双兼容（后续 FUNC-7 搜索快捷键、FUNC-8 等复用）
  2. 自测断言规范：多行内容用缩进空格、toast 用轮询目标文本、报告落盘为准（写入自测 skill 立项的评估清单）

### 2026-08-22 · 任务经验 · FUNC-7 排障：CM6 搜索面板的「缺件」与测试输入链路差异

- **背景**：FUNC-7（搜索/替换）实现，Playwright 自测 16/16 全绿（mermaid 回归 13/13 保持）。主要工作不是接 search 扩展（Ctrl+F 面板 basicSetup 就有），而是补「CM6 没做」的部分 + 适配测试输入。
- **关联 decision**：decision-019
- **影响范围**：EditorPane.vue（search({top:true}) + SearchCount + 浮动样式）、searchCount.ts、search-smoke.mjs；FUNC-8 与后续复用
- **经验与教训**：
  1. **「复用内置能力」前先核对验收清单与内置能力的缺口**：CM6 search 面板三选项/替换/高亮/跳转全齐，但**没有视觉计数与空态提示**（计数只走屏幕阅读器 announceMatch）——SIS 明确要求可见计数，自研 SearchCount ViewPlugin 补齐（`new SearchQuery(spec).getCursor(state)` 遍历计数）。判断启发：内置 ≠ 完整，逐条对验收标准找「缺件」
  2. **测试输入链路差异（Playwright fill vs 真实打字）**：CM6 搜索框 commit 走 onkeyup/onchange（无 oninput）；Playwright `fill` 的 change 事件在「面板二次打开」会话中实测不触发 commit（同面板内 fill 却有效）——自测统一「点击 + Ctrl+A + type」。真实用户打字（keyup）无此问题，**是测试适配不是产品 bug**
  3. **焦点 scope 决定快捷键归属**：替换后焦点留在搜索面板，"search-panel" scope 无 undo 绑定，Ctrl+Z 不达编辑器；撤销断言前先点击 .cm-content 聚焦。同理适用于任何「面板类 UI 操作后断言编辑器行为」的场景
  4. **searchExtensions 预注册的副作用**：`search({top:true})` 预注册扩展后，openSearchPanel 走 togglePanel 分支而非 appendConfig 注入（后者是首次打开的动态方案）——`top: true` 必须在扩展里配置，仅靠 searchKeymap 无法置顶
- **改进项清单（回流方向）**：
  1. 自测 skill 立项评估清单增补：内置能力缺口核对（逐条对验收找缺件）+ 面板类 UI 操作后焦点 scope 断言规范

### 2026-08-22 · 任务经验 · FUNC-8 落地：settings 基础设施的「按需最小子集」与 Compartment 槽位复用

- **背景**：FUNC-8（软换行）实现，Playwright 自测 10/10 全绿。功能本体极简（lineWrapping + Compartment），主要工作量在补「ARCH-2 已设计但 Sprint 4 才实现」的 settings 持久化最小子集。
- **关联 decision**：decision-020
- **影响范围**：settingsService.ts/settingsStore.ts（新建，ARCH-2 schema 落地）、EditorPane.vue（wrapCompartment）、ToolBar.vue（换行按钮）；FUNC-9/11/AI-1 复用 settings 通道
- **经验与教训**：
  1. **跨 Sprint 依赖的「按需最小子集」策略**：ARCH-2 settings 完整实现在 Sprint 4，但 FUNC-8 需要持久化——按 ARCH-2 §4.2 schema 只落 wordWrap 字段（含 DEFAULT_SETTINGS 兜底 + 兼容合并），Sprint 4 在预留字段上扩展，零返工。判断启发：前置架构文档定义好 schema 时，消费方按最小子集落地比等完整实现更优
  2. **字段命名以架构文档为准**：SIS-FUNC-8 建议 wrapLines，ARCH-2 定 wordWrap——SIS §4 允许改字段命名，取架构字段避免 Sprint 4 不一致
  3. **测试环境差异（Tauri plugin-store vs 浏览器）**：settingsService 用 isTauri() 分流（plugin-store / localStorage），前端自测（localhost 浏览器）走 localStorage 兜底，reload 可验证持久化——基础设施服务的浏览器 fallback 是「全前端自测」路线的前提
  4. **CM6 扩展本质是配置而非黑盒**：lineWrapping 就是 contentAttributes({class})，reconfigure 即时生效、不写文档——以 DOM class 为断言锚点（.cm-lineWrapping），简洁可靠
- **改进项清单（回流方向）**：
  1. settings 基础设施后续扩展规范：Sprint 4 settingsStore 完整化（theme/recentFiles/aiConfig）时复用现有 load/save 通道，不新建平行实现

### 2026-08-22 · 任务经验 · FUNC-6 落地：双栏 diff 的「右栏空白」与「外部写回后重挂载显示旧内容」双根因排查

- **背景**：Sprint 3 第六项（收尾）FUNC-6（文件对比）实现，Playwright 自测从 2/6 追到 12/12 全绿（FUNC-3/4/5/7/8 回归保持）。前几项经验（CM6 装饰/串行渲染/快捷键/搜索面板/settings）在本任务零踩坑，本次新坑集中在「数据模型对称性」与「store 与编辑器内容一致性」。
- **关联 decision**：decision-021
- **影响范围**：diffService.ts、CompareView.vue（新建）；MainView.vue、ToolBar.vue、EditorPane.vue（switchToTab 一致性判定）、package.json（test:compare）；Sprint 3 收口与 Sprint 4 复用
- **经验与教训**：
  1. **「右栏空白」根因 = 配对块的对称字段漏更新**：pairs 构建时 removed 块先入队（rightText=""），added 配对只写 `prev.added = c` 忘了 `prev.rightText = c.value` → 配对块渲染右侧行数 0（右栏空白、计数 0/1、行级高亮只剩 removed 侧）。**通用教训：成对对象的对称字段（leftText/rightText、leftFrom/rightTo 等）赋值必须成对核对**——这类 bug 不报错、纯靠渲染现象反推
  2. **外部文本源的 CRLF 污染**：Edge 剪贴板 readText 自动把 LF 存为 CRLF，jsdiff 整行不匹配 → 整篇算差异。任何「外部文本 vs 编辑器文本」对比前必须归一行尾（`\r\n?` → `\n`），且归一应发生在对比计算层（不污染原文本）
  3. **store 外部写回 vs cmState 缓存的一致性**：对比合并只改 tab.content，EditorPane 重挂载 switchToTab 恢复旧 cmState 显示旧内容。曾尝试 store 内 `cmState.update({changes})` 同步，结果 Pinia 深度代理使新 state 在 setState 抛 `state.facet is not a function`（Vue 代理破坏 EditorState 内部引用，markRaw 包 update 返回值也没用）——**最终以 content 为唯一事实源：switchToTab 比较 `cmState.doc.toString() === tab.content`，不一致重建**。cmState 降级为「未过期缓存」而非事实源
  4. **按需导入缺件的「局部性」**：MainView 补 NModal 后弹窗出现，但 CompareView 的 n-button 仍是未知组件（template 原样输出 `<n-button>` 标签、无 button 元素、工具栏按钮不可点）。**按需导入模式下每个 SFC 的 n-xxx 必须自查**——修一处 import 只解决该组件的标签
  5. **滚动类断言先确认「有滚动空间」**：3~4 行内容时 scrollTop 恒 0（jumpTo 设值被 clamp），功能正常但断言 FAIL；改 31 行数据后跳转/联动验证成立（before=0/after=87/rightTop=30）。判断启发：测试数据长度要覆盖断言依赖的物理条件
- **改进项清单（回流方向）**：
  1. 自测 skill 立项评估清单增补：滚动类断言的空间前提、外部文本源 CRLF 归一、按需导入组件自查清单
  2. Sprint 3 六项全部闭环 → 走阶段 4→5→6→7→8（DoD 对照表 + Review 报告 + Retrospective 轻量并入本日志）；Sprint 4（FUNC-9~11、AI-1，第 4 次授权燃尽）复用 settings 通道（theme/recentFiles/aiConfig 字段已就位）

### 2026-08-22 · Sprint 闭环 · Sprint 3 收口回填（轻量 Retrospective，AS-8 第 3 次授权闭环）

- **背景**：Sprint 3（增强）六任务全部完成（FUNC-3 28/28 / FUNC-4 13/13 / FUNC-5 11/11 / FUNC-7 16/16 / FUNC-8 10/10 / FUNC-6 12/12，合计 90/90 DoD 子项），走完阶段 4->5->6->7->8 完整闭环。Review 结论 Passed With Observation（Aida 代行判定，events[] 广播 PO）。本记录承担阶段 7 反思纪要职能（轻量形态，沿 Sprint 1/2 先例）。
- **关联 decision**：decision-016~021（FUNC-3~8 各一）；Sprint 3 闭环不再单开 decision（循 decision-011 先例并入收口批次）
- **影响范围**：project/sprint/（Sprint_3_DoD对照表 + Sprint_3_Review报告 + Sprint_4_Planning输入候选清单）；Sprint 4 执行模式
- **过程数据**：任务 6/6 DoD 通过（90/90 子项）；events 本 Sprint 新增 7 条（任务级 6 + 闭环 1 计入收口批次）；git commit 主线 7 个（FUNC-3/4 未单列 hash 于 Backlog，FUNC-5 55e4da4 / FUNC-7 a72d3db / FUNC-8 652d2e6 / FUNC-6 d57ddc9 + 收口 1 个）；PO 转交 0 次（环境/工具链由 PO 系统终端执行 0 次，前端功能 Aida 用 Playwright 自测，全 Sprint 零转交）；新增正式测试资产 6 个（test:wysiwyg/test:mermaid/test:format/test:search/test:wrap/test:compare）
- **经验与教训**：
  1. **六任务全前端 + 自测链路成熟 = 全 Sprint 零转交**：Sprint 1 转交 2 次（环境下载）、Sprint 2 转交 1 次（关窗口验证）、Sprint 3 转交 0 次——「自测能力是自主性的分水岭」结论（Sprint 2 期）在 Sprint 3 完全兑现；Playwright+系统 Edge 链路成为前端功能验证的默认路径
  2. **技术坑密度随复杂度上升但全部前置化**：FUNC-3（主峰）4 个 CM6 装饰坑、FUNC-4 全局单例并发、FUNC-5 快捷键合成事件、FUNC-7 搜索面板缺件、FUNC-8 settings 最小子集、FUNC-6 对称字段漏更——每任务一条 Evolution Log 经验 + decision 定案，Sprint 4（AI-1 主峰含流式/API 真实交互）直接复用排查方法论
  3. **「外部写回 vs 缓存」一致性以 store content 为唯一事实源**（FUNC-6 关键）：cmState 降级为「未过期缓存」，switchToTab 比较 doc 与 content——这是对 FUNC-2 markRaw 原则的自然延伸：**store 持有外部对象时，内容类状态以 store 文本为事实源，外部对象只做缓存**
  4. **按需导入的组件自查**：Naive UI 按需导入模式下，每个 SFC 的 n-xxx 必须自己 import（MainView 的 NModal 修复不解决 CompareView 的 NButton）——「修一处 import 只解决该组件的标签」
  5. **滚动类断言的数据前提**：测试内容长度必须覆盖断言依赖的物理条件（无滚动空间时 scrollTop 恒 0，功能正常也会误判 FAIL）
- **改进项清单（回流方向）**：
  1. 自测 skill 立项评估进入决策点：Sprint 4 收口时正式立项 product/skills/（6 个 smoke 脚本模式一致，模板化收益明确；PO 建议过「手动做一个测试 skill」）
  2. Sprint 4 观察：AI-1 真实 API 调用的沙箱限制应对（mock 层或 PO 提供测试配置）；FUNC-10 关闭三选边界复验；两文件对比入口 PO Tauri 手动验证
  3. Sprint 4 复用清单：settings 通道完整化（theme/recentFiles/aiConfig 字段已就位）、markRaw/Compartment 原则、自测脚本模板模式、六任务经验（decision-016~021）

### 2026-08-22 · 任务经验 · FUNC-9 落地：主题三态解析单点收敛与「库默认值想当然」之坑

- **背景**：Sprint 4 第一项 FUNC-9（主题切换）实现，Playwright 自测 8/8 全绿（wrap/compare 回归保持）。功能本体中等，主要经验集中在「三态解析架构收敛」与「库默认值」两处。
- **关联 decision**：decision-022
- **影响范围**：settingsStore.ts（resolvedTheme/systemDark/ACCENT_OVERRIDES）、settingsService.ts（accentColor）、App.vue（NConfigProvider）、EditorPane.vue（themeExtension 读 store）、ToolBar.vue（主题下拉）、theme-smoke.mjs；FUNC-11/AI-1 复用 settings 通道
- **经验与教训**：
  1. **「库默认值想当然」：Naive UI 默认 primary 是绿 #18a058，不是蓝**——「blue 用官方默认、只需覆盖绿/紫」的直觉错误，首版 blue 实际显示绿色。修复：三套强调色全部显式覆盖。**通用教训：任何「复用默认值」的假设先查库文档/源码实测，尤其颜色这类视觉默认**
  2. **三态解析（resolvedTheme）收敛到 settingsStore 单点**：theme 偏好 + systemDark（matchMedia）+ computed resolvedTheme，App provider / CM themeCompartment / 工具栏下拉全部只读派生，各层不再各自维护 matchMedia——FUNC-2 的 EditorPane 内 mediaQuery 逻辑整体移除。**架构原则：全局偏好类状态（主题/换行/AI 配置）由 store 统一解析与分发，消费方只读派生**
  3. **matchMedia 监听防重**：EditorPane 会因 CompareView v-else 卸载重挂载导致多次 init，监听器注册需防重（init 内 `if (mediaQuery) return`）——FUNC-6 的「外部写回」经验延伸：共享单例型资源注册要幂等
  4. **自测锚点设计**：Naive provider 无稳定 class 可断言，给根元素挂 `data-theme`/`data-accent` 属性（同时服务调试）；CM oneDark 背景 rgb(40,44,52)；primary 按钮 `--n-ripple-color` 反映强调色
  5. **Naive UI dropdown 快速点击关闭的库内部竞态**：`handleMouseMoveOutside` 引用已卸载节点抛 null.contains（库 bug，功能无影响），自测 pageerror 检查需过滤已知库噪声——**库 bug 与实现 bug 的区分：功能断言全过后才判定为库噪声**
  6. **Playwright API 小坑**：`emulateMedia` 在 page 上（非 context）；.mjs 里函数参数不能用 TS 类型标注
- **改进项清单（回流方向）**：
  1. settings 通道继续供 FUNC-11（recentFiles）/ AI-1（aiConfig）扩展；自测锚点模式（data-* 属性 + CSS 变量）可入自测 skill 模板

### 2026-08-22 · 任务经验 · FUNC-11 落地：非侵入记录钩子 + 空态行为变更的测试连动盘点

- **背景**：Sprint 4 第二项 FUNC-11（最近文件列表）实现，Playwright 自测 9/9 全绿 + 全部 9 个 smoke 脚本回归保持。主要工作量在「记录时机非侵入化」与「无标签主区行为变更的测试连动」。
- **关联 decision**：decision-023
- **影响范围**：settingsStore.ts（recentFiles/addRecentFile/removeRecentFile）、tabsStore.ts（recordRecent/openPath）、RecentEmpty.vue（新建）、ToolBar.vue（最近下拉）、MainView.vue（空态接管）、recent-smoke.mjs + 8 个旧脚本适配；FUNC-10/AI-1 复用
- **经验与教训**：
  1. **记录类副作用用「成功后钩子」而非侵入主链路**：recentFiles 写入点在 tabsStore.openTab/markSaved 成功后调 settingsStore.addRecentFile（settings 是副作用，tabsStore 事实源与脏标记链路零改动）——与 decision-021「content 为唯一事实源」一致：每个 store 管好自己领域，跨领域副作用用钩子转发
  2. **UI 行为变更先盘点测试前提假设**：MainView 由「无标签渲染空编辑器」改「无标签显示最近文件空态」后，8 个旧 smoke 脚本 goto 后等 `.cm-editor` 全部超时（启动无标签 → 无编辑器）——批量改为 goto 后先 Ctrl+n。**通用教训：改 UI 首屏/空态行为前，先 grep 所有测试对旧行为的依赖**（本次花了 8 处批量适配，若提前盘点可一次到位）
  3. **浏览器自测 Pinia store 钩子**：`__vue_app__.config.globalProperties.$pinia` 拿实例 + `useStore(pinia)` 显式传参（Pinia 内部会 setActivePinia，store 内无参 use 可解析）；裸 `import('pinia')` 在 Vite 浏览器不可用——用 `/src/...` Vite 路径动态 import
  4. **「最近访问」语义**：重新激活已有标签也算最近访问（置顶），openTab 的 existing 分支同样 recordRecent
- **改进项清单（回流方向）**：
  1. 自测 skill 立项评估清单增补：UI 行为变更的测试前提盘点步骤、Pinia store 直调模板（evaluate 拿 $pinia + useStore(pinia)）
  2. Sprint 4 收口时评估：9 个 smoke 脚本（ui/multitab/wysiwyg/mermaid/format/search/wrap/compare/theme/recent）统一模式已成熟，模板化/skill 化正式立项

### 2026-08-22 · 任务经验 · FUNC-10 落地：草稿生命周期三态清理 + 「成功信号所在函数」的清理挂载点

- **背景**：Sprint 4 第三项 FUNC-10（自动保存/崩溃恢复草稿）实现，Playwright 自测 9/9 全绿 + 回归保持。核心经验在草稿生命周期管理与「清理动作挂在哪」。
- **关联 decision**：decision-024
- **影响范围**：draftService.ts（新建）、tabsStore.ts（scheduleDraft/markSaved/removeTab/restoreDraft/openTab markDirty）、MainView.vue（启动恢复弹窗 + 退出清理）、draft-smoke.mjs；AI-1 复用 tabsStore
- **经验与教训**：
  1. **清理动作必须挂在「成功信号」所在的函数**：保存成功走 markSaved（不经 updateContent）——若草稿清理只放 updateContent 非脏分支则永不触发。正确挂点：markSaved（保存后清，含另存新旧 key）、removeTab（关闭/丢弃清）、updateContent 非脏分支（内容回退到 saved 兜底）。**通用教训：副作用挂点先画「数据流图」找成功信号，不凭直觉**
  2. **崩溃恢复的双实现（Tauri 文件 / 浏览器 localStorage）**：同 decision-020 分流思路，浏览器模拟层让「崩溃→重启→恢复弹窗」全链路可自测（reload 模拟崩溃）；Tauri 真实退出清理留 PO 验证（浏览器无退出事件）——「不可自测的 Tauri 专属项显式留 PO」已成 Sprint 4 惯例（FUNC-6 两文件对比同款）
  3. **恢复置脏 = openTab markDirty 参数**（savedContent 置空派生 dirty）：恢复的草稿语义是「未保存内容」，基线置空比「手动改 dirty 标志」更符合 ARCH-2 §1.3 派生态
  4. **过期残留清理放启动扫描（checkRecover）**：TTL 判定（7 天）后删除并重写——「不留碎片」硬约束在启动时点统一执行
- **改进项清单（回流方向）**：
  1. 自测 skill 立项评估清单增补：双实现模拟层（浏览器 fallback 让 Tauri 能力可自测）、reload 模拟崩溃的模式
  2. Sprint 4 收口在即：AI-1 后走项目交付，全部 10 个 smoke 脚本模式沉淀

<!-- 后续在此追加记录，格式：

### YYYY-MM-DD · 类型 · 摘要

- **背景**：{触发原因、当时遇到的问题}
- **关联 decision**：decision-xxx
- **影响范围**：{影响到的文档 / 能力}

-->
