import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SupplierDocument = HydratedDocument<Supplier>;

@Schema({ timestamps: true })
export class Supplier {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ trim: true })
  contact: string;

  @Prop({ trim: true })
  notes: string;

  @Prop({ trim: true })
  voucherPickup: string;

  @Prop({ trim: true })
  voucherDelivery: string;
}

export const SupplierSchema = SchemaFactory.createForClass(Supplier);