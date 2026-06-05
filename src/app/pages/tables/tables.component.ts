import { CurrencyPipe } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { IconComponent } from '../../core/components/icon.component';
import { CafeTable } from '../../core/models/table.model';
import { Order } from '../../core/models/order.model';
import { Payment } from '../../core/models/payment.model';
import { OrderService } from '../../core/services/order.service';
import { PaymentService } from '../../core/services/payment.service';
import { TableService } from '../../core/services/table.service';

type TableStatus = CafeTable['status'];

type LiveTable = CafeTable & {
  liveStatus: TableStatus;
  orderId?: string;
  orderCreatedAt?: string;
};

type TableFormState = {
  open: boolean;
  mode: 'add' | 'edit';
  tableId: string | null;
  tableNumber: string;
  capacity: string;
  saving: boolean;
  error: string;
};

type DeleteState = {
  open: boolean;
  tableId: string;
  tableNumber: number;
  deleting: boolean;
  error: string;
};

const STATUS_CFG: Record<TableStatus, { bg: string; border: string; label: string; labelColor: string; labelBg: string; dot: string }> = {
  free: { bg: '#FFFFFF', border: '#C8E6CA', dot: '#2A7A3A', label: 'Free', labelColor: '#2A7A3A', labelBg: '#EBF7ED' },
  occupied: { bg: '#FBF6EC', border: '#D4BF96', dot: '#B8923A', label: 'Occupied', labelColor: '#8A6A24', labelBg: '#F7EDD8' },
  reserved: { bg: '#EBF0F9', border: '#9ABADF', dot: '#2A5A9A', label: 'Reserved', labelColor: '#1E4A8A', labelBg: '#DBEAFE' },
  bill_requested: { bg: '#FEF9EC', border: '#D97706', dot: '#D97706', label: 'Bill Req.', labelColor: '#92400E', labelBg: '#FEF3C7' },
};

function emptyForm(): TableFormState {
  return {
    open: false,
    mode: 'add',
    tableId: null,
    tableNumber: '',
    capacity: '4',
    saving: false,
    error: '',
  };
}

function emptyDelete(): DeleteState {
  return {
    open: false,
    tableId: '',
    tableNumber: 0,
    deleting: false,
    error: '',
  };
}

