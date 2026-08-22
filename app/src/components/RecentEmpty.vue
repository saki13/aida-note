<script setup lang="ts">
/**
 * RecentEmpty：启动/无标签时的最近文件空态列表（SIS-FUNC-11）
 *
 * 无活动标签时展示最近打开文件（settingsStore.recentFiles），点击打开；
 * 文件失效（读盘失败）提示「文件不存在」并从列表移除。空列表显示引导文案。
 */

import { useMessage } from "naive-ui";
import { useTabsStore } from "../stores/tabsStore";
import { useSettingsStore } from "../stores/settingsStore";
import { basename } from "../services/fileService";

const tabsStore = useTabsStore();
const settingsStore = useSettingsStore();
const message = useMessage();

async function openRecent(path: string): Promise<void> {
  const ok = await tabsStore.openPath(path);
  if (!ok) {
    message.error(`文件不存在：${path}`);
    await settingsStore.removeRecentFile(path);
  }
}

async function removeRecent(path: string): Promise<void> {
  await settingsStore.removeRecentFile(path);
}
</script>

<template>
  <div class="recent-empty">
    <div class="recent-title">最近打开</div>
    <div v-if="settingsStore.recentFiles.length" class="recent-list">
      <div v-for="path in settingsStore.recentFiles" :key="path" class="recent-item">
        <button class="recent-open" :title="path" @click="openRecent(path)">
          <span class="recent-name">{{ basename(path) }}</span>
          <span class="recent-path">{{ path }}</span>
        </button>
        <button class="recent-remove" title="从最近列表移除" @click="removeRecent(path)">×</button>
      </div>
    </div>
    <div v-else class="recent-empty-tip">
      暂无最近文件<br />
      <span>新建或打开一个文件开始编辑</span>
    </div>
  </div>
</template>

<style scoped>
.recent-empty {
  height: 100%;
  overflow: auto;
  padding: 24px;
  background: var(--editor-bg, #fff);
  color: var(--editor-fg, #333);
}
.recent-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
}
.recent-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-width: 560px;
}
.recent-item {
  display: flex;
  align-items: center;
  gap: 4px;
}
.recent-open {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 6px 10px;
  border: 1px solid var(--border-color, #e4e4e7);
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  text-align: left;
}
.recent-open:hover {
  background: var(--hover-bg, #f2f2f4);
}
.recent-name {
  font-size: 13px;
  font-weight: 500;
}
.recent-path {
  font-size: 11px;
  color: #999;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}
.recent-remove {
  flex: none;
  width: 22px;
  height: 22px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: #999;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
}
.recent-remove:hover {
  background: #f0f0f0;
  color: #333;
}
.recent-empty-tip {
  margin-top: 40px;
  text-align: center;
  color: #999;
  font-size: 13px;
  line-height: 2;
}
@media (prefers-color-scheme: dark) {
  .recent-empty {
    background: #1e1e1e;
    color: #d4d4d4;
  }
  .recent-open {
    border-color: #333;
  }
  .recent-open:hover {
    background: #2a2a2a;
  }
  .recent-remove:hover {
    background: #333;
    color: #d4d4d4;
  }
}
</style>
