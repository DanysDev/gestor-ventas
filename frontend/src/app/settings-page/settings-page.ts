import { Component, inject, resource, signal } from '@angular/core';
import { FormField, form, submit } from '@angular/forms/signals';
import { DataService } from '../core/data.js';
import { Settings } from '../core/types.js';
import { getTheme, setTheme, Theme } from '../core/theme.js';

interface AssembleModel {
  contactLink: string;
  currency: string;
  gestor: string;
  gestorPhone: string;
  pin: string;
  clearPin: boolean;
}

const blank: AssembleModel = {
  contactLink: '',
  currency: 'USD',
  gestor: 'Gestor',
  gestorPhone: '',
  pin: '',
  clearPin: false,
};

interface ImportResult {
  suppliers: number;
  products: number;
  skipped: number;
  error?: string;
}

@Component({
  imports: [FormField],
  selector: 'app-settings-page',
  styleUrl: './settings-page.css',
  templateUrl: './settings-page.html',
})
export class SettingsPage {
  private readonly data = inject(DataService);

  protected readonly settings = resource<Settings, void>({
    loader: () => this.data.settings(),
  });

  protected readonly reload = signal(0);
  protected readonly keysReady = signal(false);
  protected readonly model = signal<AssembleModel>({ ...blank });
  protected readonly settingsForm = form(this.model);

  protected readonly saving = signal(false);
  protected readonly importing = signal(false);
  protected readonly result = signal<ImportResult | null>(null);
  protected readonly toast = signal('');
  protected readonly error = signal('');
  protected readonly theme = signal<Theme>(getTheme());

  protected chooseTheme(t: Theme) {
    setTheme(t);
    this.theme.set(t);
  }

  async ngOnInit() {
    const s = await this.data.settings();
    this.model.set({
      contactLink: s.contactLink,
      currency: s.currency,
      gestor: s.gestor,
      gestorPhone: s.gestorPhone,
      pin: '',
      clearPin: false,
    });
    this.keysReady.set(true);
  }

  protected onSubmit() {
    submit(this.settingsForm, async () => {
      this.saving.set(true);
      this.error.set('');
      try {
        const { pin, clearPin, ...rest } = this.model();
        const payload: Record<string, unknown> = { ...rest };
        if (clearPin) {
          payload['pin'] = '';
        } else if (pin) {
          payload['pin'] = pin;
        }
        await this.data.put('/settings', payload);
        this.model.set({ ...this.model(), pin: '', clearPin: false });
        this.toast.set('Configuración guardada ✓');
        setTimeout(() => this.toast.set(''), 2200);
      } catch (e: unknown) {
        this.error.set(e instanceof Error ? e.message : 'Error al guardar');
      } finally {
        this.saving.set(false);
      }
    });
  }

  protected async runImport() {
    this.importing.set(true);
    this.result.set(null);
    try {
      const res = await this.data.post<ImportResult>('/import/scan');
      this.result.set(res);
      if (!res.error) {
        this.reload.update((n) => n + 1);
      }
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Error al importar');
    } finally {
      this.importing.set(false);
    }
  }
}