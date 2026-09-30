import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Followup, FollowupDocument, FollowupStatus } from './followup.schema.js';
import { CreateFollowupDto, UpdateFollowupDto } from './dto/followup.dto.js';

const ORDER: Record<FollowupStatus, number> = { pending: 0, contacted: 1, done: 2 };

@Injectable()
export class FollowupsService {
  constructor(
    @InjectModel(Followup.name)
    private readonly followupModel: Model<FollowupDocument>,
  ) {}

  async findAll(): Promise<FollowupDocument[]> {
    const docs = await this.followupModel.find().exec();
    const ts = (d: FollowupDocument) =>
      Number(new Date(String((d as unknown as { createdAt?: Date }).createdAt ?? 0)));
    docs.sort(
      (a, b) =>
        ORDER[a.status] - ORDER[b.status] ||
        (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999') ||
        ts(b) - ts(a),
    );
    return docs;
  }

  async create(dto: CreateFollowupDto): Promise<FollowupDocument> {
    return this.followupModel.create(dto);
  }

  async update(id: string, dto: UpdateFollowupDto): Promise<FollowupDocument> {
    const updated = await this.followupModel
      .findByIdAndUpdate(id, dto, { new: true })
      .exec();
    if (!updated) {
      throw new NotFoundException(`Seguimiento ${id} no encontrado`);
    }
    return updated;
  }

  async remove(id: string): Promise<void> {
    const result = await this.followupModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Seguimiento ${id} no encontrado`);
    }
  }
}