/**
 * AI mermaid 修复自测（Playwright + 系统 Edge，SIS-AI-1 §4，工具栏入口）
 *
 * 覆盖：工具栏「修复 mermaid」无块提示 / 整块替换（坏语法行消失）/
 * 请求形状（mermaid prompt + stream）/ 无页面错误。
 *
 * 说明（沙箱限制实测）：mermaid 原位渲染（动态 import + SVG + 系统字体测量）在
 * 本沙箱下不稳定——mermaid-smoke 一次 13/13、下一次被静默击杀，无页面错误。
 * 故本脚本在纯文本模式验证「修复 mermaid」全链路（firstMermaidBlock 正则提取 +
 * aiStore.fixMermaid 流式 + replaceRange 整块替换），不触发渲染；
 * 错误占位「AI 修复」按钮的存在性由 mermaid-smoke（错误占位含 AI 修复入口）覆盖，
 * 其点击行为与工具栏共用同一 fixMermaid/replace 接线，真实渲染冒烟留 PO 本地验证。
 *
 * 流式策略同 ai-smoke.mjs：page.route 拦截 chat/completions 返回模拟 SSE。
 * 运行：node scripts/ai-mermaid-smoke.mjs  （需先 npm run dev 起 1420）
 */

import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const BASE = "http://localhost:1420/";
const LS_KEY = "aida-note-settings";
const CFG = {
  baseURL: "https://api-inference.modelscope.cn/v1",
  apiKey: "ms-ad851672-5bf0-4f1b-83a4-f73145eec633",
  model: "Qwen/Qwen3.5-122B-A10B",
};

const results = [];
let pageErrors = [];
const captured = [];

process.on("uncaughtException", (e) => {
  writeFileSync("scripts/ai-mermaid-report.txt", "UNCAUGHT:\n" + (e?.stack ?? String(e)), "utf8");
  process.exit(2);
});
process.on("unhandledRejection", (e) => {
  writeFileSync("scripts/ai-mermaid-report.txt", "UNHANDLED:\n" + (e?.stack ?? String(e)), "utf8");
  process.exit(2);
});

function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  -- " + detail : ""}`);
  const errNote = pageErrors.length ? "\n[pageErrors@" + pageErrors.length + "] " + pageErrors[0].split("\n")[0] : "";
  writeFileSync(
    "scripts/ai-mermaid-report.txt",
    results.map((r) => `${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.detail ? "  -- " + r.detail : ""}`).join("\n") + errNote,
    "utf8",
  );
}

const browser = await chromium.launch({ channel: "msedge", headless: true });

try {
  // 预置 AI 配置（跳过配置 UI）
  const context = await browser.newContext({ colorScheme: "light" });
  await context.addInitScript(
    ([key, cfg]) => {
      const cur = JSON.parse(localStorage.getItem(key) || "{}");
      localStorage.setItem(key, JSON.stringify({ ...cur, aiConfig: cfg }));
    },
    [LS_KEY, CFG],
  );
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(e.stack ?? String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") pageErrors.push(m.text());
  });

  // 拦截 AI 流式接口：记录请求形状，返回模拟 SSE（mermaid 返回合法代码）
  await page.route("**/chat/completions", async (route) => {
    const body = route.request().postDataJSON() ?? {};
    const prompt = (body.messages?.[0]?.content ?? "").toString();
    captured.push({ model: body.model, stream: body.stream, mermaid: prompt.includes("mermaid") });
    const content = prompt.includes("mermaid") ? "graph TD\n  A --> B\n  B --> C" : "AI 流式回答内容（模拟流）。";
    const sse =
      content
        .split("")
        .map((ch) => `data: ${JSON.stringify({ choices: [{ delta: { content: ch } }] })}\n\n`)
        .join("") + "data: [DONE]\n\n";
    await route.fulfill({ status: 200, headers: { "Content-Type": "text/event-stream" }, body: sse });
  });

  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.keyboard.press("Control+n"); // 无标签时先建标签
  await page.waitForSelector(".cm-editor", { timeout: 8000 });
  await page.locator(".cm-content").click();
  // 纯文本模式：不切 Markdown、不触发 mermaid 渲染（沙箱渲染不稳定，见文件头注释）
  await page.keyboard.insertText("```mermaid\ngraph TD\n  A --> [坏语法\n```");
  await page.waitForTimeout(200);

  const getContent = () =>
    page.evaluate(async () => {
      const app = document.querySelector("#app").__vue_app__;
      const pinia = app.config.globalProperties.$pinia;
      const { useTabsStore } = await import("/src/stores/tabsStore.ts");
      const ts = useTabsStore(pinia);
      return ts.activeTab ? ts.activeTab.content : "";
    });
  const waitMessage = (text) =>
    page.waitForFunction(
      (t) => Array.from(document.querySelectorAll(".n-message")).some((el) => (el.textContent ?? "").includes(t)),
      text,
      { timeout: 6000 },
    );

  // ---- 1. 工具栏「修复 mermaid」：整块替换 -> 坏语法行消失 ----
  const contentBeforeFix = await getContent();
  await page.locator(".tool-bar button", { hasText: "修复 mermaid" }).click();
  await page.waitForTimeout(800);
  const contentAfterFix = await getContent();
  check(
    "工具栏「修复 mermaid」整块替换（坏语法行消失）",
    contentAfterFix !== contentBeforeFix && !contentAfterFix.includes("A --> [坏语法") && contentAfterFix.includes("A --> B"),
    `len ${contentBeforeFix.length} -> ${contentAfterFix.length}`,
  );

  // ---- 2. 请求形状（mermaid prompt + stream:true，1 次调用）----
  check(
    "mermaid 修复请求形状正确（mermaid prompt + stream）",
    captured.length === 1 && captured[0].model === CFG.model && captured[0].stream === true && captured[0].mermaid,
    JSON.stringify(captured),
  );

  // ---- 3. 无 mermaid 块：提示且不发请求 ----
  await page.locator(".cm-content").click();
  await page.keyboard.press("Control+a");
  await page.keyboard.press("Delete");
  await page.waitForTimeout(200);
  const callsBefore3 = captured.length;
  await page.locator(".tool-bar button", { hasText: "修复 mermaid" }).click();
  await waitMessage("当前文档没有 mermaid 代码块");
  await page.waitForTimeout(200);
  check("无 mermaid 块：提示且未发起请求", captured.length === callsBefore3, `calls ${callsBefore3} -> ${captured.length}`);

  // ---- 4. 无页面 JS 错误 ----
  check("无页面 JS 错误", pageErrors.length === 0, pageErrors.slice(0, 3).join(" | "));
  await context.close();
} catch (e) {
  check("脚本执行完整性", false, String(e));
} finally {
  await browser.close().catch(() => {});
}

const failed = results.filter((r) => !r.ok);
const report =
  results.map((r) => `${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.detail ? "  -- " + r.detail : ""}`).join("\n") +
  `\n\n===== AI mermaid 修复自测：${results.length - failed.length}/${results.length} PASS =====\n`;
writeFileSync("scripts/ai-mermaid-report.txt", report);
console.log(`\n===== AI mermaid 修复自测：${results.length - failed.length}/${results.length} PASS =====`);
if (failed.length > 0) process.exit(1);
