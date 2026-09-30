export interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

export interface StorageProvider {
  upload(key: string, buffer: Buffer, contentType: string): Promise<string>;
  delete(key: string): Promise<void>;
  getPublicUrl(key: string): string;
  uploadFiles(files: MulterFile[], supplier: string, product?: string): Promise<UploadResult[]>;
}

export interface UploadResult {
  key: string;
  url: string;
  filename: string;
}

export const STORAGE_PROVIDER_TOKEN = 'STORAGE_PROVIDER';