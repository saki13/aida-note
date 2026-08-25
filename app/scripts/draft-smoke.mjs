/**
 * 自动保存 / 崩溃恢复草稿自测（Playwright + 系统 Edge，SIS-FUNC-10）
 *
 * 浏览器 localStorage 模拟层覆盖：脏标签防抖写草稿 / 已保存无修改不写 /
 * 崩溃重启（reload）弹窗 / 恢复置脏+清草稿 / 丢弃清草稿 / 保存后清理 /
 * 过期残留清理 / 无页面错误。Tauri 真实临时目录与退出清理留 PO 验证（浏览器无退出事件）。
 * 运行：node scripts/draft-smoke.mjs  （需先 npm run dev 起 1420）
 */

import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const BASE = "http://localhost:1420/";
const DRAFTS_KEY = "aida-note-drafts";
const results = [];
let pageErrors = [];

process.on("uncaughtException", (e) => {
  writeFileSync("scripts/draft-report.txt", "UNCAUGHT:\n" + (e?.stack ?? String(e)), "utf8");
  process.exit(2);
});
process.on("unhandledRejection", (e) => {
  writeFileSync("scripts/draft-report.txt", "UNHANDLED:\n" + (e?.stack ?? String(e)), "utf8");
  process.exit(2);
});

function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  -- " + detail : ""}`);
  writeFileSync(
    "scripts/draft-report.txt",
    results.map((r) => `${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.detail ? "  -- " + r.detail : ""}`).join("\n"),
    "utf8",
  );
}

const browser = await chromium.launch({ channel: "msedge", headless: true });

