/**
 * diffService：文本差异计算（SIS-FUNC-6）
 *
 * 基于 jsdiff（ENV-2 已接入，package "diff"）：行级 diffLines + 行内 diffChars，
 * 输出双栏渲染所需的行模型（added / removed / unchanged + 行内字符级标记）。
 */

import { diffLines, diffChars, type Change } from "diff";

/** 行内字符级差异片段 */
export interface CharPiece {
  text: string;
  added?: boolean;
  removed?: boolean;
}

/** 双栏对比的行模型（按左右两栏分别产出） */
export interface DiffRow {
  /** 行号（1 起）在对应栏的位置；无对应行（对侧新增/删除）时为 0 */
  lineNo: number;
  text: string;
  kind: "added" | "removed" | "unchanged";
  /** 行内字符级高亮（仅 kind != unchanged 时有效） */
  pieces?: CharPiece[];
}

/** 双栏对比结果 */
export interface DiffResult {
  left: DiffRow[];
  right: DiffRow[];
  /** 差异块（用于导航与合并按钮定位）：行索引（0 起）区间 */
  blocks: { leftFrom: number; leftTo: number; rightFrom: number; rightTo: number }[];
}

interface Pair {
  leftText: string;
  rightText: string;
}

/**
 * 计算行级 + 行内字符级差异。
 * diffLines 产出 added/removed/unchanged 块；paired removed+added 块内用
 * diffChars 做字符级标记；未配对的 removed/added 单独成块（整体高亮）。
 */
export function computeDiff(leftText: string, rightText: string): DiffResult {
  // 统一行尾（Windows 剪贴板/文件常见 CRLF），避免行尾差异污染对比结果
  const chunks = diffLines(normalizeEol(leftText), normalizeEol(rightText));
  const left: DiffRow[] = [];
  const right: DiffRow[] = [];
  const blocks: DiffResult["blocks"] = [];

  const leftBase = 0;
  const rightBase = 0;

  // 逐块处理：先配对 removed+added，再处理其他
  const pairs: (Pair & { removed?: Change; added?: Change })[] = [];
  for (let i = 0; i < chunks.length; i++) {
    const c = chunks[i];
    if (c.added) {
      const prev = pairs[pairs.length - 1];
      if (prev && prev.removed && !prev.added) {
        prev.added = c;
        prev.rightText = c.value;
      } else {
        pairs.push({ added: c, leftText: "", rightText: c.value });
      }
    } else if (c.removed) {
      const prev = pairs[pairs.length - 1];
      if (prev && prev.added && !prev.removed) {
        // 应避免：added 先出现（diffLines 顺序 removed 在前），兜底拆开
        pairs.push({ removed: c, leftText: c.value, rightText: "" });
      } else {
        pairs.push({ removed: c, leftText: c.value, rightText: "" });
      }
    } else {
      pairs.push({ leftText: c.value, rightText: c.value });
    }
  }

  for (const p of pairs) {
    const leftLines = splitKeepEmpty(p.leftText);
    const rightLines = splitKeepEmpty(p.rightText);
    const leftCount = leftLines.length;
    const rightCount = rightLines.length;

    const leftStart = left.length;
    const rightStart = right.length;

    if (p.removed && p.added) {
      // 配对块：行级 removed/added + 行内字符级
      const charPairs = pairLinesForChars(leftLines, rightLines);
      for (let i = 0; i < leftCount; i++) {
        left.push({ lineNo: left.length - leftBase + 1, text: leftLines[i], kind: "removed", pieces: charPairs.left[i] });
      }
      for (let j = 0; j < rightCount; j++) {
        right.push({ lineNo: right.length - rightBase + 1, text: rightLines[j], kind: "added", pieces: charPairs.right[j] });
      }
      blocks.push({ leftFrom: leftStart, leftTo: left.length, rightFrom: rightStart, rightTo: right.length });
    } else if (p.removed) {
      // 纯删除块：左栏行，右栏占位
      for (const t of leftLines) {
        left.push({ lineNo: left.length - leftBase + 1, text: t, kind: "removed" });
        right.push({ lineNo: 0, text: "", kind: "removed" });
      }
      blocks.push({ leftFrom: leftStart, leftTo: left.length, rightFrom: rightStart, rightTo: right.length });
    } else if (p.added) {
      // 纯新增块：右栏行，左栏占位
      for (const t of rightLines) {
        left.push({ lineNo: 0, text: "", kind: "added" });
        right.push({ lineNo: right.length - rightBase + 1, text: t, kind: "added" });
      }
      blocks.push({ leftFrom: leftStart, leftTo: left.length, rightFrom: rightStart, rightTo: right.length });
    } else {
      // 未变化块
      const count = Math.max(leftCount, rightCount);
      for (let i = 0; i < count; i++) {
        left.push({ lineNo: left.length - leftBase + 1, text: leftLines[i] ?? "", kind: "unchanged" });
        right.push({ lineNo: right.length - rightBase + 1, text: rightLines[i] ?? "", kind: "unchanged" });
      }
    }
  }

  // 修 block 内的行号（按渲染位置补齐）
  for (const b of blocks) {
    for (let i = b.leftFrom; i < b.leftTo; i++) if (left[i].lineNo === 0) left[i].lineNo = i + 1;
    for (let i = b.rightFrom; i < b.rightTo; i++) if (right[i].lineNo === 0) right[i].lineNo = i + 1;
  }

  return { left, right, blocks };
}

/** 统一行尾：\r\n 与 \r 均归一为 \n */
function normalizeEol(text: string): string {
  return text.replace(/\r\n?/g, "\n");
}

/** 拆行并保留空行（diffLines 的 value 含行尾 \n） */
function splitKeepEmpty(text: string): string[] {
  if (text === "") return [];
  const lines = text.split("\n");
  // 去掉末尾空串（value 以 \n 结尾）
  if (lines.length && lines[lines.length - 1] === "") lines.pop();
  return lines;
}

/** 将 removed 与 added 行配对做字符级 diff；返回两侧的行内 pieces */
function pairLinesForChars(leftLines: string[], rightLines: string[]): { left: (CharPiece[] | undefined)[]; right: (CharPiece[] | undefined)[] } {
  const left: (CharPiece[] | undefined)[] = [];
  const right: (CharPiece[] | undefined)[] = [];
  const n = Math.max(leftLines.length, rightLines.length);
  for (let i = 0; i < n; i++) {
    const a = leftLines[i] ?? "";
    const b = rightLines[i] ?? "";
    const changes = diffChars(a, b);
    if (a !== b) {
      left.push(compactPieces(changes, "removed"));
      right.push(compactPieces(changes, "added"));
    } else {
      left.push(undefined);
      right.push(undefined);
    }
  }
  return { left, right };
}

/** diffChars 的 Change[] 按侧过滤：removed 侧取 removed/unchanged，added 侧取 added/unchanged */
function compactPieces(changes: Change[], side: "removed" | "added"): CharPiece[] {
  return changes
    .filter((c) => (side === "removed" ? !c.added : !c.removed))
    .map((c) => ({ text: c.value, added: c.added, removed: c.removed }));
}
