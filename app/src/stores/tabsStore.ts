/**
 * tabsStore：多标签文件编辑状态（SIS-FUNC-1）
 *
 * 依据 ARCH-2 §1 状态模型实现：标签全部状态唯一存在于本 store；
 * 脏标记 = content !== savedContent 的立即派生态（ARCH-2 §1.3）；
 * 关闭确认三选（保存/不保存/取消）见 ARCH-2 §2.2。
 * 扩展字段：hadBom（ARCH-2 §3.1）、cmState（CodeMirror 状态，含历史，切标签保留）。
 */

import { ref, computed, markRaw } from "vue";
import { defineStore } from "pinia";
import type { DialogApi } from "naive-ui";
import type { EditorState } from "@codemirror/state";
import {
  pickFiles,
  pickSavePath,
  readFile,
  writeFile,
  basename,
} from "../services/fileService";
import { detectLanguage, type LanguageId } from "../services/language";
import { useSettingsStore } from "./settingsStore";

export interface Tab {
  id: number;
  filePath: string | null;
  title: string;
  content: string;
  savedContent: string;
  language: LanguageId;
  dirty: boolean;
  isNewFile: boolean;
  /** 扩展字段：原文件是否带 UTF-8 BOM（ARCH-2 §3.1，写回时补回） */
  hadBom: boolean;
  /** 扩展字段：CodeMirror EditorState（含文档历史），切标签保留、保存不清空 */
  cmState?: EditorState | null;
}

export type CloseAction = "save" | "discard" | "cancel";

