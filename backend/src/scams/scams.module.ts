import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Scam, ScamSchema } from './scam.schema.js';
import { ScamsService } from './scams.service.js';
import { ScamsController } from './scams.controller.js';

@Module({
  imports: [MongooseModule.forFeature([{ name: Scam.name, schema: ScamSchema }])],
  controllers: [ScamsController],
  providers: [ScamsService],
})
export class ScamsModule {}