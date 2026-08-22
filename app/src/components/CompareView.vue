<script setup lang="ts">
/**
 * CompareView：双栏文件对比视图（SIS-FUNC-6）
 *
 * 双栏并排展示两份文本差异：行级 + 行内字符级高亮（diffService 产出行模型）；
 * 滚动联动（scrollTop 同步）+ 差异跳转 + 计数 + 差异块「接受左/接受右」合并。
 * 合并结果经 emit("apply") 交 MainView 写回对应文件标签并置脏标记。
 */

import { ref, computed, nextTick } from "vue";
import { NButton } from "naive-ui";
import { computeDiff, type DiffRow } from "../services/diffService";

const props = defineProps<{
  leftTitle: string;
  rightTitle: string;
  leftText: string;
  rightText: string;
  /** 左源是否文件（false = 剪贴板，只读） */
  leftWritable: boolean;
  /** 右源是否文件 */
  rightWritable: boolean;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "apply", side: "left" | "right", text: string): void;
}>();

const leftText = ref(props.leftText);
const rightText = ref(props.rightText);
const diff = computed(() => computeDiff(leftText.value, rightText.value));

const leftScroller = ref<HTMLElement | null>(null);
const rightScroller = ref<HTMLElement | null>(null);
let syncing = false;

const diffCount = computed(() => diff.value.blocks.length);
const currentIndex = ref(-1);

/** 滚动联动：一侧滚动同步另一侧 scrollTop（行高一致时近似对齐）。 */
function onScroll(side: "left" | "right"): void {
  if (syncing) return;
  syncing = true;
  const from = side === "left" ? leftScroller.value : rightScroller.value;
  const to = side === "left" ? rightScroller.value : leftScroller.value;
  if (from && to) to.scrollTop = from.scrollTop;
  nextTick(() => {
    syncing = false;
  });
}

/** 跳转到第 i 个差异块（0 起），滚动左栏到块首行。 */
function jumpTo(i: number): void {
  const blocks = diff.value.blocks;
  if (!blocks.length) return;
  const idx = ((i % blocks.length) + blocks.length) % blocks.length;
  currentIndex.value = idx;
  const b = blocks[idx];
  const rowEl = leftScroller.value?.querySelector(`[data-left-row="${b.leftFrom}"]`);
  if (rowEl && leftScroller.value) {
    leftScroller.value.scrollTop = (rowEl as HTMLElement).offsetTop - 8;
  }
}

function onPrev(): void {
  jumpTo(currentIndex.value - 1);
}
function onNext(): void {
  jumpTo(currentIndex.value + 1);
}

/** 接受左→右：把左栏块内容应用到右栏（右栏=合并目标）。 */
function acceptLeftToRight(block: { leftFrom: number; leftTo: number; rightFrom: number; rightTo: number }): void {
  const src = diff.value.left
    .slice(block.leftFrom, block.leftTo)
    .filter((r) => r.kind !== "added")
    .map((r) => r.text)
    .join("\n");
  const next = applyBlock(rightText.value, diff.value.right.slice(block.rightFrom, block.rightTo), src);
  rightText.value = next;
  currentIndex.value = -1;
  emit("apply", "right", next);
}

/** 接受右→左：把右栏块内容应用到左栏。 */
function acceptRightToLeft(block: { leftFrom: number; leftTo: number; rightFrom: number; rightTo: number }): void {
  const src = diff.value.right
    .slice(block.rightFrom, block.rightTo)
    .filter((r) => r.kind !== "removed")
    .map((r) => r.text)
    .join("\n");
  const next = applyBlock(leftText.value, diff.value.left.slice(block.leftFrom, block.leftTo), src);
  leftText.value = next;
  currentIndex.value = -1;
  emit("apply", "left", next);
}

/** 按行号区间（1 起）替换目标文本；目标侧块内无实际行（全占位）时追加到末尾。 */
function applyBlock(full: string, blockRows: DiffRow[], srcText: string): string {
  const nums = blockRows.map((r) => r.lineNo).filter((n) => n > 0);
  if (!nums.length) {
    return full ? `${full}\n${srcText}` : srcText;
  }
  const from = Math.min(...nums);
  const to = Math.max(...nums);
  const lines = full.split("\n");
  const head = lines.slice(0, from - 1);
  const tail = lines.slice(to);
  return [...head, ...srcText.split("\n"), ...tail].join("\n");
}

