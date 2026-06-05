import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { PublicService } from '../../core/services/public.service';
import { SettingsService } from '../../core/services/settings.service';
import { Order } from '../../core/models/order.model';
import { PublicBilling } from '../../core/models/payment.model';
import { IconComponent } from '../../core/components/icon.component';

type DisplayStatus = Order['status'] | 'paid';

const STEPS: Array<{ status: DisplayStatus; label: string; icon: string }> = [
  { status: 'pending', label: 'Order Received', icon: 'clipboard-list' },
  { status: 'confirmed', label: 'Confirmed', icon: 'check' },
  { status: 'preparing', label: 'Preparing', icon: 'chef-hat' },
  { status: 'ready', label: 'Ready', icon: 'bell' },
  { status: 'served', label: 'Served', icon: 'utensils-crossed' },
  { status: 'paid', label: 'Paid', icon: 'receipt-text' },
];

@Component({
  selector: 'app-order-track',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, IconComponent],
  styles: [`
    :host { display: block; min-height: 100vh; background: var(--background); }
    .track { max-width: 720px; margin: 0 auto; padding: 18px 16px 32px; }
    .brand { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 18px; }
    .brand-logo { width: 48px; height: 48px; object-fit: contain; }
    .brand-name { font-family: var(--font-heading); font-size: 22px; font-weight: 700; letter-spacing: .08em; color: var(--gold); }
    .live { display: inline-flex; align-items: center; gap: 7px; border: 1px solid var(--gold-border); background: var(--white); border-radius: 999px; padding: 5px 10px; color: var(--muted); font-size: 11px; }
    .live span { width: 7px; height: 7px; border-radius: 50%; background: var(--success); }
    .hero-card { border: 1px solid var(--gold-border); border-radius: 16px; background: var(--white); padding: 22px; text-align: center; }
    .status-orb { width: 76px; height: 76px; margin: 0 auto 14px; border-radius: 50%; border: 2px solid var(--gold); background: var(--gold-faint); color: var(--gold); display: grid; place-items: center; }
    .status-title { font-family: var(--font-heading); font-size: 28px; line-height: 1; margin: 0; }
    .status-sub { margin-top: 8px; color: var(--muted); font-size: 13px; }
    .ready-banner { margin-top: 14px; border-radius: 10px; background: var(--success-bg); color: var(--success); padding: 10px 12px; font-size: 13px; font-weight: 700; }
    .grid { display: grid; grid-template-columns: 1fr 280px; gap: 16px; margin-top: 16px; }
    .panel { border: 1px solid var(--gold-border); border-radius: 14px; background: var(--white); padding: 16px; }
    .panel h2 { margin: 0 0 14px; font-family: var(--font-heading); font-size: 18px; }
    .steps { display: grid; gap: 12px; }
    .step { display: grid; grid-template-columns: 36px minmax(0, 1fr); gap: 10px; align-items: center; }
    .step-icon { width: 36px; height: 36px; border-radius: 50%; border: 1px solid var(--gold-border); background: var(--white); color: var(--muted2); display: grid; place-items: center; }
    .step.done .step-icon, .step.current .step-icon { border-color: var(--gold); background: var(--gold-faint); color: var(--gold); }
    .step.current .step-label { color: var(--charcoal); font-weight: 800; }
    .step-label { font-size: 13px; color: var(--muted); }
    .items { display: grid; gap: 10px; }
    .item-row { display: flex; justify-content: space-between; gap: 12px; border-bottom: 1px solid var(--gold-border); padding-bottom: 9px; font-size: 13px; }
    .item-row:last-child { border-bottom: 0; padding-bottom: 0; }
    .bill-row { display: flex; justify-content: space-between; gap: 12px; margin-top: 8px; color: var(--muted); font-size: 13px; }
    .bill-row.total { margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--gold-border); color: var(--charcoal); font-family: var(--font-heading); font-size: 20px; font-weight: 700; }
    .empty { min-height: 60vh; display: grid; place-items: center; text-align: center; color: var(--muted); }
    @media (max-width: 760px) { .grid { grid-template-columns: 1fr; } }

    /* Download button */
    .download-bar { margin-top: 20px; display: flex; justify-content: center; }
    .dl-btn { display: inline-flex; align-items: center; gap: 8px; height: 42px; padding: 0 22px; border-radius: 10px; border: 1.5px solid var(--gold); background: var(--gold-faint); color: var(--gold); font-size: 13px; font-weight: 600; cursor: pointer; font-family: var(--font-body); transition: background .12s;
      &:hover { background: var(--gold-cream); } }

    /* Print receipt — hidden on screen, shown only in print */
    .bill-print { display: none; }

    @media print {
      .track > *:not(.bill-print) { display: none !important; }
      .bill-print {
        display: block !important;
        font-family: 'Courier New', monospace;
        font-size: 12px;
        max-width: 300px;
        margin: 0 auto;
        padding: 8px;
        color: #000;
      }
      .bp-header { text-align: center; margin-bottom: 10px; }
      .bp-logo { width: 72px; height: 72px; object-fit: contain; display: block; margin: 0 auto 6px; }
      .bp-name { font-size: 18px; font-weight: 700; letter-spacing: .12em; }
      .bp-tagline { font-size: 10px; letter-spacing: .06em; margin-top: 2px; }
      .bp-sub { font-size: 11px; margin-top: 3px; }
      .bp-hr { border: none; border-top: 1px dashed #000; margin: 8px 0; }
      .bp-meta { font-size: 11px; line-height: 1.7; }
      .bp-items { width: 100%; border-collapse: collapse; }
      .bp-items td { padding: 3px 0; font-size: 12px; }
      .bp-totals { width: 100%; border-collapse: collapse; }
      .bp-totals td { padding: 2px 0; font-size: 12px; }
      .bp-grand td { border-top: 1px solid #000; padding-top: 5px; font-size: 14px; font-weight: 700; }
      .bp-r { text-align: right; }
      .bp-paid { text-align: center; font-size: 13px; font-weight: 700; letter-spacing: .08em; margin: 6px 0; }
      .bp-footer { text-align: center; font-size: 10px; margin-top: 8px; }
    }
  `],
  template: `
    <main class="track">
      <header class="brand">
        <img class="brand-logo" src="assets/logo.jpg" alt="Skyfall Lounge">
        <div class="live"><span class="live-dot"></span>{{ polling() ? 'Live updates' : 'Offline' }}</div>
      </header>

      @if (loading()) {
        <div class="empty"><div class="spinner"></div></div>
      } @else if (!order()) {
        <div class="empty">
          <div>
            <h1 style="font-family:var(--font-heading);color:var(--charcoal)">Order not found</h1>
            <p>Please ask the server to check this order.</p>
          </div>
        </div>
      } @else {
        <section class="hero-card">
          <div class="status-orb">
            <app-icon [name]="currentStep().icon" [size]="30" [sw]="1.8"></app-icon>
          </div>
          <h1 class="status-title">{{ currentStep().label }}</h1>
          <div class="status-sub">
            #{{ order()!.id.slice(0, 8).toUpperCase() }} · Table {{ order()!.tableNumber }}
            · {{ order()!.createdAt | date:'dd MMM, h:mm a' }}
          </div>
          @if (displayStatus() === 'ready') {
            <div class="ready-banner">Your order is ready. Please stay near your table.</div>
          }
          @if (displayStatus() === 'paid') {
            <div class="ready-banner">Payment complete. Thank you for visiting Skyfall.</div>
          }
        </section>

        <div class="grid">
          <section class="panel">
            <h2>Order Status</h2>
            <div class="steps">
              @for (step of steps; track step.status) {
                <div class="step" [class.done]="stepState(step.status) === 'done'" [class.current]="stepState(step.status) === 'current'">
                  <div class="step-icon"><app-icon [name]="step.icon" [size]="16" [sw]="1.9"></app-icon></div>
                  <div class="step-label">{{ step.label }}</div>
                </div>
              }
            </div>
          </section>

          <aside class="panel">
            <h2>Bill</h2>
            @if (billing()) {
              <div class="bill-row"><span>Subtotal</span><span>{{ billing()!.subtotal | currency:'INR':'symbol':'1.2-2' }}</span></div>
              @if (settingsSvc.gstEnabled() && billing()!.taxAmount > 0) {
                <div class="bill-row"><span>GST ({{ settingsSvc.taxRate() }}%)</span><span>{{ billing()!.taxAmount | currency:'INR':'symbol':'1.2-2' }}</span></div>
              }
              <div class="bill-row"><span>Paid</span><span>{{ billing()!.paidAmount | currency:'INR':'symbol':'1.2-2' }}</span></div>
              @if (totalTip() > 0) {
                <div class="bill-row" style="color:var(--success)"><span>Tips Received</span><span>{{ totalTip() | currency:'INR':'symbol':'1.2-2' }}</span></div>
              }
              <div class="bill-row total"><span>Due</span><span>{{ effectiveDue() | currency:'INR':'symbol':'1.2-2' }}</span></div>
            } @else {
              <div style="font-size:13px;color:var(--muted)">Bill will appear after staff generates it.</div>
            }
          </aside>
        </div>

        <section class="panel" style="margin-top:16px">
          <h2>Items</h2>
          <div class="items">
            @for (item of order()!.items; track item.id) {
              <div class="item-row">
                <span>{{ item.quantity }} x {{ item.menuItemName }}</span>
                <strong>{{ item.unitPrice * item.quantity | currency:'INR':'symbol':'1.0-0' }}</strong>
              </div>
            }
          </div>
        </section>

        @if (displayStatus() === 'paid' && billing()) {
          <div class="download-bar">
            <button class="dl-btn" (click)="printBill()">
              <app-icon name="download" [size]="14" [sw]="1.8"></app-icon>
              Download Bill PDF
            </button>
          </div>
        }

        <!-- Hidden receipt rendered only during print -->
        <section class="bill-print">
          <div class="bp-header">
            <img class="bp-logo" src="assets/logo.jpg" alt="Skyfall Lounge">
            <div class="bp-name">{{ settingsSvc.cafeName() }}</div>
            @if (settingsSvc.address()) { <div class="bp-sub">{{ settingsSvc.address() }}</div> }
            @if (settingsSvc.phone()) { <div class="bp-sub">{{ settingsSvc.phone() }}</div> }
          </div>
          <hr class="bp-hr">
          <div class="bp-meta">
            <div>Order #{{ order()!.id.slice(0,8).toUpperCase() }}</div>
            <div>Table {{ order()!.tableNumber }}</div>
            <div>{{ order()!.createdAt | date:'dd MMM yyyy, h:mm a' }}</div>
            @if (order()!.customerName) { <div>Customer: {{ order()!.customerName }}</div> }
          </div>
          <hr class="bp-hr">
          <table class="bp-items">
            <tbody>
              @for (item of order()!.items; track item.id) {
                <tr>
                  <td>{{ item.quantity }}x {{ item.menuItemName }}</td>
                  <td class="bp-r">₹{{ (item.unitPrice * item.quantity).toLocaleString('en-IN') }}</td>
                </tr>
              }
            </tbody>
          </table>
          @if (billing()) {
            <hr class="bp-hr">
            <table class="bp-totals">
              <tbody>
                <tr><td>Subtotal</td><td class="bp-r">₹{{ billing()!.subtotal.toLocaleString('en-IN') }}</td></tr>
                @if (settingsSvc.gstEnabled() && billing()!.taxAmount > 0) {
                  <tr><td>GST ({{ settingsSvc.taxRate() }}%)</td><td class="bp-r">₹{{ billing()!.taxAmount.toLocaleString('en-IN') }}</td></tr>
                }
                @if (billing()!.discountAmount > 0) {
                  <tr><td>Discount</td><td class="bp-r">-₹{{ billing()!.discountAmount.toLocaleString('en-IN') }}</td></tr>
                }
                <tr class="bp-grand"><td>TOTAL</td><td class="bp-r">₹{{ effectiveTotal().toLocaleString('en-IN') }}</td></tr>
                @if (totalTip() > 0) {
                  <tr><td>Tips Received</td><td class="bp-r">₹{{ totalTip().toLocaleString('en-IN') }}</td></tr>
                }
              </tbody>
            </table>
            <hr class="bp-hr">
            <div class="bp-paid">✓ PAID</div>
          }
          <div class="bp-footer">Thank you for visiting {{ settingsSvc.cafeName() }}!</div>
        </section>
      }
    </main>
  `
})
export class OrderTrackComponent implements OnInit, OnDestroy {
  private route      = inject(ActivatedRoute);
  private publicApi  = inject(PublicService);
  readonly settingsSvc = inject(SettingsService);
  order = signal<Order | null>(null);
  billing = signal<PublicBilling | null>(null);
  loading = signal(true);
  polling = signal(false);
  readonly steps = STEPS;
  private interval?: ReturnType<typeof setInterval>;

