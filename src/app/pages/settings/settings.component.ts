import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../core/components/icon.component';
import { SettingsService } from '../../core/services/settings.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [FormsModule, IconComponent],
  styles: [`
    .settings-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
    .field-row { display: grid; gap: 12px; }
    .toggle-row { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 12px 0; border-bottom: 1px solid var(--gold-border); }
    .toggle-row:last-child { border-bottom: 0; }
    .switch { width: 46px; height: 26px; border-radius: 999px; border: 1px solid var(--gold-border); background: var(--surface); padding: 3px; cursor: pointer; }
    .switch span { display: block; width: 18px; height: 18px; border-radius: 50%; background: var(--muted2); transition: transform .15s, background .15s; }
    .switch.on { background: var(--gold-cream); border-color: var(--gold); }
    .switch.on span { transform: translateX(20px); background: var(--gold); }
    @media (max-width: 880px) { .settings-grid { grid-template-columns: 1fr; } }
  `],
  template: `
    <div class="page-header">
      <h1>Settings</h1>
      <button class="btn btn-gold" (click)="save()">
        <app-icon name="check" [size]="14" [sw]="1.8"></app-icon>
        Save
      </button>
    </div>

    @if (notice()) {
      <div style="margin-bottom:14px;border:1px solid var(--gold-border);background:var(--gold-faint);border-radius:8px;padding:10px 12px;font-size:12px">
        {{ notice() }}
      </div>
    }

    <div class="settings-grid">
      <section class="section-card">
        <div class="section-card-header"><h2>Cafe Profile</h2></div>
        <div class="field-row" style="padding:18px">
          <div class="form-group">
            <label>Cafe name</label>
            <input [(ngModel)]="settings.cafeName" />
          </div>
          <div class="form-group">
            <label>Address</label>
            <textarea [(ngModel)]="settings.address"></textarea>
          </div>
          <div class="form-group">
            <label>Phone</label>
            <input [(ngModel)]="settings.phone" />
          </div>
        </div>
      </section>

      <section class="section-card">
        <div class="section-card-header"><h2>Tax & Currency</h2></div>
        <div style="padding:0 18px">
          <div class="toggle-row">
            <div>
              <strong>GST Enabled</strong>
              <div style="font-size:11px;color:var(--muted)">Calculate and show GST on all bills</div>
            </div>
            <button class="switch" [class.on]="settings.gstEnabled" (click)="settings.gstEnabled = !settings.gstEnabled">
              <span></span>
            </button>
          </div>
        </div>
        <div class="field-row" style="padding:0 18px 18px">
          <div class="form-group">
            <label>Currency</label>
            <input [(ngModel)]="settings.currency" />
          </div>
          <div class="form-group">
            <label>GST rate (%)</label>
            <input type="number" [(ngModel)]="settings.taxRate" [disabled]="!settings.gstEnabled" />
          </div>
          <div class="form-group">
            <label>Default tenant slug</label>
            <input [(ngModel)]="settings.tenantSlug" />
          </div>
        </div>
      </section>

      <section class="section-card">
        <div class="section-card-header"><h2>Payments</h2></div>
        <div style="padding:18px">
          @for (method of paymentMethods; track method.key) {
            <div class="toggle-row">
              <div>
                <strong>{{ method.label }}</strong>
                <div style="font-size:11px;color:var(--muted)">{{ method.description }}</div>
              </div>
              <button class="switch" [class.on]="settings.payments[method.key]" (click)="settings.payments[method.key] = !settings.payments[method.key]">
                <span></span>
              </button>
            </div>
          }
        </div>
      </section>

      <section class="section-card">
        <div class="section-card-header"><h2>Deployment URLs</h2></div>
        <div class="field-row" style="padding:18px">
          <div class="form-group">
            <label>API base URL</label>
            <input [(ngModel)]="settings.apiBaseUrl" />
          </div>
          <div class="form-group">
            <label>QR menu URL pattern</label>
            <input [(ngModel)]="settings.qrPattern" />
          </div>
        </div>
      </section>
    </div>
  `
})
export class SettingsComponent {
  private settingsSvc = inject(SettingsService);
  notice = signal<string | null>(null);
  settings = { ...this.settingsSvc.get() };

  readonly paymentMethods = [
    { key: 'cash', label: 'Cash', description: 'Record cash payments at the counter' },
    { key: 'upi', label: 'UPI', description: 'Record UPI payments manually' },
    { key: 'debit_card', label: 'Debit Card', description: 'Record card terminal payments' },
    { key: 'credit_card', label: 'Credit Card', description: 'Record card terminal payments' },
  ];

  save(): void {
    this.settingsSvc.save(this.settings);
    this.notice.set('Settings saved locally. Mirror these values into Azure App Settings before production deployment.');
    setTimeout(() => this.notice.set(null), 5000);
  }
}
