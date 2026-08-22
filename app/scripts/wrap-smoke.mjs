/**
 * 软换行自测（Playwright + 系统 Edge，SIS-FUNC-8）
 *
 * 覆盖验收：默认开启长行折行 / 工具栏切换即时生效 / 全局共享 /
 * 折行不写入换行符 / 重启记住状态 / 折行下光标选择正常。
 *
 * 检测依据：EditorView.lineWrapping = contentAttributes({class:"cm-lineWrapping"})，
 * .cm-content 有/无该 class 即折行开/关。
 * 持久化：浏览器环境 settingsService 用 localStorage 兜底，reload 可验证。
 *
 * 运行：node scripts/wrap-smoke.mjs  （需先 npm run dev 起 1420）
 */

import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const BASE = "http://localhost:1420/";
const results = [];
let pageErrors = [];

process.on("uncaughtException", (e) => {
  writeFileSync("scripts/wrap-report.txt", "UNCAUGHT:\n" + (e?.stack ?? String(e)), "utf8");
  process.exit(2);
});
process.on("unhandledRejection", (e) => {
  writeFileSync("scripts/wrap-report.txt", "UNHANDLED:\n" + (e?.stack ?? String(e)), "utf8");
  process.exit(2);
});

function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  -- " + detail : ""}`);
  writeFileSync(
    "scripts/wrap-report.txt",
    results.map((r) => `${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.detail ? "  -- " + r.detail : ""}`).join("\n"),
    "utf8",
  );
}

const browser = await chromium.launch({ channel: "msedge", headless: true });

const LONG_LINE = "a".repeat(200);

async function wrapOn(page) {
  return await page.evaluate(() => document.querySelector(".cm-content")?.classList.contains("cm-lineWrapping") ?? false);
}
async function content(page) {
  return (await page.locator(".cm-content").textContent()) ?? "";
}
async function btnLabel(page) {
  return (await page.locator(".tool-bar button", { hasText: "换行" }).textContent()) ?? "";
}

try {
  const context = await browser.newContext({ colorScheme: "light" });
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(e.stack ?? String(e)));

  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForSelector(".cm-editor", { timeout: 8000 });

  // ---- 1. 默认开启软换行，长行折行显示 ----
  await page.keyboard.press("Control+n");
  await page.waitForTimeout(300);
  await page.locator(".cm-content").click();
  await page.keyboard.type(LONG_LINE, { delay: 0 });
  await page.waitForTimeout(300);
  const defaultOn = await wrapOn(page);
  const scrollerWrapped = await page.evaluate(() => {
    const sc = document.querySelector(".cm-scroller");
    return sc ? getComputedStyle(sc).whiteSpace : "";
  });
  check("默认开启软换行（.cm-content 含 cm-lineWrapping）", defaultOn, `wrap=${defaultOn} whiteSpace=${scrollerWrapped}`);
  const contentDefault = await content(page);
  check("长行内容无新增换行符（200 字符单行无 \\n）", !contentDefault.includes("\n") && contentDefault.length === LONG_LINE.length, `len=${contentDefault.length}`);

  // ---- 2. 工具栏切换关闭，即时生效 ----
  await page.locator(".tool-bar button", { hasText: "换行" }).click();
  await page.waitForTimeout(300);
  const off = await wrapOn(page);
  const labelOff = await btnLabel(page);
  check("工具栏切换关闭软换行（class 移除 + 按钮状态）", !off && labelOff.includes("关"), `wrap=${off} label=${labelOff}`);
  // 切回开
  await page.locator(".tool-bar button", { hasText: "换行" }).click();
  await page.waitForTimeout(300);
  const onAgain = await wrapOn(page);
  const labelOn = await btnLabel(page);
  check("再次切换开启软换行（class 恢复 + 按钮状态）", onAgain && labelOn.includes("开"), `wrap=${onAgain} label=${labelOn}`);

  // ---- 3. 切换不写入换行符（内容不变） ----
  const contentBefore = await content(page);
  await page.locator(".tool-bar button", { hasText: "换行" }).click(); // off
  await page.waitForTimeout(300);
  await page.locator(".tool-bar button", { hasText: "换行" }).click(); // on
  await page.waitForTimeout(300);
  const contentAfter = await content(page);
  check("折行开关切换不写入换行符（内容不变）", contentAfter === contentBefore, `same=${contentAfter === contentBefore}`);

  // ---- 4. 全局共享：切换标签后状态保持 ----
  await page.locator(".tool-bar button", { hasText: "换行" }).click(); // off（全局）
  await page.waitForTimeout(300);
  await page.keyboard.press("Control+n"); // 新标签
  await page.waitForTimeout(400);
  const newTabWrap = await wrapOn(page);
  check("全局共享：新标签继承关闭状态", !newTabWrap, `newTabWrap=${newTabWrap}`);
  await page.locator(".tool-bar button", { hasText: "换行" }).click(); // 开回
  await page.waitForTimeout(300);

  // ---- 5. 折行下光标定位 / 选择 / 行号正常（当前标签输入长行后验证） ----
  await page.locator(".cm-content").click();
  await page.keyboard.type("hello world", { delay: 2 });
  await page.waitForTimeout(200);
  const lineNo = await page.evaluate(() => document.querySelector(".cm-lineNumbers .cm-activeLineGutter")?.textContent ?? "");
  await page.keyboard.press("Home");
  await page.keyboard.down("Shift");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.up("Shift");
  const selected = await page.evaluate(() => window.getSelection()?.toString() ?? "");
  check("折行下选择正常（Shift+→ 选中字符）", selected.length === 2, `sel=${JSON.stringify(selected)}`);
  check("行号显示正常（当前行 gutter 为 1）", lineNo === "1", `lineNo=${JSON.stringify(lineNo)}`);

  // ---- 6. 持久化：切关后 reload 记住 ----
  await page.locator(".tool-bar button", { hasText: "换行" }).click(); // off
  await page.waitForTimeout(300);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector(".cm-editor", { timeout: 8000 });
  await page.waitForTimeout(600);
  const afterReload = await wrapOn(page);
  const labelReload = await btnLabel(page);
  check("重启后记住开关状态（reload 后仍为关）", !afterReload && labelReload.includes("关"), `wrap=${afterReload} label=${labelReload}`);

  // ---- 7. 无页面 JS 错误 ----
  check("无页面 JS 错误", pageErrors.length === 0, pageErrors.slice(0, 3).join(" | "));
} catch (e) {
  check("脚本执行完整性", false, String(e));
} finally {
  await browser.close().catch(() => {});
}

const failed = results.filter((r) => !r.ok);
const report =
  results.map((r) => `${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.detail ? "  -- " + r.detail : ""}`).join("\n") +
  `\n\n===== 软换行自测：${results.length - failed.length}/${results.length} PASS =====\n`;
writeFileSync("scripts/wrap-report.txt", report);
console.log(`\n===== 软换行自测：${results.length - failed.length}/${results.length} PASS =====`);
if (failed.length > 0) process.exit(1);
