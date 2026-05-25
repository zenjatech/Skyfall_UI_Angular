import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CurrencyPipe } from '@angular/common';
import { TableService } from '../../core/services/table.service';
import { MenuService } from '../../core/services/menu.service';
import { OrderService, OrderItemRequest } from '../../core/services/order.service';
import { CafeTable } from '../../core/models/table.model';
import { Category, MenuItem } from '../../core/models/menu.model';

interface CartItem {
  menuItemId: string;
  variantId?: string;
  name: string;
  variantName?: string;
  quantity: number;
  unitPrice: number;
}

@Component({
  selector: 'app-pos',
  standalone: true,
  imports: [FormsModule, CurrencyPipe, RouterLink],
  styles: [`
    .pos-layout { display: grid; grid-template-columns: 1fr 320px; gap: 20px; height: calc(100vh - 96px); overflow: hidden; }
    .menu-panel { overflow-y: auto; }
    .cart-panel { display: flex; flex-direction: column; overflow: hidden; }
    .table-picker { display: grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); gap: 8px; margin-bottom: 20px; }
    .tbl-btn { padding: 10px 8px; text-align: center; border: 2px solid var(--border); border-radius: var(--radius); background: none; font-size: 12px; font-weight: 600; color: var(--text-muted); transition: all .15s;
      &.free { border-color: var(--success); color: var(--success); }
      &.occupied { border-color: var(--danger); color: var(--danger); }
      &.selected { background: var(--primary); border-color: var(--primary); color: #000; }
    }
    .cat-tabs { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 8px; margin-bottom: 16px; }
    .cat-tab { flex-shrink: 0; padding: 6px 14px; background: var(--surface-2); border: none; border-radius: 999px; color: var(--text-muted); font-size: 13px; transition: all .15s; &:hover, &.active { background: var(--primary); color: #000; } }
    .menu-items { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; }
    .menu-item { padding: 12px; cursor: pointer; transition: all .15s; border: 1px solid var(--border); &:hover { border-color: var(--primary); } &.unavail { opacity: .4; cursor: not-allowed; } }
    .mi-name { font-size: 13px; font-weight: 500; margin-bottom: 4px; }
    .mi-price { font-size: 13px; color: var(--primary); font-weight: 600; }
    .mi-veg { font-size: 10px; color: var(--success); }
    .mi-nonveg { font-size: 10px; color: var(--danger); }
    .cart-header { padding: 12px 16px; font-weight: 600; border-bottom: 1px solid var(--border); font-size: 14px; }
    .cart-items { flex: 1; overflow-y: auto; padding: 8px; }
    .cart-item { display: flex; align-items: center; gap: 8px; padding: 8px; border-radius: var(--radius); &:hover { background: var(--surface-2); } }
    .ci-name { flex: 1; font-size: 13px; }
    .ci-price { font-size: 12px; color: var(--text-muted); }
    .qty-ctrl { display: flex; align-items: center; gap: 6px; button { width: 24px; height: 24px; border: 1px solid var(--border); background: none; border-radius: 4px; color: var(--text); font-size: 14px; } }
    .cart-footer { padding: 12px; border-top: 1px solid var(--border); }
    .totals { margin-bottom: 12px; font-size: 13px; .row { display: flex; justify-content: space-between; margin-bottom: 4px; } .total { font-weight: 700; font-size: 15px; color: var(--primary); } }
    .empty-cart { text-align: center; padding: 32px; color: var(--text-muted); font-size: 13px; }
  `],
  template: `
    <div>
      <div class="page-header" style="margin-bottom:12px">
        <h1>Point of Sale</h1>
      </div>

      <!-- Table selector -->
      <div style="margin-bottom:16px">
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px;text-transform:uppercase;letter-spacing:.05em">Select Table</div>
        <div class="table-picker">
          @for (t of tables(); track t.id) {
            <button class="tbl-btn" [class]="t.status" [class.selected]="selectedTable()?.id === t.id" (click)="selectTable(t)" [disabled]="t.status === 'occupied'">
              T{{ t.tableNumber }}
              <div style="font-size:10px;font-weight:400;margin-top:2px">{{ t.status === 'occupied' ? 'busy' : t.status }}</div>
            </button>
          }
        </div>
      </div>

      @if (selectedTable()) {
        <div class="pos-layout">
          <!-- Menu panel -->
          <div class="menu-panel">
            <div class="cat-tabs">
              <button class="cat-tab" [class.active]="!selectedCat()" (click)="selectCat(null)">All</button>
              @for (cat of categories(); track cat.id) {
                <button class="cat-tab" [class.active]="selectedCat()?.id === cat.id" (click)="selectCat(cat)">{{ cat.icon }} {{ cat.name }}</button>
              }
            </div>
            <div class="menu-items">
              @for (item of filteredItems(); track item.id) {
                <div class="card menu-item" [class.unavail]="!item.isAvailable" (click)="addToCart(item)">
                  <div class="mi-name">{{ item.name }}</div>
                  <div class="mi-price">{{ item.basePrice | currency:'INR':'symbol':'1.0-0' }}</div>
                  <div [class]="item.isVeg ? 'mi-veg' : 'mi-nonveg'">{{ item.isVeg ? '🟢 V' : '🔴 NV' }}</div>
                </div>
              }
            </div>
          </div>

          <!-- Cart panel -->
          <div class="card cart-panel">
            <div class="cart-header">Table {{ selectedTable()!.tableNumber }} — Order</div>
            @if (cart().length === 0) {
              <div class="empty-cart">Add items from the menu</div>
            } @else {
              <div class="cart-items">
                @for (item of cart(); track item.menuItemId + item.variantId) {
                  <div class="cart-item">
                    <div class="ci-name">
                      {{ item.name }}
                      @if (item.variantName) { <small style="color:var(--text-muted)">({{ item.variantName }})</small> }
                    </div>
                    <div class="qty-ctrl">
                      <button (click)="decQty(item)">−</button>
                      <span>{{ item.quantity }}</span>
                      <button (click)="incQty(item)">+</button>
                    </div>
                  </div>
                }
              </div>
              <div class="cart-footer">
                <div class="totals">
                  <div class="row"><span>Subtotal</span><span>{{ subtotal() | currency:'INR':'symbol':'1.0-0' }}</span></div>
                  <div class="row"><span>GST (5%)</span><span>{{ tax() | currency:'INR':'symbol':'1.0-0' }}</span></div>
                  <div class="row total"><span>Total</span><span>{{ total() | currency:'INR':'symbol':'1.0-0' }}</span></div>
                </div>
                <div style="display:flex;gap:8px">
                  <button class="btn btn-ghost" style="flex:1" (click)="clearCart()">Clear</button>
                  <button class="btn btn-primary" style="flex:2" (click)="placeOrder()" [disabled]="placing()">
                    {{ placing() ? 'Placing…' : 'Place Order' }}
                  </button>
                </div>
                @if (orderSuccess()) {
                  <div style="margin-top:10px;color:var(--success);font-size:13px;text-align:center">
                    Order placed! <a [routerLink]="['/billing', orderSuccess()]" style="color:var(--primary)">View invoice →</a>
                  </div>
                }
              </div>
            }
          </div>
        </div>
      }
    </div>
  `
})
export class PosComponent implements OnInit {
  private tableService = inject(TableService);
  private menuService = inject(MenuService);
  private orderService = inject(OrderService);

