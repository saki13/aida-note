# Sprint 3 DoD 对照表（Review 输入）

> 用途：Sprint Completed 阶段的 DoD 自动评估产出，作为 Sprint 3 Review 的对照依据。
> 生成：2026-08-22，Aida v0.1.0
> 依据：project/sprint/Sprint_3_启动收口.md（DoD 定义 = 各 SIS 验收标准）+ 实际交付物核对
> 评估规则：SKILL 第 15 节（DoD 自动评估规则）

## 一、FUNC-3：Markdown 同屏所见即所得

| 检查项 | 预期（DoD） | 实际 | 结论 |
|--------|------|------|------|
| 1. 12 类元素渲染 | SIS-FUNC-3 验收列表 | 标题/列表/引用/代码/链接/图片/表格/删除线/任务列表/脚注/内联代码/分隔线 全渲染 | ✅ |
| 2. 块级双态 | 光标块源码态/其余块渲染态 | StateField + EditorView.decorations.from（decision-016）；widget 点击进源码态 | ✅ |
| 3. GFM 显式配置 | 删除线/表格可用 | markdown({extensions: GFM})（decision-016） | ✅ |
| 4. 行级装饰零长度 | 渲染不破坏编辑 | 行级 range 零长度（decision-016） | ✅ |
| 5. 故障回退 | 树滞后/解析失败不崩 | 树滞后防御 + 回退渲染 | ✅ |
| 6. 主题联动/性能 | 明暗适配/不卡顿 | wysiwyg 样式深浅双适配；28/28 自测全绿 | ✅ |

## 二、FUNC-4：mermaid 编写 + 原位实时渲染

| 检查项 | 预期（DoD） | 实际 | 结论 |
|--------|------|------|------|
| 1. 围栏块升级 widget | 代码块 → 图表 | mermaidWysiwyg（复用 FUNC-3 StateField 通道） | ✅ |
| 2. 防抖出图 + 光标进源码 | UI-2 §2.1 | 300ms 防抖 + 点击图表进源码 | ✅ |
| 3. 错误回退 + AI 修复占位 | 语法错误不白屏 | 错误占位 + AI 修复入口（UI 占位） | ✅ |
| 4. 缩放/导出 SVG/PNG | 验收要求 | 图表工具栏实现 | ✅ |
| 5. 主题联动 | 明暗切换重渲染 | matchMedia 变更重渲染 | ✅ |
| 6. 并发安全 | 多块不挂起 | 串行队列 + 10s 超时（decision-017）；13/13 自测全绿 | ✅ |

## 三、FUNC-5：代码格式化

| 检查项 | 预期（DoD） | 实际 | 结论 |
|--------|------|------|------|
| 1. 四语言格式化 | html/js/json/markdown | prettier standalone + 按语言动态插件（babel+estree/html/markdown） | ✅ |
| 2. 入口（按钮 + 快捷键） | 工具栏 + Ctrl+Shift+F | Prec.highest domEventHandlers 显式匹配 f/F（decision-018） | ✅ |
| 3. 原地替换进撤销栈 | 可 Ctrl+Z | CM6 transaction + history | ✅ |
| 4. 语法错误保持原文 | 失败不破坏内容 | 错误 toast 提示 + 原文不动 | ✅ |
| 5. SQL 置灰 | 不支持语言禁用 | isFormatSupported 拦截 + 提示 | ✅ |
| 6. 11/11 自测全绿 | format-smoke | commit 55e4da4 | ✅ |

## 四、FUNC-7：搜索 / 替换

| 检查项 | 预期（DoD） | 实际 | 结论 |
|--------|------|------|------|
| 1. 顶部浮动搜索面板 | VS Code 风格 | search({top:true}) 预注册 + absolute 浮动样式（decision-019） | ✅ |
| 2. 三选项（大小写/整词/正则） | 面板内开关 | CM6 search 内置 | ✅ |
| 3. 高亮 + 可见计数 | 匹配高亮 + N 个匹配 | 自研 SearchCount ViewPlugin（SearchQuery.getCursor 计数，decision-019） | ✅ |
| 4. 上下跳转 | 逐条移动 | 内置 + 计数联动 | ✅ |
| 5. 单次/全部替换可撤销 | 替换后 Ctrl+Z | 替换前聚焦编辑器（decision-019） | ✅ |
| 6. 空态/非法正则提示 | 无结果/正则无效 | SearchCount 三态文案 | ✅ |
| 7. 16/16 自测全绿 | search-smoke | commit a72d3db | ✅ |

