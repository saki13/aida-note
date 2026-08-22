/**
 * draftService：自动保存 / 崩溃恢复草稿（SIS-FUNC-10）
 *
 * 依 ARCH-2 契约 #7（固定草稿目录 + 崩溃恢复流程）：
 *  - 脏标签防抖写草稿（仅脏标签，草稿不替代手动保存）
 *  - 启动扫描残留草稿（过期残留清理，7 天）-> 弹窗恢复/丢弃（恢复/丢弃后均清理）
 *  - 正常退出清理（MainView onCloseRequested destroy 前调用 clearAll）
 *
 * 存储双实现：Tauri 用 appDataDir/drafts（真实文件）；浏览器（前端自测）用 localStorage
 * 模拟同一接口，保证全前端自测链路可验证（decision-020 同款分流思路）。
 */

export interface DraftRecord {
  /** 草稿标识：有路径用绝对路径；未命名标签用 __untitled_<title> */
  key: string;
  /** 展示标题（文件 basename 或未命名标题） */
  title: string;
  content: string;
  updatedAt: number;
}

const LS_KEY = "aida-note-drafts";
/** 草稿过期判定：7 天（SIS-FUNC-10 允许调过期时长） */
const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
/** 防抖阈值：停止输入后 500ms 写草稿 */
export const DRAFT_DEBOUNCE_MS = 500;

function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

/** 草稿目录路径（Tauri appDataDir/drafts）。 */
async function draftDir(): Promise<string> {
  const { appDataDir, join } = await import("@tauri-apps/api/path");
  return join(await appDataDir(), "drafts");
}

// ---- 存储读写（Tauri 文件 / 浏览器 localStorage 双实现） ----

async function readAll(): Promise<Record<string, DraftRecord>> {
  if (isTauri()) {
    try {
      const { readTextFile, mkdir } = await import("@tauri-apps/plugin-fs");
      const dir = await draftDir();
      await mkdir(dir, { recursive: true }).catch(() => undefined);
      // 逐草稿文件读取（文件名 = key 的 URL 编码）
      const { readDir } = await import("@tauri-apps/plugin-fs");
      const entries = await readDir(dir);
      const out: Record<string, DraftRecord> = {};
      for (const e of entries) {
        if (!e.name) continue;
        try {
          const raw = await readTextFile(`${dir}/${e.name}`);
          const rec = JSON.parse(raw) as DraftRecord;
          out[rec.key] = rec;
        } catch {
          // 损坏草稿忽略
        }
      }
      return out;
    } catch {
      return {};
    }
  }
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, DraftRecord>) : {};
  } catch {
    return {};
  }
}

async function writeAll(map: Record<string, DraftRecord>): Promise<void> {
  if (isTauri()) {
    try {
      const { writeTextFile, mkdir, remove, readDir } = await import("@tauri-apps/plugin-fs");
      const dir = await draftDir();
      await mkdir(dir, { recursive: true }).catch(() => undefined);
      // 清空目录后重写（简单可靠：草稿量小）
      const entries = await readDir(dir);
      for (const e of entries) {
        if (e.name) await remove(`${dir}/${e.name}`).catch(() => undefined);
      }
      for (const rec of Object.values(map)) {
        await writeTextFile(`${dir}/${encodeURIComponent(rec.key)}.json`, JSON.stringify(rec));
      }
    } catch {
      // 写草稿失败静默（不阻塞编辑；下次防抖重试）
    }
  } else {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(map));
    } catch {
      // 同上
    }
  }
}

// ---- 防抖调度（唯一写入口） ----

const timers = new Map<string, ReturnType<typeof setTimeout>>();

/** 防抖写草稿：stop 后 500ms 落盘；已保存（非脏）不写。 */
export function scheduleDraft(key: string, tab: { title: string; content: string; dirty: boolean }): void {
  if (!tab.dirty) return; // 仅脏标签（SIS-FUNC-10 硬约束）
  const existing = timers.get(key);
  if (existing) clearTimeout(existing);
  timers.set(
    key,
    setTimeout(() => {
      timers.delete(key);
      void (async () => {
        const map = await readAll();
        map[key] = { key, title: tab.title, content: tab.content, updatedAt: Date.now() };
        await writeAll(map);
      })();
    }, DRAFT_DEBOUNCE_MS),
  );
}

/** 取消挂起的防抖写（保存/关闭标签时） */
export function cancelScheduled(key: string): void {
  const t = timers.get(key);
  if (t) {
    clearTimeout(t);
    timers.delete(key);
  }
}

// ---- 生命周期 ----

/** 启动扫描：清理过期残留，返回有效残留草稿（最新在前）。 */
export async function checkRecover(): Promise<DraftRecord[]> {
  const map = await readAll();
  const now = Date.now();
  const expired: string[] = [];
  const alive: DraftRecord[] = [];
  for (const [key, rec] of Object.entries(map)) {
    if (now - rec.updatedAt > DRAFT_TTL_MS) {
      expired.push(key);
    } else {
      alive.push(rec);
    }
  }
  if (expired.length) {
    for (const k of expired) delete map[k];
    await writeAll(map); // 过期残留清理（不留碎片）
  }
  return alive.sort((a, b) => b.updatedAt - a.updatedAt);
}

/** 删除单个草稿（恢复/丢弃后清理）。 */
export async function removeDraft(key: string): Promise<void> {
  const map = await readAll();
  if (!(key in map)) return;
  delete map[key];
  await writeAll(map);
}

/** 清空全部草稿（正常退出清理）。 */
export async function clearAllDrafts(): Promise<void> {
  await writeAll({});
}
