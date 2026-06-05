import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CustomerService } from '../../core/services/customer.service';
import { Customer } from '../../core/models/customer.model';
import { IconComponent } from '../../core/components/icon.component';

@Component({
  selector: 'app-campaigns',
  standalone: true,
  imports: [DatePipe, FormsModule, IconComponent],
  styles: [`
    .campaign-grid { display: grid; grid-template-columns: 280px minmax(0, 1fr); gap: 16px; }
    .segment-list { display: grid; gap: 8px; }
    .segment-btn { min-height: 42px; border: 1px solid var(--gold-border); border-radius: 8px; background: var(--white); color: var(--muted); text-align: left; padding: 0 12px; cursor: pointer; }
    .segment-btn.active { border-color: var(--gold); background: var(--gold-faint); color: #8A6A24; font-weight: 700; }
    .tools { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
    @media (max-width: 860px) { .campaign-grid { grid-template-columns: 1fr; } }
  `],
  template: `
    <div class="page-header">
      <h1>Campaigns</h1>
      <div class="tools">
        <input class="field-input" style="width:240px" [ngModel]="search()" (ngModelChange)="search.set($event)" placeholder="Search customers" />
        <button class="btn btn-gold" (click)="exportCsv()">
          <app-icon name="arrow-up-right" [size]="14" [sw]="1.8"></app-icon>
          Export CSV
        </button>
      </div>
    </div>

    <div class="campaign-grid">
      <aside class="section-card">
        <div class="section-card-header"><h2>Segments</h2></div>
        <div class="segment-list" style="padding:14px">
          @for (segment of segments; track segment.value) {
            <button class="segment-btn" [class.active]="activeSegment() === segment.value" (click)="activeSegment.set(segment.value)">
              {{ segment.label }}
              <div style="font-size:11px;color:var(--muted2);margin-top:2px">{{ segment.description }}</div>
            </button>
          }
        </div>
      </aside>

      <section class="section-card">
        <div class="section-card-header">
          <h2>{{ filteredCustomers().length }} Customers</h2>
          <span style="font-size:11px;color:var(--muted)">WhatsApp-ready CRM list</span>
        </div>
        @if (loading()) {
          <div class="loading-center"><div class="spinner"></div></div>
        } @else if (filteredCustomers().length === 0) {
          <div class="empty-state"><p>No customers in this segment.</p></div>
        } @else {
          <table class="data-table">
            <thead><tr><th>Name</th><th>Phone</th><th>Visits</th><th>Total Spent</th><th>Last Visit</th></tr></thead>
            <tbody>
              @for (customer of filteredCustomers(); track customer.id) {
                <tr>
                  <td>{{ customer.name || 'Guest' }}</td>
                  <td>{{ customer.phone }}</td>
                  <td>{{ customer.visitCount }}</td>
                  <td>₹{{ customer.totalSpent.toLocaleString('en-IN') }}</td>
                  <td>{{ customer.lastVisit ? (customer.lastVisit | date:'dd MMM yyyy') : 'Never' }}</td>
                </tr>
              }
            </tbody>
          </table>
        }
      </section>
    </div>
  `
})
export class CampaignsComponent implements OnInit {
  private customerService = inject(CustomerService);
  customers = signal<Customer[]>([]);
  loading = signal(true);
  activeSegment = signal<'all' | 'repeat' | 'birthday' | 'inactive'>('all');
  search = signal('');

  readonly segments = [
    { value: 'all' as const, label: 'All customers', description: 'Complete CRM base' },
    { value: 'repeat' as const, label: 'Repeat guests', description: '2 or more visits' },
    { value: 'birthday' as const, label: 'Birthday list', description: 'Birthday captured' },
    { value: 'inactive' as const, label: 'Win-back', description: 'No visit in 30 days' },
  ];

  filteredCustomers = computed(() => {
    const q = this.search().trim().toLowerCase();
    const now = Date.now();
    return this.customers().filter(customer => {
      if (q && !`${customer.name ?? ''} ${customer.phone} ${customer.email ?? ''}`.toLowerCase().includes(q)) return false;
      if (this.activeSegment() === 'repeat') return customer.visitCount >= 2;
      if (this.activeSegment() === 'birthday') return !!customer.birthday;
      if (this.activeSegment() === 'inactive') {
        if (!customer.lastVisit) return true;
        return (now - new Date(customer.lastVisit).getTime()) / 86400000 >= 30;
      }
      return true;
    });
  });

  ngOnInit(): void {
    this.customerService.getAll().subscribe({
      next: customers => { this.customers.set(customers); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  exportCsv(): void {
    const rows = [
      ['name', 'phone', 'email', 'visits', 'total_spent', 'last_visit'],
      ...this.filteredCustomers().map(c => [
        c.name ?? '',
        c.phone,
        c.email ?? '',
        String(c.visitCount),
        String(c.totalSpent),
        c.lastVisit ?? ''
      ])
    ];
    const csv = rows.map(row => row.map(value => `"${value.replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `skyfall-${this.activeSegment()}-customers.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
