import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type SaleDocument = HydratedDocument<Sale>;

export type DeliveryType = 'mensajeria' | 'recogida';
export type SaleStatus = 'pending' | 'paid' | 'cancelled';

@Schema({ timestamps: true })
export class Sale {
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true, index: true })
  productId: Types.ObjectId;

  @Prop({ trim: true })
  clientName: string;

  @Prop({ trim: true })
  clientPhone: string;

  @Prop({ trim: true })
  address: string;

  @Prop({ trim: true })
  municipality: string;

  @Prop({ required: true, min: 1, default: 1 })
  quantity: number;

  @Prop({ required: true, min: 0 })
  salePrice: number;

  @Prop({ required: true, min: 0, default: 0 })
  commission: number;

  @Prop({ enum: ['USD', 'CUP'], default: 'USD' })
  commissionCurrency: 'USD' | 'CUP';

  @Prop({ enum: ['mensajeria', 'recogida'], default: 'mensajeria' })
  deliveryType: DeliveryType;

  @Prop({ min: 0, default: 0 })
  deliveryCost: number;

  @Prop({ trim: true })
  paymentMethod: string;

  @Prop({ required: true, default: () => new Date() })
  saleDate: Date;

  @Prop({ trim: true })
  gestor: string;

  @Prop({ trim: true })
  gestorPhone: string;

  @Prop({ trim: true })
  observations: string;

  @Prop({ enum: ['pending', 'paid', 'cancelled'], default: 'pending' })
  status: SaleStatus;
}

export const SaleSchema = SchemaFactory.createForClass(Sale);