import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Supplier, SupplierDocument } from './supplier.schema.js';
import { CreateSupplierDto, UpdateSupplierDto } from './dto/supplier.dto.js';

@Injectable()
export class SuppliersService {
  constructor(
    @InjectModel(Supplier.name) private readonly supplierModel: Model<SupplierDocument>,
  ) {}

  async findAll(): Promise<SupplierDocument[]> {
    return this.supplierModel.find().sort({ name: 1 }).exec();
  }

  async findOne(id: string): Promise<SupplierDocument> {
    return this.findByIdOrThrow(id);
  }

  async create(dto: CreateSupplierDto): Promise<SupplierDocument> {
    return this.supplierModel.create(dto);
  }

  async update(id: string, dto: UpdateSupplierDto): Promise<SupplierDocument> {
    const updated = await this.supplierModel
      .findByIdAndUpdate(id, dto, { new: true })
      .exec();
    if (!updated) {
      throw new NotFoundException(`Proveedor ${id} no encontrado`);
    }
    return updated;
  }

  async remove(id: string): Promise<void> {
    const result = await this.supplierModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Proveedor ${id} no encontrado`);
    }
  }

  private async findByIdOrThrow(id: string): Promise<SupplierDocument> {
    const found = await this.supplierModel.findById(id).exec();
    if (!found) {
      throw new NotFoundException(`Proveedor ${id} no encontrado`);
    }
    return found;
  }
}