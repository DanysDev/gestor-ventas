import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Sale, SaleDocument } from './sale.schema.js';
import {
  CreateSaleDto,
  QuerySalesDto,
  UpdateSaleDto,
} from './dto/sale.dto.js';
import { Product, ProductDocument } from '../products/product.schema.js';
import { Supplier, SupplierDocument } from '../suppliers/supplier.schema.js';
import { effectiveCommissionByQty } from '../products/product.helper.js';

export type SaleSummary = {
  _id: string;
  clientName?: string;
  clientPhone?: string;
  address?: string;
  municipality?: string;
  quantity: number;
  salePrice: number;
  commission: number;
  commissionCurrency: 'USD' | 'CUP';
  deliveryType: 'mensajeria' | 'recogida';
  deliveryCost: number;
  paymentMethod?: string;
  saleDate?: Date;
  gestor?: string;
  gestorPhone?: string;
  observations?: string;
  status: 'pending' | 'paid' | 'cancelled';
  createdAt?: Date;
  updatedAt?: Date;
  productId: string;
  product?: {
    _id: string;
    title: string;
    price: number;
    supplierPrice?: number;
    images: { path: string; filename: string }[];
    supplierId: string;
    supplier?: { _id: string; name: string };
  };
};

@Injectable()
export class SalesService {
  constructor(
    @InjectModel(Sale.name) private readonly saleModel: Model<SaleDocument>,
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
    @InjectModel(Supplier.name) private readonly supplierModel: Model<SupplierDocument>,
  ) {}

  async findAll(query: QuerySalesDto): Promise<SaleSummary[]> {
    const filter: Record<string, unknown> = {};
    if (query.productId) {
      filter.productId = new Types.ObjectId(query.productId);
    }
    if (query.status) {
      filter.status = query.status;
    }
    const sales = await this.saleModel.find(filter).sort({ createdAt: -1 }).exec();
    return this.toSummaries(sales);
  }

  async findOne(id: string): Promise<SaleSummary> {
    const found = await this.saleModel.findById(id).exec();
    if (!found) {
      throw new NotFoundException(`Venta ${id} no encontrada`);
    }
    return (await this.toSummaries([found]))[0];
  }

  async create(dto: CreateSaleDto): Promise<SaleSummary> {
    const product = await this.productModel.findById(dto.productId).exec();
    if (!product) {
      throw new BadRequestException('El producto de la venta no existe');
    }
    const commission =
      dto.commission ??
      effectiveCommissionByQty(
        product.price,
        product.commissionType,
        product.commissionValue,
        product.commissionQtyType ?? 'none',
        product.commissionQtyValue ?? 0,
        product.commissionQtyMin ?? 0,
        dto.quantity ?? 1,
        product.supplierPrice ?? 0,
      ) * (dto.quantity ?? 1);

    const sale = await this.saleModel.create({
      ...dto,
      productId: new Types.ObjectId(dto.productId),
      commission,
      commissionCurrency:
        dto.commissionCurrency ?? product.commissionCurrency ?? 'USD',
      saleDate: dto.saleDate ? new Date(dto.saleDate) : new Date(),
    });

    if (dto.status !== 'cancelled') {
      await this.productModel
        .findByIdAndUpdate(dto.productId, { status: 'sold' })
        .exec();
    }
    return this.findOne(sale._id.toString());
  }

  async update(id: string, dto: UpdateSaleDto): Promise<SaleSummary> {
    const current = await this.saleModel.findById(id).exec();
    if (!current) {
      throw new NotFoundException(`Venta ${id} no encontrada`);
    }
    const next = { ...dto };
    if (dto.saleDate) {
      next.saleDate = new Date(dto.saleDate) as unknown as string;
    }
    await this.saleModel.findByIdAndUpdate(id, next).exec();
    const fresh = await this.saleModel.findById(id).exec();
    if (fresh?.productId) {
      await this.syncProductStatus(String(fresh.productId));
    }
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const found = await this.saleModel.findById(id).exec();
    if (!found) {
      throw new NotFoundException(`Venta ${id} no encontrada`);
    }
    const productId = found.productId ? String(found.productId) : '';
    await this.saleModel.findByIdAndDelete(id).exec();
    if (productId) {
      await this.syncProductStatus(productId);
    }
  }

  private async syncProductStatus(productId: string): Promise<void> {
    const activeCount = await this.saleModel
      .countDocuments({ productId: new Types.ObjectId(productId), status: { $ne: 'cancelled' } })
      .exec();
    await this.productModel
      .findByIdAndUpdate(productId, { status: activeCount > 0 ? 'sold' : 'active' })
      .exec();
  }

  private async toSummaries(sales: SaleDocument[]): Promise<SaleSummary[]> {
    const ids = sales
      .map((s) => s.productId)
      .filter((id): id is Types.ObjectId => id != null);
    const [products, suppliers] = await Promise.all([
      ids.length > 0
        ? this.productModel.find({ _id: { $in: ids } }).lean().exec()
        : [],
      this.supplierModel.find().lean().exec(),
    ]);
    const productMap = new Map<string, (typeof products)[number]>();
    for (const p of products) {
      productMap.set(String(p._id), p);
    }
    const supplierMap = new Map<string, string>();
    for (const s of suppliers) {
      supplierMap.set(String(s._id), s.name);
    }
    return sales.map((s) => {
      const raw = s.toObject();
      const pid = s.productId ? String(s.productId) : '';
      const p = pid ? productMap.get(pid) : undefined;
      const { productId: _skip, ...rest } = raw;
      return {
        ...rest,
        _id: String(raw._id),
        productId: pid,
        product: p
          ? {
              _id: pid,
              title: p.title,
              price: p.price,
              supplierPrice: p.supplierPrice ?? 0,
              images: p.images ?? [],
              supplierId: String(p.supplierId),
              supplier: {
                _id: String(p.supplierId),
                name: supplierMap.get(String(p.supplierId)) ?? 'Proveedor eliminado',
              },
            }
          : undefined,
      } as SaleSummary;
    });
  }
}