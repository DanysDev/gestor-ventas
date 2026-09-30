import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { StorageProvider, UploadResult, MulterFile } from './storage.interface.js';

@Injectable()
export class R2StorageProvider implements StorageProvider {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor(config: ConfigService) {
    const accountId = config.get<string>('R2_ACCOUNT_ID');
    const accessKeyId = config.get<string>('R2_ACCESS_KEY_ID');
    const secretAccessKey = config.get<string>('R2_SECRET_ACCESS_KEY');
    this.bucket = config.get<string>('R2_BUCKET_NAME') ?? '';
    this.publicUrl = config.get<string>('R2_PUBLIC_URL') ?? '';

    if (!accountId || !accessKeyId || !secretAccessKey || !this.bucket) {
      throw new Error(
        'R2 configuration incomplete. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME',
      );
    }

    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  async upload(key: string, buffer: Buffer, contentType: string): Promise<string> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      }),
    );
    return key;
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }

  getPublicUrl(key: string): string {
    if (this.publicUrl) {
      return `${this.publicUrl}/${key}`;
    }
    return `https://${this.bucket}.${this.publicUrl.replace('https://', '')}/${key}`;
  }

  async uploadFiles(
    files: MulterFile[],
    supplier: string,
    product?: string,
  ): Promise<UploadResult[]> {
    const supplierName = supplier.trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim() || 'Sin nombre';
    const productName = product ? product.trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim() : '';
    const relDir = productName ? `${supplierName}/${productName}` : supplierName;

    const saved: UploadResult[] = [];
    for (const file of files) {
      const name = file.originalname || `imagen-${Date.now()}.jpg`;
      const key = `${relDir}/${name}`;
      await this.upload(key, file.buffer, file.mimetype);
      saved.push({
        key,
        url: this.getPublicUrl(key),
        filename: name,
      });
    }
    return saved;
  }
}