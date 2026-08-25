# 变更日志（Change Log）

> 用途：记录项目中所有正式变更的完整生命周期（发起->评估->批准->同步->关闭）。
> 规则依据：../product/rules/T3_变更管理规则_待确认.md
> 维护者：Aida v0.1.0

---

## 变更记录

### CHG-001 · 2026-08-22 · 打包元数据规范化 + 绿色版交付 + MSI/NSIS 列 PO 本地兜底（Sprint 5）

| 字段 | 内容 |
|------|------|
| 发起人 | PO（追加授权第 5 次短 Sprint：「使用手册 + 安装包」） |
| 风险等级 | 低（打包元数据调整 + 交付物产出，不改变功能与架构） |
| 评估结论 | productName/identifier/窗口尺寸/描述等为发布必需元数据，规范化无功能回归；安装包为交付必需产物 |
| 批准人 | PO（追加授权，低风险变更按 T3 5.1/6 + AS-8 短 Sprint 自主执行） |
| 同步动作 | tauri.conf.json（productName=aida-note、bundle.targets=all、short/longDescription）、Cargo.toml（name=aida-note）；Sprint_5_DoD对照表、memory/state.md、memory/manifest.md、memory/decisions.md（decision-026）、project/panel/workflow/data.json |
| 状态 | 已关闭（使用手册 5/5 ✅；绿色版 ZIP ✅；MSI+NSIS 正式安装包已产出：`app/src-tauri/target/release/bundle/nsis/aida-note_0.1.0_x64-setup.exe` + `msi/aida-note_0.1.0_x64_en-US.msi`） |

---

### CHG-002 · 2026-08-25 · Sprint 6 优化四任务（OPT-1 简报+锚点 / OPT-2 暗色修复+强调色 / OPT-3 自定义背景 / OPT-4 Shell 集成）

| 字段 | 内容 |
|------|------|
| 发起人 | PO（Sprint 6 启动收口已确认：「加载已有文档可调用 AI 生成文档简报及大纲锚点（默认关闭）」+「美化系统（暗色修复/强调色/背景图+透明度）」+「文件右键菜单打开」） |
| 风险等级 | 中（OPT-3 新增背景分层 CSS 触及全局布局；OPT-4 新增 Rust 依赖 winreg 与 HKCU 注册；其余为功能增强无架构变更） |
| 评估结论 | OPT-2 主题变量全局统一定义（根因=变量从未定义回退亮色）；OPT-3 背景分层（.bg-layer z-index 0 + chrome/编辑区分区参数 + 按图持久化）；OPT-1 简报浮层 + 本地大纲解析 + 锚点定位；OPT-4 HKCU 幂等注册 + argv 打开。均经自测验证 |
| 批准人 | PO（Sprint 6 Planning 确认 4 任务 + 各 SIS 确认） |
| 同步动作 | App.vue/MainView.vue/ToolBar.vue/settingsStore.ts/settingsService.ts/BriefModal.vue(新)/aiService.ts/aiStore.ts/EditorPane.vue/src-tauri(Cargo.toml+lib.rs)/package.json/scripts(opt3-bg-smoke+opt1-brief-smoke+run-all-smoke)；Sprint_6_DoD对照表、memory/state.md、memory/manifest.md、memory/decisions.md（decision-027）、project/panel/workflow/data.json |
| 状态 | 进行中（OPT-2/3/1 自测全绿 + cargo check 通过；OPT-4 真实右键/双击 + `npm run tauri build` 完整打包列 PO 本机验证） |

---

### CHG-003 · 2026-08-25 · Sprint 7 两任务（OPT-5 AI 简报悬窗+会话缓存 / OPT-6 上次文件标签恢复）

