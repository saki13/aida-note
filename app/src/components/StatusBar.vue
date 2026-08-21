<script setup lang="ts">
/**
 * StatusBar：状态栏（SIS-FUNC-1 / SIS-FUNC-2）
 *
 * UI-1 §5 五槽位：光标行列 / 编码 / 语法语言 / 软换行状态 / 缩放。
 * 本轮实现行列、编码、语言（读 tabsStore）；语言槽位为 NDropdown 可手动切换
 * （SIS-FUNC-2 建议项，setLanguage 覆盖自动识别）；软换行（FUNC-8）与缩放
 * （FUNC-1 基础）显示当前值占位，开关能力后续 Sprint 解锁。
 */

import { computed, ref } from "vue";
import { NDropdown, type DropdownOption } from "naive-ui";
import { LANGUAGE_REGISTRY } from "../services/languageRegistry";
import type { LanguageId } from "../services/language";
import { useTabsStore } from "../stores/tabsStore";

const props = defineProps<{ cursor: { line: number; col: number } }>();

const tabsStore = useTabsStore();
const tab = computed(() => tabsStore.activeTab);
const showLangMenu = ref(false);

const encoding = computed(() =>
  tab.value ? (tab.value.hadBom ? "UTF-8 BOM" : "UTF-8") : "UTF-8"
);

const languageLabel = computed(() => {
  if (!tab.value) return "—";
  return (
    LANGUAGE_REGISTRY.find((e) => e.id === tab.value!.language)?.label ??
    tab.value!.language
  );
});

/** 语言下拉选项（来自注册表，配置化：新增语言自动出现）。 */
const languageOptions: DropdownOption[] = LANGUAGE_REGISTRY.map((e) => ({
  key: e.id,
  label: e.label,
}));

function selectLanguage(key: string | number): void {
  const tabId = tab.value?.id;
  if (tabId === undefined) return;
  tabsStore.setLanguage(tabId, key as LanguageId);
}
</script>

<template>
  <div class="status-bar">
    <span class="item">行 {{ props.cursor.line }}, 列 {{ props.cursor.col }}</span>
    <span class="item">{{ encoding }}</span>
    <n-dropdown
      :show="showLangMenu"
      :options="languageOptions"
      trigger="click"
      @select="selectLanguage"
      @update:show="showLangMenu = $event"
    >
      <span class="item lang-switch" title="切换语法高亮语言">{{ languageLabel }} ▾</span>
    </n-dropdown>
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
.lang-switch {
  cursor: pointer;
  padding: 0 4px;
  border-radius: 3px;
}
.lang-switch:hover {
  background: var(--border-color, #ddd);
}
</style>