@Component({
  selector: 'app-tables',
  standalone: true,
  imports: [CurrencyPipe, FormsModule, IconComponent, RouterLink],
  styles: [':host { display: block; }'],
  template: `
    <div class="table-map-page">
      @if (notice()) {
        <div class="table-map-notice">{{ notice() }}</div>
      }

      <section class="table-map-stats" aria-label="Table status summary">
        <div class="table-map-legend">
          @for (s of stats(); track s.label) {
            <div class="table-map-stat">
              <span class="table-map-dot" [style.background]="s.dot"></span>
              <span class="table-map-stat-label">{{ s.label }}</span>
              <strong>{{ s.value }}</strong>
            </div>
          }
        </div>

        <div class="table-map-refresh-row">
          <div class="table-map-occupancy">
            Occupancy <strong>{{ occupancy() }}%</strong>
            <span>· {{ liveTables().length }} tables</span>
          </div>
          <button class="btn btn-ghost table-map-refresh" type="button" (click)="refresh()">
            <app-icon name="refresh-cw" [size]="12" [sw]="1.8"></app-icon>
            Refresh
          </button>
          <span class="table-map-time">{{ lastUpdatedLabel() }}</span>
        </div>
      </section>

      <div class="table-map-main">
        <section class="table-map-floor">
          <header class="table-map-floor-head">
            <div>
              <h2>Floor Plan</h2>
              <span>Click a table to view details</span>
            </div>
            <button class="btn btn-gold" type="button" (click)="openAddForm()">
              <app-icon name="plus" [size]="14" [sw]="1.8"></app-icon>
              Add Table
            </button>
          </header>

          <div class="table-map-floor-body">
            @if (loading()) {
              <div class="table-map-grid" aria-hidden="true">
                @for (i of skeletons; track i) {
                  <div class="table-map-skeleton"></div>
                }
              </div>
            } @else if (liveTables().length === 0) {
              <div class="table-map-empty">
                <span class="table-map-empty-icon">
                  <app-icon name="table-2" [size]="24" [sw]="1.7"></app-icon>
                </span>
                <p>No tables configured yet.</p>
                <button class="btn btn-gold" type="button" (click)="openAddForm()">
                  <app-icon name="plus" [size]="14" [sw]="1.8"></app-icon>
                  Add your first table
                </button>
              </div>
            } @else {
              <div class="table-map-grid">
                @for (t of liveTables(); track t.id) {
                  <div class="table-map-tile-wrap">
                    <button
                      class="table-map-tile"
                      type="button"
                      [class.selected]="selectedId() === t.id"
                      [style.background]="cfg(t.liveStatus).bg"
                      [style.border-color]="selectedId() === t.id ? '#B8923A' : cfg(t.liveStatus).border"
                      (click)="selectTable(t)">
                      <span class="table-map-number">{{ t.tableNumber }}</span>
                      <span class="table-map-capacity">
                        <app-icon name="users" [size]="9" [sw]="1.8"></app-icon>
                        {{ t.capacity }} pax
                      </span>
                      <span
                        class="table-map-status"
                        [style.background]="cfg(t.liveStatus).labelBg"
                        [style.color]="cfg(t.liveStatus).labelColor">
                        {{ cfg(t.liveStatus).label }}
                      </span>
                      @if (formatDuration(t.orderCreatedAt); as duration) {
                        <span class="table-map-duration" [style.color]="cfg(t.liveStatus).labelColor">
                          <app-icon name="clock" [size]="9" [sw]="1.8"></app-icon>
                          {{ duration }}
                        </span>
                      }
                    </button>

                    <div class="table-map-tile-actions">
                      <button type="button" title="Edit table" aria-label="Edit table" (click)="openEditForm(t, $event)">
                        <app-icon name="pen" [size]="11" [sw]="1.8"></app-icon>
                      </button>
                      <button type="button" title="Delete table" aria-label="Delete table" class="danger" (click)="openDeleteConfirm(t, $event)">
                        <app-icon name="trash-2" [size]="11" [sw]="1.8"></app-icon>
                      </button>
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        </section>

        @if (selectedTable(); as table) {
          <aside class="table-map-detail">
            <header class="table-map-detail-head">
              <div>
                <h2>Table {{ table.tableNumber }}</h2>
                <div class="table-map-detail-meta">
                  <span
                    class="table-map-status"
                    [style.background]="cfg(table.liveStatus).labelBg"
                    [style.color]="cfg(table.liveStatus).labelColor">
                    {{ cfg(table.liveStatus).label }}
                  </span>
                  <span>
                    <app-icon name="users" [size]="10" [sw]="1.8"></app-icon>
                    {{ table.capacity }} pax
                  </span>
                  @if (formatDuration(table.orderCreatedAt); as duration) {
                    <span>
                      <app-icon name="clock" [size]="10" [sw]="1.8"></app-icon>
                      {{ duration }}
                    </span>
                  }
                </div>
              </div>
              <div class="table-map-detail-actions">
                <button type="button" title="Edit table" aria-label="Edit table" (click)="openEditForm(table, $event)">
                  <app-icon name="pen" [size]="12" [sw]="1.8"></app-icon>
                </button>
                <button type="button" title="Delete table" aria-label="Delete table" class="danger" (click)="openDeleteConfirm(table, $event)">
                  <app-icon name="trash-2" [size]="12" [sw]="1.8"></app-icon>
                </button>
                <button type="button" title="Close panel" aria-label="Close panel" (click)="closePanel()">
                  <app-icon name="x" [size]="13" [sw]="1.8"></app-icon>
                </button>
              </div>
            </header>

            @if (table.liveStatus === 'free') {
              <div class="table-map-panel-empty success">
                <span><app-icon name="table-2" [size]="22" [sw]="1.7"></app-icon></span>
                <strong>Available</strong>
                <p>No active order</p>
              </div>
            } @else if (table.liveStatus === 'reserved') {
              <div class="table-map-panel-empty info">
                <span><app-icon name="clock" [size]="22" [sw]="1.7"></app-icon></span>
                <strong>Reserved</strong>
                <p>No order placed yet</p>
              </div>
            } @else {
              @if (activeOrder(); as order) {
                <div class="table-map-order">
                @if (order.customerName || order.customerPhone) {
                  <div class="table-map-customer">
                    <span>
                      <app-icon name="user-check" [size]="15" [sw]="1.8"></app-icon>
                    </span>
                    <div>
                      <strong>{{ order.customerName || 'Guest' }}</strong>
                      @if (order.customerPhone) {
                        <p>{{ order.customerPhone }}</p>
                      }
                    </div>
                  </div>
                }

                <div class="table-map-order-status">
                  <div>
                    <span>#{{ order.id.slice(-4).toUpperCase() }}</span>
                    <strong class="table-map-pill">{{ order.status }}</strong>
                  </div>
                  <strong class="table-map-pill" [class.success]="paymentState() === 'paid'" [class.warn]="paymentState() !== 'paid'">
                    {{ paymentStatusLabel() }}
                  </strong>
                </div>

                <div class="table-map-items">
                  <h3>Items</h3>
                  @for (item of order.items; track item.id) {
                    <div class="table-map-item">
                      <div>
                        <strong>{{ item.quantity }}x {{ item.menuItemName || 'Item' }}</strong>
                        @if (item.variantName) {
                          <p>{{ item.variantName }}</p>
                        }
                      </div>
                      <span>{{ item.quantity * item.unitPrice | currency:'INR':'symbol':'1.0-0' }}</span>
                    </div>
                  }
                </div>

                <div class="table-map-totals">
                  <div><span>Subtotal</span><strong>{{ order.subtotal | currency:'INR':'symbol':'1.2-2' }}</strong></div>
                  <div><span>Tax</span><strong>{{ order.taxAmount | currency:'INR':'symbol':'1.2-2' }}</strong></div>
                  @if (paidAmount() > 0) {
                    <div class="success"><span>Paid</span><strong>{{ paidAmount() | currency:'INR':'symbol':'1.2-2' }}</strong></div>
                  }
                  <div class="due">
                    <span>Due</span>
                    <strong>{{ dueAmount() | currency:'INR':'symbol':'1.2-2' }}</strong>
                  </div>
                </div>

                <div class="table-map-panel-buttons">
                  @if (order.status === 'ready') {
                    <button class="btn btn-ghost success" type="button" [disabled]="markingServed()" (click)="markServed()">
                      <app-icon name="chef-hat" [size]="14" [sw]="1.8"></app-icon>
                      {{ markingServed() ? 'Marking...' : 'Mark as Served' }}
                    </button>
                  }
                  <a class="btn btn-gold" [routerLink]="['/billing', order.id]">
                    <app-icon name="receipt-text" [size]="14" [sw]="1.8"></app-icon>
                    View Full Bill
                    <app-icon name="arrow-right" [size]="12" [sw]="1.8"></app-icon>
                  </a>
                  <a class="btn btn-ghost" routerLink="/pos">
                    <app-icon name="credit-card" [size]="14" [sw]="1.8"></app-icon>
                    Open POS
                  </a>
                </div>
                </div>
              } @else {
                <div class="table-map-panel-empty warn">
                  <span><app-icon name="utensils-crossed" [size]="22" [sw]="1.7"></app-icon></span>
                  <strong>Table is occupied</strong>
                  <p>Loading active order...</p>
                </div>
              }
            }
          </aside>
        }
      </div>
    </div>

    @if (form().open) {
      <div class="modal-backdrop" (click)="closeForm()">
        <section class="modal-panel table-map-modal" (click)="$event.stopPropagation()">
          <div class="table-map-modal-head">
            <h2>{{ formTitle() }}</h2>
            <button type="button" aria-label="Close modal" [disabled]="form().saving" (click)="closeForm()">
              <app-icon name="x" [size]="14" [sw]="1.8"></app-icon>
            </button>
          </div>

          <div class="form-group">
            <label>Table Number</label>
            <input
              type="number"
              min="1"
              inputmode="numeric"
              [ngModel]="form().tableNumber"
              (ngModelChange)="updateForm('tableNumber', $event)"
              (keydown.enter)="submitForm()" />
          </div>

          <div class="form-group">
            <label>Capacity (seats)</label>
            <input
              type="number"
              min="1"
              inputmode="numeric"
              [ngModel]="form().capacity"
              (ngModelChange)="updateForm('capacity', $event)"
              (keydown.enter)="submitForm()" />
          </div>

          @if (form().error) {
            <div class="table-map-form-error">{{ form().error }}</div>
          }

          <div class="modal-footer">
            <button class="btn btn-ghost" type="button" [disabled]="form().saving" (click)="closeForm()">Cancel</button>
            <button class="btn btn-gold" type="button" [disabled]="form().saving" (click)="submitForm()">
              {{ form().saving ? 'Saving...' : form().mode === 'add' ? 'Add Table' : 'Save Changes' }}
            </button>
          </div>
        </section>
      </div>
    }

    @if (deleteState().open) {
      <div class="modal-backdrop" (click)="closeDeleteConfirm()">
        <section class="modal-panel table-map-delete-modal" (click)="$event.stopPropagation()">
          <div class="table-map-delete-icon">
            <app-icon name="trash-2" [size]="22" [sw]="1.8"></app-icon>
          </div>
          <h2>Delete Table {{ deleteState().tableNumber }}?</h2>
          <p>This will remove the table from the floor plan. Tables with order history cannot be deleted.</p>

          @if (deleteState().error) {
            <div class="table-map-form-error">{{ deleteState().error }}</div>
          }

          <div class="modal-footer">
            <button class="btn btn-ghost" type="button" [disabled]="deleteState().deleting" (click)="closeDeleteConfirm()">Cancel</button>
            <button class="btn btn-danger" type="button" [disabled]="deleteState().deleting" (click)="confirmDelete()">
              {{ deleteState().deleting ? 'Deleting...' : 'Delete' }}
            </button>
          </div>
        </section>
      </div>
    }
  `
})
export class TablesComponent implements OnInit, OnDestroy {
  private tableService = inject(TableService);
  private orderService = inject(OrderService);
  private paymentService = inject(PaymentService);

