# Sprint 3 Planning 输入候选清单

> 版本：v0.1.0
> 资产归类：建设资产 -> Sprint 运行资产
> 阶段说明：阶段 08（Planning Input Ready）输出，承接 Sprint 2 Review 收口（Passed With Observation，2026-08-21）。
> 授权状态：AS-8 第 3 次授权（余 1 次），Sprint 3 成员按 Planning 锁定不变。

## 1. 候选项提取（Backlog 剩余 10 项中本轮锁定 6 项）

按 Planning 收口（decision-007）锁定的 Sprint 3 成员：

| # | ID | 名称 | 优先级 | DoD | 前置依赖 |
|---|----|------|--------|-----|---------|
| 1 | FUNC-3 | Markdown 同屏所见即所得（Typora 式） | P0 | 见 SIS-FUNC-3 验收标准 | FUNC-2（编辑器/语言机制）；UI-2 §1（块级双态交互蓝图） |
| 2 | FUNC-4 | mermaid 编写 + 原位实时渲染 | P0 | 见 SIS-FUNC-4 验收标准 | FUNC-3（块级双态基础）；UI-2 §2（原位渲染/修复入口）；ENV-2（mermaid 已装） |
| 3 | FUNC-5 | 代码格式化（html/js/json/markdown 4 语言，SQL 不做） | P0 | 见 SIS-FUNC-5 验收标准 | FUNC-2（语言体系）；ENV-2（Prettier standalone 已装） |
| 4 | FUNC-6 | 文件对比（双栏 diff + 剪贴板对比） | P0 | 见 SIS-FUNC-6 验收标准 | UI-1 §2（DiffView）；UI-2 §5（双栏联动/跳转蓝图）；ENV-2（jsdiff 已装） |
| 5 | FUNC-7 | 搜索 / 替换（当前文件） | P0 | 见 SIS-FUNC-7 验收标准 | FUNC-1（编辑器）；CM6 search 扩展 |
| 6 | FUNC-8 | 软换行展示（默认开，可开关，保存不写入换行符） | P0 | 见 SIS-FUNC-8 验收标准 | FUNC-2（Compartment 机制可复用）；settingsStore（wordWrap 持久化） |

执行顺序建议：FUNC-3 -> FUNC-4 -> FUNC-5 -> FUNC-7 -> FUNC-8 -> FUNC-6（所见即所得是 FUNC-4 的块级双态基础故先行；FUNC-6 独立性最强、涉及新视图编排故靠后；FUNC-7/8 轻量可穿插）

## 2. 关键依赖与风险预告

1. **FUNC-3 所见即所得是本 Sprint 技术主峰**：CM6 decorations 方案（WidgetDecoration/MarkDecoration + 光标块判定），UI-2 §1 已定交互规则。风险：块级双态与多标签 cmState 缓存的交互复杂度高（FUNC-2 三重根因前车之鉴），实现须严守 markRaw/Compartment 槽位/watch 单点写缓存三原则（decision-013）。
2. **mermaid 渲染（FUNC-4）**：异步渲染节点归组件持有（ARCH-1 规则 4）；防抖 300ms 离开触发（UI-2 §2.1）；AI 修复入口仅占位（AI-1 属 Sprint 4）。
3. **全部为前端功能**：自测资产 test:ui/test:multitab 直接复用；按观察项 2，本 Sprint 评估自测脚本模板化/skill 化立项。
4. **零新增依赖**：六项任务所需库（mermaid/Prettier/jsdiff/CM6 search）均已随 ENV-2 安装，无 cargo/npm 安装风险。
5. **回调 UI-2 蓝图**：FUNC-3/4/6 实现分别对照 ui-interactions.md §1/§2/§5；偏离交互原则需走 T3 变更。

## 3. Backlog 剩余状态

- 已完成：9 / 19（Sprint 1：ENV-1/2、ARCH-1/2；Sprint 2：UI-1/2/3、FUNC-1/2）
- 本轮锁定：6 / 19（FUNC-3~FUNC-8）
- Sprint 4 预留：4 项（FUNC-9~FUNC-11、AI-1）
- **未燃尽，按流程进入 Sprint 3 Planning（阶段 03）**；第 4 次授权燃尽后转项目交付。

## 4. 一句话结论

Sprint 2 骨架已验收（可编辑可保存可高亮），Sprint 3 携 6 项增强功能进入 Planning，主峰是 FUNC-3 所见即所得，全部前端可自测、零新增依赖。
