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
  buildTranslateMessages,
  parseTranslatePairs,
  TRANSLATE_MAX_CHARS,
  parseOutline,
  isAiConfigured,
  type AiConfig,
  type ChatMsg,
  type OutlineItem,
} from "../services/aiService";
import { splitSentences, type Sentence } from "../services/sentenceService";

export type PolishMode = "rewrite" | "polish" | "shorten" | "expand";

/** SIS-OPT-5：简报缓存记录（当次会话、按文件 key 各存一份）。 */
export interface BriefRecord {
  key: string;
  summary: string;
  outline: OutlineItem[];
  status: "loading" | "done" | "error";
  error: string;
  ts: number;
}

/** 润色流状态（EditorPane 选区浮条驱动：发起 -> 流式累积 -> 完成/失败） */
export interface PolishState {
  mode: PolishMode;
  /** 原选区文本（接受时替换依据） */
  source: string;
  streamText: string;
  loading: boolean;
  error: string;
}

/** SIS-OPT-8c：AI 翻译状态（双屏对比，固定译简体中文）。 */
export interface TranslateState {
  status: "idle" | "loading" | "done" | "error";
  /** 左栏：原文语义句（前端断句） */
  src: Sentence[];
  /** 右栏：LLM 返回的译文句（按序索引对齐；缺失补「（未对齐）」占位） */
  tgt: string[];
  error: string;
  /** 所属文件 key（同简报 key 规则） */
  key: string;
  ts: number;
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

  // ---- SIS-OPT-5：AI 简报悬窗 + 会话缓存 ----
  /** 简报缓存（当次会话、按文件 key 各存一份）：key=filePath，未保存标签用 __untitled__+tabId。 */
  const briefCache = ref<Record<string, BriefRecord>>({});
  /** 悬窗 UI 状态（visible=展示中 / minimized=收起为小图标）。 */
  const briefUi = ref<{ visible: boolean; minimized: boolean }>({ visible: false, minimized: false });
  /** 悬窗当前绑定的文件 key（切换标签时跟随当前文件）。 */
  const briefActiveKey = ref<string | null>(null);

  // ---- SIS-OPT-8c：AI 翻译（双屏对比） ----
  const translate = ref<TranslateState>({ status: "idle", src: [], tgt: [], error: "", key: "", ts: 0 });

  let qaController: AbortController | null = null;
  let polishController: AbortController | null = null;
  let briefController: AbortController | null = null;
  let translateController: AbortController | null = null;

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

  /** 简报缓存 key：已保存用文件路径（同文件重开命中），未保存用 __untitled__+tabId。 */
  function briefKeyOf(path: string | null | undefined, tabId: number): string {
    return path ? path : `__untitled__${tabId}`;
  }

  /** 打开悬窗并绑定当前文件；该文件已有缓存直接展示，无缓存自动生成一次。 */
  async function ensureBrief(tab: { filePath?: string | null; id: number; content: string }): Promise<void> {
    const key = briefKeyOf(tab.filePath, tab.id);
    briefActiveKey.value = key;
    briefUi.value = { visible: true, minimized: false };
    const rec = briefCache.value[key];
    if (rec && rec.status !== "error") return; // 有缓存（done/loading）直接展示
    await startGenerate(tab.content, key);
  }

  /** 空态手动生成（与 ensureBrief 相同路径，供无缓存时按钮触发）。 */
  async function generateBrief(tab: { filePath?: string | null; id: number; content: string }): Promise<void> {
    const key = briefKeyOf(tab.filePath, tab.id);
    briefActiveKey.value = key;
    briefUi.value = { visible: true, minimized: false };
    await startGenerate(tab.content, key);
  }

  /** 刷新：中断旧请求并重新生成（仅对当前绑定文件）。 */
  async function refreshBrief(tab: { filePath?: string | null; id: number; content: string }): Promise<void> {
    const key = briefKeyOf(tab.filePath, tab.id);
    briefActiveKey.value = key;
    briefUi.value = { visible: true, minimized: false };
    briefController?.abort();
    await startGenerate(tab.content, key);
  }

  /** 切换标签时更新悬窗绑定（不自动生成；有缓存展示、无缓存空态）。 */
  function updateActiveKey(tab: { filePath?: string | null; id: number } | null): void {
    briefActiveKey.value = tab ? briefKeyOf(tab.filePath, tab.id) : null;
  }

  /** 关闭悬窗（不中断进行中的生成：后台完成写缓存，重开展示）。 */
  function closeBrief(): void {
    briefUi.value = { visible: false, minimized: false };
  }

  /** 收起为小图标 / 展开。 */
  function toggleBriefMinimized(): void {
    briefUi.value.minimized = !briefUi.value.minimized;
  }

