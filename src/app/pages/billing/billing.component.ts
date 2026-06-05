import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BillingService } from '../../core/services/billing.service';
import { OrderService } from '../../core/services/order.service';
import { PaymentService } from '../../core/services/payment.service';
import { Order } from '../../core/models/order.model';
import { Invoice } from '../../core/models/invoice.model';
import { Payment } from '../../core/models/payment.model';
import { IconComponent } from '../../core/components/icon.component';

@Component({
  selector: 'app-billing',
  standalone: true,
  imports: [RouterLink, CurrencyPipe, FormsModule, IconComponent],
  styles: [`
    .billing-wrap { max-width: 980px; display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 18px; }
    .bill-card { border: 1px solid var(--gold-border); border-radius: 12px; background: var(--white); overflow: hidden; }
    .bill-head { display: flex; justify-content: space-between; gap: 16px; padding: 20px; border-bottom: 1px solid var(--gold-border); }
    .bill-title { font-family: var(--font-heading); font-size: 24px; font-weight: 600; margin: 0; }
    .bill-meta { margin-top: 6px; color: var(--muted); font-size: 12px; }
    .badge { display: inline-flex; align-items: center; border-radius: 999px; padding: 4px 10px; font-size: 10px; font-weight: 700; text-transform: uppercase; background: var(--gold-cream); color: #8A6A24; }
    .badge.success { background: var(--success-bg); color: var(--success); }
    .bill-body { padding: 18px 20px; }
    .line-table { width: 100%; border-collapse: collapse; }
    .line-table th { text-align: left; padding: 10px 0; color: var(--muted2); font-size: 10px; letter-spacing: .12em; text-transform: uppercase; }
    .line-table td { padding: 12px 0; border-top: 1px solid var(--gold-border); font-size: 13px; }
    .line-table td:nth-child(2), .line-table th:nth-child(2) { text-align: center; }
    .line-table td:last-child, .line-table th:last-child { text-align: right; }
    .summary { display: grid; gap: 10px; margin-top: 18px; padding-top: 16px; border-top: 1px solid var(--gold-border); }
    .sum-row { display: flex; justify-content: space-between; color: var(--muted); font-size: 13px; }
    .sum-row.total { color: var(--charcoal); font-size: 20px; font-family: var(--font-heading); font-weight: 600; }
    .side { display: flex; flex-direction: column; gap: 14px; }
    .panel { border: 1px solid var(--gold-border); border-radius: 12px; background: var(--white); padding: 16px; }
    .panel h2 { margin: 0 0 14px; font-family: var(--font-heading); font-size: 17px; }
    .pay-list { display: grid; gap: 8px; }
    .pay-row { display: flex; justify-content: space-between; gap: 12px; padding: 9px 0; border-bottom: 1px solid var(--gold-border); font-size: 12px; }
    .pay-row:last-child { border-bottom: 0; }
    .mode-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
    .mode-btn { min-height: 38px; border: 1px solid var(--gold-border); border-radius: 8px; background: var(--white); color: var(--muted); cursor: pointer; font-size: 12px; }
    .mode-btn.active { border-color: var(--gold); background: var(--gold-cream); color: #8A6A24; font-weight: 600; }
    .notice { border: 1px solid var(--gold-border); background: var(--gold-faint); color: var(--charcoal); border-radius: 8px; padding: 10px 12px; font-size: 12px; }
    .actions { display: grid; gap: 8px; margin-top: 14px; }
    .loading-center { min-height: 300px; }
    @media (max-width: 900px) { .billing-wrap { grid-template-columns: 1fr; } }
  `],
  template: `
    <div class="page-header">
      <h1>Billing</h1>
      <a routerLink="/orders" class="btn btn-ghost">
        <app-icon name="chevron-left" [size]="14" [sw]="1.8"></app-icon>
        Orders
      </a>
    </div>

    @if (loading()) {
      <div class="loading-center"><div class="spinner"></div></div>
    } @else if (order()) {
      <div class="billing-wrap">
        <section class="bill-card">
          <div class="bill-head">
            <div>
              <h2 class="bill-title">Table {{ order()!.tableNumber }}</h2>
              <div class="bill-meta">
                Order #{{ order()!.id.slice(0, 8).toUpperCase() }}
                @if (invoice()) { · Invoice {{ invoice()!.invoiceNumber }} }
              </div>
            </div>
            <span class="badge" [class.success]="dueAmount() <= 0">{{ dueAmount() <= 0 ? 'Paid' : order()!.status }}</span>
          </div>

          <div class="bill-body">
            <table class="line-table">
              <thead>
                <tr><th>Item</th><th>Qty</th><th>Rate</th><th>Total</th></tr>
              </thead>
              <tbody>
                @for (item of order()!.items; track item.id) {
                  <tr>
                    <td>
                      <strong>{{ item.menuItemName }}</strong>
                      @if (item.variantName) { <span style="color:var(--muted)"> · {{ item.variantName }}</span> }
                    </td>
                    <td>{{ item.quantity }}</td>
                    <td>{{ item.unitPrice | currency:'INR':'symbol':'1.0-0' }}</td>
                    <td>{{ item.unitPrice * item.quantity | currency:'INR':'symbol':'1.0-0' }}</td>
                  </tr>
                }
              </tbody>
            </table>

            <div class="summary">
              <div class="sum-row"><span>Subtotal</span><span>{{ order()!.subtotal | currency:'INR':'symbol':'1.2-2' }}</span></div>
              <div class="sum-row"><span>GST 5%</span><span>{{ order()!.taxAmount | currency:'INR':'symbol':'1.2-2' }}</span></div>
              @if (order()!.discountAmount > 0) {
                <div class="sum-row"><span>Discount</span><span>-{{ order()!.discountAmount | currency:'INR':'symbol':'1.2-2' }}</span></div>
              }
              <div class="sum-row"><span>Paid</span><span>{{ paidAmount() | currency:'INR':'symbol':'1.2-2' }}</span></div>
              <div class="sum-row total"><span>Due</span><span>{{ dueAmount() | currency:'INR':'symbol':'1.2-2' }}</span></div>
            </div>
          </div>
        </section>

        <aside class="side">
          <div class="panel">
            <h2>Payment</h2>
            <div class="mode-grid">
              @for (mode of modes; track mode.value) {
                <button class="mode-btn" [class.active]="paymentMode() === mode.value" (click)="paymentMode.set(mode.value)">
                  {{ mode.label }}
                </button>
              }
            </div>
            <div class="form-group" style="margin-top:14px">
              <label>Amount</label>
              <input type="number" [(ngModel)]="paymentAmount" min="0" step="1" />
            </div>
            <div class="actions">
              <button class="btn btn-gold" [disabled]="busy() || dueAmount() <= 0" (click)="recordPayment()">
                <app-icon name="wallet" [size]="14" [sw]="1.8"></app-icon>
                {{ busy() ? 'Recording...' : 'Record Payment' }}
              </button>
              <button class="btn btn-ghost" [disabled]="busy() || !!invoice()" (click)="generate()">
                <app-icon name="receipt-text" [size]="14" [sw]="1.8"></app-icon>
                Generate Invoice
              </button>
            </div>
          </div>

          <div class="panel">
            <h2>Payments</h2>
            @if (payments().length === 0) {
              <div style="font-size:12px;color:var(--muted)">No payments recorded yet.</div>
            } @else {
              <div class="pay-list">
                @for (p of payments(); track p.id) {
                  <div class="pay-row">
                    <span>{{ paymentLabel(p.mode) }}</span>
                    <strong>{{ p.amount | currency:'INR':'symbol':'1.2-2' }}</strong>
                  </div>
                }
              </div>
            }
          </div>

          @if (notice()) {
            <div class="notice">{{ notice() }}</div>
          }
        </aside>
      </div>
    }
  `
})
export class BillingComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private orderService = inject(OrderService);
  private billingService = inject(BillingService);
  private paymentService = inject(PaymentService);

  order = signal<Order | null>(null);
  invoice = signal<Invoice | null>(null);
  payments = signal<Payment[]>([]);
  loading = signal(true);
  busy = signal(false);
  notice = signal<string | null>(null);
  paymentMode = signal('cash');
  paymentAmount = 0;

  readonly modes = [
    { value: 'cash', label: 'Cash' },
    { value: 'upi', label: 'UPI' },
    { value: 'debit_card', label: 'Debit Card' },
    { value: 'credit_card', label: 'Credit Card' },
  ];

  paidAmount = computed(() => this.payments()
    .filter(p => p.status === 'success')
    .reduce((sum, p) => sum + p.amount, 0));

  dueAmount = computed(() => Math.max((this.order()?.totalAmount ?? 0) - this.paidAmount(), 0));

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('orderId')!;
    this.orderService.getById(id).subscribe({
      next: o => {
        this.order.set(o);
        this.paymentAmount = o.totalAmount;
        this.loading.set(false);
        this.loadInvoice(id);
        this.loadPayments(id);
      },
      error: (err: Error) => {
        this.loading.set(false);
        this.notice.set(err.message || 'Unable to load order.');
      }
    });
  }

  loadInvoice(orderId: string): void {
    this.billingService.getInvoice(orderId).subscribe({ next: inv => this.invoice.set(inv), error: () => undefined });
  }

  loadPayments(orderId: string): void {
    this.paymentService.getByOrder(orderId).subscribe({
      next: payments => {
        this.payments.set(payments);
        this.paymentAmount = this.dueAmount();
      },
      error: () => undefined
    });
  }

  generate(): void {
    if (!this.order()) return;
    this.busy.set(true);
    this.billingService.generateInvoice(this.order()!.id).subscribe({
      next: inv => {
        this.invoice.set(inv);
        this.busy.set(false);
        this.notice.set(`Invoice ${inv.invoiceNumber} generated.`);
      },
      error: (err: Error) => {
        this.busy.set(false);
        this.notice.set(err.message || 'Unable to generate invoice.');
      }
    });
  }

  recordPayment(): void {
    if (!this.order() || this.paymentAmount <= 0) return;
    this.busy.set(true);
    this.billingService.generateInvoice(this.order()!.id).subscribe({
      next: inv => {
        this.invoice.set(inv);
        this.paymentService.create({
          orderId: this.order()!.id,
          mode: this.paymentMode(),
          amount: Math.min(this.paymentAmount, this.dueAmount())
        }).subscribe({
          next: payment => {
            this.payments.update(list => [...list, payment]);
            this.paymentAmount = this.dueAmount();
            this.closeIfPaid();
          },
          error: (err: Error) => {
            this.busy.set(false);
            this.notice.set(err.message || 'Unable to record payment.');
          }
        });
      },
      error: (err: Error) => {
        this.busy.set(false);
        this.notice.set(err.message || 'Unable to generate invoice.');
      }
    });
  }

  private closeIfPaid(): void {
    if (!this.order()) return;
    if (this.dueAmount() > 0) {
      this.busy.set(false);
      this.notice.set('Partial payment recorded.');
      return;
    }

    this.orderService.updateStatus(this.order()!.id, 'served').subscribe({
      next: order => {
        this.order.set(order);
        this.busy.set(false);
        this.notice.set('Payment recorded and table closed.');
      },
      error: (err: Error) => {
        this.busy.set(false);
        this.notice.set(err.message || 'Payment recorded, but order could not be closed.');
      }
    });
  }

  paymentLabel(mode: string): string {
    return this.modes.find(m => m.value === mode)?.label ?? mode;
  }
}