  tables = signal<CafeTable[]>([]);
  categories = signal<Category[]>([]);
  items = signal<MenuItem[]>([]);
  selectedTable = signal<CafeTable | null>(null);
  selectedCat = signal<Category | null>(null);
  cart = signal<CartItem[]>([]);
  placing = signal(false);
  orderSuccess = signal<string | null>(null);

  filteredItems = computed(() => {
    const cat = this.selectedCat();
    const all = this.items().filter(i => i.isAvailable);
    return cat ? all.filter(i => i.categoryId === cat.id) : all;
  });

  subtotal = computed(() => this.cart().reduce((s, i) => s + i.unitPrice * i.quantity, 0));
  tax = computed(() => Math.round(this.subtotal() * 0.05 * 100) / 100);
  total = computed(() => this.subtotal() + this.tax());

  ngOnInit(): void {
    this.tableService.getAll().subscribe({ next: t => this.tables.set(t) });
    this.menuService.getCategories().subscribe({ next: c => this.categories.set(c) });
    this.menuService.getItems().subscribe({ next: i => this.items.set(i) });
  }

  selectTable(t: CafeTable): void { this.selectedTable.set(t); this.clearCart(); this.orderSuccess.set(null); }
  selectCat(cat: Category | null): void { this.selectedCat.set(cat); }

  addToCart(item: MenuItem): void {
    if (!item.isAvailable) return;
    const existing = this.cart().find(c => c.menuItemId === item.id && !c.variantId);
    if (existing) {
      this.cart.update(list => list.map(c => c.menuItemId === item.id && !c.variantId ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      this.cart.update(list => [...list, { menuItemId: item.id, name: item.name, quantity: 1, unitPrice: item.basePrice }]);
    }
  }

  incQty(item: CartItem): void {
    this.cart.update(list => list.map(c => c.menuItemId === item.menuItemId && c.variantId === item.variantId ? { ...c, quantity: c.quantity + 1 } : c));
  }

  decQty(item: CartItem): void {
    this.cart.update(list => {
      const updated = list.map(c => c.menuItemId === item.menuItemId && c.variantId === item.variantId ? { ...c, quantity: c.quantity - 1 } : c);
      return updated.filter(c => c.quantity > 0);
    });
  }

  clearCart(): void { this.cart.set([]); }

  placeOrder(): void {
    if (!this.selectedTable() || this.cart().length === 0) return;
    this.placing.set(true);

    const items: OrderItemRequest[] = this.cart().map(c => ({
      menuItemId: c.menuItemId,
      variantId: c.variantId,
      quantity: c.quantity
    }));

    this.orderService.create({ tableId: this.selectedTable()!.id, orderType: 'dine_in', items }).subscribe({
      next: order => {
        this.orderSuccess.set(order.id);
        this.clearCart();
        this.placing.set(false);
        this.tableService.getAll().subscribe({ next: t => this.tables.set(t) });
      },
      error: () => this.placing.set(false)
    });
  }
}
