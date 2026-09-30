import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product, ProductDocument } from '../products/product.schema.js';
import { Sale, SaleDocument } from '../sales/sale.schema.js';
import { Followup, FollowupDocument } from '../followups/followup.schema.js';
import {
  NotificationSeen,
  NotificationSeenDocument,
} from './notif-seen.schema.js';

export type NotificationSeverity = 'danger' | 'warn' | 'info';

export interface NotificationItem {
  id: string;
  type: string;
  severity: NotificationSeverity;
  title: string;
  message: string;
  route: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const STUCK_AFTER_DAYS = 3;
const SEVERITY_ORDER: Record<NotificationSeverity, number> = {
  danger: 0,
  warn: 1,
  info: 2,
};

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(Sale.name)
    private readonly saleModel: Model<SaleDocument>,
    @InjectModel(Followup.name)
    private readonly followupModel: Model<FollowupDocument>,
    @InjectModel(NotificationSeen.name)
    private readonly notifSeenModel: Model<NotificationSeenDocument>,
  ) {}

  async findAll(): Promise<NotificationItem[]> {
    const candidates = await this.collect();
    if (candidates.length === 0) return [];
    const seen = await this.notifSeenModel
      .find({ key: { $in: candidates.map((c) => c.id) } })
      .select('key')
      .lean()
      .exec();
    const seenSet = new Set(seen.map((s) => s.key));
    return candidates
      .filter((c) => !seenSet.has(c.id))
      .sort(
        (a, b) =>
          SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
          a.title.localeCompare(b.title),
      );
  }

  async markSeen(ids: string[]): Promise<{ marked: number }> {
    const keys = [...new Set(ids)].slice(0, 500);
    if (keys.length === 0) return { marked: 0 };
    const result = await this.notifSeenModel.bulkWrite(
      keys.map((key) => ({
        updateOne: {
          filter: { bucket: 'owner', key },
          update: {
            $setOnInsert: { bucket: 'owner', key, seenAt: new Date() },
          },
          upsert: true,
        },
      })),
    );
    return { marked: result.upsertedCount ?? 0 };
  }

  private async collect(): Promise<NotificationItem[]> {
    const out: NotificationItem[] = [];
    const now = Date.now();

    const products = await this.productModel
      .find()
      .select('_id title status createdAt lastPublishedAt')
      .exec();
    const titleById = new Map<string, string>();
    for (const p of products) {
      titleById.set(String(p._id), p.title);
      if (p.status !== 'active') continue;
      const created = this.createdAtOf(p);
      const last = p.lastPublishedAt ? p.lastPublishedAt.getTime() : null;
      if (last !== null && now - last < DAY_MS) continue;
      if (last === null && now - created < DAY_MS) continue;
      out.push({
        id: `prod-pub:${String(p._id)}:${last ?? 0}`,
        type: 'product_publish',
        severity: 'info',
        title: 'Producto sin publicar',
        message: `"${p.title}" lleva más de 24 h sin publicar`,
        route: `/productos/${String(p._id)}`,
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayMs = today.getTime();
    const followups = await this.followupModel
      .find({ status: { $in: ['pending', 'contacted'] } })
      .exec();
    for (const f of followups) {
      const id = String(f._id);
      const updatedAt = this.updatedAtOf(f);
      if (f.status === 'pending') {
        const due = f.dueDate
          ? new Date(`${f.dueDate}T00:00:00`).getTime()
          : null;
        const overdue = due !== null && due < todayMs;
        const isToday = due === todayMs;
        const severity: NotificationSeverity =
          due === null ? 'info' : overdue ? 'danger' : isToday ? 'warn' : 'info';
        const when = overdue ? 'Vencido' : isToday ? 'Para hoy' : '';
        const reason = f.reason || `Falta contactar a ${f.name}`;
        out.push({
          id: `followup:${id}:pending`,
          type: 'followup_pending',
          severity,
          title: f.name,
          message: [when, reason].filter(Boolean).join(' · '),
          route: '/seguimiento',
        });
      } else if (
        updatedAt !== null &&
        now - updatedAt >= STUCK_AFTER_DAYS * DAY_MS
      ) {
        out.push({
          id: `followup:${id}:stuck`,
          type: 'followup_stuck',
          severity: 'warn',
          title: f.name,
          message:
            `Contactado hace ${STUCK_AFTER_DAYS}+ días sin resolver${f.reason ? ` · ${f.reason}` : ''}`,
          route: '/seguimiento',
        });
      }
    }

    const sales = await this.saleModel
      .find({ status: 'pending' })
      .select('_id productId clientName createdAt')
      .exec();
    const saleCutoff = now - DAY_MS;
    for (const s of sales) {
      const created = this.createdAtOf(s);
      if (created >= saleCutoff) continue;
      const productTitle = titleById.get(String(s.productId)) ?? 'producto';
      out.push({
        id: `sale:${String(s._id)}:pending`,
        type: 'sale_pending',
        severity: 'warn',
        title: 'Venta por cobrar',
        message: `"${productTitle}" pendiente de pago${s.clientName ? ` (${s.clientName})` : ''}`,
        route: '/ventas',
      });
    }

    return out;
  }

  private createdAtOf(doc: unknown): number {
    return Number(new Date((doc as { createdAt?: Date }).createdAt ?? 0));
  }

  private updatedAtOf(doc: unknown): number | null {
    const d = (doc as { updatedAt?: Date }).updatedAt;
    return d ? Number(new Date(d)) : null;
  }
}