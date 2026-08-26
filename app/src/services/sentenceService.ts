/**
 * sentenceService：语义断句（SIS-OPT-8c）
 *
 * 供 AI 翻译双屏对比使用：把原文按「段落 + 句末终止符」切成语义句，
 * 并记录每句在原文档中的行号范围（hover 联动滚动定位用）。
 *
 * 设计取舍（PO：按语义断句对应，按行对齐会丢换行上下文）：
 *  - 段落（空行）优先强断，段内按 。！？…；;!? 终止符断句；
 *  - 换行不强制断句（同一逻辑句跨行时合并，保留上下文）；
 *  - '.' 排除小数点（3.14）/ 版本号（v1.2.3）场景；
 *  - 单句长度下限 2 字符，防误切。
 * 翻译请求仍传「完整原文（保留换行）」给 LLM，LLM 负责语义翻译；
 * 断句仅用于左栏展示与 hover 高亮的索引对齐（SIS 契约）。
 */

export interface Sentence {
  text: string;
  /** 1-based 起始行（在原文档中） */
  lineFrom: number;
  /** 1-based 结束行 */
  lineTo: number;
}

/** 是否句子终止符：中文/西文标点；'.' 需排除小数点（前后皆数字）。 */
function isTerm(ch: string, prev: string, next: string): boolean {
  if ("。！？…；;!?".includes(ch)) return true;
  if (ch === ".") {
    if (/\d/.test(prev) && /\d/.test(next)) return false; // 3.14 / v1.2
    return true;
  }
  return false;
}

/**
 * 语义断句：按段落（空行）强断 + 段内终止符断句。
 * 返回句子数组（trim 后 >= 2 字符），含行号范围。
 */
export function splitSentences(text: string): Sentence[] {
  // 行起始偏移（用于偏移 -> 1-based 行号）
  const lineStart: number[] = [0];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "\n") lineStart.push(i + 1);
  }
  const lineOf = (off: number): number => {
    let lo = 0;
    let hi = lineStart.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (lineStart[mid] <= off) lo = mid;
      else hi = mid - 1;
    }
    return lo + 1; // 1-based
  };

  const sentences: Sentence[] = [];
  const paras = text.split(/\r?\n\s*\r?\n/); // 空行分隔段落
  let globalOff = 0;
  for (const para of paras) {
    // 段内扫描终止符切句（保留终止符在原句内）
    let buf = "";
    let bufStart = 0; // buf 首字符在 para 内偏移
    for (let i = 0; i < para.length; i++) {
      const ch = para[i];
      if (buf.length === 0) bufStart = i;
      buf += ch;
      const prev = para[i - 1] ?? "";
      const next = para[i + 1] ?? "";
      if (isTerm(ch, prev, next)) {
        const s = buf.trim();
        if (s.length >= 2) {
          const absStart = globalOff + bufStart;
          sentences.push({ text: s, lineFrom: lineOf(absStart), lineTo: lineOf(absStart + s.length - 1) });
        }
        buf = "";
      }
    }
    const s = buf.trim();
    if (s.length >= 2) {
      const absStart = globalOff + bufStart;
      sentences.push({ text: s, lineFrom: lineOf(absStart), lineTo: lineOf(absStart + s.length - 1) });
    }
    globalOff += para.length + 2; // 段间分隔（\n\n）
  }
  return sentences;
}
