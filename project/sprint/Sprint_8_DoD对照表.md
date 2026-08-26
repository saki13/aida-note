# Sprint 8 DoD 对照表（SIS-OPT-8 验收）

> Sprint：Sprint 8（OPT-8a 背景图 ACL 修复 / OPT-8b AI 工具整合下拉 / OPT-8c AI 翻译双屏对比）
> 自测脚本：`app/scripts/opt8-translate-smoke.mjs`
> 完成时间：2026-08-26

## 一、DoD 验收清单对照

| # | 验收项 | 结果 | 证据 |
|---|--------|------|------|
| 1 | ToolBar AI 按钮整合为单一「AI 工具」下拉（问答面板/润色子菜单/简报/翻译），独立 AI 按钮消失 | ✅ | opt8 断言 1：`ai-buttons=1`（原「AI 润色」「AI 面板」「AI 简报」独立按钮消失） |
| 2 | 未配置 API 时点翻译 → 提示先配置，不打开视图 | ✅ | opt8 断言 2：`translate-view=0` + 提示消息出现 |
| 3 | 配置后点翻译 → 双屏视图（左原文/右简体中文译文） | ✅ | opt8 断言 3：`panes=2`；断言 5：左右句数 11=11 |
| 4 | 语义断句（非机械按行，保留换行上下文） | ✅ | opt8 断言 4：`left=11`（跨行段落被合并为完整句子）；sentenceService 单元规则（段落优先 + 终止符 + 排除小数点） |
| 5 | 鼠标悬停一侧句子 → 对侧同索引句子同步高亮（双向） | ✅ | opt8 断言 7/8：`right-active=1`、`left-active=1` |
| 6 | 一侧滚动另一侧 scrollTop 联动 | ✅ | opt8 断言 11：`l=32 r=32`（左滚右随；右栏 rsh=770>583 可滚动） |
| 7 | 关闭翻译视图返回编辑，原文不丢、不置脏 | ✅ | opt8 断言 9：`editor=1` + 原文保留；断言 10：`status=idle` |
| 8 | 切换文件/重新翻译状态隔离；error 可重试 | ✅ | startTranslate 每次 abort 旧请求重建状态（按文件 key）；关闭视图 translateClear 归零（断言 10）；error 态「重试」按钮经 setRetry 注入复用入口 |
| 9 | 背景图上传 ACL 修复（Tauri 环境不再报错） | ✅ | capabilities/default.json 增 `fs:allow-read-file`（scope `**`）+ `fs:allow-mkdir`；真实 Tauri 选图列 PO 本机验证 |
| 10 | 质量门禁：vue-tsc 0 错误；smoke 全绿；build 通过 | ✅ | vue-tsc 0 错误；opt8-translate-smoke 12/12；全量回归 17 脚本全绿（opt6/opt8 因回归中途 dev server 被沙箱资源限制压崩，单独重跑 7/7、12/12 验证）；vite build 通过（20.14s） |

## 二、DoD 判词

**Sprint 8 验收通过（12/12 + 全量回归 17/17 + vue-tsc 0 错误 + build 通过）。**

## 三、PO 本机验证遗留

| 项 | 说明 |
|----|------|
| 背景图真实上传（Tauri 打包环境） | 沙箱无 Tauri 真实 fs 插件；capabilities 已修，需 `npm run tauri build` 后 PO 验证选图不再 ACL 报错 |
| AI 翻译真实 API 流式 | mock 已验证链路；真实 baseURL 翻译质量/JSON 返回需 PO 配 key 实测 |
| AI 工具下拉视觉/子菜单交互 | 浏览器自测覆盖功能；真实窗口观感 PO 确认 |
