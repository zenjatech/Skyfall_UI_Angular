import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { MenuService } from '../../core/services/menu.service';
import { Category, MenuItem } from '../../core/models/menu.model';
import { IconComponent } from '../../core/components/icon.component';

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [FormsModule, IconComponent],
  styles: [`
    .wrap { display: flex; flex-direction: column; gap: 22px; }
    .page-header { display: flex; align-items: center; justify-content: space-between; }
    .page-title { font-family: var(--font-heading); font-size: 22px; font-weight: 600; color: #1A1A1A; margin: 0; }
    .header-actions { display: flex; gap: 8px; }
    .btn-ghost { display: inline-flex; align-items: center; gap: 6px; height: 36px; padding: 0 14px; border-radius: 8px; border: 1px solid #E8DBBF; background: #fff; color: #7A7060; font-size: 13px; font-weight: 500; cursor: pointer; font-family: var(--font-body); transition: all .15s;
      &:hover { background: #FBF6EC; color: #8A6A24; }
    }
    .btn-gold { display: inline-flex; align-items: center; gap: 6px; height: 36px; padding: 0 16px; border-radius: 8px; border: none; background: #B8923A; color: #fff; font-size: 13px; font-weight: 500; cursor: pointer; font-family: var(--font-body); transition: background .15s;
      &:hover { background: #8A6A24; }
    }

    /* Layout */
    .menu-layout { display: grid; grid-template-columns: 200px 1fr; gap: 16px; align-items: start; }

    /* Category sidebar */
    .cat-panel { border-radius: 12px; border: 1px solid #E8DBBF; background: #fff; overflow: hidden; }
    .cat-panel-head { padding: 12px 14px; border-bottom: 1px solid #E8DBBF; }
    .cat-panel-title { font-family: var(--font-heading); font-size: 14px; font-weight: 600; color: #1A1A1A; }
    .cat-list { padding: 6px; display: flex; flex-direction: column; gap: 2px; }
    .cat-btn { display: flex; align-items: center; gap: 8px; width: 100%; padding: 8px 10px; border-radius: 8px; border: none; background: none; text-align: left; font-size: 12px; font-weight: 500; color: #7A7060; cursor: pointer; font-family: var(--font-body); transition: all .12s;
      &:hover { background: #FBF6EC; color: #8A6A24; }
      &.active { background: #F7EDD8; color: #8A6A24; }
    }
    .cat-emoji { font-size: 14px; line-height: 1; }
    .cat-count { margin-left: auto; font-size: 10px; color: #A8998A; background: #F4EFE6; border-radius: 10px; padding: 1px 6px; }

    /* Section card */
    .sc { border-radius: 12px; border: 1px solid #E8DBBF; background: #fff; overflow: hidden; }
    .sc-head { display: flex; align-items: center; justify-content: space-between; min-height: 54px; padding: 0 20px; border-bottom: 1px solid #E8DBBF; }
    .sc-title { font-family: var(--font-heading); font-size: 16px; font-weight: 600; color: #1A1A1A; margin: 0; }
    .sc-meta { font-size: 11px; color: #7A7060; }

    /* Items grid */
    .items-grid { padding: 16px; display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }
    .item-card { border: 1px solid #E8DBBF; border-radius: 10px; background: #fff; overflow: hidden; transition: box-shadow .15s;
      &:hover { box-shadow: 0 2px 12px rgba(184,146,58,0.12); }
      &.unavailable { opacity: 0.55; }
    }
    .item-card-body { padding: 12px 14px; }
    .item-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; margin-bottom: 6px; }
    .item-name { font-size: 13px; font-weight: 600; color: #1A1A1A; line-height: 1.3; }
    .veg-dot { width: 8px; height: 8px; border-radius: 2px; border: 1px solid; flex-shrink: 0; margin-top: 3px;
      &.veg { border-color: #2A7A3A; background: #2A7A3A; }
      &.non-veg { border-color: #B03030; background: #B03030; }
    }
    .item-price { font-size: 14px; font-weight: 700; color: #B8923A; margin-bottom: 4px; }
    .item-meta { display: flex; align-items: center; gap: 8px; font-size: 10px; color: #A8998A; }
    .item-cat-tag { background: #F4EFE6; color: #7A7060; border-radius: 10px; padding: 2px 7px; font-size: 10px; font-weight: 500; }
    .item-avail { display: inline-flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 500;
      &.yes { color: #2A7A3A; }
      &.no  { color: #A8998A; }
    }
    .avail-dot { width: 5px; height: 5px; border-radius: 50%; }
    .item-card-foot { display: flex; gap: 6px; padding: 8px 14px; border-top: 1px solid #E8DBBF; background: #FAFAF7; }
    .act-btn { flex: 1; height: 26px; border-radius: 6px; font-size: 11px; font-weight: 500; cursor: pointer; font-family: var(--font-body); transition: all .12s;
      &.edit   { border: 1px solid #E8DBBF; background: #fff; color: #7A7060; &:hover { background: #FBF6EC; color: #8A6A24; } }
      &.toggle { border: 1px solid #E8DBBF; background: #fff; color: #7A7060; &:hover { background: #FBF6EC; } }
      &.del    { border: 1px solid #FBEAEA; background: #fff; color: #B03030; &:hover { background: #FBEAEA; } }
    }

    /* Stats bar */
    .stats-bar { display: grid; grid-template-columns: repeat(5, 1fr); gap: 14px; }
    .stat-card { border: 1px solid #E8DBBF; border-radius: 12px; background: #fff; padding: 16px 18px; display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
    .stat-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: .14em; color: #A8998A; }
    .stat-value { margin-top: 6px; font-family: var(--font-heading); font-size: 26px; font-weight: 600; color: #1A1A1A; line-height: 1; }
    .stat-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
      &.amber { background: #F7EDD8; color: #B8923A; }
      &.green { background: #EBF7ED; color: #2A7A3A; }
      &.red   { background: #FEE2E2; color: #991B1B; }
      &.blue  { background: #EBF0F9; color: #2A5A9A; }
    }

    /* Loading / empty */
    .loading-center { display: flex; align-items: center; justify-content: center; padding: 48px; }
    .spinner { width: 28px; height: 28px; border: 2px solid #E8DBBF; border-top-color: #B8923A; border-radius: 50%; animation: spin .7s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .empty-state { padding: 48px 24px; text-align: center; color: #7A7060; font-size: 13px; }

    /* Modal */
    .modal-backdrop { position: fixed; inset: 0; background: rgba(26,26,26,.45); display: flex; align-items: center; justify-content: center; z-index: 100; animation: fadeIn .15s ease-out; }
    @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
    .modal-panel { background: #fff; border-radius: 14px; border: 1px solid #E8DBBF; box-shadow: 0 20px 60px rgba(184,146,58,0.15); width: 460px; max-width: 94vw; max-height: 85vh; overflow-y: auto; padding: 28px; }
    .modal-title { font-family: var(--font-heading); font-size: 20px; font-weight: 600; color: #1A1A1A; margin: 0 0 20px; }
    .form-group { margin-bottom: 14px; }
    .form-label { display: block; font-size: 11px; color: #7A7060; margin-bottom: 5px; }
    .field-input { min-height: 40px; width: 100%; border-radius: 8px; border: 1px solid #E8DBBF; background: #FAFAF7; padding: 0 12px; font-size: 13px; color: #1A1A1A; outline: none; transition: border-color .15s; font-family: var(--font-body); box-sizing: border-box;
      &::placeholder { color: #A8998A; }
      &:focus { border-color: #B8923A; box-shadow: 0 0 0 2px rgba(184,146,58,0.18); }
    }
    textarea.field-input { padding: 10px 12px; min-height: 72px; resize: vertical; }
    .modal-footer { display: flex; gap: 8px; justify-content: flex-end; margin-top: 20px; padding-top: 16px; border-top: 1px solid #E8DBBF; }
    .btn-cancel { padding: 8px 16px; border-radius: 8px; border: 1px solid #E8DBBF; background: transparent; color: #7A7060; font-size: 13px; font-weight: 500; cursor: pointer; font-family: var(--font-body); &:hover { background: #FBF6EC; } }
    .btn-save { padding: 8px 16px; border-radius: 8px; border: none; background: #B8923A; color: #fff; font-size: 13px; font-weight: 500; cursor: pointer; font-family: var(--font-body); &:hover { background: #8A6A24; } }
  `],
  template: `
    <div class="wrap">
      <div class="page-header">
        <h1 class="page-title">Menu</h1>
        <div class="header-actions">
          <button class="btn-ghost" (click)="openAddCategory()">
            <app-icon name="folder-plus" [size]="14" [sw]="1.8"></app-icon>
            Category
          </button>
          <button class="btn-gold" (click)="openAddItem()">
            <app-icon name="plus" [size]="14" [sw]="1.8"></app-icon>
            Add Item
          </button>
        </div>
      </div>

      <!-- Stats bar -->
      <div class="stats-bar">
        <div class="stat-card">
          <div>
            <div class="stat-label">Menu Items</div>
            <div class="stat-value">{{ items().length }}</div>
          </div>
          <div class="stat-icon amber"><app-icon name="utensils-crossed" [size]="18" [sw]="1.8"></app-icon></div>
        </div>
        <div class="stat-card">
          <div>
            <div class="stat-label">Available</div>
            <div class="stat-value">{{ availableCount() }}</div>
          </div>
          <div class="stat-icon green"><app-icon name="check" [size]="18" [sw]="2"></app-icon></div>
        </div>
        <div class="stat-card">
          <div>
            <div class="stat-label">Inactive</div>
            <div class="stat-value">{{ inactiveCount() }}</div>
          </div>
          <div class="stat-icon red"><app-icon name="eye-off" [size]="18" [sw]="1.8"></app-icon></div>
        </div>
        <div class="stat-card">
          <div>
            <div class="stat-label">Categories</div>
            <div class="stat-value">{{ categories().length }}</div>
          </div>
          <div class="stat-icon amber"><app-icon name="sparkles" [size]="18" [sw]="1.8"></app-icon></div>
        </div>
        <div class="stat-card">
          <div>
            <div class="stat-label">Avg Prep</div>
            <div class="stat-value">{{ avgPrepTime() }} min</div>
          </div>
          <div class="stat-icon blue"><app-icon name="clock" [size]="18" [sw]="1.8"></app-icon></div>
        </div>
      </div>

      <div class="menu-layout">
        <!-- Category sidebar -->
        <div class="cat-panel">
          <div class="cat-panel-head">
            <div class="cat-panel-title">Categories</div>
          </div>
          <div class="cat-list">
            <button class="cat-btn" [class.active]="!selectedCategory()" (click)="selectCategory(null)">
              <app-icon name="grid-2x2" [size]="13" [sw]="1.8"></app-icon>
              All Items
              <span class="cat-count">{{ items().length }}</span>
            </button>
            @for (cat of categories(); track cat.id) {
              <button class="cat-btn" [class.active]="selectedCategory()?.id === cat.id" (click)="selectCategory(cat)">
                @if (cat.icon) { <span class="cat-emoji">{{ cat.icon }}</span> }
                {{ cat.name }}
                <span class="cat-count">{{ itemCountFor(cat.id) }}</span>
              </button>
            }
          </div>
        </div>

        <!-- Items panel -->
        <div class="sc">
          <div class="sc-head">
            <h2 class="sc-title">{{ selectedCategory()?.name ?? 'All Items' }}</h2>
            @if (!loading()) {
              <span class="sc-meta">{{ filteredItems().length }} item{{ filteredItems().length !== 1 ? 's' : '' }}</span>
            }
          </div>

          @if (loading()) {
            <div class="loading-center"><div class="spinner"></div></div>
          } @else if (filteredItems().length === 0) {
            <div class="empty-state">No items in this category.</div>
          } @else {
            <div class="items-grid">
              @for (item of filteredItems(); track item.id) {
                <div class="item-card" [class.unavailable]="!item.isAvailable">
                  <div class="item-card-body">
                    <div class="item-top">
                      <div class="item-name">{{ item.name }}</div>
                      <div class="veg-dot" [class.veg]="item.isVeg" [class.non-veg]="!item.isVeg"></div>
                    </div>
                    <div class="item-price">₹{{ item.basePrice.toLocaleString('en-IN') }}</div>
                    <div class="item-meta">
                      <span>{{ item.prepTimeMinutes }}min prep</span>
                      <span class="item-avail" [class.yes]="item.isAvailable" [class.no]="!item.isAvailable">
                        <span class="avail-dot" [style.background]="item.isAvailable ? '#2A7A3A' : '#A8998A'"></span>
                        {{ item.isAvailable ? 'Available' : 'Off menu' }}
                      </span>
                    </div>
                  </div>
                  <div class="item-card-foot">
                    <button class="act-btn edit" (click)="openEditItem(item)">Edit</button>
                    <button class="act-btn toggle" (click)="toggleAvail(item)">{{ item.isAvailable ? 'Disable' : 'Enable' }}</button>
                    <button class="act-btn del" (click)="removeItem(item.id)">Del</button>
                  </div>
                </div>
              }
            </div>
          }
        </div>
      </div>
    </div>

    @if (showModal()) {
      <div class="modal-backdrop" (click)="closeModal()">
        <div class="modal-panel" (click)="$event.stopPropagation()">
          <h2 class="modal-title">
            @if (modalMode() === 'category') { {{ editingId() ? 'Edit Category' : 'New Category' }} }
            @else { {{ editingId() ? 'Edit Item' : 'New Menu Item' }} }
          </h2>

          @if (modalMode() === 'category') {
            <div class="form-group">
              <label class="form-label">Name</label>
              <input class="field-input" [(ngModel)]="form.name" placeholder="e.g. Starters" />
            </div>
            <div class="form-group">
              <label class="form-label">Icon (emoji)</label>
              <input class="field-input" [(ngModel)]="form.icon" placeholder="🍢" />
            </div>
            <div class="form-group">
              <label class="form-label">Display Order</label>
              <input class="field-input" type="number" [(ngModel)]="form.displayOrder" />
            </div>
          } @else {
            <div class="form-group">
              <label class="form-label">Category</label>
              <select class="field-input" [(ngModel)]="form.categoryId">
                @for (cat of categories(); track cat.id) {
                  <option [value]="cat.id">{{ cat.name }}</option>
                }
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Name</label>
              <input class="field-input" [(ngModel)]="form.name" placeholder="Item name" />
            </div>
            <div class="form-group">
              <label class="form-label">Description</label>
              <textarea class="field-input" [(ngModel)]="form.description" rows="2" placeholder="Short description…"></textarea>
            </div>
            <div class="form-group">
              <label class="form-label">Base Price (₹)</label>
              <input class="field-input" type="number" [(ngModel)]="form.basePrice" />
            </div>
            <div class="form-group">
              <label class="form-label">Type</label>
              <select class="field-input" [(ngModel)]="form.isVeg">
                <option [ngValue]="true">Veg</option>
                <option [ngValue]="false">Non-veg</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Prep Time (min)</label>
              <input class="field-input" type="number" [(ngModel)]="form.prepTimeMinutes" />
            </div>
          }

          <div class="modal-footer">
            <button class="btn-cancel" (click)="closeModal()">Cancel</button>
            <button class="btn-save" (click)="save()">Save</button>
          </div>
        </div>
      </div>
    }
  `
})
export class MenuComponent implements OnInit {
  private menuService = inject(MenuService);
  categories = signal<Category[]>([]);
  items = signal<MenuItem[]>([]);
  selectedCategory = signal<Category | null>(null);
  loading = signal(true);
  showModal = signal(false);
  modalMode = signal<'category' | 'item'>('item');
  editingId = signal<string | null>(null);
  form: any = {};

