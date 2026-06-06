import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { OrderService } from '../../core/services/order.service';
import { SettingsService } from '../../core/services/settings.service';
import { Order } from '../../core/models/order.model';
import { IconComponent } from '../../core/components/icon.component';

const STATUS_FILTERS = [
  { value: '',           label: 'All' },
  { value: 'pending',    label: 'Pending' },
  { value: 'confirmed',  label: 'Confirmed' },
  { value: 'preparing',  label: 'Preparing' },
  { value: 'ready',      label: 'Ready' },
  { value: 'served',     label: 'Served' },
  { value: 'paid',       label: 'Paid' },
  { value: 'cancelled',  label: 'Cancelled' },
];

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [IconComponent, RouterLink],
  styles: [`
    .wrap { display: flex; flex-direction: column; gap: 22px; }

    /* Filter bar */
    .filter-bar { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
    .filter-tabs { display: flex; border: 1px solid #E8DBBF; border-radius: 8px; background: #fff; padding: 4px; gap: 2px; }
    .filter-btn { height: 32px; padding: 0 12px; border-radius: 6px; border: none; background: none; font-size: 11px; font-weight: 500; color: #7A7060; cursor: pointer; transition: all .12s; font-family: var(--font-body);
      &:hover { background: #FBF6EC; }
      &.active { background: #F7EDD8; color: #8A6A24; }
    }
    .refresh-btn { display: flex; align-items: center; gap: 6px; height: 34px; padding: 0 14px; border-radius: 8px; border: 1px solid #E8DBBF; background: #fff; font-size: 12px; font-weight: 500; color: #7A7060; cursor: pointer; font-family: var(--font-body); transition: background .12s;
      &:hover { background: #FBF6EC; }
    }

    /* Section card */
    .sc { border-radius: 12px; border: 1px solid #E8DBBF; background: #fff; overflow: hidden; }
    .sc-head { display: flex; align-items: center; justify-content: space-between; min-height: 54px; padding: 0 20px; border-bottom: 1px solid #E8DBBF; }
    .sc-title { font-family: var(--font-heading); font-size: 16px; font-weight: 600; color: #1A1A1A; margin: 0; }

    /* Table */
    .data-table { width: 100%; border-collapse: collapse; }
    .data-table thead tr { background: #FAFAF7; text-align: left; }
    .data-table th { padding: 10px 16px; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.14em; color: #A8998A; }
    .data-table td { padding: 12px 16px; font-size: 12px; color: #1A1A1A; }
    .data-table tr:not(:first-child) td { border-top: 1px solid #E8DBBF; }
    .data-table tr:hover td { background: #FBF6EC; }
    .td-bold { font-weight: 600; }
    .td-med  { font-weight: 500; }
    .td-muted { color: #7A7060; }

    /* Status badge */
    .sb { display: inline-flex; align-items: center; border-radius: 10px; border: 1px solid; padding: 3px 8px; font-size: 9px; font-weight: 700; line-height: 1; letter-spacing: 0.04em; text-transform: uppercase;
      &.new        { background: #F7EDD8; color: #8A6A24; border-color: #E8DBBF; }
      &.pending    { background: #F7EDD8; color: #8A6A24; border-color: #E8DBBF; }
      &.confirmed  { background: #FEF3C7; color: #92400E; border-color: #FEF3C7; }
      &.preparing  { background: #FEF3C7; color: #92400E; border-color: #FEF3C7; }
      &.ready      { background: #EBF7ED; color: #2A7A3A; border-color: #EBF7ED; }
      &.bill       { background: #FEF3C7; color: #92400E; border-color: #FEF3C7; }
      &.served     { background: #EBF0F9; color: #2A5A9A; border-color: #EBF0F9; }
      &.paid       { background: #EBF7ED; color: #2A7A3A; border-color: #C3E6CB; }
      &.cancelled  { background: #FBEAEA; color: #B03030; border-color: #FBEAEA; }
    }

    /* Empty / loading */
    .empty-state { padding: 48px 24px; text-align: center; color: #7A7060; p { margin: 8px 0 0; font-size: 13px; } }
    .row-actions { display: flex; gap: 6px; flex-wrap: wrap; }
    .action-btn { min-height: 28px; border-radius: 6px; border: 1px solid #E8DBBF; background: #fff; color: #7A7060; padding: 0 9px; font-size: 11px; cursor: pointer; font-family: var(--font-body); display: inline-flex; align-items: center; gap: 4px; }
    .action-btn:hover { background: #FBF6EC; color: #8A6A24; }
    .action-btn.gold { border-color: #B8923A; color: #8A6A24; background: #FBF6EC; }
    .action-btn.danger { color: #B03030; }
    .loading-center { display: flex; align-items: center; justify-content: center; padding: 48px; }
    .spinner { width: 28px; height: 28px; border: 2px solid #E8DBBF; border-top-color: #B8923A; border-radius: 50%; animation: spin .7s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ── Responsive ── */
    @media (max-width: 768px) {
      .filter-bar       { flex-direction: column; align-items: stretch; }
      .filter-tabs      { overflow-x: auto; flex-wrap: nowrap; }
      .filter-btn       { flex-shrink: 0; white-space: nowrap; }
      .sc               { overflow-x: auto; }
      .data-table       { min-width: 600px; }
      .drawer           { width: 100vw; }
    }

    /* Clickable row */
    .data-table tbody tr { cursor: pointer; }

    /* Order detail drawer */
    .drawer-backdrop { position: fixed; inset: 0; z-index: 50; background: rgba(26,26,26,0.32); }
    @keyframes drawerIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
    .drawer {
      position: fixed; top: 0; right: 0; bottom: 0;
      width: min(460px, 100vw);
      background: #fff;
      border-left: 1px solid #E8DBBF;
      display: flex; flex-direction: column;
      z-index: 51;
      animation: drawerIn 200ms ease-out;
    }
    .drawer-head {
      display: flex; align-items: flex-start; justify-content: space-between;
      padding: 20px 20px 16px;
      border-bottom: 1px solid #E8DBBF;
      flex-shrink: 0;
    }
    .drawer-title { font-family: var(--font-heading); font-size: 18px; font-weight: 600; color: #1A1A1A; }
    .drawer-sub { font-size: 12px; color: #7A7060; margin-top: 4px; }
    .drawer-close {
      width: 32px; height: 32px; border-radius: 8px; border: 1px solid #E8DBBF;
      background: #fff; cursor: pointer; color: #7A7060; display: flex; align-items: center; justify-content: center;
      font-size: 16px; flex-shrink: 0;
      &:hover { background: #FBF6EC; color: #8A6A24; }
    }
    .drawer-body { flex: 1; overflow-y: auto; padding: 16px 20px; display: flex; flex-direction: column; gap: 16px; }
    .dsec { border-radius: 10px; border: 1px solid #E8DBBF; overflow: hidden; }
    .dsec-label { padding: 8px 14px; background: #FAFAF7; border-bottom: 1px solid #E8DBBF; font-size: 10px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: #A8998A; }
    .di-row { display: flex; align-items: flex-start; padding: 10px 14px; gap: 10px; }
    .di-row + .di-row { border-top: 1px solid #E8DBBF; }
    .di-name { flex: 1; min-width: 0; font-size: 13px; color: #1A1A1A; line-height: 1.4; }
    .di-variant { font-size: 11px; color: #7A7060; }
    .di-note { margin-top: 3px; font-size: 11px; color: #92400E; background: #FEF3C7; border-radius: 4px; padding: 2px 6px; display: inline-block; }
    .di-right { text-align: right; flex-shrink: 0; }
    .di-qty { font-size: 11px; color: #A8998A; }
    .di-price { font-size: 13px; font-weight: 600; color: #1A1A1A; margin-top: 2px; }
    .total-row { display: flex; justify-content: space-between; padding: 8px 14px; font-size: 13px; color: #1A1A1A; }
    .total-row + .total-row { border-top: 1px solid #E8DBBF; }
    .total-row.discount span:last-child { color: #2A7A3A; }
    .total-row.grand { background: #FBF6EC; font-weight: 700; font-size: 14px; color: #8A6A24; }
    .cust-row { display: flex; align-items: center; gap: 10px; padding: 10px 14px; }
    .cust-avatar { width: 32px; height: 32px; border-radius: 50%; background: #F7EDD8; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; color: #8A6A24; flex-shrink: 0; }
    .cust-name { font-size: 13px; font-weight: 500; color: #1A1A1A; }
    .cust-phone { font-size: 11px; color: #7A7060; }
    .drawer-actions { display: flex; flex-direction: column; gap: 8px; }
    .daction-btn { height: 40px; border-radius: 8px; border: 1px solid; background: transparent; font-size: 13px; font-weight: 500; cursor: pointer; font-family: var(--font-body); transition: background .12s;
      &.primary { border-color: #B8923A; background: #B8923A; color: #fff; &:hover { background: #A07830; } }
      &.secondary { border-color: #E8DBBF; color: #7A7060; &:hover { background: #FBF6EC; } }
      &.danger { border-color: #FBEAEA; color: #B03030; &:hover { background: #FBEAEA; } }
    }
  `],
  template: `
    @if (selectedOrder()) {
      <div class="drawer-backdrop" (click)="selectedOrder.set(null)">
        <div class="drawer" (click)="$event.stopPropagation()">
          <div class="drawer-head">
            <div>
              <div class="drawer-title">#{{ selectedOrder()!.id.slice(0,8).toUpperCase() }}</div>
              <div class="drawer-sub">Table {{ selectedOrder()!.tableNumber }} &nbsp;·&nbsp; {{ fmtDate(selectedOrder()!.createdAt) }}</div>
            </div>
            <div style="display:flex;align-items:center;gap:10px">
              <span class="sb {{ selectedOrder()!.status }}">{{ selectedOrder()!.status }}</span>
              <button class="drawer-close" (click)="selectedOrder.set(null)">✕</button>
            </div>
          </div>

          <div class="drawer-body">
            @if (selectedOrder()!.customerName) {
              <div class="dsec">
                <div class="dsec-label">Customer</div>
                <div class="cust-row">
                  <div class="cust-avatar">{{ selectedOrder()!.customerName!.slice(0,1).toUpperCase() }}</div>
                  <div>
                    <div class="cust-name">{{ selectedOrder()!.customerName }}</div>
                    @if (selectedOrder()!.customerPhone) {
                      <div class="cust-phone">{{ selectedOrder()!.customerPhone }}</div>
                    }
                  </div>
                </div>
              </div>
            }

            <div class="dsec">
              <div class="dsec-label">Items ({{ selectedOrder()!.items.length }})</div>
              @for (item of selectedOrder()!.items; track item.id) {
                <div class="di-row">
                  <div style="flex:1;min-width:0">
                    <div class="di-name">{{ item.menuItemName }}</div>
                    @if (item.variantName) { <div class="di-variant">{{ item.variantName }}</div> }
                    @if (item.specialInstructions) { <div class="di-note">{{ item.specialInstructions }}</div> }
                  </div>
                  <div class="di-right">
                    <div class="di-qty">×{{ item.quantity }}</div>
                    <div class="di-price">₹{{ (item.unitPrice * item.quantity).toLocaleString('en-IN') }}</div>
                  </div>
                </div>
              }
            </div>

            <div class="dsec">
              <div class="dsec-label">Totals</div>
              <div class="total-row"><span>Subtotal</span><span>₹{{ selectedOrder()!.subtotal.toLocaleString('en-IN') }}</span></div>
              @if (settingsSvc.gstEnabled() && selectedOrder()!.taxAmount > 0) {
                <div class="total-row"><span>GST ({{ settingsSvc.taxRate() }}%)</span><span>₹{{ selectedOrder()!.taxAmount.toLocaleString('en-IN') }}</span></div>
              }
              @if (selectedOrder()!.discountAmount > 0) {
                <div class="total-row discount"><span>Discount</span><span>-₹{{ selectedOrder()!.discountAmount.toLocaleString('en-IN') }}</span></div>
              }
              <div class="total-row grand"><span>Total</span><span>₹{{ effectiveTotal(selectedOrder()!).toLocaleString('en-IN') }}</span></div>
            </div>

            @if (selectedOrder()!.status !== 'served' && selectedOrder()!.status !== 'cancelled') {
              <div class="drawer-actions">
                @if (selectedOrder()!.status === 'pending') {
                  <button class="daction-btn primary" (click)="drawerSetStatus(selectedOrder()!, 'confirmed')">Confirm Order</button>
                }
                @if (selectedOrder()!.status === 'confirmed') {
                  <button class="daction-btn primary" (click)="drawerSetStatus(selectedOrder()!, 'preparing')">Start Preparing</button>
                }
                @if (selectedOrder()!.status === 'preparing') {
                  <button class="daction-btn primary" (click)="drawerSetStatus(selectedOrder()!, 'ready')">Mark Ready</button>
                }
                @if (selectedOrder()!.status === 'ready') {
                  <button class="daction-btn primary" (click)="drawerSetStatus(selectedOrder()!, 'served')">Mark Served</button>
                }
                <button class="daction-btn danger" (click)="drawerSetStatus(selectedOrder()!, 'cancelled')">Cancel Order</button>
              </div>
            }
          </div>
        </div>
      </div>
    }

    <div class="wrap">
      <div class="filter-bar">
        <div class="filter-tabs">
          @for (s of statuses; track s.value) {
            <button class="filter-btn" [class.active]="filter() === s.value"
                    (click)="setFilter(s.value)">{{ s.label }}</button>
          }
        </div>
        <button class="refresh-btn" (click)="load()">
          <app-icon name="refresh-cw" [size]="12" [sw]="1.8"></app-icon>
          Refresh
        </button>
      </div>

      <div class="sc">
        <div class="sc-head">
          <h2 class="sc-title">Live Orders</h2>
          @if (!loading()) {
            <span style="font-size:11px;color:#7A7060">{{ orders().length }} orders</span>
          }
        </div>

        @if (loading()) {
          <div class="loading-center"><div class="spinner"></div></div>
        } @else if (orders().length === 0) {
          <div class="empty-state">
            <p>No orders found.</p>
          </div>
        } @else {
          <table class="data-table">
            <thead>
              <tr>
                <th>Order</th><th>Table</th><th>Items</th>
                <th>Total</th><th>Status</th><th>Time</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (o of orders(); track o.id) {
                <tr (click)="selectedOrder.set(o)">
                  <td class="td-bold">#{{ o.id.slice(0,8).toUpperCase() }}</td>
                  <td>T{{ o.tableNumber }}</td>
                  <td>{{ o.items.length }}</td>
                  <td class="td-med">₹{{ effectiveTotal(o).toLocaleString('en-IN') }}</td>
                  <td><span class="sb {{ o.isPaid ? 'paid' : o.status }}">{{ o.isPaid ? 'paid' : o.status }}</span></td>
                  <td class="td-muted">{{ fmtDate(o.createdAt) }}</td>
                  <td>
                    <div class="row-actions">
                      @if (o.status === 'pending') {
                        <button class="action-btn gold" (click)="setStatus(o, 'confirmed')">Confirm</button>
                      }
                      @if (o.status === 'confirmed') {
                        <button class="action-btn" (click)="setStatus(o, 'preparing')">Prepare</button>
                      }
                      @if (o.status === 'preparing') {
                        <button class="action-btn" (click)="setStatus(o, 'ready')">Ready</button>
                      }
                      @if (o.status !== 'served' && o.status !== 'cancelled') {
                        <a class="action-btn gold" [routerLink]="['/billing', o.id]">
                          <app-icon name="receipt-text" [size]="12" [sw]="1.8"></app-icon>
                          Bill
                        </a>
                        <button class="action-btn danger" (click)="setStatus(o, 'cancelled')">Cancel</button>
                      }
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>
    </div>
  `
})
export class OrdersComponent implements OnInit {
  private orderService = inject(OrderService);
  readonly settingsSvc  = inject(SettingsService);
  orders        = signal<Order[]>([]);
  loading       = signal(true);
  filter        = signal('');
  selectedOrder = signal<Order | null>(null);
  readonly statuses = STATUS_FILTERS;

