# Aida v0.1.0 原型使用说明

> 资产归类：产品资产 -> Agent 资产  
> 版本：v0.1.0  
> 用途：说明如何在一个新的、上下文较短的会话里启动并使用 `Aida v0.1.0` 原型。

---

## 1. 原型组成

当前 `Aida v0.1.0` 原型至少由以下资产组成：

- 执行载体：`product/agents/aida/Aida_v0.1.0_SKILL_待确认.md`
- 输入模板：`product/templates/Aida_v0.1.0会后会议表单模板_待确认.md`
- 状态快照：`memory/state.md`
- 审计模板：`product/templates/Aida_v0.1.0审计追踪模板_待确认.md`
- 通知模板：`product/templates/Aida_v0.1.0通知事件模板_待确认.md`

---

## 2. 启动方式

在新会话中，建议按以下顺序启动：

1. 先装载 `Aida_v0.1.0_SKILL_待确认.md`
2. 再装载核心治理与能力规则摘要
3. 再装载当前 `Product Backlog`、当前 `Sprint` 运行资产、当前 `PCB`
4. 最后向 `Aida v0.1.0` 提供一份真实的会后会议表单

---

## 3. 推荐装载顺序

> 推荐先通过 manifest 入口统一索引所有资产，再按以下分层顺序装载。

- manifest 入口：`memory/manifest.md`

### 3.1 第一层：执行载体

- `product/agents/aida/Aida_v0.1.0_SKILL_待确认.md`

### 3.2 第二层：治理与边界

- `product/rules/会议治理总规则_待确认.md`
- `product/rules/Aida职责边界总规则_待确认.md`
- `product/rules/G5_流程守门与阻断机制_待确认.md`

### 3.3 第三层：能力规则

- `product/skills/AS-1_阶段识别与流程守门_待确认.md`
- `product/skills/AS-2_会前检查与会前辅助包_待确认.md`
- `product/skills/AS-3_会议表单接收与一轮追问_待确认.md`
- `product/skills/AS-4_会议结论分流沉淀_待确认.md`
- `product/skills/AS-5_会后回写与通知_待确认.md`
- `product/skills/AS-9_模块分层与编排_待确认.md`
- `product/skills/AS-10_原型工作流_待确认.md`
- `product/skills/AS-11_审计日志规则_待确认.md`
- `product/skills/AS-12_审查规范_待确认.md`

### 3.4 第四层：项目上下文

- `project/backlog/Product_Backlog.md`
- 当前 `Sprint` 运行资产
- `project/pcb/项目背景蓝图_待确认.md`

---

## 4. 输入方式

建议把会后结论整理成一份结构化表单，再交给 `Aida v0.1.0`。

推荐直接使用：

- `product/templates/Aida_v0.1.0会后会议表单模板_待确认.md`

---

## 5. 预期输出

一次正常处理后，`Aida v0.1.0` 至少应给出：

1. 当前阶段判断
2. 是否需要追问及追问结果
3. 分流结果
4. 回写结果
5. 通知结果
6. Pulse Execution Sync 同步摘要
7. 下一流程结论
8. `audit_trace_id`

---

## 6. 当前适用范围

当前 `Aida v0.1.0` 最适合用于：

- 长 Sprint 场景中的会后闭环
- 结构化会议结论的接收与处理
- `Backlog / SIS / 未决议题池 / 过程记录` 的最小分流与回写

当前不应把它当成：

- 实时会议同传助手
- 价值决策代理
- 正式产品

---

## 7. 当前成功标准

如果 `Aida v0.1.0` 能基于一份真实会议表单，完整跑通：

- 接收
- 判断
- 追问
- 分流
- 回写
- 通知
- 留痕

那么就可以视为已经完成一次最小试运行。
