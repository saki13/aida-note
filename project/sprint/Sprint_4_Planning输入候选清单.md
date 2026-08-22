# Sprint 4 Planning 输入候选清单

> 版本：v0.1.0
> 资产归类：建设资产 -> Sprint 运行资产
> 阶段说明：阶段 08（Planning Input Ready）输出，承接 Sprint 3 Review 收口（Passed With Observation，2026-08-22）。
> 授权状态：AS-8 第 4 次授权（最后一次，燃尽后转项目交付），Sprint 4 成员按 Planning 锁定不变。

## 1. 候选项提取（Backlog 剩余 4 项全部锁定）

按 Planning 收口（decision-007）锁定的 Sprint 4 成员：

| # | ID | 名称 | 优先级 | DoD | 前置依赖 |
|---|----|------|--------|-----|---------|
| 1 | FUNC-9 | 主题切换（明 / 暗 + 多套配色） | P1 | 见 SIS-FUNC-9 验收标准 | UI-3（视觉基线已定稿）；settingsStore（theme 字段已就位，decision-020）；themeCompartment 已有明暗切换能力（FUNC-2） |
| 2 | FUNC-10 | 自动保存 / 崩溃恢复草稿（临时目录，退出/恢复后清理、不留碎片） | P1 | 见 SIS-FUNC-10 验收标准 | ARCH-2 §3.1（BOM 读写）；fileService；Tauri path/fs |
| 3 | FUNC-11 | 打开最近文件列表 | P1 | 见 SIS-FUNC-11 验收标准 | settingsStore（recentFiles 字段已就位，decision-020）；fileService |
| 4 | AI-1 | 可配置第三方 API（OpenAI 兼容，baseURL/key/model，支持 DeepSeek）+ 润色 + 问答 + mermaid 修复 | P1 | 见 SIS-AI-1 验收标准 | settingsStore（aiConfig 字段已就位，decision-020）；UI-2 §3/§4（润色四动作/diff 气泡 + 问答侧栏交互蓝图）；FUNC-4 修复入口占位（UI 已备） |

执行顺序建议：FUNC-9（主题切换，最轻量，settings/theme 通道已就绪）-> FUNC-11（最近文件，settings 通道复用）-> FUNC-10（自动保存/草稿，涉及 Tauri 临时目录）-> AI-1（主峰，需真实 API 请求 + 流式 + 三个能力点）

## 2. 关键依赖与风险预告

1. **settings 基础设施完整化**：Sprint 4 首任务（FUNC-9）将 settingsStore 从最小子集扩展为完整 schema（theme/recentFiles/aiConfig），复用现有 load/save 通道（decision-020 改进项 1），不新建平行实现。
2. **AI-1 是本 Sprint 技术主峰**：OpenAI 兼容协议对接（baseURL/key/model 可配）、流式输出、润色 diff 气泡与问答侧栏（UI-2 §3/§4 蓝图）。风险：真实 API 调用在沙箱浏览器自测受限（需 PO 提供可测 API 配置或 mock 层）；mermaid 修复复用 FUNC-4 修复入口占位。
3. **FUNC-10 自动保存/草稿**：涉及 Tauri 临时目录与退出清理；「退出/恢复后清理、不留碎片」为验收硬约束；关闭确认三选（Sprint 2 观察项）可在此任务顺带复验边界。
4. **自测资产 skill 化**：Sprint 3 六任务已产出 6 个 smoke 脚本（wysiwyg/mermaid/format/search/wrap/compare），模式一致（Playwright + 落盘报告 + 文本定位断言）；Sprint 4 收口时正式立项评估（呼应 PO「手动做一个测试 skill」建议）。
5. **Tauri 能力验证**：FUNC-6 两文件对比入口（dialog）浏览器不可测，留 PO 在 Tauri 窗口手动验证（Sprint 3 观察项 1）；Sprint 4 涉及 Tauri 能力（临时目录/API 网络）时浏览器自测 + PO 终端验证分层。

## 3. Backlog 剩余状态

- 已完成：15 / 19（Sprint 1：ENV-1/2、ARCH-1/2；Sprint 2：UI-1/2/3、FUNC-1/2；Sprint 3：FUNC-3~8）
- 本轮锁定：4 / 19（FUNC-9、FUNC-10、FUNC-11、AI-1）——**Backlog 剩余全部锁定**
- **未燃尽（4 项），按流程进入 Sprint 4 Planning（阶段 03）**；第 4 次授权燃尽后转项目交付（Backlog 燃尽检查）。

## 4. 一句话结论

Sprint 3 已交付完整文本工作台（所见即所得 + mermaid + 格式化 + 对比 + 搜索替换 + 软换行），Sprint 4 携剩余 4 项（主题/自动保存/最近文件/AI）进入 Planning——最后一次授权，主峰是 AI-1，settings 通道全面复用，燃尽即交付。
