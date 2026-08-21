<script setup lang="ts">
/**
 * EditorPane：CodeMirror 6 编辑器组件（SIS-FUNC-1 / SIS-FUNC-2）
 *
 * 依据 ARCH-1 规则 4：EditorView 实例由本组件持有（DOM 生命周期归属组件）。
 * 历史保留策略（SIS-FUNC-1 验收）：每个标签的 EditorState 缓存于 tab.cmState
 * （含 history），切换标签 setState 恢复，保存不清空、切回仍在。
 * 高亮与主题（SIS-FUNC-2）：语言扩展与明暗主题均用 Compartment 动态切换，
 * 语言随标签（自动识别 + 手动覆盖），明暗随系统 prefers-color-scheme 联动。
 */

import { onMounted, onBeforeUnmount, ref, watch } from "vue";
import { basicSetup } from "codemirror";
import { EditorView, keymap, Compartment } from "@codemirror/view";
import { EditorState, type Extension } from "@codemirror/state";
import { indentWithTab, undo, redo } from "@codemirror/commands";
import { oneDark } from "@codemirror/theme-one-dark";
import { languageExtension } from "../services/languageRegistry";
import { useTabsStore, type Tab } from "../stores/tabsStore";
import type { LanguageId } from "../services/language";

const emit = defineEmits<{
  (e: "cursor", c: { line: number; col: number }): void;
  (e: "ready", api: { undo: () => void; redo: () => void }): void;
}>();

const tabsStore = useTabsStore();
const editorHost = ref<HTMLDivElement | null>(null);
let view: EditorView | null = null;

// Compartment：语言与主题的独立扩展槽，运行时可整体替换，不影响文档/历史。
const languageCompartment = new Compartment();
const themeCompartment = new Compartment();
let mediaQuery: MediaQueryList | null = null;

/** 当前明暗主题扩展：跟随系统 prefers-color-scheme（SIS-FUNC-2 主题联动）。 */
function themeExtension(): Extension {
  return mediaQuery?.matches ? oneDark : [];
}

/** 重建语言扩展（按当前标签语言）；用于手动切换语言后整体替换。 */
function languageExtensions(lang: LanguageId): Extension {
  return languageExtension(lang);
}

function createState(tab: Tab): EditorState {
  const tabId = tab.id;
  return EditorState.create({
    doc: tab.content,
    extensions: [
      basicSetup,
      themeCompartment.of(themeExtension()),
      languageCompartment.of(languageExtensions(tab.language)),
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

/** 手动切换语言：替换语言 Compartment（不触碰历史/主题），并同步缓存状态。 */
function applyLanguage(lang: LanguageId) {
  view?.dispatch({
    effects: languageCompartment.reconfigure(languageExtensions(lang)),
  });
  // dispatch 后 cmState 需含最新语言配置，否则切回标签恢复旧 state 时语言回退。
  const t = tabsStore.activeTab;
  if (t && view) t.cmState = view.state;
}

/** 切换明暗主题：替换主题 Compartment（不触碰文档）。 */
function applyTheme() {
  view?.dispatch({
    effects: themeCompartment.reconfigure(themeExtension()),
  });
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
    applyTheme(); // 恢复旧 state 后重推当前主题（避免主题过期）
  } else {
    const state = createState(tab);
    view.setState(state);
    tab.cmState = state;
    emitCursor(state);
  }
}

onMounted(() => {
  mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  view = new EditorView({
    parent: editorHost.value ?? undefined,
    state: EditorState.create({ doc: "", extensions: [basicSetup] }),
  });
  switchToTab();
  mediaQuery.addEventListener("change", applyTheme);
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
  mediaQuery?.removeEventListener("change", applyTheme);
  mediaQuery = null;
  view?.destroy();
  view = null;
});

watch(() => tabsStore.activeTabId, switchToTab);
// 语言变化（含手动切换 setLanguage）时同步替换扩展；cmState 会随 updateListener 更新。
watch(
  () => tabsStore.activeTab?.language,
  (lang, prev) => {
    if (lang && lang !== prev) applyLanguage(lang);
  }
);
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
