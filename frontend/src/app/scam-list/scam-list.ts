import { Component, inject, resource, signal } from '@angular/core';
import { FormField, form, required, submit } from '@angular/forms/signals';
import { FormsModule } from '@angular/forms';
import { DataService } from '../core/data.js';
import { Scam } from '../core/types.js';

interface ScamModel {
  name: string;
  phone: string;
  address: string;
  notes: string;
}

const blank: ScamModel = { name: '', phone: '', address: '', notes: '' };

@Component({
  imports: [FormField, FormsModule],
  selector: 'app-scam-list',
  styleUrl: './scam-list.css',
  templateUrl: './scam-list.html',
})
export class ScamList {
  private readonly data = inject(DataService);

  protected readonly reload = signal(0);
  protected readonly saving = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly creating = signal(false);
  protected readonly toast = signal('');
  protected readonly error = signal('');
  protected readonly q = signal('');

  protected readonly model = signal<ScamModel>({ ...blank });

  protected readonly scamForm = form(this.model, (s) => {
    required(s.name, { message: 'El nombre es obligatorio' });
  });

  protected readonly scams = resource<Scam[], { reload: number }>({
    params: () => ({ reload: this.reload() }),
    loader: () => this.data.scams(),
  });

  protected filtered(): Scam[] {
    const q = this.q().trim().toLowerCase();
    if (!q) return this.scams.value() ?? [];
    return (this.scams.value() ?? []).filter((s) =>
      [s.name, s.phone, s.address, s.notes]
        .filter(Boolean)
        .some((f) => f!.toLowerCase().includes(q)),
    );
  }

  protected startEdit(s: Scam) {
    this.creating.set(true);
    this.editingId.set(s._id);
    this.model.set({
      name: s.name,
      phone: s.phone ?? '',
      address: s.address ?? '',
      notes: s.notes ?? '',
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
    submit(this.scamForm, async () => {
      this.saving.set(true);
      this.error.set('');
      try {
        const m = this.model();
        if (this.editingId()) {
          await this.data.patch(`/scams/${this.editingId()}`, m);
        } else {
          await this.data.post('/scams', m);
        }
        this.reset();
        this.reload.update((n) => n + 1);
        this.toast.set('Contacto guardado ✓');
        setTimeout(() => this.toast.set(''), 2200);
      } catch (e: unknown) {
        this.error.set(e instanceof Error ? e.message : 'Error al guardar');
      } finally {
        this.saving.set(false);
      }
    });
  }

  protected async remove(s: Scam) {
    const ok = confirm(`¿Eliminar el contacto "${s.name}" de la lista de estafas?`);
    if (!ok) return;
    await this.data.delete(`/scams/${s._id}`);
    this.reload.update((n) => n + 1);
  }
}