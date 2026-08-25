/**
 * OPT-5 自测（Playwright + 系统 Edge，SIS-OPT-5）
 *
 * 覆盖验收：右上角悬窗（非弹窗）/ 收起展开 / 关闭后入口重开 / 同文件缓存（API 计数=1）/
 * 刷新重新生成（计数+1）/ 生成中关闭后台完成重开展示 / 切换文件各存一份（空态+生成）/
 * 未配置提示 / 锚点定位 / 无 JS 错误。
 * 运行：node scripts/opt5-brief-smoke.mjs  （需先 npm run dev 起 1420）
 */

import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const BASE = "http://localhost:1420/";
const LS_KEY = "aida-note-settings";
const CFG = { baseURL: "https://mock.example/v1", apiKey: "mock-key", model: "mock-model" };
const results = [];
let pageErrors = [];
let apiCalls = 0; // mock 接口被调次数（缓存命中验证依据）

process.on("uncaughtException", (e) => {
  writeFileSync("scripts/opt5-report.txt", "UNCAUGHT:\n" + (e?.stack ?? String(e)), "utf8");
  process.exit(2);
});
process.on("unhandledRejection", (e) => {
  writeFileSync("scripts/opt5-report.txt", "UNHANDLED:\n" + (e?.stack ?? String(e)), "utf8");
  process.exit(2);
});

function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  -- " + detail : ""}`);
  writeFileSync(
    "scripts/opt5-report.txt",
    results.map((r) => `${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.detail ? "  -- " + r.detail : ""}`).join("\n"),
    "utf8",
  );
}

const DOC_A = `# 文档A标题

简介。

## 第一节

内容一。

### 细节

内容二。
`;
const DOC_B = `# 文档B标题

B 的正文。
`;

const browser = await chromium.launch({ channel: "msedge", headless: true });