| 字段 | 内容 |
|------|------|
| 发起人 | PO（Sprint 6 交付后反馈：「简报弹窗无缓存每次重调 API，要右上角悬窗 + 缓存 + 刷新 + 后台生成 + 可隐藏/关闭/再打开」+「像 notepad++ 退出后重开恢复上次文件标签」） |
| 风险等级 | 中（OPT-5 简报从弹窗重构为悬窗并改造 aiStore 缓存模型；OPT-6 新增会话快照与启动恢复，触及关闭钩子与启动流程） |
| 评估结论 | OPT-5：aiStore 内存缓存 `briefCache`（key=文件路径，未保存用 tab.id，仅当次会话）+ `briefUi{visible,minimized}` + 刷新（abort 旧请求）+ 关闭不中断后台完成；悬窗组件 BriefPanel 替换 BriefModal。OPT-6：sessionService 快照（Tauri appDataDir/session + 浏览器 localStorage）+ 退出钩子写快照 + 启动快照优先弹「恢复上次会话」（已保存重开 + 未保存回填置脏）+ sessionStorage 标记区分首次加载与同页 reload（不干扰常规刷新与既有回归）。均经自测验证 |
| 批准人 | PO（Sprint 7 Planning 三轮确认：缓存仅当次会话 + 按文件各存一份 + 已保存文件与未保存草稿合并恢复；启动收口确认「确认，开始执行（推荐）」） |
| 同步动作 | aiStore.ts / BriefPanel.vue（新建，BriefModal.vue 删除）/ MainView.vue / sessionService.ts（新建）/ EditorPane 联动；scripts（opt5-brief-smoke + opt6-session-smoke 新建，opt1-brief-smoke 删除，run-all-smoke 扩至 16 项）；Sprint_7_DoD对照表、memory/state.md、memory/manifest.md、memory/decisions.md（decision-028）、project/panel/workflow/data.json |
| 状态 | 已关闭（OPT-5 opt5-brief-smoke 13/13 ✅；OPT-6 opt6-session-smoke 7/7 ✅；全量回归 16 脚本全绿；vue-tsc 0 错误；build 通过；OPT-6 已保存文件真实重开 + Tauri 真实退出快照列 PO 本机验证） |

---

### CHG-004 · 2026-08-25 · OPT-4-FIX 单实例合并窗口 + 简报悬窗位置修复（Sprint 7 收口后 PO 反馈）

| 字段 | 内容 |
|------|------|
| 发起人 | PO（「多次打开文件都是默认打开不同的窗口，不能合并在一个窗口里，很乱」+「悬窗位置错了，放到左下角还挤占编辑区，它就是个弱提醒」） |
| 风险等级 | 低（Rust 侧加 single-instance 插件 + 前端事件监听；CSS 定位修复） |
| 评估结论 | ① 单实例合并：`tauri-plugin-single-instance = "2"` 注册（`filter_file_args` 过滤 argv → `app.emit("aida-open-files")`），第二实例不再新开窗口，主实例前端 `listen("aida-open-files")` → `openPath` 打开为标签（同路径自动去重激活，复用 OPT-4 的 `get_launch_args` 链路语义）。② 简报悬窗位置：`.brief-panel`/`.brief-mini` 由 `absolute` 改 `fixed`（top:84px right:12px，宽 380→320px，max-height 70vh→60vh，z-index 20→100），锁定视口右上角、不占编辑区、弱提醒形态 |
| 批准人 | PO（反馈即批准；悬窗位置修复已确认，单实例合并窗口为「默认合并在一个窗口，拖标签出窗口才分窗」期望的收敛前提） |
| 同步动作 | Cargo.toml（+single-instance）/ lib.rs（插件注册 + `use tauri::Emitter`）/ MainView.vue（listen + unlisten）/ BriefPanel.vue（fixed 定位）；本 CHG-004、memory/state.md、memory/decisions.md（decision-029）、project/panel/workflow/data.json |
| 状态 | 已关闭（cargo check ✅ 32.90s；vue-tsc 0 错误；opt5-brief-smoke 13/13 ✅ 含「悬窗右上角」断言；真实多开合并行为列 PO 本机验证） |

---

*文件创建：（项目初始化） | Aida v0.1.0*
