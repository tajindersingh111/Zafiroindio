import fs from "fs";
import path from "path";

function getDataDir(): string {
  return path.join(process.cwd(), "data");
}

/** Legacy JSON readCollection helper (for admin endpoints) */
export function readCollection<T>(collection: string): T[] {
  try {
    const filePath = path.join(getDataDir(), `${collection}.json`);
    if (!fs.existsSync(filePath)) return [];
    return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T[];
  } catch {
    return [];
  }
}

/** Legacy JSON writeCollection helper (for admin endpoints) */
export function writeCollection<T>(collection: string, data: T[]): void {
  try {
    const dataDir = getDataDir();
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const filePath = path.join(dataDir, `${collection}.json`);
    const tmpPath = `${filePath}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), "utf-8");
    fs.renameSync(tmpPath, filePath);
  } catch (error) {
    console.warn(`Legacy writeCollection error for ${collection}:`, error);
  }
}

/** Legacy JSON readSettings helper */
export function readSettings<T>(key: string): T | null {
  try {
    const filePath = path.join(getDataDir(), `${key}.json`);
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
  } catch {
    return null;
  }
}

/** Legacy JSON writeSettings helper */
export function writeSettings<T>(key: string, data: T): void {
  try {
    const dataDir = getDataDir();
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const filePath = path.join(dataDir, `${key}.json`);
    const tmpPath = `${filePath}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), "utf-8");
    fs.renameSync(tmpPath, filePath);
  } catch (error) {
    console.warn(`Legacy writeSettings error for ${key}:`, error);
  }
}
