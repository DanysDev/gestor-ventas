import { Component, inject, resource, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DataService, apiAsset, buildPublishText, copyToClipboard, formatMoney, ProductQuery } from '../core/data.js';
import { Product, Settings, Supplier } from '../core/types.js';

@Component({
  imports: [RouterLink, FormsModule],
  selector: 'app-product-list',
  styleUrl: './product-list.css',
  templateUrl: './product-list.html',
})
export class ProductList {
  private readonly data = inject(DataService);
  private readonly route = inject(ActivatedRoute);

  protected readonly formatMoney = formatMoney;

  protected readonly reload = signal(0);
  protected readonly q = signal('');
  protected readonly supplierId = signal(this.route.snapshot.queryParamMap.get('proveedor') ?? '');
  protected readonly status = signal('');

  ngOnInit() {
    // El componente se reutiliza al navegar entre proveedores (ej: "Ver"
    // en la lista de proveedores), así que hay que escuchar los cambios
    // de la URL. Al llegar con otro proveedor se limpia el texto y el
    // estado para no dejar filtros viejos que oculten sus productos.
    this.route.queryParamMap.subscribe((params) => {
      const fromUrl = params.get('proveedor') ?? '';
      if (fromUrl !== this.supplierId()) {
        this.supplierId.set(fromUrl);
        this.q.set('');
        this.status.set('');
      }
    });
  }

  protected readonly suppliers = resource<Supplier[], void>({
    loader: () => this.data.suppliers(),
  });

  protected readonly settings = resource<Settings, void>({
    loader: () => this.data.settings(),
  });

  protected readonly products = resource<
    Product[],
    { reload: number; q: string; supp: string; status: string }
  >({
    params: () => ({
      reload: this.reload(),
      q: this.q().trim(),
      supp: this.supplierId(),
      status: this.status(),
    }),
    loader: ({ params }) => {
      const query: ProductQuery = { sort: 'new' };
      if (params.supp) query.supplierId = params.supp;
      if (params.status) query.status = params.status;
      if (params.q) query.q = params.q;
      return this.data.products(query);
    },
  });

  protected toast = signal('');

  protected readonly apiAsset = apiAsset;

  protected statusLabel(p: Product): string {
    return p.status === 'active' ? 'activo' : p.status === 'sold' ? 'vendido' : 'oculto';
  }

  protected commissionLabel(p: Product): string {
    if (p.commissionType === 'margin') {
      return `Margen: ${formatMoney(p.price - (p.supplierPrice ?? 0))}`;
    }
    const cur = p.commissionCurrency ?? 'USD';
    const base =
      p.commissionType === 'percent'
        ? `${p.commissionValue}%`
        : formatMoney(p.commissionValue, cur);
    if (!p.commissionQtyType || p.commissionQtyType === 'none') return base;
    const qty =
      p.commissionQtyType === 'percent'
        ? `${p.commissionQtyValue}%`
        : formatMoney(p.commissionQtyValue ?? 0, cur);
    return `${base} · cant. (${p.commissionQtyMin ?? 0}+): ${qty}`;
  }

  protected earnedLabel(p: Product): string {
    return formatMoney(p.earnedCommission, p.commissionCurrency ?? 'USD');
  }

  async copyPublish(settings: Settings, p: Product): Promise<void> {
    if (p.status !== 'active') {
      this.toast.set('Solo productos activos');
      return;
    }
    const text = buildPublishText(p.description, settings.contactLink);
    const ok = await copyToClipboard(text);
    this.toast.set(ok ? 'Copiado. Pégalo donde lo vayas a publicar.' : 'No se pudo copiar');
    setTimeout(() => this.toast.set(''), 2500);
  }

  async publish(p: Product): Promise<void> {
    await this.data.post(`/products/${p._id}/publish`);
    this.toast.set('Publicado ✓ (contador actualizado)');
    this.reload.update((n) => n + 1);
    setTimeout(() => this.toast.set(''), 2500);
  }
}