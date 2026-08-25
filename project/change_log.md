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

*文件创建：（项目初始化） | Aida v0.1.0*
