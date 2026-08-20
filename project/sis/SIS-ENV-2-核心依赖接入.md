---
sis_id: SIS-ENV-2
related_backlog_id: ENV-2
priority: P0
stage: active
status: confirmed
linked_skills: []
---

# SIS：核心依赖接入

## 1. 任务目标

在 ENV-1 脚手架基础上，接入编辑器产品所需的全部核心第三方依赖，为后续 FUNC 系列 SIS（高亮 / 渲染 / 格式化 / 对比）提供就绪环境。

- 必须完成：
  - CodeMirror 6 核心包 + 5 种语言包（html / sql / js / json / markdown）接入
  - mermaid（最新稳定版）接入
  - Prettier 接入
  - jsdiff 接入
  - Pinia（Vue 状态管理）接入
- 建议完成：
  - 依赖版本锁定（package.json 精确版本或 lockfile 提交）
- 当前不做：
  - 不引入 vue-router（视图切换用组件状态，保持轻便）
  - 不进行任何功能开发（仅装依赖，验证可安装、可引用）

## 2. 人类意图

PO 原始表达（2026-08-19 逐项问答确认）：

- ENV-2 四项依赖细节全部"照推荐"：
  - 引入 Pinia（状态密集，stores/ 目录就绪）
  - 不引入 vue-router（单窗口工具，保持轻便）
  - diff 库选 jsdiff（轻量，够双栏对比用）
  - CodeMirror 语言包 5 种全上（html / sql / js / json / markdown）

## 3. 输入 / 输出契约

- 输入：
  - ENV-1 脚手架（`app/` 目录，npm 管理）
  - PO 的依赖选择（见人类意图）
- 输出：
  - 更新后的 `package.json`（含全部核心依赖）
  - 依赖安装完成（node_modules 就绪）
  - 验证依赖可引用的最小引用示例（如 main.ts 中注册 Pinia、某处 import CodeMirror/mermaid 验证不报错）
- 输出位置：`d:\lucia\workspace\aida-note\app\`

## 4. 边界与约束

- 可以改：依赖的具体版本号（取当前稳定版）、验证示例的写法
- 不能改：
  - 依赖范围：CodeMirror 6 / mermaid / Prettier / jsdiff / Pinia
  - 不引入 vue-router
  - 包管理器为 npm
- 必须遵守：
  - 依赖安装不破坏现有脚手架构建（`npm run dev` / `npm run build` 仍通过）
  - 遵循 PCB 技术栈结论（Naive UI 属 UI-1 阶段接入，不在本 SIS 范围）

## 5. 验收标准

- [ ] `package.json` 含 CodeMirror 6 核心 + 5 语言包、mermaid、prettier、jsdiff、pinia 依赖
- [ ] `package.json` 不含 vue-router
- [ ] `npm install` 成功无错误
- [ ] 最小引用验证通过：Pinia 注册到 Vue 实例、CodeMirror/mermaid 至少一处 import 不报类型/编译错误
- [ ] `npm run dev` 可启动、`npm run build` 可通过（依赖接入不破坏脚手架）
