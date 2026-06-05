import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CurrencyPipe, UpperCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { OrderService } from '../../core/services/order.service';
import { BillingService } from '../../core/services/billing.service';
import { PaymentService } from '../../core/services/payment.service';
import { CustomerService } from '../../core/services/customer.service';
import { Order } from '../../core/models/order.model';
import { Invoice } from '../../core/models/invoice.model';
import { Payment } from '../../core/models/payment.model';
import { Customer } from '../../core/models/customer.model';
import { IconComponent } from '../../core/components/icon.component';

@Component({
  selector: 'app-payments',
  standalone: true,
  imports: [CurrencyPipe, UpperCasePipe, FormsModule, IconComponent],
  styles: [`
    /* ── Layout ── */
    .billing-layout {
      display: flex;
      gap: 20px;
      align-items: flex-start;
      min-height: calc(100vh - 160px);
    }

    /* ── Left panel ── */
    .billing-list-panel {
      width: 300px;
      flex-shrink: 0;
      border: 1px solid var(--gold-border);
      border-radius: var(--radius-card);
      background: var(--white);
      overflow: hidden;
    }

    /* Tabs */
    .billing-tabs {
      display: flex;
      border-bottom: 1px solid var(--gold-border);
    }
    .billing-tab {
      flex: 1;
      height: 44px;
      border: none;
      background: none;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      color: var(--muted);
      transition: background .12s, color .12s;
      border-bottom: 2px solid transparent;
      margin-bottom: -1px;
    }
    .billing-tab:hover { background: var(--gold-faint); }
    .billing-tab.active {
      background: var(--gold);
      color: var(--white);
      font-weight: 600;
    }

    /* Date section */
    .billing-date-section { padding: 14px; border-bottom: 1px solid var(--gold-border); }
    .billing-date-label { display: block; font-size: 10px; font-weight: 600; letter-spacing: .12em; text-transform: uppercase; color: var(--muted2); margin-bottom: 6px; }
    .billing-date-input {
      width: 100%;
      height: 38px;
      border: 1px solid var(--gold-border);
      border-radius: 8px;
      padding: 0 10px;
      font-size: 13px;
      background: var(--background);
      color: var(--charcoal);
      outline: none;
    }
    .billing-date-input:focus { border-color: var(--gold); box-shadow: 0 0 0 2px rgba(184,146,58,.14); }
    .billing-bills-count { margin-top: 7px; font-size: 11px; color: var(--muted); }

    /* Bill list */
    .billing-list { max-height: calc(100vh - 340px); overflow-y: auto; padding: 10px; display: flex; flex-direction: column; gap: 8px; }
    .bill-card {
      border: 1px solid var(--gold-border);
      border-radius: 10px;
      padding: 13px 14px;
      cursor: pointer;
      transition: background .12s, border-color .12s;
      background: var(--white);
    }
    .bill-card:hover { background: var(--gold-faint); }
    .bill-card.selected { background: #FDF4E3; border-color: var(--gold); }
    .bill-card-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 4px; }
    .bill-table-label { font-family: var(--font-heading); font-size: 15px; font-weight: 600; color: var(--charcoal); }
    .badge-paid   { background: var(--success-bg); color: var(--success); font-size: 9px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; padding: 2px 8px; border-radius: 999px; }
    .badge-active { background: var(--gold-cream); color: #8A6A24; font-size: 9px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; padding: 2px 8px; border-radius: 999px; }
    .bill-card-meta { font-size: 11px; color: var(--muted); margin-top: 2px; }
    .bill-card-amount { font-size: 13px; font-weight: 600; color: var(--charcoal); margin-top: 6px; text-align: right; }

    /* ── Right panel ── */
    .billing-detail-panel { flex: 1; min-width: 0; }
    .billing-empty-detail {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 360px;
      border: 1px dashed var(--gold-border);
      border-radius: var(--radius-card);
      color: var(--muted2);
      font-size: 13px;
    }

    /* Detail card */
    .billing-detail-card { border: 1px solid var(--gold-border); border-radius: var(--radius-card); background: var(--white); overflow: hidden; }

    /* Detail header */
    .billing-detail-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 14px;
      padding: 18px 20px;
      border-bottom: 1px solid var(--gold-border);
    }
    .billing-detail-title { font-family: var(--font-heading); font-size: 22px; font-weight: 600; color: var(--charcoal); margin: 0 0 6px; }
    .billing-detail-badges { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .badge-served  { background: var(--info-bg); color: var(--info); font-size: 9px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; padding: 3px 10px; border-radius: 999px; }
    .badge-pending { background: var(--gold-cream); color: #8A6A24; font-size: 9px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; padding: 3px 10px; border-radius: 999px; }
    .billing-detail-subtitle { font-size: 11px; color: var(--muted); margin-top: 5px; }
    .billing-close-btn {
      width: 28px; height: 28px;
      border: none; background: none;
      cursor: pointer; color: var(--muted);
      display: flex; align-items: center; justify-content: center;
      border-radius: 6px; flex-shrink: 0;
    }
    .billing-close-btn:hover { background: var(--gold-faint); color: var(--charcoal); }

    /* Invoice banner */
    .billing-invoice-banner {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 11px 20px;
      background: var(--success-bg);
      color: var(--success);
      font-size: 13px;
      font-weight: 500;
      border-bottom: 1px solid #C6E8CC;
    }

    /* Info row: customer + staff cards */
    .billing-info-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; padding: 16px 20px; border-bottom: 1px solid var(--gold-border); }
    .billing-info-card { border: 1px solid var(--gold-border); border-radius: 10px; padding: 14px; }
    .billing-info-card-title { font-size: 13px; font-weight: 600; color: var(--charcoal); margin-bottom: 12px; }
    .billing-info-field { margin-bottom: 10px; }
    .billing-info-field:last-child { margin-bottom: 0; }
    .billing-info-label { font-size: 9px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: var(--muted2); margin-bottom: 3px; }
    .billing-info-value { font-size: 13px; color: var(--charcoal); }
    .billing-info-value.gold { color: var(--gold); }

    /* Items + summary row */
    .billing-items-summary-row { display: grid; grid-template-columns: 1fr 280px; gap: 14px; padding: 16px 20px; }

    /* Order items card */
    .billing-items-card { border: 1px solid var(--gold-border); border-radius: 10px; overflow: hidden; }
    .billing-items-card-title { font-size: 12px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: var(--muted2); padding: 11px 14px; border-bottom: 1px solid var(--gold-border); background: var(--background); }
    .billing-items-table { width: 100%; border-collapse: collapse; }
    .billing-items-table th { padding: 9px 14px; text-align: left; font-size: 9px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: var(--muted2); background: var(--background); border-bottom: 1px solid var(--gold-border); }
    .billing-items-table th.center, .billing-items-table td.center { text-align: center; }
    .billing-items-table th.right, .billing-items-table td.right { text-align: right; }
    .billing-items-table td { padding: 11px 14px; font-size: 13px; color: var(--charcoal); border-bottom: 1px solid var(--gold-border); }
    .billing-items-table tr:last-child td { border-bottom: none; }

    /* Summary card */
    .billing-summary-card { border: 1px solid var(--gold-border); border-radius: 10px; padding: 14px; }
    .billing-summary-card-title { font-size: 12px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: var(--muted2); margin-bottom: 12px; }
    .billing-summary-row { display: flex; justify-content: space-between; gap: 8px; font-size: 13px; color: var(--muted); margin-bottom: 8px; }
    .billing-summary-row:last-of-type { margin-bottom: 0; }
    .billing-summary-divider { height: 1px; background: var(--gold-border); margin: 10px 0; }
    .billing-summary-row.total { font-family: var(--font-heading); font-size: 16px; font-weight: 600; color: var(--charcoal); }
    .billing-fully-paid-btn {
      display: flex; align-items: center; justify-content: center; gap: 6px;
      width: 100%; height: 36px;
      border: 1px solid var(--success); border-radius: 8px;
      background: var(--success-bg); color: var(--success);
      font-size: 12px; font-weight: 700;
      cursor: default; margin-top: 12px;
    }
    .billing-payments-received { margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--gold-border); }
    .billing-payments-label { font-size: 9px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: var(--muted2); margin-bottom: 8px; }
    .billing-payment-row { display: flex; justify-content: space-between; font-size: 13px; color: var(--charcoal); margin-bottom: 4px; }
    .billing-payment-row:last-child { margin-bottom: 0; }

    /* ── Record payment ── */
    .record-payment {
      margin: 0 20px 20px;
      border: 1.5px solid var(--gold-border);
      border-radius: 12px;
      padding: 16px;
      background: var(--gold-faint);
    }
    .record-payment-title {
      font-size: 12px; font-weight: 700; text-transform: uppercase;
      letter-spacing: .12em; color: var(--muted2); margin-bottom: 14px;
    }
    .mode-row {
      display: flex; gap: 8px; margin-bottom: 14px; flex-wrap: wrap;
    }
    .mode-btn {
      flex: 1; min-width: 60px; height: 34px;
      border: 1.5px solid var(--gold-border); border-radius: 8px;
      background: var(--white); color: var(--muted);
      font-size: 12px; font-weight: 500;
      cursor: pointer; transition: all .12s;
      font-family: var(--font-body);
      &:hover { border-color: var(--gold); color: var(--charcoal); }
      &.active { border-color: var(--gold); background: var(--gold-cream); color: #8A6A24; font-weight: 700; }
    }
    .amount-row {
      display: flex; align-items: center; gap: 10px;
    }
    .amount-label { font-size: 12px; color: var(--muted); white-space: nowrap; }
    .amount-input {
      flex: 1; height: 38px;
      border: 1.5px solid var(--gold-border); border-radius: 8px;
      padding: 0 12px; font-size: 14px; font-weight: 600;
      color: var(--charcoal); background: var(--white);
      outline: none; font-family: var(--font-body);
      &:focus { border-color: var(--gold); box-shadow: 0 0 0 2px rgba(184,146,58,.14); }
    }
    .collect-btn {
      display: flex; align-items: center; justify-content: center; gap: 7px;
      width: 100%; height: 40px; margin-top: 14px;
      border-radius: 10px; border: none;
      background: var(--gold); color: var(--white);
      font-size: 13px; font-weight: 700;
      cursor: pointer; font-family: var(--font-body);
      transition: opacity .12s;
      &:hover { opacity: .88; }
      &:disabled { opacity: .45; cursor: not-allowed; }
    }

    /* ── Responsive ── */
    @media (max-width: 1100px) {
      .billing-items-summary-row { grid-template-columns: 1fr; }
    }
    @media (max-width: 860px) {
      .billing-layout { flex-direction: column; }
      .billing-list-panel { width: 100%; }
      .billing-list { max-height: 320px; }
      .billing-info-row { grid-template-columns: 1fr; }
    }
  `],
  template: `
    <div class="billing-layout">

      <!-- ── Left: bill list panel ── -->
      <div class="billing-list-panel">

        <div class="billing-tabs">
          <button class="billing-tab" [class.active]="activeTab() === 'active'" (click)="setTab('active')">Active Orders</button>
          <button class="billing-tab" [class.active]="activeTab() === 'history'" (click)="setTab('history')">History</button>
        </div>

        <div class="billing-date-section">
          <label class="billing-date-label">Date</label>
          <input type="date" class="billing-date-input"
                 [ngModel]="selectedDate()" (ngModelChange)="selectedDate.set($event)" />
          <div class="billing-bills-count">
            {{ billsCount() }} bill{{ billsCount() !== 1 ? 's' : '' }} on this day
          </div>
        </div>

        @if (loading()) {
          <div class="loading-center"><div class="spinner"></div></div>
        } @else if (filteredOrders().length === 0) {
          <div style="padding:20px;text-align:center;font-size:12px;color:var(--muted2)">No bills on this day</div>
        } @else {
          <div class="billing-list">
            @for (order of filteredOrders(); track order.id) {
              <div class="bill-card" [class.selected]="selectedOrder()?.id === order.id" (click)="selectOrder(order)">
                <div class="bill-card-top">
                  <span class="bill-table-label">Table {{ order.tableNumber }}</span>
                  <span [class]="order.status === 'served' ? 'badge-paid' : 'badge-active'">
                    {{ order.status === 'served' ? 'Paid' : (order.status | uppercase) }}
                  </span>
                </div>
                <div class="bill-card-meta">{{ order.items.length }} item{{ order.items.length !== 1 ? 's' : '' }}</div>
                <div class="bill-card-meta">{{ timeAgo(order.createdAt) }}</div>
                <div class="bill-card-amount">{{ order.totalAmount | currency:'INR':'symbol':'1.2-2' }}</div>
              </div>
            }
          </div>
        }

      </div>

      <!-- ── Right: detail panel ── -->
      <div class="billing-detail-panel">

        @if (!selectedOrder()) {
          <div class="billing-empty-detail">Select a bill to view details</div>
        } @else if (detailLoading()) {
          <div class="billing-detail-card"><div class="loading-center"><div class="spinner"></div></div></div>
        } @else {
          <div class="billing-detail-card">

            <!-- Header -->
            <div class="billing-detail-head">
              <div>
                <h2 class="billing-detail-title">Table {{ selectedOrder()!.tableNumber }}</h2>
                <div class="billing-detail-badges">
                  <span [class]="selectedOrder()!.status === 'served' ? 'badge-served' : 'badge-pending'">
                    {{ selectedOrder()!.status }}
                  </span>
                  <span [class]="selectedOrder()!.status === 'served' ? 'badge-paid' : 'badge-active'">
                    {{ selectedOrder()!.status === 'served' ? 'Paid' : 'Unpaid' }}
                  </span>
                </div>
                <div class="billing-detail-subtitle">
                  {{ selectedOrder()!.items.length }} item{{ selectedOrder()!.items.length !== 1 ? 's' : '' }}
                  &middot; {{ timeAgo(selectedOrder()!.createdAt) }}
                </div>
              </div>
              <button class="billing-close-btn" (click)="closeDetail()">
                <app-icon name="x" [size]="16" [sw]="1.8"></app-icon>
              </button>
            </div>

            <!-- Invoice banner -->
            @if (selectedInvoice()) {
              <div class="billing-invoice-banner">
                <app-icon name="check-circle" [size]="14" [sw]="1.8"></app-icon>
                Bill finalised &middot; {{ selectedInvoice()!.invoiceNumber }}
              </div>
            }

            <!-- Customer + Staff -->
            <div class="billing-info-row">
              <div class="billing-info-card">
                <div class="billing-info-card-title">Customer</div>
                <div class="billing-info-field">
                  <div class="billing-info-label">Name</div>
                  <div class="billing-info-value">{{ selectedOrder()!.customerName || '—' }}</div>
                </div>
                <div class="billing-info-field">
                  <div class="billing-info-label">Mobile</div>
                  <div class="billing-info-value">{{ selectedOrder()!.customerPhone || '—' }}</div>
                </div>
                <div class="billing-info-field">
                  <div class="billing-info-label">Email</div>
                  <div class="billing-info-value">{{ selectedCustomer()?.email || '—' }}</div>
                </div>
              </div>
              <div class="billing-info-card">
                <div class="billing-info-card-title">Staff</div>
                <div class="billing-info-field">
                  <div class="billing-info-label">Order Placed By</div>
                  <div class="billing-info-value" [class.gold]="!selectedOrder()!.placedByStaffName">
                    {{ selectedOrder()!.placedByStaffName || 'Customer (self-service QR)' }}
                  </div>
                </div>
                <div class="billing-info-field">
                  <div class="billing-info-label">Bill Processed By</div>
                  <div class="billing-info-value">{{ selectedInvoice()?.billedByStaffName || '—' }}</div>
                </div>
              </div>
            </div>

            <!-- Order Items + Bill Summary -->
            <div class="billing-items-summary-row">

              <div class="billing-items-card">
                <div class="billing-items-card-title">Order Items</div>
                <table class="billing-items-table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th class="center">Qty</th>
                      <th class="right">Rate</th>
                      <th class="right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (item of selectedOrder()!.items; track item.id) {
                      <tr>
                        <td>
                          {{ item.menuItemName }}
                          @if (item.variantName) {
                            <span style="color:var(--muted)"> &middot; {{ item.variantName }}</span>
                          }
                        </td>
                        <td class="center">{{ item.quantity }}</td>
                        <td class="right">{{ item.unitPrice | currency:'INR':'symbol':'1.2-2' }}</td>
                        <td class="right">{{ item.quantity * item.unitPrice | currency:'INR':'symbol':'1.2-2' }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>

              <div class="billing-summary-card">
                <div class="billing-summary-card-title">Bill Summary</div>
                <div class="billing-summary-row">
                  <span>Subtotal</span>
                  <span>{{ selectedOrder()!.subtotal | currency:'INR':'symbol':'1.2-2' }}</span>
                </div>
                @if (selectedOrder()!.taxAmount > 0) {
                  <div class="billing-summary-row">
                    <span>Tax (GST)</span>
                    <span>{{ selectedOrder()!.taxAmount | currency:'INR':'symbol':'1.2-2' }}</span>
                  </div>
                }
                @if (selectedOrder()!.discountAmount > 0) {
                  <div class="billing-summary-row">
                    <span>Discount</span>
                    <span>-{{ selectedOrder()!.discountAmount | currency:'INR':'symbol':'1.2-2' }}</span>
                  </div>
                }
                <div class="billing-summary-divider"></div>
                <div class="billing-summary-row total">
                  <span>Total</span>
                  <span>{{ selectedOrder()!.totalAmount | currency:'INR':'symbol':'1.2-2' }}</span>
                </div>
                <div class="billing-summary-row">
                  <span>Paid</span>
                  <span>{{ paidAmount() | currency:'INR':'symbol':'1.2-2' }}</span>
                </div>
                @if (totalTip() > 0) {
                  <div class="billing-summary-row" style="color:var(--success)">
                    <span>Tips Received</span>
                    <span>{{ totalTip() | currency:'INR':'symbol':'1.2-2' }}</span>
                  </div>
                }

                @if (dueAmount() <= 0) {
                  <button class="billing-fully-paid-btn" type="button">
                    <app-icon name="check-circle" [size]="13" [sw]="1.8"></app-icon>
                    Fully Paid
                  </button>
                }

                @if (successPayments().length > 0) {
                  <div class="billing-payments-received">
                    <div class="billing-payments-label">Payments Received</div>
                    @for (p of successPayments(); track p.id) {
                      <div class="billing-payment-row">
                        <span>{{ paymentModeLabel(p.mode) }}</span>
                        <span>
                          {{ p.amount | currency:'INR':'symbol':'1.2-2' }}
                          @if (p.tip > 0) {
                            <span style="color:var(--success);font-size:11px;margin-left:4px">+{{ p.tip | currency:'INR':'symbol':'1.2-2' }} tip</span>
                          }
                        </span>
                      </div>
                    }
                  </div>
                }
              </div>

            </div>

            <!-- Record Payment (active orders only) -->
            @if (selectedOrder()!.status !== 'served' && selectedOrder()!.status !== 'cancelled') {
              <div class="record-payment">
                <div class="record-payment-title">Collect Payment</div>
                <div class="mode-row">
                  @for (m of paymentModes; track m.value) {
                    <button class="mode-btn" [class.active]="payMode() === m.value"
                            type="button" (click)="payMode.set(m.value)">
                      {{ m.label }}
                    </button>
                  }
                </div>
                <div class="amount-row">
                  <span class="amount-label">Amount (₹)</span>
                  <input class="amount-input" type="number" min="0" step="0.01"
                         [ngModel]="payAmount()" (ngModelChange)="payAmount.set($event)" />
                </div>
                <div class="amount-row">
                  <span class="amount-label">Tip (₹) <span style="font-weight:400;color:var(--muted2)">(optional)</span></span>
                  <input class="amount-input" type="number" min="0" step="0.01"
                         [ngModel]="payTip()" (ngModelChange)="payTip.set($event)" placeholder="0" />
                </div>
                <button class="collect-btn" type="button"
                        [disabled]="recording() || payAmount() <= 0"
                        (click)="recordPayment()">
                  @if (recording()) { Processing… }
                  @else if (payTip() > 0) { Collect ₹{{ payAmount() + payTip() }} (incl. ₹{{ payTip() }} tip) via {{ modeLabel(payMode()) }} }
                  @else { Collect ₹{{ payAmount() }} via {{ modeLabel(payMode()) }} }
                </button>
              </div>
            }

          </div>
        }

      </div>
    </div>
  `
})
export class PaymentsComponent implements OnInit {
  private orderService   = inject(OrderService);
  private billingService = inject(BillingService);
  private paymentService = inject(PaymentService);
  private customerService = inject(CustomerService);