  filteredItems  = computed(() => {
    const cat = this.selectedCategory();
    return cat ? this.items().filter(i => i.categoryId === cat.id) : this.items();
  });
  availableCount = computed(() => this.items().filter(i => i.isAvailable).length);
  inactiveCount  = computed(() => this.items().filter(i => !i.isAvailable).length);
  avgPrepTime    = computed(() => {
    const all = this.items();
    if (!all.length) return 0;
    return Math.round(all.reduce((s, i) => s + i.prepTimeMinutes, 0) / all.length);
  });

  ngOnInit(): void { this.loadAll(); }

  loadAll(): void {
    this.loading.set(true);
    this.menuService.getCategories().subscribe(cats => this.categories.set(cats));
    this.menuService.getItems().subscribe({
      next: items => { this.items.set(items); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  itemCountFor(catId: string): number {
    return this.items().filter(i => i.categoryId === catId).length;
  }

  selectCategory(cat: Category | null): void { this.selectedCategory.set(cat); }

  openAddCategory(): void {
    this.form = { name: '', icon: '', displayOrder: 0 };
    this.modalMode.set('category');
    this.editingId.set(null);
    this.showModal.set(true);
  }

  openAddItem(): void {
    this.form = { categoryId: this.categories()[0]?.id, name: '', description: '', basePrice: 0, isVeg: true, prepTimeMinutes: 15 };
    this.modalMode.set('item');
    this.editingId.set(null);
    this.showModal.set(true);
  }

  openEditItem(item: MenuItem): void {
    this.form = { categoryId: item.categoryId, name: item.name, description: item.description ?? '', basePrice: item.basePrice, isVeg: item.isVeg, prepTimeMinutes: item.prepTimeMinutes };
    this.modalMode.set('item');
    this.editingId.set(item.id);
    this.showModal.set(true);
  }

  closeModal(): void { this.showModal.set(false); }

  save(): void {
    const id = this.editingId();
    const obs = this.modalMode() === 'category'
      ? (id ? this.menuService.updateCategory(id, this.form) : this.menuService.createCategory(this.form))
      : (id ? this.menuService.updateItem(id, this.form) : this.menuService.createItem(this.form));
    (obs as Observable<Category | MenuItem>).subscribe({ next: () => { this.loadAll(); this.closeModal(); } });
  }

  toggleAvail(item: MenuItem): void {
    this.menuService.updateItem(item.id, { isAvailable: !item.isAvailable }).subscribe({ next: () => this.loadAll() });
  }

  removeItem(id: string): void {
    if (!confirm('Delete this item?')) return;
    this.menuService.deleteItem(id).subscribe({ next: () => this.loadAll() });
  }
}
