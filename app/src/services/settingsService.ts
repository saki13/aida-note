/**
 * settingsService：设置持久化（SIS-FUNC-8 / ARCH-2 §4）
 *
 * 存储位置：Tauri 环境用 plugin-store 读应用配置目录 settings.json（ARCH-2 §4.1）；
 * 浏览器环境（前端 Playwright 自测）用 localStorage 兜底，字段结构一致。
 * 兼容策略：load 时 { ...DEFAULT_SETTINGS, ...parsed } 浅合并 + aiConfig 单独深合并（ARCH-2 §4.2）。
 */

import { load as loadStore } from "@tauri-apps/plugin-store";

/** 强调色方案（SIS-FUNC-9：蓝/绿/紫，作用于 UI 主题色 primary） */
export type AccentColor = "blue" | "green" | "purple";

/** 设置结构（ARCH-2 §4.2 的 AppSettings，字段与 TS 接口一致） */
export interface AppSettings {
  /** 主题：light / dark / system（FUNC-9 三态，默认 system） */
  theme: "light" | "dark" | "system";
  /** 强调色方案（FUNC-9：蓝/绿/紫，默认 blue） */
  accentColor: AccentColor;
  /** 软换行：全局共享，默认开启（FUNC-8） */
  wordWrap: boolean;
  /** 最近文件：绝对路径数组，新的在前，去重，上限 20（FUNC-11） */
  recentFiles: string[];
  /** AI 接入配置（AI-1：单套 API，key 明文存储为既定决策） */
  aiConfig: {
    baseURL: string;
    apiKey: string;
    model: string;
  };
}

/** 兜底默认值（ARCH-2 §4.2 DEFAULT_SETTINGS） */
export const DEFAULT_SETTINGS: AppSettings = {
  theme: "system",
  accentColor: "blue",
  wordWrap: true,
  recentFiles: [],
  aiConfig: { baseURL: "", apiKey: "", model: "" },
};

const STORE_FILE = "settings.json";
const LS_KEY = "aida-note-settings";

function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

/** 全量读取设置（Tauri plugin-store / 浏览器 localStorage 兜底），失败回落默认值。 */
export async function loadSettings(): Promise<AppSettings> {
  let parsed: Partial<AppSettings> = {};
  try {
    if (isTauri()) {
      const store = await loadStore(STORE_FILE);
      const raw = (await store.get<Partial<AppSettings>>("settings")) ?? {};
      parsed = raw;
    } else {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) parsed = JSON.parse(raw) as Partial<AppSettings>;
    }
  } catch (e) {
    console.error("load settings failed:", e);
  }
  return {
    ...DEFAULT_SETTINGS,
    ...parsed,
    aiConfig: { ...DEFAULT_SETTINGS.aiConfig, ...(parsed.aiConfig ?? {}) },
  };
}

/** 增量保存设置（整体读-合-写，ARCH-2 §4.1）。 */
export async function saveSettings(patch: Partial<AppSettings>): Promise<void> {
  const current = await loadSettings();
  const next: AppSettings = {
    ...current,
    ...patch,
    aiConfig: { ...current.aiConfig, ...(patch.aiConfig ?? {}) },
  };
  try {
    if (isTauri()) {
      const store = await loadStore(STORE_FILE);
      await store.set("settings", next);
      await store.save();
    } else {
      localStorage.setItem(LS_KEY, JSON.stringify(next));
    }
  } catch (e) {
    console.error("save settings failed:", e);
  }
}
