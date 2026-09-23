import { StorageProvider, UploadFileOptions, UploadResult } from "./provider";

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

export class LocalStorageProvider implements StorageProvider {
  private getUploadDir(): string {
    const path = getPath();
    if (!path) return "";
    return path.join(process.cwd(), "public", "uploads");
  }

  constructor() {
    const fs = getFs();
    const uploadDir = this.getUploadDir();
    if (fs && uploadDir && !fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
  }

  async uploadFile(options: UploadFileOptions): Promise<UploadResult> {
    const fs = getFs();
    const path = getPath();
    const uploadDir = this.getUploadDir();
    if (!fs || !path || !uploadDir) {
      throw new Error("Local storage provider is only available in Node server environment.");
    }

    const targetFolder = options.folder ? path.join(uploadDir, options.folder) : uploadDir;
    if (!fs.existsSync(targetFolder)) {
      fs.mkdirSync(targetFolder, { recursive: true });
    }

    const safeFilename = `${Date.now()}-${options.filename.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const filePath = path.join(targetFolder, safeFilename);

    fs.writeFileSync(filePath, options.buffer);

    const relativeUrl = options.folder
      ? `/uploads/${options.folder}/${safeFilename}`
      : `/uploads/${safeFilename}`;

    return {
      url: relativeUrl,
      path: filePath,
      size: options.buffer.length,
      mimeType: options.mimeType
    };
  }

  async deleteFile(pathOrUrl: string): Promise<boolean> {
    const fs = getFs();
    const path = getPath();
    if (!fs || !path) return false;

    try {
      const cleanPath = pathOrUrl.startsWith("/uploads/")
        ? path.join(process.cwd(), "public", pathOrUrl)
        : pathOrUrl;

      if (fs.existsSync(cleanPath)) {
        fs.unlinkSync(cleanPath);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }
}

export const storageProvider: StorageProvider = new LocalStorageProvider();