  /** 执行简报生成（内部：写缓存记录 + 流式累积；生成中不因悬窗关闭而 abort）。 */
  async function startGenerate(content: string, key: string): Promise<void> {
    const cfg = aiConfig.value;
    const outline = parseOutline(content);
    if (!isAiConfigured(cfg)) {
      briefCache.value = { ...briefCache.value, [key]: { key, summary: "", outline, status: "error", error: "未配置 API（请先在 AI 面板配置 baseURL/key/model）", ts: Date.now() } };
      return;
    }
    briefCache.value = { ...briefCache.value, [key]: { key, summary: "", outline, status: "loading", error: "", ts: Date.now() } };
    briefController = new AbortController();
    let summary = "";
    try {
      await streamChat(cfg, buildBriefMessages(content), {
        onDelta: (t) => {
          summary += t;
          const rec = briefCache.value[key];
          if (rec && rec.status === "loading") {
            briefCache.value = { ...briefCache.value, [key]: { ...rec, summary: rec.summary + t } };
          }
        },
      }, briefController.signal);
      const rec = briefCache.value[key];
      if (rec && rec.status === "loading") {
        briefCache.value = { ...briefCache.value, [key]: { ...rec, status: "done", ts: Date.now() } };
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") return; // 被刷新中断：新请求会覆盖本条
      const rec = briefCache.value[key];
      if (rec && rec.status === "loading") {
        briefCache.value = { ...briefCache.value, [key]: { ...rec, status: "error", error: e instanceof Error ? e.message : String(e), ts: Date.now() } };
      }
    } finally {
      if (briefController && briefController.signal.aborted === false) briefController = null;
    }
  }

  // ---- SIS-OPT-8c：AI 翻译 ----

  /** 发起翻译（对当前文件全文，固定译简体中文；语义断句对齐）。 */
  async function startTranslate(tab: { filePath?: string | null; id: number; content: string }): Promise<void> {
    const cfg = aiConfig.value;
    const key = briefKeyOf(tab.filePath, tab.id);
    if (!isAiConfigured(cfg)) {
      translate.value = { status: "error", src: [], tgt: [], error: "未配置 API（请先在 AI 面板配置 baseURL/key/model）", key, ts: Date.now() };
      return;
    }
    if (tab.content.length > TRANSLATE_MAX_CHARS) {
      translate.value = { status: "error", src: [], tgt: [], error: `文档过长（${tab.content.length} 字符，上限 ${TRANSLATE_MAX_CHARS}），请分段翻译`, key, ts: Date.now() };
      return;
    }
    const src = splitSentences(tab.content);
    if (src.length === 0) {
      translate.value = { status: "error", src: [], tgt: [], error: "未检测到可翻译的句子", key, ts: Date.now() };
      return;
    }
    translateController?.abort();
    translate.value = { status: "loading", src, tgt: [], error: "", key, ts: Date.now() };
    translateController = new AbortController();
    let raw = "";
    try {
      await streamChat(cfg, buildTranslateMessages(tab.content), {
        onDelta: (t) => { raw += t; },
      }, translateController.signal);
      const tgt = parseTranslatePairs(raw);
      if (!tgt) {
        translate.value = { ...translate.value, status: "error", error: "翻译结果解析失败（AI 未返回有效 JSON），请重试", ts: Date.now() };
        return;
      }
      translate.value = { ...translate.value, status: "done", tgt, ts: Date.now() };
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      translate.value = { ...translate.value, status: "error", error: e instanceof Error ? e.message : String(e), ts: Date.now() };
    } finally {
      translateController = null;
    }
  }

  /** 停止翻译（取消进行中请求）。 */
  function translateStop(): void {
    translateController?.abort();
    translateController = null;
    if (translate.value.status === "loading") {
      translate.value = { ...translate.value, status: "error", error: "已取消", ts: Date.now() };
    }
  }

  /** 清空翻译状态（关闭视图时）。 */
  function translateClear(): void {
    translateController?.abort();
    translateController = null;
    translate.value = { status: "idle", src: [], tgt: [], error: "", key: "", ts: 0 };
  }

  return {
    aiConfig,
    session,
    qaLoading,
    qaStreamText,
    qaError,
    polish,
    briefCache,
    briefUi,
    briefActiveKey,
    translate,
    init,
    saveConfig,
    ask,
    stopAsk,
    polishStart,
    polishStop,
    polishClear,
    fixMermaid,
    ensureBrief,
    generateBrief,
    refreshBrief,
    updateActiveKey,
    closeBrief,
    toggleBriefMinimized,
    startTranslate,
    translateStop,
    translateClear,
  };
});