## 五、FUNC-8：软换行展示

| 检查项 | 预期（DoD） | 实际 | 结论 |
|--------|------|------|------|
| 1. 默认开启/工具栏开关 | 全局切换即时生效 | wrapCompartment + lineWrapping 动态 reconfigure（decision-020） | ✅ |
| 2. 不写入换行符 | 折行不进文档 | lineWrapping 仅显示（contentAttributes） | ✅ |
| 3. 持久化（重启记住） | settings 存 wordWrap | settingsService/settingsStore（ARCH-2 §4.2 schema；Tauri store + 浏览器 localStorage） | ✅ |
| 4. switchToTab 校正 | 恢复旧 state 后 wrap 不失效 | applyWrap 重推（防 wrap 配置过期） | ✅ |
| 5. 10/10 自测全绿 | wrap-smoke | commit 652d2e6 | ✅ |

## 六、FUNC-6：文件对比

| 检查项 | 预期（DoD） | 实际 | 结论 |
|--------|------|------|------|
| 1. 对比源弹窗 | 两文件 / 当前 vs 剪贴板 | MainView n-modal 双按钮（NModal/NButton 按需导入） | ✅ |
| 2. 双栏并排 | 行级 + 行内字符级高亮 | diffService（jsdiff 行级+字符级）+ CompareView 双栏 | ✅ |
| 3. 滚动联动 | 一侧滚动另一侧同步 | scrollTop 双向同步 | ✅ |
| 4. 差异跳转 + 计数 | 上一处/下一处 + N/M | jumpTo + .diff-count | ✅ |
| 5. 接受左/右合并 | 块级合并写回置脏 | applyBlock 行号区间替换 + emit 写回 tabsStore | ✅ |
| 6. 剪贴板只读 | 只读侧禁用写回 | rightWritable=false 禁用 | ✅ |
| 7. CRLF 归一 | 剪贴板 LF 转 CRLF 不整篇差异 | computeDiff 入口归一（decision-021） | ✅ |
| 8. 12/12 自测全绿 | compare-smoke | commit d57ddc9 | ✅ |

## 七、汇总结论

- 总任务数：6 项（FUNC-3 / FUNC-4 / FUNC-5 / FUNC-7 / FUNC-8 / FUNC-6）
- 通过：6 项（子检查项 90/90 全过：28+13+11+16+10+12）
- 未通过：0 项
- DoD 总体评估：Sprint 3 六项任务全部按 SIS 验收标准交付。全部为代码型任务，统一经 Playwright 自测（wysiwyg/mermaid/format/search/wrap/compare 六个 smoke 脚本）全绿 + vue-tsc/vite build 通过；FUNC-6 合并写回链路依赖 tabsStore 事实源一致性（switchToTab 以 content 为准，decision-021）。无「声称完成但未产出」项。
- 验证分层：全部前端功能浏览器自测（90 项断言）+ build 双通过；Tauri 专用能力（两文件对比 dialog）浏览器不可测，SIS 允许 Tauri 手动验证（留 PO 验证项，不阻断）。

**观察项（不阻断）**：
1. 两文件对比入口依赖 Tauri dialog，Playwright 浏览器环境不可测——实现已就位（pickFiles→openTab→比对），待 PO 在 Tauri 窗口手动验证一次。
2. 自测资产 skill 化立项评估：Sprint 3 六任务产出 6 个 smoke 脚本（wysiwyg/mermaid/format/search/wrap/compare），模式高度一致（Playwright+落盘报告+文本定位断言），已具备模板化条件，Sprint 4 前立项评估（呼应 PO「手动做一个测试 skill」建议）。
3. 窗口关闭三选边界复验（Sprint 2 观察项延续）：Sprint 3 未再触发，继续留观。
4. 打开文件闪退（Sprint 2 观察项延续）：未复现，继续留观。

**下一步**：发起 Sprint 3 Review，按 AS-8 授权模式由 Aida 主持（第 3 次/共 4 次），结论异步广播 PO（data.json events[]）。

---
*生成：Aida v0.1.0 | 2026-08-22 | 供 Review 对照使用*
