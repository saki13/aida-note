/**
 * aida-note 所见即所得自测（Playwright + 系统 Edge，SIS-FUNC-3）
 *
 * 覆盖验收：12 类元素渲染、光标块源码态/移开恢复、选区跨块回源码、
 * 未闭合标记与坏表格回退、mermaid 围栏源码展示、表格/分隔线 widget 点击进编辑、
 * 明暗主题联动、语言切换移除/恢复扩展（Compartment 槽位）。
 *
 * 运行：node scripts/wysiwyg-smoke.mjs  （需先 npm run dev 起 1420）
 */

import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

// 异常直写报告文件（沙箱会截断 stdout，用文件兜底）
process.on("uncaughtException", (e) => {
  writeFileSync("scripts/wysiwyg-report.txt", "UNCAUGHT:\n" + (e?.stack ?? String(e)), "utf8");
  process.exit(2);
});
process.on("unhandledRejection", (e) => {
  writeFileSync("scripts/wysiwyg-report.txt", "UNHANDLED:\n" + (e?.stack ?? String(e)), "utf8");
  process.exit(2);
});

const BASE = "http://localhost:1420/";

const results = [];
let pageErrors = []; // 提升作用域：check 落盘时一并记录当前已捕获的页面错误
function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  -- " + detail : ""}`);
  // 增量落盘：脚本中断/挂起时也能看到已执行到哪一步
  const errNote = pageErrors.length ? "\n[pageErrors@" + pageErrors.length + "] " + pageErrors[0].split("\n")[0] : "";
  writeFileSync(
    "scripts/wysiwyg-report.txt",
    results
      .map((r) => `${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.detail ? "  -- " + r.detail : ""}`)
      .join("\n") + errNote,
    "utf8",
  );
}

const SAMPLE = [
  "# 标题一",
  "",
  "正文有**加粗**、*斜体*、~~删除~~、`代码`、[链接](https://example.com)、![图](a.png)。",
  "",
  "- 列表项甲",
  "- 列表项乙",
  "",
  "> 引用一行",
  "",
  "```mermaid",
  "graph TD; A-->B;",
  "```",
  "",
  "```js",
  "const a = 1;",
  "```",
  "",
  "---",
  "",
  "| 甲 | 乙 |",
  "|---|---|",
  "| 1 | 2 |",
  "",
  "**未闭合加粗",
  "",
  "|坏表格",
  "没有分隔行",
  "",
].join("\n");

const browser = await chromium.launch({
  channel: "msedge",
  headless: true,
});

