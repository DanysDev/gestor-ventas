import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Sale, SaleSchema } from './sale.schema.js';
import { Product, ProductSchema } from '../products/product.schema.js';
import { Supplier, SupplierSchema } from '../suppliers/supplier.schema.js';
import { SalesService } from './sales.service.js';
import { SalesController } from './sales.controller.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Sale.name, schema: SaleSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Supplier.name, schema: SupplierSchema },
    ]),
  ],
  controllers: [SalesController],
  providers: [SalesService],
  exports: [SalesService],
})
export class SalesModule {}