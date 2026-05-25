import { Component, inject, OnInit, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { BillingService } from '../../core/services/billing.service';
import { DashboardAnalytics } from '../../core/models/analytics.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CurrencyPipe],
  styles: [`
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 28px; }
    .stat { padding: 20px; }
    .stat-label { color: var(--text-muted); font-size: 13px; margin-bottom: 8px; }
    .stat-value { font-size: 28px; font-weight: 700; color: var(--primary); }
    .charts { display: grid; grid-template-columns: 2fr 1fr; gap: 20px; }
    .chart-card h3 { font-size: 14px; font-weight: 600; margin: 0 0 16px; color: var(--text-muted); text-transform: uppercase; letter-spacing: .05em; }
    .bar-chart { display: flex; align-items: flex-end; gap: 8px; height: 120px; }
    .bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; }
    .bar { width: 100%; background: var(--primary); border-radius: 4px 4px 0 0; min-height: 4px; transition: height .3s; }
    .bar-label { font-size: 10px; color: var(--text-muted); }
    .top-items { display: flex; flex-direction: column; gap: 10px; }
    .top-item { display: flex; align-items: center; justify-content: space-between; }
    .top-item-name { font-size: 13px; }
    .top-item-qty { font-size: 13px; color: var(--text-muted); }
  `],
  template: `
    <div class="page-header"><h1>Dashboard</h1></div>

    @if (loading()) {
      <div class="loading"><div class="spinner"></div></div>
    } @else if (analytics()) {
      <div class="stats">
        <div class="card stat">
          <div class="stat-label">Today's Revenue</div>
          <div class="stat-value">{{ analytics()!.todayRevenue | currency:'INR':'symbol':'1.0-0' }}</div>
        </div>
        <div class="card stat">
          <div class="stat-label">Today's Orders</div>
          <div class="stat-value">{{ analytics()!.todayOrders }}</div>
        </div>
        <div class="card stat">
          <div class="stat-label">Active Tables</div>
          <div class="stat-value">{{ analytics()!.activeTables }}</div>
        </div>
        <div class="card stat">
          <div class="stat-label">Total Customers</div>
          <div class="stat-value">{{ analytics()!.totalCustomers }}</div>
        </div>
      </div>

      <div class="charts">
        <div class="card chart-card">
          <h3>Weekly Revenue</h3>
          <div class="bar-chart">
            @for (day of analytics()!.weeklyRevenue; track day.date) {
              <div class="bar-col">
                <div class="bar" [style.height.px]="barHeight(day.revenue)"></div>
                <div class="bar-label">{{ shortDay(day.date) }}</div>
              </div>
            }
          </div>
        </div>
        <div class="card chart-card">
          <h3>Top Items</h3>
          <div class="top-items">
            @for (item of analytics()!.topItems.slice(0, 5); track item.menuItemId) {
              <div class="top-item">
                <span class="top-item-name">{{ item.name }}</span>
                <span class="top-item-qty">×{{ item.quantitySold }}</span>
              </div>
            }
          </div>
        </div>
      </div>
    } @else if (error()) {
      <div class="card"><p style="color: var(--danger)">{{ error() }}</p></div>
    }
  `
})
export class DashboardComponent implements OnInit {
  private billing = inject(BillingService);
  analytics = signal<DashboardAnalytics | null>(null);
  loading = signal(true);
  error = signal('');

  ngOnInit(): void {
    this.billing.getDashboardAnalytics().subscribe({
      next: data => { this.analytics.set(data); this.loading.set(false); },
      error: (err: Error) => { this.error.set(err.message); this.loading.set(false); }
    });
  }

  barHeight(rev: number): number {
    const max = Math.max(...(this.analytics()?.weeklyRevenue.map(d => d.revenue) ?? [1]));
    return max === 0 ? 4 : Math.max(4, (rev / max) * 100);
  }

  shortDay(date: string): string {
    return new Date(date).toLocaleDateString('en', { weekday: 'short' });
  }
}
