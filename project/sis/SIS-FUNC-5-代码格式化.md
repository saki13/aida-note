---
sis_id: SIS-FUNC-5
related_backlog_id: FUNC-5
priority: P0
stage: active
status: confirmed
linked_skills: []
---

# SIS：代码格式化（美化，4 种语言）

## 1. 任务目标

实现 aida-note 的代码格式化（美化）能力：对当前文件按语言调用 Prettier 做标准格式化，覆盖 html / js / json / markdown 四种语言，结果原地替换且可撤销。SQL 格式化暂不支持（做减法，已进 PCB 反面教材）。

- 必须完成：
  - 格式化引擎：Prettier（ENV-2 已接入），覆盖 html / js / json / markdown
  - 触发方式：工具栏「格式化」按钮 + 快捷键（Ctrl+Shift+F）
  - 作用范围：整个文件（Prettier 原生行为）
  - 结果处理：原地替换 + 进撤销栈（作为一次编辑操作，可 Ctrl+Z 回退）
  - 失败处理：语法错误无法格式化时弹出提示，保持原文不变
- 建议完成：
  - 状态栏 / 工具栏反馈格式化成功（如 toast「已格式化」）
- 当前不做：
  - 不做 SQL 格式化（PCB 反面教材，SQL 仅保留语法高亮）
  - 不做保存时自动格式化（属可选增强，未定案）
  - 不做选中区域局部格式化

## 2. 人类意图

PO 原始表达（2026-08-20 逐项问答确认，FUNC-5 全部"照推荐"）：

- 按钮 + 快捷键：工具栏「格式化」按钮 + Ctrl+Shift+F
- 整个文件：每次格式化整个文件
- 原地 + 可撤销：原地替换，进撤销栈可 Ctrl+Z 回退
- 提示 + 保持原文：语法错误时弹出提示，保持原文不变

## 3. 输入 / 输出契约

- 输入：
  - ENV-2 依赖（Prettier + 对应 4 种语言 parser）
  - FUNC-1（编辑器内容读取 / 回写、撤销栈接入）
  - FUNC-2（当前文件语言识别）
- 输出：
  - 格式化服务实现（formatService：语言识别 → Prettier 调用 → 结果回写 + 撤销栈）
  - 工具栏「格式化」按钮与快捷键绑定
  - 失败提示 UI（toast）
- 输出位置：`d:\lucia\workspace\aida-note\app\`（src/services/formatService、src/components）

## 4. 边界与约束

- 可以改：快捷键具体键位、toast 文案、Prettier 配置细节（缩进/换行风格）
- 不能改：
  - 语言范围：html / js / json / markdown（不做 SQL）
  - 作用范围：整个文件
  - 结果处理：原地替换 + 可撤销
  - 失败处理：提示 + 保持原文
- 必须遵守：
  - 格式化基于 FUNC-2 的语言识别结果选择 Prettier parser
  - 格式化作为一次可撤销编辑操作接入（与 FUNC-1 撤销栈一致，不破坏脏标记逻辑）
  - SQL 文件（.sql）不提供格式化入口（可置灰 / 隐藏按钮，或格式化时提示不支持）

## 5. 验收标准

- [ ] html / js / json / markdown 文件均可通过按钮或 Ctrl+Shift+F 格式化
- [ ] 格式化作用于整个文件，结果原地替换
- [ ] 格式化后 Ctrl+Z 可回退到格式化前内容（进撤销栈）
- [ ] 语法错误文件格式化时弹出提示，原文保持不变
- [ ] SQL 文件不触发格式化（按钮置灰 / 或提示不支持）
- [ ] 格式化成功后有反馈（toast「已格式化」）
- [ ] `npm run dev` 可手动验证，`npm run build` 通过
