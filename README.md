# Aida 独立项目骨架

> 用途：可复制的最小可运行资产集，让 Aida 脱离母工程，在全新目录独立完成一个项目。
> 版本：v0.1.0
> 资产归类：产品资产 -> 项目骨架（可复制模板）

---

## 组成

| 目录 | 说明 |
|------|------|
| `product/` | 产品资产（规则 / 技能 / 模板 / 载体 / 白皮书 / 看板通用代码） |
| `memory/` | 记忆系统种子（manifest / state / decisions / context_cache，初始化时为空） |
| `project/` | 建设资产空目录（PCB / Backlog / SIS / Sprint 等按需生成） |

## 使用方法

1. 复制本骨架到新项目目录
2. 按 [启动说明.md](启动说明.md) 的「启动 prompt」启动 Aida（恢复装载 + 项目准备）
3. 收集初始需求 → 生成 PCB（PCB 模板）→ 建立 Backlog → 按 AS-SIS 生成 SIS → 推进 Sprint
4. 每个阶段产出写入 `project/`，状态同步到 `memory/` 与看板 data.json

## 已移除（骨架不含）

- 母工程实例数据（PCB / Backlog / SIS / Sprint 的具体内容）
- `C4 架构图`、`工作流图.png`（视觉派生件，从「工作流图与检查表」按需重建）
- `design/`（母工程设计稿）
- `index.md`（母工程文档索引，新项目自行重建）

## 目录约定

见 [目录约定.md](目录约定.md)
