<script setup lang="ts">
/**
 * StatusBar：状态栏（SIS-FUNC-1）
 *
 * UI-1 §5 五槽位：光标行列 / 编码 / 语法语言 / 软换行状态 / 缩放。
 * 本轮实现行列、编码、语言（读 tabsStore）；软换行（FUNC-8）与缩放（FUNC-1 基础）
 * 显示当前值占位，开关能力后续 Sprint 解锁。
 */

import { computed } from "vue";
import { useTabsStore } from "../stores/tabsStore";

const props = defineProps<{ cursor: { line: number; col: number } }>();

const tabsStore = useTabsStore();
const tab = computed(() => tabsStore.activeTab);

const encoding = computed(() =>
  tab.value ? (tab.value.hadBom ? "UTF-8 BOM" : "UTF-8") : "UTF-8"
);
const languageLabel = computed(() => {
  const map: Record<string, string> = {
    markdown: "Markdown",
    javascript: "JavaScript",
    json: "JSON",
    html: "HTML",
    sql: "SQL",
    plaintext: "纯文本",
  };
  return tab.value ? (map[tab.value.language] ?? tab.value.language) : "—";
});
</script>

<template>
  <div class="status-bar">
    <span class="item">行 {{ props.cursor.line }}, 列 {{ props.cursor.col }}</span>
    <span class="item">{{ encoding }}</span>
    <span class="item">{{ languageLabel }}</span>
    <span class="item" title="FUNC-8（Sprint 3）">换行:开</span>
    <span class="spacer"></span>
    <span class="item" title="缩放">缩放 100%</span>
  </div>
</template>

<style scoped>
.status-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 26px;
  padding: 0 10px;
  background: var(--statusbar-bg, #f0f0f0);
  border-top: 1px solid var(--border-color, #ddd);
  font-size: 12px;
  color: #555;
  user-select: none;
}
.spacer {
  flex: 1;
}
</style>
