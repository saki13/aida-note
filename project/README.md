# project（建设资产）

> 本目录存放本项目的建设资产（项目级产出）。骨架初始化时为空，由 Aida 在项目推进中按需生成。

| 子目录 / 文件 | 用途 | 生成时机 |
|--------------|------|---------|
| `pcb/` | 项目背景蓝图（PCB） | 首次 Grooming 前按 PCB 模板生成 |
| `backlog/` | 产品待办清单（主事实源） | 首次 Grooming 建立 |
| `sis/` | 结构化指令集 | 按 AS-SIS 从 Backlog 转化生成 |
| `sprint/` | Sprint 启动收口 / Review / DoD 文档 | 按 Sprint 模板生成 |
| `panel/workflow/` | 看板数据源实例（data.json） | 首次看板同步时生成 |
| `change_log.md` | 变更日志实例 | 按 change_log 模板生成 |
| `evolution_log.md` | 演进记录实例 | 按 evolution_log 模板生成 |

> 资产归类：建设资产 -> 项目目录结构（具体产出见各子目录）
