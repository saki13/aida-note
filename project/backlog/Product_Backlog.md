# Product Backlog（主事实源）

> 版本：v0.1.0（首版定稿，Grooming 收口 2026-08-19）
> 更新者：Aida v0.1.0 + PO
> 最后更新：2026-08-19
> 项目：aida-note（轻便全能文本编辑器）

---

## 说明

- 本文档是项目的**主事实源**，Backlog 状态变更必须即时同步：①decisions ②本文档 ③data.json ④state+manifest（4 同步点，缺一视为未收口）。
- Story 格式：`- [ ] P{优先级} {StoryID}：{描述}（{状态}）`。
- 状态词：`已排期` / `执行中` / `待审查` / `已完成 YYYY-MM-DD` / `阻塞：{原因}` / `未确认`。
- 需求来源：2026-08-19 grill 需求收集 + 项目准备阶段需求池确认 + Grooming 未决议题定案（U-1~U-5）。

---

## Sprint 划分（Planning 收口 2026-08-20）

> 三级收敛锁定全部 19 项为正式输入，分 4 个短 Sprint；无候补/暂缓项。

| Sprint | 主题 | 成员 |
|--------|------|------|
| Sprint 1 | 地基 | ENV-1、ENV-2、ARCH-1、ARCH-2 |
| Sprint 2 | 核心 | UI-1、UI-2、UI-3、FUNC-1、FUNC-2 |
| Sprint 3 | 增强 | FUNC-3、FUNC-4、FUNC-5、FUNC-6、FUNC-7、FUNC-8 |
| Sprint 4 | 体验/AI | FUNC-9、FUNC-10、FUNC-11、AI-1 |

---

## 需求池（首版定稿）

### 类别 A：工程基础（ENV）

- [x] P0 ENV-1：项目脚手架搭建（Tauri 2 + Vue 3 + TypeScript + Vite，目录结构 / 构建 / 运行脚本）（已完成 2026-08-20，SIS-ENV-1，Sprint 1；commit d704a31）
- [x] P0 ENV-2：核心依赖接入（CodeMirror 6 / mermaid / Prettier / diff 库）（已完成 2026-08-20，SIS-ENV-2，Sprint 1；commit 6d9ddfa）

### 类别 B：架构设计（ARCH）

- [x] P0 ARCH-1：系统架构设计（Tauri 主进程与前端职责划分、IPC 接口契约、模块分层）（已完成 2026-08-20，SIS-ARCH-1，Sprint 1；commit 762409d）
- [x] P0 ARCH-2：文件与状态管理架构（文件读写、多标签状态、脏标记、设置持久化到 Tauri app config 目录 JSON）（已完成 2026-08-20，SIS-ARCH-2，Sprint 1；commit 6e8bc8a）

### 类别 C：UI 设计（UI）

- [x] P0 UI-1：界面布局设计（标签栏 / 工具栏 / 侧栏 / 状态栏；UI 组件库 = Naive UI）（已完成 2026-08-20，SIS-UI-1，Sprint 2；commit 1169dc4）
- [ ] P0 UI-2：交互设计（所见即所得编辑交互、AI 面板交互、对比视图交互）（已排期，SIS-UI-2）
- [ ] P1 UI-3：视觉设计（配色 / 明暗主题 / 图标）（已排期，SIS-UI-3）

### 类别 D：功能实现（FUNC）

- [x] P0 FUNC-1：多标签文件编辑（打开 / 新建 / 保存 / 另存 / 脏标记）（已完成 2026-08-21，SIS-FUNC-1，Sprint 2；commit 4648820 + 52494ea）
- [x] P0 FUNC-2：多语法高亮（html / sql / js / json / markdown）（已完成 2026-08-21，SIS-FUNC-2，Sprint 2；commit afb510d）
- [ ] P0 FUNC-3：Markdown 同屏所见即所得（Typora 式）（已排期，SIS-FUNC-3）
- [ ] P0 FUNC-4：mermaid 编写 + 原位实时渲染（已排期，SIS-FUNC-4）
- [ ] P0 FUNC-5：代码格式化（美化，4 种语言：html / js / json / markdown；SQL 格式化暂不支持）（已排期，SIS-FUNC-5）
- [ ] P0 FUNC-6：文件对比（双栏 diff，高亮增删；源 = 两个独立文件 + 当前文件 vs 剪贴板；历史版本对比往后放）（已排期，SIS-FUNC-6）
- [ ] P0 FUNC-7：搜索 / 替换（当前文件）（已排期，SIS-FUNC-7）
- [ ] P0 FUNC-8：软换行展示（默认开启，可开关，保存不写入换行符）（已排期，SIS-FUNC-8）
- [ ] P1 FUNC-9：主题切换（明 / 暗 + 多套配色）（已排期，SIS-FUNC-9）
- [ ] P1 FUNC-10：自动保存 / 崩溃恢复草稿（临时目录存储，退出/恢复后清理、不留碎片）（已排期，SIS-FUNC-10）
- [ ] P1 FUNC-11：打开最近文件列表（已排期，SIS-FUNC-11）

### 类别 E：AI 接入（AI）

- [ ] P1 AI-1：可配置第三方 API（OpenAI 兼容协议，可配 baseURL / key / model，支持 DeepSeek 等）+ 润色 + 问答 + mermaid 修复（已排期，SIS-AI-1）

---

## 明确不做（已进 PCB 反面教材，不进 Backlog）

- 跨文件全局搜索
- 多窗口 / 分屏
- 文件树 / 文件夹侧栏 / 监听
- 运行脚本 / 程序、IDE 级工程管理
- 产品化 / 分发
- SQL 格式化（做减法）

---

## 未决议题池

*暂无（U-1~U-5 已于 2026-08-19 Grooming 中全部定案）。*

<!-- 格式：
- {IssueID}：{问题描述}（提出日期，状态：待讨论/已解决）
-->
