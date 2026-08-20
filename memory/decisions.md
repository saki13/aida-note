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

---

<!-- 后续在此追加，格式：

### decision-00X · YYYY-MM-DD · 决策摘要

- **背景**：
- **决策**：
- **依据**：
- **影响范围**：

-->
