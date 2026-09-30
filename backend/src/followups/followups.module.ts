import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Followup, FollowupSchema } from './followup.schema.js';
import { FollowupsService } from './followups.service.js';
import { FollowupsController } from './followups.controller.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Followup.name, schema: FollowupSchema }]),
  ],
  controllers: [FollowupsController],
  providers: [FollowupsService],
})
export class FollowupsModule {}