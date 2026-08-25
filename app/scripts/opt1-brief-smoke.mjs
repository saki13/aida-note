/**
 * OPT-1 自测（Playwright + 系统 Edge，SIS-OPT-1）
 *
 * 覆盖验收：未配置提示 / 配置后生成简报（mock 流式）/ 简报可见 /
 * 大纲与标题一一对应（层级）/ 锚点定位（滚动+光标）/ 失败兜底不破坏文档 / 无 JS 错误。
 * 运行：node scripts/opt1-brief-smoke.mjs  （需先 npm run dev 起 1420）
 */

import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const BASE = "http://localhost:1420/";
const LS_KEY = "aida-note-settings";
const CFG = { baseURL: "https://mock.example/v1", apiKey: "mock-key", model: "mock-model" };
const results = [];
let pageErrors = [];
let mockFail = false; // 成功 / 失败（500）两种响应切换

process.on("uncaughtException", (e) => {
  writeFileSync("scripts/opt1-report.txt", "UNCAUGHT:\n" + (e?.stack ?? String(e)), "utf8");
  process.exit(2);
});
process.on("unhandledRejection", (e) => {
  writeFileSync("scripts/opt1-report.txt", "UNHANDLED:\n" + (e?.stack ?? String(e)), "utf8");
  process.exit(2);
});

function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  -- " + detail : ""}`);
  writeFileSync(
    "scripts/opt1-report.txt",
    results.map((r) => `${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.detail ? "  -- " + r.detail : ""}`).join("\n"),
    "utf8",
  );
}

// 测试文档：markdown 标题结构（含 --- 分隔线，前后空行不误判为 setext）
const DOC = `# 文档标题

简介段落。

## 第一节

内容一。

### 细节

内容二。

---

## 第二节

内容三。
`;
// 预期大纲（行号/层级）
const EXPECTED_OUTLINE = [
  { line: 1, level: 1, title: "文档标题" },
  { line: 5, level: 2, title: "第一节" },
  { line: 9, level: 3, title: "细节" },
  { line: 15, level: 2, title: "第二节" },
];

const browser = await chromium.launch({ channel: "msedge", headless: true });

