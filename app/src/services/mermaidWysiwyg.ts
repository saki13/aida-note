/**
 * mermaid 原位渲染扩展（SIS-FUNC-4 / UI-2 §2）
 *
 * 块级双态与 FUNC-3 同款：mermaid 围栏块在光标/选区外渲染为图表（block widget
 * 替换整块），光标进入时回源码态可编辑。渲染为「离开触发」：光标移出块后防抖
 * 300ms 再出图（编辑过程中不反复渲染，UI-2 §2.1）。
 *
 * 与 FUNC-3 三原则一致（decision-013/016）：
 * - markRaw：不向 Vue store 存任何 CM6 对象（widget 归 decoration，随语言挂载）。
 * - Compartment 槽位：扩展并入 languageExtension("markdown")，随 reconfigure 挂载/移除。
 * - watch 单点写缓存：无 Vue watch，渲染由 widget DOM 生命周期 + mermaid 异步驱动。
 *
 * 失败处理（SIS 验收）：语法错误显示可展开错误占位 + 回退源码入口（编辑），
 * 不阻塞其他块；[AI 修复] 为 UI-1 占位入口（逻辑归 AI-1，本 SIS 不实现）。
 *
 * 图交互（SIS 验收）：只读 + 缩放查看（CSS 切换原尺寸/自适应 + overflow 滚动）+
 * 导出 SVG/PNG（mermaid SVG 输出 + 浏览器下载，零新增依赖）。
 * 主题联动：渲染前按 prefers-color-scheme 设置 mermaid theme，matchMedia 变更时
 * 存活 widget 重新渲染。
 */

import { Decoration, WidgetType, type EditorView } from "@codemirror/view";
import type { EditorState } from "@codemirror/state";
import type { SyntaxNode } from "@lezer/common";
import type { MermaidConfig } from "mermaid";
import "./mermaidWysiwyg.css";

/** mermaid render id 唯一序号（mermaid 要求 render id 全局唯一）。 */
let seq = 0;

/** 当前系统主题是否为暗色（渲染态样式随 UI-3 明暗主题联动）。 */
function isDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** 存活 widget 容器集合 + 主题变更监听（单例，widget 销毁即失联由 isConnected 过滤）。 */
const liveWraps = new Set<HTMLElement>();
let themeMedia: MediaQueryList | null = null;

/** mermaid 渲染串行队列：mermaid 是全局单例，并发/错误块挂起会阻塞后续渲染（实测）。 */
let renderQueue: Promise<void> = Promise.resolve();
function enqueueRender(task: () => Promise<void>): void {
  renderQueue = renderQueue.then(task).catch(() => {});
}
const RENDER_TIMEOUT_MS = 10000;

function ensureThemeListener(): void {
  if (themeMedia) return;
  themeMedia = window.matchMedia("(prefers-color-scheme: dark)");
  themeMedia.addEventListener("change", () => {
    for (const w of [...liveWraps]) {
      if (!w.isConnected) {
        liveWraps.delete(w);
        continue;
      }
      void renderDiagram(w);
    }
  });
}

/** 从 FencedCode 节点取代码信息（如 "mermaid"）。 */
export function codeInfo(node: SyntaxNode, doc: EditorState["doc"]): string {
  for (let c = node.firstChild; c; c = c.nextSibling) {
    if (c.name === "CodeInfo") return doc.sliceString(c.from, c.to).trim();
  }
  return "";
}

/** 提取 mermaid 图表源码（CodeText 内容，不含围栏）。 */
function diagramText(node: SyntaxNode, doc: EditorState["doc"]): string {
  for (let c = node.firstChild; c; c = c.nextSibling) {
    if (c.name === "CodeText") return doc.sliceString(c.from, c.to);
  }
  return doc.sliceString(node.from, node.to);
}

/** mermaid 围栏块的块级替换装饰；非 mermaid 围栏返回 null（保持 FUNC-3 源码展示）。 */
export function mermaidBlockDecoration(node: SyntaxNode, doc: EditorState["doc"]): Decoration | null {
  if (codeInfo(node, doc) !== "mermaid") return null;
  return Decoration.replace({
    widget: new MermaidWidget(
      doc.sliceString(node.from, node.to),
      node.from,
      diagramText(node, doc),
    ),
    block: true,
  });
}

/** mermaid 图表块 widget：防抖出图 + 点击进源码 + 工具条（缩放/导出/编辑）+ 错误占位。 */
export class MermaidWidget extends WidgetType {
  constructor(
    readonly src: string,
    readonly from: number,
    readonly diagram: string,
  ) {
    super();
  }
  eq(other: MermaidWidget): boolean {
    return other.src === this.src;
  }
  toDOM(view: EditorView): HTMLElement {
    const wrap = document.createElement("div");
    wrap.className = "cm-md-mermaid";
    wrap.dataset.state = "loading";
    wrap.dataset.diagram = this.diagram; // 渲染数据源 + AI 修复数据契约
    wrap.textContent = "渲染中…";
    // 点击图表 -> 光标进入块源码态（与 FUNC-3 表格/分隔线同款交互，UI-2 §2.1）
    wrap.addEventListener("mousedown", (e) => {
      e.preventDefault();
      view.dispatch({ selection: { anchor: this.from } });
    });
    // 防抖 300ms 后出图：光标移出才触发；期间若移回（DOM 分离）由 isConnected 兜底跳过
    setTimeout(() => {
      if (wrap.isConnected) {
        liveWraps.add(wrap);
        ensureThemeListener();
        void renderDiagram(wrap);
      }
    }, 300);
    return wrap;
  }
}

