/**
 * 代码格式化服务（SIS-FUNC-5）
 *
 * 基于 Prettier standalone + 按语言动态加载 parser 插件（避免打包全部插件）。
 * 覆盖 html / js / json / markdown 四语言；sql / plaintext 不支持（PCB 反面教材）。
 * 调用方（EditorPane）负责：整文件原地替换 + 进撤销栈（作为一次编辑操作）+ 失败提示。
 */

import type { LanguageId } from "./language";

/** 支持的格式化语言（与 SIS-FUNC-5 范围一致，SQL 仅保留高亮）。 */
const SUPPORTED: readonly LanguageId[] = ["html", "javascript", "json", "markdown"];

/** 该语言是否支持格式化（ToolBar 置灰依据）。 */
export function isFormatSupported(lang: LanguageId): boolean {
  return SUPPORTED.includes(lang);
}

/** 按语言格式化整段文本；不支持或语法错误时抛异常（调用方提示 + 保持原文）。 */
export async function formatContent(lang: LanguageId, content: string): Promise<string> {
  switch (lang) {
    case "javascript":
      return formatWith("babel", "javascript", content);
    case "json":
      return formatWith("json", "json", content);
    case "html":
      return formatWith("html", "html", content);
    case "markdown":
      return formatWith("markdown", "markdown", content);
    default:
      throw new Error(`当前语言（${lang}）不支持格式化`);
  }
}

/** 动态加载 prettier + 对应插件并格式化（JS/JSON 共用 babel+estree 插件）。 */
async function formatWith(parser: string, pluginKind: string, content: string): Promise<string> {
  const prettier = await import("prettier/standalone");
  const opts = {
    parser,
    plugins: (await resolvePlugins(pluginKind)) as unknown as Parameters<
      typeof prettier.format
    >[1]["plugins"],
  };
  return prettier.format(content, opts);
}

/** 按语言解析所需的 prettier 插件模块。 */
async function resolvePlugins(
  kind: string,
): Promise<ReadonlyArray<object>> {
  if (kind === "html") return [await import("prettier/plugins/html")];
  if (kind === "markdown") return [await import("prettier/plugins/markdown")];
  const [babel, estree] = await Promise.all([
    import("prettier/plugins/babel"),
    import("prettier/plugins/estree"),
  ]);
  return [babel, estree];
}
