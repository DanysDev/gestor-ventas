import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ScamDocument = HydratedDocument<Scam>;

@Schema({ timestamps: true })
export class Scam {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ trim: true })
  phone: string;

  @Prop({ trim: true })
  address: string;

  @Prop({ trim: true })
  notes: string;
}

export const ScamSchema = SchemaFactory.createForClass(Scam);