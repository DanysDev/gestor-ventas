import { CommissionQtyType, CommissionType } from './product.schema.js';

export function effectiveCommission(
  price: number,
  type: CommissionType,
  value: number,
  supplierPrice = 0,
): number {
  if (type === 'margin') {
    return Math.round((price - supplierPrice) * 100) / 100;
  }
  if (type === 'percent') {
    return Math.round((price * value) / 100 * 100) / 100;
  }
  return value;
}

export function effectiveCommissionByQty(
  price: number,
  baseType: CommissionType,
  baseValue: number,
  qtyType: CommissionQtyType,
  qtyValue: number,
  qtyMin: number,
  quantity: number,
  supplierPrice = 0,
): number {
  if (baseType === 'margin') {
    return effectiveCommission(price, baseType, baseValue, supplierPrice);
  }
  if (qtyType !== 'none' && qtyMin > 0 && quantity >= qtyMin) {
    return effectiveCommission(price, qtyType as CommissionType, qtyValue);
  }
  return effectiveCommission(price, baseType, baseValue);
}

export type ProductSummary = {
  _id: unknown;
  title: string;
  description: string;
  sizes?: string;
  price: number;
  commissionType: CommissionType;
  commissionValue: number;
  commissionCurrency: 'USD' | 'CUP';
  supplierPrice?: number;
  commissionQtyType: CommissionQtyType;
  commissionQtyValue: number;
  commissionQtyMin: number;
  images: { path: string; filename: string }[];
  supplierId: string;
  status: 'active' | 'sold' | 'hidden';
  publicationsCount: number;
  lastPublishedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  supplier: { _id: string; name: string };
  salesCount: number;
  soldQty: number;
  earnedCommission: number;
};