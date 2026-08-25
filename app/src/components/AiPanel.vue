<script setup lang="ts">
/**
 * AiPanel：AI 问答侧栏（SIS-AI-1，UI-1 §1 ④ 展开态 320px）
 *
 * 结构：配置区（baseURL/key/model，settings 持久化）+ 聊天流（仅选中文本为上下文，
 * 无选中提示）+ 底部输入框（Enter 发送 / Shift+Enter 换行，流式中禁用）+ 回答插入光标。
 */

import { ref, computed, nextTick, inject } from "vue";
import { NInput, NButton, useMessage } from "naive-ui";
import { useAiStore } from "../stores/aiStore";
import { useTabsStore } from "../stores/tabsStore";
import { isAiConfigured } from "../services/aiService";

interface EditorApi {
  insertAtCursor: (text: string) => void;
  // 其余字段由 MainView 提供（此处仅取所需）
  [k: string]: unknown;
}

const aiStore = useAiStore();
const tabsStore = useTabsStore();
const message = useMessage();
const editorApi = inject<EditorApi | null>("editorApi", null);

// ---- 配置区 ----
const showConfig = ref(false);
const baseURL = ref("");
const apiKey = ref("");
const model = ref("");
const savingConfig = ref(false);

function openConfig(): void {
  baseURL.value = aiStore.aiConfig.baseURL;
  apiKey.value = aiStore.aiConfig.apiKey;
  model.value = aiStore.aiConfig.model;
  showConfig.value = true;
}

async function saveConfig(): Promise<void> {
  if (!baseURL.value || !apiKey.value || !model.value) {
    message.warning("请填写完整的 baseURL / key / model");
    return;
  }
  savingConfig.value = true;
  await aiStore.saveConfig({ baseURL: baseURL.value.trim(), apiKey: apiKey.value.trim(), model: model.value.trim() });
  savingConfig.value = false;
  showConfig.value = false;
  message.success("AI 配置已保存");
}

const configured = computed(() => isAiConfigured(aiStore.aiConfig));

// ---- 聊天 ----
const input = ref("");
const chatBox = ref<HTMLElement | null>(null);

const messages = computed(() => {
  const list = aiStore.session.map((m, i) => ({ ...m, key: `m${i}` }));
  // 流式回答追加显示（未入会话前）
  if (aiStore.qaLoading && aiStore.qaStreamText) {
    list.push({ role: "assistant", content: aiStore.qaStreamText, key: "stream" });
  }
  return list;
});

/** 当前编辑器选区（EditorPane 每次 selectionSet 写 window.__aidaSelection）。
 *  注意：不能包 computed——window 属性非响应式，computed 首次求值即缓存，
 *  后续选区变化不刷新（冒烟实测：问答沿用旧选区上下文，违反 SIS 不带全文约束）。
 *  故每次发送时直接读 window 实时值。 */
function currentSelection(): string {
  return (window as unknown as { __aidaSelection?: string }).__aidaSelection ?? "";
}

async function send(): Promise<void> {
  const q = input.value.trim();
  if (!q || aiStore.qaLoading) return;
  input.value = "";
  const sel = currentSelection();
  if (!sel) {
    message.warning("请先在编辑器中选中文本作为问答上下文");
    return;
  }
  await aiStore.ask(q, sel);
  await nextTick();
  if (chatBox.value) chatBox.value.scrollTop = chatBox.value.scrollHeight;
}

function onKeydown(e: KeyboardEvent): void {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    void send();
  }
}

function insertAnswer(text: string): void {
  if (!tabsStore.activeTab) {
    message.warning("没有激活的标签可插入");
    return;
  }
  editorApi?.insertAtCursor(text);
}

// 侧栏组件挂载时同步配置（MainView 已 init，此处兜底）
void aiStore.init();
</script>

<template>
  <div class="ai-panel">
    <!-- 配置提示/表单 -->
    <div v-if="!configured && !showConfig" class="ai-config-tip">
      <span>未配置 API</span>
      <n-button size="tiny" @click="openConfig">去设置</n-button>
    </div>
    <div v-if="showConfig" class="ai-config-form">
      <n-input v-model:value="baseURL" placeholder="baseURL（如 https://api.xxx.com/v1）" size="small" />
      <n-input v-model:value="apiKey" type="password" show-password-on="click" placeholder="API Key" size="small" />
      <n-input v-model:value="model" placeholder="model（如 Qwen/Qwen3.5-122B-A10B）" size="small" />
      <div class="ai-config-actions">
        <n-button size="tiny" type="primary" :loading="savingConfig" @click="saveConfig">保存</n-button>
        <n-button size="tiny" @click="showConfig = false">取消</n-button>
      </div>
    </div>

    <!-- 聊天流 -->
    <div ref="chatBox" class="ai-chat">
      <div v-if="!messages.length && !configured" class="ai-chat-empty">配置 API 后选中文本即可提问</div>
      <div v-for="m in messages" :key="m.key" :class="['ai-msg', m.role === 'user' ? 'ai-msg-user' : 'ai-msg-assistant']">
        <div class="ai-msg-content">{{ m.content }}</div>
        <div v-if="m.role === 'assistant' && m.key !== 'stream'" class="ai-msg-actions">
          <n-button size="tiny" @click="insertAnswer(m.content)">插入到光标处</n-button>
        </div>
      </div>
      <div v-if="aiStore.qaError" class="ai-msg-error">{{ aiStore.qaError }}</div>
    </div>

    <!-- 输入区 -->
    <div class="ai-input-row">
      <n-input
        v-model:value="input"
        type="textarea"
        :autosize="{ minRows: 1, maxRows: 5 }"
        placeholder="输入问题，Enter 发送 / Shift+Enter 换行"
        :disabled="aiStore.qaLoading"
        @keydown="onKeydown"
      />
      <n-button type="primary" :disabled="!input.trim() || aiStore.qaLoading" @click="send">发送</n-button>
      <n-button v-if="aiStore.qaLoading" @click="aiStore.stopAsk()">停止</n-button>
    </div>
  </div>
</template>

<style scoped>
.ai-panel {
  display: flex;
  flex-direction: column;
  width: 320px;
  height: 100%;
  border-left: 1px solid var(--border-color, #e4e4e7);
  background: var(--panel-bg, #fff);
}
.ai-config-tip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  font-size: 12px;
  color: #b26a00;
  background: #fff7e6;
  border-bottom: 1px solid #ffe7ba;
}
.ai-config-form {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px;
  border-bottom: 1px solid var(--border-color, #eee);
}
.ai-config-actions {
  display: flex;
  gap: 6px;
}
.ai-chat {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ai-chat-empty {
  color: #999;
  font-size: 12px;
  text-align: center;
  margin-top: 40px;
}
.ai-msg {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.ai-msg-user {
  align-items: flex-end;
}
.ai-msg-assistant {
  align-items: flex-start;
}
.ai-msg-content {
  max-width: 85%;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}
.ai-msg-user .ai-msg-content {
  background: var(--primary-color, #2080f0);
  color: #fff;
}
.ai-msg-assistant .ai-msg-content {
  background: var(--floating-bg, #f4f4f5);
  color: var(--text-color, #333);
}
.ai-msg-actions {
  margin-top: 2px;
}
.ai-msg-error {
  color: #d03050;
  font-size: 12px;
}
.ai-input-row {
  display: flex;
  gap: 6px;
  padding: 8px 10px;
  border-top: 1px solid var(--border-color, #eee);
  align-items: flex-end;
}
</style>
