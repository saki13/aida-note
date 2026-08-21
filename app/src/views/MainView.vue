<script setup lang="ts">
/**
 * MainView：主编辑视图编排（SIS-FUNC-1）
 *
 * UI-1 §1 三段式布局（工具栏 / 标签栏+编辑主区 / 状态栏）的落地编排。
 * 附加：拖拽打开文件、窗口关闭 dirty 合并确认、全局快捷键（Ctrl+N/O/S/Shift+S）。
 */

import { onMounted, onBeforeUnmount, provide, ref } from "vue";
import { useDialog } from "naive-ui";
import ToolBar from "../components/ToolBar.vue";
import TabBar from "../components/TabBar.vue";
import EditorPane from "../components/EditorPane.vue";
import StatusBar from "../components/StatusBar.vue";
import { useTabsStore } from "../stores/tabsStore";
import { readFile } from "../services/fileService";

const tabsStore = useTabsStore();
const dialog = useDialog();
const cursor = ref({ line: 1, col: 1 });

interface EditorApi {
  undo: () => void;
  redo: () => void;
}
const editorApi: EditorApi = { undo: () => undefined, redo: () => undefined };
provide<EditorApi>("editorApi", editorApi);

function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

async function openPaths(paths: string[]): Promise<void> {
  for (const path of paths) {
    try {
      const { content, hadBom } = await readFile(path);
      tabsStore.openTab({ filePath: path, content, hadBom });
    } catch (e) {
      console.error(`open file failed: ${path}`, e);
    }
  }
}

let unlistenDrag: (() => void) | null = null;
let unlistenClose: (() => void) | null = null;

async function setupTauriEvents(): Promise<void> {
  if (!isTauri()) return;
  try {
    const { getCurrentWebview } = await import("@tauri-apps/api/webview");
    unlistenDrag = await getCurrentWebview().onDragDropEvent((event) => {
      if (event.payload.type === "drop") {
        void openPaths(event.payload.paths);
      }
    });

    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    unlistenClose = await getCurrentWindow().onCloseRequested(async (event) => {
      try {
        const ok = await tabsStore.confirmCloseAllDirty(dialog);
        if (!ok) event.preventDefault();
      } catch (e) {
        // 确认流程异常时不阻止关闭（避免窗口无法关闭）
        console.error("close confirm failed:", e);
      }
    });
  } catch (e) {
    console.error("setup tauri events failed:", e);
  }
}

function onKeydown(e: KeyboardEvent): void {
  if (!(e.ctrlKey || e.metaKey)) return;
  const key = e.key.toLowerCase();
  if (key === "n") {
    e.preventDefault();
    tabsStore.createUntitled();
  } else if (key === "o") {
    e.preventDefault();
    void tabsStore.openFilesViaDialog();
  } else if (key === "s") {
    e.preventDefault();
    const tab = tabsStore.activeTab;
    if (tab) void (e.shiftKey ? tabsStore.saveTabAs(tab.id) : tabsStore.saveTab(tab.id));
  }
}

onMounted(() => {
  window.addEventListener("keydown", onKeydown);
  void setupTauriEvents();
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", onKeydown);
  unlistenDrag?.();
  unlistenClose?.();
});
</script>

<template>
  <div class="main-view">
    <ToolBar />
    <TabBar />
    <div class="editor-area">
      <EditorPane @cursor="cursor = $event" @ready="editorApi.undo = $event.undo; editorApi.redo = $event.redo" />
    </div>
    <StatusBar :cursor="cursor" />
  </div>
</template>

<style scoped>
.main-view {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}
.editor-area {
  flex: 1;
  min-height: 0;
  background: #fff;
}
</style>
