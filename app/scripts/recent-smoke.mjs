/**
 * 最近文件自测（Playwright + 系统 Edge，SIS-FUNC-11）
 *
 * 浏览器可测子集：空态列表 / 空态引导 / 失效提示+移除 / 工具栏下拉 /
 * 打开记录（evaluate 调 store 钩子）/ 去重置顶 / 上限 20 / 无页面错误。
 * 注：真实打开/保存经 Tauri dialog+fs，浏览器不可测（记录钩子逻辑用 evaluate 直调验证）。
 * 运行：node scripts/recent-smoke.mjs  （需先 npm run dev 起 1420）
 */

import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const BASE = "http://localhost:1420/";
const LS_KEY = "aida-note-settings";
const results = [];
let pageErrors = [];

process.on("uncaughtException", (e) => {
  writeFileSync("scripts/recent-report.txt", "UNCAUGHT:\n" + (e?.stack ?? String(e)), "utf8");
  process.exit(2);
});
process.on("unhandledRejection", (e) => {
  writeFileSync("scripts/recent-report.txt", "UNHANDLED:\n" + (e?.stack ?? String(e)), "utf8");
  process.exit(2);
});

function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  -- " + detail : ""}`);
  writeFileSync(
    "scripts/recent-report.txt",
    results.map((r) => `${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.detail ? "  -- " + r.detail : ""}`).join("\n"),
    "utf8",
  );
}

const browser = await chromium.launch({ channel: "msedge", headless: true });

