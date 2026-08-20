---
sis_id: SIS-ENV-1
related_backlog_id: ENV-1
priority: P0
stage: active
status: confirmed
linked_skills: []
---

# SIS：项目脚手架搭建

## 1. 任务目标

搭建 aida-note 编辑器的产品代码脚手架：在 `app/` 子目录下生成可运行的 Tauri 2 + Vue 3 + TypeScript + Vite 骨架，按功能分层组织目录，配置工程规范（TS strict + ESLint 精简 + git 初始基线）。

- 必须完成：
  - 用 create-tauri-app 官方模板生成 Tauri 2 + Vue3 + TS + Vite 骨架
  - `src/` 下按功能分层：`components/`（UI 组件）、`services/`（文件/设置/AI 服务）、`stores/`（状态）、`views/`（页面视图）
  - TypeScript strict 模式开启
  - ESLint 精简配置可运行
  - git 初始 commit（基线）
- 建议完成：
  - npm scripts 语义化（dev / build / lint）
- 当前不做：
  - 不做任何产品功能开发（高亮/渲染/对比等均属后续 SIS）
  - 不引入状态管理库（Pinia 等）以外的额外工程复杂度

## 2. 人类意图

PO 原始表达（2026-08-19 逐项问答确认）：

- "我想要开发一款轻便 功能全面的文本编辑器。对标 notepad++ 和 Typora"
- Q1 脚手架来源：选 A（create-tauri-app 官方模板）
- Q2 包管理器：选 B（npm）
- Q3 目录结构：选 A（按功能分层 components/services/stores/views）
- Q4 工程规范：照推荐（TS strict 开启、ESLint 精简、git + 初始 commit）
- Q5 产品代码位置：选 A（`aida-note/app/` 子目录，根目录 git init 同仓管理框架资产与产品代码）

## 3. 输入 / 输出契约

- 输入：
  - PCB 定稿技术栈结论（Tauri 2 + Vue 3 + TypeScript + Vite + Naive UI）
  - PO 的 Q1~Q5 选择（见人类意图）
- 输出：
  - 可运行的脚手架（含 `src-tauri/` + `src/` 目录、package.json、vite 配置、tsconfig、ESLint 配置）
  - 功能分层目录结构（components / services / stores / views）
  - git 初始 commit 基线
- 输出位置：`d:\lucia\workspace\aida-note\app\`

## 4. 边界与约束

- 可以改：目录内文件组织细节、配置文件的具体写法
- 不能改：
  - 技术栈选型（Tauri 2 + Vue 3 + TypeScript + Vite）
  - 包管理器为 npm
  - 产品代码位置 `app/` 子目录
- 必须遵守：
  - TS strict 模式开启
  - ESLint 精简配置可用（不引入大量自定义规则）
  - 脚手架完成后创建 git 基线 commit
  - 不破坏 `product/`、`project/`、`memory/` 框架资产

## 5. 验收标准

- [ ] `app/` 下脚手架可通过 `npm run dev` 启动并弹出默认 Tauri 窗口
- [ ] `src/` 含 components / services / stores / views 四个功能分层目录
- [ ] tsconfig 开启 strict 模式（`"strict": true`）
- [ ] ESLint 配置存在，`npm run lint` 可运行且通过
- [ ] 根仓库 git 已 init 且存在初始 commit（框架资产 + `app/` 产品代码同仓）
- [ ] `npm run build` 前端构建可通过
