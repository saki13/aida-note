<script setup lang="ts">
/**
 * MainView：主编辑视图编排（SIS-FUNC-1）
 *
 * UI-1 §1 三段式布局（工具栏 / 标签栏+编辑主区 / 状态栏）的落地编排。
 * 附加：拖拽打开文件、窗口关闭 dirty 合并确认、全局快捷键（Ctrl+N/O/S/Shift+S）。
 */

import { onMounted, onBeforeUnmount, provide, ref } from "vue";
import { useDialog, useMessage, NModal, NButton } from "naive-ui";
import ToolBar from "../components/ToolBar.vue";
import TabBar from "../components/TabBar.vue";
import EditorPane from "../components/EditorPane.vue";
import StatusBar from "../components/StatusBar.vue";
import CompareView from "../components/CompareView.vue";
import { useTabsStore } from "../stores/tabsStore";
import { readFile, pickFiles, basename } from "../services/fileService";

const tabsStore = useTabsStore();
const dialog = useDialog();
const message = useMessage();
const cursor = ref({ line: 1, col: 1 });

interface EditorApi {
  undo: () => void;
  redo: () => void;
  format: () => Promise<void>;
  search: () => void;
}
const editorApi: EditorApi = { undo: () => undefined, redo: () => undefined, format: () => Promise.resolve(), search: () => undefined };
provide<EditorApi>("editorApi", editorApi);

// ---- 文件对比（SIS-FUNC-6）----
interface CompareState {
  leftTitle: string;
  rightTitle: string;
  leftText: string;
  rightText: string;
  leftWritable: boolean;
  rightWritable: boolean;
  leftTabId: number | null;
  rightTabId: number | null;
}
const compareState = ref<CompareState | null>(null);
const compareModalOpen = ref(false);

/** 工具栏「对比」入口（注入 ToolBar）。 */
provide("compareApi", { open: () => { compareModalOpen.value = true; } });

/** 对比源 1：打开两个独立文件（自动开标签，合并写回标签并置脏标记）。 */
async function startCompareTwoFiles(): Promise<void> {
  const paths = await pickFiles();
  if (paths.length < 2) {
    message.warning("请选择两个文件进行对比");
    return;
  }
  const [p1, p2] = paths;
  try {
    const f1 = await readFile(p1);
    const f2 = await readFile(p2);
    const t1 = tabsStore.openTab({ filePath: p1, content: f1.content, hadBom: f1.hadBom });
    const t2 = tabsStore.openTab({ filePath: p2, content: f2.content, hadBom: f2.hadBom });
    compareState.value = {
      leftTitle: basename(p1),
      rightTitle: basename(p2),
      leftText: f1.content,
      rightText: f2.content,
      leftWritable: true,
      rightWritable: true,
      leftTabId: t1,
      rightTabId: t2,
    };
    compareModalOpen.value = false;
  } catch (e) {
    message.error(`读取文件失败：${e instanceof Error ? e.message : String(e)}`);
  }
}

/** 对比源 2：当前文件 vs 剪贴板（剪贴板为只读一侧，合并方向=剪贴板→文件）。 */
async function startCompareClipboard(): Promise<void> {
  const tab = tabsStore.activeTab;
  if (!tab) {
    message.warning("当前没有活动文件");
    return;
  }
  let clip = "";
  try {
    clip = await navigator.clipboard.readText();
  } catch (e) {
    message.error("读取剪贴板失败（浏览器需授权剪贴板读取）");
    console.error("clipboard read failed:", e);
    return;
  }
  compareState.value = {
    leftTitle: tab.title,
    rightTitle: "剪贴板",
    leftText: tab.content,
    rightText: clip,
    leftWritable: true,
    rightWritable: false,
    leftTabId: tab.id,
    rightTabId: null,
  };
  compareModalOpen.value = false;
}

/** 合并结果写回对应文件标签并置脏标记（CompareView emit）。 */
function onCompareApply(side: "left" | "right", text: string): void {
  const s = compareState.value;
  if (!s) return;
  const tabId = side === "left" ? s.leftTabId : s.rightTabId;
  if (tabId !== null) tabsStore.updateContent(tabId, text);
  if (side === "left") s.leftText = text;
  else s.rightText = text;
}

function onCompareClose(): void {
  compareState.value = null;
}

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
      const hasDirty = tabsStore.tabs.some((t) => t.dirty);
      if (!hasDirty) return; // 无 dirty：直接关闭
      // Tauri 拦截模式：同步阻止本次关闭；确认通过后用 destroy() 直接销毁窗口。
      // 不能用 close()：close() 会再次触发 onCloseRequested，在首次拦截的时序下仍可能被
      // 再次 preventDefault 导致关不掉。destroy() 不重新触发 close requested，是官方推荐
      // 的「拦截后二次关闭」正确方式。
      event.preventDefault();
      try {
        const ok = await tabsStore.confirmCloseAllDirty(dialog);
        if (ok) await getCurrentWindow().destroy();
      } catch (e) {
        console.error("close confirm failed:", e);
        await getCurrentWindow().destroy(); // 异常兜底：强制销毁，避免窗口无法关闭
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
      <CompareView
        v-if="compareState"
        :left-title="compareState.leftTitle"
        :right-title="compareState.rightTitle"
        :left-text="compareState.leftText"
        :right-text="compareState.rightText"
        :left-writable="compareState.leftWritable"
        :right-writable="compareState.rightWritable"
        @close="onCompareClose"
        @apply="onCompareApply"
      />
      <EditorPane v-else @cursor="cursor = $event" @ready="editorApi.undo = $event.undo; editorApi.redo = $event.redo; editorApi.format = $event.format; editorApi.search = $event.search" />
    </div>
    <StatusBar :cursor="cursor" />

    <!-- 对比源选择弹窗（SIS-FUNC-6） -->
    <n-modal v-model:show="compareModalOpen" preset="card" title="选择对比源" style="width: 420px">
      <div class="compare-src-options">
        <n-button block @click="startCompareTwoFiles">打开两个文件对比</n-button>
        <n-button block @click="startCompareClipboard" :disabled="!tabsStore.activeTab">当前文件 vs 剪贴板</n-button>
      </div>
    </n-modal>
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
.compare-src-options {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
</style>
