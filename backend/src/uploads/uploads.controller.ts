import { BadRequestException, Body, Controller, Inject, Post, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import type { StorageProvider } from '../storage/storage.interface.js';
import { STORAGE_PROVIDER_TOKEN } from '../storage/storage.interface.js';
import { MulterFile } from '../storage/storage.interface.js';

@Controller('uploads')
export class UploadsController {
  constructor(@Inject(STORAGE_PROVIDER_TOKEN) private readonly storage: StorageProvider) {}

  @Post()
  @UseInterceptors(FilesInterceptor('files', 20))
  async upload(
    @UploadedFiles() files: MulterFile[] | undefined,
    @Body() body: Record<string, string>,
  ) {
    if (!files?.length) {
      throw new BadRequestException('Selecciona al menos una imagen');
    }
    const supplier = body['supplier'] ?? '';
    const product = body['product'] ?? '';
    const saved = await this.storage.uploadFiles(files, supplier, product);
    return saved.map((s: { key: string; filename: string; url: string }) => ({ path: s.key, filename: s.filename, url: s.url }));
  }
}
