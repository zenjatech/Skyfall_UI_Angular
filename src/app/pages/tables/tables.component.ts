import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TableService } from '../../core/services/table.service';
import { CafeTable } from '../../core/models/table.model';

@Component({
  selector: 'app-tables',
  standalone: true,
  imports: [FormsModule],
  styles: [`
    .tables-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .table-tile {
      padding: 20px 16px; text-align: center; cursor: pointer; transition: all .15s;
      border: 2px solid var(--border);
      &.free { border-color: var(--success); }
      &.occupied { border-color: var(--danger); }
      &.reserved { border-color: var(--warning); }
      &.bill_requested { border-color: var(--primary); }
    }
    .table-num { font-size: 28px; font-weight: 700; margin-bottom: 4px; }
    .table-status { font-size: 11px; text-transform: uppercase; letter-spacing: .05em; }
    .table-cap { font-size: 12px; color: var(--text-muted); }
    .modal-bg { position: fixed; inset: 0; background: rgba(0,0,0,.6); display: flex; align-items: center; justify-content: center; z-index: 100; }
    .modal { background: var(--surface); border-radius: 12px; padding: 28px; width: 360px; max-width: 90vw; }
    .modal h2 { margin: 0 0 20px; font-size: 18px; }
    .modal-footer { display: flex; gap: 8px; justify-content: flex-end; margin-top: 20px; }
  `],
  template: `
    <div class="page-header">
      <h1>Tables</h1>
      <button class="btn btn-primary" (click)="openAdd()">+ Add Table</button>
    </div>

    @if (loading()) {
      <div class="loading"><div class="spinner"></div></div>
    } @else {
      <div class="tables-grid">
        @for (table of tables(); track table.id) {
          <div class="card table-tile" [class]="table.status">
            <div class="table-num">{{ table.tableNumber }}</div>
            <div class="table-status">{{ table.status.replace('_', ' ') }}</div>
            <div class="table-cap">{{ table.capacity }} seats</div>
            <div style="margin-top:12px;display:flex;gap:8px;justify-content:center">
              <button class="btn btn-ghost" style="font-size:11px;padding:4px 8px" (click)="openEdit(table)">Edit</button>
              <button class="btn btn-ghost" style="font-size:11px;padding:4px 8px;color:var(--danger)" (click)="remove(table.id)">Del</button>
            </div>
          </div>
        }
      </div>
    }

    @if (showModal()) {
      <div class="modal-bg" (click)="closeModal()">
        <div class="modal" (click)="$event.stopPropagation()">
          <h2>{{ editingId() ? 'Edit Table' : 'New Table' }}</h2>
          @if (!editingId()) {
            <div class="form-group"><label>Table Number</label><input type="number" [(ngModel)]="form.tableNumber" /></div>
          }
          <div class="form-group"><label>Capacity</label><input type="number" [(ngModel)]="form.capacity" /></div>
          @if (editingId()) {
            <div class="form-group">
              <label>Status</label>
              <select [(ngModel)]="form.status">
                <option value="free">Free</option>
                <option value="occupied">Occupied</option>
                <option value="reserved">Reserved</option>
                <option value="bill_requested">Bill Requested</option>
              </select>
            </div>
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
export class TablesComponent implements OnInit {
  private tableService = inject(TableService);
  tables = signal<CafeTable[]>([]);
  loading = signal(true);
  showModal = signal(false);
  editingId = signal<string | null>(null);
  form: any = { tableNumber: 1, capacity: 4, status: 'free' };

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.tableService.getAll().subscribe({ next: d => { this.tables.set(d); this.loading.set(false); }, error: () => this.loading.set(false) });
  }

  openAdd(): void { this.form = { tableNumber: 1, capacity: 4 }; this.editingId.set(null); this.showModal.set(true); }

  openEdit(t: CafeTable): void { this.form = { capacity: t.capacity, status: t.status }; this.editingId.set(t.id); this.showModal.set(true); }

  closeModal(): void { this.showModal.set(false); }

  save(): void {
    const id = this.editingId();
    const obs = id ? this.tableService.update(id, { capacity: this.form.capacity, status: this.form.status })
      : this.tableService.create({ tableNumber: this.form.tableNumber, capacity: this.form.capacity });
    obs.subscribe({ next: () => { this.load(); this.closeModal(); } });
  }

  remove(id: string): void {
    if (!confirm('Delete table?')) return;
    this.tableService.delete(id).subscribe({ next: () => this.load() });
  }
}
