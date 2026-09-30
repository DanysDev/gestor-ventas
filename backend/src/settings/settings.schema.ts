import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SettingsDocument = HydratedDocument<Settings>;

@Schema({ timestamps: true })
export class Settings {
  @Prop({ trim: true, default: '' })
  contactLink: string;

  @Prop({ trim: true, default: 'USD' })
  currency: string;

  @Prop({ trim: true, default: 'Gestor' })
  gestor: string;

  @Prop({ trim: true, default: '' })
  gestorPhone: string;

  @Prop({ trim: true, default: '' })
  pin: string;
}

export const SettingsSchema = SchemaFactory.createForClass(Settings);