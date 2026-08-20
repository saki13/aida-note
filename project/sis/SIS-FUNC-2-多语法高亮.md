---
sis_id: SIS-FUNC-2
related_backlog_id: FUNC-2
priority: P0
stage: active
status: confirmed
linked_skills: []
---

# SIS：多语法高亮

## 1. 任务目标

实现 aida-note 编辑器的 5 种语言语法高亮（html / sql / js / json / markdown），基于 CodeMirror 6 语言包，配置语言注册表以支持未来扩展，并随全局明暗主题联动配色。

- 必须完成：
  - 5 种语言高亮：html / sql / js / json / markdown（源码着色）
  - 标准着色能力：关键词 / 字符串 / 注释 / 数字 / 括号匹配 + 自动缩进 + 括号自动闭合 + 选中高亮
  - 语言注册表：扩展名 → language 包映射（配置文件），预留扩展
  - 主题联动：高亮配色随全局明暗主题切换（light/dark 主题包）
- 建议完成：
  - 语言选择器（状态栏可手动切换语言，覆盖自动识别）
- 当前不做：
  - 不做 markdown 所见即所得渲染（属 FUNC-3）
  - 不做 mermaid 渲染（属 FUNC-4）
  - 不做折叠 / 代码补全等 IDE 级能力（PCB 反面教材）

## 2. 人类意图

PO 原始表达（2026-08-19 逐项问答确认，FUNC-2 全部"照推荐"）：

- 高亮先行、渲染后置：FUNC-2 只做 5 语言语法着色，markdown 所见即所得归 FUNC-3
- 标准着色全套：关键词/字符串/注释/数字/括号匹配 + 自动缩进 + 括号闭合 + 选中高亮（CodeMirror 语言包默认能力）
- 主题随全局明暗联动（不单独维护）
- 语言注册表配置化，本 SIS 交付 5 种，预留扩展

## 3. 输入 / 输出契约

- 输入：
  - ENV-2 依赖（CodeMirror 6 + 5 语言包）
  - UI-3 视觉设计（明暗主题联动规则）
  - FUNC-1（编辑器接入、语言识别）
- 输出：
  - 语言注册表配置文件（扩展名 → language 映射）
  - 编辑器高亮接入代码（CodeMirror language 配置 + 主题联动）
  - 状态栏语言选择器（建议项）
- 输出位置：`d:\lucia\workspace\aida-note\app\`（src/services、src/components）

## 4. 边界与约束

- 可以改：语言注册表的具体写法、主题包选择
- 不能改：
  - 5 种语言范围：html / sql / js / json / markdown
  - 不实现 markdown 所见即所得（属 FUNC-3）
  - 主题随全局明暗联动
- 必须遵守：
  - 语言注册表结构（扩展名 → language 映射）作为扩展入口
  - 与 FUNC-1 语言识别衔接（自动识别 + 手动覆盖）
  - 不引入 IDE 级能力（折叠/补全）

## 5. 验收标准

- [ ] 打开/新建 5 种语言文件均正确着色（html/sql/js/json/markdown）
- [ ] 关键词 / 字符串 / 注释 / 数字高亮正确；括号匹配高亮生效
- [ ] 自动缩进与括号自动闭合生效
- [ ] 切换明暗主题时高亮配色跟随切换
- [ ] 语言注册表为配置结构（新增语言只需加表项）
- [ ] 状态栏语言选择器可手动切换语言（若实现）
- [ ] `npm run dev` 可手动验证，`npm run build` 通过
