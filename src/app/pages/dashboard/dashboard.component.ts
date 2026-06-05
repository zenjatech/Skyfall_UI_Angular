import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { IconComponent } from '../../core/components/icon.component';
import { BillingService } from '../../core/services/billing.service';
import { OrderService } from '../../core/services/order.service';
import { KotService } from '../../core/services/kot.service';
import { TableService } from '../../core/services/table.service';
import { DashboardAnalytics, PaymentBreakdownItem } from '../../core/models/analytics.model';
import { Order } from '../../core/models/order.model';
import { KOT } from '../../core/models/kot.model';
import { CafeTable } from '../../core/models/table.model';

interface KpiCard { label: string; value: string; change: string; tone: string; icon: string; }
interface RevenueBar { day: string; height: number; label: string; today: boolean; future: boolean; }
interface KotCard { id: string; table: string; status: string; time: string; items: string; }
interface LiveOrderRow { id: string; table: string; itemCount: number; total: string; status: string; }
interface PayRow { mode: string; amount: string; percent: number; icon: string; color: string; }
interface TableCell { num: string; status: string; }

const MODE_META: Record<string, { icon: string; color: string }> = {
  upi:         { icon: 'smartphone',  color: '#B8923A' },
  cash:        { icon: 'wallet',      color: '#D4BF96' },
  debit_card:  { icon: 'credit-card', color: '#E8C97A' },
  credit_card: { icon: 'credit-card', color: '#8A6A24' },
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [IconComponent],
  styles: [`
    .dash { display: flex; flex-direction: column; gap: 22px; }

    /* KPI grid */
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }

    /* Row layouts */
    .row-chart-kot { display: grid; grid-template-columns: 1fr 360px; gap: 16px; }
    .row-orders-pay { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .row-items-map  { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

    /* Section card */
    .sc {
      border-radius: 12px;
      border: 1px solid #E8DBBF;
      background: #fff;
      overflow: hidden;
    }
    .sc-head {
      display: flex; align-items: center; justify-content: space-between;
      min-height: 54px; padding: 0 20px;
      border-bottom: 1px solid #E8DBBF;
    }
    .sc-title {
      font-family: var(--font-heading);
      font-size: 16px; font-weight: 600;
      color: #1A1A1A; margin: 0;
    }
    .sc-body { padding: 20px; }

    /* KPI card */
    .kc {
      border-radius: 12px;
      border: 1px solid #E8DBBF;
      background: #fff;
      padding: 18px 20px;
      transition: box-shadow .2s;
      &:hover { box-shadow: 0 8px 24px rgba(184,146,58,0.12); }
    }
    .kc-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
    .kc-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.14em; color: #A8998A; }
    .kc-value { margin-top: 8px; font-family: var(--font-heading); font-size: 26px; font-weight: 600; color: #1A1A1A; line-height: 1; }
    .kc-change { margin-top: 12px; font-size: 11px; font-weight: 600; color: #2A7A3A; display: flex; align-items: center; gap: 4px; }
    .kc-icon {
      width: 42px; height: 42px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
      &.gold  { background: #F7EDD8; color: #B8923A; }
      &.green { background: #EBF7ED; color: #2A7A3A; }
      &.blue  { background: #EBF0F9; color: #2A5A9A; }
      &.amber { background: #FEF3C7; color: #92400E; }
    }

    /* Revenue chart */
    .chart-legend { display: flex; align-items: center; gap: 16px; font-size: 10px; color: #7A7060; }
    .legend-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
    .bars { display: flex; align-items: flex-end; gap: 8px; height: 140px; }
    .bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; }
    .bar {
      width: 100%; max-width: 54px; border-radius: 8px 8px 0 0;
      background: #D4BF96;
      &.today { background: linear-gradient(180deg, #E8C97A, #B8923A); }
      &.future { opacity: 0.3; }
    }
    .bar-labels { margin-top: 12px; display: flex; gap: 8px; text-align: center; }
    .bar-labels > div { flex: 1; }
    .bar-day { font-size: 11px; font-weight: 600; color: #7A7060; &.today { color: #8A6A24; } }
    .bar-amt { margin-top: 4px; font-size: 10px; color: #A8998A; }
    .chart-total {
      margin-top: 20px; padding-top: 16px;
      border-top: 1px solid #E8DBBF;
      display: flex; align-items: center; justify-content: space-between;
    }
    .chart-total-label { font-size: 12px; font-weight: 500; color: #7A7060; }
    .chart-total-val { font-family: var(--font-heading); font-size: 24px; font-weight: 600; color: #B8923A; }

    /* KOT feed */
    .kot-list { display: flex; flex-direction: column; gap: 12px; padding: 16px; }
    .kot-card {
      border-radius: 12px;
      border: 1px solid #E8DBBF;
      background: #FBF6EC;
      padding: 14px 16px;
      transition: background .12s;
      &:hover { background: #F7EDD8; }
    }
    .kot-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
    .kot-id { font-size: 11px; font-weight: 600; color: #1A1A1A; }
    .kot-meta { margin-top: 4px; font-size: 10px; color: #7A7060; }
    .kot-items { margin-top: 10px; font-size: 12px; line-height: 1.5; color: #2C2816; }
    .live-tag { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.14em; color: #A8998A; }
    .kot-empty { padding: 24px 16px; font-size: 12px; color: #A8998A; text-align: center; }

    /* Status badge */
    .sb {
      display: inline-flex; align-items: center;
      border-radius: 10px; border: 1px solid;
      padding: 3px 8px;
      font-size: 9px; font-weight: 700; line-height: 1; letter-spacing: 0.04em;
      text-transform: uppercase;
      &.new        { background: #F7EDD8; color: #8A6A24; border-color: #E8DBBF; }
      &.acknowledged { background: #FEF3C7; color: #92400E; border-color: #FEF3C7; }
      &.pending    { background: #F7EDD8; color: #8A6A24; border-color: #E8DBBF; }
      &.confirmed  { background: #FEF3C7; color: #92400E; border-color: #FEF3C7; }
      &.preparing  { background: #FEF3C7; color: #92400E; border-color: #FEF3C7; }
      &.ready      { background: #EBF7ED; color: #2A7A3A; border-color: #EBF7ED; }
      &.bill       { background: #FEF3C7; color: #92400E; border-color: #FEF3C7; }
      &.served     { background: #EBF0F9; color: #2A5A9A; border-color: #EBF0F9; }
      &.cancelled  { background: #FEE2E2; color: #991B1B; border-color: #FEE2E2; }
    }

    /* Orders table */
    .data-table { width: 100%; border-collapse: collapse; }
    .data-table thead tr { background: #FAFAF7; }
    .data-table th { padding: 10px 16px; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.14em; color: #A8998A; text-align: left; }
    .data-table td { padding: 12px 16px; font-size: 12px; color: #1A1A1A; }
    .data-table tr:not(:first-child) td { border-top: 1px solid #E8DBBF; }
    .data-table tr:hover td { background: #FBF6EC; }
    .td-bold { font-weight: 600; }
    .td-med  { font-weight: 500; }
    .td-muted { color: #A8998A; }
    .empty-row td { text-align: center; color: #A8998A; padding: 24px 16px; }

    /* Payment breakdown */
    .pay-list { display: flex; flex-direction: column; gap: 20px; }
    .pay-row { display: flex; align-items: center; gap: 12px; }
    .pay-icon { width: 36px; height: 36px; border-radius: 10px; background: #F7EDD8; color: #8A6A24; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .pay-mode { width: 60px; font-size: 12px; font-weight: 500; color: #1A1A1A; text-transform: capitalize; }
    .pay-bar-bg { flex: 1; height: 6px; border-radius: 999px; background: #F4EFE6; }
    .pay-bar { height: 6px; border-radius: 999px; }
    .pay-pct { width: 36px; font-size: 11px; color: #7A7060; }
    .pay-amt { width: 80px; text-align: right; font-size: 12px; font-weight: 600; color: #8A6A24; }
    .pay-total { display: flex; align-items: center; justify-content: space-between; margin-top: 16px; padding-top: 16px; border-top: 1px solid #E8DBBF; }
    .pay-total-label { font-size: 12px; font-weight: 500; color: #7A7060; }
    .pay-total-val { font-family: var(--font-heading); font-size: 20px; font-weight: 600; color: #B8923A; }
    .pay-empty { font-size: 12px; color: #A8998A; text-align: center; padding: 20px 0; }

    /* Top items */
    .top-list { display: flex; flex-direction: column; gap: 16px; }
    .top-row { display: grid; grid-template-columns: 28px 28px 1fr; align-items: center; gap: 12px; }
    .rank-chip {
      width: 28px; height: 28px; border-radius: 8px; border: 1px solid;
      display: flex; align-items: center; justify-content: center;
      font-size: 11px; font-weight: 600;
      &.r1, &.r2 { background: #B8923A; border-color: #B8923A; color: #fff; }
      &.r3, &.r4 { background: #F7EDD8; border-color: #F7EDD8; color: #8A6A24; }
      &.r5        { background: #fff;    border-color: #D4BF96; color: #8A6A24; }
    }
    .item-emoji { font-size: 20px; line-height: 1; }
    .item-details { min-width: 0; }
    .item-name-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .item-name  { font-size: 12px; font-weight: 600; color: #1A1A1A; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .item-count { font-size: 11px; color: #7A7060; flex-shrink: 0; }
    .item-cat   { margin-top: 2px; font-size: 10px; color: #A8998A; }
    .item-bar-bg { margin-top: 6px; height: 6px; border-radius: 999px; background: #F4EFE6; }
    .item-bar   { height: 6px; border-radius: 999px; background: #B8923A; }

    /* Table map */
    .table-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; }
    .table-cell {
      aspect-ratio: 1;
      border-radius: 10px; border: 1px solid;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      text-align: center;
      &.free     { border-color: #E8DBBF; background: #fff;    color: #7A7060; }
      &.occupied { border-color: #E8DBBF; background: #FBF6EC; color: #8A6A24; }
      &.bill     { border-color: #FEF3C7; background: #FEF3C7; color: #92400E; }
      &.reserved { border-color: #EBF0F9; background: #EBF0F9; color: #2A5A9A; }
    }
    .table-num    { font-size: 12px; font-weight: 600; }
    .table-status { margin-top: 2px; font-size: 8px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; }
  `],
  template: `
    <div class="dash">

      <!-- KPI cards -->
      <div class="kpi-grid">
        @for (kpi of kpis(); track kpi.label) {
          <div class="kc">
            <div class="kc-row">
              <div>
                <div class="kc-label">{{ kpi.label }}</div>
                <div class="kc-value">{{ kpi.value }}</div>
                <div class="kc-change">{{ kpi.change }}</div>
              </div>
              <div class="kc-icon {{ kpi.tone }}">
                <app-icon [name]="kpi.icon" [size]="18" [sw]="1.8"></app-icon>
              </div>
            </div>
          </div>
        }
      </div>

      <!-- Revenue chart + KOT feed -->
      <div class="row-chart-kot">
        <div class="sc">
          <div class="sc-head">
            <h2 class="sc-title">Revenue This Week</h2>
            <div class="chart-legend">
              <span><span class="legend-dot" style="background:#B8923A"></span> Revenue</span>
            </div>
          </div>
          <div class="sc-body">
            <div class="bars">
              @for (bar of revenueBars(); track bar.day) {
                <div class="bar-col">
                  <div class="bar {{ bar.today ? 'today' : '' }} {{ bar.future ? 'future' : '' }}"
                       [style.height.px]="bar.height"></div>
                </div>
              }
            </div>
            <div class="bar-labels">
              @for (bar of revenueBars(); track bar.day) {
                <div>
                  <div class="bar-day {{ bar.today ? 'today' : '' }}">{{ bar.day }}</div>
                  <div class="bar-amt">{{ bar.label }}</div>
                </div>
              }
            </div>
            <div class="chart-total">
              <span class="chart-total-label">Week total</span>
              <span class="chart-total-val">{{ weekTotal() }}</span>
            </div>
          </div>
        </div>

        <div class="sc">
          <div class="sc-head">
            <h2 class="sc-title">KOT Feed</h2>
            <span class="live-tag">Live</span>
          </div>
          @if (kotCards().length === 0) {
            <div class="kot-empty">No active KOTs right now.</div>
          } @else {
            <div class="kot-list">
              @for (kot of kotCards(); track kot.id) {
                <div class="kot-card">
                  <div class="kot-header">
                    <div>
                      <div class="kot-id">{{ kot.id }}</div>
                      <div class="kot-meta">Table {{ kot.table }} · {{ kot.time }}</div>
                    </div>
                    <span class="sb {{ kot.status }}">{{ kot.status }}</span>
                  </div>
                  <div class="kot-items">{{ kot.items }}</div>
                </div>
              }
            </div>
          }
        </div>
      </div>

      <!-- Live orders + Payment breakdown -->
      <div class="row-orders-pay">
        <div class="sc">
          <div class="sc-head"><h2 class="sc-title">Live Orders</h2></div>
          <table class="data-table">
            <thead>
              <tr>
                <th>Order</th><th>Table</th><th>Items</th>
                <th>Total</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              @if (liveOrders().length === 0) {
                <tr class="empty-row"><td colspan="5">No active orders right now.</td></tr>
              } @else {
                @for (o of liveOrders(); track o.id) {
                  <tr>
                    <td class="td-bold">{{ o.id }}</td>
                    <td>T{{ o.table }}</td>
                    <td>{{ o.itemCount }}</td>
                    <td class="td-med">{{ o.total }}</td>
                    <td><span class="sb {{ o.status }}">{{ o.status }}</span></td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>

        <div class="sc">
          <div class="sc-head"><h2 class="sc-title">Payment Breakdown</h2></div>
          <div class="sc-body">
            @if (payments().length === 0) {
              <div class="pay-empty">No payments recorded today.</div>
            } @else {
              <div class="pay-list">
                @for (p of payments(); track p.mode) {
                  <div class="pay-row">
                    <div class="pay-icon">
                      <app-icon [name]="p.icon" [size]="16" [sw]="1.8"></app-icon>
                    </div>
                    <div class="pay-mode">{{ modeLabel(p.mode) }}</div>
                    <div class="pay-bar-bg">
                      <div class="pay-bar" [style.width.%]="p.percent" [style.background]="p.color"></div>
                    </div>
                    <div class="pay-pct">{{ p.percent }}%</div>
                    <div class="pay-amt">{{ p.amount }}</div>
                  </div>
                }
              </div>
              <div class="pay-total">
                <span class="pay-total-label">Total collected</span>
                <span class="pay-total-val">{{ totalCollected() }}</span>
              </div>
            }
          </div>
        </div>
      </div>

      <!-- Top items + Table map -->
      <div class="row-items-map">
        <div class="sc">
          <div class="sc-head"><h2 class="sc-title">Top Items</h2></div>
          <div class="sc-body">
            <div class="top-list">
              @for (item of topItems(); track item.rank) {
                <div class="top-row">
                  <div class="rank-chip r{{ item.rank }}">{{ item.rank }}</div>
                  <div class="item-emoji">{{ item.emoji }}</div>
                  <div class="item-details">
                    <div class="item-name-row">
                      <span class="item-name">{{ item.name }}</span>
                      <span class="item-count">{{ item.count }}</span>
                    </div>
                    <div class="item-cat">{{ item.category }}</div>
                    <div class="item-bar-bg">
                      <div class="item-bar" [style.width.%]="item.width"></div>
                    </div>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>

        <div class="sc">
          <div class="sc-head"><h2 class="sc-title">Table Map</h2></div>
          <div class="sc-body">
            <div class="table-grid">
              @for (t of tableMap(); track t.num) {
                <div class="table-cell {{ t.status }}">
                  <div class="table-num">{{ t.num }}</div>
                  <div class="table-status">{{ t.status }}</div>
                </div>
              }
            </div>
          </div>
        </div>
      </div>

    </div>
  `
})
export class DashboardComponent implements OnInit, OnDestroy {
  private billingSvc  = inject(BillingService);
  private orderSvc    = inject(OrderService);
  private kotSvc      = inject(KotService);
  private tableSvc    = inject(TableService);

