/**
 * aiService：AI 能力（SIS-AI-1）
 *
 * 前端直连 OpenAI 兼容协议（chat/completions，流式 SSE），零新增依赖（原生 fetch）。
 * 三大能力共用 streamChat：润色（改写/润色/缩短/扩写）、问答（仅选中文本上下文）、
 * mermaid 修复。key 明文存 settings.json（AI-1 既定决策）。
 */

export interface AiConfig {
  baseURL: string;
  apiKey: string;
  model: string;
}

export interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

export interface StreamCallbacks {
  /** 每次收到 content delta 增量 */
  onDelta: (text: string) => void;
}

/** 是否已配置完整 API（baseURL/key/model 全非空）。 */
export function isAiConfigured(cfg: AiConfig): boolean {
  return !!(cfg.baseURL && cfg.apiKey && cfg.model);
}

/**
 * 流式对话（OpenAI 兼容 SSE）。失败抛 Error（含状态码与响应片段）。
 * 跳过 reasoning_content（Qwen 思考过程），只上屏最终 content。
 */
export async function streamChat(
  cfg: AiConfig,
  messages: ChatMsg[],
  cb: StreamCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  const url = `${cfg.baseURL.replace(/\/+$/, "")}/chat/completions`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify({ model: cfg.model, messages, stream: true }),
    signal,
  });
  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => "");
    throw new Error(`AI 请求失败（${res.status}）：${detail.slice(0, 160)}`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      const t = line.trim();
      if (!t.startsWith("data:")) continue;
      const data = t.slice(5).trim();
      if (data === "[DONE]") continue;
      try {
        const json = JSON.parse(data) as {
          choices?: { delta?: { content?: string | null } }[];
        };
        const delta = json.choices?.[0]?.delta?.content;
        if (typeof delta === "string" && delta) cb.onDelta(delta);
      } catch {
        // 忽略不完整/异常行
      }
    }
  }
}

// ---- 三能力 prompt 模板 ----

const POLISH_PROMPTS: Record<string, string> = {
  rewrite: "请改写以下文本（保持原意，可调整结构，语言不变）：",
  polish: "请润色以下文本（保持原意与长度，优化表达使其更流畅专业）：",
  shorten: "请缩短以下文本（保持核心信息，更简洁）：",
  expand: "请扩写以下文本（保持原意，补充细节使其更丰满）：",
};

/** 润色 prompt：mode=rewrite/polish/shorten/expand */
export function buildPolishMessages(mode: string, text: string): ChatMsg[] {
  return [
    { role: "user", content: `${POLISH_PROMPTS[mode] ?? POLISH_PROMPTS.polish}\n\n${text}` },
  ];
}

/** 问答 prompt：仅选中文本为上下文（SIS 硬约束：不带全文） */
export function buildAskMessages(selection: string, question: string): ChatMsg[] {
  return [
    {
      role: "user",
      content: `以下是用户选中的文本（仅作上下文，回答请直接回应问题，不要复述无关内容）：\n\n"""\n${selection}\n"""\n\n用户问题：${question}`,
    },
  ];
}

/** mermaid 修复 prompt：给出错误代码，要求仅返回修正后的 mermaid 代码（无多余说明） */
export function buildFixMermaidMessages(code: string): ChatMsg[] {
  return [
    {
      role: "user",
      content: `以下 mermaid 代码存在语法错误，请修正并**只返回修正后的 mermaid 代码**（不要任何解释、不要 markdown 代码围栏）：\n\n${code}`,
    },
  ];
}
