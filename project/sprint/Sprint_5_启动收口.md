# Sprint 5 启动收口（交付收尾 Sprint）

> 用途：Sprint 5（PO 追加授权的第 5 次短 Sprint，交付收尾型）的启动收口。
> 生成：2026-08-22，Aida v0.1.0 ｜ 模式：AS-8 短 Sprint 自主执行（PO 追加授权，非原 4 次配额）

## 1. 背景与授权

- 项目已于 2026-08-22 交付（Backlog 19/19 燃尽，PO 确认交付，commit 5dbdc8c）。
- PO 追加需求（2026-08-22）：「aida 你还得给我一个使用手册，还需要安装包。加一个短 sprint」→ 追加授权第 5 次短 Sprint，成员两项：**使用手册 + 安装包**。

## 2. Sprint 成员与 DoD

| # | 任务 | DoD（验收标准） |
|---|------|----------------|
| 1 | 使用手册 | 覆盖全部 19 项功能的使用说明（基础编辑/Markdown/mermaid/格式化/对比/搜索/主题/最近文件/自动保存/AI 四能力）；含安装、界面、快捷键、常见问题；文档落盘 `project/使用手册.md` |
| 2 | 安装包 | `npm run tauri build` 产出 Windows 安装包（MSI + NSIS exe，bundle targets=all）；产物可安装启动（PO 本地验证）；打包元数据规范化（productName= aida-note / 窗口标题 / 描述） |

## 3. 执行顺序

使用手册（无依赖）→ 安装包（依赖 cargo release 编译 + bundler）。

## 4. 风险与对策

| 风险 | 对策 |
|------|------|
| 沙箱击杀长命令（release 编译 > 数分钟） | 后台 cargo build --release 持续存活机制（已实证：进程存活且 deps 累积推进）；分片重跑利用 cargo 增量缓存；产物以 target/release 与 bundle 输出为准 |
| bundler 首次需下载 WiX/NSIS | 若沙箱网络/时间受限，安装包列 PO 本地 `npm run tauri build` 产出（产物目录已就绪） |

## 5. 交付物位置

- 使用手册：`project/使用手册.md`
- 安装包：`app/src-tauri/target/release/bundle/`（MSI + NSIS）
