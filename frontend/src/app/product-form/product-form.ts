import { Component, computed, inject, resource, signal } from '@angular/core';
import { FormField, disabled, form, min, required, submit } from '@angular/forms/signals';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DataService, copyToClipboard, formatMoney } from '../core/data.js';
import { Product, ProductImage, Settings, Supplier } from '../core/types.js';

interface ProductModel {
  title: string;
  supplierId: string;
  price: number;
  supplierPrice: number;
  commissionType: 'fixed' | 'percent' | 'margin';
  commissionValue: number;
  commissionCurrency: 'USD' | 'CUP';
  commissionQtyType: 'none' | 'fixed' | 'percent';
  commissionQtyValue: number;
  commissionQtyMin: number;
  status: 'active' | 'sold' | 'hidden';
  description: string;
  sizes: string;
  salesNotes: string;
}

const blankModel: ProductModel = {
  title: '',
  supplierId: '',
  price: 0,
  supplierPrice: 0,
  commissionType: 'fixed',
  commissionValue: 0,
  commissionCurrency: 'USD',
  commissionQtyType: 'none',
  commissionQtyValue: 0,
  commissionQtyMin: 2,
  status: 'active',
  description: '',
  sizes: '',
  salesNotes: '',
};

@Component({
  imports: [RouterLink, FormField, FormsModule],
  selector: 'app-product-form',
  styleUrl: './product-form.css',
  templateUrl: './product-form.html',
})
export class ProductForm {
  private readonly data = inject(DataService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly formatMoney = formatMoney;
  protected readonly id = this.route.snapshot.paramMap.get('id');

  protected readonly loading = signal(this.id !== null);
  protected readonly saving = signal(false);
  protected readonly uploading = signal(false);
  protected readonly error = signal('');
  protected readonly toast = signal('');
  protected readonly imagesText = signal('');

  protected readonly model = signal<ProductModel>({ ...blankModel });
  protected readonly imagesSig = signal<ProductImage[]>([]);

  protected readonly productForm = form(this.model, (s) => {
    required(s.title, { message: 'El título es obligatorio' });
    required(s.supplierId, { message: 'Selecciona un proveedor' });
    min(s.price, 0, { message: 'El precio no puede ser negativo' });
    min(s.supplierPrice, 0, { message: 'El precio del proveedor no puede ser negativo' });
    min(s.commissionValue, 0, { message: 'La comisión no puede ser negativa' });
    disabled(s.commissionCurrency, ({ valueOf }) =>
      valueOf(s.commissionType) === 'percent' || valueOf(s.commissionType) === 'margin',
    );
  });

  protected readonly suppliers = resource<Supplier[], void>({
    loader: () => this.data.suppliers(),
  });
  protected readonly settings = resource<Settings, void>({
    loader: () => this.data.settings(),
  });

  protected readonly commissionHint = computed(() => {
    const m = this.model();
    if (m.commissionType === 'margin') return '';
    const currency = m.commissionType === 'percent' ? 'USD' : m.commissionCurrency;
    if (m.commissionType === 'percent') {
      return `Comisión estimada: ${formatMoney((m.price * m.commissionValue) / 100)}`;
    }
    return m.commissionValue > 0
      ? `Comisión fija de ${formatMoney(m.commissionValue, currency)} por cada venta`
      : '';
  });

  protected readonly marginEnabled = computed(
    () => this.model().commissionType === 'margin',
  );

  protected readonly marginHint = computed(() => {
    const m = this.model();
    if (m.price <= 0 || m.supplierPrice <= 0) return '';
    const diff = Math.round((m.price - m.supplierPrice) * 100) / 100;
    if (diff < 0) return '';
    return `Comisión (diferencia): ${formatMoney(diff)} por unidad. En el vale irá el precio del proveedor.`;
  });

  protected readonly marginError = computed(() => {
    const m = this.model();
    if (m.supplierPrice > 0 && m.price > 0 && m.price < m.supplierPrice) {
      return 'El precio del proveedor no puede ser mayor que el precio de venta.';
    }
    return '';
  });

  private prevCommission: {
    type: 'fixed' | 'percent';
    value: number;
    currency: 'USD' | 'CUP';
    qtyType: 'none' | 'fixed' | 'percent';
    qtyValue: number;
    qtyMin: number;
  } | null = null;

  protected onMarginToggle(event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    this.model.update((s) => {
      if (checked) {
        this.prevCommission = {
          type: s.commissionType === 'margin' ? 'fixed' : s.commissionType,
          value: s.commissionValue,
          currency: s.commissionCurrency,
          qtyType: s.commissionQtyType,
          qtyValue: s.commissionQtyValue,
          qtyMin: s.commissionQtyMin,
        };
        return {
          ...s,
          commissionType: 'margin',
          commissionValue: 0,
          commissionCurrency: 'USD',
          commissionQtyType: 'none',
          commissionQtyValue: 0,
          commissionQtyMin: 0,
        };
      }
      const prev = this.prevCommission ?? {
        type: 'fixed' as const,
        value: 0,
        currency: 'USD' as const,
        qtyType: 'none' as const,
        qtyValue: 0,
        qtyMin: 2,
      };
      this.prevCommission = null;
      return {
        ...s,
        commissionType: prev.type,
        commissionValue: prev.value,
        commissionCurrency: prev.currency,
        commissionQtyType: prev.qtyType,
        commissionQtyValue: prev.qtyValue,
        commissionQtyMin: prev.qtyMin,
      };
    });
  }

  protected readonly commissionCurrencyLabel = computed(() => {
    const m = this.model();
    if (m.commissionType === 'percent' || m.commissionType === 'margin') return 'USD';
    return m.commissionCurrency;
  });

  protected onCommissionTypeChange() {
    if (this.model().commissionType === 'percent') {
      this.model.update((s) => ({ ...s, commissionCurrency: 'USD' }));
    }
  }

  protected readonly qtyEnabled = computed(
    () => this.model().commissionQtyType !== 'none',
  );

  protected onQtyToggle(event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    this.model.update((s) => {
      const min = s.commissionQtyMin > 0 ? s.commissionQtyMin : 2;
      return {
        ...s,
        commissionQtyType: checked ? 'fixed' : 'none',
        commissionQtyMin: checked ? min : 0,
        commissionQtyValue: checked ? (s.commissionQtyValue || 0) : 0,
      };
    });
  }

  protected readonly qtyType = computed(() => this.model().commissionQtyType);

  protected readonly qtyValueHint = computed(() => {
    const m = this.model();
    if (m.commissionQtyType === 'none') return '';
    const currency = m.commissionQtyType === 'percent'
      ? 'USD'
      : m.commissionCurrency;
    if (m.commissionQtyType === 'percent') {
      return `Cuando vendas ${m.commissionQtyMin}+ unidades, la comisión será ${m.commissionQtyValue}% del precio (${formatMoney((m.price * m.commissionQtyValue) / 100)}) por unidad.`;
    }
    return m.commissionQtyValue > 0
      ? `Cuando vendas ${m.commissionQtyMin}+ unidades, la comisión será ${formatMoney(m.commissionQtyValue, currency)} por unidad.`
      : '';
  });

  protected readonly preview = computed(() => {
    const m = this.model();
    const link = this.settings.value()?.contactLink ?? '';
    const head = m.title ? `📦 ${m.title}` : '';
    const priceLine = m.price > 0 ? `💰 Precio: ${formatMoney(m.price)}` : '';
    const sizesLine = m.sizes?.trim() ? `📏 Tallas disponibles: ${m.sizes.trim()}` : '';
    const body = [head, priceLine, sizesLine, m.description.trim()]
      .filter(Boolean)
      .join('\n\n');
    return link ? `${body}\n\n${link}` : body;
  });

  async ngOnInit() {
    if (!this.id) return;
    try {
      const p = await this.data.product(this.id);
      this.model.set({
        title: p.title,
        supplierId: p.supplierId,
        price: p.price,
        supplierPrice: p.supplierPrice ?? 0,
        commissionType: p.commissionType,
        commissionValue: p.commissionValue,
        commissionCurrency: p.commissionCurrency ?? 'USD',
        commissionQtyType: p.commissionQtyType ?? 'none',
        commissionQtyValue: p.commissionQtyValue ?? 0,
        commissionQtyMin: p.commissionQtyMin ?? 2,
        status: p.status,
        description: p.description,
        sizes: p.sizes ?? '',
        salesNotes: p.salesNotes ?? '',
      });
      this.imagesSig.set(p.images);
      this.imagesText.set(p.images.map((i) => i.path).join('\n'));
    } catch (e) {
      this.error.set('No se pudo cargar el producto');
    } finally {
      this.loading.set(false);
    }
  }

  protected syncImages() {
    const paths = this.imagesText().split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
    this.imagesSig.set(
      paths.map((p) => ({ path: p, filename: p.split('/').pop() ?? p })),
    );
  }

  protected readonly uploadReady = computed(() => {
    const m = this.model();
    return (
      this.suppliers.hasValue() &&
      m.supplierId.trim() !== '' &&
      m.title.trim() !== ''
    );
  });

  protected async upload(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (files.length === 0) return;

    const m = this.model();
    const sup = this.suppliers.value()?.find((s) => s._id === m.supplierId);
    if (!sup) {
      this.error.set('Selecciona un proveedor antes de subir imágenes');
      return;
    }
    if (!m.title.trim()) {
      this.error.set('Escribe el título del producto antes de subir imágenes');
      return;
    }

    const fd = new FormData();
    for (const f of files) fd.append('files', f, f.name);
    fd.append('supplier', sup.name);
    fd.append('product', m.title);

    this.uploading.set(true);
    this.error.set('');
    try {
      const saved = await this.data.uploadImages(fd);
      const current = this.imagesText();
      const additional = saved.map((i) => i.path).join('\n');
      this.imagesText.set(current ? `${current}\n${additional}` : additional);
      this.syncImages();
      this.toast.set(`${saved.length} imagen(es) subidas a su carpeta de ventas ✓`);
      setTimeout(() => this.toast.set(''), 2600);
    } catch (e: unknown) {
      this.error.set(
        e instanceof Error && e.message ? e.message : 'No se pudieron subir las imágenes',
      );
    } finally {
      this.uploading.set(false);
    }
  }

  protected async copyPreview() {
    const ok = await copyToClipboard(this.preview());
    this.toast.set(ok ? 'Vista previa copiada ✓' : 'No se pudo copiar');
    setTimeout(() => this.toast.set(''), 2500);
  }

  protected onSubmit() {
    submit(this.productForm, async () => {
      this.saving.set(true);
      this.error.set('');
      try {
        this.syncImages();
        const m = this.model();
        const payload = {
          title: m.title,
          supplierId: m.supplierId,
          price: m.price,
          supplierPrice: m.commissionType === 'margin' ? m.supplierPrice : 0,
          commissionType: m.commissionType,
          commissionValue: m.commissionValue,
          commissionCurrency: m.commissionType === 'percent' || m.commissionType === 'margin'
            ? 'USD'
            : m.commissionCurrency,
          commissionQtyType: m.commissionQtyType,
          commissionQtyValue:
            m.commissionQtyType === 'none' ? 0 : m.commissionQtyValue,
          commissionQtyMin:
            m.commissionQtyType === 'none' ? 0 : m.commissionQtyMin,
          status: m.status,
          description: m.description,
          sizes: m.sizes,
          salesNotes: m.salesNotes,
          images: this.imagesSig(),
        };
        if (this.id) {
          await this.data.patch(`/products/${this.id}`, payload);
        } else {
          await this.data.post('/products', payload);
        }
        this.router.navigate(['/productos']);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Error al guardar';
        this.error.set(msg || 'Error al guardar');
      } finally {
        this.saving.set(false);
      }
    });
  }
}