import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product, ProductDocument } from '../products/product.schema.js';
import { Sale, SaleDocument } from '../sales/sale.schema.js';
import { Supplier, SupplierDocument } from '../suppliers/supplier.schema.js';
import { Publication, PublicationDocument } from '../publications/publication.schema.js';
import { PublicationsService } from '../publications/publications.service.js';

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
    @InjectModel(Sale.name) private readonly saleModel: Model<SaleDocument>,
    @InjectModel(Supplier.name) private readonly supplierModel: Model<SupplierDocument>,
    @InjectModel(Publication.name) private readonly publicationModel: Model<PublicationDocument>,
    private readonly publicationsService: PublicationsService,
  ) {}

  async overview() {
    const products = await this.productModel.find().exec();
    const saleDocs = await this.saleModel
      .find({ status: { $ne: 'cancelled' } })
      .exec();
    const saleMap = new Map<string, SaleDocument[]>();
    for (const s of saleDocs) {
      const key = String(s.productId);
      if (!saleMap.has(key)) saleMap.set(key, []);
      saleMap.get(key)!.push(s);
    }

    const productStats = new Map<
      string,
      {
        pub: number;
        soldQty: number;
        salesCount: number;
        earned: number;
        pending: number;
        earnedCup: number;
        pendingCup: number;
      }
    >();
    for (const p of products) {
      const key = String(p._id);
      const sales = saleMap.get(key) ?? [];
      const cur = (s: SaleDocument) => s.commissionCurrency ?? 'USD';
      productStats.set(key, {
        pub: 0,
        soldQty: sales.reduce((a, s) => a + s.quantity, 0),
        salesCount: sales.length,
        earned: sales.reduce((a, s) => a + (cur(s) === 'USD' ? s.commission : 0), 0),
        pending: sales
          .filter((s) => s.status === 'pending' && cur(s) === 'USD')
          .reduce((a, s) => a + s.commission, 0),
        earnedCup: sales.reduce((a, s) => a + (cur(s) === 'CUP' ? s.commission : 0), 0),
        pendingCup: sales
          .filter((s) => s.status === 'pending' && cur(s) === 'CUP')
          .reduce((a, s) => a + s.commission, 0),
      });
    }

    const pubMap = await this.publicationsService.countByProductMap(
      products.map((p) => p._id),
    );
    for (const [id, stats] of productStats) {
      stats.pub = pubMap.get(id) ?? 0;
    }

    const suppliers = await this.supplierModel.find().exec();
    const totalBySupplier = new Map<
      string,
      {
        name: string;
        products: number;
        active: number;
        sold: number;
        earned: number;
        pending: number;
        earnedCup: number;
        pendingCup: number;
        publications: number;
      }
    >();
    for (const sup of suppliers) {
      totalBySupplier.set(String(sup._id), {
        name: sup.name,
        products: 0,
        active: 0,
        sold: 0,
        earned: 0,
        pending: 0,
        earnedCup: 0,
        pendingCup: 0,
        publications: 0,
      });
    }

    let totalEarned = 0;
    let totalPending = 0;
    let totalEarnedCup = 0;
    let totalPendingCup = 0;
    let totalActive = 0;
    let totalSold = 0;
    let totalPublications = 0;

    for (const p of products) {
      const stats = productStats.get(String(p._id))!;
      const supplierId = String(p.supplierId);
      let row = totalBySupplier.get(supplierId);
      if (!row) {
        row = {
          name: supplierId,
          products: 0,
          active: 0,
          sold: 0,
          earned: 0,
          pending: 0,
          earnedCup: 0,
          pendingCup: 0,
          publications: 0,
        };
        totalBySupplier.set(supplierId, row);
      }
      row.products += 1;
      row.active += p.status === 'active' ? 1 : 0;
      row.sold += p.status === 'sold' ? 1 : 0;
      row.earned += stats.earned;
      row.pending += stats.pending;
      row.earnedCup += stats.earnedCup;
      row.pendingCup += stats.pendingCup;
      row.publications += stats.pub;
      totalEarned += stats.earned;
      totalPending += stats.pending;
      totalEarnedCup += stats.earnedCup;
      totalPendingCup += stats.pendingCup;
      totalActive += p.status === 'active' ? 1 : 0;
      totalSold += p.status === 'sold' ? 1 : 0;
      totalPublications += stats.pub;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const publicationsToday = await this.publicationModel.countDocuments({
      createdAt: { $gte: today },
    });

    return {
      totals: {
        products: products.length,
        active: totalActive,
        sold: totalSold,
        publications: totalPublications,
        publicationsToday,
        earnedCommission: Math.round(totalEarned * 100) / 100,
        pendingCommission: Math.round(totalPending * 100) / 100,
        earnedCommissionCup: Math.round(totalEarnedCup * 100) / 100,
        pendingCommissionCup: Math.round(totalPendingCup * 100) / 100,
      },
      bySupplier: [...totalBySupplier.values()].sort((a, b) => b.earned - a.earned),
    };
  }

  async productRanking() {
    const products = await this.productModel.find().exec();
    const saleDocs = await this.saleModel
      .find({ status: { $ne: 'cancelled' } })
      .exec();
    const byProduct = new Map<string, { qty: number; earned: number }>();
    for (const s of saleDocs) {
      const key = String(s.productId);
      const cur = byProduct.get(key) ?? { qty: 0, earned: 0 };
      cur.qty += s.quantity;
      cur.earned += s.commission;
      byProduct.set(key, cur);
    }
    const pubMap = await this.publicationsService.countByProductMap(
      products.map((p) => p._id),
    );
    const rows = products.map((p) => {
      const id = String(p._id);
      const stats = byProduct.get(id) ?? { qty: 0, earned: 0 };
      const pub = pubMap.get(id) ?? 0;
      return {
        _id: id,
        title: p.title,
        price: p.price,
        status: p.status,
        publications: pub,
        soldQty: stats.qty,
        earnedCommission: Math.round(stats.earned * 100) / 100,
        commissionCurrency: p.commissionCurrency ?? 'USD',
        conversion: pub > 0 ? Math.round((stats.qty / pub) * 100) : 0,
      };
    });
    rows.sort((a, b) => b.soldQty - a.soldQty || b.publications - a.publications);
    return rows;
  }
}