  readonly skeletons = Array.from({ length: 12 }, (_, i) => i);

  tables = signal<CafeTable[]>([]);
  activeOrders = signal<Order[]>([]);
  payments = signal<Payment[]>([]);
  loading = signal(true);
  paymentsLoading = signal(false);
  selectedId = signal<string | null>(null);
  lastUpdated = signal<Date | null>(null);
  markingServed = signal(false);
  notice = signal<string | null>(null);
  form = signal<TableFormState>(emptyForm());
  deleteState = signal<DeleteState>(emptyDelete());

  private interval?: ReturnType<typeof setInterval>;
  private paymentOrderId: string | null = null;

  liveTables = computed<LiveTable[]>(() => {
    // Only non-served orders can promote a 'free' table to 'occupied'.
    // Served orders still provide orderId for the detail panel (via anyByTable).
    const promoteByTable = new Map<string, Order>();
    const anyByTable     = new Map<string, Order>();

    for (const order of this.activeOrders()) {
      const existing = anyByTable.get(order.tableId);
      if (!existing || order.createdAt > existing.createdAt) anyByTable.set(order.tableId, order);

      if (order.status !== 'served') {
        const existingP = promoteByTable.get(order.tableId);
        if (!existingP || order.createdAt > existingP.createdAt) promoteByTable.set(order.tableId, order);
      }
    }

    return this.tables()
      .map(t => {
        const promoter   = promoteByTable.get(t.id);
        const liveStatus = t.status === 'free' && promoter ? 'occupied' : t.status;
        const orderForId = (liveStatus === 'occupied' || liveStatus === 'bill_requested')
          ? anyByTable.get(t.id)
          : undefined;
        return {
          ...t,
          liveStatus,
          orderId: orderForId?.id,
          orderCreatedAt: orderForId?.createdAt,
        };
      })
      .sort((a, b) => a.tableNumber - b.tableNumber);
  });

