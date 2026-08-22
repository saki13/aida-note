/**
 * 搜索/替换自测（Playwright + 系统 Edge，SIS-FUNC-7）
 *
 * 覆盖验收：Ctrl+F 顶部浮动 + Esc 关闭 / 三选项（大小写/全词/正则）/
 * 高亮所有匹配 + 计数 / 上一处下一处跳转 / 单次+全部替换进撤销栈 /
 * 无匹配空态 / 非法正则不崩溃。
 *
 * 注意（FUNC-5/7 自测经验）：
 * - 搜索框输入用「点击 + Ctrl+A + type」：CM6 搜索框 commit 走 onkeyup/onchange，
 *   Playwright fill 的 change 在面板二次打开后不可靠（实测不触发 commit）。
 * - 计数用自研 .cm-search-count（CM6 无视觉计数）。
 * - 替换后撤销前先点击编辑器聚焦（焦点在搜索面板时 Ctrl+Z 不达编辑器）。
 *
 * 运行：node scripts/search-smoke.mjs  （需先 npm run dev 起 1420）
 */

import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const BASE = "http://localhost:1420/";
const results = [];
let pageErrors = [];

process.on("uncaughtException", (e) => {
  writeFileSync("scripts/search-report.txt", "UNCAUGHT:\n" + (e?.stack ?? String(e)), "utf8");
  process.exit(2);
});
process.on("unhandledRejection", (e) => {
  writeFileSync("scripts/search-report.txt", "UNHANDLED:\n" + (e?.stack ?? String(e)), "utf8");
  process.exit(2);
});

function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  -- " + detail : ""}`);
  writeFileSync(
    "scripts/search-report.txt",
    results.map((r) => `${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.detail ? "  -- " + r.detail : ""}`).join("\n"),
    "utf8",
  );
}

const browser = await chromium.launch({ channel: "msedge", headless: true });

async function newJsTab(page, sample) {
  await page.keyboard.press("Control+n");
  await page.waitForTimeout(300);
  await page.locator(".lang-switch").click();
  await page.waitForSelector(".n-dropdown-menu", { timeout: 3000 });
  await page.locator(".n-dropdown-menu .n-dropdown-option", { hasText: "JavaScript" }).click();
  await page.waitForTimeout(300);
  await page.locator(".cm-content").click();
  await page.keyboard.type(sample, { delay: 1 });
  await page.waitForTimeout(300);
}

async function content(page) {
  return (await page.locator(".cm-content").textContent()) ?? "";
}
/** 搜索框输入：点击 + Ctrl+A 全选 + type（type 触发 keyup，commit 可靠）。 */
async function setQuery(page, text) {
  const input = page.locator(".cm-search [main-field]");
  await input.click();
  await page.keyboard.press("Control+a");
  await page.keyboard.type(text, { delay: 20 });
  await page.waitForTimeout(400);
}
async function matchCount(page) {
  return await page.evaluate(() => document.querySelectorAll(".cm-searchMatch").length);
}
async function countText(page) {
  return (await page.locator(".cm-search .cm-search-count").textContent().catch(() => "")) ?? "";
}
async function selText(page) {
  return await page.evaluate(() => window.getSelection()?.toString() ?? "");
}

