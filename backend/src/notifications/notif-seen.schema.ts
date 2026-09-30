import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type NotificationSeenDocument = HydratedDocument<NotificationSeen>;

const SEEN_TTL_SECONDS = 180 * 24 * 60 * 60;

@Schema({ timestamps: false, collection: 'notif_seen' })
export class NotificationSeen {
  @Prop({ required: true, trim: true })
  key: string;

  @Prop({ required: true, default: 'owner', index: true })
  bucket: string;

  @Prop({ type: Date, default: Date.now, expires: SEEN_TTL_SECONDS })
  seenAt: Date;
}

export const NotificationSeenSchema = SchemaFactory.createForClass(NotificationSeen);
NotificationSeenSchema.index({ bucket: 1, key: 1 }, { unique: true });