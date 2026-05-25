import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { BillingService } from '../../core/services/billing.service';
import { OrderService } from '../../core/services/order.service';
import { Order } from '../../core/models/order.model';
import { Invoice } from '../../core/models/invoice.model';

@Component({
  selector: 'app-billing',
  standalone: true,
  imports: [RouterLink, CurrencyPipe, DatePipe],
  styles: [`
    .billing-wrap { max-width: 640px; }
    .invoice-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
    .inv-num { font-size: 22px; font-weight: 700; }
    .order-section { margin-bottom: 20px; }
    .line-items { width: 100%; border-collapse: collapse; margin-bottom: 16px; td, th { padding: 8px 0; border-bottom: 1px solid var(--border); font-size: 13px; } }
    .total-row { font-size: 16px; font-weight: 700; color: var(--primary); }
    .actions { display: flex; gap: 12px; margin-top: 20px; }
  `],
  template: `
    <div class="billing-wrap">
      <div class="page-header">
        <h1>Billing</h1>
        <a routerLink="/orders" class="btn btn-ghost">← Orders</a>
      </div>

      @if (loading()) { <div class="loading"><div class="spinner"></div></div>
      } @else if (order()) {
        <div class="card order-section">
          <h3 style="margin:0 0 12px">Order #{{ order()!.id.slice(0,8) }} — Table {{ order()!.tableNumber }}</h3>
          <table class="line-items">
            <thead><tr><th style="text-align:left">Item</th><th>Qty</th><th style="text-align:right">Price</th><th style="text-align:right">Total</th></tr></thead>
            <tbody>
              @for (item of order()!.items; track item.id) {
                <tr>
                  <td>{{ item.menuItemName }}@if (item.variantName) { ({{ item.variantName }}) }</td>
                  <td style="text-align:center">{{ item.quantity }}</td>
                  <td style="text-align:right">{{ item.unitPrice | currency:'INR':'symbol':'1.0-0' }}</td>
                  <td style="text-align:right">{{ item.unitPrice * item.quantity | currency:'INR':'symbol':'1.0-0' }}</td>
                </tr>
              }
            </tbody>
            <tfoot>
              <tr><td colspan="3">Subtotal</td><td style="text-align:right">{{ order()!.subtotal | currency:'INR':'symbol':'1.0-0' }}</td></tr>
              <tr><td colspan="3">GST (5%)</td><td style="text-align:right">{{ order()!.taxAmount | currency:'INR':'symbol':'1.0-0' }}</td></tr>
              @if (order()!.discountAmount > 0) {
                <tr><td colspan="3">Discount</td><td style="text-align:right">-{{ order()!.discountAmount | currency:'INR':'symbol':'1.0-0' }}</td></tr>
              }
              <tr class="total-row"><td colspan="3">Total</td><td style="text-align:right">{{ order()!.totalAmount | currency:'INR':'symbol':'1.2-2' }}</td></tr>
            </tfoot>
          </table>
        </div>

        @if (invoice()) {
          <div class="card" style="margin-bottom:16px">
            <div class="invoice-header">
              <div>
                <div class="inv-num">{{ invoice()!.invoiceNumber }}</div>
                <div style="font-size:13px;color:var(--text-muted)">{{ invoice()!.createdAt | date:'dd MMM yyyy, HH:mm' }}</div>
              </div>
              <span class="badge badge-success">Invoice Generated</span>
            </div>
          </div>
        }

        <div class="actions">
          @if (!invoice()) {
            <button class="btn btn-primary" (click)="generate()">Generate Invoice</button>
          }
          @if (order()!.status !== 'served' && order()!.status !== 'cancelled') {
            <button class="btn btn-secondary" (click)="markServed()">Mark Served</button>
          }
        </div>
      }
    </div>
  `
})
export class BillingComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private orderService = inject(OrderService);
  private billingService = inject(BillingService);

  order = signal<Order | null>(null);
  invoice = signal<Invoice | null>(null);
  loading = signal(true);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('orderId')!;
    this.orderService.getById(id).subscribe({
      next: o => { this.order.set(o); this.loading.set(false); this.loadInvoice(id); },
      error: () => this.loading.set(false)
    });
  }

  loadInvoice(orderId: string): void {
    this.billingService.getInvoice(orderId).subscribe({ next: inv => this.invoice.set(inv), error: () => {} });
  }

  generate(): void {
    this.billingService.generateInvoice(this.order()!.id).subscribe({ next: inv => this.invoice.set(inv) });
  }

  markServed(): void {
    this.orderService.updateStatus(this.order()!.id, 'served').subscribe({ next: o => this.order.set(o) });
  }
}
