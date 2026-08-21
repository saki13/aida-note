# aida-note 视觉设计（UI-3）

> 版本：v1.0 · 2026-08-21 · Sprint 2
> 依据：SIS-UI-3 / UI-1（`app/docs/ui-layout.md`）/ UI-2（`app/docs/ui-interactions.md`）/ ARCH-2 §4.2（settingsStore.theme 三态）
> 定位：FUNC-9（主题切换）与整体 UI 观感的视觉依据。本文档只做视觉设计，不含实现。
> 基调（PO 定案，不可改）：明暗双主题 + 跟随系统（默认，设置可覆盖）/ 编辑区随全局联动 / 图标 xicons / 品牌克制。

---

## 1. 明暗双主题方案

### 1.1 主题模型：双主题 × 三态开关

| 主题 | Naive UI 主题对象 | 用途 |
|------|------------------|------|
| Light | `lightTheme` | 浅色界面 |
| Dark | `darkTheme` | 深色界面 |

- 主题偏好三态（ARCH-2 §4.2 既定）：`theme: 'light' | 'dark' | 'system'`，默认 `system`，持久化于 settings.json。
- 解析规则（解析结果 = 实际生效主题，驱动全 UI）：

```
theme === 'light'        -> light
theme === 'dark'         -> dark
theme === 'system'       -> 跟随 OS（matchMedia('(prefers-color-scheme: dark)')），
                            OS 切换时实时跟随（监听 change 事件）
```

- 设置覆盖：设置视图（UI-1 §2）中主题选择器改 `settingsStore.theme` -> 写 settings.json -> 全局即时生效，无需重启。
- Naive UI 接入：App 根 `NConfigProvider :theme="resolvedTheme === 'dark' ? darkTheme : lightTheme"`（Provider 位置遵循 FUNC-1 经验：注入点高于全部使用者）。

### 1.2 配色基线（v1 不做多套自定义配色）

| 层面 | Light | Dark |
|------|-------|------|
| Naive UI 组件 | 官方默认（`lightTheme`） | 官方默认（`darkTheme`） |
| 页面背景 | 组件库默认底色 | 组件库默认底色 |
| 强调色 | 组件库默认 primary | 组件库默认 primary |

- **不自定义品牌色板**：v1 完全信任 Naive UI 双主题默认值（品牌克制；「多套配色」是 FUNC-9 预留扩展位，届时新增主题对象而非改本基线）。
- 局部微调仅限：diff 高亮语义色（见 §2.3）与编辑器主题（见 §2），语义色不走组件库 token。

---

## 2. 编辑区（CodeMirror）主题联动

### 2.1 联动规则

- 编辑器配色**不单独维护多套**，只跟随全局解析结果（§1.1 resolvedTheme）：
  - light -> CodeMirror 默认浅色主题（basicSetup 内置）
  - dark -> `@codemirror/theme-one-dark`（oneDark，FUNC-2 已接入）
- 切换时机：resolvedTheme 变更 -> `themeCompartment.reconfigure(themeExtension())`（FUNC-2 既定机制，UI-2 §6 引用）。
- **联动范围 = 单标签内的编辑器**：多标签共用同一全局主题（无按标签主题）。

### 2.2 语法高亮色

- 交给所选编辑器主题（light=CM 默认 token 色 / dark=oneDark token 色），不逐语言定制。
- FUNC-2 的 5 语言（html/sql/js/json/markdown）高亮均在两主题下可用（已验证）。

### 2.3 diff 语义色（UI-2 §3.2/§5.2 复用）

| 语义 | Light | Dark | 说明 |
|------|-------|------|------|
| 新增（B 栏/润色新增） | 绿底浅色（如 `#e6ffec`）+ 深绿文字 | 深绿底（如 `#1b4721`）+ 浅绿文字 | 行级底色 + 行内字符级加重 |
| 删除（A 栏/润色删除） | 红底浅色（如 `#ffebe9`）+ 深红删除线 | 深红底（如 `#4a2020`）+ 浅红删除线 | 同上 |

- 色值为设计基线（实现可微调 ±10% 明度），语义不可变：红=删、绿=增，双主题下都须可辨识（对比度达标）。

