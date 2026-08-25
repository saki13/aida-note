<script setup lang="ts">
/**
 * ToolBar：工具栏（SIS-FUNC-1）
 *
 * UI-1 §4 映射：本轮实现功能 1-5（新建/打开/保存/另存为/撤销/重做，属 FUNC-1 DoD）；
 * 6-12 禁用占位（对应 FUNC-7/5/8/6/9/AI-1/设置，后续 Sprint 解锁），保持映射可见防对不齐。
 */

import { inject, computed, ref } from "vue";
import { NTooltip, NButton, NDropdown, NModal, NSlider, useMessage, type DropdownOption } from "naive-ui";
import { useTabsStore } from "../stores/tabsStore";
import { useSettingsStore, type ThemePref } from "../stores/settingsStore";
import { useAiStore } from "../stores/aiStore";
import { isFormatSupported } from "../services/formatService";
import { isAiConfigured } from "../services/aiService";
import { basename } from "../services/fileService";
import type { AccentColor } from "../services/settingsService";

interface EditorApi {
  undo: () => void;
  redo: () => void;
  format: () => Promise<void>;
  search: () => void;
  polish: (mode: "rewrite" | "polish" | "shorten" | "expand") => void;
  replaceRange: (from: number, to: number, text: string) => void;
  scrollToLine: (line: number) => void;
}

const tabsStore = useTabsStore();
const settingsStore = useSettingsStore();
const aiStore = useAiStore();
const editorApi = inject<EditorApi | null>("editorApi", null);
const message = useMessage();

const hasActive = computed(() => tabsStore.activeTab !== null);
const dirtyCount = computed(() => tabsStore.tabs.filter((t) => t.dirty).length);
// 格式化仅支持 html/js/json/markdown（SIS-FUNC-5；SQL 置灰）
const canFormat = computed(() => {
  const tab = tabsStore.activeTab;
  return !!tab && isFormatSupported(tab.language);
});

async function onNew(): Promise<void> {
  tabsStore.createUntitled();
}

async function onOpen(): Promise<void> {
  await tabsStore.openFilesViaDialog();
}

async function onSave(): Promise<void> {
  const tab = tabsStore.activeTab;
  if (tab) await tabsStore.saveTab(tab.id);
}

async function onSaveAs(): Promise<void> {
  const tab = tabsStore.activeTab;
  if (tab) await tabsStore.saveTabAs(tab.id);
}

async function onFormat(): Promise<void> {
  await editorApi?.format();
}

function onSearch(): void {
  editorApi?.search();
}

async function onWrap(): Promise<void> {
  await settingsStore.setWordWrap(!settingsStore.wordWrap);
}

/** 打开对比源选择（SIS-FUNC-6，MainView 注入 compareApi）。 */
const compareApi = inject<{ open: () => void } | null>("compareApi", null);
function onCompare(): void {
  compareApi?.open();
}

/** 主题下拉（SIS-FUNC-9）：三态偏好 + 强调色（蓝/绿/紫），选择即持久化。 */
const THEME_LABEL: Record<ThemePref, string> = { light: "亮", dark: "暗", system: "跟随系统" };
const themeLabel = computed(() => THEME_LABEL[settingsStore.theme]);
const themeOptions: DropdownOption[] = [
  { label: "亮色", key: "light" },
  { label: "暗色", key: "dark" },
  { label: "跟随系统", key: "system" },
  { type: "divider" },
  { label: "强调色 · 蓝", key: "accent-blue" },
  { label: "强调色 · 绿", key: "accent-green" },
  { label: "强调色 · 紫", key: "accent-purple" },
];
function onThemeSelect(key: string): void {
  if (key === "light" || key === "dark" || key === "system") {
    void settingsStore.setTheme(key);
  } else {
    const accent = key.replace("accent-", "") as AccentColor;
    void settingsStore.setAccentColor(accent);
  }
}

/** 最近文件下拉（SIS-FUNC-11）：列表 + 点击打开；失效提示「文件不存在」并移除。 */
const recentOptions = computed<DropdownOption[]>(() => {
  if (!settingsStore.recentFiles.length) {
    return [{ label: "暂无最近文件", key: "__empty__", disabled: true }];
  }
  return settingsStore.recentFiles.map((p) => ({
    label: basename(p),
    tooltip: p, // 完整路径（建议项：路径过长截断展示）
    key: p,
  }));
});
async function onOpenRecent(path: string): Promise<void> {
  if (path === "__empty__") return;
  const ok = await tabsStore.openPath(path);
  if (!ok) {
    message.error(`文件不存在：${path}`);
    await settingsStore.removeRecentFile(path);
  }
}

