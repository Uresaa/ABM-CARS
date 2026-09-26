import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const SAVE_DELAY_MS = 5 * 60 * 1000;

export function createPersistentStore({ name, path, serialize, deserialize }) {
  let dirty = false;
  let saving = false;
  let saveTimer = null;

  async function load() {
    try {
      deserialize(JSON.parse(await readFile(path, "utf8")));
      return true;
    } catch {
      return false;
    }
  }

  async function save() {
    if (!dirty || saving) return;

    saving = true;
    dirty = false;

    try {
      await mkdir(dirname(path), { recursive: true });
      await writeFile(`${path}.tmp`, JSON.stringify(serialize()), "utf8");
      await rename(`${path}.tmp`, path);
    } catch (error) {
      dirty = true;
      console.error("Store save failed", { name, message: error?.message });
    } finally {
      saving = false;
    }
  }

  function markDirty() {
    dirty = true;
    if (saveTimer) return;

    saveTimer = setTimeout(() => {
      saveTimer = null;
      save();
    }, SAVE_DELAY_MS);
    saveTimer.unref?.();
  }

  return { load, save, markDirty };
}
