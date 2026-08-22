/**
 * Markdown 同屏所见即所得（SIS-FUNC-3 / UI-2 §1）
 *
 * 块级双态：光标/选区所在块显示源码，其余块渲染为效果（CM6 decorations）。
 * 块 = 顶层语法节点（段落/标题/引用/代码块/表格/分隔线），列表下钻到
 * 列表项（UI-2 §1.1 粒度约定）。选区横跨多块时全部相交块回源码态。
 *
 * 三原则（decision-013 / Sprint 3 启动收口风险卡点）：
 * - markRaw：本扩展不向 Vue store 存任何 CM6 对象（decorations 归 StateField
 *   内部状态，随语言 Compartment 挂载/销毁）。
 * - Compartment 槽位：扩展并入 languageExtension("markdown")，随
 *   languageCompartment reconfigure 挂载/移除，不新增槽位、不新增 state 注册。
 * - watch 单点写缓存：decorations 重建仅由事务流驱动（StateField.update 响应
 *   docChanged/selectionSet），无任何 Vue watch 反向驱动。
 *
 * 局部更新：decoration set 全文档重建，但 CM6 仅对变化的 tile 做 DOM 增量
 * 更新（仅受影响块重渲染）；块级 widget（表格/分隔线）以源文本 eq 比较，
 * 文本未变的块复用旧 DOM（SIS 性能要求）。
 *
 * 故障回退（SIS 验收）：语法不完整（未闭合标记/坏表格）不产生对应语法
 * 节点，自然无 decoration，回退显示源码。
 */

import { syntaxTree } from "@codemirror/language";
import {
  type EditorState,
  type Extension,
  type Range,
  StateField,
  type Transaction,
} from "@codemirror/state";
import { Decoration, EditorView, WidgetType, type DecorationSet } from "@codemirror/view";
import type { SyntaxNode } from "@lezer/common";
import "./markdownWysiwyg.css";

/** 隐藏 Markdown 标记文本（`#`、`**`、`>` 等，渲染态标记隐藏）。 */
const hidden = Decoration.mark({ class: "cm-md-hidden" });

/** 分隔线块 widget：`---` 整行替换为水平线。点击 widget 光标进入块源码态（SIS 建议项）。 */
class HrWidget extends WidgetType {
  constructor(
    readonly src: string,
    readonly from: number,
  ) {
    super();
  }
  eq(other: HrWidget): boolean {
    return other.src === this.src;
  }
  toDOM(view: EditorView): HTMLElement {
    const hr = document.createElement("hr");
    hr.className = "cm-md-hr";
    hr.addEventListener("mousedown", (e) => {
      e.preventDefault();
      view.dispatch({ selection: { anchor: this.from } });
    });
    return hr;
  }
}

/** 表格块 widget：整块替换为 HTML table（GFM 语法树 -> 表格 DOM）。
 *  点击 widget 光标进入块源码态（SIS 建议项：表格内编辑）。 */
class TableWidget extends WidgetType {
  constructor(
    readonly src: string,
    readonly header: string[],
    readonly rows: string[][],
    readonly from: number,
  ) {
    super();
  }
  eq(other: TableWidget): boolean {
    return other.src === this.src;
  }
  toDOM(view: EditorView): HTMLElement {
    const wrap = document.createElement("div");
    wrap.className = "cm-md-table";
    const table = document.createElement("table");
    if (this.header.length > 0) {
      const thead = document.createElement("thead");
      const tr = document.createElement("tr");
      for (const cell of this.header) {
        const th = document.createElement("th");
        th.textContent = cell;
        tr.appendChild(th);
      }
      thead.appendChild(tr);
      table.appendChild(thead);
    }
    if (this.rows.length > 0) {
      const tbody = document.createElement("tbody");
      for (const row of this.rows) {
        const tr = document.createElement("tr");
        for (const cell of row) {
          const td = document.createElement("td");
          td.textContent = cell;
          tr.appendChild(td);
        }
        tbody.appendChild(tr);
      }
      table.appendChild(tbody);
    }
    wrap.appendChild(table);
    wrap.addEventListener("mousedown", (e) => {
      e.preventDefault();
      view.dispatch({ selection: { anchor: this.from } });
    });
    return wrap;
  }
}