  /* ── State ── */
  activeTab    = signal<'active' | 'history'>('history');
  selectedDate = signal<string>(new Date().toLocaleDateString('en-CA'));
  loading      = signal(true);

  allOrders       = signal<Order[]>([]);
  selectedOrder   = signal<Order | null>(null);
  selectedInvoice = signal<Invoice | null>(null);
  selectedPayments = signal<Payment[]>([]);
  selectedCustomer = signal<Customer | null>(null);
  detailLoading   = signal(false);

  /* ── Derived ── */
  filteredOrders = computed(() => {
    const tab  = this.activeTab();
    const date = this.selectedDate();
    return this.allOrders()
      .filter(o =>
        tab === 'active'
          ? o.status !== 'served' && o.status !== 'cancelled'
          : o.status === 'served'
      )
      .filter(o => {
        const orderDate = new Date(o.createdAt).toLocaleDateString('en-CA');
        return orderDate === date;
      });
  });

  billsCount = computed(() => this.filteredOrders().length);

  paidAmount = computed(() =>
    this.selectedPayments()
      .filter(p => p.status === 'success')
      .reduce((sum, p) => sum + p.amount, 0)
  );

  dueAmount = computed(() =>
    Math.max((this.selectedOrder()?.totalAmount ?? 0) - this.paidAmount(), 0)
  );

