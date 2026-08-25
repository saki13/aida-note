<script setup lang="ts">
/**
 * BriefModal：AI 文档简报 + 大纲锚点浮层（SIS-OPT-1）
 *
 * 简报正文由 aiStore.brief（AI 流式生成）驱动；大纲为本地解析（parseOutline），
 * 点击大纲项 emit locate(line)，由 MainView 调用编辑器 scrollToLine 真实定位。
 */
import { NModal } from "naive-ui";
import { useAiStore } from "../stores/aiStore";

const emit = defineEmits<{ (e: "locate", line: number): void }>();
const aiStore = useAiStore();

function onShowChange(show: boolean): void {
  if (!show) aiStore.closeBrief();
}
</script>

<template>
  <n-modal
    :show="aiStore.brief.open"
    preset="card"
    title="AI 文档简报"
    style="width: 540px"
    :mask-closable="true"
    @update:show="onShowChange"
  >
    <div class="brief-body">
      <div class="brief-section">
        <div class="brief-section-title">简报</div>
        <div v-if="aiStore.brief.loading" class="brief-loading">正在生成简报…</div>
        <div v-else-if="aiStore.brief.error" class="brief-error">{{ aiStore.brief.error }}</div>
        <div v-else-if="aiStore.brief.summary" class="brief-summary">{{ aiStore.brief.summary }}</div>
        <div v-else class="brief-empty">暂无简报内容</div>
      </div>
      <div class="brief-section">
        <div class="brief-section-title">大纲（点击定位）</div>
        <div v-if="aiStore.brief.outline.length === 0" class="brief-empty">未检测到标题结构</div>
        <div v-else class="brief-outline">
          <div
            v-for="o in aiStore.brief.outline"
            :key="o.line"
            class="brief-anchor"
            :style="{ paddingLeft: (o.level - 1) * 16 + 6 + 'px' }"
            @click="emit('locate', o.line)"
          >
            <span class="brief-anchor-dot"></span>
            <span class="brief-anchor-title">{{ o.title }}</span>
            <span class="brief-anchor-line">行 {{ o.line }}</span>
          </div>
        </div>
      </div>
    </div>
  </n-modal>
</template>

<style scoped>
.brief-body {
  max-height: 60vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.brief-section-title {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--text-color, #333);
}
.brief-summary {
  white-space: pre-wrap;
  line-height: 1.7;
  font-size: 13px;
  color: var(--text-color, #333);
}
.brief-loading,
.brief-empty {
  color: var(--text-color-secondary, #888);
  font-size: 13px;
  padding: 4px 0;
}
.brief-error {
  color: #d03050;
  font-size: 13px;
}
.brief-outline {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.brief-anchor {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 6px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  color: var(--text-color, #333);
}
.brief-anchor:hover {
  background: var(--hover-bg, rgba(0, 0, 0, 0.04));
  color: var(--accent, #2080f0);
}
.brief-anchor-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--accent, #2080f0);
  flex: none;
}
.brief-anchor-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.brief-anchor-line {
  font-size: 12px;
  color: var(--text-color-secondary, #888);
  flex: none;
}
</style>
