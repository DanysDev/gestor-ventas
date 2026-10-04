import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment.js';

function resolveApiBase(): string {
  if (typeof window === 'undefined') return environment.apiBase || 'http://localhost:3000/api';
  
  // En producción, usar la variable de entorno si está definida
  if (environment.apiBase) return environment.apiBase;

  const { protocol, hostname, port } = window.location;
  if (port === '4200') {
    return `${protocol}//${hostname}:3000/api`;
  }
  return `${protocol}//${hostname}${port ? `:${port}` : ''}/api`;
}

export const API_BASE = resolveApiBase();

export function apiAsset(path: string): string {
  return `${API_BASE}/assets/${encodeURI(path)}`;
}

function pinHeaders(): Record<string, string> {
  const pin =
    typeof sessionStorage !== 'undefined'
      ? (sessionStorage.getItem('app-pin') ?? '')
      : '';
  return pin ? { 'x-app-pin': pin } : {};
}

export interface ProductQuery {
  supplierId?: string;
  status?: string;
  q?: string;
  sort?: string;
}

@Injectable({ providedIn: 'root' })
export class DataService {
  private readonly http = inject(HttpClient);

  get<T>(path: string): Promise<T> {
    return firstValueFrom(
      this.http.get<T>(`${API_BASE}${path}`, { headers: pinHeaders() }),
    );
  }
  post<T>(path: string, body?: unknown): Promise<T> {
    return firstValueFrom(
      this.http.post<T>(`${API_BASE}${path}`, body ?? {}, { headers: pinHeaders() }),
    );
  }
  patch<T>(path: string, body?: unknown): Promise<T> {
    return firstValueFrom(
      this.http.patch<T>(`${API_BASE}${path}`, body ?? {}, { headers: pinHeaders() }),
    );
  }
  put<T>(path: string, body?: unknown): Promise<T> {
    return firstValueFrom(
      this.http.put<T>(`${API_BASE}${path}`, body ?? {}, { headers: pinHeaders() }),
    );
  }
  delete<T>(path: string): Promise<T> {
    return firstValueFrom(
      this.http.delete<T>(`${API_BASE}${path}`, { headers: pinHeaders() }),
    );
  }
  uploadImages(formData: FormData) {
    return firstValueFrom(
      this.http.post<{ path: string; filename: string }[]>(
        `${API_BASE}/uploads`,
        formData,
        { headers: pinHeaders() },
      ),
    );
  }

  suppliers() {
    return this.get<import('./types.js').Supplier[]>('/suppliers');
  }
  scams() {
    return this.get<import('./types.js').Scam[]>('/scams');
  }
  followups() {
    return this.get<import('./types.js').Followup[]>('/followups');
  }
  products(query: ProductQuery = {}) {
    const params = new URLSearchParams();
    if (query.supplierId) params.set('supplierId', query.supplierId);
    if (query.status) params.set('status', query.status);
    if (query.q) params.set('q', query.q);
    if (query.sort) params.set('sort', query.sort);
    const qs = params.toString();
    return this.get<import('./types.js').Product[]>(`/products${qs ? `?${qs}` : ''}`);
  }
  product(id: string) {
    return this.get<import('./types.js').Product>(`/products/${id}`);
  }
  sale(id: string) {
    return this.get<import('./types.js').Sale>(`/sales/${id}`);
  }
  sales(productId?: string, status?: string) {
    const params = new URLSearchParams();
    if (productId) params.set('productId', productId);
    if (status) params.set('status', status);
    const qs = params.toString();
    return this.get<import('./types.js').Sale[]>(`/sales${qs ? `?${qs}` : ''}`);
  }
  settings() {
    return this.get<import('./types.js').Settings>('/settings');
  }
  overview() {
    return this.get<import('./types.js').Overview>('/reports/overview');
  }
  ranking() {
    return this.get<import('./types.js').ProductRank[]>('/reports/product-ranking');
  }
  publications(productId: string) {
    return this.get<{ _id: string; productId: string; createdAt: string }[]>(
      `/publications/product/${productId}`,
    );
  }
  notifications() {
    return this.get<import('./types.js').NotificationItem[]>('/notifications');
  }
  markNotifSeen(ids: string[]) {
    return this.post<{ marked: number }>('/notifications/seen', { ids });
  }
}

export function buildPublishText(description: string, contactLink?: string): string {
  const desc = (description ?? '').trim();
  const link = (contactLink ?? '').trim();
  if (!link) return desc;
  if (!desc) return `Contacteme --> ${link}`;
  return `Contacteme --> ${link}\n\n${desc}`;
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  }
}

export function formatMoney(value: number, currency: 'USD' | 'CUP' = 'USD'): string {
  const n = Number.isInteger(value) ? value : Math.round(value * 100) / 100;
  const str = n.toLocaleString('en-US', { maximumFractionDigits: 2 });
  return currency === 'CUP' ? `CUP ${str}` : `$${str} USD`;
}