try {
  // ===== contextA：预置 21 个最近文件 =====
  const preset = Array.from({ length: 21 }, (_, i) => `C:/fake/dir/file${String(i + 1).padStart(2, "0")}.md`);
  const contextA = await browser.newContext({ colorScheme: "light" });
  await contextA.addInitScript(
    ([key, value]) => localStorage.setItem(key, value),
    [LS_KEY, JSON.stringify({ theme: "system", accentColor: "blue", wordWrap: true, recentFiles: preset, aiConfig: { baseURL: "", apiKey: "", model: "" } })],
  );
  const page = await contextA.newPage();
  page.setDefaultTimeout(8000);
  pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(e.stack ?? String(e)));

  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForSelector(".recent-empty", { timeout: 8000 });
  await page.waitForTimeout(300);

  const recentCount = async () => await page.locator(".recent-item").count();

  // ---- 1. 空态展示最近文件列表（预置 21 项）----
  const count1 = await recentCount();
  check("启动无标签空态展示最近文件列表（21 项）", count1 === 21, `count=${count1}`);

  // ---- 2. 工具栏「最近」下拉与空态一致 ----
  await page.locator(".tool-bar button", { hasText: "最近" }).click();
  await page.waitForSelector(".n-dropdown-menu", { timeout: 5000 });
  const dropItems = await page.locator(".n-dropdown-option").count();
  const firstDropLabel = (await page.locator(".n-dropdown-option").first().textContent()) ?? "";
  await page.keyboard.press("Escape");
  check("工具栏「最近」下拉与空态一致", dropItems === count1 && firstDropLabel.includes("file01.md"), `drop=${dropItems} first="${firstDropLabel}"`);

  // ---- 3. 点击失效文件 -> 提示「文件不存在」+ 从列表移除 ----
  await page.locator(".recent-open").first().click();
  await page.waitForFunction(
    () => Array.from(document.querySelectorAll(".n-message")).some((el) => (el.textContent ?? "").includes("文件不存在")),
    { timeout: 5000 },
  );
  await page.waitForFunction(() => document.querySelectorAll(".recent-item").length === 20, { timeout: 5000 });
  const count3 = await recentCount();
  check("点击失效文件提示「文件不存在」并移除", count3 === 20, `count=${count3}`);

  // ---- 4. 空态移除按钮 ----
  await page.locator(".recent-remove").first().click();
  await page.waitForFunction(() => document.querySelectorAll(".recent-item").length === 19, { timeout: 5000 });
  check("空态列表项可手动移除", (await recentCount()) === 19, `count=${await recentCount()}`);

  // ---- 5. 打开文件记录最近（evaluate 直调 openTab 钩子）----
  await page.evaluate(async () => {
    const app = document.querySelector("#app").__vue_app__;
    const pinia = app.config.globalProperties.$pinia;
    // useTabsStore(pinia) 内部会 setActivePinia（Pinia useStore 实现），store 内无参 useSettingsStore 可解析
    const { useTabsStore } = await import("/src/stores/tabsStore.ts");
    useTabsStore(pinia).openTab({ filePath: "C:/fake/p100.md", content: "hi", hadBom: false });
  });
  await page.waitForTimeout(300);
  const savedAfterOpen = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), LS_KEY);
  check("打开文件成功后写入最近列表（置顶）", savedAfterOpen.recentFiles[0] === "C:/fake/p100.md", `top=${savedAfterOpen.recentFiles[0]}`);

  // ---- 6. 重复打开同一路径：不重复记录且置顶 ----
  await page.evaluate(async () => {
    const app = document.querySelector("#app").__vue_app__;
    const pinia = app.config.globalProperties.$pinia;
    const { useTabsStore } = await import("/src/stores/tabsStore.ts");
    useTabsStore(pinia).openTab({ filePath: "C:/fake/p100.md", content: "hi2", hadBom: false });
  });
  await page.waitForTimeout(300);
  const afterDup = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), LS_KEY);
  const dupCount = afterDup.recentFiles.filter((p) => p === "C:/fake/p100.md").length;
  check("重复打开去重且置顶（唯一 + 最近访问在前）", dupCount === 1 && afterDup.recentFiles[0] === "C:/fake/p100.md", `dup=${dupCount} top=${afterDup.recentFiles[0]}`);

  // ---- 7. 超过 20 个移除最旧（addRecentFile 上限）----
  await page.evaluate(async () => {
    const app = document.querySelector("#app").__vue_app__;
    const pinia = app.config.globalProperties.$pinia;
    const { useSettingsStore } = await import("/src/stores/settingsStore.ts");
    const st = useSettingsStore(pinia);
    for (let i = 1; i <= 21; i++) await st.addRecentFile(`C:/fake/batch/b${String(i).padStart(2, "0")}.md`);
  });
  await page.waitForTimeout(300);
  const afterBatch = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), LS_KEY);
  check("最近列表上限 20（超出移除最旧，最新在前）", afterBatch.recentFiles.length === 20 && afterBatch.recentFiles[0] === "C:/fake/batch/b21.md", `len=${afterBatch.recentFiles.length} top=${afterBatch.recentFiles[0]}`);

  // ---- 8. 无页面 JS 错误 ----
  check("无页面 JS 错误", pageErrors.length === 0, pageErrors.slice(0, 3).join(" | "));
  await contextA.close();

  // ===== contextB：无预置 -> 空态引导 =====
  const contextB = await browser.newContext({ colorScheme: "light" });
  const pageB = await contextB.newPage();
  pageB.setDefaultTimeout(8000);
  await pageB.goto(BASE, { waitUntil: "networkidle" });
  await pageB.waitForSelector(".recent-empty", { timeout: 8000 });
  await pageB.waitForTimeout(300);
  const tip = (await pageB.locator(".recent-empty-tip").textContent()) ?? "";
  check("空态无最近文件时显示引导（暂无最近文件）", tip.includes("暂无最近文件"), JSON.stringify(tip.slice(0, 40)));
  await contextB.close();
} catch (e) {
  check("脚本执行完整性", false, String(e));
} finally {
  await browser.close().catch(() => {});
}

const failed = results.filter((r) => !r.ok);
const report =
  results.map((r) => `${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.detail ? "  -- " + r.detail : ""}`).join("\n") +
  `\n\n===== 最近文件自测：${results.length - failed.length}/${results.length} PASS =====\n`;
writeFileSync("scripts/recent-report.txt", report);
console.log(`\n===== 最近文件自测：${results.length - failed.length}/${results.length} PASS =====`);
if (failed.length > 0) process.exit(1);