try {
  const page = await browser.newPage({ colorScheme: "light" });
  page.setDefaultTimeout(8000);
  pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(e.stack ?? String(e)));

  await page.goto(BASE, { waitUntil: "networkidle" });
  // 无标签时显示最近文件空态（SIS-FUNC-11），需先建标签才有 .cm-editor
  await page.keyboard.press("Control+n");
  await page.waitForSelector(".cm-editor", { timeout: 8000 });

  // ---- 1. Ctrl+F 唤起顶部浮动搜索框，Esc 关闭 ----
  await newJsTab(page, "const apple = 1;\nconst banana = 2;\napple banana");
  await page.keyboard.press("Control+f");
  await page.waitForSelector(".cm-panels-top", { timeout: 5000 });
  const panelPos = await page.evaluate(() => {
    const p = document.querySelector(".cm-panels-top")?.getBoundingClientRect();
    const e = document.querySelector(".cm-editor")?.getBoundingClientRect();
    return p && e ? { top: Math.round(p.top), editorTop: Math.round(e.top) } : null;
  });
  check("Ctrl+F 唤起顶部浮动搜索框", panelPos !== null && panelPos.top < panelPos.editorTop + 60, JSON.stringify(panelPos));

  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  const closed = await page.evaluate(() => !document.querySelector(".cm-panels-top"));
  check("Esc 关闭搜索面板", closed);

  // ---- 2. 三选项存在且生效：大小写 ----
  await page.keyboard.press("Control+f");
  await page.waitForSelector(".cm-panels-top", { timeout: 5000 });
  await setQuery(page, "Apple");
  const matchesCaseOn = await matchCount(page); // 未勾选 case，Apple 不敏感应匹配 2
  await page.locator('.cm-search [name="case"]').check();
  await page.waitForTimeout(400);
  const matchesCaseSensitive = await matchCount(page); // 敏感 0
  check("大小写选项生效（不敏感 2 匹配 -> 敏感 0）", matchesCaseOn === 2 && matchesCaseSensitive === 0, `on=${matchesCaseOn} sensitive=${matchesCaseSensitive}`);
  await page.locator('.cm-search [name="case"]').uncheck();

  // ---- 3. 全词匹配生效 ----
  await setQuery(page, "ban");
  const matchesWordOff = await matchCount(page);
  await page.locator('.cm-search [name="word"]').check();
  await page.waitForTimeout(400);
  const matchesWordOn = await matchCount(page);
  check("全词匹配生效（ban 不敏感 2 -> 全词 0）", matchesWordOff === 2 && matchesWordOn === 0, `off=${matchesWordOff} word=${matchesWordOn}`);
  await page.locator('.cm-search [name="word"]').uncheck();

  // ---- 4. 正则生效 ----
  await setQuery(page, "ap\\w+e");
  await page.locator('.cm-search [name="re"]').check();
  await page.waitForTimeout(400);
  const matchesRe = await matchCount(page);
  check("正则匹配生效（ap\\w+e -> 2）", matchesRe === 2, `re=${matchesRe}`);

  // ---- 5. 高亮所有匹配 + 计数 ----
  await setQuery(page, "apple");
  const highlighted = await matchCount(page);
  const cnt = await countText(page);
  check("高亮所有匹配（apple -> 2 处）", highlighted === 2, `matches=${highlighted}`);
  check("匹配计数显示（2 个匹配）", cnt.includes("2 个匹配"), `count=${JSON.stringify(cnt)}`);

  // ---- 6. 上一处/下一处跳转（Enter / Shift+Enter） ----
  await page.locator(".cm-search [main-field]").click();
  await page.keyboard.press("Enter");
  await page.waitForTimeout(300);
  const sel1 = await selText(page);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(300);
  const sel2 = await selText(page);
  await page.keyboard.press("Shift+Enter");
  await page.waitForTimeout(300);
  const selPrev = await selText(page);
  check("下一处跳转（Enter 选中匹配文本）", sel1 === "apple" && sel2 === "apple", `sel1=${JSON.stringify(sel1)} sel2=${JSON.stringify(sel2)}`);
  check("上一处跳转（Shift+Enter）", selPrev === "apple", `prev=${JSON.stringify(selPrev)}`);

  // ---- 7. 单次替换 + 撤销 ----
  const beforeReplace = await content(page);
  await page.locator('.cm-search input[name="replace"]').click();
  await page.keyboard.press("Control+a");
  await page.keyboard.type("orange", { delay: 10 });
  await page.locator('.cm-search button[name="replace"]').click();
  await page.waitForTimeout(300);
  const afterReplace = await content(page);
  check("单次替换生效（当前匹配替换）", afterReplace !== beforeReplace && afterReplace.includes("orange") && afterReplace.includes("apple"), JSON.stringify(afterReplace.slice(0, 60)));
  await page.locator(".cm-content").click(); // 编辑器聚焦后 Ctrl+Z 才达编辑器
  await page.keyboard.press("Control+z");
  await page.waitForTimeout(300);
  const afterUndo = await content(page);
  check("单次替换可撤销（Ctrl+Z 回退）", afterUndo === beforeReplace, JSON.stringify(afterUndo.slice(0, 60)));

  // ---- 8. 全部替换 + 撤销 ----
  const beforeAll = await content(page);
  await page.locator('.cm-search button[name="replaceAll"]').click();
  await page.waitForTimeout(400);
  const afterAll = await content(page);
  const appleLeft = (afterAll.match(/apple/g) ?? []).length;
  check("全部替换生效（无残留 apple）", appleLeft === 0 && afterAll.includes("orange"), `appleLeft=${appleLeft}`);
  await page.locator(".cm-content").click();
  await page.keyboard.press("Control+z");
  await page.waitForTimeout(300);
  const afterAllUndo = await content(page);
  check("全部替换可撤销（Ctrl+Z 回退）", afterAllUndo === beforeAll, JSON.stringify(afterAllUndo.slice(0, 60)));

  // ---- 9. 无匹配空态 ----
  await setQuery(page, "zzzznotexist");
  const noMatchText = await countText(page);
  check("无匹配显示空态提示", noMatchText.includes("无结果"), `count=${JSON.stringify(noMatchText)}`);

  // ---- 10. 非法正则不崩溃 ----
  await page.locator('.cm-search [name="re"]').check();
  await page.waitForTimeout(200);
  await setQuery(page, "[");
  const invalidText = await countText(page);
  check("非法正则提示而不崩溃", pageErrors.length === 0 && invalidText.includes("正则无效"), `pageErrors=${pageErrors.length} count=${JSON.stringify(invalidText)}`);
  await page.keyboard.press("Escape");

  // ---- 11. 无页面 JS 错误 ----
  check("无页面 JS 错误", pageErrors.length === 0, pageErrors.slice(0, 3).join(" | "));
} catch (e) {
  check("脚本执行完整性", false, String(e));
} finally {
  await browser.close().catch(() => {});
}

const failed = results.filter((r) => !r.ok);
const report =
  results.map((r) => `${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.detail ? "  -- " + r.detail : ""}`).join("\n") +
  `\n\n===== 搜索替换自测：${results.length - failed.length}/${results.length} PASS =====\n`;
writeFileSync("scripts/search-report.txt", report);
console.log(`\n===== 搜索替换自测：${results.length - failed.length}/${results.length} PASS =====`);
if (failed.length > 0) process.exit(1);
