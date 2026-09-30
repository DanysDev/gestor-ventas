import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Product, ProductSchema } from '../products/product.schema.js';
import { Sale, SaleSchema } from '../sales/sale.schema.js';
import { Supplier, SupplierSchema } from '../suppliers/supplier.schema.js';
import { Publication, PublicationSchema } from '../publications/publication.schema.js';
import { ReportsService } from './reports.service.js';
import { ReportsController } from './reports.controller.js';
import { PublicationsModule } from '../publications/publications.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: Sale.name, schema: SaleSchema },
      { name: Supplier.name, schema: SupplierSchema },
      { name: Publication.name, schema: PublicationSchema },
    ]),
    PublicationsModule,
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}