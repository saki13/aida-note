---
sis_id: SIS-OPT-4
related_backlog_id: OPT-4
priority: P1
stage: active
status: pending（待 PO 确认）
linked_skills: []
---

# SIS：Windows Shell 集成（右键打开 + 文件关联）

## 1. 任务目标

实现 Windows 资源管理器集成：**① 任意文件右键菜单 →「用 aida-note 打开」直接打开**；**② 文本类扩展名（md/txt/log/json/yaml/yml/ini/toml/csv）关联默认程序，双击直接用 aida-note 打开**。注册写入 HKCU（当前用户，无需管理员权限），应用启动时自动注册（幂等）；应用启动带文件参数时自动打开为标签。

- 必须完成：
  - 右键菜单：注册 `HKCU\Software\Classes\*\shell\aida-note`，菜单项「用 aida-note 打开」，command 指向 `"<exe 绝对路径>" "%1"`（Tauri 环境生效；浏览器 dev 环境不注册）
  - 文件关联：为文本扩展名注册 ProgID（如 `aida-note.md`），`shell\open\command` 指向 exe + `"%1"`；双击关联文件用 aida-note 打开
  - 打开链路：应用启动时检测命令行文件参数 → 逐个打开为标签（多文件多标签）；复用现有 openTab 通道
  - 注册时机：应用启动自动注册（幂等，重复启动不产生重复项）
- 建议完成：
  - 已运行时二次打开文件复用现有实例（单实例或 argv 事件通道；若成本高列 PO 验证/后续）
  - 卸载清理：文件关联由安装包卸载清理；右键菜单项若为自注册 HKCU 项，说明清理方式（可提供「移除集成」入口或文档说明）
- 当前不做：
  - 不做「新建笔记本」右键入口（PO 未选）
  - 不做文件图标定制（保持默认图标）

## 2. 人类意图

PO 原始表达（2026-08-22，Planning 对齐新增）：「增加一个通过鼠标右键菜单打开笔记本的功能」→ 确认范围 = 文件右键「用 aida-note 打开」+ 文本文件关联（双击打开）。

## 3. 输入 / 输出契约

- 输入：Tauri 2 能力（argv / opener 插件 / invoke）、现有 tabsStore.openTab / openPath 通道、Windows HKCU 注册表
- 输出：
  - Rust 侧注册逻辑（winreg 写 HKCU，幂等）+ 启动 argv 文件参数解析
  - 前端打开通道接线（argv 路径 → openTab）
  - 注册表项：右键菜单 `*\shell\aida-note` + 各扩展名 ProgID
- 输出位置：`d:\lucia\workspace\aida-note\app\src-tauri\`（src/lib.rs、Cargo.toml 增 winreg）、`app\src\`（启动接线）

## 4. 边界与约束

- 可以改：菜单文案、关联扩展名清单、注册方式（winreg 直写 vs 安装包 NSIS 脚本）
- 不能改：
  - HKCU 用户级注册（不做 HKLM 系统级，避免管理员权限）
  - 浏览器 dev 环境不注册（不污染开发环境）
- 必须遵守：
  - 注册幂等、可重复启动
  - 打开文件必须走现有 tabsStore 打开链路（去重/置脏/最近文件等语义一致）
  - 右键/双击真实效果由 PO 本机验证（沙箱无法模拟 Shell 交互）

## 5. 验收标准

- [ ] Tauri 启动后 HKCU 注册表存在右键菜单项与文件关联 ProgID（Rust 自测/注册表断言）
- [ ] 应用启动带多个文件路径参数时，自动打开为多个标签（Tauri 自测或 PO 验证）
- [ ] 资源管理器右键任意文件 → 出现「用 aida-note 打开」→ 点击后 aida-note 打开该文件（PO 本机验证）
- [ ] 双击 .md/.txt 等关联扩展名文件 → aida-note 打开（PO 本机验证）
- [ ] 重复启动注册幂等（无重复注册项）
- [ ] 浏览器 dev 环境不注册、功能不受影响
- [ ] `npm run build` 通过，既有功能不回归
