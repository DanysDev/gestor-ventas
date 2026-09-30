import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller.js';
import { StorageModule } from '../storage/storage.module.js';

@Module({
  imports: [StorageModule.register()],
  controllers: [UploadsController],
})
export class UploadsModule {}