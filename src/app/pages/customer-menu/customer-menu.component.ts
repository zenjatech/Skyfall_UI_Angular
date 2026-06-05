import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PublicService } from '../../core/services/public.service';
import { ItemAddon, ItemVariant, MenuItem, Category } from '../../core/models/menu.model';
import { CafeTable } from '../../core/models/table.model';
import { OrderItemRequest } from '../../core/services/order.service';
import { IconComponent } from '../../core/components/icon.component';

const CATEGORY_TABS = [
  'All',
  'Cocktails',
  'Mocktails',
  'Bites',
  'Mains',
  'Desserts',
  'Beverages'
] as const;

type CategoryTab = typeof CATEGORY_TABS[number];
type CustomerStep = 'phone' | 'details';

interface CartLine {
  lineId: string;
  item: MenuItem;
  variant: ItemVariant | null;
  addons: ItemAddon[];
  quantity: number;
  unitPrice: number;
  note?: string;
}

@Component({
  selector: 'app-customer-menu',
  standalone: true,
  imports: [FormsModule, IconComponent],
  styles: [':host { display: block; min-height: 100vh; }'],
  template: `
    <main class="qr-menu-page">
      <header class="qr-menu-header">
        <div class="qr-menu-header-inner">
          <div class="qr-menu-brand">
            <div class="qr-menu-brand-mark">✦</div>
            <div>
              <div class="qr-menu-brand-name">SKYFALL</div>
              <div class="qr-menu-brand-sub">LOUNGE</div>
            </div>
          </div>

          <div class="qr-menu-header-actions">
            <div class="qr-menu-table-chip">Table {{ displayTable() }}</div>
            <button type="button" class="qr-menu-cart-button" (click)="openCart()" aria-label="Open cart">
              <app-icon name="shopping-cart" [size]="17" [sw]="1.8"></app-icon>
              @if (cartCount() > 0) {
                <span>{{ cartCount() }}</span>
              }
            </button>
          </div>
        </div>
      </header>

      <nav class="qr-menu-tabs-shell">
        <div class="qr-menu-tabs">
          @for (category of categoryTabs; track category) {
            <button
              type="button"
              class="qr-menu-tab"
              [class.active]="activeTab() === category"
              (click)="activeTab.set(category)"
            >
              {{ category }}
            </button>
          }
        </div>
      </nav>

      @if (toast()) {
        <div class="qr-menu-toast">{{ toast() }}</div>
      }

      <section class="qr-menu-content">
        @if (loading()) {
          <div class="loading-center"><div class="spinner"></div></div>
        } @else {
          <div class="qr-menu-eyebrow">SIGNATURE MENU</div>

          @if (filteredItems().length) {
            <div class="qr-menu-grid">
              @for (item of filteredItems(); track item.id) {
                <article class="qr-menu-card" [class.unavailable]="!item.isAvailable">
                  <div class="qr-menu-card-media">
                    @if (isImageUrl(item.imageUrl)) {
                      <img [src]="item.imageUrl" [alt]="item.name" />
                    } @else {
                      <span class="qr-menu-emoji">{{ getEmoji(item) }}</span>
                    }
                    <span
                      class="qr-menu-diet-dot"
                      [class.nonveg]="!item.isVeg"
                      [attr.aria-label]="item.isVeg ? 'Vegetarian' : 'Non vegetarian'"
                    ></span>
                  </div>

                  <div class="qr-menu-card-body">
                    <h2>{{ item.name }}</h2>
                    @if (item.description) {
                      <p>{{ item.description }}</p>
                    }
                    <div class="qr-menu-card-footer">
                      <span class="qr-menu-price">{{ formatPrice(item.basePrice) }}</span>
                      <div class="qr-menu-stepper" aria-label="Item quantity">
                        <button
                          type="button"
                          class="qr-menu-stepper-minus"
                          [disabled]="getCartQuantityForItem(item.id) === 0"
                          (click)="decrementItem(item)"
                          aria-label="Decrease quantity"
                        >
                          <app-icon name="minus" [size]="13" [sw]="1.8"></app-icon>
                        </button>
                        <strong>{{ getCartQuantityForItem(item.id) }}</strong>
                        <button
                          type="button"
                          class="qr-menu-stepper-plus"
                          (click)="incrementItem(item)"
                          aria-label="Increase quantity"
                        >
                          <app-icon name="plus" [size]="14" [sw]="1.9"></app-icon>
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              }
            </div>
          } @else {
            <div class="qr-menu-empty">
              No items available in this section right now.
            </div>
          }
        }
      </section>

      @if (cartCount() > 0) {
        <aside class="qr-menu-bottom-bar">
          <div class="qr-menu-bottom-inner">
            <button type="button" class="qr-menu-bottom-summary" (click)="openCart()">
              <span>{{ cartCount() }} items · {{ formatPrice(subtotal()) }}</span>
              <small>Tap to edit order</small>
            </button>
            <button type="button" class="qr-menu-review-button" (click)="openCart()">
              Review
              <app-icon name="arrow-right" [size]="14" [sw]="1.8"></app-icon>
            </button>
          </div>
        </aside>
      }

      @if (isCartOpen()) {
        <div class="qr-sheet-layer">
          <button type="button" class="qr-sheet-backdrop" (click)="isCartOpen.set(false)" aria-label="Close cart"></button>
          <section class="qr-sheet" role="dialog" aria-modal="true" aria-label="Your order">
            <div class="qr-sheet-handle"></div>
            <div class="qr-sheet-head">
              <h2>Your Order</h2>
              <button type="button" class="qr-icon-button" (click)="isCartOpen.set(false)" aria-label="Close cart">
                <app-icon name="x" [size]="15" [sw]="1.9"></app-icon>
              </button>
            </div>

            <div class="qr-cart-lines">
              @for (line of cart(); track line.lineId) {
                <article class="qr-cart-line">
                  <div class="qr-cart-thumb">{{ getEmoji(line.item) }}</div>
                  <div class="qr-cart-line-main">
                    <h3>{{ line.item.name }}</h3>
                    <p>{{ lineDescription(line) }}</p>
                    <strong>{{ formatPrice(line.unitPrice * line.quantity) }}</strong>
                  </div>
                  <button type="button" class="qr-remove-line" (click)="removeLine(line.lineId)" [attr.aria-label]="'Remove ' + line.item.name">
                    <app-icon name="trash-2" [size]="13" [sw]="1.8"></app-icon>
                  </button>
                  <div class="qr-cart-stepper">
                    <button type="button" (click)="updateCartQuantity(line.lineId, line.quantity - 1)" aria-label="Decrease quantity">
                      <app-icon name="minus" [size]="13" [sw]="1.8"></app-icon>
                    </button>
                    <span>{{ line.quantity }}</span>
                    <button type="button" (click)="updateCartQuantity(line.lineId, line.quantity + 1)" aria-label="Increase quantity">
                      <app-icon name="plus" [size]="13" [sw]="1.8"></app-icon>
                    </button>
                  </div>
                </article>
              }
            </div>

            <div class="qr-divider"></div>

            <div class="qr-totals">
              <div><span>Subtotal</span><strong>{{ formatPrice(subtotal()) }}</strong></div>
              <div><span>CGST 2.5%</span><strong>{{ formatPrice(cgst()) }}</strong></div>
              <div><span>SGST 2.5%</span><strong>{{ formatPrice(sgst()) }}</strong></div>
              <div class="qr-total-row"><span>Total</span><strong>{{ formatPrice(total()) }}</strong></div>
            </div>

            <label class="qr-field-block">
              <span>Special Instructions</span>
              <textarea
                [(ngModel)]="orderInstructions"
                rows="3"
                placeholder="Less sugar, no onion, serve together..."
              ></textarea>
            </label>

            <button type="button" class="qr-primary-btn" [disabled]="!cart().length" (click)="startCheckout()">
              Place Order
            </button>
          </section>
        </div>
      }

      @if (showCustomerSheet()) {
        <div class="qr-sheet-layer">
          <button type="button" class="qr-sheet-backdrop" (click)="closeCustomerSheet()" aria-label="Close customer details"></button>
          <section class="qr-sheet" role="dialog" aria-modal="true" aria-label="Customer details">
            <div class="qr-sheet-handle"></div>

            <div class="qr-sheet-head">
              @if (customerStep() === 'details') {
                <button type="button" class="qr-back-btn" (click)="customerStep.set('phone'); customerError.set(null)">
                  Back
                </button>
              } @else {
                <h2>Mobile Number</h2>
              }
              <button type="button" class="qr-icon-button" (click)="closeCustomerSheet()" aria-label="Close">
                <app-icon name="x" [size]="15" [sw]="1.9"></app-icon>
              </button>
            </div>

            @if (customerStep() === 'details') {
              <h2 class="qr-details-title">Your Details</h2>
            } @else {
              <p class="qr-sheet-copy">Enter your mobile number to continue.</p>
            }

            @if (customerError()) {
              <div class="qr-error">{{ customerError() }}</div>
            }

            @if (customerStep() === 'phone') {
              <label class="qr-input-label">
                <span>Mobile Number</span>
                <div class="qr-input-with-icon">
                  <app-icon name="smartphone" [size]="15" [sw]="1.8"></app-icon>
                  <input
                    [(ngModel)]="phone"
                    (keydown.enter)="handlePhoneLookup()"
                    inputmode="tel"
                    placeholder="Enter mobile number"
                    autocomplete="tel"
                    autofocus
                  />
                </div>
              </label>

              <button type="button" class="qr-primary-btn" [disabled]="lookingUpCustomer()" (click)="handlePhoneLookup()">
                {{ lookingUpCustomer() ? 'Looking up...' : 'Continue' }}
              </button>
            } @else {
              <div class="qr-locked-phone">
                <app-icon name="smartphone" [size]="15" [sw]="1.8"></app-icon>
                <span>{{ phone }}</span>
                <button type="button" (click)="customerStep.set('phone'); customerError.set(null)">Change</button>
              </div>

              <div class="qr-details-fields">
                <label class="qr-input-label">
                  <span>Name <b>*</b></span>
                  <div class="qr-input-with-icon">
                    <app-icon name="user" [size]="15" [sw]="1.8"></app-icon>
                    <input [(ngModel)]="customerName" placeholder="Your full name" autocomplete="name" />
                  </div>
                </label>

                <label class="qr-input-label">
                  <span>Email <b>*</b></span>
                  <div class="qr-input-with-icon">
                    <app-icon name="mail" [size]="15" [sw]="1.8"></app-icon>
                    <input [(ngModel)]="customerEmail" type="email" inputmode="email" placeholder="your@email.com" autocomplete="email" />
                  </div>
                </label>

                <div class="qr-optional-label">Optional - for special occasion offers</div>

                <label class="qr-input-label">
                  <span>Birthday</span>
                  <div class="qr-input-with-icon">
                    <app-icon name="calendar" [size]="15" [sw]="1.8"></app-icon>
                    <input [(ngModel)]="customerBirthday" type="date" />
                  </div>
                </label>

                <label class="qr-input-label">
                  <span>Anniversary</span>
                  <div class="qr-input-with-icon">
                    <app-icon name="calendar" [size]="15" [sw]="1.8"></app-icon>
                    <input [(ngModel)]="customerAnniversary" type="date" />
                  </div>
                </label>

                <label class="qr-input-label">
                  <span>Special Event Date</span>
                  <div class="qr-input-with-icon">
                    <app-icon name="calendar" [size]="15" [sw]="1.8"></app-icon>
                    <input [(ngModel)]="specialEventDate" type="date" />
                  </div>
                </label>

                @if (specialEventDate) {
                  <label class="qr-input-label">
                    <span>Event Name</span>
                    <div class="qr-input-with-icon">
                      <input [(ngModel)]="specialEventName" placeholder="e.g. Engagement, Graduation..." />
                    </div>
                  </label>
                }
              </div>

              <button
                type="button"
                class="qr-primary-btn"
                [disabled]="isSubmittingCustomer() || isPlacingOrder()"
                (click)="handleCustomerSubmit()"
              >
                {{ isSubmittingCustomer() || isPlacingOrder() ? 'Placing Order...' : 'Confirm & Place Order' }}
              </button>
            }
          </section>
        </div>
      }
    </main>
  `
})
export class CustomerMenuComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly publicApi = inject(PublicService);

  readonly categoryTabs = CATEGORY_TABS;

  tableId = '';
  table = signal<CafeTable | null>(null);
  categories = signal<Category[]>([]);
  items = signal<MenuItem[]>([]);
  activeTab = signal<CategoryTab>('All');
  cart = signal<CartLine[]>([]);
  loading = signal(true);
  toast = signal<string | null>(null);
  isCartOpen = signal(false);
  showCustomerSheet = signal(false);
  customerStep = signal<CustomerStep>('phone');
  customerError = signal<string | null>(null);
  lookingUpCustomer = signal(false);
  isSubmittingCustomer = signal(false);
  isPlacingOrder = signal(false);

  phone = '';
  customerName = '';
  customerEmail = '';
  customerBirthday = '';
  customerAnniversary = '';
  specialEventDate = '';
  specialEventName = '';
  orderInstructions = '';

  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  displayTable = computed(() => {
    const tableNumber = this.table()?.tableNumber?.toString();
    const routeDigits = this.tableId.match(/\d+/)?.[0];
    return (tableNumber ?? routeDigits ?? '01').padStart(2, '0');
  });

  sortedItems = computed(() => {
    const categoryOrder = new Map(this.categories().map(category => [category.id, category.displayOrder]));

    return [...this.items()]
      .filter(item => item.isAvailable)
      .sort((a, b) => {
        const orderDiff = (categoryOrder.get(a.categoryId) ?? 999) - (categoryOrder.get(b.categoryId) ?? 999);
        return orderDiff || a.name.localeCompare(b.name);
      });
  });

  filteredItems = computed(() =>
    this.sortedItems().filter(item => this.belongsToTab(item, this.activeTab()))
  );

  cartCount = computed(() => this.cart().reduce((sum, line) => sum + line.quantity, 0));
  subtotal = computed(() => this.cart().reduce((sum, line) => sum + line.unitPrice * line.quantity, 0));
  cgst = computed(() => this.subtotal() * 0.025);
  sgst = computed(() => this.subtotal() * 0.025);
  total = computed(() => this.subtotal() + this.cgst() + this.sgst());

  ngOnInit(): void {
    this.tableId = this.route.snapshot.paramMap.get('tableId') ?? '01';

    this.publicApi.getTable(this.tableId).subscribe({
      next: table => this.table.set(table),
      error: () => this.showToast('Table not found.')
    });

    this.publicApi.getMenu().subscribe({
      next: menu => {
        this.categories.set(menu.categories);
        this.items.set(menu.items);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.showToast('Unable to load the menu.');
      }
    });
  }

  formatPrice(amount: number): string {
    return `Rs ${Math.round(amount)}`;
  }

  isImageUrl(url: string | null | undefined): boolean {
    return !!url && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/'));
  }

  getEmoji(item: MenuItem): string {
    const name = `${item.name} ${this.getItemCategory(item)}`.toLowerCase();

    if (name.includes('cocktail') || name.includes('negroni') || name.includes('sour')) return '🍸';
    if (name.includes('mocktail') || name.includes('cooler') || name.includes('iced')) return '🍹';
    if (name.includes('dessert') || name.includes('cake') || name.includes('brownie')) return '🍰';
    if (name.includes('pasta') || name.includes('main') || name.includes('sandwich')) return '🍝';
    if (name.includes('coffee') || name.includes('chai') || name.includes('beverage')) return '☕';
    if (name.includes('breakfast') || name.includes('toast') || name.includes('omelette')) return '🍳';
    if (name.includes('fries') || name.includes('nachos') || name.includes('small plate')) return '🍟';
    if (name.includes('chicken')) return '🍗';
    return this.categories().find(category => category.id === item.categoryId)?.icon ?? '✦';
  }

  getCartQuantityForItem(itemId: string): number {
    return this.cart()
      .filter(line => line.item.id === itemId)
      .reduce((sum, line) => sum + line.quantity, 0);
  }

  incrementItem(item: MenuItem): void {
    const variant = this.getDefaultVariant(item);
    const addons: ItemAddon[] = [];
    const lineId = `${item.id}-${variant?.id ?? 'base'}`;
    const unitPrice = this.getLinePrice(item, variant, addons);

    this.cart.update(lines => {
      const existing = lines.find(line => line.lineId === lineId);
      if (!existing) {
        return [...lines, { lineId, item, variant, addons, quantity: 1, unitPrice }];
      }

      return lines.map(line =>
        line.lineId === lineId ? { ...line, quantity: line.quantity + 1 } : line
      );
    });

    this.showToast(`${item.name} added`);
  }

  decrementItem(item: MenuItem): void {
    const variant = this.getDefaultVariant(item);
    const lineId = `${item.id}-${variant?.id ?? 'base'}`;
    this.updateCartQuantity(lineId, this.getCartQuantityForItem(item.id) - 1);
  }

  updateCartQuantity(lineId: string, nextQuantity: number): void {
    this.cart.update(lines => {
      if (nextQuantity < 1) {
        return lines.filter(line => line.lineId !== lineId);
      }

      return lines.map(line =>
        line.lineId === lineId ? { ...line, quantity: nextQuantity } : line
      );
    });

    if (this.cart().length === 0) {
      this.isCartOpen.set(false);
    }
  }

  removeLine(lineId: string): void {
    this.cart.update(lines => lines.filter(line => line.lineId !== lineId));
    if (this.cart().length === 0) {
      this.isCartOpen.set(false);
    }
  }

  lineDescription(line: CartLine): string {
    return [line.variant?.name, ...line.addons.map(addon => addon.name), line.note]
      .filter(Boolean)
      .join(' . ') || 'Classic';
  }

  openCart(): void {
    if (!this.cart().length) {
      this.showToast('Add at least one item.');
      return;
    }
    this.isCartOpen.set(true);
  }

  startCheckout(): void {
    if (!this.cart().length) return;
    this.isCartOpen.set(false);
    this.customerError.set(null);
    this.customerStep.set('phone');
    this.phone = '';
    this.customerName = '';
    this.customerEmail = '';
    this.customerBirthday = '';
    this.customerAnniversary = '';
    this.specialEventDate = '';
    this.specialEventName = '';
    this.showCustomerSheet.set(true);
  }

  handlePhoneLookup(): void {
    if (!this.phone.trim()) {
      this.customerError.set('Mobile number is required');
      return;
    }

    this.customerError.set(null);
    this.lookingUpCustomer.set(true);

    this.publicApi.identifyCustomer({ phone: this.phone.trim() }).subscribe({
      next: result => {
        this.customerName = result.customer.name ?? '';
        this.customerEmail = result.customer.email ?? '';
        this.customerBirthday = result.customer.birthday ?? '';
        this.customerAnniversary = result.customer.anniversary ?? '';
        this.specialEventDate = result.customer.specialEventDate ?? '';
        this.specialEventName = result.customer.specialEventName ?? '';
        this.customerStep.set('details');
        this.lookingUpCustomer.set(false);
      },
      error: (err: Error) => {
        this.customerError.set(err.message || 'Could not look up customer.');
        this.lookingUpCustomer.set(false);
      }
    });
  }

  handleCustomerSubmit(): void {
    if (!this.customerName.trim()) {
      this.customerError.set('Name is required');
      return;
    }

    if (!this.customerEmail.trim()) {
      this.customerError.set('Email is required');
      return;
    }

    this.customerError.set(null);
    this.isSubmittingCustomer.set(true);

    this.publicApi.identifyCustomer({
      phone: this.phone.trim(),
      name: this.customerName.trim(),
      email: this.customerEmail.trim(),
      birthday: this.customerBirthday || undefined,
      anniversary: this.customerAnniversary || undefined,
      specialEventDate: this.specialEventDate || undefined,
      specialEventName: this.specialEventName.trim() || undefined
    }).subscribe({
      next: result => {
        this.isSubmittingCustomer.set(false);
        this.placeOrder(result.customer.id);
      },
      error: (err: Error) => {
        this.customerError.set(err.message || 'Could not save your details.');
        this.isSubmittingCustomer.set(false);
      }
    });
  }

  closeCustomerSheet(): void {
    if (this.isPlacingOrder()) return;
    this.showCustomerSheet.set(false);
  }

  private placeOrder(customerId: string): void {
    const table = this.table();
    if (!table) {
      this.customerError.set('Table not found.');
      return;
    }

    this.isPlacingOrder.set(true);
    const items: OrderItemRequest[] = this.cart().map(line => ({
      menuItemId: line.item.id,
      variantId: line.variant?.id,
      addonIds: line.addons.map(addon => addon.id),
      quantity: line.quantity,
      specialInstructions: line.note
    }));

    this.publicApi.createOrder({
      tableId: table.id,
      customerId,
      orderType: 'dine_in',
      specialInstructions: this.orderInstructions.trim() || undefined,
      items
    }).subscribe({
      next: order => {
        this.showCustomerSheet.set(false);
        this.cart.set([]);
        this.isPlacingOrder.set(false);
        this.router.navigate(['/order', order.id, 'track']);
      },
      error: (err: Error) => {
        this.customerError.set(err.message || 'Unable to place order.');
        this.isPlacingOrder.set(false);
      }
    });
  }

  private getItemCategory(item: MenuItem): string {
    return item.categoryName || this.categories().find(category => category.id === item.categoryId)?.name || '';
  }

  private belongsToTab(item: MenuItem, tab: CategoryTab): boolean {
    if (tab === 'All') return true;

    const haystack = `${item.name} ${item.description ?? ''} ${this.getItemCategory(item)}`.toLowerCase();

    if (tab === 'Cocktails') {
      return haystack.includes('cocktail') || haystack.includes('negroni') || haystack.includes('sour');
    }
    if (tab === 'Mocktails') {
      return haystack.includes('mocktail') || haystack.includes('cooler') || haystack.includes('iced tea');
    }
    if (tab === 'Bites') {
      return (
        haystack.includes('bite') ||
        haystack.includes('small plate') ||
        haystack.includes('fries') ||
        haystack.includes('nachos') ||
        haystack.includes('breakfast') ||
        haystack.includes('toast') ||
        haystack.includes('omelette')
      );
    }
    if (tab === 'Mains') {
      return haystack.includes('main') || haystack.includes('pasta') || haystack.includes('sandwich');
    }
    if (tab === 'Desserts') {
      return haystack.includes('dessert') || haystack.includes('cake') || haystack.includes('brownie');
    }

    return (
      haystack.includes('beverage') ||
      haystack.includes('coffee') ||
      haystack.includes('chai') ||
      haystack.includes('americano') ||
      haystack.includes('cooler') ||
      haystack.includes('tea')
    );
  }

  private getDefaultVariant(item: MenuItem): ItemVariant | null {
    return item.variants.find(variant => variant.isAvailable) ?? null;
  }

  private getLinePrice(item: MenuItem, variant: ItemVariant | null, addons: ItemAddon[]): number {
    return item.basePrice + (variant?.priceModifier ?? 0) + addons.reduce((sum, addon) => sum + addon.extraPrice, 0);
  }

  private showToast(message: string): void {
    this.toast.set(message);
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }
    this.toastTimer = setTimeout(() => this.toast.set(null), 1800);
  }
}
