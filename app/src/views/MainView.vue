<script setup lang="ts">
/**
 * MainView：主编辑视图编排（SIS-FUNC-1）
 *
 * UI-1 §1 三段式布局（工具栏 / 标签栏+编辑主区 / 状态栏）的落地编排。
 * 附加：拖拽打开文件、窗口关闭 dirty 合并确认、全局快捷键（Ctrl+N/O/S/Shift+S）。
 */

import { onMounted, onBeforeUnmount, provide, ref, computed, type CSSProperties } from "vue";
import { useDialog, useMessage, NModal, NButton } from "naive-ui";
import ToolBar from "../components/ToolBar.vue";
import TabBar from "../components/TabBar.vue";
import EditorPane from "../components/EditorPane.vue";
import StatusBar from "../components/StatusBar.vue";
import CompareView from "../components/CompareView.vue";
import RecentEmpty from "../components/RecentEmpty.vue";
import AiPanel from "../components/AiPanel.vue";
import BriefModal from "../components/BriefModal.vue";
import { useTabsStore } from "../stores/tabsStore";
import { useAiStore } from "../stores/aiStore";
import { useSettingsStore } from "../stores/settingsStore";
import { readFile, pickFiles, basename } from "../services/fileService";
import { checkRecover, removeDraft, clearAllDrafts, type DraftRecord } from "../services/draftService";

const tabsStore = useTabsStore();
const aiStore = useAiStore();
const settingsStore = useSettingsStore();
const dialog = useDialog();
const message = useMessage();
const cursor = ref({ line: 1, col: 1 });

// ---- SIS-OPT-3：背景渲染层（chrome 区 + 编辑区各一套对比度/色温）----
/** 计算背景层样式：region=chrome(工具栏区) / editor(编辑区)。 */
function bgLayerStyle(region: "chrome" | "editor"): CSSProperties {
  const bg = settingsStore.background;
  const img = bg.image;
  const p = bg[region];
  const dark = settingsStore.resolvedTheme === "dark";
  // 对比度遮罩：暗主题用黑遮罩（保浅色文字），亮主题用白遮罩（保深色文字）
  const overlay = dark ? `rgba(0, 0, 0, ${p.contrast})` : `rgba(255, 255, 255, ${p.contrast})`;
  // 色温：t>0 暖（sepia+向红偏），t<0 冷（hue-rotate 向蓝偏）
  const t = p.temperature;
  const filter =
    t >= 0
      ? `sepia(${(t * 0.55).toFixed(3)}) hue-rotate(${(-t * 18).toFixed(1)}deg)`
      : `hue-rotate(${(-t * 45).toFixed(1)}deg)`;
  return {
    backgroundImage: img ? `url("${img}")` : "none",
    opacity: bg.opacity,
    filter,
    boxShadow: `inset 0 0 0 1000px ${overlay}`,
    display: region === "editor" && bg.mode === "outside" ? "none" : undefined,
  };
}
const bgChromeStyle = computed<CSSProperties>(() => bgLayerStyle("chrome"));
const bgEditorStyle = computed<CSSProperties>(() => bgLayerStyle("editor"));
const hasBg = computed(() => !!settingsStore.background.image);

interface EditorApi {
  undo: () => void;
  redo: () => void;
  format: () => Promise<void>;
  search: () => void;
  polish: (mode: "rewrite" | "polish" | "shorten" | "expand") => void;
  insertAtCursor: (text: string) => void;
  replaceRange: (from: number, to: number, text: string) => void;
  scrollToLine: (line: number) => void;
}
const editorApi: EditorApi = {
  undo: () => undefined,
  redo: () => undefined,
  format: () => Promise.resolve(),
  search: () => undefined,
  polish: () => undefined,
  insertAtCursor: () => undefined,
  replaceRange: () => undefined,
  scrollToLine: () => undefined,
};
provide<EditorApi>("editorApi", editorApi);

/** SIS-OPT-1：大纲锚点点击 -> 编辑器滚动定位 + 关闭简报浮层。 */
function onBriefLocate(line: number): void {
  editorApi.scrollToLine(line);
  aiStore.closeBrief();
}

// ---- AI 问答侧栏（SIS-AI-1：可折叠，ToolBar「AI 面板」开关）----
const aiPanelOpen = ref(false);
provide("aiPanelApi", { toggle: () => { aiPanelOpen.value = !aiPanelOpen.value; } });

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
        if (ok) {
          await clearAllDrafts(); // 正常退出清理全部草稿（SIS-FUNC-10：不留碎片）
          await getCurrentWindow().destroy();
        }
      } catch (e) {
        console.error("close confirm failed:", e);
        await getCurrentWindow().destroy(); // 异常兜底：强制销毁，避免窗口无法关闭
      }
    });
  } catch (e) {
    console.error("setup tauri events failed:", e);
  }
}

/**
 * 崩溃恢复（SIS-FUNC-10）：启动扫描草稿目录，有残留则弹窗「恢复 / 丢弃」。
 * 过期残留由 draftService.checkRecover 内部清理（不留碎片）。
 */
const recoverDrafts = ref<DraftRecord[]>([]);
const recoverModalOpen = ref(false);

async function setupRecovery(): Promise<void> {
  const drafts = await checkRecover();
  if (drafts.length) {
    recoverDrafts.value = drafts;
    recoverModalOpen.value = true;
  }
}

