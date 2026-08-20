---
sis_id: SIS-FUNC-9
related_backlog_id: FUNC-9
priority: P1
stage: active
status: confirmed
linked_skills: []
---

# SIS：主题切换（明 / 暗 + 多套配色）

## 1. 任务目标

实现 aida-note 的主题切换功能：明 / 暗 / 跟随系统三态切换，明暗各一套基础主题并支持 2-3 个强调色方案，工具栏与设置均可切换，选择持久化到 settings.json。主题配色与 CodeMirror 语法高亮联动（承接 UI-3 视觉规范）。

- 必须完成：
  - 主题模式：明 / 暗 / 跟随系统三态切换
  - 多套配色：明暗各 1 套基础主题 + 2-3 个强调色方案（如蓝/绿/紫）
  - 切换入口：工具栏主题下拉 + 设置项
  - 持久化：写入 settings.json，下次启动记住
  - 与 CodeMirror 语法高亮配色联动（明暗主题切换时高亮跟随）
- 建议完成：
  - 跟随系统模式下，系统明暗变化时实时联动切换
- 当前不做：
  - 不做自定义主题编辑器 / 用户自定义配色上传
  - 不做明暗各多套完整主题（如 Solarized / Dracula 全家桶）

## 2. 人类意图

PO 原始表达（2026-08-20 逐项问答确认，FUNC-9 全部"照推荐"）：

- 三态切换：明 / 暗 / 跟随系统
- 基础 + 强调色：明暗各 1 套基础主题 + 2-3 个强调色方案（蓝/绿/紫）
- 工具栏 + 设置：工具栏主题下拉 + 设置项
- 持久化：写入 settings.json，下次启动记住

## 3. 输入 / 输出契约

- 输入：
  - UI-3 视觉设计（明暗主题 + CodeMirror 联动规则、配色规范）
  - ARCH-2（settings.json 读写、settingsStore）
  - Naive UI 主题机制（明暗主题 provider）
- 输出：
  - 主题切换实现（settingsStore.theme 状态 + 工具栏下拉 + 设置项）
  - 强调色方案定义（2-3 个，作用于 UI 主题色变量）
  - CodeMirror 主题联动（明暗切换时高亮配色跟随）
  - settings.json 字段（如 `theme`、`accentColor`）与 TS schema 更新
- 输出位置：`d:\lucia\workspace\aida-note\app\`（src/stores/settingsStore、src/components、src/services/settingsService）

## 4. 边界与约束

- 可以改：强调色具体色值、下拉菜单交互细节、settings 字段命名
- 不能改：
  - 三态切换：明 / 暗 / 跟随系统
  - 基础 + 强调色（不做明暗各多套完整主题）
  - 持久化到 settings.json
  - 与 CodeMirror 高亮配色联动
- 必须遵守：
  - 主题规范承接 UI-3 视觉设计（配色变量、明暗规则）
  - settings 字段纳入 ARCH-2 的 TS schema
  - 不做自定义主题编辑器

## 5. 验收标准

- [ ] 可在明 / 暗 / 跟随系统三态间切换
- [ ] 跟随系统模式下，系统明暗变化时界面联动切换
- [ ] 明暗各 1 套基础主题正常显示
- [ ] 2-3 个强调色方案可切换，作用于 UI 主题色
- [ ] 工具栏主题下拉与设置项均可切换，状态一致
- [ ] 主题切换时 CodeMirror 语法高亮配色跟随变化
- [ ] 重启应用后记住上次主题与强调色选择
- [ ] `npm run dev` 可手动验证，`npm run build` 通过