try {
  const context = await browser.newContext({ colorScheme: "light" });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(e.stack ?? String(e)));

  // 拦截 AI 流式接口（简报 prompt 含「生成简报」）：成功返回模拟摘要 / 失败返回 500
  await page.route("**/chat/completions", async (route) => {
    const body = route.request().postDataJSON() ?? {};
    const prompt = (body.messages?.[0]?.content ?? "").toString();
    if (!prompt.includes("生成简报")) {
      await route.fulfill({ status: 200, headers: { "Content-Type": "text/event-stream" }, body: "data: [DONE]\n\n" });
      return;
    }
    if (mockFail) {
      await route.fulfill({ status: 500, body: "mock server error" });
      return;
    }
    const content = "这是模拟的文档简报摘要：本文档介绍项目整体结构与主要功能模块。要点：- 界面布局 - 编辑能力 - AI 集成。";
    const sse =
      content
        .split("")
        .map((ch) => `data: ${JSON.stringify({ choices: [{ delta: { content: ch } }] })}\n\n`)
        .join("") + "data: [DONE]\n\n";
    await route.fulfill({ status: 200, headers: { "Content-Type": "text/event-stream" }, body: sse });
  });

  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForFunction(() => document.querySelector(".main-view") !== null);

  // 打开一个标签并输入 markdown 文档
  await page.keyboard.press("Control+n");
  await page.waitForSelector(".cm-editor", { timeout: 8000 });
  await page.locator(".cm-content").click();
  await page.keyboard.insertText(DOC);
  await page.waitForTimeout(300);

  const msgShown = (text) =>
    page.waitForFunction(
      (t) => Array.from(document.querySelectorAll(".n-message")).some((el) => (el.textContent ?? "").includes(t)),
      text,
      { timeout: 6000 },
    );

  const getStore = () =>
    page.evaluate(async () => {
      const app = document.querySelector("#app").__vue_app__;
      const pinia = app.config.globalProperties.$pinia;
      const { useAiStore } = await import("/src/stores/aiStore.ts");
      return useAiStore(pinia);
    });

  // ---- 1. 未配置 AI：点击「AI 简报」提示配置、浮层不打开 ----
  await page.locator(".tool-bar button", { hasText: "AI 简报" }).click();
  await msgShown("请先");
  const brief1 = await getStore();
  check("未配置 AI 时点击提示配置且浮层不打开", brief1.brief.open === false, `open=${brief1.brief.open}`);
  await page.waitForTimeout(3200); // 等 toast 消失，避免干扰后续

  // ---- 2. 注入 AI 配置（走 aiStore.saveConfig，免 reload 避免标签/草稿干扰） ----
  await page.evaluate(
    async (cfg) => {
      const app = document.querySelector("#app").__vue_app__;
      const pinia = app.config.globalProperties.$pinia;
      const { useAiStore } = await import("/src/stores/aiStore.ts");
      const ai = useAiStore(pinia);
      await ai.saveConfig(cfg);
    },
    CFG,
  );
  await page.waitForTimeout(300);

  // ---- 3. 配置后生成简报：弹窗出现、简报可见、大纲与标题一一对应 ----
  await page.locator(".tool-bar button", { hasText: "AI 简报" }).click();
  await page.waitForSelector(".n-modal", { timeout: 8000 });
  await page.waitForFunction(() => (document.querySelector(".brief-summary")?.textContent ?? "").includes("模拟的文档简报摘要"), undefined, { timeout: 8000 });
  const summary = (await page.locator(".brief-summary").textContent()) ?? "";
  check("生成简报：摘要内容可见", summary.includes("模拟的文档简报摘要"), summary.slice(0, 40));

  const anchorCount = await page.locator(".brief-anchor").count();
  const anchorTitles = await page.locator(".brief-anchor-title").allTextContents();
  check("大纲项与文档标题一一对应（数量/标题/顺序）", anchorCount === EXPECTED_OUTLINE.length && anchorTitles[0] === "文档标题" && anchorTitles[1] === "第一节" && anchorTitles[2] === "细节" && anchorTitles[3] === "第二节", `count=${anchorCount} titles=${anchorTitles.join(",")}`);

  const brief2 = await getStore();
  const oLine = (brief2.brief.outline ?? []).map((o) => o.line);
  const oLevel = (brief2.brief.outline ?? []).map((o) => o.level);
  check(
    "大纲行号/层级与文档标题一致",
    JSON.stringify(oLine) === JSON.stringify(EXPECTED_OUTLINE.map((e) => e.line)) && JSON.stringify(oLevel) === JSON.stringify(EXPECTED_OUTLINE.map((e) => e.level)),
    `lines=${oLine} levels=${oLevel}`,
  );

  // ---- 4. 锚点定位：点击「细节」项（行 9）-> 编辑器滚动 + 光标定位 + 浮层关闭 ----
  await page.locator(".brief-anchor", { hasText: "细节" }).click();
  await page.waitForFunction(() => !document.querySelector(".n-modal"));
  const statusText = (await page.locator(".status-bar .item").first().textContent()) ?? "";
  check("点击锚点后光标定位到对应行（状态栏显示行 9）且浮层关闭", statusText.includes("行 9"), statusText);

  // ---- 5. 失败兜底：mock 500 -> 错误提示且文档内容不变 ----
  const beforeFail = await page.evaluate(async () => {
    const app = document.querySelector("#app").__vue_app__;
    const pinia = app.config.globalProperties.$pinia;
    const { useTabsStore } = await import("/src/stores/tabsStore.ts");
    const ts = useTabsStore(pinia);
    return ts.activeTab?.content ?? "";
  });
  mockFail = true;
  await page.locator(".tool-bar button", { hasText: "AI 简报" }).click();
  await page.waitForSelector(".n-modal", { timeout: 8000 });
  await page.waitForSelector(".brief-error", { timeout: 8000 });
  const errText = (await page.locator(".brief-error").textContent()) ?? "";
  const afterFail = await page.evaluate(async () => {
    const app = document.querySelector("#app").__vue_app__;
    const pinia = app.config.globalProperties.$pinia;
    const { useTabsStore } = await import("/src/stores/tabsStore.ts");
    const ts = useTabsStore(pinia);
    return ts.activeTab?.content ?? "";
  });
  check("AI 失败：显示错误且文档内容不变", errText.includes("500") && afterFail === beforeFail, `err=${errText.slice(0, 50)}`);

  // ---- 6. 无页面 JS 错误（过滤 Naive 良性竞态） ----
  const realErrors = pageErrors.filter((e) => !e.includes("handleMouseMoveOutside") && !e.includes("syncPosition"));
  check("无页面 JS 错误", realErrors.length === 0, realErrors.slice(0, 3).join(" | "));
} catch (e) {
  check("脚本执行完整性", false, String(e));
} finally {
  await browser.close().catch(() => {});
}

const failed = results.filter((r) => !r.ok);
const report =
  results.map((r) => `${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.detail ? "  -- " + r.detail : ""}`).join("\n") +
  `\n\n===== AI 简报自测：${results.length - failed.length}/${results.length} PASS =====\n`;
writeFileSync("scripts/opt1-report.txt", report);
console.log(`\n===== AI 简报自测：${results.length - failed.length}/${results.length} PASS =====`);
if (failed.length > 0) process.exit(1);
