import { Component, inject, resource, signal } from '@angular/core';
import { FormField, form, required, submit } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { copyToClipboard, DataService } from '../core/data.js';
import { Supplier } from '../core/types.js';

interface SupplierModel {
  name: string;
  contact: string;
  notes: string;
  voucherPickup: string;
  voucherDelivery: string;
}

const blank: SupplierModel = {
  name: '',
  contact: '',
  notes: '',
  voucherPickup: '',
  voucherDelivery: '',
};

@Component({
  imports: [RouterLink, FormField],
  selector: 'app-supplier-list',
  styleUrl: './supplier-list.css',
  templateUrl: './supplier-list.html',
})
export class SupplierList {
  private readonly data = inject(DataService);

  protected readonly reload = signal(0);
  protected readonly saving = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly creating = signal(false);
  protected readonly toast = signal('');
  protected readonly error = signal('');

  protected readonly model = signal<SupplierModel>({ ...blank });

  protected readonly supplierForm = form(this.model, (s) => {
    required(s.name, { message: 'El nombre es obligatorio' });
  });

  protected readonly suppliers = resource<Supplier[], { reload: number }>({
    params: () => ({ reload: this.reload() }),
    loader: () => this.data.suppliers(),
  });

  protected readonly products = resource<
    { supplierId: string; _id: string }[],
    void
  >({
    loader: () => this.data.products({}),
  });

  protected countFor(id: string): number {
    return (this.products.value() ?? []).filter((p) => p.supplierId === id).length;
  }

  protected startEdit(s: Supplier) {
    this.creating.set(true);
    this.editingId.set(s._id);
    this.model.set({
      name: s.name,
      contact: s.contact ?? '',
      notes: s.notes ?? '',
      voucherPickup: s.voucherPickup ?? '',
      voucherDelivery: s.voucherDelivery ?? '',
    });
    this.error.set('');
  }

  protected startNew() {
    this.creating.set(true);
    this.editingId.set(null);
    this.model.set({ ...blank });
  }

  protected reset() {
    this.editingId.set(null);
    this.creating.set(false);
    this.model.set({ ...blank });
  }

  protected onSubmit() {
    submit(this.supplierForm, async () => {
      this.saving.set(true);
      this.error.set('');
      try {
        const m = this.model();
        if (this.editingId()) {
          await this.data.patch(`/suppliers/${this.editingId()}`, m);
        } else {
          await this.data.post('/suppliers', m);
        }
        this.reset();
        this.reload.update((n) => n + 1);
        this.toast.set('Proveedor guardado ✓');
        setTimeout(() => this.toast.set(''), 2200);
      } catch (e: unknown) {
        this.error.set(e instanceof Error ? e.message : 'Error al guardar');
      } finally {
        this.saving.set(false);
      }
    });
  }

  protected async copy(text: string, what: string) {
    const ok = await copyToClipboard(text);
    this.toast.set(
      ok ? `Vale de ${what} copiado ✓` : 'No se pudo copiar',
    );
    setTimeout(() => this.toast.set(''), 2200);
  }

  protected async remove(s: Supplier) {
    const count = this.countFor(s._id);
    const ok = confirm(
      `¿Eliminar "${s.name}"? Tiene ${count} producto(s) asociados que perderán su proveedor.`,
    );
    if (!ok) return;
    await this.data.delete(`/suppliers/${s._id}`);
    this.reload.update((n) => n + 1);
  }
}