/** ---- AI-1 入口（SIS-AI-1 §2/§4：AI 面板开关 + 润色四选 + 修复 mermaid） ---- */
const aiPanelApi = inject<{ toggle: () => void } | null>("aiPanelApi", null);
function onToggleAiPanel(): void {
  aiPanelApi?.toggle();
}

/** SIS-OPT-5：AI 简报悬窗入口（默认关闭：未配置 API 时点击提示；配置后打开悬窗，命中缓存不重复生成）。 */
function onBrief(): void {
  const tab = tabsStore.activeTab;
  if (!tab) return;
  if (!isAiConfigured(aiStore.aiConfig)) {
    message.warning("请先在 AI 面板配置 API 后使用 AI 简报");
    return;
  }
  void aiStore.ensureBrief(tab);
}

// ---- SIS-OPT-3：自定义背景（工具栏「背景」下拉 + 参数弹窗） ----
const bgModalOpen = ref(false);
const bgFileInput = ref<HTMLInputElement | null>(null);

function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

/** Uint8Array -> dataURL（分块防大文件栈溢出）。 */
function bytesToDataUrl(bytes: Uint8Array, mime: string): string {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return `data:${mime};base64,${btoa(bin)}`;
}

/** 选择/替换背景图：Tauri 走系统对话框读文件为 dataURL；浏览器走隐藏 file input。 */
async function onBgPick(): Promise<void> {
  if (isTauri()) {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const { readFile } = await import("@tauri-apps/plugin-fs");
      const sel = await open({
        multiple: false,
        filters: [{ name: "图片", extensions: ["png", "jpg", "jpeg", "gif", "webp", "bmp"] }],
      });
      if (typeof sel !== "string") return;
      const bytes = await readFile(sel);
      const ext = sel.split(".").pop()?.toLowerCase() ?? "png";
      const mime = ext === "jpg" ? "jpeg" : ext;
      await settingsStore.setBackgroundImage(bytesToDataUrl(bytes, `image/${mime}`));
      message.success("背景已设置");
    } catch (e) {
      message.error(`选择图片失败：${e instanceof Error ? e.message : String(e)}`);
    }
  } else {
    bgFileInput.value?.click();
  }
}

function onBgFileChange(e: Event): void {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    if (typeof reader.result === "string") {
      void settingsStore.setBackgroundImage(reader.result).then(() => message.success("背景已设置"));
    }
  };
  reader.readAsDataURL(file);
  input.value = ""; // 允许再次选择同一文件（替换语义）
}

const bgOptions = computed<DropdownOption[]>(() => [
  { label: "选择 / 替换图片", key: "bg-pick" },
  { label: "清除背景", key: "bg-clear", disabled: !settingsStore.background.image },
  { type: "divider" },
  { label: "模式：全应用背景", key: "bg-mode-app" },
  { label: "模式：仅编辑区外", key: "bg-mode-outside" },
  { type: "divider" },
  { label: "参数设置…", key: "bg-settings", disabled: !settingsStore.background.image },
]);

function onBgSelect(key: string): void {
  switch (key) {
    case "bg-pick":
      void onBgPick();
      break;
    case "bg-clear":
      void settingsStore.clearBackground();
      message.info("背景已清除");
      break;
    case "bg-mode-app":
      void settingsStore.setBackgroundMode("app");
      message.success("已切换为全应用背景");
      break;
    case "bg-mode-outside":
      void settingsStore.setBackgroundMode("outside");
      message.success("已切换为仅编辑区外背景");
      break;
    case "bg-settings":
      bgModalOpen.value = true;
      break;
  }
}

const polishOptions: DropdownOption[] = [
  { label: "改写", key: "rewrite" },
  { label: "润色", key: "polish" },
  { label: "缩短", key: "shorten" },
  { label: "扩写", key: "expand" },
];
function onPolishSelect(key: string): void {
  if (!tabsStore.activeTab) {
    message.warning("当前没有活动文件");
    return;
  }
  editorApi?.polish(key as "rewrite" | "polish" | "shorten" | "expand");
}

