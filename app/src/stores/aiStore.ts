/**
 * aiStore：AI 状态（SIS-AI-1，ARCH-1 三 Store 之一）
 *
 * 持有：aiConfig（settings.aiConfig 同步）、问答会话（当次会话，不持久化）、
 * 流式控制（AbortController，可中断）。润色/问答/mermaid 修复共用 streamChat。
 */

import { defineStore } from "pinia";
import { ref } from "vue";
import { loadSettings, saveSettings } from "../services/settingsService";
import {
  streamChat,
  buildPolishMessages,
  buildAskMessages,
  buildFixMermaidMessages,
  buildBriefMessages,
  parseOutline,
  isAiConfigured,
  type AiConfig,
  type ChatMsg,
  type OutlineItem,
} from "../services/aiService";

export type PolishMode = "rewrite" | "polish" | "shorten" | "expand";

/** 润色流状态（EditorPane 选区浮条驱动：发起 -> 流式累积 -> 完成/失败） */
export interface PolishState {
  mode: PolishMode;
  /** 原选区文本（接受时替换依据） */
  source: string;
  streamText: string;
  loading: boolean;
  error: string;
}

export const useAiStore = defineStore("ai", () => {
  /** API 配置（settings.aiConfig 的运行时镜像） */
  const aiConfig = ref<AiConfig>({ baseURL: "", apiKey: "", model: "" });
  /** 问答会话（当次应用生命周期，不持久化） */
  const session = ref<ChatMsg[]>([]);
  /** 问答流式状态 */
  const qaLoading = ref(false);
  const qaStreamText = ref("");
  const qaError = ref("");
  /** 润色流状态（null = 无进行中/结果） */
  const polish = ref<PolishState | null>(null);

  // ---- SIS-OPT-1：AI 文档简报 + 大纲锚点 ----
  /** 简报状态：大纲为本地解析（不依赖 AI），简报正文由 AI 流式生成。 */
  const brief = ref<{ open: boolean; loading: boolean; error: string; summary: string; outline: OutlineItem[] }>({
    open: false,
    loading: false,
    error: "",
    summary: "",
    outline: [],
  });

  let qaController: AbortController | null = null;
  let polishController: AbortController | null = null;
  let briefController: AbortController | null = null;

  async function init(): Promise<void> {
    const s = await loadSettings();
    aiConfig.value = { ...s.aiConfig };
  }

  async function saveConfig(cfg: AiConfig): Promise<void> {
    aiConfig.value = { ...cfg };
    await saveSettings({ aiConfig: { ...cfg } });
  }

  /** 问答：追加用户消息 + 流式回答（可中断）。 */
  async function ask(question: string, selection: string): Promise<void> {
    const cfg = aiConfig.value;
    if (!isAiConfigured(cfg)) {
      qaError.value = "未配置 API（请先在 AI 面板配置 baseURL/key/model）";
      return;
    }
    if (qaLoading.value) return;
    session.value.push({ role: "user", content: question });
    qaLoading.value = true;
    qaStreamText.value = "";
    qaError.value = "";
    qaController = new AbortController();
    const assistant: ChatMsg = { role: "assistant", content: "" };
    try {
      await streamChat(
        cfg,
        buildAskMessages(selection, question),
        { onDelta: (t) => { assistant.content += t; qaStreamText.value += t; } },
        qaController.signal,
      );
      session.value.push(assistant);
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      qaError.value = e instanceof Error ? e.message : String(e);
    } finally {
      qaLoading.value = false;
      qaStreamText.value = "";
      qaController = null;
    }
  }

  /** 停止当前问答流式。 */
  function stopAsk(): void {
    qaController?.abort();
  }

  /** 润色：流式结果累积到 polish 状态（EditorPane 负责接受/放弃的 dispatch）。 */
  async function polishStart(mode: PolishMode, source: string): Promise<void> {
    const cfg = aiConfig.value;
    if (!isAiConfigured(cfg)) {
      polish.value = { mode, source, streamText: "", loading: false, error: "未配置 API（请先在 AI 面板配置）" };
      return;
    }
    if (polish.value?.loading) polishController?.abort();
    polish.value = { mode, source, streamText: "", loading: true, error: "" };
    polishController = new AbortController();
    try {
      await streamChat(
        cfg,
        buildPolishMessages(mode, source),
        { onDelta: (t) => { if (polish.value) polish.value.streamText += t; } },
        polishController.signal,
      );
      if (polish.value) polish.value.loading = false;
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      if (polish.value) {
        polish.value.loading = false;
        polish.value.error = e instanceof Error ? e.message : String(e);
      }
    } finally {
      polishController = null;
    }
  }

  /** 取消润色流式。 */
  function polishStop(): void {
    polishController?.abort();
    if (polish.value) polish.value.loading = false;
  }

  /** 清除润色状态（接受/放弃后）。 */
  function polishClear(): void {
    polish.value = null;
  }

  /** mermaid 修复：流式返回修正代码（最终结果）。 */
  async function fixMermaid(code: string): Promise<string> {
    const cfg = aiConfig.value;
    if (!isAiConfigured(cfg)) throw new Error("未配置 API（请先在 AI 面板配置）");
    let result = "";
    await streamChat(cfg, buildFixMermaidMessages(code), {
      onDelta: (t) => { result += t; },
    });
    return result.trim();
  }

  /** 打开简报：本地解析大纲 + AI 流式生成简报（未配置时仅展示大纲与错误提示）。 */
  async function openBrief(content: string): Promise<void> {
    const cfg = aiConfig.value;
    brief.value = { open: true, loading: false, error: "", summary: "", outline: parseOutline(content) };
    if (!isAiConfigured(cfg)) {
      brief.value.error = "未配置 API（请先在 AI 面板配置 baseURL/key/model）";
      return;
    }
    brief.value.loading = true;
    briefController = new AbortController();
    let summary = "";
    try {
      await streamChat(cfg, buildBriefMessages(content), {
        onDelta: (t) => { summary += t; brief.value.summary += t; },
      }, briefController.signal);
      brief.value.loading = false;
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      brief.value.loading = false;
      brief.value.error = e instanceof Error ? e.message : String(e);
    } finally {
      briefController = null;
    }
  }

  /** 关闭简报浮层（中断进行中的生成）。 */
  function closeBrief(): void {
    briefController?.abort();
    brief.value.open = false;
  }

  return {
    aiConfig,
    session,
    qaLoading,
    qaStreamText,
    qaError,
    polish,
    brief,
    init,
    saveConfig,
    ask,
    stopAsk,
    polishStart,
    polishStop,
    polishClear,
    fixMermaid,
    openBrief,
    closeBrief,
  };
});
