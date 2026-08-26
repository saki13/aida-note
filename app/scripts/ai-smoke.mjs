/**
 * AI 接入自测（Playwright + 系统 Edge，SIS-AI-1，主链路：配置/润色/问答/错误提示）
 *
 * 覆盖验收：未配置提示不崩溃 / 配置持久化 / 无选中润色提示 / 选区浮条四动作 /
 * 右键菜单 / 润色流式→接受→撤销 / 问答流式→插入 / 无选中问答提示（不发请求）/
 * 请求形状（model+stream）/ 无页面错误。
 *
 * 流式策略（与 Sprint 4 启动收口 §8 风险一致）：沙箱阻断真实 SSE 长连接且对
 * 长运行命令静默击杀（实测）→ 用 page.route 拦截 chat/completions 返回模拟
 * SSE 流确定性验证全链路 UI 行为；真实 API 可达性已验证（非流式探测 200），
 * 真实流式冒烟由 PO 在本地环境手动执行。mermaid 修复拆到 ai-mermaid-smoke.mjs。
 *
 * 运行：node scripts/ai-smoke.mjs  （需先 npm run dev 起 1420）
 */

import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const BASE = "http://localhost:1420/";
const LS_KEY = "aida-note-settings";
const CFG = {
  baseURL: "https://api-inference.modelscope.cn/v1",
  apiKey: "ms-ad851672-5bf0-4f1b-83a4-f73145eec633",
  model: "Qwen/Qwen3.5-122B-A10B",
};
const SENTENCE = "人工智能技术正在快速发展，它能够帮助人们完成许多复杂的工作。随着大模型能力的提升，AI 应用场景越来越广泛。";

const results = [];
let pageErrors = [];
const captured = [];

process.on("uncaughtException", (e) => {
  writeFileSync("scripts/ai-report.txt", "UNCAUGHT:\n" + (e?.stack ?? String(e)), "utf8");
  process.exit(2);
});
process.on("unhandledRejection", (e) => {
  writeFileSync("scripts/ai-report.txt", "UNHANDLED:\n" + (e?.stack ?? String(e)), "utf8");
  process.exit(2);
});

function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  -- " + detail : ""}`);
  const errNote = pageErrors.length ? "\n[pageErrors@" + pageErrors.length + "] " + pageErrors[0].split("\n")[0] : "";
  writeFileSync(
    "scripts/ai-report.txt",
    results.map((r) => `${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.detail ? "  -- " + r.detail : ""}`).join("\n") + errNote,
    "utf8",
  );
}

const browser = await chromium.launch({ channel: "msedge", headless: true });

