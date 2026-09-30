import { Body, Controller, Post } from '@nestjs/common';
import { ImportDataService } from './import-data.service.js';

@Controller('import')
export class ImportDataController {
  constructor(private readonly importDataService: ImportDataService) {}

  @Post('scan')
  scan(@Body() body?: { dir?: string }) {
    return this.importDataService.scan(body?.dir ?? defaultImagesDir());
  }
}

function defaultImagesDir(): string {
  return (process.env.HOME ?? '') + '/Gestion de ventas';
}