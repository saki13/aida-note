---
sis_id: SIS-FUNC-11
related_backlog_id: FUNC-11
priority: P1
stage: active
status: confirmed
linked_skills: []
---

# SIS：打开最近文件列表

## 1. 任务目标

实现 aida-note 的最近文件列表：记录最近打开/保存的文件，通过文件菜单「最近文件」子菜单与启动空态列表提供快速打开入口，最多记录 20 个，持久化到 settings.json；文件失效时提示并可移除。

- 必须完成：
  - 记录来源：文件打开 / 保存成功后写入最近列表
  - 入口：文件菜单「最近文件」子菜单 + 启动无标签时的空态列表
  - 数量上限：最多 20 个（去重，同一文件只记一次，最近访问置顶）
  - 持久化：存入 settings.json（recentFiles 字段）
  - 失效处理：点击失效文件提示「文件不存在」并可移除
- 建议完成：
  - 列表项显示文件名 + 路径（路径过长截断展示）
- 当前不做：
  - 不做最近文件夹 / 工作区列表
  - 不做清空历史按钮以外的复杂管理（如固定置顶）

## 2. 人类意图

PO 原始表达（2026-08-20 逐项问答确认，FUNC-11）：

- 菜单 + 空态：文件菜单「最近文件」子菜单 + 启动无标签空态列表
- 20 个：最多记录 20 个（去重置顶）
- settings.json：持久化到 settings.json（recentFiles 字段）
- 提示 + 可移除：点击失效文件提示「文件不存在」并可从列表移除

## 3. 输入 / 输出契约

- 输入：
  - FUNC-1（文件打开 / 保存事件）
  - ARCH-2（settings.json 读写、settingsStore）
- 输出：
  - 最近文件列表实现（settingsStore.recentFiles + 菜单子项 + 空态列表）
  - 失效文件提示与移除逻辑
  - settings.json 字段（`recentFiles: string[]`）与 TS schema 更新
- 输出位置：`d:\lucia\workspace\aida-note\app\`（src/stores/settingsStore、src/components、src/services/settingsService）

## 4. 边界与约束

- 可以改：空态列表样式、菜单子项交互、失效提示文案
- 不能改：
  - 数量上限 20 个（去重置顶）
  - 持久化到 settings.json
  - 失效文件提示 + 可移除
- 必须遵守：
  - 打开/保存成功后写入列表，去重且最近访问置顶
  - settings 字段纳入 ARCH-2 的 TS schema
  - 不做最近文件夹/工作区列表

## 5. 验收标准

- [ ] 打开或保存文件后，文件进入最近列表
- [ ] 同一文件不重复记录，最近访问置顶
- [ ] 列表最多保留 20 个（超出后移除最旧项）
- [ ] 文件菜单「最近文件」子菜单可点击打开对应文件
- [ ] 启动且无标签时，空态展示最近文件列表
- [ ] 点击失效文件提示「文件不存在」，并可移除该项
- [ ] 最近列表持久化到 settings.json，重启后仍在
- [ ] `npm run dev` 可手动验证，`npm run build` 通过