  successPayments = computed(() =>
    this.selectedPayments().filter(p => p.status === 'success')
  );

  totalTip = computed(() =>
    this.successPayments().reduce((sum, p) => sum + (p.tip ?? 0), 0)
  );

  /* ── Record payment ── */
  readonly paymentModes = [
    { value: 'cash',        label: 'Cash'   },
    { value: 'upi',         label: 'UPI'    },
    { value: 'debit_card',  label: 'Debit'  },
    { value: 'credit_card', label: 'Credit' },
  ];
  payMode    = signal('cash');
  payAmount  = signal(0);
  payTip     = signal(0);
  recording  = signal(false);

  modeLabel(mode: string): string {
    return this.paymentModes.find(m => m.value === mode)?.label ?? mode;
  }

  recordPayment(): void {
    const order = this.selectedOrder();
    if (!order || this.payAmount() <= 0 || this.recording()) return;
    this.recording.set(true);
    this.paymentService.create({ orderId: order.id, mode: this.payMode(), amount: this.payAmount(), tip: this.payTip() }).subscribe({
      next: () => {
        this.recording.set(false);
        // Refresh payments list and order list
        this.paymentService.getByOrder(order.id).subscribe(p => this.selectedPayments.set(p));
        this.orderService.getAll().subscribe(orders => {
          this.allOrders.set(orders);
          // Update selected order in case status changed to 'served'
          const updated = orders.find(o => o.id === order.id);
          if (updated) this.selectedOrder.set(updated);
        });
        this.payAmount.set(0);
        this.payTip.set(0);
      },
      error: () => this.recording.set(false)
    });
  }

