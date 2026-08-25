<script setup lang="ts">
/**
 * TabBar：标签栏（SIS-FUNC-1）
 *
 * UI-1 §3 交互：点击切换 / 关闭按钮（dirty 确认）/ 右键菜单（关闭、关闭其他、
 * 另存为）/ 脏标记圆点 / 超宽横向滚动。状态单一来源 tabsStore。
 */

import { ref } from "vue";
import { NDropdown, useDialog, type DropdownOption } from "naive-ui";
import { useTabsStore } from "../stores/tabsStore";

const tabsStore = useTabsStore();
const dialog = useDialog();

const showMenu = ref(false);
const menuX = ref(0);
const menuY = ref(0);
const menuTabId = ref<number | null>(null);

const options: DropdownOption[] = [
  { label: "关闭", key: "close" },
  { label: "关闭其他", key: "close-others" },
  { label: "另存为", key: "save-as" },
];

function onContextMenu(e: MouseEvent, tabId: number): void {
  e.preventDefault();
  menuTabId.value = tabId;
  menuX.value = e.clientX;
  menuY.value = e.clientY;
  showMenu.value = true;
}

async function onSelect(key: string): Promise<void> {
  showMenu.value = false;
  const id = menuTabId.value;
  if (id === null) return;
  if (key === "close") {
    await tabsStore.closeTab(id, { dialog });
  } else if (key === "close-others") {
    for (const t of [...tabsStore.tabs]) {
      if (t.id !== id) await tabsStore.closeTab(t.id, { dialog });
    }
  } else if (key === "save-as") {
    await tabsStore.saveTabAs(id);
  }
}

function onCloseClick(tabId: number): void {
  void tabsStore.closeTab(tabId, { dialog });
}
</script>

<template>
  <div class="tab-bar">
    <div class="tab-scroll">
      <div
        v-for="tab in tabsStore.tabs"
        :key="tab.id"
        class="tab"
        :class="{ active: tab.id === tabsStore.activeTabId }"
        @click="tabsStore.setActive(tab.id)"
        @contextmenu="onContextMenu($event, tab.id)"
      >
        <span v-if="tab.dirty" class="dirty-dot" title="未保存"></span>
        <span class="tab-title">{{ tab.title }}</span>
        <span class="tab-close" title="关闭" @click.stop="onCloseClick(tab.id)"
          >×</span
        >
      </div>
    </div>
    <n-dropdown
      :show="showMenu"
      :x="menuX"
      :y="menuY"
      :options="options"
      placement="bottom-start"
      trigger="manual"
      @select="onSelect"
      @clickoutside="showMenu = false"
    />
  </div>
</template>

<style scoped>
.tab-bar {
  display: flex;
  align-items: stretch;
  height: 36px;
  background: var(--tabbar-bg, #f3f3f3);
  border-bottom: 1px solid var(--border-color, #ddd);
  user-select: none;
}
.tab-scroll {
  display: flex;
  align-items: stretch;
  overflow-x: auto;
  overflow-y: hidden;
  flex: 1;
}
.tab-scroll::-webkit-scrollbar {
  height: 4px;
}
.tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 10px;
  max-width: 200px;
  min-width: 80px;
  cursor: pointer;
  border-right: 1px solid var(--border-color, #ddd);
  background: var(--tab-bg, #e9e9e9);
  color: var(--tab-fg, #333);
  white-space: nowrap;
}
.tab.active {
  background: var(--tab-active-bg, #fff);
  color: var(--tab-active-fg, #111);
  box-shadow: inset 0 2px 0 var(--accent, #18a058);
}
.tab-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
}
.dirty-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent, #18a058);
  flex-shrink: 0;
}
.tab-close {
  width: 16px;
  height: 16px;
  line-height: 14px;
  text-align: center;
  border-radius: 3px;
  font-size: 14px;
  flex-shrink: 0;
}
.tab-close:hover {
  background: rgba(0, 0, 0, 0.12);
}
</style>
