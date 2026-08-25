<script setup lang="ts">
/**
 * BriefPanel：AI 简报悬窗（SIS-OPT-5，替代 v1 的 BriefModal 弹窗）
 *
 * 右上角浮动面板：可收起为小图标 / 关闭 / 经工具栏「AI 简报」再打开。
 * 简报缓存（aiStore.briefCache，按文件 key）命中直接展示；刷新重新生成；
 * 生成中关闭悬窗不中断（后台完成写缓存，重开展示）。
 * 切换标签跟随当前文件：有缓存展示、无缓存空态 + 生成按钮。
 */
import { computed, watch } from "vue";
import { NButton } from "naive-ui";
import { useAiStore, type BriefRecord } from "../stores/aiStore";
import { useTabsStore } from "../stores/tabsStore";
import { basename } from "../services/fileService";

const emit = defineEmits<{ (e: "locate", line: number): void }>();
const aiStore = useAiStore();
const tabsStore = useTabsStore();

// 切换标签：悬窗绑定跟随当前文件（有缓存展示、无缓存空态，不自动生成）
watch(
  () => tabsStore.activeTab,
  (tab) => aiStore.updateActiveKey(tab),
  { immediate: true },
);

const activeTab = computed(() => tabsStore.activeTab);
const activeRec = computed<BriefRecord | null>(() => {
  const key = aiStore.briefActiveKey;
  return key ? (aiStore.briefCache[key] ?? null) : null;
});
const fileName = computed(() => (activeTab.value ? basename(activeTab.value.title) : ""));
const minimized = computed(() => aiStore.briefUi.minimized);
const visible = computed(() => aiStore.briefUi.visible);
/** 收起态小图标状态点：done=已生成 / loading=转圈 / error=失败 / 无记录=未生成 */
const statusDot = computed<"done" | "loading" | "error" | "none">(() => {
  const rec = activeRec.value;
  if (!rec) return "none";
  return rec.status;
});

function onClose(): void {
  aiStore.closeBrief();
}
function onMinimize(): void {
  aiStore.toggleBriefMinimized();
}
function onRefresh(): void {
  if (!activeTab.value) return;
  void aiStore.refreshBrief(activeTab.value);
}
function onGenerate(): void {
  if (!activeTab.value) return;
  void aiStore.generateBrief(activeTab.value);
}
</script>

<template>
  <!-- 收起态：右上角小胶囊图标（悬窗隐藏时也不渲染） -->
  <div v-if="visible && minimized" class="brief-mini" title="AI 简报" @click="aiStore.toggleBriefMinimized()">
    <span class="brief-mini-dot" :class="statusDot"></span>
    <span>简报</span>
  </div>

  <!-- 展开态：右上角悬窗 -->
  <div v-if="visible && !minimized" class="brief-panel">
    <div class="brief-head">
      <span class="brief-title">AI 简报</span>
      <span class="brief-file" :title="activeTab?.filePath ?? ''">{{ fileName }}</span>
      <div class="brief-head-actions">
        <n-button size="tiny" quaternary title="重新生成" :disabled="!activeTab || activeRec?.status === 'loading'" @click="onRefresh">刷新</n-button>
        <n-button size="tiny" quaternary title="收起为图标" @click="onMinimize">—</n-button>
        <n-button size="tiny" quaternary title="关闭" @click="onClose">×</n-button>
      </div>
    </div>
    <div class="brief-body">
      <!-- loading -->
      <div v-if="activeRec?.status === 'loading'" class="brief-tip brief-loading">正在生成简报…</div>
      <!-- error -->
      <div v-else-if="activeRec?.status === 'error'" class="brief-tip brief-error">{{ activeRec.error }}</div>
      <!-- 无记录：空态 + 生成按钮 -->
      <div v-else-if="!activeRec" class="brief-tip brief-empty">
        <div>当前文件还没有简报</div>
        <n-button size="small" type="primary" :disabled="!activeTab" @click="onGenerate">生成简报</n-button>
      </div>
      <!-- done：简报 + 大纲 -->
      <template v-else>
        <div class="brief-section">
          <div class="brief-section-title">简报</div>
          <div class="brief-summary">{{ activeRec.summary }}</div>
        </div>
        <div class="brief-section">
          <div class="brief-section-title">大纲（点击定位）</div>
          <div v-if="activeRec.outline.length === 0" class="brief-tip">未检测到标题结构</div>
          <div v-else class="brief-outline">
            <div
              v-for="o in activeRec.outline"
              :key="o.line"
              class="brief-anchor"
              :style="{ paddingLeft: (o.level - 1) * 14 + 6 + 'px' }"
              @click="emit('locate', o.line)"
            >
              <span class="brief-anchor-dot"></span>
              <span class="brief-anchor-title">{{ o.title }}</span>
              <span class="brief-anchor-line">行 {{ o.line }}</span>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.brief-panel {
  position: absolute;
  top: 84px;
  right: 12px;
  width: 380px;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border-color, #ddd);
  border-radius: 8px;
  background: var(--floating-bg, #fff);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.18);
  z-index: 20;
  overflow: hidden;
}
.brief-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px 6px 12px;
  border-bottom: 1px solid var(--border-color, #ddd);
}
.brief-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-color, #333);
  flex: none;
}
.brief-file {
  flex: 1;
  font-size: 12px;
  color: var(--text-color-secondary, #888);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.brief-head-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  flex: none;
}
.brief-body {
  padding: 10px 12px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.brief-tip {
  font-size: 13px;
  color: var(--text-color-secondary, #888);
  line-height: 1.6;
}
.brief-loading {
  color: var(--accent, #2080f0);
}
.brief-error {
  color: #d03050;
}
.brief-empty {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}
.brief-section-title {
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 6px;
  color: var(--text-color, #333);
}
.brief-summary {
  white-space: pre-wrap;
  line-height: 1.7;
  font-size: 13px;
  color: var(--text-color, #333);
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
  padding: 4px 6px;
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
/* 收起态小胶囊 */
.brief-mini {
  position: absolute;
  top: 84px;
  right: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border: 1px solid var(--border-color, #ddd);
  border-radius: 20px;
  background: var(--floating-bg, #fff);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  font-size: 12px;
  color: var(--text-color, #333);
  cursor: pointer;
  z-index: 20;
}
.brief-mini:hover {
  color: var(--accent, #2080f0);
}
.brief-mini-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex: none;
}
.brief-mini-dot.done {
  background: #18a058;
}
.brief-mini-dot.loading {
  background: #2080f0;
  animation: brief-spin 1s linear infinite;
}
.brief-mini-dot.error {
  background: #d03050;
}
.brief-mini-dot.none {
  background: #bbb;
}
@keyframes brief-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
