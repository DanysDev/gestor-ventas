import { Module, Global, DynamicModule } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LocalStorageProvider } from './local-storage.provider.js';
import { R2StorageProvider } from './r2-storage.provider.js';
import { StorageProvider, STORAGE_PROVIDER_TOKEN } from './storage.interface.js';

@Global()
@Module({})
export class StorageModule {
  static register(): DynamicModule {
    return {
      module: StorageModule,
      providers: [
        {
          provide: STORAGE_PROVIDER_TOKEN,
          useFactory: (config: ConfigService): StorageProvider => {
            const useR2 = config.get<string>('R2_ACCOUNT_ID') &&
              config.get<string>('R2_ACCESS_KEY_ID') &&
              config.get<string>('R2_SECRET_ACCESS_KEY') &&
              config.get<string>('R2_BUCKET_NAME');
            if (useR2) {
              return new R2StorageProvider(config);
            }
            return new LocalStorageProvider(config);
          },
          inject: [ConfigService],
        },
      ],
      exports: [STORAGE_PROVIDER_TOKEN],
    };
  }
}