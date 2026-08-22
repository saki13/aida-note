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
</style>