/** 依据 state 构建全文档 decorations（StateField 事务驱动，块级装饰合法通道）。 */
function buildDecorations(state: EditorState): DecorationSet {
  const doc = state.doc;
  const sel = state.selection;
  const tree = syntaxTree(state);
  // 增量解析滞后防御：语法树尚未对齐当前 doc（节点位置可能越界）时跳过渲染，
  // 下一事务树对齐后再重建（避免 lineAt 越界 TypeError）。
  if (tree.length !== doc.length) return Decoration.none;
  const ranges: Range<Decoration>[] = [];

  const add = (d: Decoration, from: number, to: number): void => {
    if (from < to) ranges.push(d.range(from, to));
  };

  /** 行级装饰：LineDecoration.range 必须零长度（CM6 校验），定位在行首。 */
  const addLine = (d: Decoration, from: number): void => {
    ranges.push(d.range(from, from));
  };

  /** 选区（含空光标）与块闭区间相交 -> 源码态（UI-2 §1.1，选区跨块全回源码）。 */
  const inSelection = (from: number, to: number): boolean =>
    sel.ranges.some((r) => r.from <= to && r.to >= from);

  /** 隐藏 mark 节点及其后同行空白（吃掉 `# `/`> ` 的尾随空格）。 */
  const hideMarkAndSpaces = (node: SyntaxNode): void => {
    const line = doc.lineAt(node.from);
    let pos = node.to;
    while (
      pos < line.to &&
      (doc.sliceString(pos, pos + 1) === " " || doc.sliceString(pos, pos + 1) === "\t")
    ) {
      pos++;
    }
    add(hidden, node.from, pos);
  };

  /** 收集子节点中指定名称的 mark（如 EmphasisMark/CodeMark/LinkMark）。 */
  const childMarks = (node: SyntaxNode, name: string): SyntaxNode[] => {
    const out: SyntaxNode[] = [];
    for (let c = node.firstChild; c; c = c.nextSibling) {
      if (c.name === name) out.push(c);
    }
    return out;
  };

  /** ATX 标题：行 class（字号字重）+ 隐藏 `#` 标记与尾随空格。Setext 保持源码。 */
  const renderHeading = (node: SyntaxNode): void => {
    const mark = node.firstChild;
    if (!mark || mark.name !== "HeaderMark") return;
    addLine(
      Decoration.line({ class: "cm-md-h" + node.name.slice(-1) }),
      doc.lineAt(node.from).from,
    );
    hideMarkAndSpaces(mark);
  };

  /** 成对标记行内元素（粗体/斜体/删除线）：隐藏两端标记 + 内容整体样式。 */
  const renderPairedMarks = (node: SyntaxNode, cls: string, markName: string): void => {
    const marks = childMarks(node, markName);
    if (marks.length < 2) return;
    const m1 = marks[0];
    const m2 = marks[marks.length - 1];
    if (m2.from <= m1.to) return; // 空标记对（****）：原样显示（UI-2 §1.2）
    add(hidden, m1.from, m1.to);
    add(hidden, m2.from, m2.to);
    add(Decoration.mark({ class: cls }), m1.to, m2.from);
    for (let c = node.firstChild; c; c = c.nextSibling) {
      if (c.name === markName) continue;
      walk(c); // 内容内嵌套行内元素照常渲染
    }
  };

  /** 行内代码：隐藏两端反引号 + 内容底纹。 */
  const renderInlineCode = (node: SyntaxNode): void => {
    const marks = childMarks(node, "CodeMark");
    if (marks.length < 2) return;
    const [m1, m2] = [marks[0], marks[marks.length - 1]];
    if (m2.from <= m1.to) return;
    add(hidden, m1.from, m1.to);
    add(hidden, m2.from, m2.to);
    add(Decoration.mark({ class: "cm-md-code" }), m1.to, m2.from);
  };

  /** 链接/图片：隐藏 `[ ] ( url )` 标记，内容（alt/链接文本）加样式。 */
  const renderLink = (node: SyntaxNode, isImage: boolean): void => {
    const marks = childMarks(node, "LinkMark");
    if (marks.length < 2) return;
    const open = marks[0];
    const close = marks[1];
    if (close.from <= open.to) return; // 空内容：保持源码
    for (let c = node.firstChild; c; c = c.nextSibling) {
      if (c.name === "LinkMark" || c.name === "URL" || c.name === "LinkTitle") {
        add(hidden, c.from, c.to);
      }
    }
    add(
      Decoration.mark({ class: isImage ? "cm-md-img" : "cm-md-link" }),
      open.to,
      close.from,
    );
    for (let c = node.firstChild; c; c = c.nextSibling) {
      if (c.name === "LinkMark" || c.name === "URL" || c.name === "LinkTitle") continue;
      walk(c);
    }
  };

  /** 引用块：整块行 class（左边框/弱化）+ 递归隐藏各行 `>` 标记。 */
  const renderQuote = (node: SyntaxNode): void => {
    const first = doc.lineAt(node.from);
    const last = doc.lineAt(node.to);
    for (let ln = first; ln.number <= last.number; ln = doc.line(ln.number + 1)) {
      addLine(Decoration.line({ class: "cm-md-quote" }), ln.from);
    }
    const quoteWalk = (n: SyntaxNode): void => {
      if (n.name === "QuoteMark") {
        hideMarkAndSpaces(n);
        return;
      }
      walk(n);
    };
    for (let c = node.firstChild; c; c = c.nextSibling) quoteWalk(c);
  };

  /** 代码块（含 mermaid 围栏，FUNC-3 仅源码展示）：围栏标记隐藏 + 内容行底纹。 */
  const renderFencedCode = (node: SyntaxNode): void => {
    const first = doc.lineAt(node.from);
    const last = doc.lineAt(node.to);
    for (let ln = first; ln.number <= last.number; ln = doc.line(ln.number + 1)) {
      addLine(Decoration.line({ class: "cm-md-codeblock" }), ln.from);
    }
    for (let c = node.firstChild; c; c = c.nextSibling) {
      if (c.name === "CodeMark" || c.name === "CodeInfo") add(hidden, c.from, c.to);
    }
  };

  /** 表格：GFM Table 节点整块替换为 table widget（坏表格无 Table 节点自然回退）。 */
  const renderTable = (node: SyntaxNode): void => {
    const cellsOf = (row: SyntaxNode): string[] => {
      const cells: string[] = [];
      for (let c = row.firstChild; c; c = c.nextSibling) {
        if (c.name === "TableCell") {
          cells.push(doc.sliceString(c.from, c.to).trim());
        }
      }
      return cells;
    };
    const header: string[] = [];
    const rows: string[][] = [];
    for (let c = node.firstChild; c; c = c.nextSibling) {
      if (c.name === "TableHeader") header.push(...cellsOf(c));
      else if (c.name === "TableRow") rows.push(cellsOf(c));
    }
    add(
      Decoration.replace({
        widget: new TableWidget(doc.sliceString(node.from, node.to), header, rows, node.from),
        block: true,
      }),
      node.from,
      node.to,
    );
  };

  /** 列表项：标记着色保留显示（Typora 式 bullet 可见），内容递归渲染。 */
  const renderListItem = (node: SyntaxNode): void => {
    for (let c = node.firstChild; c; c = c.nextSibling) {
      if (c.name === "ListMark") {
        add(Decoration.mark({ class: "cm-md-list-mark" }), c.from, c.to);
      } else {
        walk(c);
      }
    }
  };

  /** 渲染态块内递归分派。 */
  const walk = (node: SyntaxNode): void => {
    switch (node.name) {
      case "ATXHeading1":
      case "ATXHeading2":
      case "ATXHeading3":
      case "ATXHeading4":
      case "ATXHeading5":
      case "ATXHeading6":
        renderHeading(node);
        return;
      case "StrongEmphasis":
        renderPairedMarks(node, "cm-md-strong", "EmphasisMark");
        return;
      case "Emphasis":
        renderPairedMarks(node, "cm-md-em", "EmphasisMark");
        return;
      case "Strikethrough":
        renderPairedMarks(node, "cm-md-del", "StrikethroughMark");
        return;
      case "InlineCode":
        renderInlineCode(node);
        return;
      case "Link":
        renderLink(node, false);
        return;
      case "Image":
        renderLink(node, true);
        return;
      case "HorizontalRule":
        add(
          Decoration.replace({
            widget: new HrWidget(doc.sliceString(node.from, node.to), node.from),
            block: true,
          }),
          node.from,
          node.to,
        );
        return;
      case "Table":
        renderTable(node);
        return;
      case "Blockquote":
        renderQuote(node);
        return;
      case "FencedCode":
        renderFencedCode(node);
        return;
      case "ListItem":
        renderListItem(node);
        return;
      default:
        for (let c = node.firstChild; c; c = c.nextSibling) walk(c);
    }
  };

  // 顶层块划分（列表下钻到列表项为块，UI-2 §1.1 粒度）。
  // 全文档遍历（StateField 无 viewport）：CM6 仅对变化的 tile 做 DOM 增量
  // 更新，满足 SIS「仅受影响段落重渲染」；块级 widget 以 eq 比较实现 DOM 复用。
  const top = syntaxTree(state).topNode;
  for (let node = top.firstChild; node; node = node.nextSibling) {
    if (node.name === "BulletList" || node.name === "OrderedList") {
      for (let item = node.firstChild; item; item = item.nextSibling) {
        if (item.name !== "ListItem") continue;
        if (!inSelection(item.from, item.to)) walk(item);
      }
    } else if (!inSelection(node.from, node.to)) {
      walk(node);
    }
  }

  ranges.sort((a, b) => a.from - b.from || a.startSide - b.startSide);
  return Decoration.set(ranges, true);
}

