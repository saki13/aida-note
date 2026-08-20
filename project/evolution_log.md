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
- **观察点（待 Sprint 收口回填验证）**：
  1. 授权期间「程序正义 vs 效率」的实际张力：无 PO 在场时，收口/回写/同步动作是否真正不可省略
  2. 低风险变更自批（T3 5.1/6）的实际触发频率与判断一致性
  3. events[] 事件流记录的粒度是否合理（当前 P0/P1/P2 三级占位）
  4. 「每任务即做 DoD 检查（不等阶段 5）」对发现问题的前置效应

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

<!-- 后续在此追加记录，格式：

### YYYY-MM-DD · 类型 · 摘要

- **背景**：{触发原因、当时遇到的问题}
- **关联 decision**：decision-xxx
- **影响范围**：{影响到的文档 / 能力}

-->