try {
  const context = await browser.newContext({ colorScheme: "light" });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(e.stack ?? String(e)));

  // 拦截 AI 流式：计数 + 慢速分块（模拟生成中）
  await page.route("**/chat/completions", async (route) => {
    const body = route.request().postDataJSON() ?? {};
    const prompt = (body.messages?.[0]?.content ?? "").toString();
    if (!prompt.includes("生成简报")) {
      await route.fulfill({ status: 200, headers: { "Content-Type": "text/event-stream" }, body: "data: [DONE]\n\n" });
      return;
    }
    apiCalls++;
    const content = "这是模拟的简报摘要（第 " + apiCalls + " 次生成）。本文档内容概述。";
    const parts = content.split("");
    let sse = "";
    for (const ch of parts) {
      sse += `data: ${JSON.stringify({ choices: [{ delta: { content: ch } }] })}\n\n`;
      await new Promise((r) => setTimeout(r, 8)); // 慢速流式，便于捕获「生成中关闭」
    }
    sse += "data: [DONE]\n\n";
    await route.fulfill({ status: 200, headers: { "Content-Type": "text/event-stream" }, body: sse });
  });

  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForFunction(() => document.querySelector(".main-view") !== null);

  // 打开标签 A 并输入文档
  await page.keyboard.press("Control+n");
  await page.waitForSelector(".cm-editor", { timeout: 8000 });
  await page.locator(".cm-content").click();
  await page.keyboard.insertText(DOC_A);
  await page.waitForTimeout(200);

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

  // ---- 1. 未配置 AI：点击提示、悬窗不出现 ----
  await page.locator(".tool-bar button", { hasText: "AI 简报" }).click();
  await msgShown("请先");
  const brief0 = await getStore();
  check("未配置 AI 时点击提示配置且悬窗不打开", brief0.briefUi.visible === false, `visible=${brief0.briefUi.visible}`);
  await page.waitForTimeout(3200);

  // ---- 2. 注入配置 -> 打开悬窗（生成第 1 次） ----
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
  await page.waitForTimeout(200);
  await page.locator(".tool-bar button", { hasText: "AI 简报" }).click();
  await page.waitForSelector(".brief-panel", { timeout: 8000 });
  await page.waitForFunction(() => (document.querySelector(".brief-summary")?.textContent ?? "").includes("模拟的简报摘要"), undefined, { timeout: 10000 });
  check("悬窗展示在右上角且生成简报内容可见", apiCalls === 1 && (await page.locator(".brief-summary").textContent()).includes("第 1 次生成"), `calls=${apiCalls}`);
  const isModal = await page.locator(".n-modal").count();
  check("悬窗非 n-modal 弹窗（右上角面板）", isModal === 0 && (await page.locator(".brief-panel").count()) === 1, `modal=${isModal}`);
  const fileNameText = (await page.locator(".brief-file").textContent()) ?? "";
  check("悬窗显示当前文件名", fileNameText.length > 0, fileNameText);

  // ---- 3. 收起为图标 -> 展开内容不丢（不重新生成） ----
  await page.locator(".brief-head button", { hasText: "—" }).click();
  await page.waitForSelector(".brief-mini", { timeout: 5000 });
  await page.locator(".brief-mini").click();
  await page.waitForSelector(".brief-panel", { timeout: 5000 });
  const summaryAfterExpand = (await page.locator(".brief-summary").textContent()) ?? "";
  check("收起为图标再展开：内容保留且不重复调 API", apiCalls === 1 && summaryAfterExpand.includes("第 1 次生成"), `calls=${apiCalls}`);

  // ---- 4. 关闭悬窗 -> 入口重开 -> 命中缓存（API 计数仍 1） ----
  await page.locator(".brief-head button", { hasText: "×" }).click();
  await page.waitForFunction(() => !document.querySelector(".brief-panel") && !document.querySelector(".brief-mini"));
  await page.locator(".tool-bar button", { hasText: "AI 简报" }).click();
  await page.waitForSelector(".brief-panel", { timeout: 5000 });
  await page.waitForTimeout(400);
  check("关闭后重开悬窗：直接展示缓存不重复调 API", apiCalls === 1, `calls=${apiCalls}`);

  // ---- 5. 刷新按钮：重新生成（计数 +1） ----
  await page.locator(".brief-head button", { hasText: "刷新" }).click();
  await page.waitForFunction(() => (document.querySelector(".brief-summary")?.textContent ?? "").includes("第 2 次生成"), undefined, { timeout: 10000 });
  check("刷新按钮重新生成（API 计数 +1、内容更新）", apiCalls === 2, `calls=${apiCalls}`);

  // ---- 6. 生成中关闭悬窗：后台完成写缓存，重开显示缓存 ----
  await page.locator(".brief-head button", { hasText: "刷新" }).click(); // 第 3 次生成（慢速流式）
  await page.waitForFunction(() => document.querySelector(".brief-loading") !== null, undefined, { timeout: 5000 });
  await page.locator(".brief-head button", { hasText: "×" }).click(); // 生成中关闭
  await page.waitForTimeout(1200); // 等 mock 流式完成
  await page.locator(".tool-bar button", { hasText: "AI 简报" }).click();
  await page.waitForSelector(".brief-panel", { timeout: 5000 });
  await page.waitForFunction(() => (document.querySelector(".brief-summary")?.textContent ?? "").includes("第 3 次生成"), undefined, { timeout: 8000 });
  check("生成中关闭：后台完成，重开悬窗展示缓存", apiCalls === 3 && (await page.locator(".brief-summary").textContent()).includes("第 3 次生成"), `calls=${apiCalls}`);

  // ---- 7. 切换文件：B 无缓存 -> 空态 + 生成按钮；A 缓存保留 ----
  await page.keyboard.press("Control+n"); // 新建标签 B
  await page.waitForSelector(".cm-editor", { timeout: 8000 });
  await page.locator(".cm-content").click();
  await page.keyboard.insertText(DOC_B);
  await page.waitForTimeout(300);
  await page.waitForSelector(".brief-empty", { timeout: 5000 });
  const emptyText = (await page.locator(".brief-empty").textContent()) ?? "";
  check("切换文件显示空态（无缓存）+ 生成按钮", emptyText.includes("还没有简报"), emptyText.slice(0, 30));
  await page.locator(".brief-empty button", { hasText: "生成简报" }).click();
  await page.waitForFunction(() => (document.querySelector(".brief-summary")?.textContent ?? "").includes("第 4 次生成"), undefined, { timeout: 10000 });
  check("B 生成简报（各文件独立缓存，API 计数 +1）", apiCalls === 4, `calls=${apiCalls}`);
  // 切回 A（第一个 tab）：直接展示 A 的缓存（不重新生成）
  const tabCount = await page.locator(".tab").count();
  await page.locator(".tab").nth(0).click();
  await page.waitForTimeout(400);
  const summaryA = (await page.locator(".brief-summary").textContent()) ?? "";
  check("切回 A：直接展示 A 缓存（不重复生成）", tabCount >= 2 && apiCalls === 4 && summaryA.includes("第 3 次生成"), `calls=${apiCalls} tabs=${tabCount}`);

  // ---- 8. 锚点定位：点击大纲项 -> 光标定位 ----
  await page.locator(".brief-anchor", { hasText: "第一节" }).click();
  await page.waitForTimeout(300);
  const statusText = (await page.locator(".status-bar .item").first().textContent()) ?? "";
  check("大纲锚点点击后编辑器滚动定位（状态栏行号）", statusText.includes("行 5"), statusText);

  // ---- 9. 无页面 JS 错误（过滤 Naive 良性竞态） ----
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
  `\n\n===== AI 简报悬窗自测：${results.length - failed.length}/${results.length} PASS =====\n`;
writeFileSync("scripts/opt5-report.txt", report);
console.log(`\n===== AI 简报悬窗自测：${results.length - failed.length}/${results.length} PASS =====`);
if (failed.length > 0) process.exit(1);
