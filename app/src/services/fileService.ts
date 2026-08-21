/**
 * fileService：文件系统能力封装（SIS-FUNC-1）
 *
 * 依据 ARCH-1 契约表 #1-4：dialog.open / dialog.save / fs.readTextFile / fs.writeTextFile。
 * 前端（stores/components）不得绕过本服务直接调用 Tauri 插件 API。
 * 编码契约见 ARCH-2 §3：UTF-8 读取 + BOM 检测剥离，写回时原样补回。
 */

import { open as dialogOpen, save as dialogSave } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";

export interface ReadFileResult {
  content: string;
  /** 原文件是否带 UTF-8 BOM（写回时需补回） */
  hadBom: boolean;
}

/**
 * 打开文件对话框（可多选）。返回选中的绝对路径数组；取消返回空数组。
 */
export async function pickFiles(): Promise<string[]> {
  const selected = await dialogOpen({
    multiple: true,
    title: "打开文件",
  });
  if (selected === null) return [];
  return Array.isArray(selected) ? selected : [selected];
}

/**
 * 另存为对话框。返回目标绝对路径；取消返回 null。
 */
export async function pickSavePath(defaultFileName?: string): Promise<string | null> {
  return await dialogSave({
    title: "另存为",
    defaultPath: defaultFileName,
  });
}

/**
 * 读文本文件（UTF-8 + BOM 检测剥离，ARCH-2 §3.1）。
 */
export async function readFile(path: string): Promise<ReadFileResult> {
  const raw = await readTextFile(path);
  if (raw.startsWith("\uFEFF")) {
    return { content: raw.slice(1), hadBom: true };
  }
  return { content: raw, hadBom: false };
}

/**
 * 写文本文件（默认 UTF-8；原文件带 BOM 则补回，ARCH-2 §3.2）。
 */
export async function writeFile(path: string, content: string, hadBom = false): Promise<void> {
  await writeTextFile(path, hadBom ? `\uFEFF${content}` : content);
}

/** 取路径的文件名（basename） */
export function basename(path: string): string {
  const parts = path.split(/[\\/]/);
  return parts[parts.length - 1] || path;
}
