/**
 * OPT-6 自测（Playwright + 系统 Edge，SIS-OPT-6）
 *
 * 覆盖验收：干净启动不弹恢复框 / 退出写快照（beforeunload）重启弹恢复框（快照优先于草稿）/
 * 恢复未保存标签回填置脏 + 快照清空 / 全部丢弃清快照 / 已保存路径失败跳过提示 /
 * 无 JS 错误。真实文件重开（Tauri 环境）列 PO 验证。
 * 运行：node scripts/opt6-session-smoke.mjs  （需先 npm run dev 起 1420）
 */

import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const BASE = "http://localhost:1420/";
const SESSION_KEY = "aida-note-session";
const DRAFT_KEY = "aida-note-drafts";
const results = [];
let pageErrors = [];

process.on("uncaughtException", (e) => {
  writeFileSync("scripts/opt6-report.txt", "UNCAUGHT:\n" + (e?.stack ?? String(e)), "utf8");
  process.exit(2);
});
process.on("unhandledRejection", (e) => {
  writeFileSync("scripts/opt6-report.txt", "UNHANDLED:\n" + (e?.stack ?? String(e)), "utf8");
  process.exit(2);
});

function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  -- " + detail : ""}`);
  writeFileSync(
    "scripts/opt6-report.txt",
    results.map((r) => `${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.detail ? "  -- " + r.detail : ""}`).join("\n"),
    "utf8",
  );
}

const browser = await chromium.launch({ channel: "msedge", headless: true });