/** 提取文档第一个 mermaid 围栏块（```mermaid 或 ~~~mermaid，含围栏），供工具栏修复。 */
function firstMermaidBlock(content: string): { code: string; start: number; end: number } | null {
  const re = /(?:```|~~~)\s*mermaid\s*\n([\s\S]*?)(?:```|~~~)/;
  const m = re.exec(content);
  if (!m) return null;
  return { code: m[1], start: m.index, end: m.index + m[0].length };
}

async function onFixMermaid(): Promise<void> {
  const tab = tabsStore.activeTab;
  if (!tab) {
    message.warning("当前没有活动文件");
    return;
  }
  const block = firstMermaidBlock(tab.content);
  if (!block) {
    message.info("当前文档没有 mermaid 代码块");
    return;
  }
  try {
    const fixed = await aiStore.fixMermaid(block.code);
    if (!fixed.trim()) {
      message.warning("AI 未返回有效代码");
      return;
    }
    editorApi?.replaceRange(block.start, block.end, "```mermaid\n" + fixed.replace(/^```mermaid\s*\n?|```$/g, "").trim() + "\n```");
    message.success("mermaid 已修复");
  } catch (e) {
    message.error(e instanceof Error ? e.message : String(e));
  }
}
</script>

<template>
  <div class="tool-bar">
    <n-button size="small" @click="onNew" :disabled="false">新建</n-button>
    <n-button size="small" @click="onOpen">打开</n-button>
    <n-button size="small" @click="onSave" :disabled="!hasActive">保存</n-button>
    <n-button size="small" @click="onSaveAs" :disabled="!hasActive">另存为</n-button>

    <n-tooltip trigger="hover"><template #trigger>
      <n-dropdown :options="recentOptions" trigger="click" @select="onOpenRecent">
        <n-button size="small">最近</n-button>
      </n-dropdown>
    </template>最近文件（FUNC-11，Sprint 4）</n-tooltip>

    <span class="sep"></span>

    <n-button size="small" @click="editorApi?.undo()" :disabled="!hasActive">撤销</n-button>
    <n-button size="small" @click="editorApi?.redo()" :disabled="!hasActive">重做</n-button>

    <span class="sep"></span>

    <!-- 以下为后续 Sprint 占位（UI-1 映射防对不齐，禁用） -->
    <n-tooltip trigger="hover"><template #trigger><n-button size="small" @click="onSearch" :disabled="!hasActive">搜索</n-button></template>FUNC-7（Sprint 3，Ctrl+F）</n-tooltip>
    <n-tooltip trigger="hover"><template #trigger><n-button size="small" @click="onFormat" :disabled="!canFormat">格式化</n-button></template>FUNC-5（Sprint 3，Ctrl+Shift+F）</n-tooltip>
    <n-tooltip trigger="hover"><template #trigger><n-button size="small" @click="onWrap" :type="settingsStore.wordWrap ? 'primary' : 'default'">换行{{ settingsStore.wordWrap ? "：开" : "：关" }}</n-button></template>软换行（FUNC-8，Sprint 3，全局共享）</n-tooltip>
    <n-tooltip trigger="hover"><template #trigger><n-button size="small" @click="onCompare" :disabled="!hasActive">对比</n-button></template>FUNC-6（Sprint 3）</n-tooltip>

    <span class="sep"></span>

    <n-tooltip trigger="hover"><template #trigger>
      <n-dropdown :options="bgOptions" trigger="click" @select="onBgSelect">
        <n-button size="small">背景</n-button>
      </n-dropdown>
    </template>自定义背景（Sprint 6：选图/替换/清除/模式/透明度/对比度/色温）</n-tooltip>
    <n-tooltip trigger="hover"><template #trigger>
      <n-dropdown :options="themeOptions" :value="settingsStore.theme" trigger="click" @select="onThemeSelect">
        <n-button size="small">主题：{{ themeLabel }}</n-button>
      </n-dropdown>
    </template>主题切换（FUNC-9，Sprint 4：亮/暗/跟随系统 + 强调色）</n-tooltip>
    <n-tooltip trigger="hover"><template #trigger>
      <n-dropdown :options="polishOptions" trigger="click" @select="onPolishSelect">
        <n-button size="small" :disabled="!hasActive">AI 润色</n-button>
      </n-dropdown>
    </template>AI 润色（AI-1，Sprint 4：选中文本改写/润色/缩短/扩写）</n-tooltip>
    <n-tooltip trigger="hover"><template #trigger>
      <n-button size="small" :disabled="!hasActive" @click="onFixMermaid">修复 mermaid</n-button>
    </template>AI 修复 mermaid（AI-1，Sprint 4）</n-tooltip>
    <n-tooltip trigger="hover"><template #trigger><n-button size="small" @click="onToggleAiPanel">AI 面板</n-button></template>AI 问答侧栏（AI-1，Sprint 4，可折叠）</n-tooltip>
    <n-tooltip trigger="hover"><template #trigger>
      <n-button size="small" :disabled="!hasActive" @click="onBrief">AI 简报</n-button>
    </template>AI 简报悬窗（OPT-5，Sprint 7：右上角悬窗 + 按文件缓存 + 刷新）</n-tooltip>
    <n-tooltip trigger="hover"><template #trigger><n-button size="small" disabled>设置</n-button></template>ARCH-2 settingsStore（Sprint 4）</n-tooltip>

    <span class="spacer"></span>
    <span class="dirty-count" v-if="dirtyCount > 0">{{ dirtyCount }} 个未保存</span>

    <!-- SIS-OPT-3：隐藏文件选择（浏览器环境兜底） + 背景参数弹窗 -->
    <input ref="bgFileInput" type="file" accept="image/*" class="bg-file-input" @change="onBgFileChange" />
    <n-modal v-model:show="bgModalOpen" preset="card" title="背景参数" style="width: 480px">
      <div class="bg-param-label">全局透明度（{{ Math.round(settingsStore.background.opacity * 100) }}%）</div>
      <n-slider :value="Math.round(settingsStore.background.opacity * 100)" :min="0" :max="100" @update:value="(v: number) => void settingsStore.setBackgroundOpacity(v / 100)" />
      <div class="bg-param-grid">
        <div class="bg-param-col">
          <div class="bg-param-label">工具栏区 · 对比度（{{ Math.round(settingsStore.background.chrome.contrast * 100) }}）</div>
          <n-slider :value="Math.round(settingsStore.background.chrome.contrast * 100)" :min="0" :max="100" @update:value="(v: number) => void settingsStore.setBackgroundRegion('chrome', { contrast: v / 100 })" />
          <div class="bg-param-label">工具栏区 · 色温（{{ settingsStore.background.chrome.temperature.toFixed(2) }}）</div>
          <n-slider :value="settingsStore.background.chrome.temperature" :min="-1" :max="1" :step="0.05" @update:value="(v: number) => void settingsStore.setBackgroundRegion('chrome', { temperature: v })" />
        </div>
        <div class="bg-param-col">
          <div class="bg-param-label">编辑区 · 对比度（{{ Math.round(settingsStore.background.editor.contrast * 100) }}）</div>
          <n-slider :value="Math.round(settingsStore.background.editor.contrast * 100)" :min="0" :max="100" @update:value="(v: number) => void settingsStore.setBackgroundRegion('editor', { contrast: v / 100 })" />
          <div class="bg-param-label">编辑区 · 色温（{{ settingsStore.background.editor.temperature.toFixed(2) }}）</div>
          <n-slider :value="settingsStore.background.editor.temperature" :min="-1" :max="1" :step="0.05" @update:value="(v: number) => void settingsStore.setBackgroundRegion('editor', { temperature: v })" />
        </div>
      </div>
    </n-modal>
  </div>
</template>

<style scoped>
.tool-bar {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 40px;
  padding: 0 8px;
  background: var(--toolbar-bg, #fafafa);
  border-bottom: 1px solid var(--border-color, #ddd);
}
.sep {
  width: 1px;
  height: 20px;
  background: var(--border-color, #ddd);
  margin: 0 4px;
}
.spacer {
  flex: 1;
}
.dirty-count {
  font-size: 12px;
  color: #999;
}
.bg-file-input {
  display: none;
}
.bg-param-grid {
  display: flex;
  gap: 24px;
  margin-top: 12px;
}
.bg-param-col {
  flex: 1;
  min-width: 0;
}
.bg-param-label {
  font-size: 12px;
  color: var(--text-color, #333);
  margin: 8px 0 4px;
  opacity: 0.85;
}
</style>
