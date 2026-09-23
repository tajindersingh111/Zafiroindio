export interface UploadFileOptions {
  filename: string;
  buffer: Buffer;
  mimeType: string;
  folder?: string;
}

export interface UploadResult {
  url: string;
  path: string;
  size: number;
  mimeType: string;
}

export interface StorageProvider {
  uploadFile(options: UploadFileOptions): Promise<UploadResult>;
  deleteFile(pathOrUrl: string): Promise<boolean>;
}