/** 行内字符级高亮渲染。 */
function renderPieces(row: DiffRow): string {
  if (!row.pieces) return escapeHtml(row.text);
  return row.pieces
    .map((p) => {
      const cls = p.removed ? "char-removed" : p.added ? "char-added" : "";
      return cls ? `<span class="${cls}">${escapeHtml(p.text)}</span>` : escapeHtml(p.text);
    })
    .join("");
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
</script>

<template>
  <div class="compare-view">
    <div class="compare-toolbar">
      <span class="compare-title">文件对比</span>
      <span class="sep" />
      <n-button size="small" :disabled="diffCount === 0" @click="onPrev">上一处</n-button>
      <n-button size="small" :disabled="diffCount === 0" @click="onNext">下一处</n-button>
      <span class="diff-count">{{ currentIndex >= 0 ? currentIndex + 1 : 0 }} / {{ diffCount }}</span>
      <span class="spacer" />
      <n-button size="small" @click="emit('close')">关闭对比</n-button>
    </div>

    <div class="compare-body">
      <div class="pane">
        <div class="pane-head">{{ leftTitle }}<span class="pane-tag">{{ leftWritable ? "文件" : "剪贴板(只读)" }}</span></div>
        <div ref="leftScroller" class="pane-scroller" @scroll="onScroll('left')">
          <div class="pane-lines">
            <template v-for="(row, i) in diff.left" :key="'l' + i">
              <div
                :data-left-row="i"
                :class="['line', 'line-' + row.kind, { 'line-blank': row.text === '' }]"
              >
                <span class="line-no">{{ row.lineNo }}</span>
                <span class="line-text" v-html="renderPieces(row)"></span>
              </div>
            </template>
          </div>
        </div>
      </div>

      <div class="pane">
        <div class="pane-head">{{ rightTitle }}<span class="pane-tag">{{ rightWritable ? "文件" : "剪贴板(只读)" }}</span></div>
        <div ref="rightScroller" class="pane-scroller" @scroll="onScroll('right')">
          <div class="pane-lines">
            <template v-for="(row, i) in diff.right" :key="'r' + i">
              <div :class="['line', 'line-' + row.kind, { 'line-blank': row.text === '' }]" :data-right-row="i">
                <span class="line-no">{{ row.lineNo }}</span>
                <span class="line-text" v-html="renderPieces(row)"></span>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- 差异块合并操作条（锚定到各块）：简化用顶部操作（每个块点击行内按钮） -->
    <div v-if="diffCount" class="block-actions">
      <template v-for="(b, i) in diff.blocks" :key="'b' + i">
        <div class="block-action">
          <n-button size="tiny" :disabled="!leftWritable" @click="acceptRightToLeft(b)">接受右 → 左</n-button>
          <n-button size="tiny" :disabled="!rightWritable" @click="acceptLeftToRight(b)">接受左 → 右</n-button>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.compare-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: var(--editor-bg, #fff);
}
.compare-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 10px;
  border-bottom: 1px solid var(--border-color, #ddd);
  background: var(--toolbar-bg, #fafafa);
}
.compare-title {
  font-size: 13px;
  font-weight: 600;
}
.sep {
  width: 1px;
  height: 18px;
  background: var(--border-color, #ddd);
}
.diff-count {
  font-size: 12px;
  color: #888;
}
.spacer {
  flex: 1;
}
.compare-body {
  display: flex;
  flex: 1;
  min-height: 0;
}
.pane {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--border-color, #ddd);
}
.pane:last-child {
  border-right: none;
}
.pane-head {
  padding: 4px 10px;
  font-size: 12px;
  color: #555;
  border-bottom: 1px solid var(--border-color, #eee);
  display: flex;
  align-items: center;
  gap: 6px;
}
.pane-tag {
  font-size: 11px;
  color: #999;
  background: #f0f0f0;
  border-radius: 3px;
  padding: 0 4px;
}
.pane-scroller {
  flex: 1;
  overflow: auto;
  font-family: "Cascadia Code", Consolas, monospace;
  font-size: 13px;
  line-height: 1.5;
}
.pane-lines {
  min-width: max-content;
}
.line {
  display: flex;
  white-space: pre;
}
.line-no {
  flex: none;
  width: 3em;
  text-align: right;
  padding-right: 8px;
  color: #999;
  user-select: none;
  background: var(--gutter-bg, #f6f6f6);
  border-right: 1px solid var(--border-color, #eee);
}
.line-text {
  padding: 0 8px;
  min-width: 1px;
}
.line-removed {
  background: #fdecec;
}
.line-added {
  background: #e8f5e9;
}
.line-blank .line-text {
  min-height: 1em;
}
.char-removed {
  background: #f8c6c6;
  text-decoration: line-through;
}
.char-added {
  background: #b8e6b8;
}
.block-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 6px 10px;
  border-top: 1px solid var(--border-color, #ddd);
  background: var(--toolbar-bg, #fafafa);
}
.block-action {
  display: flex;
  gap: 6px;
  align-items: center;
}
@media (prefers-color-scheme: dark) {
  .compare-view {
    background: #1e1e1e;
    color: #d4d4d4;
  }
  .line-no {
    color: #666;
    background: #252526;
  }
  .line-removed {
    background: #4a2323;
  }
  .line-added {
    background: #1e3a24;
  }
  .char-removed {
    background: #8a3a3a;
  }
  .char-added {
    background: #2d6a34;
  }
  .pane-tag {
    background: #333;
    color: #999;
  }
}
</style>
