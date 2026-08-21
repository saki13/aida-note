# 框架演进记录 Evolution Log

> 记录规则、字段、触发时机见产品资产：../product/rules/框架演进记录规则_待确认.md。
> 本文件是本项目按规则产生的记录实例，与 change_log.md 平行。
> 资产归类：建设资产 -> 演进记录实例

---

## 记录列表

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

<!-- 后续在此追加记录，格式：

### YYYY-MM-DD · 类型 · 摘要

- **背景**：{触发原因、当时遇到的问题}
- **关联 decision**：decision-xxx
- **影响范围**：{影响到的文档 / 能力}

-->
