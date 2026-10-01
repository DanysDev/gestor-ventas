import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UploadApiResponse, v2 as cloudinary } from 'cloudinary';
import {
  MulterFile,
  StorageProvider,
  UploadResult,
} from './storage.interface.js';

function cleanSegment(name: string, fallback: string): string {
  const cleaned = (name || '')
    .trim()
    .replace(/[<>:"/\\|?*#%+&]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || fallback;
}

@Injectable()
export class CloudinaryStorageProvider implements StorageProvider {
  constructor(config: ConfigService) {
    const cloudName = config.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = config.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = config.get<string>('CLOUDINARY_API_SECRET');
    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error(
        'Falta CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY o CLOUDINARY_API_SECRET',
      );
    }
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });
  }

  upload(key: string, buffer: Buffer, _contentType: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { public_id: key, resource_type: 'image' },
        (err, result: UploadApiResponse | undefined) => {
          if (err || !result) {
            reject(err ?? new Error('Cloudinary no devolvió respuesta'));
            return;
          }
          resolve(result.public_id);
        },
      );
      stream.end(buffer);
    });
  }

  async delete(key: string): Promise<void> {
    await cloudinary.uploader.destroy(key, { resource_type: 'image' });
  }

  getPublicUrl(key: string): string {
    if (/^https?:\/\//.test(key)) {
      return key;
    }
    return (
      cloudinary.url(key, { secure: true, resource_type: 'image' }) ?? key
    );
  }

  async uploadFiles(
    files: MulterFile[],
    supplier: string,
    product?: string,
  ): Promise<UploadResult[]> {
    const supplierName = cleanSegment(supplier, 'Sin nombre');
    const productName = product ? cleanSegment(product, '') : '';
    const folder = productName
      ? `gestor-ventas/${supplierName}/${productName}`
      : `gestor-ventas/${supplierName}`;

    const saved: UploadResult[] = [];
    for (const file of files) {
      const original = file.originalname || 'imagen.jpg';
      const dot = original.lastIndexOf('.');
      const base = cleanSegment(
        dot > 0 ? original.slice(0, dot) : original,
        'imagen',
      );
      const ext = dot > 0 ? original.slice(dot) : '.jpg';
      const stamp = Date.now().toString(36);
      const publicId = `${folder}/${base}-${stamp}${ext}`;
      const finalKey = await this.upload(publicId, file.buffer, file.mimetype);
      saved.push({
        key: finalKey,
        url: this.getPublicUrl(finalKey),
        filename: finalKey.split('/').pop() ?? original,
      });
    }
    return saved;
  }
}
