import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Publication, PublicationDocument } from './publication.schema.js';

@Injectable()
export class PublicationsService {
  constructor(
    @InjectModel(Publication.name)
    private readonly publicationModel: Model<PublicationDocument>,
  ) {}

  async create(productId: string): Promise<PublicationDocument> {
    return this.publicationModel.create({
      productId: new Types.ObjectId(productId),
    });
  }

  async listByProduct(productId: string): Promise<PublicationDocument[]> {
    return this.publicationModel
      .find({ productId: new Types.ObjectId(productId) })
      .sort({ createdAt: -1 })
      .limit(50)
      .exec();
  }

  async countByProductMap(productIds: Types.ObjectId[]): Promise<Map<string, number>> {
    if (productIds.length === 0) {
      return new Map();
    }
    const rows = await this.publicationModel.aggregate<{
      _id: Types.ObjectId;
      count: number;
    }>([
      { $match: { productId: { $in: productIds } } },
      { $group: { _id: '$productId', count: { $sum: 1 } } },
    ]);
    const map = new Map<string, number>();
    for (const row of rows) {
      map.set(String(row._id), row.count);
    }
    return map;
  }
}