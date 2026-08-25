<script setup lang="ts">
import { computed } from "vue";
import { NConfigProvider, NDialogProvider, NMessageProvider, darkTheme, lightTheme, type GlobalThemeOverrides } from "naive-ui";
import MainView from "./views/MainView.vue";
import { useSettingsStore, ACCENT_OVERRIDES } from "./stores/settingsStore";

const settingsStore = useSettingsStore();
void settingsStore.init(); // 首屏加载持久化设置（theme/accentColor/wordWrap）

/** 实际生效主题驱动 Naive UI Provider（FUNC-9 三态解析） */
const naiveTheme = computed(() => (settingsStore.resolvedTheme === "dark" ? darkTheme : lightTheme));
/** 强调色 primary 覆盖（蓝/绿/紫三套均显式定义，Naive UI 默认 primary 是绿） */
const themeOverrides = computed<GlobalThemeOverrides>(() => {
  const overrides = ACCENT_OVERRIDES[settingsStore.accentColor];
  return { common: overrides };
});
</script>

<template>
  <n-config-provider
    :theme="naiveTheme"
    :theme-overrides="themeOverrides"
    class="app-root"
    :data-theme="settingsStore.resolvedTheme"
    :data-accent="settingsStore.accentColor"
  >
    <n-dialog-provider>
      <n-message-provider>
        <MainView />
      </n-message-provider>
    </n-dialog-provider>
  </n-config-provider>
</template>

<style>
* {
  box-sizing: border-box;
}
html,
body,
#app {
  margin: 0;
  padding: 0;
  height: 100%;
}
body {
  font-family: system-ui, "Segoe UI", "Microsoft YaHei", sans-serif;
  overflow: hidden;
}

/* ================= OPT-2：全局主题变量（明/暗 + 强调色）=================
 * 此前各组件大量使用 var(--toolbar-bg/--border-color/--editor-bg/...) 但从未定义，
 * 导致暗色模式下全部回退成亮色（白底白字看不清、强调色不生效）。
 * 现在以 data-theme / data-accent（App.vue 根节点，由 resolvedTheme 驱动）统一定义，
 * 组件内只需使用变量即可自动适配两主题 + 三强调色。 */
:root,
[data-theme="light"] {
  --toolbar-bg: #fafafa;
  --tabbar-bg: #f3f3f3;
  --tab-bg: #e9e9e9;
  --tab-fg: #333;
  --tab-active-bg: #ffffff;
  --tab-active-fg: #111111;
  --editor-bg: #ffffff;
  --editor-fg: #333333;
  --panel-bg: #ffffff;
  --statusbar-bg: #f0f0f0;
  --border-color: #dddddd;
  --floating-bg: #ffffff;
  --search-panel-bg: #ffffff;
  --search-input-bg: #ffffff;
  --btn-bg: #f5f5f5;
  --head-bg: #fafafa;
  --text-color: #333333;
  --gutter-bg: #f6f6f6;
  --hover-bg: #f2f2f4;
  --diff-removed-bg: #fdecec;
  --diff-added-bg: #e8f5e9;
  --diff-removed-char: #f8c6c6;
  --diff-added-char: #b8e6b8;
}
[data-theme="dark"] {
  --toolbar-bg: #1f1f1f;
  --tabbar-bg: #252526;
  --tab-bg: #2d2d2d;
  --tab-fg: #d4d4d4;
  --tab-active-bg: #1e1e1e;
  --tab-active-fg: #ffffff;
  --editor-bg: #1e1e1e;
  --editor-fg: #d4d4d4;
  --panel-bg: #1e1e1e;
  --statusbar-bg: #2d2d2d;
  --border-color: #3c3c3c;
  --floating-bg: #252526;
  --search-panel-bg: #252526;
  --search-input-bg: #3c3c3c;
  --btn-bg: #3c3c3c;
  --head-bg: #2d2d2d;
  --text-color: #d4d4d4;
  --gutter-bg: #252526;
  --hover-bg: rgba(255, 255, 255, 0.08);
  --diff-removed-bg: #4a2323;
  --diff-added-bg: #1e3a24;
  --diff-removed-char: #8a3a3a;
  --diff-added-char: #2d6a34;
}
:root {
  --accent: #2080f0;
  --primary-color: #2080f0;
}
[data-accent="blue"] {
  --accent: #2080f0;
  --primary-color: #2080f0;
}
[data-accent="green"] {
  --accent: #18a058;
  --primary-color: #18a058;
}
[data-accent="purple"] {
  --accent: #7c4dff;
  --primary-color: #7c4dff;
}

/* ================= SIS-OPT-3：自定义背景分层 =================
 * .bg-layer 绝对定位铺在内容之下（z-index 0），内容 z-index 1；
 * 有背景时（.has-bg）chrome 区（工具栏/标签栏/状态栏/AI 面板）背景透明让图透出，
 * 模式 app 时编辑区（含 CM 编辑器/最近文件空态）也透出背景（文字可读靠遮罩层）；
 * 模式 outside 时编辑区保持主题纯色（仅编辑区外显示背景）。 */
.bg-layer {
  position: absolute;
  left: 0;
  right: 0;
  z-index: 0;
  pointer-events: none;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}
.main-view {
  position: relative;
}
.main-view > :not(.bg-layer) {
  position: relative;
  z-index: 1;
}
.has-bg .tool-bar,
.has-bg .tab-bar,
.has-bg .status-bar,
.has-bg .ai-panel {
  background-color: transparent !important;
}
.has-bg[data-bg-mode="app"] .editor-area,
.has-bg[data-bg-mode="app"] .recent-empty {
  background: transparent !important;
}
.has-bg[data-bg-mode="app"] .editor-host .cm-editor {
  background-color: transparent !important;
}
</style>
