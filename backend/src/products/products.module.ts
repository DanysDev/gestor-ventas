import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Product, ProductSchema } from './product.schema.js';
import { Supplier, SupplierSchema } from '../suppliers/supplier.schema.js';
import { ProductsService } from './products.service.js';
import { ProductsController } from './products.controller.js';
import { PublicationsModule } from '../publications/publications.module.js';
import { SettingsModule } from '../settings/settings.module.js';
import { StorageModule } from '../storage/storage.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: Supplier.name, schema: SupplierSchema },
    ]),
    PublicationsModule,
    SettingsModule,
    StorageModule.register(),
  ],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}