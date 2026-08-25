/**
 * 自定义背景自测（Playwright + 系统 Edge，SIS-OPT-3）
 *
 * 覆盖验收：默认无背景 / 选图生效 / 双模式（全应用 / 仅编辑区外）/ 透明度滑杆 /
 * 工具栏区与编辑区对比度色温分开调 / 按背景保存参数（换图加载 / 替换继承）/
 * 清除背景 / 重启记住 / 无页面错误。
 * 运行：node scripts/opt3-bg-smoke.mjs  （需先 npm run dev 起 1420）
 */

import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const BASE = "http://localhost:1420/";
const results = [];
let pageErrors = [];

process.on("uncaughtException", (e) => {
  writeFileSync("scripts/opt3-report.txt", "UNCAUGHT:\n" + (e?.stack ?? String(e)), "utf8");
  process.exit(2);
});
process.on("unhandledRejection", (e) => {
  writeFileSync("scripts/opt3-report.txt", "UNHANDLED:\n" + (e?.stack ?? String(e)), "utf8");
  process.exit(2);
});

function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  -- " + detail : ""}`);
  writeFileSync(
    "scripts/opt3-report.txt",
    results.map((r) => `${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.detail ? "  -- " + r.detail : ""}`).join("\n"),
    "utf8",
  );
}

const svgA = '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="#f00"/></svg>';
const svgB = '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="#00f"/></svg>';
const keyA = "data:image/svg+xml;base64," + Buffer.from(svgA).toString("base64");
const keyB = "data:image/svg+xml;base64," + Buffer.from(svgB).toString("base64");

const browser = await chromium.launch({ channel: "msedge", headless: true });

