# Sprint 6 DoD 对照表（Review 输入）

> 用途：Sprint 6（优化四任务：OPT-1 简报+锚点 / OPT-2 暗色修复+强调色 / OPT-3 自定义背景 / OPT-4 Shell 集成）DoD 自动评估产出。
> 生成：2026-08-25，Aida v0.1.0 ｜ 依据：Sprint_6_启动收口.md

## 一、OPT-2 暗色模式 UI 修复 + 强调色生效

| 检查项 | 预期（SIS-OPT-2 验收） | 实际 | 结论 |
|--------|------|------|------|
| 1. 暗色工具栏不再白底白字 | 暗色下工具栏/标签栏/状态栏背景深色、文字浅色 | App.vue 按 `[data-theme]` 统一定义 `--toolbar-bg/--border-color/--editor-bg/--text-color` 等变量，组件全部改用变量；theme-smoke「暗色工具栏背景非白」（bg=rgb(31,31,31)）+「暗色文字可读」（rgba(255,255,255,.82)） | ✅ |
| 2. 强调色（蓝/绿/紫）选择生效 | 切换强调色后按钮/激活态/焦点色变化 | `[data-accent]` 定义 `--accent/--primary-color`；Naive UI themeOverrides 三套 primary 显式覆盖；theme-smoke「强调色 CSS 变量生效」（accentVar=#7c4dff） | ✅ |
| 3. 既有功能不回归 | 全量回归全绿 | 全量回归 15 脚本：OPT-2 相关 theme-smoke 11/11 + 其余 12 脚本全绿 | ✅ |
| 4. build 通过 | npm run build 无错误 | vue-tsc 0 错误 + build 通过（收口统一验证） | ✅ |

## 二、OPT-3 自定义背景图片 + 透明度/对比度/色温

| 检查项 | 预期（SIS-OPT-3 验收） | 实际（opt3-bg-smoke 14/14） | 结论 |
|--------|------|------|------|
| 1. 默认无背景 | 启动无背景、背景层无图 | PASS 默认无背景（bg=none） | ✅ |
| 2. 选图生效 | 上传图片后 has-bg + 背景层含图 | PASS 选图后背景生效 | ✅ |
| 3. 双模式 | 全应用 / 仅编辑区外（文字范围纯色） | PASS 默认全应用；PASS 切仅编辑区外编辑层隐藏、chrome 保留 | ✅ |
| 4. 透明度 | 全局透明度可调 | PASS 透明度滑杆 0.7→0.79 | ✅ |
| 5. 分区对比度/色温 | 工具栏区与编辑区各一套，独立调节 | PASS 工具栏对比度加深（0.35→0.52）；PASS 色温 filter 变化（sepia 0.55）；PASS 编辑区对比度独立（1.0 ≠ 工具栏 0.52） | ✅ |
| 6. 按背景保存参数 | 换图继承、切回恢复、重启记住 | PASS 替换 B 继承；PASS 切回 A 恢复；PASS 重启保持 | ✅ |
| 7. 清除背景 | 清除后恢复无背景 | PASS 清除后 bg=none | ✅ |
| 8. 无页面错误 | 全链路无 JS 异常 | PASS 无页面 JS 错误 | ✅ |

## 三、OPT-1 AI 文档简报 + 大纲锚点

| 检查项 | 预期（SIS-OPT-1 验收） | 实际（opt1-brief-smoke 7/7） | 结论 |
|--------|------|------|------|
| 1. 默认关闭 | 未配置 AI 时入口不可用且提示配置 | PASS 未配置点击「AI 简报」提示「请先配置」且浮层不打开 | ✅ |
| 2. 配置后可用 | 点击生成简报（mock 流式） | PASS 生成简报摘要内容可见 | ✅ |
| 3. 简报展示 | 摘要文本可见 | PASS 模拟摘要文本上屏 | ✅ |
| 4. 大纲与标题一一对应 | 层级/行号正确 | PASS 大纲 4 项与文档标题一致（行 1/5/9/15、层级 1/2/3/2） | ✅ |
| 5. 锚点定位 | 点击大纲项编辑器滚动+光标 | PASS 点击「细节」状态栏显示「行 9」且浮层关闭 | ✅ |
| 6. 失败兜底 | mock 500 提示错误、文档不变 | PASS 显示 500 错误、文档内容不变 | ✅ |
| 7. 不回归 | build 通过 + 既有 ai 自测不回归 | 全量回归 ai-smoke/ai-mermaid-smoke 全绿 + vue-tsc 0 错误 | ✅ |

## 四、OPT-4 Windows Shell 集成（右键打开 + 文件关联）

| 检查项 | 预期（SIS-OPT-4 验收） | 实际 | 结论 |
|--------|------|------|------|
| 1. 右键菜单注册 | HKCU `*\shell\aida-note`「用 aida-note 打开」command 指向 exe + "%1" | lib.rs `register_shell_integration` 实现（winreg 0.52 写 HKCU，含 Icon/command），启动 setup 自动注册 | ✅（Rust 编译通过） |
| 2. 文件关联 ProgID | md/txt/log/json/yaml/yml/ini/toml/csv 注册 `aida-note.<ext>` + `.<ext>` 默认值 | EXTENSIONS 清单 9 扩展名逐一注册 ProgID + shell\open\command + 扩展名默认值 | ✅（Rust 编译通过） |
| 3. 启动 argv 打开 | 带文件参数启动自动打开为标签（多文件多标签） | `get_launch_args` command 收集存在的文件路径；MainView.openLaunchArgs 启动 invoke → tabsStore.openPath 逐个打开 | ✅（Rust 编译通过 + 前端接线） |
| 4. 幂等注册 | 重复启动不产生重复项 | create_subkey 覆盖式写入天然幂等 | ✅ |
| 5. 浏览器 dev 不注册 | 浏览器环境不污染 | 注册与 invoke 均在 Tauri 侧（Rust setup / isTauri 门控），浏览器无影响 | ✅ |
| 6. build 通过 | npm run tauri build 通过 | cargo check 通过（2m38s 无错误）；完整 build 列 PO 本机验证（bundler 工具已缓存） | ⏳ PO 验证 |

## 五、总体

- OPT-2：4/4 ✅；OPT-3：8/8 ✅（14/14 子项）；OPT-1：7/7 ✅；OPT-4：5/6 ✅ + 1 项 PO 本机验证（真实右键/双击 + tauri build）。
- 全量回归：15 脚本全绿（含新增 opt3-bg-smoke 14/14、opt1-brief-smoke 7/7）；vue-tsc 0 错误；cargo check 通过。
- 沙箱限制记录（Sprint 6）：右键/双击真实 Shell 交互与完整 tauri build 无法在沙箱模拟 → 列 PO 本机验证项；`npm run tauri build` 的 bundler 工具已缓存（Sprint 5 对策延续）。
