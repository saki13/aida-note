<script setup lang="ts">
/**
 * TranslateView：AI 翻译双屏对比视图（SIS-OPT-8c）
 *
 * 左栏 = 原文语义句列表（sentenceService 断句）；右栏 = 简体中文译文（LLM 按序返回）。
 * 交互：鼠标悬停任一栏句子 -> 对侧同索引句子同步高亮（双向联动）；
 * 滚动联动（scrollTop 同步）；关闭不写回文件、不置脏（临时对比语义）。
 * 对齐：索引对齐（LLM 句数不一致时缺失补「（未对齐）」占位）。
 */
import { ref, computed, nextTick } from "vue";
import { NButton } from "naive-ui";
import { useAiStore } from "../stores/aiStore";

const emit = defineEmits<{ (e: "close"): void }>();
const props = defineProps<{ title: string }>();

const aiStore = useAiStore();

/** 滚动容器：用函数 ref（字符串 ref 在 status 分支切换下偶发未绑定，Sprint 8 实测） */
let leftScroller: HTMLElement | null = null;
let rightScroller: HTMLElement | null = null;
function setLeftRef(el: unknown): void {
  leftScroller = el as HTMLElement | null;
}
function setRightRef(el: unknown): void {
  rightScroller = el as HTMLElement | null;
}
let syncing = false;
/** 当前 hover 的句子索引（-1 = 无） */
const hoverIdx = ref(-1);

const st = computed(() => aiStore.translate);
const fileName = computed(() => {
  const t = props.title;
  const idx = Math.max(t.lastIndexOf("/"), t.lastIndexOf("\\"));
  return idx >= 0 ? t.slice(idx + 1) : t;
});

/** 右栏渲染行数 = max(原文句数, 译文句数)；缺失译文补占位。 */
const rows = computed<{ src: string; tgt: string }[]>(() => {
  const n = Math.max(st.value.src.length, st.value.tgt.length);
  const out: { src: string; tgt: string }[] = [];
  for (let i = 0; i < n; i++) {
    out.push({
      src: st.value.src[i]?.text ?? "（未对齐）",
      tgt: st.value.tgt[i] ?? "（未对齐）",
    });
  }
  return out;
});

/** 滚动联动：一侧滚动同步另一侧（同 CompareView）。 */
function onScroll(side: "left" | "right"): void {
  if (syncing) return;
  syncing = true;
  const from = side === "left" ? leftScroller : rightScroller;
  const to = side === "left" ? rightScroller : leftScroller;
  if (from && to) to.scrollTop = from.scrollTop;
  nextTick(() => {
    syncing = false;
  });
}

/** 重试回调：由 MainView 注入（复用原标签内容重新翻译）。 */
const retryFn = ref<(() => void) | null>(null);
function onRetry(): void {
  retryFn.value?.();
}
function setRetry(fn: () => void): void {
  retryFn.value = fn;
}
defineExpose({ setRetry });
</script>

<template>
  <div class="translate-view">
    <div class="translate-head">
      <span class="t-title">AI 翻译</span>
      <span class="t-file" :title="props.title">{{ fileName }}</span>
      <span class="t-lang">→ 简体中文</span>
      <span class="spacer"></span>
      <n-button size="tiny" quaternary title="关闭翻译" @click="emit('close')">×</n-button>
    </div>
    <div class="translate-body">
      <!-- loading -->
      <div v-if="st.status === 'loading'" class="t-tip t-loading">正在翻译…（语义断句、保留上下文）</div>
      <!-- error -->
      <div v-else-if="st.status === 'error'" class="t-tip t-error">
        <span>{{ st.error }}</span>
        <n-button size="tiny" type="primary" @click="onRetry">重试</n-button>
      </div>
      <!-- done：双屏 -->
      <template v-else-if="st.status === 'done'">
        <div class="t-panes">
          <div class="t-pane" :ref="setLeftRef" @scroll="onScroll('left')">
            <div class="t-pane-title">原文</div>
            <div
              v-for="(r, i) in rows"
              :key="i"
              class="t-sent"
              :class="{ active: hoverIdx === i, ghost: r.src === '（未对齐）' }"
              data-side="left"
              :data-idx="i"
              @mouseenter="hoverIdx = i"
              @mouseleave="hoverIdx = -1"
            >{{ r.src }}</div>
          </div>
          <div class="t-pane" :ref="setRightRef" @scroll="onScroll('right')">
            <div class="t-pane-title">译文（简体中文）</div>
            <div
              v-for="(r, i) in rows"
              :key="i"
              class="t-sent t-tgt"
              :class="{ active: hoverIdx === i, ghost: r.tgt === '（未对齐）' }"
              data-side="right"
              :data-idx="i"
              @mouseenter="hoverIdx = i"
              @mouseleave="hoverIdx = -1"
            >{{ r.tgt }}</div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.translate-view {
  flex: 1;
  min-width: 0;
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: var(--editor-bg, #fff);
}
.translate-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px 6px 12px;
  border-bottom: 1px solid var(--border-color, #eee);
  font-size: 13px;
}
.t-title {
  font-weight: 600;
  color: var(--text-color, #333);
  flex: none;
}
.t-file {
  flex: 0 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-color-secondary, #888);
}
.t-lang {
  flex: none;
  font-size: 12px;
  color: var(--accent, #2080f0);
  border: 1px solid var(--accent, #2080f0);
  border-radius: 10px;
  padding: 0 8px;
  line-height: 18px;
}
.spacer {
  flex: 1;
}
.t-tip {
  padding: 20px;
  font-size: 13px;
  line-height: 1.8;
  display: flex;
  align-items: center;
  gap: 10px;
}
.t-loading {
  color: var(--accent, #2080f0);
}
.t-error {
  color: #d03050;
}
.translate-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.t-panes {
  flex: 1;
  min-height: 0;
  display: flex;
}
.t-pane {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
  padding: 8px 10px;
  border-right: 1px solid var(--border-color, #eee);
}
.t-pane:last-child {
  border-right: none;
}
.t-pane-title {
  font-size: 12px;
  color: var(--text-color-secondary, #888);
  margin-bottom: 6px;
  position: sticky;
  top: 0;
  background: inherit;
  z-index: 1;
}
.t-sent {
  padding: 4px 8px;
  margin: 2px 0;
  border-radius: 4px;
  font-size: 13px;
  line-height: 1.7;
  cursor: pointer;
  transition: background-color 0.12s ease;
}
.t-sent.active {
  background: var(--accent-faint, rgba(32, 128, 240, 0.14));
  outline: 1px solid var(--accent, #2080f0);
}
.t-sent.ghost {
  opacity: 0.45;
}
.t-tgt {
  color: var(--text-color, #333);
}
</style>