try {
  const context = await browser.newContext({ colorScheme: "light" });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(e.stack ?? String(e)));

  const sessionShown = (p) =>
    p.waitForFunction(() => {
      const modals = Array.from(document.querySelectorAll(".n-modal"));
      return modals.some((el) => (el.textContent ?? "").includes("恢复上次会话"));
    }, undefined, { timeout: 8000 });
  const draftShown = () =>
    page.waitForFunction(() => {
      const modals = Array.from(document.querySelectorAll(".n-modal"));
      return modals.some((el) => (el.textContent ?? "").includes("检测到未保存的草稿"));
    }, undefined, { timeout: 8000 });
  const noModal = () =>
    page.waitForFunction(() => document.querySelectorAll(".n-modal").length === 0, undefined, { timeout: 8000 });

  // ---- 1. 干净启动：无快照不弹恢复框 ----
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForFunction(() => document.querySelector(".main-view") !== null);
  await page.waitForTimeout(800);
  const modalCount1 = await page.locator(".n-modal").count();
  check("干净启动（无快照）不弹恢复框", modalCount1 === 0, `modals=${modalCount1}`);

  // ---- 2. 打开未保存标签并输入内容（脏）-> reload（beforeunload 写快照）-> 弹恢复框（快照优先于草稿） ----
  await page.keyboard.press("Control+n");
  await page.waitForSelector(".cm-editor", { timeout: 8000 });
  await page.locator(".cm-content").click();
  await page.keyboard.insertText("未保存标签的内容 XYZ");
  await page.waitForTimeout(800); // 等草稿防抖也写入（验证快照优先场景）
  await page.evaluate(() => sessionStorage.removeItem("aida-session-handled")); // 模拟真实重启（清 reload 标记）
  await page.reload({ waitUntil: "networkidle" });
  await sessionShown(page);
  const sessionItems = (await page.locator(".n-modal .recover-item").count()) ?? 0;
  const sessionText = (await page.locator(".n-modal").first().textContent()) ?? "";
  const draftModalShown = (await page.locator(".n-modal", { hasText: "检测到未保存的草稿" }).count()) > 0;
  check("退出写快照：重启弹「恢复上次会话」列出未保存标签（快照优先于草稿框）", sessionItems === 1 && sessionText.includes("未保存内容") && !draftModalShown, `items=${sessionItems} draftModal=${draftModalShown}`);

  // ---- 3. 恢复：未保存内容回填 + 脏标记 + 快照清空 ----
  await page.locator(".n-modal button", { hasText: "恢复" }).click();
  await page.waitForFunction(() => {
    const modals = Array.from(document.querySelectorAll(".n-modal"));
    return !modals.some((el) => (el.textContent ?? "").includes("恢复上次会话"));
  }, undefined, { timeout: 5000 });
  const contentAfter = await page.evaluate(async () => {
    const app = document.querySelector("#app").__vue_app__;
    const pinia = app.config.globalProperties.$pinia;
    const { useTabsStore } = await import("/src/stores/tabsStore.ts");
    const ts = useTabsStore(pinia);
    return ts.activeTab ? { content: ts.activeTab.content, dirty: ts.activeTab.dirty } : null;
  });
  const dirtyCount = await page.evaluate(async () => {
    const app = document.querySelector("#app").__vue_app__;
    const pinia = app.config.globalProperties.$pinia;
    const { useTabsStore } = await import("/src/stores/tabsStore.ts");
    return useTabsStore(pinia).tabs.filter((t) => t.dirty).length;
  });
  const snapAfterRestore = await page.evaluate((k) => localStorage.getItem(k), SESSION_KEY);
  check("恢复：未保存内容回填且置脏、快照清空", contentAfter?.content === "未保存标签的内容 XYZ" && contentAfter?.dirty === true && dirtyCount === 1 && snapAfterRestore === null, `snap=${snapAfterRestore !== null}`);

  // ---- 4. 全部丢弃：写快照 -> 重启弹框 -> 丢弃 -> 快照清空 ----
  await page.evaluate(() => sessionStorage.removeItem("aida-session-handled")); // 模拟真实重启
  await page.reload({ waitUntil: "networkidle" });
  await sessionShown(page);
  await page.locator(".n-modal button", { hasText: "全部丢弃" }).click();
  await noModal();
  const snapAfterDiscard = await page.evaluate((k) => localStorage.getItem(k), SESSION_KEY);
  check("全部丢弃：快照清空", snapAfterDiscard === null, `snap=${snapAfterDiscard !== null}`);

  // ---- 5. 已保存路径不存在：恢复时跳过并提示、不崩溃 ----
  // 注：reload 会触发 beforeunload 用「当前标签」覆盖快照，故此处用 close + 新开页（不触发 beforeunload）
  await page.evaluate(
    ({ key, path }) => {
      localStorage.setItem(key, JSON.stringify({ ts: Date.now(), tabs: [{ path }, { id: "t1", title: "未命名1", content: "回填内容" }] }));
    },
    { key: SESSION_KEY, path: "C:/fake/missing-opt6.md" },
  );
  await page.close();
  const page2 = await context.newPage();
  page2.setDefaultTimeout(10000);
  page2.on("pageerror", (e) => pageErrors.push(e.stack ?? String(e)));
  await page2.goto(BASE, { waitUntil: "networkidle" });
  await sessionShown(page2);
  const items2 = (await page2.locator(".n-modal .recover-item").count()) ?? 0;
  await page2.locator(".n-modal button", { hasText: "恢复" }).click();
  await page2.waitForFunction(() => {
    const modals = Array.from(document.querySelectorAll(".n-modal"));
    return !modals.some((el) => (el.textContent ?? "").includes("恢复上次会话"));
  }, undefined, { timeout: 5000 });
  const warnShown = await page2.waitForFunction(
    () => Array.from(document.querySelectorAll(".n-message")).some((el) => (el.textContent ?? "").includes("文件不存在")),
    undefined,
    { timeout: 6000 },
  ).then(() => true).catch(() => false);
  const tabsNow = await page2.evaluate(async () => {
    const app = document.querySelector("#app").__vue_app__;
    const pinia = app.config.globalProperties.$pinia;
    const { useTabsStore } = await import("/src/stores/tabsStore.ts");
    return useTabsStore(pinia).tabs.length;
  });
  check("已保存路径不存在：跳过并提示「文件不存在」、未保存仍恢复", items2 === 2 && warnShown && tabsNow >= 1, `items=${items2} warn=${warnShown} tabs=${tabsNow}`);

  // ---- 6. 无快照启动不弹恢复框（清快照+清草稿后 close + 新开页） ----
  await page2.evaluate((keys) => keys.forEach((k) => localStorage.removeItem(k)), [SESSION_KEY, DRAFT_KEY]);
  await page2.close();
  const page3 = await context.newPage();
  page3.setDefaultTimeout(10000);
  page3.on("pageerror", (e) => pageErrors.push(e.stack ?? String(e)));
  await page3.goto(BASE, { waitUntil: "networkidle" });
  await page3.waitForTimeout(800);
  const modalCount6 = await page3.locator(".n-modal").count();
  check("清快照后启动不再弹恢复框", modalCount6 === 0, `modals=${modalCount6}`);

  // ---- 7. 无页面 JS 错误（过滤 Naive 良性竞态） ----
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
  `\n\n===== 会话恢复自测：${results.length - failed.length}/${results.length} PASS =====\n`;
writeFileSync("scripts/opt6-report.txt", report);
console.log(`\n===== 会话恢复自测：${results.length - failed.length}/${results.length} PASS =====`);
if (failed.length > 0) process.exit(1);
