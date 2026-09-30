import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Product, ProductSchema } from '../products/product.schema.js';
import { Sale, SaleSchema } from '../sales/sale.schema.js';
import { Followup, FollowupSchema } from '../followups/followup.schema.js';
import {
  NotificationSeen,
  NotificationSeenSchema,
} from './notif-seen.schema.js';
import { NotificationsService } from './notifications.service.js';
import { NotificationsController } from './notifications.controller.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: Sale.name, schema: SaleSchema },
      { name: Followup.name, schema: FollowupSchema },
      { name: NotificationSeen.name, schema: NotificationSeenSchema },
    ]),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
})
export class NotificationsModule {}