  selectedTable = computed(() => this.liveTables().find(t => t.id === this.selectedId()) ?? null);

  activeOrder = computed(() => {
    const table = this.selectedTable();
    if (!table?.orderId) return null;
    return this.activeOrders().find(o => o.id === table.orderId) ?? null;
  });

  stats = computed(() => {
    const tables = this.liveTables();
    return [
      { label: 'Free', value: tables.filter(t => t.liveStatus === 'free').length, dot: STATUS_CFG.free.dot },
      { label: 'Occupied', value: tables.filter(t => t.liveStatus === 'occupied').length, dot: STATUS_CFG.occupied.dot },
      { label: 'Reserved', value: tables.filter(t => t.liveStatus === 'reserved').length, dot: STATUS_CFG.reserved.dot },
      { label: 'Bill Req.', value: tables.filter(t => t.liveStatus === 'bill_requested').length, dot: STATUS_CFG.bill_requested.dot },
    ];
  });

  occupancy = computed(() => {
    const tables = this.liveTables();
    if (!tables.length) return 0;
    return Math.round((tables.filter(t => t.liveStatus !== 'free').length / tables.length) * 100);
  });

  paidAmount = computed(() => this.payments()
    .filter(p => p.status === 'success')
    .reduce((sum, p) => sum + p.amount, 0));

