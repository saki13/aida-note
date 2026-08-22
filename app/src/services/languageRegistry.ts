/**
 * 语言注册表（SIS-FUNC-2）
 *
 * 配置结构：新增语言只需在 LANGUAGE_REGISTRY 追加一条表项（id/label/扩展工厂），
 * 无需改动 EditorPane/StatusBar 逻辑。与 language.ts 的扩展名→LanguageId 识别衔接：
 * 识别负责「自动猜」，注册表负责「渲染/切换」。
 */

import type { Extension } from "@codemirror/state";
import { html } from "@codemirror/lang-html";
import { sql } from "@codemirror/lang-sql";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { markdown } from "@codemirror/lang-markdown";
import { GFM } from "@lezer/markdown";
import { markdownWysiwyg } from "./markdownWysiwyg";
import type { LanguageId } from "./language";

export interface LanguageEntry {
  id: LanguageId;
  label: string;
  createExtension: () => Extension;
}

/** 语言注册表：5 种高亮语言 + 纯文本兜底（最后一项）。 */
export const LANGUAGE_REGISTRY: LanguageEntry[] = [
  { id: "html", label: "HTML", createExtension: () => html() },
  { id: "sql", label: "SQL", createExtension: () => sql() },
  { id: "javascript", label: "JavaScript", createExtension: () => javascript() },
  { id: "json", label: "JSON", createExtension: () => json() },
  {
    id: "markdown",
    label: "Markdown",
    // 所见即所得扩展随语言挂载/移除（languageCompartment reconfigure，无独立槽位）。
    // 注意①：markdown() 默认 base 是 commonmarkLanguage（无 GFM！删除线/表格不解析），
    //   必须显式挂 GFM 扩展才能出 Strikethrough/Table 节点。
    // 注意②：不用 markdownLanguage（含 GFM+下标+上标+emoji）——它自带的
    //   foldNodeProp.add({Table}) 在增量解析时对未对齐的旧树位置调 doc.lineAt 会
    //   抛 TypeError（本 Sprint 实测）；单独挂 GFM 只有语法、无 fold 陷阱。
    createExtension: () => [markdown({ extensions: GFM }), markdownWysiwyg()],
  },
  { id: "plaintext", label: "纯文本", createExtension: () => [] },
];

/** 取注册表项；未知 id 兜底为最后一项（plaintext）。 */
export function languageEntry(id: LanguageId): LanguageEntry {
  return (
    LANGUAGE_REGISTRY.find((e) => e.id === id) ??
    LANGUAGE_REGISTRY[LANGUAGE_REGISTRY.length - 1]
  );
}

/** 取语言的 CodeMirror 扩展。 */
export function languageExtension(id: LanguageId): Extension {
  return languageEntry(id).createExtension();
}
