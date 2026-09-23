function getFs() {
  if (typeof window !== "undefined") return null;
  try {
    const req = eval("require");
    return req("fs");
  } catch {
    return null;
  }
}

function getPath() {
  if (typeof window !== "undefined") return null;
  try {
    const req = eval("require");
    return req("path");
  } catch {
    return null;
  }
}

function getDataDir(): string {
  const path = getPath();
  if (!path) return "";
  return path.join(process.cwd(), "data");
}

/** Read a JSON data file, returning empty array if it doesn't exist */
export function readCollection<T>(collection: string): T[] {
  const fs = getFs();
  const path = getPath();
  if (!fs || !path) return [];
  const filePath = path.join(getDataDir(), `${collection}.json`);
  if (!fs.existsSync(filePath)) return [];
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T[];
  } catch {
    return [];
  }
}

/** Write the full array back to a JSON data file atomically using temporary renames */
export function writeCollection<T>(collection: string, data: T[]): void {
  const fs = getFs();
  const path = getPath();
  if (!fs || !path) return;
  const dataDir = getDataDir();
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const filePath = path.join(dataDir, `${collection}.json`);
  const tmpPath = `${filePath}.tmp`;
  try {
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), "utf-8");
    fs.renameSync(tmpPath, filePath);
  } catch (error) {
    if (fs.existsSync(tmpPath)) {
      try { fs.unlinkSync(tmpPath); } catch {}
    }
    throw error;
  }
}

/** Read a single settings JSON object (not an array) */
export function readSettings<T>(key: string): T | null {
  const fs = getFs();
  const path = getPath();
  if (!fs || !path) return null;
  const filePath = path.join(getDataDir(), `${key}.json`);
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
  } catch {
    return null;
  }
}

/** Write a single settings JSON object atomically using temporary renames */
export function writeSettings<T>(key: string, data: T): void {
  const fs = getFs();
  const path = getPath();
  if (!fs || !path) return;
  const dataDir = getDataDir();
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const filePath = path.join(dataDir, `${key}.json`);
  const tmpPath = `${filePath}.tmp`;
  try {
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), "utf-8");
    fs.renameSync(tmpPath, filePath);
  } catch (error) {
    if (fs.existsSync(tmpPath)) {
      try { fs.unlinkSync(tmpPath); } catch {}
    }
    throw error;
  }
}
