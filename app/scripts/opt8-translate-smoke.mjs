/**
 * OPT-8 自测（Playwright + 系统 Edge，SIS-OPT-8）
 *
 * 覆盖验收：AI 工具整合下拉（独立 AI 按钮消失）/ 未配置提示 / 双屏翻译视图 /
 * 语义断句 / hover 双向高亮 / 关闭无损返回编辑 / 无 JS 错误。
 * 运行：node scripts/opt8-translate-smoke.mjs  （需先 npm run dev 起 1420）
 */

import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const BASE = "http://localhost:1420/";
const LS_KEY = "aida-note-settings";
const CFG = { baseURL: "https://mock.example/v1", apiKey: "mock-key", model: "mock-model" };
const results = [];
let pageErrors = [];

process.on("uncaughtException", (e) => {
  console.error("UNCAUGHT:", e?.stack ?? String(e));
  writeFileSync("scripts/opt8-report.err.txt", "UNCAUGHT:\n" + (e?.stack ?? String(e)), "utf8");
  process.exit(2);
});
process.on("unhandledRejection", (e) => {
  console.error("UNHANDLED:", e?.stack ?? String(e));
  writeFileSync("scripts/opt8-report.err.txt", "UNHANDLED:\n" + (e?.stack ?? String(e)), "utf8");
  process.exit(2);
});

function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  -- " + detail : ""}`);
  writeFileSync(
    "scripts/opt8-report.txt",
    results.map((r) => `${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.detail ? "  -- " + r.detail : ""}`).join("\n"),
    "utf8",
  );
}

const DOC = `# 翻译测试文档

这是第一句，介绍人工智能技术如何改变日常工作方式，使得重复性劳动可以被自动化处理，从而释放更多时间用于创造性工作，这段话的长度足以让原文面板产生滚动以支撑滚动联动的验证。这是第二句，在同一段落，进一步说明大模型在代码编写、文档总结与信息检索方面的应用越来越广泛，段落因此获得了额外的高度。第三句另起一行，仍是同一段，补充说明自然语言交互降低了工具使用门槛，让非技术用户也能高效完成复杂任务。

这是第二段的第一句，讨论翻译场景下语义对齐的价值，即译文应当与原文表达的逻辑结构保持一致，而不是机械地按行对应，这里特别强调翻译请求应当携带完整原文，保留换行与段落结构。它跨
行继续，说明换行不强制断句，翻译时保留上下文，这样才能让 LLM 在完整语境下产出准确的译文，同时左栏的断句展示只是为对齐与高亮提供索引。

这是第三段的第一句，继续讨论译文长度与版面高度，确保双栏内容足够长从而可以真实触发滚动事件，验证左右两栏的滚动位置同步机制在长文档场景下稳定可靠。这是第三段的第二句，补充说明测试文档故意设计的较长是为了覆盖滚动联动这一交互验收点，避免因内容不足一屏而导致滚动断言失效。

这是第四段的第一句，说明在完整语境的语义翻译下，长段落中的多句可以保持逻辑连贯，整段译文的可读性也更高。这是第四段的第二句，同时验证滚动联动在内容显著超过视口高度时依然能够正常工作，保证两侧滚动位置始终同步。这是第四段的第三句，再次确认翻译视图的高度约束正确生效，双栏各自独立滚动但位置联动，避免出现一栏滚动而另一栏不动的情况。
`;

// 期望断句数（11 句：#标题 + 各段句子；段落 2 三句、段落 3 两句、段落 4 三句 + 第二段第一句 + 跨行合并句）。
// 译句故意写长：让右栏内容显著超过一屏，滚动联动才可触发（右栏过短会被 clamp 导致 scrollTop 恒 0）。
const MOCK_TGTS = [
  "译句一：人工智能技术正在深刻改变日常工作方式，使重复性劳动被自动化处理，从而释放更多时间用于创造性工作，这一点在文档处理、代码辅助与知识管理领域体现得尤为明显，随着模型能力的持续提升，应用场景还在不断扩展。",
  "译句二：大模型在代码编写、文档总结与信息检索方面的应用日益广泛，段落的整体高度也随之得到保证，同时交互方式也从命令行转向自然语言，这让普通用户也能借助智能助手完成过去需要专业人员才能处理的复杂工作。",
  "译句三：自然语言交互大幅降低了工具使用门槛，让非技术用户也能高效完成复杂的多步骤任务，无论是撰写报告、整理数据还是翻译文档，都可以通过简单的对话指令直接完成，这代表着人机协作进入了一个全新的阶段。",
  "译句四：翻译场景下语义对齐的价值在于，译文应当与原文表达的逻辑结构保持一致，而不是机械地按行对应，因为只有把握完整语境才能理解省略、指代与习惯表达，进而产出准确、流畅且符合阅读习惯的译文。",
  "译句五：翻译请求应当携带完整原文，保留换行与段落结构，这样 LLM 才能在完整语境下产出准确流畅的译文，而前端展示的断句只是为左右两栏的逐句对齐与高亮联动提供索引，两者职责不同但彼此配合。",
  "译句六：跨行句子在断句展示时被合并为一句，既保留了上下文，又为左右两栏的逐句高亮提供了稳定的索引，用户悬停任意一侧的句子时，另一侧对应的译文或原文会同步高亮，方便逐句对照阅读。",
  "译句七：双栏滚动联动要求两侧内容都足够长，否则一侧无可滚动空间时无法验证同步机制是否真正生效，因此在设计滚动测试用例时，需要同时保证原文与译文的篇幅都明显超过可视区域的高度。",
  "译句八：为了覆盖滚动联动这一交互验收点，测试文档被刻意设计得较长，避免因内容不足一屏而导致滚动断言失效，同时译文也被加长，确保左右两栏都能独立产生滚动条，从而真实模拟长文档的翻译对比场景。",
  "译句九：长段落中的多句在完整语境翻译下保持逻辑连贯，整段译文的可读性也因此得到显著提升，段落与段落之间通过空行分隔，句子与句子之间则依靠句末标点划分，整体结构清晰且便于定位。",
  "译句十：滚动联动在内容显著超过视口高度时依然正常工作，两侧滚动位置始终保持同步不漂移，无论是拖动滚动条、使用鼠标滚轮还是键盘翻页，一侧的位置变化都会立即反映到另一侧，交互体验流畅一致。",
  "译句十一：翻译视图的高度约束正确生效后，双栏各自独立滚动但位置联动，不会出现一栏滚动而另一栏不动的情况，同时关闭翻译视图后原文保持不变，也不写入任何文件或标记为未保存，属于临时的对比查看功能。",
];

