import { Component, inject, resource, signal } from '@angular/core';
import { FormField, form, required, submit } from '@angular/forms/signals';
import { FormsModule } from '@angular/forms';
import { DataService } from '../core/data.js';
import { Followup, FollowupStatus, followupStatusLabel } from '../core/types.js';

interface FollowupModel {
  name: string;
  phone: string;
  reason: string;
  status: FollowupStatus;
  dueDate: string;
  notes: string;
}

const blank: FollowupModel = {
  name: '',
  phone: '',
  reason: '',
  status: 'pending',
  dueDate: '',
  notes: '',
};

@Component({
  imports: [FormField, FormsModule],
  selector: 'app-followup-list',
  styleUrl: './followup-list.css',
  templateUrl: './followup-list.html',
})
export class FollowupList {
  private readonly data = inject(DataService);

  protected readonly reload = signal(0);
  protected readonly saving = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly creating = signal(false);
  protected readonly toast = signal('');
  protected readonly error = signal('');
  protected readonly q = signal('');
  protected readonly statusFilter = signal('');

  protected readonly model = signal<FollowupModel>({ ...blank });

  protected readonly followupForm = form(this.model, (s) => {
    required(s.name, { message: 'El nombre es obligatorio' });
  });

  protected readonly followups = resource<Followup[], { reload: number }>({
    params: () => ({ reload: this.reload() }),
    loader: () => this.data.followups(),
  });

  protected readonly label = followupStatusLabel;

  protected filtered(): Followup[] {
    let list = this.followups.value() ?? [];
    const st = this.statusFilter();
    if (st) list = list.filter((f) => f.status === st);
    const q = this.q().trim().toLowerCase();
    if (q) {
      list = list.filter((f) =>
        [f.name, f.phone, f.reason, f.notes].filter(Boolean).some((x) => x!.toLowerCase().includes(q)),
      );
    }
    return list;
  }

  protected pendingCount(): number {
    return (this.followups.value() ?? []).filter((f) => f.status === 'pending').length;
  }

  protected isOverdue(f: Followup): boolean {
    if (f.status === 'done' || !f.dueDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(`${f.dueDate}T00:00:00`);
    return !isNaN(due.getTime()) && due < today;
  }

  protected dateText(d: string | undefined): string {
    if (!d) return '';
    const dt = new Date(`${d}T00:00:00`);
    if (isNaN(dt.getTime())) return d;
    return dt.toLocaleDateString('es', { day: 'numeric', month: 'short' });
  }

  protected startEdit(f: Followup) {
    this.creating.set(true);
    this.editingId.set(f._id);
    this.model.set({
      name: f.name,
      phone: f.phone ?? '',
      reason: f.reason ?? '',
      status: f.status,
      dueDate: f.dueDate ?? '',
      notes: f.notes ?? '',
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
    submit(this.followupForm, async () => {
      this.saving.set(true);
      this.error.set('');
      try {
        const m = this.model();
        if (this.editingId()) {
          await this.data.patch(`/followups/${this.editingId()}`, m);
        } else {
          await this.data.post('/followups', m);
        }
        this.reset();
        this.reload.update((n) => n + 1);
        this.toast.set('Seguimiento guardado ✓');
        setTimeout(() => this.toast.set(''), 2200);
      } catch (e: unknown) {
        this.error.set(e instanceof Error ? e.message : 'Error al guardar');
      } finally {
        this.saving.set(false);
      }
    });
  }

  protected async setStatus(f: Followup, status: FollowupStatus) {
    await this.data.patch(`/followups/${f._id}`, { status });
    this.reload.update((n) => n + 1);
  }

  protected async remove(f: Followup) {
    const ok = confirm(`¿Eliminar el seguimiento de "${f.name}"?`);
    if (!ok) return;
    await this.data.delete(`/followups/${f._id}`);
    this.reload.update((n) => n + 1);
  }
}