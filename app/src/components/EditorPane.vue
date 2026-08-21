<script setup lang="ts">
/**
 * EditorPane：CodeMirror 6 编辑器组件（SIS-FUNC-1）
 *
 * 依据 ARCH-1 规则 4：EditorView 实例由本组件持有（DOM 生命周期归属组件）。
 * 历史保留策略（SIS-FUNC-1 验收）：每个标签的 EditorState 缓存于 tab.cmState
 * （含 history），切换标签 setState 恢复，保存不清空、切回仍在。
 */

import { onMounted, onBeforeUnmount, ref, watch } from "vue";
import { basicSetup } from "codemirror";
import { EditorView, keymap } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { indentWithTab, undo, redo } from "@codemirror/commands";
import { html } from "@codemirror/lang-html";
import { sql } from "@codemirror/lang-sql";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { markdown } from "@codemirror/lang-markdown";
import { useTabsStore, type Tab } from "../stores/tabsStore";
import type { LanguageId } from "../services/language";

const emit = defineEmits<{
  (e: "cursor", c: { line: number; col: number }): void;
  (e: "ready", api: { undo: () => void; redo: () => void }): void;
}>();

const tabsStore = useTabsStore();
const editorHost = ref<HTMLDivElement | null>(null);
let view: EditorView | null = null;

function languageExtension(lang: LanguageId) {
  switch (lang) {
    case "html":
      return html();
    case "sql":
      return sql();
    case "javascript":
      return javascript();
    case "json":
      return json();
    case "markdown":
      return markdown();
    default:
      return [];
  }
}

function createState(tab: Tab): EditorState {
  const tabId = tab.id;
  return EditorState.create({
    doc: tab.content,
    extensions: [
      basicSetup,
      languageExtension(tab.language),
      keymap.of([indentWithTab]),
      EditorView.updateListener.of((u) => {
        if (u.docChanged) {
          const t = tabsStore.tabs.find((x) => x.id === tabId);
          if (t) {
            tabsStore.updateContent(tabId, u.state.doc.toString());
            t.cmState = u.state;
          }
        }
        const head = u.state.selection.main.head;
        const line = u.state.doc.lineAt(head);
        emit("cursor", { line: line.number, col: head - line.from + 1 });
      }),
    ],
  });
}

function emitCursor(state: EditorState) {
  const head = state.selection.main.head;
  const line = state.doc.lineAt(head);
  emit("cursor", { line: line.number, col: head - line.from + 1 });
}

/** 切换到当前激活标签：恢复其 cmState 或新建；无标签则置空。 */
function switchToTab() {
  if (!view) return;
  const tab = tabsStore.activeTab;
  if (!tab) {
    view.setState(EditorState.create({ doc: "", extensions: [basicSetup] }));
    return;
  }
  if (tab.cmState) {
    view.setState(tab.cmState);
    emitCursor(tab.cmState);
  } else {
    const state = createState(tab);
    view.setState(state);
    tab.cmState = state;
    emitCursor(state);
  }
}

onMounted(() => {
  view = new EditorView({
    parent: editorHost.value ?? undefined,
    state: EditorState.create({ doc: "", extensions: [basicSetup] }),
  });
  switchToTab();
  emit("ready", {
    undo: () => {
      view?.focus();
      if (view) undo(view);
    },
    redo: () => {
      view?.focus();
      if (view) redo(view);
    },
  });
});

onBeforeUnmount(() => {
  view?.destroy();
  view = null;
});

watch(() => tabsStore.activeTabId, switchToTab);
</script>

<template>
  <div class="editor-pane">
    <div ref="editorHost" class="editor-host"></div>
  </div>
</template>

<style scoped>
.editor-pane {
  height: 100%;
  overflow: hidden;
}
.editor-host {
  height: 100%;
}
.editor-host :deep(.cm-editor) {
  height: 100%;
}
.editor-host :deep(.cm-scroller) {
  font-family: "Cascadia Code", Consolas, "Courier New", monospace;
}
</style>
