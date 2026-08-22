/**
 * 文件对比自测（Playwright + 系统 Edge，SIS-FUNC-6）
 *
 * 覆盖验收（浏览器可测子集）：对比入口弹窗 / 当前文件 vs 剪贴板双栏 /
 * 行级+字符级高亮 / 差异计数与跳转 / 滚动联动 / 合并写回+脏标记 /
 * 剪贴板只读 / 关闭对比。
 * 注：「打开两个文件」依赖 Tauri dialog，浏览器环境不可测（Tauri 手动验证）。
 *
 * 运行：node scripts/compare-smoke.mjs  （需先 npm run dev 起 1420）
 */

import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const BASE = "http://localhost:1420/";
const results = [];
let pageErrors = [];

process.on("uncaughtException", (e) => {
  writeFileSync("scripts/compare-report.txt", "UNCAUGHT:\n" + (e?.stack ?? String(e)), "utf8");
  process.exit(2);
});
process.on("unhandledRejection", (e) => {
  writeFileSync("scripts/compare-report.txt", "UNHANDLED:\n" + (e?.stack ?? String(e)), "utf8");
  process.exit(2);
});

function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  -- " + detail : ""}`);
  writeFileSync(
    "scripts/compare-report.txt",
    results.map((r) => `${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.detail ? "  -- " + r.detail : ""}`).join("\n"),
    "utf8",
  );
}

const browser = await chromium.launch({ channel: "msedge", headless: true });

