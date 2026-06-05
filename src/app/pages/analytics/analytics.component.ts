import { Component, OnInit, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { BillingService } from '../../core/services/billing.service';
import { DashboardAnalytics } from '../../core/models/analytics.model';
import { IconComponent } from '../../core/components/icon.component';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, IconComponent],
  styles: [`
    .analytics { display: grid; gap: 18px; }
    .kpi-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; }
    .rows { display: grid; grid-template-columns: minmax(0, 1fr) 360px; gap: 16px; }
    .chart { display: flex; align-items: end; gap: 10px; min-height: 220px; padding-top: 20px; }
    .bar-wrap { flex: 1; display: grid; gap: 8px; justify-items: center; }
    .bar { width: min(54px, 100%); border-radius: 8px 8px 0 0; background: linear-gradient(180deg, var(--gold-pale), var(--gold)); min-height: 8px; }
    .bar-day { font-size: 11px; color: var(--muted); }
    .item-row { display: grid; grid-template-columns: 28px minmax(0,1fr) auto; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1px solid var(--gold-border); }
    .item-row:last-child { border-bottom: 0; }
    .rank { width: 28px; height: 28px; border-radius: 8px; display: grid; place-items: center; background: var(--gold-cream); color: #8A6A24; font-weight: 800; font-size: 12px; }
    @media (max-width: 960px) { .kpi-grid, .rows { grid-template-columns: 1fr; } }
  `],
  template: `
    <div class="page-header">
      <h1>Analytics</h1>
      <button class="btn btn-ghost" (click)="load()">
        <app-icon name="refresh-cw" [size]="14" [sw]="1.8"></app-icon>
        Refresh
      </button>
    </div>

    @if (loading()) {
      <div class="loading-center"><div class="spinner"></div></div>
    } @else if (analytics()) {
      <div class="analytics">
        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-label">Today Revenue</div>
            <div class="kpi-value">{{ analytics()!.todayRevenue | currency:'INR':'symbol':'1.0-0' }}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Today Orders</div>
            <div class="kpi-value">{{ analytics()!.todayOrders }}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Active Tables</div>
            <div class="kpi-value">{{ analytics()!.activeTables }}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Customers</div>
            <div class="kpi-value">{{ analytics()!.totalCustomers }}</div>
          </div>
        </div>

        <div class="rows">
          <section class="section-card">
            <div class="section-card-header"><h2>Weekly Revenue</h2></div>
            <div style="padding:20px">
              <div class="chart">
                @for (day of analytics()!.weeklyRevenue; track day.date) {
                  <div class="bar-wrap">
                    <div class="bar" [style.height.px]="barHeight(day.revenue)"></div>
                    <div class="bar-day">{{ day.date | date:'EEE' }}</div>
                  </div>
                }
              </div>
            </div>
          </section>

          <section class="section-card">
            <div class="section-card-header"><h2>Top Items</h2></div>
            <div style="padding:12px 18px">
              @for (item of analytics()!.topItems; track item.menuItemId; let i = $index) {
                <div class="item-row">
                  <div class="rank">{{ i + 1 }}</div>
                  <div style="min-width:0">
                    <div style="font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{ item.name }}</div>
                    <div style="font-size:11px;color:var(--muted)">{{ item.quantitySold }} sold</div>
                  </div>
                  <strong>{{ item.revenue | currency:'INR':'symbol':'1.0-0' }}</strong>
                </div>
              }
            </div>
          </section>
        </div>
      </div>
    }
  `
})
export class AnalyticsComponent implements OnInit {
  private billing = inject(BillingService);
  analytics = signal<DashboardAnalytics | null>(null);
  loading = signal(true);

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.billing.getDashboardAnalytics().subscribe({
      next: data => { this.analytics.set(data); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  barHeight(value: number): number {
    const max = Math.max(...(this.analytics()?.weeklyRevenue.map(r => r.revenue) ?? [1]), 1);
    return Math.max(8, Math.round((value / max) * 190));
  }
}