  dueAmount = computed(() => Math.max((this.activeOrder()?.totalAmount ?? 0) - this.paidAmount(), 0));

  paymentState = computed<'paid' | 'partial' | 'unpaid'>(() => {
    if (!this.activeOrder()) return 'unpaid';
    if (this.dueAmount() <= 0) return 'paid';
    return this.paidAmount() > 0 ? 'partial' : 'unpaid';
  });

  ngOnInit(): void {
    this.load(true);
    this.interval = setInterval(() => this.load(), 5000);
  }

  ngOnDestroy(): void {
    if (this.interval) clearInterval(this.interval);
  }

  refresh(): void {
    this.load(true);
  }

  load(showSpinner = false): void {
    if (showSpinner || this.tables().length === 0) this.loading.set(true);

    forkJoin({
      tables: this.tableService.getAll(),
      orders: this.orderService.getActive(),
    }).subscribe({
      next: ({ tables, orders }) => {
        this.tables.set(tables);
        this.activeOrders.set(orders);
        this.lastUpdated.set(new Date());
        this.loading.set(false);
        this.notice.set(null);

        if (this.selectedId() && !tables.some(t => t.id === this.selectedId())) this.closePanel();
        this.refreshPaymentsForSelected();
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.notice.set(this.errorMessage(err, 'Unable to refresh table map.'));
      }
    });
  }

  cfg(status: TableStatus) {
    return STATUS_CFG[status] ?? STATUS_CFG.free;
  }

  selectTable(table: LiveTable): void {
    if (this.selectedId() === table.id) {
      this.closePanel();
      return;
    }

    this.selectedId.set(table.id);
    this.payments.set([]);
    this.refreshPaymentsForSelected();
  }

  closePanel(): void {
    this.selectedId.set(null);
    this.payments.set([]);
    this.paymentOrderId = null;
  }

  openAddForm(): void {
    this.form.set({ ...emptyForm(), open: true });
  }

  openEditForm(table: LiveTable, event?: MouseEvent): void {
    event?.stopPropagation();
    this.form.set({
      open: true,
      mode: 'edit',
      tableId: table.id,
      tableNumber: String(table.tableNumber),
      capacity: String(table.capacity),
      saving: false,
      error: '',
    });
  }

  closeForm(): void {
    if (this.form().saving) return;
    this.form.set(emptyForm());
  }

  updateForm(field: 'tableNumber' | 'capacity', value: string | number): void {
    this.form.update(f => ({ ...f, [field]: String(value), error: '' }));
  }

