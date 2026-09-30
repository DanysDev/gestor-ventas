import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DataService } from './core/data.js';
import { initTheme } from './core/theme.js';

@Component({
  imports: [RouterOutlet],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  private readonly data = inject(DataService);

  protected readonly checking = signal(true);
  protected readonly locked = signal(false);
  protected readonly pin = signal('');
  protected readonly error = signal('');

  async ngOnInit() {
    initTheme();
    const settings = await this.data.settings().catch(() => null);
    const hasPin = settings?.hasPin === true;
    const ok = sessionStorage.getItem('app-pin-ok');
    this.checking.set(false);
    this.locked.set(hasPin && ok !== '1');
  }

  protected async unlock() {
    if (!this.pin()) return;
    this.error.set('');
    sessionStorage.setItem('app-pin', this.pin());
    try {
      await this.data.overview();
      sessionStorage.setItem('app-pin-ok', '1');
      this.locked.set(false);
    } catch {
      sessionStorage.removeItem('app-pin');
      this.error.set('PIN incorrecto');
    }
  }
}