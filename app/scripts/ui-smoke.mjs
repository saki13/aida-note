/**
 * aida-note UI 冒烟自测（Playwright + 系统 Edge）
 *
 * 用途：前端能力自主验证（无需 Tauri 窗口 / 无沙箱外工具链）。
 * 覆盖 SIS-FUNC-2 关键验收：编辑器挂载、新建标签、手动切换语言、语法高亮、
 * 明暗主题联动（emulateMedia 模拟 prefers-color-scheme）。
 *
 * 运行：node scripts/ui-smoke.mjs  （需先 npm run dev 起 1420）
 * 说明：纯浏览器环境无 Tauri internals，文件类能力（打开/保存）不在此覆盖。
 */

import { chromium } from "playwright";

const BASE = "http://localhost:1420/";

const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  -- " + detail : ""}`);
}

const browser = await chromium.launch({
  channel: "msedge",
  headless: true,
});

try {
  const page = await browser.newPage({ colorScheme: "light" });
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") pageErrors.push(m.text());
  });

  await page.goto(BASE, { waitUntil: "networkidle" });
  // 无标签时显示最近文件空态（SIS-FUNC-11），先建标签再断言编辑器挂载
  await page.keyboard.press("Control+n");

  // 1. 编辑器挂载（非白屏）：CodeMirror 容器存在且有高度
  const cmReady = await page.waitForSelector(".cm-editor", { timeout: 8000 })
    .then(() => true)
    .catch(() => false);
  check("编辑器挂载（.cm-editor 存在）", cmReady);

  // 2. 新建标签（Ctrl+N）
  await page.keyboard.press("Control+n");
  const tabCount1 = await page.locator(".tab-bar .tab").count();
  check("Ctrl+N 新建标签", tabCount1 >= 1, `tabs=${tabCount1}`);
  const langBefore = await page.locator(".lang-switch").textContent();
  check("初始语言为纯文本", (langBefore ?? "").includes("纯文本"), `lang=${langBefore}`);

  // 3. 输入 JS 代码（纯文本语言下不应有 token，仅验证内容进入编辑器）
  await page.locator(".cm-content").click();
  await page.keyboard.type('function hello() { const x = 1; }');
  await page.waitForTimeout(300);
  const typed = await page.locator(".cm-content").textContent();
  check("输入进入编辑器", (typed ?? "").includes("function hello"), `len=${typed?.length}`);

  // 4. 状态栏手动切换语言 → 纯文本 → JavaScript
  await page.locator(".lang-switch").click();
  await page.waitForSelector(".n-dropdown-menu", { timeout: 3000 });
  await page.locator(".n-dropdown-menu .n-dropdown-option", { hasText: "JavaScript" }).click();
  await page.waitForTimeout(400);
  const langAfter = await page.locator(".lang-switch").textContent();
  check("手动切换语言为 JavaScript", (langAfter ?? "").includes("JavaScript"), `lang=${langAfter}`);

  // 5. 切换 JS 后 token span 出现（关键字/标识符着色）
  const tokenCount = await page.evaluate(() =>
    document.querySelectorAll('.cm-content span[class*="ͼ"]').length
  );
  check("JavaScript 高亮生效（token span）", tokenCount > 0, `tokens=${tokenCount}`);

  // 6. 明暗主题联动：模拟 dark 后 .cm-editor 背景变深
  await page.emulateMedia({ colorScheme: "dark" });
  await page.waitForTimeout(400);
  const bgDark = await page.locator(".cm-editor").evaluate((el) =>
    getComputedStyle(el).backgroundColor
  );
  const darkNum = (bgDark.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/) ?? []).slice(1).map(Number);
  const isDark = darkNum.length === 3 && darkNum.every((v) => v < 80);
  check("dark 主题联动（背景变深）", isDark, `bg=${bgDark}`);

  // 切回 light：oneDark 移除后背景应为透明/白
  await page.emulateMedia({ colorScheme: "light" });
  await page.waitForTimeout(400);
  const bgLight = await page.locator(".cm-editor").evaluate((el) =>
    getComputedStyle(el).backgroundColor
  );
  const isLight = bgLight === "rgba(0, 0, 0, 0)" || bgLight === "transparent" || bgLight.startsWith("rgb(255");
  check("light 主题恢复（背景变浅）", isLight, `bg=${bgLight}`);

  // 7. 无页面级 JS 报错
  check("无页面 JS 错误", pageErrors.length === 0, pageErrors.slice(0, 3).join(" | "));
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok).length;
const lines = results.map((r) => `${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.detail ? "  -- " + r.detail : ""}`);
lines.push(`${results.length - failed}/${results.length} passed`);
console.log(lines.join("\n"));
process.exit(failed > 0 ? 1 : 0);