  submitForm(): void {
    const form = this.form();
    if (form.saving) return;

    const tableNumber = Number(form.tableNumber);
    const capacity = Number(form.capacity);

    if (!Number.isInteger(tableNumber) || tableNumber < 1) {
      this.setFormError('Table number must be a positive integer.');
      return;
    }

    if (!Number.isInteger(capacity) || capacity < 1) {
      this.setFormError('Capacity must be at least 1.');
      return;
    }

    this.form.update(f => ({ ...f, saving: true, error: '' }));

    const request = form.mode === 'add'
      ? this.tableService.create({ tableNumber, capacity })
      : this.tableService.update(form.tableId!, { tableNumber, capacity });

    request.subscribe({
      next: () => {
        this.form.set(emptyForm());
        this.load(true);
      },
      error: (err: unknown) => {
        this.form.update(f => ({
          ...f,
          saving: false,
          error: this.errorMessage(err, 'Failed to save table.'),
        }));
      }
    });
  }

  openDeleteConfirm(table: LiveTable, event?: MouseEvent): void {
    event?.stopPropagation();
    this.deleteState.set({
      open: true,
      tableId: table.id,
      tableNumber: table.tableNumber,
      deleting: false,
      error: '',
    });
  }

  closeDeleteConfirm(): void {
    if (this.deleteState().deleting) return;
    this.deleteState.set(emptyDelete());
  }

  confirmDelete(): void {
    const state = this.deleteState();
    if (!state.tableId || state.deleting) return;

    this.deleteState.update(d => ({ ...d, deleting: true, error: '' }));
    this.tableService.delete(state.tableId).subscribe({
      next: () => {
        if (this.selectedId() === state.tableId) this.closePanel();
        this.deleteState.set(emptyDelete());
        this.load(true);
      },
      error: (err: unknown) => {
        this.deleteState.update(d => ({
          ...d,
          deleting: false,
          error: this.errorMessage(err, 'Unable to delete table.'),
        }));
      }
    });
  }

  markServed(): void {
    const order = this.activeOrder();
    if (!order || this.markingServed()) return;

    this.markingServed.set(true);
    this.orderService.updateStatus(order.id, 'served').subscribe({
      next: () => {
        this.markingServed.set(false);
        this.load(true);
      },
      error: (err: unknown) => {
        this.markingServed.set(false);
        this.notice.set(this.errorMessage(err, 'Unable to mark order as served.'));
      }
    });
  }

  refreshPaymentsForSelected(): void {
    const order = this.activeOrder();
    if (!order) {
      this.paymentOrderId = null;
      this.payments.set([]);
      this.paymentsLoading.set(false);
      return;
    }

    const orderId = order.id;
    this.paymentOrderId = orderId;
    this.paymentsLoading.set(true);
    this.paymentService.getByOrder(orderId).subscribe({
      next: payments => {
        if (this.paymentOrderId === orderId) this.payments.set(payments);
      },
      error: () => {
        if (this.paymentOrderId === orderId) this.payments.set([]);
      },
      complete: () => {
        if (this.paymentOrderId === orderId) this.paymentsLoading.set(false);
      }
    });
  }

  formTitle(): string {
    const form = this.form();
    return form.mode === 'add' ? 'Add Table' : `Edit Table ${form.tableNumber}`;
  }

  paymentStatusLabel(): string {
    const state = this.paymentState();
    if (state === 'paid') return 'Paid';
    if (state === 'partial') return 'Partial';
    return this.paymentsLoading() ? 'Checking' : 'Unpaid';
  }

  lastUpdatedLabel(): string {
    const date = this.lastUpdated();
    if (!date) return '--:--';
    return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  formatDuration(isoDate?: string): string {
    if (!isoDate) return '';
    const diffSec = Math.max(0, Math.floor((Date.now() - new Date(isoDate).getTime()) / 1000));
    if (diffSec < 60) return `${diffSec}s`;
    const mins = Math.floor(diffSec / 60);
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    const rem = mins % 60;
    return rem > 0 ? `${hours}h ${rem}m` : `${hours}h`;
  }

  private setFormError(error: string): void {
    this.form.update(f => ({ ...f, error }));
  }

  private errorMessage(err: unknown, fallback: string): string {
    return err instanceof Error && err.message ? err.message : fallback;
  }
}
