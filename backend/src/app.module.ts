import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { SuppliersModule } from './suppliers/suppliers.module.js';
import { ProductsModule } from './products/products.module.js';
import { PublicationsModule } from './publications/publications.module.js';
import { SalesModule } from './sales/sales.module.js';
import { ReportsModule } from './reports/reports.module.js';
import { SettingsModule } from './settings/settings.module.js';
import { Settings, SettingsSchema } from './settings/settings.schema.js';
import { PinMiddleware } from './settings/pin.middleware.js';
import { AssetsModule } from './assets/assets.module.js';
import { ImportDataModule } from './import-data/import-data.module.js';
import { UploadsModule } from './uploads/uploads.module.js';
import { ScamsModule } from './scams/scams.module.js';
import { FollowupsModule } from './followups/followups.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri:
          config.get<string>('MONGODB_URI') ??
          'mongodb://127.0.0.1:27017/gestor_ventas',
      }),
    }),
    MongooseModule.forFeature([
      { name: Settings.name, schema: SettingsSchema },
    ]),
    SuppliersModule,
    ProductsModule,
    PublicationsModule,
    SalesModule,
    ReportsModule,
    SettingsModule,
    AssetsModule.register(),
    ImportDataModule,
    UploadsModule,
    ScamsModule,
    FollowupsModule,
    NotificationsModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(PinMiddleware)
      .exclude('settings', 'assets', 'assets/{*wildcard}')
      .forRoutes('*');
  }
}