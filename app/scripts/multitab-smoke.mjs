// 多标签冒烟验证（markRaw 修复后）：语言独立、切回保留、主题联动
import { chromium } from "playwright";

const browser = await chromium.launch({ channel: "msedge", headless: true });
const out = [];
try {
  const page = await browser.newPage({ colorScheme: "light" });
  page.on("pageerror", (e) => out.push(`[pageerror] ${String(e).slice(0, 300)}`));
  await page.goto("http://localhost:1420/", { waitUntil: "networkidle" });

  // Tab1：JS
  await page.keyboard.press("Control+n");
  await page.locator(".cm-content").click();
  await page.keyboard.type("function hello() { const x = 1; }");
  await page.waitForTimeout(200);
  await page.locator(".lang-switch").click();
  await page.waitForSelector(".n-dropdown-menu", { timeout: 3000 });
  await page.locator(".n-dropdown-menu .n-dropdown-option", { hasText: "JavaScript" }).click();
  await page.waitForTimeout(400);

  // Tab2：纯文本（未切换语言）
  await page.keyboard.press("Control+n");
  await page.locator(".cm-content").click();
  await page.keyboard.type("SELECT * FROM t");
  await page.waitForTimeout(400);
  const lang2 = await page.locator(".lang-switch").textContent();

  // 切回 Tab1：语言保持 + 高亮保留
  await page.locator(".tab-bar .tab").first().click();
  await page.waitForTimeout(400);
  const lang1 = await page.locator(".lang-switch").textContent();
  const spans1 = await page.evaluate(() =>
    document.querySelectorAll('.cm-content span[class*="ͼ"]').length
  );

  // 切回 Tab2：纯文本无高亮
  await page.locator(".tab-bar .tab").last().click();
  await page.waitForTimeout(400);
  const spans2 = await page.evaluate(() =>
    document.querySelectorAll('.cm-content span[class*="ͼ"]').length
  );

  // 主题联动在 Tab2 上仍生效
  await page.emulateMedia({ colorScheme: "dark" });
  await page.waitForTimeout(400);
  const bgDark = await page.locator(".cm-editor").evaluate((el) =>
    getComputedStyle(el).backgroundColor
  );

  const checks = {
    "Tab2 纯文本": (lang2 ?? "").includes("纯文本"),
    "Tab1 语言保持 JS": (lang1 ?? "").includes("JavaScript"),
    "Tab1 高亮保留(切回)": spans1 > 0,
    "Tab2 无高亮(纯文本)": spans2 === 0,
    "Tab2 暗主题生效": bgDark.startsWith("rgb(40"),
  };
  const failed = Object.entries(checks).filter(([, v]) => !v);
  out.push(`[checks] ${JSON.stringify({ ...checks, spans1, spans2, lang1, lang2, bgDark }, null, 1)}`);
  out.push(failed.length === 0 ? "ALL PASS" : `FAILED: ${JSON.stringify(failed)}`);
} catch (e) {
  out.push(`[exception] ${String(e).slice(0, 500)}`);
} finally {
  await browser.close();
  console.log(out.join("\n"));
}
