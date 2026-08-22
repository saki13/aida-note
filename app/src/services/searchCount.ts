/**
 * 搜索匹配计数指示器（SIS-FUNC-7）
 *
 * CM6 搜索面板本身没有视觉「匹配计数 / 空态提示」（计数仅经屏幕阅读器播报，
 * announceMatch），SIS 要求可见计数。本扩展监听搜索查询变化，在面板内
 * 追加一个计数 span：有结果显示「N 个匹配」、无结果显示「无结果」、
 * 非法正则显示「正则无效」。
 */

import { ViewPlugin, type ViewUpdate, type EditorView } from "@codemirror/view";
import { SearchQuery, getSearchQuery } from "@codemirror/search";

class SearchCount {
  private el: HTMLSpanElement | null = null;
  private lastKey = "";

  constructor(private readonly view: EditorView) {}

  update(update: ViewUpdate): void {
    const q = getSearchQuery(update.state);
    const key =
      q.search +
      "\u0000" +
      String(q.caseSensitive) +
      "\u0000" +
      String(q.regexp) +
      "\u0000" +
      String(q.wholeWord) +
      "\u0000" +
      update.state.doc.length;
    if (key === this.lastKey) return;
    this.lastKey = key;

    const panel = this.view.dom.querySelector<HTMLElement>(".cm-search");
    if (!panel) {
      this.el?.remove();
      this.el = null;
      return;
    }
    const text = this.countText(update, q);
    if (!text) {
      this.el?.remove();
      this.el = null;
      return;
    }
    if (!this.el) {
      this.el = document.createElement("span");
      this.el.className = "cm-search-count";
      panel.appendChild(this.el);
    }
    this.el.textContent = text;
    this.el.classList.toggle("cm-search-count-error", text !== "" && (text.includes("无结果") || text.includes("正则")));
  }

  private countText(
    update: ViewUpdate,
    q: { search: string; caseSensitive: boolean; regexp: boolean; wholeWord: boolean },
  ): string {
    if (!q.search) return "";
    const query = new SearchQuery({
      search: q.search,
      caseSensitive: q.caseSensitive,
      regexp: q.regexp,
      wholeWord: q.wholeWord,
    });
    if (!query.valid) return "正则无效";
    try {
      const cursor = query.getCursor(update.state);
      let n = 0;
      while (!cursor.next().done) n++;
      return n === 0 ? "无结果" : `${n} 个匹配`;
    } catch {
      return "正则无效";
    }
  }
}

/** 搜索计数扩展：随搜索面板启用（注册于 EditorPane 的 extensions）。 */
export const searchCountExtension = ViewPlugin.fromClass(SearchCount);
