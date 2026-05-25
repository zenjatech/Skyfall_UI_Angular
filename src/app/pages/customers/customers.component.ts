import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { CustomerService } from '../../core/services/customer.service';
import { Customer } from '../../core/models/customer.model';

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [FormsModule, CurrencyPipe, DatePipe],
  styles: [`
    .modal-bg { position: fixed; inset: 0; background: rgba(0,0,0,.6); display: flex; align-items: center; justify-content: center; z-index: 100; }
    .modal { background: var(--surface); border-radius: 12px; padding: 28px; width: 400px; max-width: 90vw; }
    .modal h2 { margin: 0 0 20px; }
    .modal-footer { display: flex; gap: 8px; justify-content: flex-end; margin-top: 20px; }
    .search-bar { margin-bottom: 16px; input { max-width: 300px; } }
  `],
  template: `
    <div class="page-header"><h1>Customers</h1><button class="btn btn-primary" (click)="openAdd()">+ Add / Update</button></div>

    <div class="search-bar form-group">
      <input placeholder="Search by name or phone…" [(ngModel)]="search" (input)="filter()" />
    </div>

    @if (loading()) { <div class="loading"><div class="spinner"></div></div>
    } @else if (filtered().length === 0) {
      <div class="empty-state card">🧑‍🤝‍🧑<p>No customers found</p></div>
    } @else {
      <div class="card table-wrapper">
        <table>
          <thead><tr><th>Name</th><th>Phone</th><th>Visits</th><th>Total Spent</th><th>Last Visit</th><th></th></tr></thead>
          <tbody>
            @for (c of filtered(); track c.id) {
              <tr>
                <td>{{ c.name || '—' }}</td>
                <td>{{ c.phone }}</td>
                <td>{{ c.visitCount }}</td>
                <td>{{ c.totalSpent | currency:'INR':'symbol':'1.0-0' }}</td>
                <td>{{ c.lastVisit ? (c.lastVisit | date:'dd MMM') : '—' }}</td>
                <td><button class="btn btn-ghost" style="font-size:12px;padding:4px 8px;color:var(--danger)" (click)="remove(c.id)">Delete</button></td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }

    @if (showModal()) {
      <div class="modal-bg" (click)="closeModal()">
        <div class="modal" (click)="$event.stopPropagation()">
          <h2>Customer</h2>
          <div class="form-group"><label>Phone *</label><input [(ngModel)]="form.phone" placeholder="+91…" /></div>
          <div class="form-group"><label>Name</label><input [(ngModel)]="form.name" /></div>
          <div class="form-group"><label>Email</label><input type="email" [(ngModel)]="form.email" /></div>
          <div class="modal-footer">
            <button class="btn btn-ghost" (click)="closeModal()">Cancel</button>
            <button class="btn btn-primary" (click)="save()">Save</button>
          </div>
        </div>
      </div>
    }
  `
})
export class CustomersComponent implements OnInit {
  private customerService = inject(CustomerService);
  all = signal<Customer[]>([]);
  filtered = signal<Customer[]>([]);
  loading = signal(true);
  showModal = signal(false);
  search = '';
  form: any = { phone: '', name: '', email: '' };

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.customerService.getAll().subscribe({ next: d => { this.all.set(d); this.filtered.set(d); this.loading.set(false); }, error: () => this.loading.set(false) });
  }

  filter(): void {
    const q = this.search.toLowerCase();
    this.filtered.set(this.all().filter(c => (c.name ?? '').toLowerCase().includes(q) || c.phone.includes(q)));
  }

  openAdd(): void { this.form = { phone: '', name: '', email: '' }; this.showModal.set(true); }
  closeModal(): void { this.showModal.set(false); }

  save(): void {
    this.customerService.upsert(this.form).subscribe({ next: () => { this.load(); this.closeModal(); } });
  }

  remove(id: string): void {
    if (!confirm('Delete customer?')) return;
    this.customerService.delete(id).subscribe({ next: () => this.load() });
  }
}
