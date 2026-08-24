/// <reference types="vite/client" />

import type { EditorState } from "@codemirror/state";

/**
 * 让 Vue 的 UnwrapRef 对 CM6 EditorState 直接放行（identity 保持）。
 *
 * 背景：ref<Tab[]> 会对元素做 UnwrapRef 深展开；EditorState 含私有成员
 * （如 SelectionRange.flags），被结构展开后会丢失名义身份，导致其
 * `UnwrapRef` 结果不可赋值回 EditorState（TS2769/TS2322，tabsStore cmState）。
 * 运行时侧已用 markRaw 避免 Vue 代理破坏 Compartment 身份（FUNC-2 关键坑），
 * 本 augmentation 是类型侧对应的官方逃逸口（同 @vue/runtime-dom 豁免 Node/Window）。
 */
declare module "@vue/reactivity" {
  interface RefUnwrapBailTypes {
    editorStateBail: EditorState;
  }
}
