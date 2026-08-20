---
sis_id: SIS-FUNC-8
related_backlog_id: FUNC-8
priority: P0
stage: active
status: confirmed
linked_skills: []
---

# SIS：软换行展示

## 1. 任务目标

实现 aida-note 的软换行（视觉折行）展示能力：超出屏幕可视宽度的长行在编辑器内折行显示，用户无需横向滚动即可看到全部内容；折行仅是视觉呈现，不向文件内容写入换行符（保护脚本语言单行语义不被破坏）。默认开启、可开关、状态持久化。

- 必须完成：
  - 视觉折行：长行按可视宽度折行显示，不写入换行符（基于 CodeMirror lineWrapping）
  - 默认开启
  - 开关位置：工具栏「换行」开关按钮 + 设置项
  - 作用范围：全局共享（一个开关影响所有标签页）
  - 持久化：用户切换后写入 settings.json，下次启动记住
- 建议完成：
  - 折行时按单词边界优先（保持单词完整，避免截断）
- 当前不做：
  - 不做硬换行（物理插入换行符）
  - 不做每标签独立的换行状态

## 2. 人类意图

PO 原始表达（2026-08-20 逐项问答确认，FUNC-8 全部"照推荐"）：

- 工具栏 + 设置：工具栏「换行」开关按钮 + 设置项（默认开启）
- 全局共享：一个开关影响所有标签页
- 持久化：写入 settings.json，下次启动记住
- （历史原话）超出屏幕可视化范围自动换行展示，保存仍是一行，防止脚本语言编译不过，展示时折行免滚动

## 3. 输入 / 输出契约

- 输入：
  - FUNC-1（编辑器接入）
  - ARCH-2（settings.json 读写、settingsStore）
  - CodeMirror 6（lineWrapping 扩展）
- 输出：
  - 软换行开关实现（工具栏按钮 + 设置项 + 全局状态）
  - 折行扩展接入（CodeMirror lineWrapping）
  - settings.json 字段（如 `wrapLines: boolean`）与 TS schema 更新
- 输出位置：`d:\lucia\workspace\aida-note\app\`（src/components、src/stores/settingsStore、src/services/settingsService）

## 4. 边界与约束

- 可以改：按钮图标/文案、settings 字段命名、折行粒度细节
- 不能改：
  - 视觉折行（不向文件内容写入换行符）
  - 默认开启
  - 全局共享（不做每标签独立）
  - 持久化到 settings.json
- 必须遵守：
  - 折行仅影响显示，保存/读盘不改变文件内容
  - 与 FUNC-1 的光标定位、行号、滚动行为兼容
  - settings 字段纳入 ARCH-2 的 TS schema

## 5. 验收标准

- [ ] 默认开启软换行，长行在编辑器内折行显示，无需横向滚动
- [ ] 工具栏「换行」按钮可切换开关，切换即时生效于所有标签页
- [ ] 设置项可修改软换行默认状态，与工具栏按钮状态一致
- [ ] 保存文件后，折行未写入换行符（文件内容与编辑前一致，无新增 \n）
- [ ] 重启应用后记住上次的软换行开关状态
- [ ] 折行显示下光标定位、行号、选择行为正常
- [ ] `npm run dev` 可手动验证，`npm run build` 通过
