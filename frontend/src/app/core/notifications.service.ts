import { Injectable, computed, inject, signal } from '@angular/core';
import { DataService } from './data.js';
import { NotificationItem } from './types.js';

const POLL_MS = 60_000;

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly data = inject(DataService);

  private readonly itemsSignal = signal<NotificationItem[]>([]);
  readonly items = this.itemsSignal.asReadonly();
  readonly count = computed(() => this.itemsSignal().length);

  private timer: ReturnType<typeof setInterval> | null = null;
  private inflight = false;
  private started = false;

  start(): void {
    if (this.started) return;
    this.started = true;
    void this.refresh();
    if (typeof window !== 'undefined') {
      this.timer = setInterval(() => void this.refresh(), POLL_MS);
    }
  }

  stop(): void {
    if (!this.started) return;
    this.started = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async refresh(): Promise<void> {
    if (this.inflight) return;
    this.inflight = true;
    try {
      const items = await this.data.notifications();
      this.itemsSignal.set(items);
    } catch {
      // Sin conexión/PIN: conserva el estado actual aunque haya expirado.
    } finally {
      this.inflight = false;
    }
  }

  private optimisticUpdate(mutate: (list: NotificationItem[]) => NotificationItem[]) {
    this.itemsSignal.update(mutate);
  }

  async markSeen(id: string): Promise<void> {
    this.optimisticUpdate((list) => list.filter((n) => n.id !== id));
    try {
      await this.data.markNotifSeen([id]);
    } catch {
      await this.refresh();
    }
  }

  async markAllSeen(): Promise<void> {
    const ids = this.itemsSignal().map((n) => n.id);
    this.itemsSignal.set([]);
    if (ids.length === 0) return;
    try {
      await this.data.markNotifSeen(ids);
    } catch {
      await this.refresh();
    }
  }
}