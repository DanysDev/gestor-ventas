import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Product, ProductDocument } from './product.schema.js';
import { Supplier, SupplierDocument } from '../suppliers/supplier.schema.js';
import {
  CreateProductDto,
  QueryProductsDto,
  UpdateProductDto,
} from './dto/product.dto.js';
import { PublicationsService } from '../publications/publications.service.js';
import { SettingsService } from '../settings/settings.service.js';
import { ProductSummary } from './product.helper.js';
import type { StorageProvider } from '../storage/storage.interface.js';
import { STORAGE_PROVIDER_TOKEN } from '../storage/storage.interface.js';

type Counts = Map<
  string,
  { salesCount: number; soldQty: number; earnedCommission: number }
>;

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
    @InjectModel(Supplier.name) private readonly supplierModel: Model<SupplierDocument>,
    private readonly publicationsService: PublicationsService,
    private readonly settingsService: SettingsService,
    @Inject(STORAGE_PROVIDER_TOKEN) private readonly storage: StorageProvider,
  ) {}

  private enrichProductImages(product: ProductDocument): ProductDocument {
    const obj = product.toObject();
    if (obj.images && Array.isArray(obj.images)) {
      obj.images = obj.images.map((img: { path: string; filename: string }) => ({
        ...img,
        url: this.storage.getPublicUrl(img.path),
      }));
    }
    return obj as unknown as ProductDocument;
  }

  async countMap(productIds: Types.ObjectId[]): Promise<Counts> {
    if (productIds.length === 0) {
      return new Map();
    }
    const rows = await this.productModel.aggregate<{
      _id: Types.ObjectId;
      salesCount: number;
      soldQty: number;
      earnedCommission: number;
    }>([
      { $match: { _id: { $in: productIds } } },
      {
        $lookup: {
          from: 'sales',
          localField: '_id',
          foreignField: 'productId',
          as: 'saleDocs',
        },
      },
      {
        $project: {
          saleDocs: {
            $filter: {
              input: '$saleDocs',
              as: 's',
              cond: { $ne: ['$$s.status', 'cancelled'] },
            },
          },
        },
      },
      {
        $project: {
          salesCount: { $size: '$saleDocs' },
          soldQty: { $sum: '$saleDocs.quantity' },
          earnedCommission: { $sum: '$saleDocs.commission' },
        },
      },
    ]);
    const map = new Map<string, { salesCount: number; soldQty: number; earnedCommission: number }>();
    for (const row of rows) {
      map.set(String(row._id), {
        salesCount: row.salesCount,
        soldQty: row.soldQty,
        earnedCommission: row.earnedCommission,
      });
    }
    return map;
  }

  private async supplierNames(): Promise<Map<string, string>> {
    const suppliers = await this.supplierModel.find().select('name').exec();
    const map = new Map<string, string>();
    for (const s of suppliers) {
      map.set(String(s._id), s.name);
    }
    return map;
  }

  async findAll(query: QueryProductsDto): Promise<ProductSummary[]> {
    const filter: Record<string, unknown> = {};
    if (query.supplierId) {
      // Acepta ambos tipos BSON: hay productos viejos con supplierId
      // guardado como texto y Mongo distingue texto de ObjectId al filtrar.
      filter.supplierId = {
        $in: [new Types.ObjectId(query.supplierId), query.supplierId],
      };
    }
    if (query.status) {
      filter.status = query.status;
    }
    if (query.q) {
      filter.$or = [
        { title: { $regex: query.q, $options: 'i' } },
        { description: { $regex: query.q, $options: 'i' } },
      ];
    }
    const sort: Record<string, 1 | -1> =
      query.sort === 'oldest' ? { updatedAt: 1 } : { updatedAt: -1 };

    const [products, names] = await Promise.all([
      this.productModel.find(filter).sort(sort).exec(),
      this.supplierNames(),
    ]);

    const counts = await this.countMap(products.map((p) => p._id));
    return products.map((p) => {
      const c = counts.get(String(p._id)) ?? {
        salesCount: 0,
        soldQty: 0,
        earnedCommission: 0,
      };
      const enriched = this.enrichProductImages(p);
      return {
        ...enriched,
        supplierId: String(p.supplierId),
        supplier: {
          _id: String(p.supplierId),
          name: names.get(String(p.supplierId)) ?? 'Proveedor eliminado',
        },
        salesCount: c.salesCount,
        soldQty: c.soldQty,
        earnedCommission: c.earnedCommission,
      } as ProductSummary;
    });
  }

  async findOne(id: string): Promise<ProductSummary> {
    const product = await this.productModel.findById(id).exec();
    if (!product) {
      throw new NotFoundException(`Producto ${id} no encontrado`);
    }
    const names = await this.supplierNames();
    const c = (await this.countMap([product._id])).get(String(product._id)) ?? {
      salesCount: 0,
      soldQty: 0,
      earnedCommission: 0,
    };
    const enriched = this.enrichProductImages(product);
    return {
      ...enriched,
      supplierId: String(product.supplierId),
      supplier: {
        _id: String(product.supplierId),
        name: names.get(String(product.supplierId)) ?? 'Proveedor eliminado',
      },
      salesCount: c.salesCount,
      soldQty: c.soldQty,
      earnedCommission: c.earnedCommission,
    } as ProductSummary;
  }

  async create(dto: CreateProductDto): Promise<ProductDocument> {
    this.validateMargin(dto);
    return this.productModel.create(dto);
  }

  async update(id: string, dto: UpdateProductDto): Promise<ProductDocument> {
    this.validateMargin(dto);
    const updated = await this.productModel
      .findByIdAndUpdate(id, dto, { new: true })
      .exec();
    if (!updated) {
      throw new NotFoundException(`Producto ${id} no encontrado`);
    }
    return updated;
  }

  private validateMargin(dto: { commissionType?: string; supplierPrice?: number; price?: number }): void {
    if (dto.commissionType !== 'margin') return;
    if (dto.supplierPrice == null) {
      throw new BadRequestException(
        'Con comisión por margen debes indicar el precio del proveedor',
      );
    }
    if (dto.price != null && dto.supplierPrice > dto.price) {
      throw new BadRequestException(
        'El precio del proveedor no puede ser mayor que el precio de venta',
      );
    }
  }

  async remove(id: string): Promise<void> {
    const result = await this.productModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Producto ${id} no encontrado`);
    }
  }

  async publish(id: string): Promise<ProductDocument> {
    const product = await this.findByIdOrThrow(id);
    product.publicationsCount += 1;
    product.lastPublishedAt = new Date();
    await product.save();
    await this.publicationsService.create(product._id.toString());
    return product;
  }

  async publicationText(id: string): Promise<{ text: string }> {
    const product = await this.findByIdOrThrow(id);
    const settings = await this.settingsService.get();
    let text = product.description ?? '';
    if (product.sizes) {
      text = `${text}\nTallas disponibles: ${product.sizes}`;
    }
    text = text.trim();
    const link = settings.contactLink?.trim() ?? '';
    if (link) {
      text = text ? `Contacteme --> ${link}\n\n${text}` : `Contacteme --> ${link}`;
    }
    return { text };
  }

  private async findByIdOrThrow(id: string): Promise<ProductDocument> {
    const found = await this.productModel.findById(id).exec();
    if (!found) {
      throw new NotFoundException(`Producto ${id} no encontrado`);
    }
    return found;
  }
}