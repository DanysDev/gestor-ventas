import {
  Component,
  ElementRef,
  HostListener,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { NotificationsService } from '../../core/notifications.service.js';
import { NotificationItem } from '../../core/types.js';

@Component({
  imports: [],
  selector: 'app-notifications',
  styleUrl: './notifications.css',
  templateUrl: './notifications.html',
})
export class Notifications {
  protected readonly svc = inject(NotificationsService);
  private readonly router = inject(Router);

  protected readonly open = signal(false);
  protected readonly leaving = signal<Set<string>>(new Set());
  protected readonly count = computed(() => this.svc.count());
  protected readonly countLabel = computed(() =>
    this.count() > 9 ? '9+' : String(this.count()),
  );

  private readonly badge = viewChild<ElementRef<HTMLElement>>('badge');
  private lastCount: number | null = null;

  constructor() {
    effect(() => {
      const n = this.svc.count();
      if (this.lastCount === n) return;
      const changed = this.lastCount !== null;
      this.lastCount = n;
      if (!changed || n === 0) return;
      const el = this.badge()?.nativeElement;
      if (!el) return;
      el.style.animation = 'none';
      void el.offsetWidth;
      el.style.animation = '';
    });

    this.router.events
      .pipe(
        takeUntilDestroyed(),
        filter((e) => e instanceof NavigationEnd),
      )
      .subscribe(() => {
        void this.svc.refresh();
        this.open.set(false);
      });
  }

  @HostListener('window:keydown.escape')
  onEscape() {
    this.open.set(false);
  }

  @HostListener('window:focus')
  onWindowFocus() {
    void this.svc.refresh();
  }

  ngOnInit() {
    this.svc.start();
  }

  ngOnDestroy() {
    this.svc.stop();
  }

  protected toggle() {
    this.open.update((v) => !v);
    if (this.open()) void this.svc.refresh();
  }

  protected close() {
    this.open.set(false);
  }

  protected icon(n: NotificationItem): string {
    switch (n.type) {
      case 'product_publish':
        return '🛍️';
      case 'followup_pending':
      case 'followup_stuck':
        return '📌';
      case 'sale_pending':
        return '💵';
      default:
        return '🔔';
    }
  }

  protected async view(n: NotificationItem) {
    this.close();
    await this.router.navigate([n.route]);
  }

  protected markSeen(n: NotificationItem) {
    this.leaving.update((s) => new Set(s).add(n.id));
    setTimeout(() => {
      void this.svc.markSeen(n.id);
      this.leaving.update((s) => {
        const next = new Set(s);
        next.delete(n.id);
        return next;
      });
    }, 160);
  }

  protected markAllSeen() {
    void this.svc.markAllSeen();
  }
}