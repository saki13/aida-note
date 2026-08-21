/**
 * 语言识别工具（SIS-FUNC-1 / SIS-FUNC-2）
 *
 * 按扩展名映射语法高亮语言标识。无扩展名或未知扩展名 -> plaintext。
 * 与 ARCH-2 Tab.language 联合类型保持一致。
 */

export type LanguageId =
  | "markdown"
  | "javascript"
  | "json"
  | "html"
  | "sql"
  | "plaintext";

const EXT_MAP: Record<string, LanguageId> = {
  // markdown
  md: "markdown",
  markdown: "markdown",
  mdx: "markdown",
  // javascript / typescript（TS 语法高亮用 js 语言包，SIS-ENV-2 范围无 ts 语言包）
  js: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  jsx: "javascript",
  ts: "javascript",
  tsx: "javascript",
  mts: "javascript",
  cts: "javascript",
  vue: "javascript",
  // json
  json: "json",
  jsonc: "json",
  // html
  html: "html",
  htm: "html",
  // sql
  sql: "sql",
};

/**
 * 按文件名识别语言。传入文件路径或文件名均可（取最后一段 basename 的扩展名）。
 */
export function detectLanguage(fileName: string): LanguageId {
  const base = fileName.split(/[\\/]/).pop() ?? "";
  const ext = base.includes(".")
    ? base.slice(base.lastIndexOf(".") + 1).toLowerCase()
    : "";
  return EXT_MAP[ext] ?? "plaintext";
}
