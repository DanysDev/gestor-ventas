import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Supplier, SupplierSchema } from '../suppliers/supplier.schema.js';
import { Product, ProductSchema } from '../products/product.schema.js';
import { ImportDataService } from './import-data.service.js';
import { ImportDataController } from './import-data.controller.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Supplier.name, schema: SupplierSchema },
      { name: Product.name, schema: ProductSchema },
    ]),
  ],
  controllers: [ImportDataController],
  providers: [ImportDataService],
})
export class ImportDataModule {}