  /* ── Lifecycle ── */
  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.orderService.getAll().subscribe({
      next:  orders => { this.allOrders.set(orders); this.loading.set(false); },
      error: ()     => this.loading.set(false)
    });
  }

  setTab(tab: 'active' | 'history'): void {
    this.activeTab.set(tab);
    this.selectedOrder.set(null);
  }

  selectOrder(order: Order): void {
    this.selectedOrder.set(order);
    this.selectedInvoice.set(null);
    this.selectedPayments.set([]);
    this.selectedCustomer.set(null);
    this.detailLoading.set(true);
    this.payMode.set('cash');
    this.payAmount.set(0);
    this.payTip.set(0);

    forkJoin({
      invoice:  this.billingService.getInvoice(order.id).pipe(catchError(() => of(null))),
      payments: this.paymentService.getByOrder(order.id).pipe(catchError(() => of([] as Payment[]))),
      customer: order.customerId
        ? this.customerService.getById(order.customerId).pipe(catchError(() => of(null)))
        : of(null),
    }).subscribe({
      next: ({ invoice, payments, customer }) => {
        this.selectedInvoice.set(invoice as Invoice | null);
        this.selectedPayments.set(payments as Payment[]);
        this.selectedCustomer.set(customer as Customer | null);
        this.detailLoading.set(false);
        // Pre-fill pay amount with remaining due
        const paid = (payments as Payment[]).filter(p => p.status === 'success').reduce((s, p) => s + p.amount, 0);
        const due  = Math.max(order.totalAmount - paid, 0);
        this.payAmount.set(due);
      },
      error: () => this.detailLoading.set(false)
    });
  }

  closeDetail(): void { this.selectedOrder.set(null); }

  timeAgo(dateStr: string): string {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const hours  = Math.floor(diffMs / 3_600_000);
    const mins   = Math.floor((diffMs % 3_600_000) / 60_000);
    if (hours > 0) return `${hours}h ${mins}m ago`;
    if (mins  > 0) return `${mins}m ago`;
    return 'just now';
  }

  paymentModeLabel(mode: string): string {
    const labels: Record<string, string> = {
      cash: 'Cash', upi: 'UPI',
      debit_card: 'Debit Card', credit_card: 'Credit Card'
    };
    return labels[mode] ?? mode;
  }
}
