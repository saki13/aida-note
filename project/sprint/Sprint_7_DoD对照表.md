# Sprint 7 DoD 对照表（Review 输入）

> 用途：Sprint 7（两任务：OPT-5 AI 简报悬窗 + 会话缓存 / OPT-6 上次文件标签恢复）DoD 自动评估产出。
> 生成：2026-08-25，Aida v0.1.0 ｜ 依据：Sprint_7_启动收口.md（PO 已确认「确认，开始执行（推荐）」）

## 一、OPT-5 AI 简报悬窗 + 会话缓存

| 检查项 | 预期（SIS-OPT-5 验收） | 实际（opt5-brief-smoke 13/13） | 结论 |
|--------|------|------|------|
| 1. 悬窗形态 | 右上角浮动面板（非随时关闭的弹窗），含刷新/收起/关闭按钮与当前文件名 | BriefPanel.vue 新建：`.brief-panel` 绝对定位右上角（top:84px right:12px width:380px）；PASS 悬窗展示在右上角 + 生成简报内容可见；PASS 非 .n-modal 弹窗（modal=0） | ✅ |
| 2. 收起/展开 | 收起为小图标（带状态点），点击重新展开内容不丢 | `.brief-mini` 小胶囊（done 绿/loading 蓝转圈/error 红/none 灰）；PASS 收起为图标再展开内容保留且不重复调 API（calls=1） | ✅ |
| 3. 关闭后重开 | 关闭后工具栏「AI 简报」入口可再打开，展示已有简报 | PASS 关闭后重开悬窗直接展示缓存不重复调 API（calls=1） | ✅ |
| 4. 按文件缓存 | 同一文件只生成一次（key=文件路径；未保存用 tab.id），重开不二次调 API | aiStore `briefCache: Record<key, BriefRecord>` + `briefKeyOf(path, tabId)`；PASS 关闭重开 calls=1 | ✅ |
| 5. 刷新按钮 | 点击重新生成（abort 旧请求）且内容更新 | `refreshBrief` 先 `briefController?.abort()` 再 startGenerate；PASS 刷新 API 计数 +1、内容更新（calls=2） | ✅ |
| 6. 生成中关闭 | 不中断生成，后台完成写缓存；再打开显示缓存（未完成显示 loading） | `closeBrief` 仅置 UI 不 abort；PASS 生成中关闭后台完成，重开显示缓存（calls=3） | ✅ |
| 7. 切换文件 | 显示当前文件简报；无缓存空态 + 生成按钮；按文件独立缓存 | watch activeTab → updateActiveKey；PASS 切换显示空态+生成按钮；PASS B 生成独立缓存（calls=4）；PASS 切回 A 直接展示 A 缓存不重复生成（calls=4 tabs=2） | ✅ |
| 8. 默认关闭 | 未配置 API：入口提示、不生成、无悬窗 | PASS 未配置点击提示「请先配置」且悬窗不打开（visible=false） | ✅ |
| 9. 锚点定位保留 | 大纲锚点点击真实滚动 + 光标定位 | PASS 大纲锚点点击编辑器滚动定位（状态栏「行 5」）；悬窗保持打开 | ✅ |
| 10. 不回归 | 无页面 JS 错误；既有 ai-smoke 等回归不破坏 | PASS 无页面 JS 错误；全量回归 16 脚本全绿（含 ai-smoke 9/9、ai-mermaid 4/4） | ✅ |

## 二、OPT-6 上次文件标签恢复（会话恢复）

| 检查项 | 预期（SIS-OPT-6 验收） | 实际（opt6-session-smoke 7/7） | 结论 |
|--------|------|------|------|
| 1. 干净启动不弹 | 无快照时启动不弹恢复框 | sessionService 快照（Tauri appDataDir/session/session.json + 浏览器 localStorage）；PASS 干净启动（无快照）不弹恢复框（modals=0） | ✅ |
| 2. 退出写快照 + 启动弹确认 | 正常退出写快照（已保存路径 + 未保存 {id,title,content}）；重启弹「恢复上次会话」优先于草稿框 | `buildSessionSnapshot`（已保存 {path} / 未保存 {id,title,content}）+ beforeunload/onCloseRequested 写快照；`setupSessionRecovery` 用 sessionStorage 标记 `aida-session-handled` 区分首次加载与同页 reload；PASS 重启弹恢复框列出未保存标签且草稿框不弹（items=1 draftModal=false） | ✅ |
| 3. 确认恢复 | 已保存重新打开（去重）；未保存回填置脏；恢复后清快照 | `onRestoreSession`：已保存走 `tabsStore.openPath`（失败跳过提示）；未保存 `createUntitled` + `updateContent` 回填置脏；恢复后 `clearSession`；PASS 回填置脏 + 快照清空（snap=false） | ✅ |
| 4. 全部丢弃 | 丢弃时清空快照，重启不弹 | PASS 全部丢弃后快照清空（snap=false）；PASS 清快照后启动不再弹（modals=0） | ✅ |
| 5. 已删除文件 | 恢复时跳过该路径并提示，其余正常恢复 | PASS 已保存路径不存在：跳过并提示「文件不存在」、未保存仍恢复（items=2 warn=true tabs=1） | ✅ |
| 6. 草稿机制不破坏 | 无快照但有草稿仍走原草稿恢复 | sessionStorage 标记机制保证 reload 场景跳过快照检查走草稿恢复；draft-smoke 9/9 全绿（含过期残留清理/恢复/丢弃）；全量回归 draft-smoke ✅ | ✅ |
| 7. 不回归 | 无页面 JS 错误；既有 draft-smoke / recent-smoke 不破坏 | PASS 无页面 JS 错误；全量回归 16 脚本全绿（draft-smoke 9/9、recent-smoke 9/9） | ✅ |

## 三、总体

- OPT-5：10/10 ✅（opt5-brief-smoke 13/13 子项）；OPT-6：7/7 ✅（opt6-session-smoke 7/7 子项，覆盖 SIS-OPT-6 全部 8 项验收语义）。
- 全量回归：16 脚本全绿（原 13 + opt3-bg-smoke 14/14 + opt5-brief-smoke 13/13 + opt6-session-smoke 7/7）；vue-tsc 0 错误；`npm run build` 通过（4218 modules，built in 49.90s）。
- 沙箱限制记录（Sprint 7）：简报缓存仅当次会话（重启清空）为 PO 明确选择，非限制；OPT-6 已保存文件真实重开（Tauri 环境）与真实窗口退出快照写入列 PO 本机验证项（沙箱用 page.close/newPage 模拟重启，beforeunload 语义经 localStorage 通道验证）。