  ngOnInit(): void { this.load(); }
  setFilter(f: string): void { this.filter.set(f); this.load(); }

  load(): void {
    this.loading.set(true);
    const f = this.filter();
    // 'paid' is a virtual filter — fetch served orders and keep only paid ones
    const statusParam = f === 'paid' ? 'served' : (f || undefined);
    this.orderService.getAll(statusParam).subscribe({
      next: data => {
        let result = data;
        if (!f) {
          // "All" = active orders only (exclude paid and cancelled)
          result = data.filter(o => !o.isPaid && o.status !== 'cancelled');
        } else if (f === 'paid') {
          result = data.filter(o => o.isPaid);
        }
        this.orders.set(result);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  setStatus(order: Order, status: string): void {
    this.orderService.updateStatus(order.id, status).subscribe({
      next: updated => this.orders.update(list => list.map(o => o.id === updated.id ? updated : o))
    });
  }

  drawerSetStatus(order: Order, status: string): void {
    this.orderService.updateStatus(order.id, status).subscribe({
      next: updated => {
        this.orders.update(list => list.map(o => o.id === updated.id ? updated : o));
        this.selectedOrder.set(updated);
        if (status === 'cancelled' || status === 'served') {
          setTimeout(() => this.selectedOrder.set(null), 800);
        }
      }
    });
  }

  effectiveTotal(o: Order): number {
    return this.settingsSvc.gstEnabled() ? o.totalAmount : (o.subtotal - (o.discountAmount ?? 0));
  }

  fmtDate(d: string | Date): string {
    return new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }
}