/** 渲染图表到容器（防抖回调 / 主题变更重渲染共用；串行队列 + 超时保护）。 */
function renderDiagram(wrap: HTMLElement): Promise<void> {
  const diagram = wrap.dataset.diagram ?? "";
  const id = `aida-mermaid-${++seq}`;
  return enqueueRender(async () => {
    if (!wrap.isConnected) return;
    try {
      const mermaid = (await import("mermaid")).default;
      const config: MermaidConfig = {
        startOnLoad: false,
        theme: isDark() ? "dark" : "default",
        securityLevel: "strict",
        fontFamily: '"Segoe UI", "Microsoft YaHei", system-ui, sans-serif',
      };
      mermaid.initialize(config);
      const { svg } = await Promise.race([
        mermaid.render(id, diagram),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("mermaid 渲染超时（10s）")), RENDER_TIMEOUT_MS),
        ),
      ]);
      if (!wrap.isConnected) return;
      wrap.textContent = "";
      wrap.dataset.state = "ready";
      wrap.insertAdjacentHTML("beforeend", svg);
      wrap.appendChild(buildToolbar(wrap));
    } catch (e) {
      if (!wrap.isConnected) return;
      wrap.textContent = "";
      wrap.dataset.state = "error";
      wrap.appendChild(buildErrorBox(wrap, e));
    }
  });
}

/** 图工具条：缩放 / 导出 SVG / 导出 PNG（导出用 mermaid SVG 输出 + 浏览器下载）。 */
function buildToolbar(wrap: HTMLElement): HTMLElement {
  const bar = document.createElement("div");
  bar.className = "cm-md-mermaid-toolbar";
  bar.addEventListener("mousedown", (e) => e.stopPropagation()); // 不触发进源码态

  const zoom = document.createElement("button");
  zoom.type = "button";
  zoom.textContent = "缩放";
  zoom.addEventListener("click", () => wrap.classList.toggle("cm-md-mermaid-zoom"));

  const svgEl = (): SVGSVGElement | null => wrap.querySelector("svg");

  const exportSvg = document.createElement("button");
  exportSvg.type = "button";
  exportSvg.textContent = "SVG";
  exportSvg.addEventListener("click", () => {
    const svg = svgEl();
    if (!svg) return;
    const blob = new Blob([new XMLSerializer().serializeToString(svg)], {
      type: "image/svg+xml;charset=utf-8",
    });
    downloadUrl(URL.createObjectURL(blob), `mermaid-${seq}.svg`);
  });

  const exportPng = document.createElement("button");
  exportPng.type = "button";
  exportPng.textContent = "PNG";
  exportPng.addEventListener("click", () => {
    const svg = svgEl();
    if (!svg) return;
    exportSvgAsPng(svg, `mermaid-${seq}.png`);
  });

  bar.append(zoom, exportSvg, exportPng);
  return bar;
}

/** SVG 转 PNG 下载（canvas 绘制，白底，零新增依赖）。 */
function exportSvgAsPng(svg: SVGSVGElement, name: string): void {
  const xml = new XMLSerializer().serializeToString(svg);
  const svg64 = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(xml)));
  const img = new Image();
  img.onload = () => {
    const vb = svg.viewBox.baseVal;
    const w = vb.width || svg.clientWidth || 800;
    const h = vb.height || svg.clientHeight || 600;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      downloadUrl(canvas.toDataURL("image/png"), name);
    }
  };
  img.src = svg64;
}

/** 触发浏览器下载（URL.createObjectURL / dataURL）。 */
function downloadUrl(url: string, name: string): void {
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** 语法错误占位：错误摘要 + [编辑源码] + [AI 修复] 占位入口（归 AI-1）。 */
function buildErrorBox(wrap: HTMLElement, err: unknown): HTMLElement {
  const box = document.createElement("div");
  box.className = "cm-md-mermaid-error";

  const msg = document.createElement("details");
  msg.className = "cm-md-mermaid-error-details";
  const summary = document.createElement("summary");
  summary.textContent = "mermaid 语法错误";
  msg.appendChild(summary);
  const text = document.createElement("pre");
  text.textContent = err instanceof Error ? err.message : String(err);
  msg.appendChild(text);
  box.appendChild(msg);

  const actions = document.createElement("div");
  actions.className = "cm-md-mermaid-error-actions";

  const edit = document.createElement("button");
  edit.type = "button";
  edit.textContent = "编辑源码";
  edit.addEventListener("click", () => {
    wrap.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
  });
  actions.appendChild(edit);

  // AI 修复入口占位：数据传递约定 = 出错源码存 dataset.diagram，逻辑归 AI-1
  const aiFix = document.createElement("button");
  aiFix.type = "button";
  aiFix.textContent = "AI 修复";
  aiFix.dataset.source = wrap.dataset.diagram ?? "";
  aiFix.addEventListener("click", () => {
    // AI-1 未接入：占位提示（AI 修复逻辑归 AI-1 实现，本 SIS 仅预留入口与数据契约）
    aiFix.textContent = "AI 修复归 AI-1 接入（未配置）";
    aiFix.disabled = true;
  });
  actions.appendChild(aiFix);

  box.appendChild(actions);
  return box;
}
