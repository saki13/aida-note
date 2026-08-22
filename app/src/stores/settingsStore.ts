/**
 * settingsStore：全局设置状态（SIS-FUNC-8/9/11、ARCH-2 §4）
 *
 * 字段齐全版：wordWrap（FUNC-8）、theme/accentColor（FUNC-9）、recentFiles（FUNC-11）、
 * aiConfig（AI-1）。状态单一来源：settingsService.load() 初始化，set* 变更即持久化。
 * resolvedTheme：三态偏好 -> 实际生效主题的解析层（system 跟随 matchMedia 实时联动，
 * 监听器在 init 单次注册，防 EditorPane 重挂载重复 init）。
 */

import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { loadSettings, saveSettings, type AccentColor } from "../services/settingsService";

export type ThemePref = "light" | "dark" | "system";

/** 强调色 -> Naive UI primary 色系覆盖（SIS-FUNC-9 蓝/绿/紫；注意 Naive UI 默认 primary 是绿 #18a058，blue 也须显式覆盖） */
export const ACCENT_OVERRIDES: Record<AccentColor, Record<string, string>> = {
  blue: {
    primaryColor: "#2080f0",
    primaryColorHover: "#4098fc",
    primaryColorPressed: "#1060c9",
    primaryColorSuppl: "#4098fc",
  },
  green: {
    primaryColor: "#18a058",
    primaryColorHover: "#36ad6a",
    primaryColorPressed: "#0c7a43",
    primaryColorSuppl: "#36ad6a",
  },
  purple: {
    primaryColor: "#7c4dff",
    primaryColorHover: "#8f64ff",
    primaryColorPressed: "#6335e0",
    primaryColorSuppl: "#8f64ff",
  },
};

export const useSettingsStore = defineStore("settings", () => {
  /** 软换行：全局共享，默认开启（FUNC-8） */
  const wordWrap = ref(true);
  /** 主题偏好三态（FUNC-9，默认 system） */
  const theme = ref<ThemePref>("system");
  /** 强调色方案（FUNC-9，默认 blue） */
  const accentColor = ref<AccentColor>("blue");
  /** 最近文件：绝对路径数组，新的在前，去重，上限 20（SIS-FUNC-11） */
  const recentFiles = ref<string[]>([]);
  /** 系统当前明暗（仅 system 模式使用；matchMedia 监听实时更新） */
  const systemDark = ref(false);

  /** 实际生效主题：system -> 跟随系统（FUNC-9 三态解析层，驱动全 UI） */
  const resolvedTheme = computed<"light" | "dark">(() =>
    theme.value === "system" ? (systemDark.value ? "dark" : "light") : theme.value,
  );

  let mediaQuery: MediaQueryList | null = null;
  let mediaListener: (() => void) | null = null;

  /** 启动时加载设置并注册系统明暗监听（防重复：仅首次注册）。 */
  async function init(): Promise<void> {
    const s = await loadSettings();
    wordWrap.value = s.wordWrap;
    theme.value = s.theme;
    accentColor.value = s.accentColor;
    recentFiles.value = s.recentFiles;
    if (!mediaQuery) {
      mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      systemDark.value = mediaQuery.matches;
      mediaListener = () => {
        systemDark.value = mediaQuery?.matches ?? false;
      };
      mediaQuery.addEventListener("change", mediaListener);
    }
  }

  /** 记录最近文件（SIS-FUNC-11）：去重置顶 + 上限 20（移除最旧）+ 持久化。 */
  async function addRecentFile(path: string): Promise<void> {
    if (!path) return;
    recentFiles.value = [path, ...recentFiles.value.filter((p) => p !== path)].slice(0, 20);
    await saveSettings({ recentFiles: recentFiles.value });
  }

  /** 移除失效最近文件（点击文件不存在时）+ 持久化。 */
  async function removeRecentFile(path: string): Promise<void> {
    recentFiles.value = recentFiles.value.filter((p) => p !== path);
    await saveSettings({ recentFiles: recentFiles.value });
  }

  /** 切换主题偏好三态：更新状态 + 持久化（resolvedTheme 派生即时生效）。 */
  async function setTheme(v: ThemePref): Promise<void> {
    theme.value = v;
    await saveSettings({ theme: v });
  }

  /** 切换强调色：更新状态 + 持久化。 */
  async function setAccentColor(v: AccentColor): Promise<void> {
    accentColor.value = v;
    await saveSettings({ accentColor: v });
  }

  /** 切换软换行：更新状态 + 持久化。 */
  async function setWordWrap(v: boolean): Promise<void> {
    wordWrap.value = v;
    await saveSettings({ wordWrap: v });
  }

  return { wordWrap, theme, accentColor, recentFiles, systemDark, resolvedTheme, init, addRecentFile, removeRecentFile, setTheme, setAccentColor, setWordWrap };
});
