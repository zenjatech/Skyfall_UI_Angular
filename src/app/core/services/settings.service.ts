import { Injectable, computed, signal } from '@angular/core';
import { environment } from '../../../environments/environment';

export interface AppSettings {
  cafeName: string;
  address: string;
  phone: string;
  currency: string;
  taxRate: number;
  gstEnabled: boolean;
  tenantSlug: string;
  apiBaseUrl: string;
  qrPattern: string;
  payments: Record<string, boolean>;
}

const STORAGE_KEY = 'sf_settings';

const DEFAULTS: AppSettings = {
  cafeName: 'Skyfall Lounge',
  address: '',
  phone: '',
  currency: 'INR',
  taxRate: 5,
  gstEnabled: true,
  tenantSlug: environment.defaultTenantId,
  apiBaseUrl: environment.apiBaseUrl,
  qrPattern: '/menu/{tableId}',
  payments: { cash: true, upi: true, debit_card: true, credit_card: true }
};

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private _s = signal<AppSettings>(this.load());

  readonly gstEnabled = computed(() => this._s().gstEnabled);
  readonly taxRate    = computed(() => this._s().taxRate);
  readonly cafeName   = computed(() => this._s().cafeName);
  readonly address    = computed(() => this._s().address);
  readonly phone      = computed(() => this._s().phone);

  get(): AppSettings { return this._s(); }

  save(s: AppSettings): void {
    this._s.set(s);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  }

  private load(): AppSettings {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
    } catch { return { ...DEFAULTS }; }
  }
}