const browser = await chromium.launch({ channel: "msedge", headless: true });

try {
  const context = await browser.newContext({ colorScheme: "light" });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(e.stack ?? String(e)));

  // 拦截 AI 流式：翻译请求返回 JSON 数组译文（流式）
  await page.route("**/chat/completions", async (route) => {
    const body = route.request().postDataJSON() ?? {};
    const prompt = (body.messages?.[0]?.content ?? "").toString();
    if (!prompt.includes("翻译成简体中文")) {
      await route.fulfill({ status: 200, headers: { "Content-Type": "text/event-stream" }, body: "data: [DONE]\n\n" });
      return;
    }
    const content = JSON.stringify(MOCK_TGTS);
    let sse = "";
    for (const ch of content) {
      sse += `data: ${JSON.stringify({ choices: [{ delta: { content: ch } }] })}\n\n`;
      await new Promise((r) => setTimeout(r, 4));
    }
    sse += "data: [DONE]\n\n";
    await route.fulfill({ status: 200, headers: { "Content-Type": "text/event-stream" }, body: sse });
  });

  await page.goto(BASE, { waitUntil: "load" });
  await page.waitForFunction(() => document.querySelector(".main-view") !== null);

  const msgShown = (text) =>
    page.waitForFunction(
      (t) => Array.from(document.querySelectorAll(".n-message")).some((el) => (el.textContent ?? "").includes(t)),
      text,
      { timeout: 6000 },
    );

  // ---- 1. AI 工具整合下拉（DoD 1） ----
  const aiBtnCount = await page.locator('.tool-bar button:has-text("AI")').count();
  const hasAiTools = await page.locator('.tool-bar button:has-text("AI 工具")').count();
  check("ToolBar 只有「AI 工具」一个 AI 入口（独立 AI 按钮消失）", hasAiTools === 1 && aiBtnCount === 1, `ai-buttons=${aiBtnCount}`);

  // 打开标签并输入文档
  await page.keyboard.press("Control+n");
  await page.waitForSelector(".cm-editor", { timeout: 8000 });
  await page.locator(".cm-content").click();
  await page.keyboard.insertText(DOC);
  await page.waitForTimeout(200);

  // ---- 2. 未配置 AI：点「AI 工具」->「AI 翻译」提示，不打开视图 ----
  await page.locator('.tool-bar button:has-text("AI 工具")').click();
  await page.waitForSelector(".n-dropdown-menu", { timeout: 5000 });
  await page.locator('.n-dropdown-menu :text("AI 翻译")').click();
  await msgShown("请先");
  check("未配置 AI 时点翻译提示配置且不打开视图", (await page.locator(".translate-view").count()) === 0, "translate-view=0");

  // ---- 3. 注入配置 -> 打开双屏翻译视图（DoD 3） ----
  await page.evaluate(
    async (cfg) => {
      const app = document.querySelector("#app").__vue_app__;
      const pinia = app.config.globalProperties.$pinia;
      const { useAiStore } = await import("/src/stores/aiStore.ts");
      const ai = useAiStore(pinia);
      await ai.saveConfig(cfg);
    },
    CFG,
  );
  await page.locator('.tool-bar button:has-text("AI 工具")').click();
  await page.waitForSelector(".n-dropdown-menu", { timeout: 5000 });
  await page.locator('.n-dropdown-menu :text("AI 翻译")').click();
  await page.waitForSelector(".translate-view", { timeout: 8000 });
  await page.waitForFunction(() => document.querySelector(".t-sent") !== null, undefined, { timeout: 12000 });
  check("配置后点翻译打开双屏视图（左原文/右译文）", (await page.locator(".t-pane").count()) === 2, `panes=${await page.locator(".t-pane").count()}`);

  // ---- 4. 语义断句（DoD 4）：左栏多句（>3），右栏同数量译文 ----
  const leftSents = await page.locator(".t-sent[data-side=left]").count();
  const rightSents = await page.locator(".t-sent[data-side=right]").count();
  check("语义断句：左栏多句切分", leftSents >= 4, `left=${leftSents}`);
  check("译文按句对齐（右栏句数 = 左栏句数）", leftSents === rightSents, `left=${leftSents} right=${rightSents}`);
  const srcText = await page.locator('.t-sent[data-side=left]').first().textContent();
  check("左栏首句为原文标题", (srcText ?? "").includes("# 翻译测试文档"), srcText ?? "");

  // ---- 5. hover 双向高亮（DoD 5） ----
  await page.locator('.t-sent[data-side=left][data-idx="0"]').hover();
  await page.waitForTimeout(150);
  const rightActive0 = await page.locator('.t-sent[data-side=right][data-idx="0"].active').count();
  await page.locator('.t-sent[data-side=right][data-idx="2"]').hover();
  await page.waitForTimeout(150);
  const leftActive2 = await page.locator('.t-sent[data-side=left][data-idx="2"].active').count();
  check("悬停左侧句子 -> 右侧同索引高亮", rightActive0 === 1, `right-active=${rightActive0}`);
  check("悬停右侧句子 -> 左侧同索引高亮", leftActive2 === 1, `left-active=${leftActive2}`);

  // ---- 6. 关闭翻译视图返回编辑（DoD 7）+ 状态重置（DoD 8） ----
  const editorBefore = await page.locator(".cm-editor").count();
  await page.locator('.translate-head button:has-text("×")').click();
  await page.waitForFunction(() => !document.querySelector(".translate-view"));
  const editorAfter = await page.locator(".cm-editor").count();
  const contentAfter = await page.locator(".cm-content").textContent();
  check("关闭翻译返回编辑且原文不丢", editorBefore === 0 && editorAfter === 1 && (contentAfter ?? "").includes("# 翻译测试文档"), `editor=${editorAfter}`);
  const stAfterClose = await page.evaluate(async () => {
    const app = document.querySelector("#app").__vue_app__;
    const pinia = app.config.globalProperties.$pinia;
    const { useAiStore } = await import("/src/stores/aiStore.ts");
    return useAiStore(pinia).translate.status;
  });
  check("关闭后翻译状态重置（idle）", stAfterClose === "idle", `status=${stAfterClose}`);

  // ---- 6b. 滚动联动（DoD 6）：滚动左栏 -> 右栏 scrollTop 同步 ----
  await page.locator('.tool-bar button:has-text("AI 工具")').click();
  await page.waitForSelector(".n-dropdown-menu", { timeout: 5000 });
  await page.locator('.n-dropdown-menu :text("AI 翻译")').click();
  await page.waitForSelector(".translate-view", { timeout: 8000 });
  await page.waitForFunction(() => document.querySelectorAll(".t-sent[data-side=left]").length > 3, undefined, { timeout: 12000 });
  const rst = await page.evaluate(async () => {
    const panes = document.querySelectorAll(".t-pane");
    const info = { lsh: panes[0].scrollHeight, lch: panes[0].clientHeight, rsh: panes[1].scrollHeight, rch: panes[1].clientHeight };
    info.tgt0 = (document.querySelector('.t-sent[data-side=right]')?.textContent ?? "").slice(0, 24);
    info.tgtLen = (document.querySelector('.t-sent[data-side=right]')?.textContent ?? "").length;
    info.tgtCount = document.querySelectorAll('.t-sent[data-side=right]').length;
    panes[0].scrollTop = 120;
    await new Promise((r) => setTimeout(r, 250));
    info.l = panes[0].scrollTop;
    info.r = panes[1].scrollTop;
    return info;
  });
  check("滚动联动：左侧滚动同步右侧", rst.r > 0 && rst.r === rst.l, JSON.stringify(rst));

  // ---- 7. 无 JS 错误（忽略 naive-ui 下拉卸载良性竞态，项目已确认惯例） ----
  const realErrors = pageErrors.filter((s) => !s.includes("handleMouseMoveOutside"));
  const pageErrorDetail = realErrors.length ? "\n" + realErrors.join("\n---\n") : "";
  check("无页面 JS 错误（忽略 naive-ui 下拉卸载良性竞态）", realErrors.length === 0, `errors=${realErrors.length}${pageErrorDetail}`);
} catch (e) {
  check("执行过程异常", false, e?.stack ?? String(e));
} finally {
  await browser.close();
}

const passed = results.filter((r) => r.ok).length;
writeFileSync(
  "scripts/opt8-report.txt",
  results.map((r) => `${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.detail ? "  -- " + r.detail : ""}`).join("\n") +
    `\n\n===== AI 翻译双屏对比自测：${passed}/${results.length} PASS =====`,
  "utf8",
);
console.log(`\n===== AI 翻译双屏对比自测：${passed}/${results.length} PASS =====`);
