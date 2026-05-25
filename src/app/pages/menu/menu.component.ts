import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CurrencyPipe } from '@angular/common';
import { Observable } from 'rxjs';
import { MenuService } from '../../core/services/menu.service';
import { Category, MenuItem } from '../../core/models/menu.model';

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [FormsModule, CurrencyPipe],
  styles: [`
    .menu-layout { display: grid; grid-template-columns: 220px 1fr; gap: 20px; }
    .category-list { display: flex; flex-direction: column; gap: 4px; }
    .cat-btn { padding: 10px 12px; background: none; border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-muted); text-align: left; font-size: 13px; transition: all .15s; &:hover, &.active { background: var(--surface-2); color: var(--text); border-color: var(--primary); } }
    .items-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }
    .item-card { padding: 14px; }
    .item-name { font-weight: 600; margin-bottom: 4px; }
    .item-price { color: var(--primary); font-weight: 600; }
    .item-meta { font-size: 12px; color: var(--text-muted); margin-top: 4px; }
    .modal-bg { position: fixed; inset: 0; background: rgba(0,0,0,.6); display: flex; align-items: center; justify-content: center; z-index: 100; }
    .modal { background: var(--surface); border-radius: 12px; padding: 28px; width: 440px; max-width: 90vw; max-height: 80vh; overflow-y: auto; }
    .modal h2 { margin: 0 0 20px; }
    .modal-footer { display: flex; gap: 8px; justify-content: flex-end; margin-top: 20px; }
    .veg { color: var(--success); font-size: 11px; }
    .non-veg { color: var(--danger); font-size: 11px; }
    .unavailable { opacity: .5; }
  `],
  template: `
    <div class="page-header">
      <h1>Menu</h1>
      <div style="display:flex;gap:8px">
        <button class="btn btn-secondary" (click)="openAddCategory()">+ Category</button>
        <button class="btn btn-primary" (click)="openAddItem()">+ Item</button>
      </div>
    </div>

    <div class="menu-layout">
      <div>
        <div class="category-list">
          <button class="cat-btn" [class.active]="!selectedCategory()" (click)="selectCategory(null)">All Items</button>
          @for (cat of categories(); track cat.id) {
            <button class="cat-btn" [class.active]="selectedCategory()?.id === cat.id" (click)="selectCategory(cat)">
              {{ cat.icon }} {{ cat.name }}
            </button>
          }
        </div>
      </div>

      <div>
        @if (loading()) { <div class="loading"><div class="spinner"></div></div>
        } @else if (filteredItems().length === 0) {
          <div class="empty-state card">🍔<p>No items in this category</p></div>
        } @else {
          <div class="items-grid">
            @for (item of filteredItems(); track item.id) {
              <div class="card item-card" [class.unavailable]="!item.isAvailable">
                <div class="item-name">{{ item.name }}</div>
                <div class="item-price">{{ item.basePrice | currency:'INR':'symbol':'1.0-0' }}</div>
                <div class="item-meta">
                  <span [class]="item.isVeg ? 'veg' : 'non-veg'">{{ item.isVeg ? '🟢 Veg' : '🔴 Non-veg' }}</span>
                  · {{ item.prepTimeMinutes }}min
                </div>
                <div style="display:flex;gap:6px;margin-top:10px">
                  <button class="btn btn-ghost" style="font-size:11px;padding:3px 8px" (click)="openEditItem(item)">Edit</button>
                  <button class="btn btn-ghost" style="font-size:11px;padding:3px 8px" (click)="toggleAvail(item)">{{ item.isAvailable ? 'Disable' : 'Enable' }}</button>
                  <button class="btn btn-ghost" style="font-size:11px;padding:3px 8px;color:var(--danger)" (click)="removeItem(item.id)">Del</button>
                </div>
              </div>
            }
          </div>
        }
      </div>
    </div>

    @if (showModal()) {
      <div class="modal-bg" (click)="closeModal()">
        <div class="modal" (click)="$event.stopPropagation()">
          @if (modalMode() === 'category') {
            <h2>{{ editingId() ? 'Edit Category' : 'New Category' }}</h2>
            <div class="form-group"><label>Name</label><input [(ngModel)]="form.name" /></div>
            <div class="form-group"><label>Icon (emoji)</label><input [(ngModel)]="form.icon" placeholder="🍔" /></div>
            <div class="form-group"><label>Display Order</label><input type="number" [(ngModel)]="form.displayOrder" /></div>
          } @else {
            <h2>{{ editingId() ? 'Edit Item' : 'New Item' }}</h2>
            <div class="form-group">
              <label>Category</label>
              <select [(ngModel)]="form.categoryId">
                @for (cat of categories(); track cat.id) { <option [value]="cat.id">{{ cat.name }}</option> }
              </select>
            </div>
            <div class="form-group"><label>Name</label><input [(ngModel)]="form.name" /></div>
            <div class="form-group"><label>Description</label><textarea [(ngModel)]="form.description" rows="2"></textarea></div>
            <div class="form-group"><label>Base Price (₹)</label><input type="number" [(ngModel)]="form.basePrice" /></div>
            <div class="form-group">
              <label>Type</label>
              <select [(ngModel)]="form.isVeg">
                <option [ngValue]="true">Veg</option>
                <option [ngValue]="false">Non-veg</option>
              </select>
            </div>
            <div class="form-group"><label>Prep Time (min)</label><input type="number" [(ngModel)]="form.prepTimeMinutes" /></div>
          }
          <div class="modal-footer">
            <button class="btn btn-ghost" (click)="closeModal()">Cancel</button>
            <button class="btn btn-primary" (click)="save()">Save</button>
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
  filteredItems = signal<MenuItem[]>([]);
  selectedCategory = signal<Category | null>(null);
  loading = signal(true);
  showModal = signal(false);
  modalMode = signal<'category' | 'item'>('item');
  editingId = signal<string | null>(null);
  form: any = {};

  ngOnInit(): void { this.loadAll(); }

  loadAll(): void {
    this.loading.set(true);
    this.menuService.getCategories().subscribe(cats => this.categories.set(cats));
    this.menuService.getItems().subscribe({
      next: items => { this.items.set(items); this.applyFilter(); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  selectCategory(cat: Category | null): void { this.selectedCategory.set(cat); this.applyFilter(); }

  applyFilter(): void {
    const cat = this.selectedCategory();
    this.filteredItems.set(cat ? this.items().filter(i => i.categoryId === cat.id) : this.items());
  }

  openAddCategory(): void { this.form = { name: '', icon: '', displayOrder: 0 }; this.modalMode.set('category'); this.editingId.set(null); this.showModal.set(true); }
  openAddItem(): void { this.form = { categoryId: this.categories()[0]?.id, name: '', description: '', basePrice: 0, isVeg: true, prepTimeMinutes: 15 }; this.modalMode.set('item'); this.editingId.set(null); this.showModal.set(true); }
  openEditItem(item: MenuItem): void { this.form = { categoryId: item.categoryId, name: item.name, description: item.description ?? '', basePrice: item.basePrice, isVeg: item.isVeg, prepTimeMinutes: item.prepTimeMinutes }; this.modalMode.set('item'); this.editingId.set(item.id); this.showModal.set(true); }
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
    if (!confirm('Delete item?')) return;
    this.menuService.deleteItem(id).subscribe({ next: () => this.loadAll() });
  }
}
