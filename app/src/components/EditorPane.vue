<script setup lang="ts">
/**
 * EditorPane：CodeMirror 6 编辑器组件（SIS-FUNC-1 / SIS-FUNC-2）
 *
 * 依据 ARCH-1 规则 4：EditorView 实例由本组件持有（DOM 生命周期归属组件）。
 * 历史保留策略（SIS-FUNC-1 验收）：每个标签的 EditorState 缓存于 tab.cmState
 * （含 history），切换标签 setState 恢复，保存不清空、切回仍在。
 * 高亮与主题（SIS-FUNC-2）：语言扩展与明暗主题均用 Compartment 动态切换，
 * 语言随标签（自动识别 + 手动覆盖），明暗随系统 prefers-color-scheme 联动。
 * 关键坑（FUNC-2 排查所得）：所有 state（含初始空 state）必须注册同一对
 * Compartment 实例，且语言对齐在 switchToTab 恢复 cmState 后执行——
 * applyLanguage 中写 cmState 会被新建标签时的 watch 时序污染。
 */

import { onMounted, onBeforeUnmount, ref, watch, markRaw } from "vue";
import { useMessage } from "naive-ui";
import { basicSetup } from "codemirror";
import { search, openSearchPanel } from "@codemirror/search";
import { EditorView, keymap } from "@codemirror/view";
import { EditorState, Compartment, Prec, type Extension } from "@codemirror/state";
import { indentWithTab, undo, redo } from "@codemirror/commands";
import { oneDark } from "@codemirror/theme-one-dark";
import { languageExtension } from "../services/languageRegistry";
import { isFormatSupported, formatContent } from "../services/formatService";
import { searchCountExtension } from "../services/searchCount";
import { useTabsStore, type Tab } from "../stores/tabsStore";
import { useSettingsStore } from "../stores/settingsStore";
import type { LanguageId } from "../services/language";

const emit = defineEmits<{
  (e: "cursor", c: { line: number; col: number }): void;
  (e: "ready", api: { undo: () => void; redo: () => void; format: () => Promise<void>; search: () => void }): void;
}>();

const tabsStore = useTabsStore();
const settingsStore = useSettingsStore();
const message = useMessage();
const editorHost = ref<HTMLDivElement | null>(null);
let view: EditorView | null = null;

// Compartment：语言、主题与软换行的独立扩展槽，运行时可整体替换，不影响文档/历史。
const languageCompartment = new Compartment();
const themeCompartment = new Compartment();
const wrapCompartment = new Compartment();
let mediaQuery: MediaQueryList | null = null;

/** 当前明暗主题扩展：跟随系统 prefers-color-scheme（SIS-FUNC-2 主题联动）。 */
function themeExtension(): Extension {
  return mediaQuery?.matches ? oneDark : [];
}

/** 重建语言扩展（按当前标签语言）；用于手动切换语言后整体替换。 */
function languageExtensions(lang: LanguageId): Extension {
  return languageExtension(lang);
}

/** 格式化当前文件（SIS-FUNC-5）：整文件原地替换 + 进撤销栈 + toast 反馈。
 *  语法错误/不支持语言：提示并保持原文不变。 */
async function formatCurrent(): Promise<void> {
  const tab = tabsStore.activeTab;
  if (!view || !tab) return;
  if (!isFormatSupported(tab.language)) {
    message.warning(`当前语言（${tab.language}）不支持格式化`);
    return;
  }
  const before = view.state.doc.toString();
  try {
    const after = await formatContent(tab.language, before);
    if (after === before) {
      message.info("已格式化（内容无变化）");
      return;
    }
    // 整文件替换为一次编辑操作（进撤销栈，可 Ctrl+Z 回退）；尽量保持光标相对位置
    const head = Math.min(view.state.selection.main.head, after.length);
    view.dispatch({
      changes: { from: 0, to: before.length, insert: after },
      selection: { anchor: head },
    });
    message.success("已格式化");
  } catch (e) {
    message.error(`格式化失败：${e instanceof Error ? e.message : String(e)}`);
  }
}

/** Ctrl+Shift+F 格式化快捷键（SIS-FUNC-5）。
 *  注意：不用 CM6 keymap（"Mod-Shift-f"）——实测该绑定在 Shift 组合下
 *  会被搜索面板的 "Mod-f" 抢先命中（event.key 大小写差异：Playwright 合成
 *  小写 "f" 走 A 分支拼出 "Ctrl-f" 命中 openSearchPanel），改用
 *  Prec.highest domEventHandlers 直接拦截，兼容 event.key 大小写两种形态。 */
function formatKeydownHandler(): Extension {
  return Prec.highest(
    EditorView.domEventHandlers({
      keydown: (e, v) => {
        if (
          (e.ctrlKey || e.metaKey) &&
          e.shiftKey &&
          !e.altKey &&
          (e.key === "f" || e.key === "F")
        ) {
          void formatCurrent();
          return true; // 已处理：阻止默认行为并停止后续 handler（含 keymap）
        }
        return false;
      },
    })
  );
}

/** 空编辑器 state：注册 theme/language 两个 Compartment 槽位。
 *  注意：必须在所有创建的 state 中都注册同一对 compartment 实例，
 *  否则后续 reconfigure 找不到配置槽会被静默忽略（本组件关键坑，FUNC-2 排查所得）。 */
function emptyState(): EditorState {
  return EditorState.create({
    doc: "",
    extensions: [
      basicSetup,
      themeCompartment.of(themeExtension()),
      languageCompartment.of([]),
      wrapCompartment.of(settingsStore.wordWrap ? EditorView.lineWrapping : []),
      search({ top: true }),
      searchCountExtension,
      formatKeydownHandler(),
      keymap.of([indentWithTab]),
    ],
  });
}

