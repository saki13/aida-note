---
sis_id: SIS-AI-1
related_backlog_id: AI-1
priority: P1
stage: active
status: confirmed
linked_skills: []
---

# SIS：AI 接入（润色 / 问答 / mermaid 修复）

## 1. 任务目标

实现 aida-note 的 AI 能力接入：前端直连用户自定义的 OpenAI 兼容协议 API（可配 baseURL / key / model，单套），提供三大能力——润色（选中文本改写/润色/缩短/扩写，结果原位替换可接受/撤销）、问答（可折叠侧栏，仅选中文本为上下文，回答一键插入光标）、mermaid 修复（错误代码交 AI 修正后替换）。润色与问答采用流式输出。

- 必须完成：
  - API 配置：单套 OpenAI 兼容协议（baseURL / key / model），key 明文存 settings.json
  - 润色：选中文本 → 改写 / 润色 / 缩短 / 扩写（四选）；入口 = 右键菜单 + 工具栏；结果原位替换 + 接受/撤销（diff 式）；流式输出
  - 问答：可折叠侧栏聊天面板；上下文仅选中文本（无选中时提示先选中，不带全文）；回答可一键插入光标处；流式输出
  - mermaid 修复：触发入口 = mermaid 错误提示「AI 修复」按钮 + 工具栏「修复 mermaid」按钮（两种都要）；将错误代码交 AI 修正后替换
- 建议完成：
  - 请求失败 / 超时 / 无 key 时的错误提示
  - 问答历史保留在当次会话（不落盘或可清空）
- 当前不做：
  - 不做多套 API 配置切换
  - 不做函数调用 / 工具调用 / RAG 知识库
  - 不做 AI 代码生成 / 补全（IDE 级能力，PCB 反面教材）
  - 不做模型微调 / 本地模型

## 2. 人类意图

PO 原始表达（2026-08-20 逐项问答确认，AI-1）：

- Key 存储：明文 settings.json（自用可接受）
- 润色呈现：原位替换 + 接受/撤销（diff 式）
- 问答上下文：仅选中文本，无选中时提示（不带全文）
- API 配置：单套（baseURL/key/model）
- 润色入口：右键菜单 + 工具栏（改写/润色/缩短/扩写四选）
- 输出方式：流式（打字机效果）
- mermaid 修复：错误提示入口 + 工具栏按钮「两种都要」

## 3. 输入 / 输出契约

- 输入：
  - ARCH-2（settings.json 读写、settingsStore，含 API 配置字段）
  - FUNC-1（编辑器内容读取 / 回写、光标定位、撤销栈）
  - FUNC-4（mermaid 错误提示入口，AI 修复按钮占位）
  - 前端 HTTP 请求能力（fetch）
- 输出：
  - AI 服务实现（aiService：API 调用 + 流式解析 + 润色/问答/mermaid 修复三个接口）
  - AI 状态管理（aiStore：配置、请求状态、问答会话）
  - UI：润色菜单/按钮 + 原位替换 diff 交互 + 侧栏聊天面板 + mermaid 修复入口
  - settings.json 字段（如 `ai: { baseURL, key, model }`）与 TS schema 更新
- 输出位置：`d:\lucia\workspace\aida-note\app\`（src/services/aiService、src/stores/aiStore、src/components、src/views）

## 4. 边界与约束

- 可以改：请求库选型、流式解析实现、UI 细节、提示文案
- 不能改：
  - 单套 API 配置（不做多套切换）
  - key 明文存 settings.json
  - 润色四选：改写 / 润色 / 缩短 / 扩写
  - 润色结果原位替换 + 接受/撤销
  - 问答上下文仅选中文本（无选中提示，不带全文）
  - 回答一键插入光标处
  - 润色与问答流式输出
  - mermaid 修复入口 = 错误提示 + 工具栏（两种都要）
- 必须遵守：
  - 前端直连 OpenAI 兼容协议（不经过自有后端）
  - API 调用失败 / 无 key 时给出明确错误提示，不崩溃
  - 流式输出可中断（用户取消）
  - 不做 IDE 级 AI 能力（补全/代码生成/工具调用）

## 5. 验收标准

- [ ] 可在设置中配置单套 API（baseURL / key / model），key 明文存 settings.json
- [ ] 选中文本后，右键菜单与工具栏均可触发润色（改写/润色/缩短/扩写四选）
- [ ] 润色结果以原位替换 + diff 式呈现，可「接受」或「撤销」，流式输出
- [ ] 问答侧栏可折叠，选中文本后提问，回答流式返回
- [ ] 无选中文本时发起问答，提示先选中（不带全文上下文）
- [ ] 问答回答可一键插入光标处
- [ ] mermaid 语法错误时，错误提示提供「AI 修复」按钮，工具栏也有「修复 mermaid」按钮
- [ ] mermaid 修复将错误代码交 AI 修正后替换，修正成功则正常渲染
- [ ] 未配置 key 或请求失败时，给出明确错误提示且不崩溃
- [ ] `npm run dev` 可手动验证，`npm run build` 通过
