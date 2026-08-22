# Aida Memory Manifest

> 用途：新会话的统一恢复入口（L1 恢复清单）。
> 版本：v0.1.0
> 最后更新：2026-08-22
> 更新者：Aida v0.1.0

---

## 当前状态

| 字段 | 值 |
|------|-----|
| `current_sprint` | `Sprint 5（已闭环：使用手册 + 安装包，PO 追加授权第 5 次）` |
| `current_stage` | `项目交付（阶段 11，PO 已确认交付；Sprint 5 追加收尾完成）` |
| `current_theme` | `交付收尾（使用手册 + 安装包）` |
| `current_task` | `Sprint 5：使用手册 + 安装包（收口完成）` |
| `task_status` | `done` |
| `task_progress` | `Sprint 1/2/3/4/5 全部闭环（decision-001~026）；Backlog 19/19 完成；Sprint 5：使用手册 5/5 ✅ + 绿色版 ZIP ✅（app/dist-install/aida-note-portable.zip，4.6MB）+ release exe ✅（12.95MB，冒烟 15s 存活）+ MSI/NSIS ⏳（PO 本地 npm run tauri build）` |

---

## 始终在线上下文

> 此区块内容来自 PCB，由 PO 主导确认后更新。项目启动初期为空，Aida 在首次 Grooming 后按 PCB 填写。

### 项目身份

- 项目名称：（待 PCB 定稿）
- 项目目标：（待 PCB 定稿）
- 当前阶段目标：（待 PCB 定稿）
- 当前能力边界：（待 PCB 定稿）
- 核心角色：PO / Aida（节奏驱动者）/ PC / PT

### 当前阶段行为边界

- `current_stage`：`Sprint In Progress`
- `allow`：按 SIS 执行任务、每任务即做 DoD 检查、低风险变更自批（T3 5.1/6）+ 异步广播、产出审计轨迹与事件日志
- `deny`：中/高风险变更自批（回 PO）、跳过任何收口/回写/同步动作（AS-8 第 7 节程序正义）、超出授权次数继续主持短 Sprint
- `block_on`：中/高风险变更、PCB/白皮书变更

### 阶段定义与变更规则

- 标准 11 阶段：项目准备 → Backlog Grooming → Planning → Sprint In Progress → Sprint Completed → Review → Retrospective（可选）→ Planning Input Ready → 短 Sprint 脉冲 → 脉冲执行同步 → 项目交付
- 阶段推进规则：以 AS-1 + 工作流图为准
- PCB 变更规则：需经 PO 主导会议确认

---

## 按序装载清单

> 所有路径基于骨架目录结构。思考优先级：产品资产 > 会话上下文 > 记忆 > 建设资产。

| 序号 | 文件 | 用途 | 资产类型 |
|------|------|------|---------|
| 1 | memory/manifest.md | 恢复清单本身 | 记忆系统 |
| 2 | memory/state.md | L2 状态快照 | 记忆系统 |
| 3 | memory/decisions.md | L3 决策日志 | 记忆系统 |
| 4 | memory/context_cache.md | L2.5 上下文缓存 | 记忆系统 |
| 5 | product/agents/aida/Aida_v0.1.0_SKILL_待确认.md | 执行载体 | 产品资产 |
| 6 | product/agents/aida/工作流图与检查表_待确认.md | 全流程工作流图 | 产品资产 |
| 7 | product/rules/会议治理总规则_待确认.md | 会议治理 | 产品资产 |
| 8 | product/rules/Aida职责边界总规则_待确认.md | 职责边界 | 产品资产 |
| 9 | product/rules/G5_流程守门与阻断机制_待确认.md | 流程守门 | 产品资产 |
| 10 | project/pcb/项目背景蓝图.md | 项目级纲领 | 建设资产 |
| 11 | project/backlog/Product_Backlog.md | 主事实源 | 建设资产 |
| 12 | product/skills/AS-1_阶段识别与流程守门_待确认.md | 阶段识别 | 产品资产 |
| 13 | product/skills/AS-2_会前检查与会前辅助包_待确认.md | 会前检查 | 产品资产 |
| 14 | product/skills/AS-3_会议表单接收与一轮追问_待确认.md | 表单接收 | 产品资产 |
| 15 | product/skills/AS-4_会议结论分流沉淀_待确认.md | 结论分流 | 产品资产 |
| 16 | product/skills/AS-5_会后回写与通知_待确认.md | 回写通知 | 产品资产 |
| 17 | product/skills/AS-9_模块分层与编排_待确认.md | 模块分层 | 产品资产 |
| 18 | product/skills/AS-10_原型工作流_待确认.md | 原型工作流 | 产品资产 |
| 19 | product/skills/AS-11_审计日志规则_待确认.md | 审计日志 | 产品资产 |
| 20 | product/skills/AS-12_审查规范_待确认.md | 审查规范 | 产品资产 |
| 21 | product/skills/AS-6-Cache_context_cache结构设计_待确认.md | 缓存结构 | 产品资产 |
| 22 | product/skills/AS-6_按需资产装载能力_待确认.md | 按需装载 | 产品资产 |
| 23 | product/skills/AS-SIS_BacklogSIS转化与同步规则_待确认.md | SIS 转化 | 产品资产 |
| 24 | product/skills/AS-Panel_看板数据源同步规则_待确认.md | 看板同步 | 产品资产 |
| 25 | product/skills/AS-8_短Sprint授权模式执行边界_待确认.md | 短 Sprint 授权 | 产品资产 |
| 26 | product/rules/G6_资产治理模型_待确认.md | 资产治理 | 产品资产 |
| 27 | product/rules/T3_变更管理规则_待确认.md | 变更管理 | 产品资产 |
| 28 | product/rules/框架演进记录规则_待确认.md | 演进记录 | 产品资产 |
| 29 | product/rules/G3_未决议题池管理规则_待确认.md | 未决议题池 | 产品资产 |
| 30 | product/templates/PCB模板_待确认.md | PCB 模板 | 产品资产 |
| 31 | product/templates/SKILL标准模板_待确认.md | SKILL 模板 | 产品资产 |
| 32 | product/templates/SIS标准模板_待确认.md | SIS 模板 | 产品资产 |
| 33 | product/templates/Sprint启动收口模板_待确认.md | Sprint 启动模板 | 产品资产 |
| 34 | product/templates/SprintReview报告模板_待确认.md | Review 模板 | 产品资产 |
| 35 | product/templates/SprintDoD对照表模板_待确认.md | DoD 模板 | 产品资产 |
| 36 | product/templates/change_log模板_待确认.md | 变更日志模板 | 产品资产 |
| 37 | product/templates/evolution_log模板_待确认.md | 演进日志模板 | 产品资产 |
| 38 | product/agents/aida/stage_flows/ | 11 个阶段流程文档 | 产品资产 |
| 39 | product/whitepaper/AidaPulse白皮书_待确认.md | 框架白皮书 | 产品资产 |
| 40 | product/panel/README.md | 看板通用代码 | 产品资产 |

---

## 待完善 / 下一步

- **当前阶段**：项目交付（Backlog 19/19 燃尽；PO 确认交付；Sprint 5 追加「使用手册 + 安装包」收口完成：手册 5/5 ✅ + 绿色版 ZIP 交付 ✅）
- 下一步：PO 本地 `npm run tauri build` 产出 MSI/NSIS 正式安装包（`app/src-tauri/target/release/bundle/`）+ 复验 4 项本地观察项；无流程动作待办
