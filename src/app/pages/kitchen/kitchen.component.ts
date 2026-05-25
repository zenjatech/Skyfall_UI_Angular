import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { KotService } from '../../core/services/kot.service';
import { KOT } from '../../core/models/kot.model';

@Component({
  selector: 'app-kitchen',
  standalone: true,
  imports: [DatePipe],
  styles: [`
    .filter-bar { display: flex; gap: 8px; margin-bottom: 20px; }
    .kots { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
    .kot-card { padding: 16px; }
    .kot-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .kot-num { font-size: 18px; font-weight: 700; }
    .table-tag { font-size: 12px; color: var(--text-muted); background: var(--surface-2); padding: 2px 8px; border-radius: 4px; }
    .kot-items { list-style: none; padding: 0; margin: 0 0 12px; }
    .kot-items li { padding: 4px 0; border-bottom: 1px solid var(--border); font-size: 13px; color: var(--text); }
    .kot-items li:last-child { border-bottom: none; }
    .kot-footer { display: flex; gap: 8px; justify-content: flex-end; }
    .time { font-size: 11px; color: var(--text-muted); margin-top: 8px; }
  `],
  template: `
    <div class="page-header">
      <h1>Kitchen Display</h1>
      <button class="btn btn-secondary" (click)="load()">Refresh</button>
    </div>

    <div class="filter-bar">
      <button class="btn" [class.btn-primary]="filter() === 'new'" (click)="setFilter('new')">New</button>
      <button class="btn" [class.btn-secondary]="filter() !== 'acknowledged'" [class.btn-primary]="filter() === 'acknowledged'" (click)="setFilter('acknowledged')">In Progress</button>
      <button class="btn btn-ghost" (click)="setFilter('')">All</button>
    </div>

    @if (loading()) {
      <div class="loading"><div class="spinner"></div></div>
    } @else if (kots().length === 0) {
      <div class="empty-state card">🍳<p>No KOTs found</p></div>
    } @else {
      <div class="kots">
        @for (kot of kots(); track kot.id) {
          <div class="card kot-card" [style.border-left-color]="statusColor(kot.status)" style="border-left: 4px solid">
            <div class="kot-header">
              <span class="kot-num">KOT #{{ kot.kotNumber }}</span>
              <span class="table-tag">Table {{ kot.tableNumber }}</span>
            </div>
            <ul class="kot-items">
              @for (item of parseItems(kot.itemsJson); track $index) {
                <li>{{ item.Quantity || item.quantity }}× {{ item.Name || item.name }}
                  @if (item.Variant || item.variant) { <small>({{ item.Variant || item.variant }})</small> }
                </li>
              }
            </ul>
            <div class="time">{{ kot.createdAt | date:'HH:mm' }}</div>
            <div class="kot-footer">
              @if (kot.status === 'new') {
                <button class="btn btn-secondary" (click)="updateStatus(kot, 'acknowledged')">Acknowledge</button>
              }
              @if (kot.status !== 'completed') {
                <button class="btn btn-primary" (click)="updateStatus(kot, 'completed')">Done</button>
              }
            </div>
          </div>
        }
      </div>
    }
  `
})
export class KitchenComponent implements OnInit {
  private kotService = inject(KotService);
  kots = signal<KOT[]>([]);
  loading = signal(true);
  filter = signal('new');

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.kotService.getAll(this.filter() || undefined).subscribe({
      next: data => { this.kots.set(data); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  setFilter(f: string): void { this.filter.set(f); this.load(); }

  updateStatus(kot: KOT, status: string): void {
    this.kotService.updateStatus(kot.id, status).subscribe({
      next: updated => this.kots.update(list => list.map(k => k.id === updated.id ? updated : k))
    });
  }

  parseItems(json: string): any[] {
    try { return JSON.parse(json); } catch { return []; }
  }

  statusColor(status: string): string {
    return { new: 'var(--danger)', acknowledged: 'var(--warning)', completed: 'var(--success)' }[status] ?? 'var(--border)';
  }
}