try {
  const page = await browser.newPage({ colorScheme: "light" });
  page.setDefaultTimeout(10000);
  pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(e.stack ?? String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") pageErrors.push(m.text());
  });

  await page.goto(BASE, { waitUntil: "networkidle" });

  // 0. 编辑器就绪 + 新建标签 + 切 Markdown 语言
  await page.waitForSelector(".cm-editor", { timeout: 8000 });
  await page.keyboard.press("Control+n");
  await page.locator(".lang-switch").click();
  await page.waitForSelector(".n-dropdown-menu", { timeout: 3000 });
  await page.locator(".n-dropdown-menu .n-dropdown-option", { hasText: "Markdown" }).click();
  await page.waitForTimeout(400);
  const lang = await page.locator(".lang-switch").textContent();
  check("切到 Markdown 语言", (lang ?? "").includes("Markdown"), `lang=${lang}`);

  // 1. 插入样例文档（光标停在文末坏表格段，其余块应全部渲染态）
  await page.locator(".cm-content").click();
  await page.keyboard.insertText(SAMPLE);
  await page.waitForTimeout(500);

  // 2. 12 类元素渲染态断言（光标在文末，全部块不在选区）
  const selCount = async (sel) => await page.locator(sel).count();
  check("标题渲染（h1 行级字号）", (await selCount(".cm-line.cm-md-h1")) === 1);
  check("加粗渲染", (await selCount(".cm-md-strong")) === 1);
  check("斜体渲染", (await selCount(".cm-md-em")) === 1);
  check("删除线渲染", (await selCount(".cm-md-del")) === 1);
  check("行内代码渲染", (await selCount(".cm-md-code")) === 1);
  check("链接渲染", (await selCount(".cm-md-link")) === 1);
  check("图片渲染", (await selCount(".cm-md-img")) === 1);
  check("列表渲染（标记着色）", (await selCount(".cm-md-list-mark")) === 2);
  check("引用渲染（行级左边框）", (await selCount(".cm-line.cm-md-quote")) === 1);
  check("代码块渲染（行级底纹，普通代码块）", (await selCount(".cm-line.cm-md-codeblock")) >= 2);
  check("分隔线渲染（hr widget）", (await selCount(".cm-md-hr")) === 1);
  const tableOk =
    (await selCount(".cm-md-table table")) === 1 &&
    (await page.locator(".cm-md-table th").count()) === 2 &&
    (await page.locator(".cm-md-table td").count()) === 2;
  check("表格渲染（table widget 2 表头 2 单元）", tableOk);

  // 3. mermaid 围栏块：FUNC-4 渲染为图表 widget（光标外；loading/ready 态容器即存在）
  check("mermaid 围栏渲染为图表 widget（FUNC-4）", (await selCount(".cm-md-mermaid")) === 1);

  // 4. 故障回退：未闭合加粗 / 坏表格
  const contentText = await page.locator(".cm-content").textContent();
  check("未闭合加粗回退源码（** 可见）", (contentText ?? "").includes("**未闭合加粗"));
  check(
    "坏表格回退源码（| 可见且无第二个 table widget）",
    (contentText ?? "").includes("|坏表格") && (await selCount(".cm-md-table table")) === 1,
  );

  // 5. 光标块源码态：点击第一行标题 -> 行级 class 消失、# 恢复显示
  await page.locator(".cm-content .cm-line").first().click();
  await page.waitForTimeout(300);
  const firstLineCls = (await page.locator(".cm-content .cm-line").first().getAttribute("class")) ?? "";
  const hashVisible = await page.evaluate(() => {
    const first = document.querySelector(".cm-content .cm-line");
    return (first?.textContent ?? "").startsWith("#");
  });
  check("光标移入标题 -> 源码态（h1 class 移除）", !firstLineCls.includes("cm-md-h1"), `class=${firstLineCls}`);
  check("光标移入标题 -> # 标记恢复显示", hashVisible);

  // 6. 光标移开 -> 恢复渲染态（引用块进源码态后 cm-md-quote 类会消失，
  //    断言需按文本定位行元素，不能按该 class 选择器读取）
  await page.locator(".cm-line.cm-md-quote").click();
  await page.waitForTimeout(300);
  const firstCls2 = (await page.locator(".cm-content .cm-line").first().getAttribute("class")) ?? "";
  const quoteLineCls = (await page.locator(".cm-line", { hasText: "引用一行" }).first().getAttribute("class")) ?? "";
  check("光标移开 -> 标题恢复渲染态", firstCls2.includes("cm-md-h1"), `class=${firstCls2}`);
  check("光标移入引用 -> 引用源码态（quote class 移除）", !quoteLineCls.includes("cm-md-quote"), `class=${quoteLineCls}`);

  // 7. 选区跨块：从标题拖选到正文段 -> 两块均源码态
  await page.locator(".cm-md-h1").first().click();
  await page.waitForTimeout(200);
  await page.keyboard.press("Shift+End");
  await page.keyboard.down("Shift");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.up("Shift");
  await page.waitForTimeout(300);
  const h1InSel = (await page.locator(".cm-content .cm-line").first().getAttribute("class")) ?? "";
  const strongCountInSel = await page.locator(".cm-md-strong").count();
  check("选区跨块 -> 标题块源码态", !h1InSel.includes("cm-md-h1"), `class=${h1InSel}`);
  check("选区跨块 -> 正文块源码态（加粗标记恢复）", strongCountInSel === 0, `strong=${strongCountInSel}`);

  // 8. 表格 widget 点击 -> 源码态（widget 消失，| 源码可见）
  await page.locator(".cm-md-table table").click();
  await page.waitForTimeout(300);
  const tableAfterClick = await selCount(".cm-md-table table");
  const srcVisible = await page.evaluate(() =>
    (document.querySelector(".cm-content")?.textContent ?? "").includes("| 甲 |"),
  );
  check("点击表格 widget -> 整块源码态", tableAfterClick === 0 && srcVisible, `tables=${tableAfterClick}`);

  // 9. 点击别处 -> 表格恢复 widget
  await page.locator(".cm-md-hr").click();
  await page.waitForTimeout(300);
  const tablesRestored = await selCount(".cm-md-table table");
  check("光标移开 -> 表格恢复渲染", tablesRestored === 1, `tables=${tablesRestored}`);

  // 10. 明暗主题联动：dark 下链接色切换
  const linkLight = await page
    .locator(".cm-md-link")
    .first()
    .evaluate((el) => getComputedStyle(el).color);
  await page.emulateMedia({ colorScheme: "dark" });
  await page.waitForTimeout(400);
  const linkDark = await page
    .locator(".cm-md-link")
    .first()
    .evaluate((el) => getComputedStyle(el).color);
  check("渲染态样式随明暗主题切换", linkLight !== linkDark, `${linkLight} -> ${linkDark}`);
  await page.emulateMedia({ colorScheme: "light" });
  await page.waitForTimeout(300);

  // 11. 语言切换（Compartment 槽位）：切纯文本 -> 扩展移除；切回 -> 恢复
  await page.locator(".lang-switch").click();
  await page.waitForSelector(".n-dropdown-menu", { timeout: 3000 });
  await page.locator(".n-dropdown-menu .n-dropdown-option", { hasText: "纯文本" }).click();
  await page.waitForTimeout(400);
  const plainCounts = await selCount(".cm-md-h1");
  await page.locator(".lang-switch").click();
  await page.waitForSelector(".n-dropdown-menu", { timeout: 3000 });
  await page.locator(".n-dropdown-menu .n-dropdown-option", { hasText: "Markdown" }).click();
  await page.waitForTimeout(400);
  const backCounts = await selCount(".cm-md-h1");
  check("切纯文本移除扩展，切回 Markdown 恢复", plainCounts === 0 && backCounts >= 1, `plain=${plainCounts} back=${backCounts}`);

  // 12. 连续快速输入（性能：防抖 + 局部更新，不卡死不报错）
  const t0 = Date.now();
  await page.locator(".cm-content .cm-line").last().click();
  for (let i = 0; i < 30; i++) {
    await page.keyboard.type(`快速输入${i}行 **加粗${i}**\n`);
  }
  await page.waitForTimeout(400);
  const inputMs = Date.now() - t0;
  const newStrong = await page.locator(".cm-md-strong").count();
  check("连续输入 30 行无异常且渲染正常", newStrong >= 1, `elapsed=${inputMs}ms strong=${newStrong}`);

  // 13. 无页面错误
  check("无页面 JS 错误", pageErrors.length === 0, pageErrors.slice(0, 3).join(" | "));
} catch (e) {
  check("脚本执行完整性", false, String(e));
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
const report =
  results
    .map((r) => `${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.detail ? "  -- " + r.detail : ""}`)
    .join("\n") + `\n\n===== 所见即所得自测：${results.length - failed.length}/${results.length} PASS =====\n`;
writeFileSync("scripts/wysiwyg-report.txt", report);
console.log(`\n===== 所见即所得自测：${results.length - failed.length}/${results.length} PASS =====`);
if (failed.length > 0) process.exit(1);
