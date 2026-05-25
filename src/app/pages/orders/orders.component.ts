import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CurrencyPipe, DatePipe, TitleCasePipe } from '@angular/common';
import { OrderService } from '../../core/services/order.service';
import { Order } from '../../core/models/order.model';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [RouterLink, CurrencyPipe, DatePipe, TitleCasePipe],
  styles: [`
    .filter-bar { display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; }
    .status-badge { font-size: 11px; }
  `],
  template: `
    <div class="page-header">
      <h1>Orders</h1>
    </div>
    <div class="filter-bar">
      @for (s of statuses; track s.value) {
        <button class="btn" [class.btn-primary]="filter() === s.value" [class.btn-ghost]="filter() !== s.value" (click)="setFilter(s.value)">{{ s.label }}</button>
      }
    </div>

    @if (loading()) {
      <div class="loading"><div class="spinner"></div></div>
    } @else if (orders().length === 0) {
      <div class="empty-state card">📋<p>No orders found</p></div>
    } @else {
      <div class="card table-wrapper">
        <table>
          <thead>
            <tr><th>Order</th><th>Table</th><th>Status</th><th>Items</th><th>Total</th><th>Time</th><th>Actions</th></tr>
          </thead>
          <tbody>
            @for (order of orders(); track order.id) {
              <tr>
                <td>{{ order.id.slice(0,8) }}</td>
                <td>Table {{ order.tableNumber }}</td>
                <td><span class="badge status-badge" [class]="statusBadge(order.status)">{{ order.status | titlecase }}</span></td>
                <td>{{ order.items.length }} items</td>
                <td>{{ order.totalAmount | currency:'INR':'symbol':'1.2-2' }}</td>
                <td>{{ order.createdAt | date:'dd MMM, HH:mm' }}</td>
                <td>
                  <a [routerLink]="['/billing', order.id]" class="btn btn-secondary" style="font-size:12px;padding:4px 8px">Invoice</a>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  `
})
export class OrdersComponent implements OnInit {
  private orderService = inject(OrderService);
  orders = signal<Order[]>([]);
  loading = signal(true);
  filter = signal('');

  statuses = [
    { value: '', label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'preparing', label: 'Preparing' },
    { value: 'ready', label: 'Ready' },
    { value: 'served', label: 'Served' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  ngOnInit(): void { this.load(); }

  setFilter(f: string): void { this.filter.set(f); this.load(); }

  load(): void {
    this.loading.set(true);
    this.orderService.getAll(this.filter() || undefined).subscribe({
      next: data => { this.orders.set(data); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  statusBadge(status: string): string {
    return { pending: 'badge-warning', confirmed: 'badge-info', preparing: 'badge-warning',
      ready: 'badge-success', served: 'badge-neutral', cancelled: 'badge-danger' }[status] ?? 'badge-neutral';
  }
}