  kpis        = signal<KpiCard[]>([]);
  revenueBars = signal<RevenueBar[]>([]);
  weekTotal   = signal('—');
  kotCards    = signal<KotCard[]>([]);
  liveOrders  = signal<LiveOrderRow[]>([]);
  payments    = signal<PayRow[]>([]);
  totalCollected = signal('—');
  topItems    = signal<{ rank: number; emoji: string; name: string; category: string; count: number; width: number }[]>([]);
  tableMap    = signal<TableCell[]>([]);

  private pollInterval?: ReturnType<typeof setInterval>;

  ngOnInit(): void {
    this.loadAll();
    this.pollInterval = setInterval(() => this.loadAll(), 30000);
  }

  ngOnDestroy(): void {
    if (this.pollInterval) clearInterval(this.pollInterval);
  }

  private loadAll(): void {
    this.billingSvc.getDashboardAnalytics().subscribe({ next: d => this.applyAnalytics(d), error: () => undefined });
    this.orderSvc.getActive().subscribe({ next: orders => this.applyOrders(orders), error: () => undefined });
    this.kotSvc.getAll().subscribe({ next: kots => this.applyKots(kots), error: () => undefined });
    this.tableSvc.getAll().subscribe({ next: tables => this.applyTables(tables), error: () => undefined });
  }

