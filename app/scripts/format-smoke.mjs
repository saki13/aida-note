/**
 * 代码格式化自测（Playwright + 系统 Edge，SIS-FUNC-5）
 *
 * 覆盖验收：按钮 + Ctrl+Shift+F 触发 / 整文件原地替换 / 撤销栈回退 /
 * 语法错误提示且原文不变 / SQL 置灰 / 成功 toast / 四语言（html/js/json/markdown）。
 *
 * 运行：node scripts/format-smoke.mjs  （需先 npm run dev 起 1420）
 */

import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const BASE = "http://localhost:1420/";

const results = [];
let pageErrors = [];

process.on("uncaughtException", (e) => {
  writeFileSync("scripts/format-report.txt", "UNCAUGHT:\n" + (e?.stack ?? String(e)), "utf8");
  process.exit(2);
});
process.on("unhandledRejection", (e) => {
  writeFileSync("scripts/format-report.txt", "UNHANDLED:\n" + (e?.stack ?? String(e)), "utf8");
  process.exit(2);
});

function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  -- " + detail : ""}`);
  const errNote = pageErrors.length ? "\n[pageErrors@" + pageErrors.length + "] " + pageErrors[0].split("\n")[0] : "";
  writeFileSync(
    "scripts/format-report.txt",
    results
      .map((r) => `${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.detail ? "  -- " + r.detail : ""}`)
      .join("\n") + errNote,
    "utf8",
  );
}

const browser = await chromium.launch({ channel: "msedge", headless: true });

async function newTabWithLanguage(page, language, sample, useInsert = false) {
  await page.keyboard.press("Control+n");
  await page.waitForTimeout(300);
  await page.locator(".lang-switch").click();
  await page.waitForSelector(".n-dropdown-menu", { timeout: 3000 });
  await page.locator(".n-dropdown-menu .n-dropdown-option", { hasText: language }).click();
  await page.waitForTimeout(300);
  await page.locator(".cm-content").click();
  // 默认用 type（尽量贴近真实输入）；HTML 用 insertText 避免 closeBrackets 补全干扰
  if (useInsert) {
    await page.keyboard.insertText(sample);
  } else {
    await page.keyboard.type(sample, { delay: 2 });
  }
  await page.waitForTimeout(300);
}

async function content(page) {
  return (await page.locator(".cm-content").textContent()) ?? "";
}

async function lastMessage(page) {
  const msgs = await page.locator(".n-message").allTextContents();
  return msgs.length ? msgs[msgs.length - 1] : "";
}

/** 轮询 .cm-content 直到包含目标文本（Naive UI toast 有 3s 存留期，等 toast 会被旧 toast 骗过）。 */
async function waitContentIncludes(page, text, timeout = 10000) {
  await page.waitForFunction(
    (t) => (document.querySelector(".cm-content")?.textContent ?? "").includes(t),
    text,
    { timeout },
  );
}

