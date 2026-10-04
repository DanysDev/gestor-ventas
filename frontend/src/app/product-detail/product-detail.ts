import { Component, inject, resource, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { DataService, apiAsset, buildPublishText, copyToClipboard, formatMoney } from '../core/data.js';
import { Product, Sale, Settings } from '../core/types.js';
import { effectiveCommission } from '../core/types.js';

@Component({
  imports: [RouterLink],
  selector: 'app-product-detail',
  styleUrl: './product-detail.css',
  templateUrl: './product-detail.html',
})
export class ProductDetail {
  private readonly data = inject(DataService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly id = this.route.snapshot.paramMap.get('id') ?? '';
  protected readonly formatMoney = formatMoney;

  protected readonly reload = signal(0);
  protected readonly toast = signal('');
  protected readonly lightbox = signal('');
  protected readonly editingNotes = signal(false);
  protected readonly notesDraft = signal('');
  protected readonly savingNotes = signal(false);

  protected readonly product = resource<Product, { id: string; reload: number }>({
    params: () => ({ id: this.id, reload: this.reload() }),
    loader: ({ params }) => this.data.product(params.id),
  });

  protected readonly sales = resource<Sale[], { id: string; reload: number }>({
    params: () => ({ id: this.id, reload: this.reload() }),
    loader: ({ params }) => this.data.sales(params.id),
  });

  protected readonly publications = resource<
    { _id: string; createdAt: string }[],
    { id: string; reload: number }
  >({
    params: () => ({ id: this.id, reload: this.reload() }),
    loader: ({ params }) => this.data.publications(params.id),
  });

  protected readonly settings = resource<Settings, void>({
    loader: () => this.data.settings(),
  });

  protected readonly apiAsset = apiAsset;

  protected statusLabel(): string {
    const p = this.product.value();
    if (!p) return '';
    return p.status === 'active' ? 'activo' : p.status === 'sold' ? 'vendido' : 'oculto';
  }

  protected commissionLabel(): string {
    const p = this.product.value();
    if (!p) return '';
    if (p.commissionType === 'margin') {
      return `Margen: ${formatMoney(p.price - (p.supplierPrice ?? 0))} por unidad`;
    }
    const cur = p.commissionCurrency ?? 'USD';
    const base =
      p.commissionType === 'percent'
        ? `${p.commissionValue}% = ${formatMoney(effectiveCommission(p))}`
        : formatMoney(p.commissionValue, cur);
    if (!p.commissionQtyType || p.commissionQtyType === 'none') return base;
    const qty =
      p.commissionQtyType === 'percent'
        ? `${p.commissionQtyValue}% = ${formatMoney((p.price * (p.commissionQtyValue ?? 0)) / 100)}`
        : formatMoney(p.commissionQtyValue ?? 0, cur);
    return `${base} · cant. (${p.commissionQtyMin ?? 0}+): ${qty}/und`;
  }

  protected dateText(d?: string): string {
    if (!d) return '—';
    const date = new Date(d);
    return date.toLocaleString('es-ES', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  async copyPublish(): Promise<void> {
    const p = this.product.value();
    if (!p) return;
    const link = this.settings.value()?.contactLink ?? '';
    const text = buildPublishText(p.description, link);
    const ok = await copyToClipboard(text);
    this.toast.set(ok ? 'Publicación copiada ✓ Pégalo donde quieras.' : 'No se pudo copiar');
    setTimeout(() => this.toast.set(''), 3000);
  }

  async publish(): Promise<void> {
    const p = this.product.value();
    if (!p) return;
    const link = this.settings.value()?.contactLink ?? '';
    const text = buildPublishText(p.description, link);
    const ok = await copyToClipboard(text);
    await this.data.post(`/products/${p._id}/publish`);
    this.toast.set(ok ? 'Publicado ✓ y copiado. Pégalo ahora.' : 'Publicado ✓ (contador +1)');
    this.reload.update((n) => n + 1);
    setTimeout(() => this.toast.set(''), 3000);
  }

  protected startEditNotes(): void {
    this.notesDraft.set(this.product.value()?.salesNotes ?? '');
    this.editingNotes.set(true);
  }

  protected cancelEditNotes(): void {
    this.editingNotes.set(false);
  }

  async saveNotes(): Promise<void> {
    const p = this.product.value();
    if (!p || this.savingNotes()) return;
    this.savingNotes.set(true);
    try {
      await this.data.patch(`/products/${p._id}`, {
        salesNotes: this.notesDraft(),
      });
      this.editingNotes.set(false);
      this.reload.update((n) => n + 1);
      this.toast.set('Notas guardadas ✓');
    } catch {
      this.toast.set('No se pudo guardar');
    } finally {
      this.savingNotes.set(false);
      setTimeout(() => this.toast.set(''), 2500);
    }
  }

  async copyNotes(): Promise<void> {
    const text = this.product.value()?.salesNotes ?? '';
    if (!text.trim()) return;
    const ok = await copyToClipboard(text);
    this.toast.set(ok ? 'Notas copiadas ✓' : 'No se pudo copiar');
    setTimeout(() => this.toast.set(''), 2500);
  }

  async setStatus(status: 'active' | 'sold' | 'hidden'): Promise<void> {
    await this.data.patch(`/products/${this.id}`, { status });
    this.reload.update((n) => n + 1);
  }

  async remove(): Promise<void> {
    const ok = confirm('¿Eliminar este producto y sus registros de venta?');
    if (!ok) return;
    await this.data.delete(`/products/${this.id}`);
    this.router.navigate(['/productos']);
  }
}