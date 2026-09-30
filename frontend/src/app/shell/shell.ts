import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { DataService } from '../core/data.js';
import { Settings } from '../core/types.js';
import { getTheme, setTheme, Theme } from '../core/theme.js';
import { Notifications } from './notifications/notifications.js';

@Component({
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Notifications],
  selector: 'app-shell',
  styleUrl: './shell.css',
  templateUrl: './shell.html',
})
export class Shell {
  protected readonly data = inject(DataService);
  protected readonly settings = signal<Settings>({
    contactLink: '',
    currency: 'USD',
    gestor: 'Gestor',
    gestorPhone: '',
  });

  async ngOnInit() {
    const current = await this.data.settings();
    this.settings.set(current);
  }

  protected cycleTheme() {
    const next: Theme = getTheme() === 'dark' ? 'light' : 'dark';
    setTheme(next);
    this.theme.set(next);
  }

  protected readonly theme = signal<Theme>(getTheme());
}