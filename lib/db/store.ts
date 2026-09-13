import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync, unlinkSync } from "fs";
import { join } from "path";

const DATA_DIR = join(process.cwd(), "data");

// Ensure data directory exists
if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

/** Read a JSON data file, returning empty array if it doesn't exist */
export function readCollection<T>(collection: string): T[] {
  const filePath = join(DATA_DIR, `${collection}.json`);
  if (!existsSync(filePath)) return [];
  try {
    return JSON.parse(readFileSync(filePath, "utf-8")) as T[];
  } catch {
    return [];
  }
}

/** Write the full array back to a JSON data file atomically using temporary renames */
export function writeCollection<T>(collection: string, data: T[]): void {
  const filePath = join(DATA_DIR, `${collection}.json`);
  const tmpPath = `${filePath}.tmp`;
  try {
    writeFileSync(tmpPath, JSON.stringify(data, null, 2), "utf-8");
    renameSync(tmpPath, filePath);
  } catch (error) {
    if (existsSync(tmpPath)) {
      try { unlinkSync(tmpPath); } catch {}
    }
    throw error;
  }
}

/** Read a single settings JSON object (not an array) */
export function readSettings<T>(key: string): T | null {
  const filePath = join(DATA_DIR, `${key}.json`);
  if (!existsSync(filePath)) return null;
  try {
    return JSON.parse(readFileSync(filePath, "utf-8")) as T;
  } catch {
    return null;
  }
}

/** Write a single settings JSON object atomically using temporary renames */
export function writeSettings<T>(key: string, data: T): void {
  const filePath = join(DATA_DIR, `${key}.json`);
  const tmpPath = `${filePath}.tmp`;
  try {
    writeFileSync(tmpPath, JSON.stringify(data, null, 2), "utf-8");
    renameSync(tmpPath, filePath);
  } catch (error) {
    if (existsSync(tmpPath)) {
      try { unlinkSync(tmpPath); } catch {}
    }
    throw error;
  }
}
