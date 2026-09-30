import { Component, effect, inject, resource, signal } from '@angular/core';
import { FormField, form, min, required, submit } from '@angular/forms/signals';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { DataService, copyToClipboard, formatMoney } from '../core/data.js';
import { Product, Sale, SaleStatus, Settings, Supplier } from '../core/types.js';
import { effectiveCommission } from '../core/types.js';

interface SaleModel {
  productId: string;
  clientName: string;
  clientPhone: string;
  address: string;
  municipality: string;
  quantity: number;
  salePrice: number;
  commission: number;
  commissionCurrency: 'USD' | 'CUP';
  deliveryType: 'mensajeria' | 'recogida';
  deliveryCost: number;
  paymentMethod: string;
  saleDate: string;
  gestor: string;
  gestorPhone: string;
  observations: string;
  status: SaleStatus;
}

function todayISO(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const blankSale: SaleModel = {
  productId: '',
  clientName: '',
  clientPhone: '',
  address: '',
  municipality: '',
  quantity: 1,
  salePrice: 0,
  commission: 0,
  commissionCurrency: 'USD',
  deliveryType: 'mensajeria',
  deliveryCost: 0,
  paymentMethod: '',
  saleDate: todayISO(),
  gestor: '',
  gestorPhone: '',
  observations: '',
  status: 'pending',
};

@Component({
  imports: [FormField, FormsModule],
  selector: 'app-sale-list',
  styleUrl: './sale-list.css',
  templateUrl: './sale-list.html',
})
export class SaleList {
  private readonly data = inject(DataService);
  private readonly route = inject(ActivatedRoute);

  protected readonly formatMoney = formatMoney;

  protected readonly created = signal(false);
  protected readonly saving = signal(false);
  protected readonly toast = signal('');
  protected readonly error = signal('');
  protected readonly reload = signal(0);
  protected readonly statusFilter = signal('');

  protected readonly presetProduct = this.route.snapshot.queryParamMap.get('producto');
  private presetApplied = false;

  constructor() {
    effect(() => {
      const list = this.products.value();
      if (this.presetProduct && list && list.length > 0 && !this.presetApplied) {
        this.presetApplied = true;
        this.model.update((m) => ({ ...m, productId: this.presetProduct! }));
        this.onProductChange();
      }
    });
  }

  protected readonly model = signal<SaleModel>({ ...blankSale });
  protected readonly saleForm = form(this.model, (s) => {
    required(s.productId, { message: 'Selecciona el producto' });
    min(s.salePrice, 0.01, { message: 'Precio de venta inválido' });
    min(s.quantity, 1, { message: 'Cantidad mínima 1' });
    min(s.commission, 0);
  });

  protected readonly suppliers = resource<Supplier[], void>({
    loader: () => this.data.suppliers(),
  });

  protected readonly products = resource<Product[], void>({
    loader: () => this.data.products({ status: '' }),
  });

  protected readonly settings = resource<Settings, void>({
    loader: () => this.data.settings(),
  });

  protected readonly sales = resource<Sale[], { reload: number; status: string }>({
    params: () => ({ reload: this.reload(), status: this.statusFilter() }),
    loader: ({ params }) =>
      this.data.sales(undefined, params.status || undefined),
  });

  async ngOnInit() {
    const settings = await this.data.settings();
    this.model.update((m) => ({
      ...m,
      gestor: settings.gestor,
      gestorPhone: settings.gestorPhone,
      productId: this.presetProduct ?? m.productId,
    }));
  }

  protected productById(id: string): Product | undefined {
    return (this.products.value() ?? []).find((p) => p._id === id);
  }

  protected onProductSelected() {
    const p = this.productById(this.model().productId);
    if (!p) return;
    this.model.update((m) => ({
      ...m,
      salePrice: p.price,
      commission: effectiveCommission(p),
      commissionCurrency: p.commissionCurrency ?? 'USD',
      quantity: 1,
    }));
  }

  protected async onProductChange() {
    const p = this.productById(this.model().productId);
    if (!p) return;
    const qty = this.model().quantity || 1;
    this.model.update((m) => ({
      ...m,
      salePrice: p.price,
      commission: effectiveCommission(p, qty) * qty,
      commissionCurrency: p.commissionCurrency ?? 'USD',
    }));
  }

  protected onQtyChange() {
    const p = this.productById(this.model().productId);
    if (!p) return;
    const qty = Math.max(1, this.model().quantity || 1);
    this.model.update((m) => ({
      ...m,
      commission: effectiveCommission(p, qty) * qty,
      commissionCurrency: p.commissionCurrency ?? 'USD',
    }));
  }

  protected readonly selectedProductCurrency = () => {
    const p = this.productById(this.model().productId);
    return p ? p.commissionCurrency ?? 'USD' : this.model().commissionCurrency;
  };

  protected readonly qtyCommissionHint = () => {
    const p = this.productById(this.model().productId);
    if (!p || !p.commissionQtyType || p.commissionQtyType === 'none') return '';
    const cur = p.commissionCurrency ?? 'USD';
    const value =
      p.commissionQtyType === 'percent'
        ? `${p.commissionQtyValue}%`
        : formatMoney(p.commissionQtyValue ?? 0, cur);
    return `Por cantidad (${p.commissionQtyMin ?? 0}+ und.): ${value} por unidad.`;
  };

  protected readonly supplierPriceHint = () => {
    const p = this.productById(this.model().productId);
    if (!p || !(p.supplierPrice && p.supplierPrice > 0)) return '';
    const margin = Math.round((p.price - (p.supplierPrice ?? 0)) * 100) / 100;
    return `Precio del proveedor: ${formatMoney(p.supplierPrice)} · comisión (diferencia): ${formatMoney(margin)} por unidad.`;
  };

  protected onSubmit() {
    submit(this.saleForm, async () => {
      this.saving.set(true);
      this.error.set('');
      try {
        const m = this.model();
        await this.data.post('/sales', {
          productId: m.productId,
          clientName: m.clientName,
          clientPhone: m.clientPhone,
          address: m.address,
          municipality: m.municipality,
          quantity: m.quantity,
          salePrice: m.salePrice,
          commission: m.commission,
          commissionCurrency: m.commissionCurrency,
          deliveryType: m.deliveryType,
          deliveryCost: m.deliveryCost,
          paymentMethod: m.paymentMethod,
          saleDate: new Date(m.saleDate).toISOString(),
          gestor: m.gestor,
          gestorPhone: m.gestorPhone,
          observations: m.observations,
          status: m.status,
        });
        this.created.set(false);
        this.model.set({ ...blankSale, gestor: m.gestor, gestorPhone: m.gestorPhone });
        this.reload.update((n) => n + 1);
        this.toast.set('Venta registrada ✓');
        setTimeout(() => this.toast.set(''), 2500);
      } catch (e: unknown) {
        this.error.set(e instanceof Error ? e.message : 'Error al guardar');
      } finally {
        this.saving.set(false);
      }
    });
  }

  protected statusLabel(s: Sale): string {
    return s.status === 'pending' ? 'Por cobrar' : s.status === 'paid' ? 'Cobrada' : 'Cancelada';
  }

  protected deliveryLabel(s: Sale): string {
    return s.deliveryType === 'mensajeria' ? 'Mensajería' : 'Recogida';
  }

  protected longDate(d: string): string {
    return new Date(d).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  protected sumCommissionsUsd(): number {
    return (this.sales.value() ?? [])
      .filter((s) => (s.commissionCurrency ?? 'USD') !== 'CUP')
      .reduce((a, s) => a + s.commission, 0);
  }

  protected sumCommissionsCup(): number {
    return (this.sales.value() ?? [])
      .filter((s) => (s.commissionCurrency ?? 'USD') === 'CUP')
      .reduce((a, s) => a + s.commission, 0);
  }

  protected valeText(s: Sale): string {
    const p = s.product ?? undefined;
    const line = '****************************************************';
    const lines = [
      '',
      line,
      `VALE DE VENTA — ${this.deliveryLabel(s).toUpperCase()}`,
      line,
      '👤 Cliente: ' + (s.clientName || ''),
      '📱 Teléfono: ' + (s.clientPhone || ''),
      s.deliveryType === 'mensajeria' ? '📍 Dirección: ' + (s.address || '') : '',
      s.deliveryType === 'mensajeria' ? '🏙️ Municipio: ' + (s.municipality || '') : '',
      '🛍️ Producto: ' + (p?.title ?? s.productId),
      '🔢 Cantidad: ' + s.quantity,
      '💵 Precio de venta: ' + formatMoney(s.salePrice),
      p?.supplierPrice ? '🏭 Precio del proveedor: ' + formatMoney(p.supplierPrice) : '',
      '💰 Comisión del gestor: ' +
        formatMoney(s.commission, s.commissionCurrency ?? 'USD'),
      s.deliveryType === 'mensajeria' ? '🚚 Mensajería: Sí' : '🏪 Recogida en local: Sí',
      s.deliveryType === 'mensajeria' ? '💵 Costo de mensajería: ' + (s.deliveryCost ? formatMoney(s.deliveryCost) : '') : '',
      '💳 Forma de pago: ' + (s.paymentMethod || ''),
      '📅 Fecha de venta: ' + new Date(s.saleDate).toLocaleDateString('es-ES'),
      '👨‍💼 Gestor: ' + (s.gestor || ''),
      '📱 Teléfono del gestor: ' + (s.gestorPhone || ''),
      '📝 Observaciones: ' + (s.observations || ''),
      '',
      line,
      '',
    ];
    return lines
      .map((l) => l.trimEnd())
      .filter((l, i, arr) => {
        const isBlank = l.trim() === '';
        const nextBlank = (arr[i + 1] ?? '').trim() === '';
        return !(isBlank && nextBlank);
      })
      .join('\n');
  }

  protected async copyVale(s: Sale): Promise<void> {
    const ok = await copyToClipboard(this.valeText(s));
    this.toast.set(ok ? 'Vale copiado ✓ Pégalo en WhatsApp.' : 'No se pudo copiar');
    setTimeout(() => this.toast.set(''), 2500);
  }

  protected async setStatus(s: Sale, status: SaleStatus): Promise<void> {
    await this.data.patch(`/sales/${s._id}`, { status });
    this.reload.update((n) => n + 1);
  }

  protected async remove(sale: Sale): Promise<void> {
    const ok = confirm('¿Eliminar esta venta?');
    if (!ok) return;
    await this.data.delete(`/sales/${sale._id}`);
    this.reload.update((n) => n + 1);
  }
}