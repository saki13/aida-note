# SIS-OPT-8：AI 翻译双屏对比 + AI 工具整合 + 背景图 ACL 修复

> 所属：Sprint 8（PO 2026-08-25 提出）
> 类型：新功能（翻译）+ 优化（AI 下拉整合）+ Bug 修复（背景图 ACL）
> 对齐方式：语义断句（保留换行上下文，非机械按行）

---

## 一、需求背景

PO 反馈：
1. 「再添加一个 ai 翻译功能，弄成双屏对比的效果，鼠标移动同时高亮两边的文字」
2. 「把几个 ai 工具整合下做个下拉功能选择，不要再堆按钮了」
3. 「固定译成中文」「按语义断句对应，按行对齐的话换行上下文丢了怎么翻译准确呢？」
4. 背景图上传报错：`选择图片失败:Command plugin:fs/read_file not allowed by ACL`

## 二、范围

### OPT-8a 背景图 ACL 修复（Bug）
- `src-tauri/capabilities/default.json` 增加 `fs:allow-read-file`（scope `**`，二进制读，背景图/后续二进制读取）与 `fs:allow-mkdir`（scope `**`，草稿目录）。

### OPT-8b AI 工具整合下拉
- ToolBar 中「AI 润色」（下拉四选）、「AI 面板」（问答侧栏）、「AI 简报」（悬窗）整合为单一「AI 工具」下拉（N-Dropdown 分组）：
  - 组「问答/简报」：AI 问答面板、AI 简报
  - 组「文本处理」：润色（子菜单 改写/润色/缩短/扩写）、**AI 翻译（新增）**
- 非 AI 按钮不动；未配置 API 的统一提示语保留。

### OPT-8c AI 翻译双屏对比
1. **断句**（`services/sentenceService.ts`）：
   - `splitSentences(text): { text: string; lineFrom: number; lineTo: number }[]`
   - 规则：先按空行切「段落」，段内按 `。！？…；`（含半角 `.?!;`）断句；单句长度下限 ≥2 字符；记录每句在原文档中的行号范围（用于 hover 联动滚动）。
2. **翻译请求**（aiStore 新增 translate 状态与 action）：
   - `translateState: { status: "idle"|"loading"|"done"|"error"; src: Sentence[]; tgt: Sentence[]; pairs: number[]; error: string; key: string }`
   - 传完整原文（保留换行）→ LLM 逐句译成简体中文 → 期望返回 `{"pairs":[{"src":"原句","tgt":"译文句"}]}`（JSON）
   - 容错：解析失败置 error 可重试；数量不一致按索引对齐，缺失补占位
   - 上限：原文 > 20000 字符提示，不发起请求
3. **双屏视图**（`components/TranslateView.vue`）：
   - 布局复用 CompareView 双栏风格：左栏原句列表 / 右栏中文译文列表，逐行（句）渲染
   - **hover 双向高亮**：悬停左栏句子 i → 右栏句子 i 高亮（反之亦然）；hover 同时右侧显示对应句原文/译文可手动滚动到可见区
   - 滚动联动（scrollTop 同步，同 CompareView）
   - 头部：标题「AI 翻译」+ 文件名 + 目标语言「中文」+ 关闭按钮
   - 状态：loading（生成中）/ error（重试）/ done（渲染）/ idle（不可达）
4. **接线**（MainView.vue）：
   - `translateOpen: ref(false)`；`<TranslateView v-if="translateOpen" ...>` 挂载于 editor-area 之上（同 CompareView 占位，替代编辑器视图）
   - ToolBar AI 下拉「AI 翻译」→ `translateApi.open()` → 对当前活动标签发起翻译
   - 关闭视图：仅置 translateOpen=false，不写文件、不置脏

## 三、验收标准（DoD 清单）

| # | 验收项 | 通过标准 |
|---|--------|----------|
| 1 | AI 工具整合 | ToolBar 只有一个「AI 工具」下拉，含 问答面板/润色子菜单/简报/翻译；原三个独立 AI 按钮消失 |
| 2 | 未配置提示 | 未配置 API 时点翻译 → 提示先配置，不打开视图 |
| 3 | 双屏翻译 | 配置后点翻译 → 双屏视图（左原文/右简体中文译文）|
| 4 | 语义断句 | 含长段落/多句行的文本被正确断句，句间有对应关系（非机械按行）|
| 5 | hover 双向高亮 | 悬停左侧句子 → 右侧对应句子高亮；悬停右侧 → 左侧高亮 |
| 6 | 滚动联动 | 一侧滚动另一侧同步 |
| 7 | 关闭无损 | 关闭翻译视图返回编辑，原文不丢、不置脏 |
| 8 | 状态隔离 | 切换文件/重翻独立；error 可重试 |
| 9 | 背景图 ACL | Tauri 环境选图不再报 ACL，可设背景并持久化 |
| 10 | 质量门禁 | vue-tsc 0 错误；opt8-translate-smoke 全绿；npm run build 通过 |

## 四、边界与约束

- 翻译视图为临时对比，不写回文件。
- 字符上限 20000；超出提示不请求。
- 断句为宽松规则，不追求 NLP 精确。
- AI 下拉整合不动非 AI 按钮与主题/背景逻辑。

## 五、风险与对策

| 风险 | 对策 |
|------|------|
| LLM 返回非 JSON / 结构不符 | 解析容错 + error 可重试 |
| 句数不对齐 | 索引对齐 + 占位 |
| 断句误切 | 宽松规则 + 长度下限 + 段落优先 |
| 大文件慢 | 上限保护 + loading + 可取消 |
| ACL 修复需重新构建生效 | 真实 ACL 验证列 PO 本机；断句/视图逻辑浏览器自测 |

## 六、关联资产

- 复用：CompareView（双栏布局/滚动联动参考）、aiStore.streamChat、diffService（不用于翻译）
- 新增：sentenceService.ts、TranslateView.vue、opt8-translate-smoke.mjs
- 修改：capabilities/default.json、ToolBar.vue、aiStore.ts、MainView.vue