  totalTip = computed(() =>
    (this.billing()?.payments ?? []).reduce((sum, p) => sum + (p.tip ?? 0), 0)
  );

  effectiveTotal = computed(() => {
    const b = this.billing();
    if (!b) return 0;
    return this.settingsSvc.gstEnabled() ? b.totalAmount : (b.subtotal - b.discountAmount);
  });

  effectiveDue = computed(() => {
    const b = this.billing();
    if (!b) return 0;
    return this.settingsSvc.gstEnabled() ? b.dueAmount : (b.subtotal - b.discountAmount - b.paidAmount);
  });

  displayStatus = computed<DisplayStatus>(() => {
    const order = this.order();
    if (!order) return 'pending';
    if (this.billing()?.paymentStatus === 'paid' || (this.billing()?.dueAmount ?? 1) <= 0) return 'paid';
    return order.status;
  });

  currentStep = computed(() => STEPS.find(s => s.status === this.displayStatus()) ?? STEPS[0]);

  ngOnInit(): void {
    this.load();
    this.interval = setInterval(() => this.load(true), 3000);
  }

  ngOnDestroy(): void {
    if (this.interval) clearInterval(this.interval);
  }

  load(silent = false): void {
    const orderId = this.route.snapshot.paramMap.get('orderId')!;
    if (!silent) this.loading.set(true);
    this.polling.set(true);
    this.publicApi.getOrder(orderId).subscribe({
      next: order => {
        this.order.set(order);
        this.publicApi.getBilling(orderId).subscribe({ next: bill => this.billing.set(bill), error: () => this.billing.set(null) });
        this.loading.set(false);
      },
      error: () => {
        this.polling.set(false);
        this.loading.set(false);
      }
    });
  }

  printBill(): void { window.print(); }

  stepState(step: DisplayStatus): 'done' | 'current' | 'pending' {
    const order = ['pending', 'confirmed', 'preparing', 'ready', 'served', 'paid'];
    const current = order.indexOf(this.displayStatus());
    const target = order.indexOf(step);
    if (target < current) return 'done';
    if (target === current) return 'current';
    return 'pending';
  }
}
