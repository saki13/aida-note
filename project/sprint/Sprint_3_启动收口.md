# Sprint 启动收口：Sprint 3（增强）

> 版本：v0.1.0
> 资产归类：建设资产 -> Sprint 运行资产
> 阶段说明：承接 Sprint 2 Review 收口（Passed With Observation，2026-08-21）与阶段 8 候选清单，作为 Sprint 3 进入执行前的统一启动约定。

## 1. Sprint 基本信息

- Sprint 名称：Sprint 3 - 增强
- Sprint 定位：第 3 个正式执行 Sprint（AS-8 授权第 3 次，余 1 次）
- Sprint 目标：
  - 完成 Markdown 同屏所见即所得（块级双态：光标块源码、其余块渲染），打通 Typora 式写作体验
  - 完成 mermaid 原位实时渲染（双态切换 + 失败 AI 修复入口占位）
  - 完成代码格式化（Prettier standalone，4 语言）
  - 完成文件对比（双栏 diff + 剪贴板源 + 跳转联动）
  - 完成搜索 / 替换（CM6 search 扩展）与软换行展示（默认开、可开关、保存不写入）
- 执行模式：短 Sprint 自主执行（AS-8 授权边界，decision-008 第 3 次用量）

## 2. 本轮正式输入

| # | ID | 名称 | 优先级 | DoD | 前置依赖 |
|---|----|------|--------|-----|---------|
| 1 | FUNC-3 | Markdown 同屏所见即所得（Typora 式） | P0 | 见 SIS-FUNC-3 验收标准 | FUNC-2（编辑器/语言机制）；UI-2 §1（块级双态交互蓝图） |
| 2 | FUNC-4 | mermaid 编写 + 原位实时渲染 | P0 | 见 SIS-FUNC-4 验收标准 | FUNC-3（块级双态基础）；UI-2 §2（原位渲染/修复入口）；ENV-2（mermaid 已装） |
| 3 | FUNC-5 | 代码格式化（html/js/json/markdown 4 语言，SQL 不做） | P0 | 见 SIS-FUNC-5 验收标准 | FUNC-2（语言体系）；ENV-2（Prettier standalone 已装） |
| 4 | FUNC-7 | 搜索 / 替换（当前文件） | P0 | 见 SIS-FUNC-7 验收标准 | FUNC-1（编辑器）；CM6 search 扩展 |
| 5 | FUNC-8 | 软换行展示（默认开，可开关，保存不写入换行符） | P0 | 见 SIS-FUNC-8 验收标准 | FUNC-2（Compartment 机制可复用）；settingsStore（wordWrap 持久化） |
| 6 | FUNC-6 | 文件对比（双栏 diff + 剪贴板对比） | P0 | 见 SIS-FUNC-6 验收标准 | UI-1 §2（DiffView）；UI-2 §5（双栏联动/跳转蓝图）；ENV-2（jsdiff 已装） |

执行顺序：FUNC-3 -> FUNC-4 -> FUNC-5 -> FUNC-7 -> FUNC-8 -> FUNC-6（FUNC-3 是 FUNC-4 块级双态基础故先行；FUNC-6 涉及新视图编排、独立性最强故靠后；FUNC-7/8 轻量穿插）

## 3. 候选池（本轮不纳入）

- 其余 4 项已锁定在 Sprint 4（FUNC-9~11、AI-1），无候补

## 4. 暂缓项

- 无

## 5. 本轮不做什么

- 不做主题切换功能（FUNC-9 / Sprint 4；UI-3 视觉方案已备好基线）
- 不做自动保存与崩溃恢复（FUNC-10 / Sprint 4）、最近文件列表（FUNC-11 / Sprint 4）
- 不做任何 AI 真实接入（AI-1 / Sprint 4；FUNC-4 的 AI 修复入口仅 UI 占位）
- 不引入任何新 npm/cargo 依赖（六项所需库均已在 ENV-2 就位）
- 不写任何自定义 Rust 命令（守 ARCH-1「Rust 最小化」契约）

## 6. 执行模式

短 Sprint 自主执行（AS-8）：授权期间 Aida 自主主持阶段 3-8，低风险变更可自批（影响 ≤3 文件 + 不影响 Sprint 目标 + 目标偏离 ≤20% + 不涉 PCB/白皮书）；中/高风险变更由 PO 决定。Sprint 3 收口时授权用量将记为 3/4。

## 7. 执行顺序（含风险卡点）

本轮内部顺序：FUNC-3 -> FUNC-4 -> FUNC-5 -> FUNC-7 -> FUNC-8 -> FUNC-6

风险卡点与预案：

1. **FUNC-3 实现前置宣贯三原则（本 Sprint 最高优先级纪律，Evolution Log 改进项 2 回流）**：
   - **markRaw 原则**：所有 CM6 外部对象（EditorState/decorations/widget 实例等）进入 Vue reactive 上下文必须 markRaw()（decision-013）
   - **Compartment 槽位原则**：所有 CM6 state（含初始空 state）必须注册同一对 Compartment 实例，块级双态扩展同样挂 compartment 槽位
   - **watch 单点写缓存原则**：多标签 cmState 缓存读写仅在一个 watch 单点完成，decorations 方案不得旁路开辟第二写路径
   - 预案：FUNC-3 开工首步做三原则对照检查清单；若「无报错但失效」类问题再现，直接走 Evolution Log 四步排查法（独立复现 -> 对照实验 -> 内部结构 dump -> 实例一致性比较），不做盲试
2. **FUNC-3 与多标签缓存交互复杂度（FUNC-2 三重根因前车之鉴）**：块级双态 decorations 重建须完全受控于 EditorView.update 事务流，禁止 Vue watch 反向驱动 decorations 重建
3. **FUNC-4 mermaid 异步渲染**：异步渲染节点归组件持有、手动挂载/销毁（ARCH-1 规则 4），防止 CM6 widget 内异步内容泄漏；防抖 300ms 光标离开触发（UI-2 §2.1）
4. **FUNC-6 新视图编排**：DiffView 独立于 EditorView，不触碰 cmState 缓存体系，风险隔离
5. **自测**：全部前端功能，test:ui/test:multitab 资产直接复用扩展；按 Sprint 2 观察项 2，本 Sprint 顺带评估自测脚本模板化/skill 化立项（不阻塞主线）

## 8. 核心设计决策

1. 技术栈与分层遵循 ARCH-1 契约，状态管理遵循 ARCH-2 蓝图；FUNC-3/4/6 实现分别回调 ui-interactions.md §1/§2/§5，偏离交互原则需走 T3 变更
2. 三原则（markRaw / Compartment 槽位 / watch 单点写缓存）为 FUNC-3 及后续所有编辑器扩展任务的强制实现约束（decision-013）
3. 4 短 Sprint 划分与顺序锁定不变（decision-007 / decision-011）；Sprint 4 为最后一次授权（燃尽后转项目交付）
4. 零新增依赖策略：mermaid/Prettier standalone/jsdiff/CM6 search 均已在 ENV-2 安装，本 Sprint 无任何安装风险

## 9. 一句话结论

骨架之上装功能：让 aida-note 从「能编辑可高亮」升级为「所见即所得 + mermaid + 格式化 + 对比 + 搜索替换 + 软换行」的完整文本工作台，主峰是 FUNC-3，严守三原则。