try {
  const page = await browser.newPage({ colorScheme: "light" });
  page.setDefaultTimeout(10000);
  pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(e.stack ?? String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") pageErrors.push(m.text());
  });

  // 拦截 AI 流式接口：记录请求形状，返回模拟 SSE 流（沙箱阻断真实长连接，见文件头注释）
  await page.route("**/chat/completions", async (route) => {
    const body = route.request().postDataJSON() ?? {};
    const prompt = (body.messages?.[0]?.content ?? "").toString();
    captured.push({
      model: body.model,
      stream: body.stream,
      kind: prompt.includes("mermaid") ? "mermaid" : prompt.includes("润色") ? "polish" : prompt.includes("选中的文本") ? "qa" : "other",
    });
    const content = "AI 流式回答内容（模拟流）。";
    const sse =
      content
        .split("")
        .map((ch) => `data: ${JSON.stringify({ choices: [{ delta: { content: ch } }] })}\n\n`)
        .join("") + "data: [DONE]\n\n";
    await route.fulfill({ status: 200, headers: { "Content-Type": "text/event-stream" }, body: sse });
  });

  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.keyboard.press("Control+n"); // 无标签时先建标签（MainView 空态接管）
  await page.waitForSelector(".cm-editor", { timeout: 8000 });
  await page.locator(".cm-content").click();
  await page.keyboard.insertText(SENTENCE);
  await page.waitForTimeout(200);

  const getContent = () =>
    page.evaluate(async () => {
      const app = document.querySelector("#app").__vue_app__;
      const pinia = app.config.globalProperties.$pinia;
      const { useTabsStore } = await import("/src/stores/tabsStore.ts");
      const ts = useTabsStore(pinia);
      return ts.activeTab ? ts.activeTab.content : "";
    });
  // n-message 3s 自动关闭：提示类断言改用「存在性轮询」（动作后立即轮询，存活期内命中）
  const msgShown = (text) =>
    page.waitForFunction(
      (t) => Array.from(document.querySelectorAll(".n-message")).some((el) => (el.textContent ?? "").includes(t)),
      text,
      { timeout: 6000 },
    );

  // ---- 1. 未配置 key：润色给出明确错误提示且不崩溃 ----
  await page.keyboard.press("Control+a");
  await page.waitForSelector(".sel-bar", { timeout: 5000 });
  await page.locator(".sel-bar-btn", { hasText: "润色" }).click();
  await page.waitForSelector(".polish-error", { timeout: 5000 });
  const errTip = (await page.locator(".polish-error").textContent()) ?? "";
  check("未配置 key 时润色提示「未配置 API」不崩溃", errTip.includes("未配置 API"), errTip.slice(0, 40));

  // ---- 2. 配置 API 并持久化（key 明文存 settings.json）----
  // OPT-8b：AI 入口整合为「AI 工具」下拉 -> 问答 / 生成 -> AI 问答面板
  await page.locator('.tool-bar button:has-text("AI 工具")').click();
  await page.waitForSelector(".n-dropdown-menu", { timeout: 5000 });
  await page.locator('.n-dropdown-menu :text-is("AI 问答面板")').click();
  await page.waitForSelector(".ai-panel", { timeout: 5000 });
  await page.locator(".ai-config-tip button", { hasText: "去设置" }).click();
  await page.waitForSelector(".ai-config-form", { timeout: 5000 });
  const cfgInputs = page.locator(".ai-config-form input");
  await cfgInputs.nth(0).fill(CFG.baseURL);
  await cfgInputs.nth(1).fill(CFG.apiKey);
  await cfgInputs.nth(2).fill(CFG.model);
  await page.locator(".ai-config-actions button", { hasText: "保存" }).click();
  // 持久化是确定性信号（消息 3s 自关，轮询 localStorage 更稳）
  await page.waitForFunction(
    (key) => (JSON.parse(localStorage.getItem(key) || "{}").aiConfig?.baseURL || "") !== "",
    LS_KEY,
    { timeout: 6000 },
  );
  const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), LS_KEY);
  check(
    "配置持久化到 settings（aiConfig 含 baseURL/key/model）",
    saved.aiConfig?.baseURL === CFG.baseURL && saved.aiConfig?.apiKey === CFG.apiKey && saved.aiConfig?.model === CFG.model,
    JSON.stringify(saved.aiConfig),
  );

  // ---- 3. 无选中文本：工具栏润色提示先选中（不带全文）----
  await page.locator(".cm-content").click();
  await page.keyboard.press("End");
  // OPT-8b：AI 工具下拉 -> 文本处理 -> AI 润色（子菜单）-> 润色
  await page.locator('.tool-bar button:has-text("AI 工具")').click();
  await page.waitForSelector(".n-dropdown-menu", { timeout: 5000 });
  await page.locator('.n-dropdown-menu :text("AI 润色")').hover();
  await page.locator(':text-is("润色")').click();
  await msgShown("请先在编辑器中选中文本");

  // ---- 4. 选中文本 -> 选区浮条四动作 ----
  await page.locator(".cm-content").click(); // 下拉点击后焦点移出编辑器，先点回再全选
  await page.keyboard.press("Control+a");
  await page.waitForSelector(".sel-bar", { timeout: 5000 });
  const selBtns = await page.locator(".sel-bar-btn").allTextContents();
  check(
    "选区浮条四动作（改写/润色/缩短/扩写）",
    JSON.stringify(selBtns) === JSON.stringify(["改写", "润色", "缩短", "扩写"]),
    JSON.stringify(selBtns),
  );

  // ---- 5. 右键菜单 -> 润色流式 -> 接受 -> 内容变化 ----
  await page.locator(".cm-content").click({ button: "right" });
  await page.waitForSelector(".ctx-menu", { timeout: 5000 });
  await page.locator(".ctx-btn", { hasText: "润色" }).click();
  await page.waitForSelector(".polish-bubble", { timeout: 5000 });
  await page.locator(".polish-btn.primary", { hasText: "接受" }).waitFor({ timeout: 15000 });
  const contentBefore = await getContent();
  await page.locator(".polish-btn.primary", { hasText: "接受" }).click();
  await page.waitForTimeout(300);
  const contentAfterAccept = await getContent();
  check("润色流式完成并接受 -> 内容变化", contentAfterAccept !== contentBefore, `len ${contentBefore.length} -> ${contentAfterAccept.length}`);

  // ---- 6. 接受后可撤销（Ctrl+Z 回退原内容）----
  await page.locator(".cm-content").click();
  await page.keyboard.press("Control+z");
  await page.waitForTimeout(300);
  const contentAfterUndo = await getContent();
  check("润色接受后可撤销还原", contentAfterUndo === contentBefore, `len ${contentAfterUndo.length}`);

  // ---- 7. 问答（选中上下文）流式回答 -> 插入光标 ----
  await page.keyboard.press("Control+a");
  await page.locator(".ai-input-row textarea").fill("用一句话总结这段文字的核心观点");
  await page.keyboard.press("Enter");
  await page.locator(".ai-msg-actions button", { hasText: "插入到光标处" }).first().waitFor({ timeout: 15000 });
  const answer = (await page.locator(".ai-msg-assistant .ai-msg-content").last().textContent()) ?? "";
  const contentBeforeInsert = await getContent();
  await page.locator(".cm-content").click(); // 折叠选区
  await page.keyboard.press("End"); // 光标到文末，插入为追加
  await page.locator(".ai-msg-actions button", { hasText: "插入到光标处" }).first().click();
  await page.waitForTimeout(300);
  const contentAfterInsert = await getContent();
  check(
    "问答回答可一键插入光标处",
    answer.length > 0 && contentAfterInsert.length > contentBeforeInsert.length && contentAfterInsert.includes(answer.slice(0, 12)),
    `answer=${answer.length} len ${contentBeforeInsert.length} -> ${contentAfterInsert.length}`,
  );

  // ---- 8. 无选中文本：问答提示先选中且不发请求 ----
  const qaCountBefore8 = captured.filter((c) => c.kind === "qa").length;
  await page.locator(".cm-content").click();
  await page.keyboard.press("End");
  const warnBefore8 = await page.evaluate(
    (t) => Array.from(document.querySelectorAll(".n-message")).filter((el) => (el.textContent ?? "").includes(t)).length,
    "请先在编辑器中选中文本",
  );
  await page.locator(".ai-input-row textarea").fill("这段文字讲了什么");
  await page.keyboard.press("Enter");
  await page.waitForFunction(
    ({ t, b }) =>
      Array.from(document.querySelectorAll(".n-message")).filter((el) => (el.textContent ?? "").includes(t)).length > b,
    { t: "请先在编辑器中选中文本", b: warnBefore8 },
    { timeout: 6000 },
  );
  await page.waitForTimeout(300);
  const qaCountAfter8 = captured.filter((c) => c.kind === "qa").length;
  check("无选中问答：提示先选中且未发起请求", qaCountAfter8 === qaCountBefore8, `qa ${qaCountBefore8} -> ${qaCountAfter8}`);

  // ---- 9. 请求形状（model + stream:true；润色 1 次 + 问答 1 次）----
  check(
    "AI 请求形状正确（model + stream:true，润色 1 + 问答 1）",
    captured.length === 2 &&
      captured.every((c) => c.model === CFG.model && c.stream === true) &&
      captured.filter((c) => c.kind === "polish").length === 1 &&
      captured.filter((c) => c.kind === "qa").length === 1,
    JSON.stringify(captured),
  );

  // ---- 10. 无页面 JS 错误（过滤 Naive 下拉/弹层卸载的已知良性竞态，功能无影响；同 theme-smoke）----
  const realErrors = pageErrors.filter(
    (e) => !e.includes("handleMouseMoveOutside") && !e.includes("syncPosition"),
  );
  check("无页面 JS 错误", realErrors.length === 0, realErrors.slice(0, 3).join(" | "));
} catch (e) {
  check("脚本执行完整性", false, String(e));
} finally {
  await browser.close().catch(() => {});
}

const failed = results.filter((r) => !r.ok);
const report =
  results.map((r) => `${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.detail ? "  -- " + r.detail : ""}`).join("\n") +
  `\n\n===== AI 自测：${results.length - failed.length}/${results.length} PASS =====\n`;
writeFileSync("scripts/ai-report.txt", report);
console.log(`\n===== AI 自测：${results.length - failed.length}/${results.length} PASS =====`);
if (failed.length > 0) process.exit(1);
