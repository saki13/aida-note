# Sprint 8 启动收口（Planning 输出）

> 依据 AidaPulse 短 Sprint 模式：Planning → SIS 确认 → Sprint In Progress → DoD 验收 → 收口四边同步。
> 触发：PO 反馈「再添加一个 ai 翻译功能，双屏对比 + 鼠标移动同时高亮两边文字」+「背景图上传报错 ACL」+「AI 工具整合成下拉，不要再堆按钮」。

---

## 1. 目标

- **OPT-8a 背景图 ACL 修复**：Tauri 环境选择图片报 `Command plugin:fs/read_file not allowed by ACL`，capabilities 缺二进制读权限。
- **OPT-8b AI 工具整合下拉**：ToolBar 现有「AI 润色」「AI 面板」「AI 简报」三个并列按钮整合为单一「AI 工具」下拉。
- **OPT-8c AI 翻译双屏对比**：新增翻译功能——固定译成简体中文；按**语义断句**对齐（非按行，保留换行上下文）；双屏（左原文/右译文）+ 鼠标移动同时高亮两侧对应句子。

## 2. 人类意图

PO 原话：「再添加一个 ai 翻译功能，弄成双屏对比的效果，鼠标移动同时高亮两边的文字」「把几个 ai 工具整合下做个下拉功能选择，不要再堆按钮了」「固定译成中文」「按语义断句对应，按行对齐的话换行上下文丢了怎么翻译准确呢？」

## 3. 输入 / 输出契约

| 项 | 契约 |
|----|------|
| 输入 | 当前标签文件全文（字符上限保护，超限提示）；AI 配置（baseURL/key/model，复用 aiStore） |
| 断句 | `splitSentences(text)`：按段落（空行）优先，段内按 `。！？…；\n` 断句；记录每句在原文中的行号范围 |
| 翻译请求 | 传**完整原文**（保留换行）给 LLM，系统提示逐句译成简体中文、保持顺序、返回 JSON `{"pairs":[{"src":"原句","tgt":"译文句"}]}` |
| 对齐 | 以 LLM 返回 pairs 为准（LLM 内部语义对齐）；数量不一致时按索引对齐，缺失补「（未对齐）」占位 |
| 输出 | 双屏视图：左栏原句列表、右栏译文列表；hover 任一栏句子高亮对侧同索引句子；滚动联动；可关闭返回编辑 |
| 入口 | AI 工具下拉 →「AI 翻译」（未配置 API 提示去配置；无活动标签禁用） |

## 4. 边界约束

- 翻译不写回文件，关闭视图即丢弃（对比视图语义）。
- 大文件保护：原文 > 20000 字符提示截断/拒绝。
- 下拉整合只收敛 **AI 相关**按钮（AI 润色/面板/简报/翻译），不动非 AI 按钮（格式化/对比/背景等）。
- 语义断句不追求 NLP 级精确：宽松规则 + 每句长度下限，避免小数点/缩写误切。

## 5. 验收标准清单（DoD）

1. ToolBar AI 按钮整合为单一「AI 工具」下拉（含 AI 问答面板 / AI 润色子菜单 / AI 简报 / AI 翻译），工具栏不再并列堆 AI 按钮。
2. 未配置 API 时点击翻译 → 提示先配置；已配置 → 打开双屏翻译视图。
3. 翻译视图左=原文、右=简体中文译文，双屏并排。
4. 长段落/多句行被正确断句，句间有对应关系（语义断句，非机械按行）。
5. 鼠标悬停左侧句子 → 右侧对应句子同步高亮；悬停右侧 → 左侧同步高亮（双向联动）。
6. 一侧滚动，另一侧 scrollTop 联动。
7. 关闭翻译视图返回编辑，原文不丢失、不产生脏标记。
8. 切换文件/重新翻译状态隔离（loading/done/error 各自独立）。
9. 背景图上传：Tauri 环境选图不再 ACL 报错，可正常设背景并持久化（OPT-8a）。
10. vue-tsc 0 错误；新增 smoke 全绿；`npm run build` 通过。

## 6. 任务拆解

| # | 任务 | 产出 |
|---|------|------|
| 1 | OPT-8a：capabilities 补 `fs:allow-read-file`/`fs:allow-mkdir` | capabilities/default.json |
| 2 | OPT-8b：ToolBar AI 按钮 → 单一 AI 工具下拉（N-Dropdown 分组） | ToolBar.vue |
| 3 | OPT-8c：`splitSentences` 断句工具 + aiStore 增加 translate 状态/action | sentenceService.ts / aiStore.ts |
| 4 | OPT-8c：TranslateView 双屏组件（hover 双向高亮 + 滚动联动 + 关闭） | TranslateView.vue |
| 5 | OPT-8c：MainView 接线（翻译视图挂载/关闭/API 注入）+ ToolBar 下拉触发 | MainView.vue |
| 6 | 自测：opt8-translate-smoke.mjs（含 hover 高亮断言）+ 全量回归 | scripts/ |
| 7 | 收口四边同步 + commit + push | 文档资产 |

## 7. 风险与对策

| 风险 | 对策 |
|------|------|
| LLM 返回非 JSON / pairs 结构不对 | 解析容错：失败置 error 状态可重试；结构校验通过才渲染 |
| LLM 返回句数 ≠ 原句数 | 按索引尽力对齐，缺失补占位；不做强制重排 |
| 断句误切（小数点/缩写/编号） | 宽松规则 + 单句长度下限（≥2 字符）+ 段落优先 |
| 大文件翻译慢/超时 | 20000 字符上限保护；流式展示 loading；AbortController 可取消 |
| dev 模式 capabilities 变更需重建才生效 | 自测用浏览器路径（断句/视图纯前端逻辑）+ 真实 ACL 验证列 PO 本机 |

## 8. 待确认（NotifyUser）

- SIS-OPT-8（AI 翻译双屏对比与 AI 工具整合）确认后开始执行。
