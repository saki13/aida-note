<script setup lang="ts">
/**
 * ToolBar：工具栏（SIS-FUNC-1）
 *
 * UI-1 §4 映射：本轮实现功能 1-5（新建/打开/保存/另存为/撤销/重做，属 FUNC-1 DoD）；
 * 6-12 禁用占位（对应 FUNC-7/5/8/6/9/AI-1/设置，后续 Sprint 解锁），保持映射可见防对不齐。
 */

import { inject, computed } from "vue";
import { NTooltip, NButton } from "naive-ui";
import { useTabsStore } from "../stores/tabsStore";
import { isFormatSupported } from "../services/formatService";

interface EditorApi {
  undo: () => void;
  redo: () => void;
  format: () => Promise<void>;
  search: () => void;
}

const tabsStore = useTabsStore();
const editorApi = inject<EditorApi | null>("editorApi", null);

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
</script>

<template>
  <div class="tool-bar">
    <n-button size="small" @click="onNew" :disabled="false">新建</n-button>
    <n-button size="small" @click="onOpen">打开</n-button>
    <n-button size="small" @click="onSave" :disabled="!hasActive">保存</n-button>
    <n-button size="small" @click="onSaveAs" :disabled="!hasActive">另存为</n-button>

    <span class="sep"></span>

    <n-button size="small" @click="editorApi?.undo()" :disabled="!hasActive">撤销</n-button>
    <n-button size="small" @click="editorApi?.redo()" :disabled="!hasActive">重做</n-button>

    <span class="sep"></span>

    <!-- 以下为后续 Sprint 占位（UI-1 映射防对不齐，禁用） -->
    <n-tooltip trigger="hover"><template #trigger><n-button size="small" @click="onSearch" :disabled="!hasActive">搜索</n-button></template>FUNC-7（Sprint 3，Ctrl+F）</n-tooltip>
    <n-tooltip trigger="hover"><template #trigger><n-button size="small" @click="onFormat" :disabled="!canFormat">格式化</n-button></template>FUNC-5（Sprint 3，Ctrl+Shift+F）</n-tooltip>
    <n-tooltip trigger="hover"><template #trigger><n-button size="small" disabled>软换行</n-button></template>FUNC-8（Sprint 3）</n-tooltip>
    <n-tooltip trigger="hover"><template #trigger><n-button size="small" disabled>对比</n-button></template>FUNC-6（Sprint 3）</n-tooltip>

    <span class="sep"></span>

    <n-tooltip trigger="hover"><template #trigger><n-button size="small" disabled>主题</n-button></template>FUNC-9（Sprint 4）</n-tooltip>
    <n-tooltip trigger="hover"><template #trigger><n-button size="small" disabled>AI 面板</n-button></template>AI-1（Sprint 4）</n-tooltip>
    <n-tooltip trigger="hover"><template #trigger><n-button size="small" disabled>设置</n-button></template>ARCH-2 settingsStore（Sprint 4）</n-tooltip>

    <span class="spacer"></span>
    <span class="dirty-count" v-if="dirtyCount > 0">{{ dirtyCount }} 个未保存</span>
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
</style>