  private applyAnalytics(data: DashboardAnalytics): void {
    const avgBill = data.todayOrders > 0 ? data.todayRevenue / data.todayOrders : 0;
    this.kpis.set([
      { label: 'REVENUE',  value: this.money(data.todayRevenue), change: 'Today collected', tone: 'gold',  icon: 'indian-rupee' },
      { label: 'ORDERS',   value: String(data.todayOrders),      change: 'Orders today',    tone: 'green', icon: 'receipt-text' },
      { label: 'AVG BILL', value: this.money(avgBill),           change: 'Per order today', tone: 'blue',  icon: 'trending-up' },
      { label: 'TABLES',   value: String(data.activeTables),     change: 'Active tables',   tone: 'amber', icon: 'table-2' },
    ]);

    const max = Math.max(...data.weeklyRevenue.map(r => r.revenue), 1);
    this.revenueBars.set(data.weeklyRevenue.map((r, i) => ({
      day:    new Date(r.date).toLocaleDateString('en-IN', { weekday: 'short' }).slice(0, 3),
      height: Math.max(12, Math.round((r.revenue / max) * 112)),
      label:  this.money(r.revenue),
      today:  i === data.weeklyRevenue.length - 1,
      future: false,
    })));
    this.weekTotal.set(this.money(data.weeklyRevenue.reduce((s, r) => s + r.revenue, 0)));

    this.topItems.set(data.topItems.slice(0, 5).map((item, i) => ({
      rank:     i + 1,
      emoji:    '•',
      name:     item.name,
      category: 'Menu item',
      count:    item.quantitySold,
      width:    Math.max(12, Math.round((item.quantitySold / Math.max(data.topItems[0]?.quantitySold ?? 1, 1)) * 100)),
    })));

    const breakdown = data.paymentBreakdown ?? [];
    const total = breakdown.reduce((s, p) => s + p.amount, 0);
    this.payments.set(breakdown.map(p => {
      const meta = MODE_META[p.mode] ?? { icon: 'credit-card', color: '#B8923A' };
      return { mode: p.mode, amount: this.money(p.amount), percent: p.percent, icon: meta.icon, color: meta.color };
    }));
    this.totalCollected.set(this.money(total));
  }