---

## 3. 图标方案（xicons）

| 项 | 规则 |
|----|------|
| 图标库 | `@vicons/ionicons5`（Naive UI 官方配套生态，SIS 既定） |
| 使用方式 | 组件内 import 具名图标 -> `<n-button><n-icon>...</n-icon></n-button>`（NIcon 包装） |
| 尺寸 | 工具栏/状态栏图标统一 16px；侧栏按钮 18px |
| 映射约定（UI-1 §4 工具栏 12 项） | 新建=DocumentTextOutline / 打开=FolderOpenOutline / 保存=SaveOutline / 另存=SaveOutline+角标区分 / 撤销=ArrowUndoOutline / 重做=ArrowRedoOutline / 搜索=SearchOutline / 格式化=CodeSlashOutline / 软换行=TextOutline / 对比=GitCompareOutline / 主题=MoonOutline(暗)·SunnyOutline(亮) / AI 面板=SparklesOutline / 设置=SettingsOutline |
| 覆盖范围 | UI-2 交互元素同源取图：润色四动作=CreateOutline/ColorWandOutline/RemoveOutline/AddOutline；差异跳转=ChevronUp/DownOutline；插入=PulseOutline；AI 修复=BuildOutline |
| 禁止 | 不自绘 SVG、不混用第二图标库、不加图标动效 |

- 实现落地属各 FUNC Story；图标语义名先在此锁定，避免实现期各写各的。

---

## 4. 字体栈

| 用途 | 字体栈 |
|------|--------|
| 界面（UI 文本） | `system-ui, -apple-system, "Segoe UI", "Microsoft YaHei", sans-serif`（Naive UI 默认即可，不自定义界面字体） |
| 编辑器/代码 | `ui-monospace, "Cascadia Code", Consolas, "Courier New", monospace`（CM6 编辑区 + 全部代码块 + diff 栏） |
| 字号基线 | 编辑器 14px（缩放基准 100%，UI-1 §5）；界面文字跟 Naive UI 默认（14px 档） |

- 双主题下字体栈不变（字体不参与主题切换）。
- 中文等宽渲染由系统回退处理，不引入自定义字体文件（品牌克制）。

---

## 5. 应用图标约定（建议项落地）

| 项 | 约定 |
|----|------|
| 窗口图标 | Tauri `src-tauri/icons/` 全套（icon.ico / icon.png 系列，Tauri 默认生成流程） |
| 设计 | 克制风：单色「笔记本 + 光标」意象（轻便文本编辑器），Light/Dark 下同一图标（v1 不做分主题图标） |
| 优先级 | 建议项：不阻塞 FUNC 系列；可在 FUNC-9（主题切换）同期替换默认 Tauri 图标 |
| 不做 | 不做启动页 / 关于页品牌视觉 / 应用内 Logo 展示 |

---

## 6. 一致性核查（SIS-UI-3 验收第 6 项）

| 检查点 | 结论 |
|--------|------|
| 明暗双主题 + 跟随系统 + 设置覆盖 | ✓ §1.1（三态解析规则，FUNC-9 直接实现） |
| 编辑区随全局联动 | ✓ §2（复用 FUNC-2 themeCompartment 机制，不单独维护） |
| 图标 xicons + 字体栈 | ✓ §3（语义名锁定）/ §4（系统栈 + 等宽代码栈） |
| 应用图标约定 | ✓ §5（建议项，Tauri icons 全套） |
| 与 UI-1 一致 | ✓ 工具栏 12 项图标全覆盖（§3 映射表）；状态栏缩放基准即 UI-1 §5 |
| 与 UI-2 一致 | ✓ §2.3 diff 语义色即 UI-2 §3.2/§5.2 的视觉定义；§3 覆盖 UI-2 交互元素图标 |
| 品牌克制边界 | ✓ 无自定义色板/字体文件/启动页/多套配色（FUNC-9 扩展位保留） |

---

*后续变更：本文档属建设资产，视觉基线变更（如引入自定义配色、更换图标库）需走 T3 变更流程并同步 decision。*
