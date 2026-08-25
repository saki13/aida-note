---
sis_id: SIS-OPT-6
related_backlog_id: OPT-6
priority: P1
stage: active
status: pending（待 PO 确认）
linked_skills: []
---

# SIS：上次文件标签恢复（会话恢复）

## 1. 任务目标

实现 notepad++ 式会话恢复：**退出应用后再次打开，恢复上次打开的文件标签**。已保存文件重新加载为标签；未保存（脏）标签内容回填并保持脏标记；启动时弹一次「恢复上次会话」确认框（恢复 / 全部丢弃）。

- 必须完成：
  - 会话快照：正常退出/关闭窗口时写入（已保存文件路径列表 + 未保存标签 {id, title, content}）
  - 启动恢复：检测到快照 → 弹「恢复上次会话」确认（列出文件与未保存标签）→ 确认恢复 / 全部丢弃
  - 已保存文件：重新 readFile 打开为标签（去重：同一路径只开一个）
  - 未保存标签：用快照内容回填为标签并置脏（沿用脏标记/草稿语义）
  - 双环境：Tauri（关闭钩子 + 文件存储）与浏览器（beforeunload + localStorage）
  - 与草稿机制共存：正常退出写快照；异常退出（崩溃）仍走草稿恢复；启动时快照优先、无快照再走草稿检查
- 建议完成：
  - 恢复后清空快照（防重复恢复）；丢弃时清空快照
  - 恢复失败的路径（文件已删除）跳过并提示
- 当前不做：
  - 恢复窗口在最小化/隐藏状态（仅启动时）
  - 恢复标签的编辑器滚动位置/光标

## 2. 人类意图

PO 原话（2026-08-25）：「能不能像 notepad++ 一样每次退出后再打开还能打开上次打开过的文件标签。这样更符合我使用的习惯。」

## 3. 输入 / 输出契约

- 输入：tabsStore（标签列表/打开链路）、draftService 目录能力（复用存储通道）、MainView 关闭事件（已有 close 钩子）
- 输出：
  - sessionService（新建）：写/读/清空会话快照（Tauri 文件 + 浏览器 localStorage）
  - MainView：退出钩子写快照；启动检查弹恢复确认；恢复执行（openPath / 回填置脏）
  - 恢复确认弹窗（复用 n-modal）
- 输出位置：`d:\lucia\workspace\aida-note\app\src\`（services/sessionService.ts 新建、views/MainView.vue、stores/tabsStore 微调）

## 4. 边界与约束

- 可以改：快照文件位置/字段、恢复确认文案与布局、未保存标签标题策略
- 不能改：
  - 已保存文件必须走现有 openPath 打开链路（去重/最近文件语义一致）
  - 未保存内容不得丢失（快照须含完整 content）
  - 异常退出（崩溃）的草稿恢复不得被本功能破坏
- 必须遵守：
  - 快照写入时机 = 正常退出（close/beforeunload），非每次标签变化实时写（避免频繁 IO）
  - 恢复为一次确认（不逐文件弹窗）
  - 自测用 Playwright 模拟退出/重启（page.close 不触发 beforeunload？→ 用显式 destroy/invoke 或页面内触发恢复逻辑；Tauri 真实退出列 PO 验证）

## 5. 验收标准（opt6-session-smoke）

- [ ] 打开 A（已保存 mock 文件）+ 新建 B（未保存脏内容）→ 退出（触发快照写）→ 重启 → 弹「恢复上次会话」列出 A、B（Playwright）
- [ ] 确认恢复：A 重新打开为标签（内容一致）、B 回填内容且脏标记（Playwright）
- [ ] 全部丢弃：快照清空，重启不弹框（Playwright）
- [ ] 恢复后再次退出：快照更新为当前会话（不残留旧恢复）(Playwright)
- [ ] 文件已删除：恢复时跳过该路径并提示，其余正常恢复（Playwright mock）
- [ ] 无快照时启动不弹恢复框（干净启动直接进空态）（Playwright）
- [ ] 崩溃草稿机制不被破坏：无快照但有草稿时仍走原恢复弹窗（Playwright）
- [ ] 无页面 JS 错误；既有 draft-smoke / recent-smoke 回归不破坏

## 6. 相关

- 前序：SIS-FUNC-10（草稿机制，异常退出恢复）、SIS-FUNC-11（最近文件列表）
- 依赖：tabsStore.openPath / createUntitled / markDirty、draftService 存储通道