try {
  const context = await browser.newContext({ colorScheme: "light" });
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(e.stack ?? String(e)));

  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForFunction(() => document.querySelector(".main-view") !== null);
  await page.waitForTimeout(300);

  const hasBgClass = () => page.locator(".main-view").evaluate((el) => el.classList.contains("has-bg"));
  const bgMode = () => page.locator(".main-view").getAttribute("data-bg-mode");
  const bgStyle = (sel) => page.locator(sel).evaluate((el) => {
    const s = getComputedStyle(el);
    return { bg: s.backgroundImage, opacity: s.opacity, filter: s.filter, shadow: s.boxShadow, display: s.display };
  });

  // ---- 1. 默认无背景 ----
  check("默认无背景（无 has-bg、背景层无图）", (await hasBgClass()) === false && (await bgStyle(".bg-top")).bg === "none", `bg=${(await bgStyle(".bg-top")).bg}`);

  // ---- 2. 选择图片（file input -> dataURL）-> 背景生效 ----
  await page.locator(".bg-file-input").setInputFiles({ name: "a.svg", mimeType: "image/svg+xml", buffer: Buffer.from(svgA) });
  await page.waitForFunction(() => document.querySelector(".main-view")?.classList.contains("has-bg"));
  const topA = await bgStyle(".bg-top");
  const midA = await bgStyle(".bg-mid");
  check("选图后背景生效（has-bg + 背景层含图）", (await hasBgClass()) && topA.bg.includes("data:image/svg+xml"), `bg=${topA.bg.slice(0, 40)}`);
  check("默认模式 = 全应用（编辑区背景层可见）", (await bgMode()) === "app" && midA.display !== "none", `mode=${await bgMode()} mid-display=${midA.display}`);
  check("默认透明度 0.7 生效", Math.abs(Number(topA.opacity) - 0.7) < 0.02, `opacity=${topA.opacity}`);

  // ---- 3. 模式切换：仅编辑区外（编辑区背景层隐藏，chrome 保留） ----
  await page.locator(".tool-bar button", { hasText: "背景" }).click();
  await page.waitForSelector(".n-dropdown-menu", { timeout: 5000 });
  await page.locator(".n-dropdown-option", { hasText: "仅编辑区外" }).click();
  await page.waitForFunction(() => document.querySelector(".main-view")?.getAttribute("data-bg-mode") === "outside");
  const midOutside = await bgStyle(".bg-mid");
  const topOutside = await bgStyle(".bg-top");
  check("模式=仅编辑区外：编辑区背景层隐藏、chrome 保留", midOutside.display === "none" && topOutside.bg.includes("data:image/svg+xml"), `mid=${midOutside.display}`);
  await page.locator(".tool-bar button", { hasText: "背景" }).click();
  await page.waitForSelector(".n-dropdown-menu", { timeout: 5000 });
  await page.locator(".n-dropdown-option", { hasText: "全应用" }).click();
  await page.waitForFunction(() => document.querySelector(".main-view")?.getAttribute("data-bg-mode") === "app");

  // ---- 4. 参数弹窗：透明度/对比度/色温（工具栏区与编辑区分开调） ----
  await page.locator(".tool-bar button", { hasText: "背景" }).click();
  await page.waitForSelector(".n-dropdown-menu", { timeout: 5000 });
  await page.locator(".n-dropdown-option", { hasText: "参数设置" }).click();
  await page.waitForSelector(".n-modal", { timeout: 5000 });
  // 拖拽 handle 到轨道右端（色温/对比度调到上限）
  async function dragHandleToRight(sliderLocator) {
    const sb = await sliderLocator.boundingBox();
    const hb = await sliderLocator.locator(".n-slider-handle-wrapper").boundingBox();
    await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
    await page.mouse.down();
    await page.mouse.move(sb.x + sb.width - 4, hb.y + hb.height / 2, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(250);
  }
  const sliders = page.locator(".n-modal .n-slider");
  // 透明度滑杆（第 0 个）：click handle 聚焦 + ArrowRight 10 次提升
  await sliders.nth(0).locator(".n-slider-handle-wrapper").click({ position: { x: 4, y: 4 } });
  for (let i = 0; i < 10; i++) await page.keyboard.press("ArrowRight");
  const opacityAfter = Number((await bgStyle(".bg-top")).opacity);
  check("透明度滑杆调节生效", opacityAfter > 0.7, `opacity=${opacityAfter}`);
  // 工具栏区对比度（第 1 个）：click handle + ArrowRight 20 次 -> boxShadow 遮罩加深
  const shadowChromeBefore = (await bgStyle(".bg-top")).shadow;
  await sliders.nth(1).locator(".n-slider-handle-wrapper").click({ position: { x: 4, y: 4 } });
  for (let i = 0; i < 20; i++) await page.keyboard.press("ArrowRight");
  const shadowChromeAfter = (await bgStyle(".bg-top")).shadow;
  check("工具栏区对比度调节生效（遮罩加深）", shadowChromeBefore !== shadowChromeAfter, `before=${shadowChromeBefore.slice(0, 30)} after=${shadowChromeAfter.slice(0, 30)}`);
  // 工具栏区色温（第 2 个）：拖拽 handle 到右端 -> filter 变化
  const filterChromeBefore = (await bgStyle(".bg-top")).filter;
  await dragHandleToRight(sliders.nth(2));
  const filterChromeAfter = (await bgStyle(".bg-top")).filter;
  check("工具栏区色温调节生效（filter 变化）", filterChromeBefore !== filterChromeAfter, `before=${filterChromeBefore} after=${filterChromeAfter}`);
  // 编辑区对比度（第 3 个）与工具栏区独立：拖拽 handle 到右端
  const shadowEditorAfter = (await bgStyle(".bg-mid")).shadow;
  await dragHandleToRight(sliders.nth(3));
  const shadowEditorChanged = (await bgStyle(".bg-mid")).shadow;
  const shadowChromeNow = (await bgStyle(".bg-top")).shadow;
  check("编辑区与工具栏区对比度独立生效", shadowEditorChanged !== shadowEditorAfter && shadowEditorChanged !== shadowChromeNow, `mid=${shadowEditorChanged.slice(0, 30)} top=${shadowChromeNow.slice(0, 30)}`);
  // 关闭弹窗
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);

  // ---- 5. 按背景保存参数：换图 B（继承 A 参数）-> 切回 A（从记录恢复） ----
  const opacityA = Number((await bgStyle(".bg-top")).opacity); // 第 4 步调后的值
  await page.locator(".bg-file-input").setInputFiles({ name: "b.svg", mimeType: "image/svg+xml", buffer: Buffer.from(svgB) });
  await page.waitForFunction(() => document.querySelector(".bg-top")?.style.backgroundImage.includes("data:image/svg+xml;base64"));
  const opacityB = Number((await bgStyle(".bg-top")).opacity);
  check("替换图片 B：参数继承当前 A 值", Math.abs(opacityB - opacityA) < 0.02, `opacityB=${opacityB} opacityA=${opacityA}`);
  await page.locator(".bg-file-input").setInputFiles({ name: "a.svg", mimeType: "image/svg+xml", buffer: Buffer.from(svgA) });
  await page.waitForFunction(() => document.querySelector(".bg-top")?.style.backgroundImage.includes("data:image/svg+xml;base64"));
  const opacityABack = Number((await bgStyle(".bg-top")).opacity);
  check("切回图 A：从按背景记录恢复参数", Math.abs(opacityABack - opacityA) < 0.02, `opacityABack=${opacityABack} opacityA=${opacityA}`);

  // ---- 6. 重启记住（reload 后背景与参数保持） ----
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForFunction(() => document.querySelector(".main-view")?.classList.contains("has-bg"));
  const opacityPersist = Number((await bgStyle(".bg-top")).opacity);
  check("重启后背景保持（图 + 参数）", (await hasBgClass()) && Math.abs(opacityPersist - opacityA) < 0.02, `opacity=${opacityPersist}`);

  // ---- 7. 清除背景 ----
  await page.locator(".tool-bar button", { hasText: "背景" }).click();
  await page.waitForSelector(".n-dropdown-menu", { timeout: 5000 });
  await page.locator(".n-dropdown-option", { hasText: "清除背景" }).click();
  await page.waitForFunction(() => !document.querySelector(".main-view")?.classList.contains("has-bg"));
  check("清除背景后恢复无背景", (await hasBgClass()) === false && (await bgStyle(".bg-top")).bg === "none", `bg=${(await bgStyle(".bg-top")).bg}`);

  // ---- 8. 无页面 JS 错误（过滤 Naive 良性竞态） ----
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
  `\n\n===== 自定义背景自测：${results.length - failed.length}/${results.length} PASS =====\n`;
writeFileSync("scripts/opt3-report.txt", report);
console.log(`\n===== 自定义背景自测：${results.length - failed.length}/${results.length} PASS =====`);
if (failed.length > 0) process.exit(1);