  private applyOrders(orders: Order[]): void {
    const sorted = [...orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    this.liveOrders.set(sorted.slice(0, 5).map(o => ({
      id:        '#' + o.id.slice(0, 6).toUpperCase(),
      table:     String(o.tableNumber).padStart(2, '0'),
      itemCount: o.items.reduce((s, i) => s + i.quantity, 0),
      total:     this.money(o.totalAmount),
      status:    o.status,
    })));
  }

  private applyKots(kots: KOT[]): void {
    const active = kots
      .filter(k => k.status !== 'completed')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 3);

    this.kotCards.set(active.map(k => ({
      id:     'KOT-' + String(k.kotNumber).padStart(3, '0'),
      table:  'T' + String(k.tableNumber).padStart(2, '0'),
      status: k.status,
      time:   this.minAgo(k.createdAt),
      items:  this.parseKotItems(k.itemsJson),
    })));
  }

  private applyTables(tables: CafeTable[]): void {
    const sorted = [...tables].sort((a, b) => a.tableNumber - b.tableNumber);
    this.tableMap.set(sorted.map(t => ({
      num:    'T' + String(t.tableNumber).padStart(2, '0'),
      status: t.status === 'bill_requested' ? 'bill' : t.status,
    })));
  }

  modeLabel(mode: string): string {
    const labels: Record<string, string> = { upi: 'UPI', cash: 'Cash', debit_card: 'Debit', credit_card: 'Credit' };
    return labels[mode] ?? mode;
  }

  private parseKotItems(json: string): string {
    try {
      const items: Array<{ Name?: string; Quantity?: number }> = JSON.parse(json);
      return items.map(i => `${i.Name ?? '?'} x${i.Quantity ?? 1}`).join(', ');
    } catch { return json; }
  }

  private minAgo(iso: string): string {
    const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 1) return 'just now';
    return `${mins} min`;
  }

  private money(value: number): string {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
  }
}
