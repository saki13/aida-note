/**
 * 核心依赖引用验证（SIS-ENV-2 最小引用示例）
 *
 * 仅做静态 import 验证：保证 codemirror / mermaid / prettier / diff
 * 四类依赖可安装、可引用、类型可解析。不做任何功能封装（功能开发属 FUNC 系列 SIS）。
 * 后续 Sprint 接入真实功能时，本文件可保留作为依赖清单入口或删除。
 */

// CodeMirror 6 核心（meta 包，含 basicSetup 与常用扩展集合）
import { basicSetup } from "codemirror";
import { EditorView } from "@codemirror/view";
import { EditorState } from "@codemirror/state";

// 5 种语言包（SIS-ENV-2 范围：html / sql / javascript / json / markdown）
import { html } from "@codemirror/lang-html";
import { sql } from "@codemirror/lang-sql";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { markdown } from "@codemirror/lang-markdown";

// mermaid（图表渲染）
import mermaid from "mermaid";

// Prettier（代码格式化，FUNC-5 使用 standalone + plugins 方式调用）
import * as prettier from "prettier/standalone";

// jsdiff（双栏对比，FUNC-6 使用）
import * as diff from "diff";

export const dependencies = {
  codemirror: { basicSetup, EditorView, EditorState },
  languages: { html, sql, javascript, json, markdown },
  mermaid,
  prettier,
  diff,
} as const;