export const useTabsStore = defineStore("tabs", () => {
  const tabs = ref<Tab[]>([]);
  const activeTabId = ref<number | null>(null);

  let nextId = 1;
  let untitledCount = 1;

  const activeTab = computed<Tab | null>(
    () => tabs.value.find((t) => t.id === activeTabId.value) ?? null
  );

  /** 最近文件记录（SIS-FUNC-11 钩子）：打开/保存成功后写入，去重置顶、上限 20（settingsStore 内实现）。 */
  function recordRecent(path: string): void {
    if (!path) return;
    void useSettingsStore().addRecentFile(path);
  }

  function findTabById(tabId: number): Tab | undefined {
    return tabs.value.find((t) => t.id === tabId);
  }

  function removeTab(tabId: number): void {
    const idx = tabs.value.findIndex((t) => t.id === tabId);
    if (idx === -1) return;
    tabs.value.splice(idx, 1);
    if (activeTabId.value === tabId) {
      activeTabId.value =
        tabs.value.length > 0
          ? tabs.value[Math.min(idx, tabs.value.length - 1)].id
          : null;
    }
  }

  function setActive(tabId: number): void {
    if (findTabById(tabId)) activeTabId.value = tabId;
  }

  function moveTab(from: number, to: number): void {
    if (from < 0 || to < 0 || from >= tabs.value.length || to >= tabs.value.length) return;
    const [moved] = tabs.value.splice(from, 1);
    tabs.value.splice(to, 0, moved);
  }

  /**
   * 打开标签。文件已打开时直接激活对应标签（去重）。
   */
  function openTab(
    input:
      | { filePath: string; content: string; hadBom: boolean }
      | { title: string }
  ): number {
    if ("filePath" in input && input.filePath) {
      const existing = tabs.value.find((t) => t.filePath === input.filePath);
      if (existing) {
        setActive(existing.id);
        recordRecent(input.filePath); // 重新激活也算最近访问（SIS-FUNC-11 置顶）
        return existing.id;
      }
      const language = detectLanguage(input.filePath);
      const tab: Tab = {
        id: nextId++,
        filePath: input.filePath,
        title: basename(input.filePath),
        content: input.content,
        savedContent: input.content,
        language,
        dirty: false,
        isNewFile: false,
        hadBom: input.hadBom,
        cmState: null,
      };
      tabs.value.push(tab);
      activeTabId.value = tab.id;
      recordRecent(input.filePath); // 打开文件成功 -> 写入最近列表（SIS-FUNC-11）
      return tab.id;
    }

    // 新建未命名标签（此处 input 可能仍是联合类型，用 in 收窄）
    const title = "title" in input ? input.title : `未命名-${untitledCount++}`;
    const tab: Tab = {
      id: nextId++,
      filePath: null,
      title,
      content: "",
      savedContent: "",
      language: "plaintext",
      dirty: false,
      isNewFile: true,
      hadBom: false,
      cmState: null,
    };
    tabs.value.push(tab);
    activeTabId.value = tab.id;
    return tab.id;
  }

  function createUntitled(): number {
    return openTab({ title: `未命名-${untitledCount++}` });
  }

  function updateContent(tabId: number, content: string): void {
    const tab = findTabById(tabId);
    if (!tab) return;
    tab.content = content;
    tab.dirty = content !== tab.savedContent; // 立即置位/复位（ARCH-2 §1.3）
  }

  function markSaved(tabId: number, filePath?: string): void {
    const tab = findTabById(tabId);
    if (!tab) return;
    if (filePath !== undefined) {
      tab.filePath = filePath;
      tab.title = basename(filePath);
      tab.language = detectLanguage(filePath);
      tab.isNewFile = false;
      recordRecent(filePath); // 保存（含另存为新路径）成功后写入最近列表（SIS-FUNC-11）
    }
    tab.savedContent = tab.content;
    tab.dirty = false;
  }

  /** 按路径打开（SIS-FUNC-11 最近文件入口）：读文件失败（文件不存在等）返回 false 由调用方提示移除。 */
  async function openPath(path: string): Promise<boolean> {
    try {
      const { content, hadBom } = await readFile(path);
      openTab({ filePath: path, content, hadBom });
      return true;
    } catch (e) {
      console.error(`openPath failed: ${path}`, e);
      return false;
    }
  }

  /** 手动覆盖语言（SIS-FUNC-2 状态栏语言选择器；自动识别由 openTab 负责）。 */
  function setLanguage(tabId: number, lang: LanguageId): void {
    const tab = findTabById(tabId);
    if (!tab) return;
    tab.language = lang;
  }

  /** 保存当前 tab；无路径时转另存为。返回是否成功。 */
  async function saveTab(tabId: number): Promise<boolean> {
    const tab = findTabById(tabId);
    if (!tab) return false;
    if (tab.filePath === null) return saveTabAs(tabId);
    try {
      await writeFile(tab.filePath, tab.content, tab.hadBom);
      markSaved(tabId);
      return true;
    } catch (e) {
      console.error("saveTab failed:", e);
      return false;
    }
  }

  /** 另存为：弹保存对话框后写入并回填 filePath/title/language。 */
  async function saveTabAs(tabId: number): Promise<boolean> {
    const tab = findTabById(tabId);
    if (!tab) return false;
    const path = await pickSavePath(tab.title);
    if (path === null) return false;
    try {
      await writeFile(path, tab.content, tab.hadBom);
      markSaved(tabId, path);
      return true;
    } catch (e) {
      console.error("saveTabAs failed:", e);
      return false;
    }
  }

  /** 打开系统对话框（可多选），多文件依次开标签。返回打开的标签数。 */
  async function openFilesViaDialog(): Promise<number> {
    const paths = await pickFiles();
    let opened = 0;
    for (const path of paths) {
      try {
        const { content, hadBom } = await readFile(path);
        openTab({ filePath: path, content, hadBom });
        opened++;
      } catch (e) {
        console.error(`open file failed: ${path}`, e);
      }
    }
    return opened;
  }

  /**
   * dirty 三选确认（ARCH-2 §2.2）。返回 'save' | 'discard' | 'cancel'。
   * dialog 实例由组件层注入（onCloseRequested 等非组件上下文拿不到 useDialog）。
   */
  function askSaveDiscardCancel(title: string, dialog: DialogApi): Promise<CloseAction> {
    return new Promise<CloseAction>((resolve) => {
      dialog.warning({
        title: "未保存的更改",
        content: `是否保存「${title}」的更改？`,
        positiveText: "保存",
        negativeText: "不保存",
        onPositiveClick: () => resolve("save"),
        onNegativeClick: () => resolve("discard"),
        onClose: () => resolve("cancel"),
        onMaskClick: () => resolve("cancel"),
      });
    });
  }

  /**
   * 关闭标签。dirty 时三选确认；保存失败则标签保留。
   * 返回是否已关闭（取消/保存失败 = false）。
   */
  async function closeTab(
    tabId: number,
    opts?: { force?: boolean; dialog?: DialogApi }
  ): Promise<boolean> {
    const tab = findTabById(tabId);
    if (!tab) return true;
    if (opts?.force || !tab.dirty) {
      removeTab(tabId);
      return true;
    }
    if (!opts?.dialog) {
      // 防御降级：无 dialog 实例时用原生 confirm（确定=不保存关闭，取消=保留）
      if (window.confirm(`未保存的更改：${tab.title}。不保存并关闭？`)) {
        removeTab(tabId);
        return true;
      }
      return false;
    }
    const action = await askSaveDiscardCancel(tab.title, opts.dialog);
    if (action === "cancel") return false;
    if (action === "save") {
      const ok = await saveTab(tabId);
      if (!ok) return false;
    }
    removeTab(tabId);
    return true;
  }

  /** 保存全部标签（逐个；无路径走另存为）。返回是否全部成功。 */
  async function saveAllTabs(): Promise<boolean> {
    for (const tab of [...tabs.value]) {
      const ok = await saveTab(tab.id);
      if (!ok) return false;
    }
    return true;
  }

  /**
   * 窗口关闭前的合并确认（ARCH-2 §2.2 窗口关闭）：存在 dirty 标签时
   * 弹合并提示三选（保存全部 / 不保存 / 取消）。dialog 由组件层注入。
   * 返回是否允许关闭（true=允许）。「不保存」会丢弃全部 dirty 标签，
   * 以便调用方（MainView）二次 close 时直接通过。
   */
  async function confirmCloseAllDirty(dialog: DialogApi): Promise<boolean> {
    const dirtyTabs = tabs.value.filter((t) => t.dirty);
    if (dirtyTabs.length === 0) return true;
    return new Promise<boolean>((resolve) => {
      dialog.warning({
        title: "未保存的更改",
        content: `有 ${dirtyTabs.length} 个标签未保存，是否保存全部？`,
        positiveText: "保存全部",
        negativeText: "不保存",
        onPositiveClick: async () => {
          const ok = await saveAllTabs();
          resolve(ok);
        },
        onNegativeClick: () => {
          // 不保存：丢弃全部 dirty 标签（内容丢弃语义）
          for (const t of [...dirtyTabs]) removeTab(t.id);
          resolve(true);
        },
        onClose: () => resolve(false),
        onMaskClick: () => resolve(false),
      });
    });
  }

  return {
    tabs,
    activeTabId,
    activeTab,
    openTab,
    openPath,
    createUntitled,
    setActive,
    moveTab,
    setLanguage,
    updateContent,
    markSaved,
    saveTab,
    saveTabAs,
    openFilesViaDialog,
    closeTab,
    saveAllTabs,
    confirmCloseAllDirty,
  };
});
