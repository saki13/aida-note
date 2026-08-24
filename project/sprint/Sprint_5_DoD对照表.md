# Sprint 5 DoD 对照表（Review 输入）

> 用途：Sprint 5（交付收尾：使用手册 + 安装包）DoD 自动评估产出。
> 生成：2026-08-22，Aida v0.1.0 ｜ 依据：Sprint_5_启动收口.md

## 一、使用手册

| 检查项 | 预期（DoD） | 实际 | 结论 |
|--------|------|------|------|
| 1. 覆盖全部 19 项功能 | 基础编辑/Markdown/mermaid/格式化/对比/搜索/主题/最近文件/自动保存/AI 四能力 | `project/使用手册.md`：§4 基础（文件/编辑/搜索/格式化）、§5 Markdown+mermaid、§6 对比/主题/自动保存、§7 AI 四能力、§8 快捷键、§9 常见问题 | ✅ |
| 2. 含安装方式 | 安装包与源码两种方式 | §2 安装（MSI/NSIS + npm run tauri dev/build + 浏览器调试） | ✅ |
| 3. 含界面布局说明 | 布局速览 | §3 界面布局（工具栏/标签栏/编辑区/状态栏/AI 面板） | ✅ |
| 4. 含 AI 配置说明 | baseURL/key/model 配置步骤 | §7.1 配置 API（Modelscope 示例） | ✅ |
| 5. 含快捷键速查 | 常用快捷键表 | §8 快捷键速查 | ✅ |

## 二、安装包

| 检查项 | 预期（DoD） | 实际 | 结论 |
|--------|------|------|------|
| 1. 打包元数据规范化 | productName/窗口标题 = aida-note | tauri.conf.json（productName aida-note、窗口 1200×800 min 640×480、short/longDescription）+ Cargo.toml（name aida-note）；exe 版本信息实测 ProductName=aida-note / 0.1.0 | ✅ |
| 2. release 可执行文件 | target/release/aida-note.exe | 已产出（12.95MB，release 编译完成，内嵌最新前端） | ✅ |
| 3. 可执行文件可启动 | 启动不闪退 | 冒烟实测：exe 启动 15s 存活（WebView2 正常初始化） | ✅ |
| 4. 绿色版（便携）安装包 | 免安装可运行 | `app/dist-install/aida-note-portable.zip`（4.6MB，解压即用，自包含） | ✅ |
| 5. Windows 安装包（MSI + NSIS） | bundle targets=all | 沙箱对 bundler 工具下载阻断 → **PO 本地挂梯 + 代理（HTTPS_PROXY）`npm run tauri build` 成功产出**：`bundle/nsis/aida-note_0.1.0_x64-setup.exe` + `bundle/msi/aida-note_0.1.0_x64_en-US.msi` | ✅ |
| 6. 安装包内置最新前端 | dist 为当前代码构建 | dist 已用 `npx vite build` 刷新（index.html 2026-08-22 19:43） | ✅ |

## 三、总体

- 使用手册：5/5 ✅；安装包：元数据 ✅ + exe ✅ + 启动验证 ✅ + 绿色版 ZIP ✅ + **MSI+NSIS ✅（PO 本地挂梯产出）** + dist 最新 ✅ = **6/6 全过**。
- 沙箱限制记录（Sprint 5 新增实证）：tauri bundler 工具（WiX/NSIS）下载连接停滞（github.com HEAD 200 可达、下载停滞、ghproxy 403）；对策 = 绿色版 ZIP 立即交付 + PO 本地挂梯设 HTTPS_PROXY 重跑 `npm run tauri build`（工具已缓存 `%LOCALAPPDATA%\tauri\`，后续打包不再下载）。
