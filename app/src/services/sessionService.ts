/**
 * sessionService：上次文件标签恢复（SIS-OPT-6）
 *
 * 会话快照 = 正常退出时写入的标签清单（已保存文件路径 + 未保存标签全文），
 * 启动时检测快照 -> 弹「恢复上次会话」确认 -> 恢复/丢弃。
 * 与草稿机制（SIS-FUNC-10 异常退出崩溃恢复）互斥共存：正常退出写快照，
 * 异常退出仍走草稿；启动时快照优先，无快照再走草稿检查。
 *
 * 存储双实现：Tauri 用 appDataDir/session.json（真实文件）；浏览器用 localStorage。
 */

export interface SessionTab {
  /** 已保存文件：绝对路径（恢复时重新 readFile 打开） */
  path?: string;
  /** 未保存标签：标题 + 全文回填置脏 */
  id?: string;
  title?: string;
  content?: string;
}

export interface SessionSnapshot {
  tabs: SessionTab[];
  ts: number;
}

const LS_KEY = "aida-note-session";
const FILE_NAME = "session.json";

function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

async function sessionDir(): Promise<string> {
  const { appDataDir, join } = await import("@tauri-apps/api/path");
  return join(await appDataDir(), "session");
}

/** 读取会话快照（无/损坏返回 null）。 */
export async function loadSession(): Promise<SessionSnapshot | null> {
  if (isTauri()) {
    try {
      const { readTextFile } = await import("@tauri-apps/plugin-fs");
      const raw = await readTextFile(`${await sessionDir()}/${FILE_NAME}`);
      const snap = JSON.parse(raw) as SessionSnapshot;
      return Array.isArray(snap.tabs) ? snap : null;
    } catch {
      return null;
    }
  }
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const snap = JSON.parse(raw) as SessionSnapshot;
    return Array.isArray(snap.tabs) ? snap : null;
  } catch {
    return null;
  }
}

/** 写入会话快照（正常退出时调用）。 */
export async function saveSession(snapshot: SessionSnapshot): Promise<void> {
  if (isTauri()) {
    try {
      const { writeTextFile, mkdir } = await import("@tauri-apps/plugin-fs");
      const dir = await sessionDir();
      await mkdir(dir, { recursive: true }).catch(() => undefined);
      await writeTextFile(`${dir}/${FILE_NAME}`, JSON.stringify(snapshot));
    } catch {
      // 快照写入失败静默（不阻塞退出）
    }
  } else {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(snapshot));
    } catch {
      // 同上
    }
  }
}

/** 清空会话快照（恢复/丢弃后调用）。 */
export async function clearSession(): Promise<void> {
  if (isTauri()) {
    try {
      const { remove } = await import("@tauri-apps/plugin-fs");
      await remove(`${await sessionDir()}/${FILE_NAME}`).catch(() => undefined);
    } catch {
      // 忽略
    }
  } else {
    try {
      localStorage.removeItem(LS_KEY);
    } catch {
      // 忽略
    }
  }
}
