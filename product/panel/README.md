# AidaPulse 通用看板（产品资产）

> 资产归类：产品资产 -> 通用代码
> 版本：v0.1.0
> 对应 Backlog：`Panel-1a/1b/2/3` 工作流看板
> 作用：AidaPulse 工作流看板的通用前端代码与数据模板，跨项目复用（Aida 每次主持项目都要用来看板）。
> 上级文档：[AidaPulse 白皮书 v0.1.0](../whitepaper/AidaPulse白皮书_待确认.md)

---

## 1. 组成

| 文件 | 说明 |
|------|------|
| `index.html` | 看板页面结构 |
| `app.js` | 交互 + `fetch('data.json')` 动态渲染 |
| `style.css` | 看板样式 |
| `serve.js` | 本地静态服务（`node serve.js [端口]`，默认 8000，服务目录 = 本文件所在目录） |
| `start-panel.bat` | Windows 一键启动脚本 |
| `data.json` | **空数据模板**（checklist 为通用阶段流程，current/backlog/sprints/burnout/events 留空待项目填充） |

## 2. 用法

1. 新项目复制本目录全部文件到项目看板目录（如 `{项目}/project/panel/workflow/`）。
2. 在 `data.json` 中填入项目数据（current / backlog / sprints / burnout / events）。
3. 运行 `node serve.js`（或 `start-panel.bat`），访问 `http://localhost:8000/`。

## 3. 与建设资产实例的关系

- 本目录是**产品资产**（通用代码 + 空模板）。
- 项目级实例（含本项目 `data.json` 与执行报告）是**建设资产**，存放于 `{项目}/project/panel/workflow/`。
- 项目级实例示例：`{项目}/project/panel/workflow/data.json`（由 AS-Panel 规则同步更新）。

## 4. 归位记录

由 G6 资产治理模型落地时，从母工程 `project/panel/workflow/` 复制通用代码归位至此（2026-08-18）。`data.json` 实例与执行报告保留在母工程 `project/` 作为建设资产。
