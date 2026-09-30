import { Component, inject, resource, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DataService } from '../core/data.js';
import { Overview, ProductRank, SupplierOverview } from '../core/types.js';
import { formatMoney } from '../core/data.js';

@Component({
  imports: [RouterLink],
  selector: 'app-dashboard',
  styleUrl: './dashboard.css',
  templateUrl: './dashboard.html',
})
export class Dashboard {
  private readonly data = inject(DataService);

  protected readonly reload = signal(0);

  protected readonly overview = resource<Overview, number>({
    params: () => this.reload(),
    loader: () => this.data.overview(),
  });

  protected readonly ranking = resource<ProductRank[], number>({
    params: () => this.reload(),
    loader: () => this.data.ranking(),
  });

  protected readonly formatMoney = formatMoney;

  protected topProducts(): ProductRank[] {
    return (this.ranking.value() ?? []).slice(0, 5);
  }

  protected barPerSupplier(sup: SupplierOverview): number {
    const rows = this.overview.value()?.bySupplier ?? [];
    const max = Math.max(...rows.map((s) => s.publications), 1);
    return Math.max(8, Math.round((sup.publications / max) * 100));
  }

  refresh() {
    this.reload.update((n) => n + 1);
  }
}