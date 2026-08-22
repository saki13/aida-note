/**
 * 主题切换自测（Playwright + 系统 Edge，SIS-FUNC-9）
 *
 * 覆盖验收：三态切换 / 跟随系统实时联动 / 明暗基础主题 / 强调色方案 /
 * 工具栏下拉状态一致 / CM 语法高亮联动 / 重启记住 / 无页面错误。
 * 运行：node scripts/theme-smoke.mjs  （需先 npm run dev 起 1420）
 */

import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const BASE = "http://localhost:1420/";
const results = [];
let pageErrors = [];

process.on("uncaughtException", (e) => {
  writeFileSync("scripts/theme-report.txt", "UNCAUGHT:\n" + (e?.stack ?? String(e)), "utf8");
  process.exit(2);
});
process.on("unhandledRejection", (e) => {
  writeFileSync("scripts/theme-report.txt", "UNHANDLED:\n" + (e?.stack ?? String(e)), "utf8");
  process.exit(2);
});

function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  -- " + detail : ""}`);
  writeFileSync(
    "scripts/theme-report.txt",
    results.map((r) => `${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.detail ? "  -- " + r.detail : ""}`).join("\n"),
    "utf8",
  );
}

const browser = await chromium.launch({ channel: "msedge", headless: true });

try {
  const context = await browser.newContext({ colorScheme: "light" });
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(e.stack ?? String(e)));

  await page.goto(BASE, { waitUntil: "networkidle" });
  // 无标签时显示最近文件空态（SIS-FUNC-11），需先建标签才有 .cm-editor（验证 CM 主题联动）
  await page.keyboard.press("Control+n");
  await page.waitForSelector(".cm-editor", { timeout: 8000 });
  // 等待 settingsStore.init 完成（首屏加载持久化设置）
  await page.waitForFunction(() => document.querySelector(".app-root")?.getAttribute("data-theme") !== null);
  await page.waitForTimeout(300);

  const rootTheme = () => page.locator(".app-root").getAttribute("data-theme");
  const rootAccent = () => page.locator(".app-root").getAttribute("data-accent");
  const cmBg = async () => {
    const c = await page.locator(".cm-editor").evaluate((el) => getComputedStyle(el).backgroundColor);
    return c;
  };
  /** 打开主题下拉并点击指定选项（Naive UI dropdown 选项 class 为 .n-dropdown-option） */
  async function pickTheme(label) {
    await page.locator(".tool-bar button", { hasText: "主题" }).click();
    await page.waitForSelector(".n-dropdown-menu", { timeout: 5000 });
    await page.locator(".n-dropdown-option", { hasText: label }).click();
  }

  // ---- 1. 初始：默认跟随系统（context light -> light）----
  check("初始默认跟随系统（系统亮色 -> 亮主题）", (await rootTheme()) === "light", `theme=${await rootTheme()}`);

  // ---- 2. 三态切换：下拉选「暗色」----
  await pickTheme("暗色");
  await page.waitForFunction(() => document.querySelector(".app-root")?.getAttribute("data-theme") === "dark");
  const btnLabelDark = (await page.locator(".tool-bar button", { hasText: "主题" }).textContent()) ?? "";
  check("三态切换：暗色（data-theme + 按钮文本一致）", (await rootTheme()) === "dark" && btnLabelDark.includes("暗"), `theme=${await rootTheme()} btn="${btnLabelDark}"`);

  // ---- 3. 暗色下 CM oneDark 联动 ----
  const cmDarkBg = await cmBg();
  check("暗色主题 CM 高亮联动（oneDark 背景）", cmDarkBg === "rgb(40, 44, 52)", `bg=${cmDarkBg}`);

  // ---- 4. 三态切换：亮色 ----
  await pickTheme("亮色");
  await page.waitForFunction(() => document.querySelector(".app-root")?.getAttribute("data-theme") === "light");
  const cmLightBg = await cmBg();
  check("三态切换：亮色（data-theme + CM 亮色背景）", (await rootTheme()) === "light" && cmLightBg !== "rgb(40, 44, 52)", `theme=${await rootTheme()} bg=${cmLightBg}`);

  // ---- 5. 跟随系统实时联动 ----
  await pickTheme("跟随系统");
  await page.waitForFunction(() => document.querySelector(".app-root")?.getAttribute("data-theme") === "light");
  await page.emulateMedia({ colorScheme: "dark" });
  await page.waitForFunction(() => document.querySelector(".app-root")?.getAttribute("data-theme") === "dark", { timeout: 5000 });
  const sysDark = await rootTheme();
  await page.emulateMedia({ colorScheme: "light" });
  await page.waitForFunction(() => document.querySelector(".app-root")?.getAttribute("data-theme") === "light");
  check("跟随系统实时联动（emulateMedia 暗->亮切换）", sysDark === "dark" && (await rootTheme()) === "light", `sysDark=${sysDark} after=${await rootTheme()}`);

  // ---- 6. 强调色方案（绿/紫，作用于 UI primary）----
  await pickTheme("强调色 · 绿");
  await page.waitForFunction(() => document.querySelector(".app-root")?.getAttribute("data-accent") === "green");
  const greenPrimary = await page.locator(".tool-bar button", { hasText: /换行/ }).evaluate((el) => getComputedStyle(el).getPropertyValue("--n-ripple-color").trim());
  await pickTheme("强调色 · 紫");
  await page.waitForFunction(() => document.querySelector(".app-root")?.getAttribute("data-accent") === "purple");
  const purplePrimary = await page.locator(".tool-bar button", { hasText: /换行/ }).evaluate((el) => getComputedStyle(el).getPropertyValue("--n-ripple-color").trim());
  check("强调色切换（data-accent 绿/紫 + UI primary 变体不同）", (await rootAccent()) === "purple" && greenPrimary !== purplePrimary, `accent=${await rootAccent()} green=${greenPrimary} purple=${purplePrimary}`);

  // ---- 7. 重启记住（reload 后保持 theme=system + accent=purple）----
  await page.reload({ waitUntil: "networkidle" });
  // reload 后无标签显示空态（SIS-FUNC-11），用 data-accent 等待 init 完成
  await page.waitForFunction(() => document.querySelector(".app-root")?.getAttribute("data-accent") === "purple");
  check("重启记住（reload 后 theme+accent 保持）", (await rootTheme()) === "light" && (await rootAccent()) === "purple", `theme=${await rootTheme()} accent=${await rootAccent()}`);

  // ---- 8. 无页面 JS 错误（过滤 Naive UI 下拉快速点击关闭的已知内部竞态，功能无影响）----
  const realErrors = pageErrors.filter((e) => !e.includes("handleMouseMoveOutside"));
  check("无页面 JS 错误", realErrors.length === 0, realErrors.slice(0, 3).join(" | "));
} catch (e) {
  check("脚本执行完整性", false, String(e));
} finally {
  await browser.close().catch(() => {});
}

const failed = results.filter((r) => !r.ok);
const report =
  results.map((r) => `${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.detail ? "  -- " + r.detail : ""}`).join("\n") +
  `\n\n===== 主题切换自测：${results.length - failed.length}/${results.length} PASS =====\n`;
writeFileSync("scripts/theme-report.txt", report);
console.log(`\n===== 主题切换自测：${results.length - failed.length}/${results.length} PASS =====`);
if (failed.length > 0) process.exit(1);
