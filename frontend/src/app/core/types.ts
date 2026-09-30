export interface Supplier {
  _id: string;
  name: string;
  contact?: string;
  notes?: string;
  voucherPickup?: string;
  voucherDelivery?: string;
  createdAt?: string;
}

export interface ProductImage {
  path: string;
  filename: string;
}

export type CommissionType = 'fixed' | 'percent' | 'margin';
export type CommissionQtyType = 'none' | 'fixed' | 'percent';
export type CommissionCurrency = 'USD' | 'CUP';
export type ProductStatus = 'active' | 'sold' | 'hidden';

export interface Product {
  _id: string;
  title: string;
  description: string;
  sizes?: string;
  salesNotes?: string;
  price: number;
  supplierPrice?: number;
  commissionType: CommissionType;
  commissionValue: number;
  commissionCurrency: CommissionCurrency;
  commissionQtyType?: CommissionQtyType;
  commissionQtyValue?: number;
  commissionQtyMin?: number;
  images: ProductImage[];
  supplierId: string;
  status: ProductStatus;
  publicationsCount: number;
  lastPublishedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  supplier?: { _id: string; name: string } | null;
  salesCount: number;
  soldQty: number;
  earnedCommission: number;
}

export type DeliveryType = 'mensajeria' | 'recogida';
export type SaleStatus = 'pending' | 'paid' | 'cancelled';

export interface Sale {
  _id: string;
  productId: string;
  clientName?: string;
  clientPhone?: string;
  address?: string;
  municipality?: string;
  quantity: number;
  salePrice: number;
  commission: number;
  commissionCurrency?: CommissionCurrency;
  deliveryType: DeliveryType;
  deliveryCost: number;
  paymentMethod?: string;
  saleDate: string;
  gestor?: string;
  gestorPhone?: string;
  observations?: string;
  status: SaleStatus;
  createdAt?: string;
  product?: {
    _id: string;
    title: string;
    price: number;
    supplierPrice?: number;
    images: ProductImage[];
    supplierId: string;
    supplier?: { _id: string; name: string };
  };
}

export interface Settings {
  _id?: string;
  contactLink: string;
  currency: string;
  gestor: string;
  gestorPhone: string;
  hasPin?: boolean;
}

export interface Scam {
  _id: string;
  name: string;
  phone?: string;
  address?: string;
  notes?: string;
  createdAt?: string;
}

export type FollowupStatus = 'pending' | 'contacted' | 'done';

export interface Followup {
  _id: string;
  name: string;
  phone?: string;
  reason?: string;
  status: FollowupStatus;
  dueDate?: string;
  notes?: string;
  createdAt?: string;
}

export function followupStatusLabel(s: FollowupStatus): string {
  return s === 'pending' ? 'pendiente' : s === 'contacted' ? 'contactado' : 'resuelto';
}

export type NotificationSeverity = 'danger' | 'warn' | 'info';

export interface NotificationItem {
  id: string;
  type: 'product_publish' | 'followup_pending' | 'followup_stuck' | 'sale_pending' | string;
  severity: NotificationSeverity;
  title: string;
  message: string;
  route: string;
}

export interface SupplierOverview {
  name: string;
  products: number;
  active: number;
  sold: number;
  earned: number;
  pending: number;
  earnedCup?: number;
  pendingCup?: number;
  publications: number;
}

export interface Overview {
  totals: {
    products: number;
    active: number;
    sold: number;
    publications: number;
    publicationsToday: number;
    earnedCommission: number;
    pendingCommission: number;
    earnedCommissionCup?: number;
    pendingCommissionCup?: number;
  };
  bySupplier: SupplierOverview[];
}

export interface ProductRank {
  _id: string;
  title: string;
  price: number;
  status: ProductStatus;
  publications: number;
  soldQty: number;
  earnedCommission: number;
  commissionCurrency?: CommissionCurrency;
  conversion: number;
}

export function effectiveCommission(
  p: {
    price: number;
    supplierPrice?: number;
    commissionType: CommissionType;
    commissionValue: number;
    commissionQtyType?: CommissionQtyType;
    commissionQtyValue?: number;
    commissionQtyMin?: number;
  },
  quantity = 1,
): number {
  if (p.commissionType === 'margin') {
    return Math.round((p.price - (p.supplierPrice ?? 0)) * 100) / 100;
  }
  const min = p.commissionQtyMin ?? 0;
  if (
    p.commissionQtyType &&
    p.commissionQtyType !== 'none' &&
    min > 0 &&
    quantity >= min
  ) {
    return p.commissionQtyType === 'percent'
      ? Math.round(((p.price * (p.commissionQtyValue ?? 0)) / 100) * 100) / 100
      : (p.commissionQtyValue ?? 0);
  }
  return p.commissionType === 'percent'
    ? Math.round(((p.price * p.commissionValue) / 100) * 100) / 100
    : p.commissionValue;
}