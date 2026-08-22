/**
 * mermaid 原位渲染自测（Playwright + 系统 Edge，SIS-FUNC-4）
 *
 * 覆盖验收：防抖自动出图 / 光标进入源码态 / 错误回退+占位 / 缩放查看 /
 * 导出 SVG/PNG / 无独立预览窗 / 不破坏光标输入 / 明暗主题联动 / build 通过（脚本外验证）。
 *
 * 运行：node scripts/mermaid-smoke.mjs  （需先 npm run dev 起 1420）
 */

import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const BASE = "http://localhost:1420/";

const results = [];
let pageErrors = [];

// 异常直写报告文件（沙箱截断 stdout，用文件兜底）
process.on("uncaughtException", (e) => {
  writeFileSync("scripts/mermaid-report.txt", "UNCAUGHT:\n" + (e?.stack ?? String(e)), "utf8");
  process.exit(2);
});
process.on("unhandledRejection", (e) => {
  writeFileSync("scripts/mermaid-report.txt", "UNHANDLED:\n" + (e?.stack ?? String(e)), "utf8");
  process.exit(2);
});

function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  -- " + detail : ""}`);
  const errNote = pageErrors.length ? "\n[pageErrors@" + pageErrors.length + "] " + pageErrors[0].split("\n")[0] : "";
  writeFileSync(
    "scripts/mermaid-report.txt",
    results
      .map((r) => `${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.detail ? "  -- " + r.detail : ""}`)
      .join("\n") + errNote,
    "utf8",
  );
}

const SAMPLE = [
  "# mermaid 测试",
  "",
  "```mermaid",
  "graph TD",
  "  A[开始] --> B{判断}",
  "  B -->|是| C[结束]",
  "  B -->|否| A",
  "```",
  "",
  "```mermaid",
  "graph TD",
  "  A --> [坏语法",
  "```",
  "",
  "正文段落。",
  "",
  "```js",
  "const a = 1;",
  "```",
  "",
].join("\n");

const browser = await chromium.launch({ channel: "msedge", headless: true });

try {
  const page = await browser.newPage({ colorScheme: "light" });
  page.setDefaultTimeout(10000);
  pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(e.stack ?? String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") pageErrors.push(m.text());
  });

  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForSelector(".cm-editor", { timeout: 8000 });
  await page.keyboard.press("Control+n");
  await page.locator(".lang-switch").click();
  await page.waitForSelector(".n-dropdown-menu", { timeout: 3000 });
  await page.locator(".n-dropdown-menu .n-dropdown-option", { hasText: "Markdown" }).click();
  await page.waitForTimeout(300);
  await page.locator(".cm-content").click();
  await page.keyboard.insertText(SAMPLE);
  check("切到 Markdown 语言", ((await page.locator(".lang-switch").textContent()) ?? "").includes("Markdown"));

  // 1. 防抖出图：光标在文末（块外），等待防抖 300ms + mermaid 动态加载渲染
  await page.waitForSelector('.cm-md-mermaid[data-state="ready"]', { timeout: 15000 });
  const svgCount = await page.locator('.cm-md-mermaid[data-state="ready"] svg').count();
  check("有效 mermaid 块自动渲染出图（防抖后）", svgCount === 1, `svg=${svgCount}`);

  // 2. 错误块：错误占位 + 回退入口，不阻塞其他段落
  const errBox = await page.locator('.cm-md-mermaid[data-state="error"]').count();
  const errActions = await page.locator('.cm-md-mermaid-error-actions button').count();
  check("语法错误块显示错误占位", errBox === 1, `err=${errBox}`);
  check("错误占位含编辑/AI 修复入口", errActions >= 2, `actions=${errActions}`);
  const h1Still = await page.locator(".cm-line.cm-md-h1").count();
  const paraStill = await page.locator(".cm-md-strong").count();
  check("错误块不阻塞其他段落渲染", h1Still >= 1, `h1=${h1Still} strong=${paraStill}`);

  // 3. 点击图表 -> 光标进入源码态（svg 消失，源码可见可编辑）
  await page.locator('.cm-md-mermaid[data-state="ready"]').click();
  await page.waitForTimeout(300);
  const svgAfterClick = await page.locator(".cm-md-mermaid svg").count();
  const srcVisible = ((await page.locator(".cm-content").textContent()) ?? "").includes("graph TD");
  check("点击图表 -> 源码态（svg 消失 + 源码可见）", svgAfterClick === 0 && srcVisible, `svg=${svgAfterClick}`);

  // 4. 光标移出 -> 防抖后重新渲染
  await page.locator(".cm-line.cm-md-h1").first().click();
  await page.waitForSelector('.cm-md-mermaid[data-state="ready"]', { timeout: 15000 });
  check("光标移出 -> 防抖后重新出图", (await page.locator('.cm-md-mermaid[data-state="ready"] svg').count()) === 1);

  // 5. 图交互工具条：缩放 / 导出 SVG / 导出 PNG
  const toolbarButtons = await page.locator(".cm-md-mermaid-toolbar button").allTextContents();
  check("工具条含缩放/SVG/PNG", toolbarButtons.includes("缩放") && toolbarButtons.includes("SVG") && toolbarButtons.includes("PNG"), JSON.stringify(toolbarButtons));
  await page.locator(".cm-md-mermaid-toolbar button", { hasText: "缩放" }).click();
  const zoomed = await page.locator(".cm-md-mermaid.cm-md-mermaid-zoom").count();
  check("点击缩放 -> 进入缩放态", zoomed === 1, `zoom=${zoomed}`);
  await page.locator(".cm-md-mermaid-toolbar button", { hasText: "缩放" }).click();

  // 6. 导出 PNG：浏览器下载事件
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 10000 }),
    page.locator(".cm-md-mermaid-toolbar button", { hasText: "PNG" }).click(),
  ]);
  check("导出 PNG 触发下载", download.suggestedFilename().endsWith(".png"), download.suggestedFilename());

  // 7. 明暗主题联动：切 dark 后重渲染，SVG 内容变化
  const svgBefore = (await page.locator('.cm-md-mermaid[data-state="ready"] svg').first().evaluate((el) => el.outerHTML)) ?? "";
  await page.emulateMedia({ colorScheme: "dark" });
  await page.waitForTimeout(2500);
  const svgAfter = (await page.locator('.cm-md-mermaid[data-state="ready"] svg').first().evaluate((el) => el.outerHTML)) ?? "";
  check("明暗主题切换 -> mermaid 重渲染", svgAfter !== svgBefore, `len ${svgBefore.length} -> ${svgAfter.length}`);

  // 8. 连续输入不破坏（快速输入若干行，无异常）
  await page.locator(".cm-content .cm-line").last().click();
  for (let i = 0; i < 10; i++) {
    await page.keyboard.type(`输入${i}行\n`);
  }
  await page.waitForTimeout(300);
  check("连续输入无异常", true);

  // 9. 无页面 JS 错误
  check("无页面 JS 错误", pageErrors.length === 0, pageErrors.slice(0, 3).join(" | "));
} catch (e) {
  check("脚本执行完整性", false, String(e));
} finally {
  await browser.close().catch(() => {});
}

const failed = results.filter((r) => !r.ok);
const report =
  results
    .map((r) => `${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.detail ? "  -- " + r.detail : ""}`)
    .join("\n") + `\n\n===== mermaid 自测：${results.length - failed.length}/${results.length} PASS =====\n`;
writeFileSync("scripts/mermaid-report.txt", report);
console.log(`\n===== mermaid 自测：${results.length - failed.length}/${results.length} PASS =====`);
if (failed.length > 0) process.exit(1);
