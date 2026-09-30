import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ProductDocument = HydratedDocument<Product>;

export type CommissionType = 'fixed' | 'percent' | 'margin';
export type CommissionQtyType = 'none' | 'fixed' | 'percent';
export type CommissionCurrency = 'USD' | 'CUP';
export type ProductStatus = 'active' | 'sold' | 'hidden';

export class ProductImage {
  path: string;
  filename: string;
  constructor(path: string, filename: string) {
    this.path = path;
    this.filename = filename;
  }
}

@Schema({ timestamps: true })
export class Product {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ default: '' })
  description: string;

  @Prop({ default: '' })
  sizes: string;

  @Prop({ required: true, min: 0 })
  price: number;

  @Prop({ enum: ['fixed', 'percent', 'margin'], default: 'fixed' })
  commissionType: CommissionType;

  @Prop({ min: 0, default: 0 })
  supplierPrice: number;

  @Prop({ required: true, min: 0, default: 0 })
  commissionValue: number;

  @Prop({ enum: ['USD', 'CUP'], default: 'USD' })
  commissionCurrency: CommissionCurrency;

  @Prop({ enum: ['none', 'fixed', 'percent'], default: 'none' })
  commissionQtyType: CommissionQtyType;

  @Prop({ required: true, min: 0, default: 0 })
  commissionQtyValue: number;

  @Prop({ required: true, min: 0, default: 0 })
  commissionQtyMin: number;

  @Prop({ type: [{ path: String, filename: String }], default: [] })
  images: ProductImage[];

  @Prop({ type: Types.ObjectId, ref: 'Supplier', required: true, index: true })
  supplierId: Types.ObjectId;

  @Prop({ enum: ['active', 'sold', 'hidden'], default: 'active' })
  status: ProductStatus;

  @Prop({ default: 0 })
  publicationsCount: number;

  @Prop()
  lastPublishedAt: Date;
}

export const ProductSchema = SchemaFactory.createForClass(Product);