function createState(tab: Tab): EditorState {
  const tabId = tab.id;
  return EditorState.create({
    doc: tab.content,
    extensions: [
      basicSetup,
      themeCompartment.of(themeExtension()),
      languageCompartment.of(languageExtensions(tab.language)),
      wrapCompartment.of(settingsStore.wordWrap ? EditorView.lineWrapping : []),
      search({ top: true }),
      searchCountExtension,
      formatKeydownHandler(),
      keymap.of([indentWithTab]),
      EditorView.updateListener.of((u) => {
        if (u.docChanged) {
          const t = tabsStore.tabs.find((x) => x.id === tabId);
          if (t) {
            tabsStore.updateContent(tabId, u.state.doc.toString());
            // markRaw：EditorState 是外部对象，存进 Pinia reactive 会被 Vue 深度代理，
            // 破坏 Compartment 实例身份（===）比较导致 reconfigure 静默失效（FUNC-2 关键坑）
            t.cmState = markRaw(u.state);
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

/** 切换语言：替换语言 Compartment（不触碰历史/主题）。
 *  注意：不能在这里写 t.cmState——Ctrl+N 新建时 language watch 先于
 *  activeTabId watch 触发，会把「空初始 state」写进新标签的 cmState，
 *  导致 switchToTab 恢复坏 state（FUNC-2 排查所得）。cmState 由
 *  updateListener/switchToTab 统一维护，语言对齐在 switchToTab 恢复后做。 */
function applyLanguage(lang: LanguageId) {
  view?.dispatch({
    effects: languageCompartment.reconfigure(languageExtensions(lang)),
  });
}

/** 切换明暗主题：替换主题 Compartment（不触碰文档）。 */
function applyTheme() {
  view?.dispatch({
    effects: themeCompartment.reconfigure(themeExtension()),
  });
}

/** 切换软换行（SIS-FUNC-8）：替换 wrap Compartment；lineWrapping 仅影响显示，不写入文档。 */
function applyWrap() {
  view?.dispatch({
    effects: wrapCompartment.reconfigure(settingsStore.wordWrap ? EditorView.lineWrapping : []),
  });
}

/** 切换到当前激活标签：恢复其 cmState 或新建；无标签则置空。 */
function switchToTab() {
  if (!view) return;
  const tab = tabsStore.activeTab;
  if (!tab) {
    view.setState(emptyState());
    return;
  }
  if (tab.cmState && tab.cmState.doc.toString() === tab.content) {
    view.setState(tab.cmState);
    emitCursor(tab.cmState);
    applyTheme(); // 恢复旧 state 后重推当前主题（避免主题过期）
    applyWrap(); // 恢复旧 state 后重推当前软换行（wrap 配置可能过期）
    applyLanguage(tab.language); // 恢复后对齐语言（cmState 缓存可能过期）
  } else {
    // cmState 缺失或内容过期（如 FUNC-6 对比合并外部写回）→ 以 tab.content 重建
    const state = createState(tab);
    view.setState(state);
    tab.cmState = markRaw(state); // 同 updateListener：避免 Vue 代理破坏 Compartment 身份
    emitCursor(state);
  }
}

onMounted(() => {
  mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  view = new EditorView({
    parent: editorHost.value ?? undefined,
    state: emptyState(),
  });
  switchToTab();
  void settingsStore.init(); // 加载持久化设置；wordWrap 变化由下方 watch 同步到编辑器
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
    format: () => formatCurrent(),
    search: () => {
      view?.focus();
      if (view) openSearchPanel(view);
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
// 软换行开关（全局共享，SIS-FUNC-8）：状态变化即时作用于编辑器显示。
watch(
  () => settingsStore.wordWrap,
  (v, prev) => {
    if (v !== prev) applyWrap();
  }
);
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
/* FUNC-7：搜索面板顶部浮动（VS Code 风格，临时覆盖不压缩编辑区）。
 * CM6 默认 .cm-panels-bottom 底部内嵌；search({top:true}) 改顶部 + 本样式悬浮。
 * 面板位于 .editor-host 内，absolute 定位悬浮于编辑区上方。 */
.editor-host {
  position: relative;
}
.editor-host :deep(.cm-panels-top) {
  position: absolute;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 30;
  border: 1px solid var(--border-color, #ddd);
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.18);
  padding: 6px 10px;
  background: var(--search-panel-bg, #ffffff);
  color: inherit;
}
.editor-host :deep(.cm-search .cm-textfield) {
  background: var(--search-input-bg, #fff);
  border: 1px solid var(--border-color, #ddd);
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 13px;
}
.editor-host :deep(.cm-search label) {
  font-size: 12px;
  margin-left: 6px;
}
.editor-host :deep(.cm-search .cm-searchInfo) {
  margin-left: 8px;
  font-size: 12px;
  color: #888;
}
.editor-host :deep(.cm-search .cm-search-count) {
  margin-left: 10px;
  font-size: 12px;
  color: #555;
  white-space: nowrap;
}
.editor-host :deep(.cm-search .cm-search-count-error) {
  color: #d03050;
}
@media (prefers-color-scheme: dark) {
  .editor-host :deep(.cm-panels-top) {
    background: var(--search-panel-bg, #1e1e1e);
    border-color: #3c3c3c;
  }
  .editor-host :deep(.cm-search .cm-textfield) {
    background: #252526;
    color: #e0e0e0;
    border-color: #3c3c3c;
  }
}
</style>