/**
 * 所见即所得 decoration 状态字段：事务驱动重算（docChanged/selectionSet）。
 * 经 compute 型 facet（EditorView.decorations.from）提供「直接值」，
 * 因此允许含块级装饰——CM6 规则：块 widget/行级装饰只能走直接提供的 set，
 * ViewPlugin decorations（函数形式）禁止（RangeError: Block decorations may
 * not be specified via plugins）。
 * 随 markdown 语言挂载（languageRegistry 内并入 languageExtension，Compartment 槽位原则）。
 */
const wysiwygField = StateField.define<DecorationSet>({
  create(state: EditorState): DecorationSet {
    return buildDecorations(state);
  },
  update(deco: DecorationSet, tr: Transaction): DecorationSet {
    if (!(tr.docChanged || tr.selection)) return deco;
    // 语法树未对齐时沿用旧 deco（CM6 绘制时按事务 changes 自动映射，位置安全）
    if (syntaxTree(tr.state).length !== tr.state.doc.length) return deco;
    return buildDecorations(tr.state);
  },
  provide: (f) => EditorView.decorations.from(f),
});

/** 所见即所得扩展工厂：随 markdown 语言挂载（languageRegistry 内并入 languageExtension）。 */
export function markdownWysiwyg(): Extension {
  return wysiwygField;
}