try {
  const context = await browser.newContext({ colorScheme: "light" });
  await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: BASE });
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(e.stack ?? String(e)));

  await page.goto(BASE, { waitUntil: "networkidle" });
  // 无标签时显示最近文件空态（SIS-FUNC-11），需先建标签才有 .cm-editor
  await page.keyboard.press("Control+n");
  await page.waitForSelector(".cm-editor", { timeout: 8000 });

  // 当前文件内容（左）：31 行，第 10 行变化（内容足够长以验证滚动跳转/联动）
  const rows = Array.from({ length: 31 }, (_, i) => `row${i + 1}`);
  rows[9] = "row10 changed";
  const leftText = rows.join("\n");
  const clipRows = [...rows];
  clipRows[9] = "row10 new";
  clipRows.push("row32 added");
  const rightText = clipRows.join("\n");

  await page.waitForTimeout(300);
  await page.locator(".cm-content").click();
  await page.keyboard.type(leftText, { delay: 1 });
  await page.waitForTimeout(300);
  const editorBefore = (await page.locator(".cm-content").textContent()) ?? "";

  // 预置剪贴板（右）
  await page.evaluate((t) => navigator.clipboard.writeText(t), rightText);
  await page.waitForTimeout(200);

  // ---- 1. 对比入口弹窗 ----
  await page.locator(".tool-bar button", { hasText: "对比" }).click();
  await page.waitForSelector(".n-modal", { timeout: 5000 });
  const modalText = (await page.locator(".n-modal").textContent()) ?? "";
  check("对比入口弹窗出现（两个源选项）", modalText.includes("打开两个文件对比") && modalText.includes("当前文件 vs 剪贴板"), JSON.stringify(modalText.slice(0, 60)));

  // ---- 2. 当前文件 vs 剪贴板 → 双栏 ----
  await page.locator(".n-modal button", { hasText: "当前文件 vs 剪贴板" }).click();
  await page.waitForSelector(".compare-view", { timeout: 5000 });
  const paneTitles = (await page.locator(".pane-head").allTextContents()).join(" | ");
  check("双栏并排展示（文件 vs 剪贴板）", paneTitles.includes("剪贴板") && paneTitles.includes("只读"), JSON.stringify(paneTitles));

  // ---- 3. 行级 + 字符级高亮 ----
  const removed = await page.locator(".line-removed").count();
  const added = await page.locator(".line-added").count();
  const charAdded = await page.locator(".char-added").count();
  const charRemoved = await page.locator(".char-removed").count();
  check("行级高亮（removed+added 行存在）", removed > 0 && added > 0, `removed=${removed} added=${added}`);
  check("字符级高亮（char-added/removed 存在）", charAdded > 0 || charRemoved > 0, `charA=${charAdded} charR=${charRemoved}`);

  // ---- 4. 差异计数 ----
  const count = await page.locator(".diff-count").textContent();
  const cm = /^\s*(\d+) \/ (\d+)\s*$/.exec(count ?? "");
  check("差异计数显示（当前/总块数）", !!cm && Number(cm[2]) >= 1, `count=${JSON.stringify(count)}`);

  // ---- 5. 上一处/下一处跳转（滚动变化） ----
  const scroller = page.locator(".compare-view .pane-scroller").first();
  const beforeTop = await scroller.evaluate((el) => el.scrollTop);
  await page.locator(".compare-view .compare-toolbar button", { hasText: "下一处" }).click();
  await page.waitForTimeout(300);
  const afterTop = await scroller.evaluate((el) => el.scrollTop);
  check("下一处跳转滚动到差异块", beforeTop === 0 && afterTop > 0, `before=${beforeTop} after=${afterTop}`);

  // ---- 6. 滚动联动 ----
  await scroller.evaluate((el) => {
    el.scrollTop = 30;
    el.dispatchEvent(new Event("scroll"));
  });
  await page.waitForTimeout(200);
  const rightTop = await page.locator(".compare-view .pane-scroller").nth(1).evaluate((el) => el.scrollTop);
  check("双栏滚动联动（左栏滚动右栏同步）", rightTop === 30, `rightTop=${rightTop}`);

  // ---- 7. 剪贴板只读（接受左→右禁用） ----
  const disabledL2R = await page.locator(".block-action button", { hasText: "接受左 → 右" }).first().isDisabled();
  check("剪贴板只读（接受左→右禁用）", disabledL2R);

  // ---- 8. 合并：接受右→左 → 左栏内容更新 + 文件脏标记 ----
  await page.locator(".block-action button", { hasText: "接受右 → 左" }).first().click();
  await page.waitForTimeout(400);
  const leftPaneText = (await page.locator(".compare-view .pane").first().locator(".pane-lines").textContent()) ?? "";
  const dirtyCount = (await page.locator(".dirty-count").textContent().catch(() => "")) ?? "";
  check("接受右→左应用合并（左栏出现 right 内容）", leftPaneText.includes("row10 new") && !leftPaneText.includes("row10 changed"), JSON.stringify(leftPaneText.slice(0, 50)));
  check("合并写回置脏标记", dirtyCount.includes("1 个未保存"), `dirty=${JSON.stringify(dirtyCount)}`);

  // ---- 9. 关闭对比 → 编辑器内容为合并结果 ----
  await page.locator(".compare-view button", { hasText: "关闭对比" }).click();
  await page.waitForSelector(".cm-editor", { timeout: 5000 });
  const editorAfter = (await page.locator(".cm-content").textContent()) ?? "";
  check("关闭对比回到编辑器且内容已合并", editorAfter.includes("row10 new") && !editorAfter.includes("row10 changed"), JSON.stringify(editorAfter.slice(0, 50)));

  // ---- 10. 无页面 JS 错误 ----
  check("无页面 JS 错误", pageErrors.length === 0, pageErrors.slice(0, 3).join(" | "));
} catch (e) {
  check("脚本执行完整性", false, String(e));
} finally {
  await browser.close().catch(() => {});
}

const failed = results.filter((r) => !r.ok);
const report =
  results.map((r) => `${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.detail ? "  -- " + r.detail : ""}`).join("\n") +
  `\n\n===== 文件对比自测：${results.length - failed.length}/${results.length} PASS =====\n`;
writeFileSync("scripts/compare-report.txt", report);
console.log(`\n===== 文件对比自测：${results.length - failed.length}/${results.length} PASS =====`);
if (failed.length > 0) process.exit(1);