function onRecover(draft: DraftRecord): void {
  tabsStore.restoreDraft(draft);
  recoverDrafts.value = recoverDrafts.value.filter((d) => d.key !== draft.key);
  if (!recoverDrafts.value.length) recoverModalOpen.value = false;
}

function onDiscard(draft: DraftRecord): void {
  void removeDraft(draft.key);
  recoverDrafts.value = recoverDrafts.value.filter((d) => d.key !== draft.key);
  if (!recoverDrafts.value.length) recoverModalOpen.value = false;
}

function onDiscardAll(): void {
  for (const d of recoverDrafts.value) void removeDraft(d.key);
  recoverDrafts.value = [];
  recoverModalOpen.value = false;
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
  void setupRecovery(); // 启动扫描崩溃残留草稿（SIS-FUNC-10）
  void aiStore.init(); // 加载 AI 配置（SIS-AI-1）
  void openLaunchArgs(); // SIS-OPT-4：启动命令行文件参数 -> 打开为标签
});

/** SIS-OPT-4：Tauri 启动带文件参数时逐个打开为标签（复用 openPath 链路，去重/最近文件语义一致）。 */
async function openLaunchArgs(): Promise<void> {
  if (!isTauri()) return;
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const paths = (await invoke("get_launch_args")) as string[];
    for (const p of paths) {
      await tabsStore.openPath(p);
    }
  } catch (e) {
    console.error("open launch args failed:", e);
  }
}

onBeforeUnmount(() => {
  window.removeEventListener("keydown", onKeydown);
  unlistenDrag?.();
  unlistenClose?.();
});
</script>

<template>
  <div class="main-view" :class="{ 'has-bg': hasBg }" :data-bg-mode="settingsStore.background.mode">
    <!-- SIS-OPT-3：背景分层（chrome 顶/底 + 编辑区中；mode=outside 时编辑层隐藏） -->
    <div class="bg-layer bg-top" :style="bgChromeStyle"></div>
    <div class="bg-layer bg-mid" :style="bgEditorStyle"></div>
    <div class="bg-layer bg-bot" :style="bgChromeStyle"></div>
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
      <RecentEmpty v-else-if="!tabsStore.activeTab" />
      <EditorPane
        v-else
        @cursor="cursor = $event"
        @ready="
          editorApi.undo = $event.undo;
          editorApi.redo = $event.redo;
          editorApi.format = $event.format;
          editorApi.search = $event.search;
          editorApi.polish = $event.polish;
          editorApi.insertAtCursor = $event.insertAtCursor;
          editorApi.replaceRange = $event.replaceRange;
          editorApi.scrollToLine = $event.scrollToLine;
        "
      />
      <!-- SIS-AI-1：AI 问答侧栏（ToolBar「AI 面板」开关，可折叠） -->
    <AiPanel v-if="aiPanelOpen" />
    </div>
    <StatusBar :cursor="cursor" />

    <!-- SIS-OPT-1：AI 文档简报 + 大纲锚点浮层 -->
    <BriefModal @locate="onBriefLocate" />

    <!-- 对比源选择弹窗（SIS-FUNC-6） -->
    <n-modal v-model:show="compareModalOpen" preset="card" title="选择对比源" style="width: 420px">
      <div class="compare-src-options">
        <n-button block @click="startCompareTwoFiles">打开两个文件对比</n-button>
        <n-button block @click="startCompareClipboard" :disabled="!tabsStore.activeTab">当前文件 vs 剪贴板</n-button>
      </div>
    </n-modal>

    <!-- 崩溃恢复草稿弹窗（SIS-FUNC-10：残留草稿恢复/丢弃） -->
    <n-modal v-model:show="recoverModalOpen" preset="card" title="检测到未保存的草稿" style="width: 480px">
      <div class="recover-list">
        <div v-for="d in recoverDrafts" :key="d.key" class="recover-item">
          <div class="recover-info">
            <div class="recover-title">{{ d.title }}</div>
            <div class="recover-path">{{ d.key }}</div>
          </div>
          <div class="recover-actions">
            <n-button size="small" @click="onRecover(d)">恢复</n-button>
            <n-button size="small" @click="onDiscard(d)">丢弃</n-button>
          </div>
        </div>
      </div>
      <template #footer>
        <n-button size="small" @click="onDiscardAll">全部丢弃</n-button>
      </template>
    </n-modal>
  </div>
</template>

<style scoped>
.main-view {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  position: relative;
}
/* SIS-OPT-3：背景层定位（toolbar 40 + tabbar 36 / 编辑区 / statusbar 26） */
.bg-top {
  top: 0;
  height: 76px;
}
.bg-mid {
  top: 76px;
  bottom: 26px;
}
.bg-bot {
  bottom: 0;
  height: 26px;
}
.editor-area {
  flex: 1;
  min-height: 0;
  display: flex;
  background: var(--editor-bg, #fff);
}
.editor-area > :first-child {
  flex: 1;
  min-width: 0;
}
.compare-src-options {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.recover-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 320px;
  overflow: auto;
}
.recover-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border: 1px solid var(--border-color, #eee);
  border-radius: 4px;
}
.recover-info {
  flex: 1;
  min-width: 0;
}
.recover-title {
  font-size: 13px;
  font-weight: 500;
}
.recover-path {
  font-size: 11px;
  color: #999;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.recover-actions {
  display: flex;
  gap: 6px;
  flex: none;
}
</style>
