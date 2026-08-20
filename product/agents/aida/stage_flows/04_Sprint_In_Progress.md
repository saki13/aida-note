# 阶段 04：Sprint In Progress

> 阶段流程文档（7.1d 拆分）| 来源：[阶段流程重审表](../阶段流程重审表_待确认.md) | 版本 v0.1.0

## 进入条件

- Sprint 启动收口文档
- Backlog
- manifest / state
- SKILL 执行载体

## 执行（Aida 动作）

- **长 Sprint**：Aida 与 PO 共同决定每个 Backlog 项的负责人/agent，并行执行并追踪各任务进度；agent 自动获取任务，人类负责人通过输入与交付物把 Backlog 项推进到「待检查」状态，由 Aida 做 DoD 检查通过后关闭
- **短 Sprint**：Aida 自行将任务交给 agent，按依赖关系并行/串行执行并追踪进度
- **每个任务完结后 Aida 立即做 DoD 检查（不等阶段 5）** → 产生异步广播事件

## 输出

- 任务交付物
- 更新后 state
- 审计轨迹（`project/traces/audit_trace_xxx.md`）
- 事件日志（`project/traces/events_xxx.md`）

## 收口检查

- 通用 4 同步点：①decisions ②Backlog ③data.json ④state+manifest
- 阶段特定：所有任务有明确状态（待检查 / 已关闭）、交付物已产出