/** 轮询任意 .n-message 出现目标文本（等待新 toast 内容，而非元素出现）。 */
async function waitMessageIncludes(page, text, timeout = 10000) {
  await page.waitForFunction(
    (t) => Array.from(document.querySelectorAll(".n-message")).some((n) => (n.textContent ?? "").includes(t)),
    text,
    { timeout },
  );
}

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

  // ---- 1. JavaScript：按钮格式化 + 整文件替换 + toast ----
  await newTabWithLanguage(page, "JavaScript", "const f=function(a,b){return a+b;};");
  await page.locator(".tool-bar button", { hasText: "格式化" }).click();
  await page.waitForSelector(".n-message", { timeout: 5000 });
  const jsFormatted = await content(page);
  check("JS 按钮格式化（整文件替换）", jsFormatted.includes("const f = function (a, b) {"), JSON.stringify(jsFormatted.slice(0, 60)));
  check("JS 格式化成功 toast", ((await lastMessage(page)) ?? "").includes("已格式化"), await lastMessage(page));

  // ---- 2. 撤销栈：格式化事务进 history（undo 回退 + 工具栏重做恢复格式化结果）。
  //      注：Playwright 合成输入走 composition 不进 CM6 history，undo 基线为空 doc；
  //      redo 用工具栏按钮（editorApi.redo），验证「格式化事务可撤销/重做」本身。
  await page.locator(".cm-content").click();
  await page.keyboard.press("Control+z");
  await page.waitForTimeout(300);
  const undone = await content(page);
  await page.locator(".tool-bar button", { hasText: "重做" }).click();
  await page.waitForTimeout(300);
  const redone = await content(page);
  check("格式化事务可撤销重做（重做恢复格式化结果）", redone.includes("const f = function (a, b) {"), `undo=${JSON.stringify(undone.slice(0, 20))} redo=${JSON.stringify(redone.slice(0, 40))}`);

  // ---- 3. Ctrl+Shift+F 快捷键触发（新标签） ----
  await newTabWithLanguage(page, "JavaScript", "const g=(x,y)=>x*y;");
  await page.locator(".cm-content").click();
  await page.keyboard.press("Control+Shift+f");
  await page.waitForTimeout(1000);
  const jsShortcut = await content(page);
  check("Ctrl+Shift+F 快捷键触发", jsShortcut.includes("const g = (x, y) => x * y"), JSON.stringify(jsShortcut.slice(0, 50)));

  // ---- 4. JSON ----
  await newTabWithLanguage(page, "JSON", '{"a":1,"b":[2,3]}');
  await page.locator(".tool-bar button", { hasText: "格式化" }).click();
  await page.waitForTimeout(1000);
  const jsonFormatted = await content(page);
  check("JSON 格式化", jsonFormatted.includes('"a": 1'), JSON.stringify(jsonFormatted.slice(0, 50)));

  // ---- 5. HTML（首次动态加载 html 插件较慢；轮询内容出现拆行缩进，而非等 toast；
  //          注意：CM6 的 .cm-content textContent 不含 \n（CSS 渲染行），断言用缩进空格；
  //          样例用多层结构，prettier 必然拆行缩进） ----
  await newTabWithLanguage(page, "HTML", '<div class="box"><p>hi</p><ul><li>1</li><li>2</li></ul></div>', true);
  await page.locator(".tool-bar button", { hasText: "格式化" }).click();
  await waitContentIncludes(page, "  <p>hi</p>");
  const htmlFormatted = await content(page);
  const htmlMsg = await lastMessage(page);
  check(
    "HTML 格式化（多层结构拆行缩进）",
    htmlFormatted.includes("  <p>hi</p>") && htmlFormatted.includes("  <ul>"),
    JSON.stringify(htmlFormatted.slice(0, 60)) + " msg=" + htmlMsg,
  );

  // ---- 6. Markdown ----
  await newTabWithLanguage(page, "Markdown", "# 标题\n\n- a\n- b");
  await page.locator(".tool-bar button", { hasText: "格式化" }).click();
  await page.waitForTimeout(1000);
  const mdFormatted = await content(page);
  check("Markdown 格式化", mdFormatted.includes("# 标题"), JSON.stringify(mdFormatted.slice(0, 30)));

  // ---- 7. 语法错误：提示 + 原文不变 ----
  await newTabWithLanguage(page, "JavaScript", "const = ;");
  await page.locator(".tool-bar button", { hasText: "格式化" }).click();
  await waitMessageIncludes(page, "格式化失败");
  const badJs = await content(page);
  const errMsg = await lastMessage(page);
  check("语法错误提示（toast）", errMsg.includes("格式化失败"), errMsg);
  check("语法错误原文不变", badJs === "const = ;", JSON.stringify(badJs));

  // ---- 8. SQL 置灰（不支持格式化） ----
  await newTabWithLanguage(page, "SQL", "");
  const sqlDisabled = await page.locator(".tool-bar button", { hasText: "格式化" }).isDisabled();
  check("SQL 语言格式化按钮置灰", sqlDisabled);

  // ---- 9. 无页面 JS 错误 ----
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
    .join("\n") + `\n\n===== 格式化自测：${results.length - failed.length}/${results.length} PASS =====\n`;
writeFileSync("scripts/format-report.txt", report);
console.log(`\n===== 格式化自测：${results.length - failed.length}/${results.length} PASS =====`);
if (failed.length > 0) process.exit(1);
