import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Scam, ScamDocument } from './scam.schema.js';
import { CreateScamDto, UpdateScamDto } from './dto/scam.dto.js';

@Injectable()
export class ScamsService {
  constructor(
    @InjectModel(Scam.name) private readonly scamModel: Model<ScamDocument>,
  ) {}

  async findAll(): Promise<ScamDocument[]> {
    return this.scamModel.find().sort({ createdAt: -1 }).exec();
  }

  async create(dto: CreateScamDto): Promise<ScamDocument> {
    return this.scamModel.create(dto);
  }

  async update(id: string, dto: UpdateScamDto): Promise<ScamDocument> {
    const updated = await this.scamModel
      .findByIdAndUpdate(id, dto, { new: true })
      .exec();
    if (!updated) {
      throw new NotFoundException(`Contacto ${id} no encontrado`);
    }
    return updated;
  }

  async remove(id: string): Promise<void> {
    const result = await this.scamModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Contacto ${id} no encontrado`);
    }
  }
}