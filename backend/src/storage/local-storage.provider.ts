import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import * as fss from 'node:fs';
import { StorageProvider, UploadResult, MulterFile } from './storage.interface.js';

function expandHome(dir: string): string {
  if (dir === '~' || dir.startsWith('~/')) {
    return path.join(process.env.HOME ?? '', dir.slice(1));
  }
  return dir;
}

function sanitizeFolder(name: string): string {
  return name.trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim() || 'Sin nombre';
}

function safeName(original: string): string {
  const name = (original || '').replace(/[<>:"/\\|?*\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim();
  return name || `imagen-${Date.now()}.jpg`;
}

@Injectable()
export class LocalStorageProvider implements StorageProvider {
  private readonly root: string;
  private readonly publicUrl: string;

  constructor(config: ConfigService) {
    this.root = path.resolve(
      expandHome(config.get<string>('IMAGES_DIR') ?? path.join(process.env.HOME ?? '', 'Gestion de ventas')),
    );
    this.publicUrl = config.get<string>('R2_PUBLIC_URL') ?? '';
  }

  async upload(key: string, buffer: Buffer, contentType: string): Promise<string> {
    const absPath = path.join(this.root, key);
    const dir = path.dirname(absPath);
    await fs.mkdir(dir, { recursive: true });

    let name = path.basename(key);
    let n = 1;
    while (fss.existsSync(absPath)) {
      const ext = path.extname(name);
      const base = path.basename(name, ext);
      name = `${base} (${n++})${ext}`;
    }
    const finalPath = path.join(dir, name);
    await fs.writeFile(finalPath, buffer);
    return path.relative(this.root, finalPath).replace(/\\/g, '/');
  }

  async delete(key: string): Promise<void> {
    const absPath = path.join(this.root, key);
    try {
      await fs.unlink(absPath);
    } catch {
      // ignore if not exists
    }
  }

  getPublicUrl(key: string): string {
    if (this.publicUrl) {
      return `${this.publicUrl}/${key}`;
    }
    return `/api/assets/${key}`;
  }

  async uploadFiles(
    files: MulterFile[],
    supplier: string,
    product?: string,
  ): Promise<UploadResult[]> {
    const supplierName = sanitizeFolder(supplier);
    const productName = product ? sanitizeFolder(product) : '';
    const relDir = productName ? `${supplierName}/${productName}` : supplierName;

    const saved: UploadResult[] = [];
    for (const file of files) {
      const name = safeName(file.originalname);
      const key = `${relDir}/${name}`;
      const finalKey = await this.upload(key, file.buffer, file.mimetype);
      saved.push({
        key: finalKey,
        url: this.getPublicUrl(finalKey),
        filename: path.basename(finalKey),
      });
    }
    return saved;
  }
}