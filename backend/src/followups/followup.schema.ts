import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type FollowupDocument = HydratedDocument<Followup>;

export const FOLLOWUP_STATUSES = ['pending', 'contacted', 'done'] as const;
export type FollowupStatus = (typeof FOLLOWUP_STATUSES)[number];

@Schema({ timestamps: true })
export class Followup {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ trim: true })
  phone: string;

  @Prop({ trim: true })
  reason: string;

  @Prop({ enum: FOLLOWUP_STATUSES, default: 'pending' })
  status: FollowupStatus;

  @Prop({ trim: true })
  dueDate: string;

  @Prop({ trim: true })
  notes: string;
}

export const FollowupSchema = SchemaFactory.createForClass(Followup);