/**
 * settingsStore：全局设置状态（SIS-FUNC-8 / ARCH-2 §4）
 *
 * 当前实现 FUNC-8 所需的最小字段（wordWrap）；theme / recentFiles / aiConfig
 * 由 FUNC-9 / FUNC-11 / AI-1 逐步扩展（字段已在 AppSettings 定义）。
 * 状态单一来源：settingsService.load() 初始化，setWordWrap 变更即持久化。
 */

import { defineStore } from "pinia";
import { ref } from "vue";
import { loadSettings, saveSettings } from "../services/settingsService";

export const useSettingsStore = defineStore("settings", () => {
  /** 软换行：全局共享，默认开启（FUNC-8） */
  const wordWrap = ref(true);

  /** 启动时加载设置（EditorPane mount 时调用；加载后 wordWrap 变化触发编辑器 reconfigure）。 */
  async function init(): Promise<void> {
    const s = await loadSettings();
    wordWrap.value = s.wordWrap;
  }

  /** 切换软换行：更新状态 + 持久化。 */
  async function setWordWrap(v: boolean): Promise<void> {
    wordWrap.value = v;
    await saveSettings({ wordWrap: v });
  }

  return { wordWrap, init, setWordWrap };
});