try {
  // ===== contextA：正常流程（无预置草稿） =====
  const contextA = await browser.newContext({ colorScheme: "light" });
  const page = await contextA.newPage();
  page.setDefaultTimeout(8000);
  pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(e.stack ?? String(e)));

  const drafts = async () => await page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? "{}"), DRAFTS_KEY);

  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForSelector(".recent-empty", { timeout: 8000 });
  await page.waitForTimeout(400);

  // ---- 1. 启动无残留草稿 -> 无恢复弹窗 ----
  const emptyDrafts = await drafts();
  const modalCount = await page.locator(".n-modal").count();
  check("启动无残留草稿不弹恢复（草稿为空）", Object.keys(emptyDrafts).length === 0 && modalCount === 0, `drafts=${Object.keys(emptyDrafts).length}`);

  // ---- 2. 已保存无修改标签不产生草稿 ----
  await page.keyboard.press("Control+n");
  await page.waitForSelector(".cm-editor", { timeout: 8000 });
  await page.waitForTimeout(900); // 超过防抖 500ms
  const afterNewTab = await drafts();
  check("已保存（非脏）标签不写草稿", Object.keys(afterNewTab).length === 0, `drafts=${JSON.stringify(Object.keys(afterNewTab))}`);

  // ---- 3. 脏标签输入 -> 防抖后写入草稿 ----
  await page.waitForSelector(".cm-content", { timeout: 8000 }); // 防首启 CM6 挂载竞态
  await page.locator(".cm-content").click();
  await page.keyboard.type("draft content test", { delay: 1 });
  await page.waitForFunction(
    (k) => Object.keys(JSON.parse(localStorage.getItem(k) ?? "{}")).length > 0,
    DRAFTS_KEY,
    { timeout: 5000 },
  );
  const afterInput = await drafts();
  const firstKey = Object.keys(afterInput)[0];
  check("脏标签防抖写入草稿（内容+时间戳）", !!firstKey && afterInput[firstKey].content === "draft content test", `key=${firstKey} content=${afterInput[firstKey]?.content}`);

  // ---- 4. 崩溃重启（reload）-> 恢复弹窗 ----
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector(".n-modal", { timeout: 8000 });
  const modalTitle = (await page.locator(".n-modal").textContent()) ?? "";
  check("崩溃重启弹出恢复提示（检测到未保存的草稿）", modalTitle.includes("检测到未保存的草稿") && (await page.locator(".recover-item").count()) === 1, JSON.stringify(modalTitle.slice(0, 40)));

  // ---- 5. 点击「恢复」-> 内容恢复 + 置脏 + 草稿再保护 ----
  await page.locator(".recover-item button", { hasText: "恢复" }).click();
  await page.waitForTimeout(400);
  const editorText = (await page.locator(".cm-content").textContent()) ?? "";
  const dirtyCount = await page.locator(".dirty-count").count();
  // 恢复后草稿语义：旧草稿被消费（removeDraft），但恢复的标签仍为脏（未保存），
  // 防抖 DRAFT_DEBOUNCE_MS=500 后自动保存会重新建立草稿保护（再崩溃不丢内容）——
  // 故稳定态为 1 条同 key 草稿（原断言 400ms 快照期望 0 恰在防抖落盘前，是时序竞态）。
  await page.waitForTimeout(700); // 等防抖落盘（500ms + 余量）
  const afterRecover = await drafts();
  check("恢复后内容回填 + 置脏 + 草稿再保护（旧草稿消费、脏标签自动保存重建）", editorText.includes("draft content test") && dirtyCount > 0 && Object.keys(afterRecover).length === 1 && "__untitled_未命名-1" in afterRecover, `dirty=${dirtyCount} drafts=${JSON.stringify(Object.keys(afterRecover))}`);

  // ---- 6. 保存成功后草稿清理 ----
  await page.locator(".cm-content").click({ force: true });
  await page.keyboard.type(" more", { delay: 1 });
  await page.waitForFunction(
    (k) => Object.keys(JSON.parse(localStorage.getItem(k) ?? "{}")).length > 0,
    DRAFTS_KEY,
    { timeout: 5000 },
  );
  const beforeSave = await drafts();
  await page.evaluate(async () => {
    const app = document.querySelector("#app").__vue_app__;
    const pinia = app.config.globalProperties.$pinia;
    const { useTabsStore } = await import("/src/stores/tabsStore.ts");
    const store = useTabsStore(pinia);
    store.markSaved(store.activeTab.id);
  });
  await page.waitForTimeout(300);
  const afterSave = await drafts();
  check("保存成功后清理草稿（不留碎片）", Object.keys(beforeSave).length > 0 && Object.keys(afterSave).length === 0, `before=${Object.keys(beforeSave).length} after=${Object.keys(afterSave).length}`);

  // ---- 7. 无页面 JS 错误（contextA）----
  check("无页面 JS 错误", pageErrors.length === 0, pageErrors.slice(0, 3).join(" | "));
  await contextA.close();

  // ===== contextB：预置 1 有效 + 1 过期草稿 =====
  const now = Date.now();
  const preset = {
    "C:/fake/recover.md": { key: "C:/fake/recover.md", title: "recover.md", content: "recover me", updatedAt: now - 1000 },
    "C:/fake/expired.md": { key: "C:/fake/expired.md", title: "expired.md", content: "too old", updatedAt: now - 8 * 24 * 60 * 60 * 1000 }, // 8 天 > 7 天 TTL
  };
  const contextB = await browser.newContext({ colorScheme: "light" });
  await contextB.addInitScript(
    ([key, value]) => localStorage.setItem(key, value),
    [DRAFTS_KEY, JSON.stringify(preset)],
  );
  const pageB = await contextB.newPage();
  pageB.setDefaultTimeout(8000);
  await pageB.goto(BASE, { waitUntil: "networkidle" });
  await pageB.waitForSelector(".n-modal", { timeout: 8000 });
  await pageB.waitForTimeout(300);

  // ---- 8. 过期残留清理 + 弹窗仅列有效草稿 ----
  const itemCount = await pageB.locator(".recover-item").count();
  const afterScan = await pageB.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? "{}"), DRAFTS_KEY);
  check("过期残留草稿被清理且弹窗仅列有效草稿", itemCount === 1 && !("C:/fake/expired.md" in afterScan), `items=${itemCount} keys=${JSON.stringify(Object.keys(afterScan))}`);

  // ---- 9. 全部丢弃 -> 草稿清空 + 弹窗关闭 ----
  await pageB.locator(".recover-item button", { hasText: "全部丢弃" }).click().catch(async () => {
    // footer 内按钮
    await pageB.locator(".n-modal button", { hasText: "全部丢弃" }).click();
  });
  await pageB.waitForTimeout(400);
  const afterDiscard = await pageB.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? "{}"), DRAFTS_KEY);
  const modalGone = await pageB.locator(".n-modal").count();
  check("全部丢弃清空草稿并关闭弹窗", Object.keys(afterDiscard).length === 0 && modalGone === 0, `drafts=${Object.keys(afterDiscard).length} modal=${modalGone}`);
  await contextB.close();
} catch (e) {
  check("脚本执行完整性", false, String(e));
} finally {
  await browser.close().catch(() => {});
}

const failed = results.filter((r) => !r.ok);
const report =
  results.map((r) => `${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.detail ? "  -- " + r.detail : ""}`).join("\n") +
  `\n\n===== 草稿自测：${results.length - failed.length}/${results.length} PASS =====\n`;
writeFileSync("scripts/draft-report.txt", report);
console.log(`\n===== 草稿自测：${results.length - failed.length}/${results.length} PASS =====`);
if (failed.length > 0) process.exit(1);
