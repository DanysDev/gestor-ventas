import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type PublicationDocument = HydratedDocument<Publication>;

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class Publication {
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true, index: true })
  productId: Types.ObjectId;

  createdAt: Date;
}

export const PublicationSchema = SchemaFactory.createForClass(Publication);