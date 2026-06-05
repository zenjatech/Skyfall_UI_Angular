import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { CustomerService } from '../../core/services/customer.service';
import { Customer } from '../../core/models/customer.model';
import { IconComponent } from '../../core/components/icon.component';

const CRM_KPIS = [
  { label: 'TOTAL CUSTOMERS', value: '—',   icon: 'users',      tone: 'gold'  },
  { label: 'VIP',             value: '—',   icon: 'sparkles',   tone: 'amber' },
  { label: 'AVG LTV',         value: '—',   icon: 'indian-rupee',tone: 'green' },
  { label: 'RETENTION',       value: '68%', icon: 'user-check', tone: 'blue'  },
];

const FILTERS = ['All', 'Regular', 'New'] as const;

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [FormsModule, DatePipe, IconComponent],
  styles: [`
    .dash { display: flex; flex-direction: column; gap: 22px; }

    /* KPI grid */
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
    .kc { border-radius: 12px; border: 1px solid #E8DBBF; background: #fff; padding: 18px 20px; transition: box-shadow .2s;
      &:hover { box-shadow: 0 8px 24px rgba(184,146,58,0.12); } }
    .kc-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
    .kc-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.14em; color: #A8998A; }
    .kc-value { margin-top: 8px; font-family: var(--font-heading); font-size: 26px; font-weight: 600; color: #1A1A1A; line-height: 1; }
    .kc-icon { width: 42px; height: 42px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
      &.gold  { background: #F7EDD8; color: #B8923A; }
      &.green { background: #EBF7ED; color: #2A7A3A; }
      &.blue  { background: #EBF0F9; color: #2A5A9A; }
      &.amber { background: #FEF3C7; color: #92400E; }
    }

    /* Section card */
    .sc { border-radius: 12px; border: 1px solid #E8DBBF; background: #fff; overflow: hidden; }
    .sc-head { display: flex; align-items: center; justify-content: space-between; gap: 16px; min-height: 64px; padding: 0 20px; border-bottom: 1px solid #E8DBBF; flex-wrap: wrap; }

    /* Filter tabs */
    .filter-tabs { display: flex; border: 1px solid #E8DBBF; border-radius: 8px; background: #fff; padding: 4px; gap: 2px; }
    .filter-btn { height: 32px; padding: 0 12px; border-radius: 6px; border: none; background: none; font-size: 11px; font-weight: 500; color: #7A7060; cursor: pointer; transition: background .12s, color .12s; font-family: var(--font-body);
      &:hover { background: #FBF6EC; }
      &.active { background: #F7EDD8; color: #8A6A24; }
    }

    /* Search */
    .search-wrap { position: relative; width: 320px; }
    .search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #A8998A; pointer-events: none; }
    .search-input { width: 100%; height: 36px; border-radius: 8px; border: 1px solid #E8DBBF; background: #FAFAF7; padding: 0 12px 0 36px; font-size: 12px; color: #1A1A1A; outline: none; font-family: var(--font-body);
      &::placeholder { color: #A8998A; }
      &:focus { border-color: #B8923A; box-shadow: 0 0 0 2px rgba(184,146,58,0.18); }
    }

    /* Table */
    .data-table { width: 100%; border-collapse: collapse; min-width: 960px; }
    .data-table thead tr { background: #FAFAF7; text-align: left; }
    .data-table th { padding: 10px 16px; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.14em; color: #A8998A; }
    .data-table td { padding: 12px 16px; font-size: 12px; color: #1A1A1A; }
    .data-table tr:not(:first-child) td { border-top: 1px solid #E8DBBF; }
    .data-table tr:hover td { background: #FBF6EC; }
    .overflow-x { overflow-x: auto; }

    /* Customer cell */
    .cust-cell { display: flex; align-items: center; gap: 12px; }
    .avatar { width: 30px; height: 30px; border-radius: 50%; background: #F7EDD8; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 600; color: #8A6A24; flex-shrink: 0; }
    .cust-name { font-size: 12px; font-weight: 600; color: #1A1A1A; }

    /* Tag badge */
    .tag { display: inline-flex; border-radius: 10px; border: 1px solid; padding: 3px 8px; font-size: 9px; font-weight: 700; line-height: 1;
      &.VIP      { background: #F7EDD8; color: #8A6A24; border-color: #B8923A; }
      &.Regular  { background: #EBF0F9; color: #2A5A9A; border-color: #EBF0F9; }
      &.New      { background: #EBF7ED; color: #2A7A3A; border-color: #EBF7ED; }
      &.Inactive { background: #F4EFE6; color: #7A7060; border-color: #E8DBBF; }
    }

    /* Action buttons */
    .action-btns { display: flex; align-items: center; gap: 8px; }
    .act-btn { display: inline-flex; align-items: center; gap: 6px; height: 32px; padding: 0 12px; border-radius: 8px; font-size: 11px; font-weight: 500; cursor: pointer; transition: background .12s; font-family: var(--font-body);
      &.gold { border: 1px solid #B8923A; background: #B8923A; color: #fff; &:hover { background: #8A6A24; } }
      &.ghost { border: 1px solid #E8DBBF; background: #fff; color: #8A6A24; &:hover { background: #FBF6EC; } }
    }

    /* Pagination */
    .pagination { display: flex; align-items: center; justify-content: space-between; height: 58px; padding: 0 20px; border-top: 1px solid #E8DBBF; }
    .pg-info { font-size: 12px; color: #7A7060; }
    .pg-btns { display: flex; align-items: center; gap: 8px; }
    .pg-btn { width: 32px; height: 32px; border-radius: 8px; border: 1px solid #E8DBBF; background: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #7A7060; font-size: 11px; font-weight: 500; font-family: var(--font-body);
      &:hover { background: #FBF6EC; }
      &.active { border-color: #B8923A; background: #F7EDD8; color: #8A6A24; }
    }

    /* Loading */
    .spinner { width: 28px; height: 28px; border: 2px solid #E8DBBF; border-top-color: #B8923A; border-radius: 50%; animation: spin .7s linear infinite; margin: 48px auto; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .empty-state { padding: 48px 24px; text-align: center; color: #7A7060; }

    /* Drawer overlay */
    .drawer-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,.32); z-index: 100;
      display: flex; justify-content: flex-end;
    }
    .drawer {
      width: 400px; height: 100vh; background: #fff;
      display: flex; flex-direction: column;
      border-left: 1px solid #E8DBBF;
      animation: slideIn .18s ease;
    }
    @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
    .drawer-head {
      display: flex; align-items: center; justify-content: space-between;
      padding: 18px 20px; border-bottom: 1px solid #E8DBBF;
      flex-shrink: 0;
    }
    .drawer-title { font-family: var(--font-heading); font-size: 17px; font-weight: 600; color: #1A1A1A; }
    .close-btn { width: 32px; height: 32px; border-radius: 8px; border: 1px solid #E8DBBF; background: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #7A7060; &:hover { background: #FBF6EC; color: #8A6A24; } }
    .drawer-body { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 18px; }

    /* Customer profile block */
    .cust-profile { display: flex; align-items: center; gap: 14px; }
    .cust-avatar-lg { width: 52px; height: 52px; border-radius: 50%; background: #F7EDD8; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 700; color: #8A6A24; flex-shrink: 0; }
    .cust-profile-info .name { font-size: 16px; font-weight: 700; color: #1A1A1A; }
    .cust-profile-info .phone { font-size: 12px; color: #7A7060; margin-top: 3px; }
    .cust-profile-info .email { font-size: 11px; color: #A8998A; margin-top: 2px; }

    /* Stat chips */
    .stat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
    .stat-chip { border: 1px solid #E8DBBF; border-radius: 10px; padding: 12px; text-align: center;
      .stat-val { font-family: var(--font-heading); font-size: 18px; font-weight: 600; color: #1A1A1A; }
      .stat-lbl { font-size: 10px; color: #A8998A; margin-top: 3px; font-weight: 500; text-transform: uppercase; letter-spacing: .06em; }
    }

    /* Detail rows */
    .detail-section { border: 1px solid #E8DBBF; border-radius: 10px; overflow: hidden; }
    .detail-section-title { padding: 10px 14px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .10em; color: #A8998A; background: #FAFAF7; border-bottom: 1px solid #E8DBBF; }
    .detail-row { display: flex; justify-content: space-between; gap: 12px; padding: 10px 14px; border-bottom: 1px solid #E8DBBF; font-size: 13px; &:last-child { border-bottom: 0; } }
    .detail-label { color: #7A7060; }
    .detail-value { font-weight: 500; color: #1A1A1A; }
  `],
  template: `
    <div class="dash">

      <!-- KPI cards -->
      <div class="kpi-grid">
        @for (kpi of kpis; track kpi.label) {
          <div class="kc">
            <div class="kc-row">
              <div>
                <div class="kc-label">{{ kpi.label }}</div>
                <div class="kc-value">{{ kpi.label === 'TOTAL CUSTOMERS' ? totalCount() : kpi.value }}</div>
              </div>
              <div class="kc-icon {{ kpi.tone }}">
                <app-icon [name]="kpi.icon" [size]="18" [sw]="1.8"></app-icon>
              </div>
            </div>
          </div>
        }
      </div>

      <!-- Customer table section -->
      <div class="sc">
        <div class="sc-head">
          <div class="filter-tabs">
            @for (f of filters; track f) {
              <button class="filter-btn" [class.active]="activeFilter() === f" (click)="setFilter(f)">{{ f }}</button>
            }
          </div>
          <div class="search-wrap">
            <span class="search-icon">
              <app-icon name="search" [size]="15" [sw]="1.8"></app-icon>
            </span>
            <input class="search-input" type="text" placeholder="Search customers"
                   [value]="search()" (input)="search.set($any($event.target).value)" />
          </div>
        </div>

        @if (loading()) {
          <div class="spinner"></div>
        } @else if (visible().length === 0) {
          <div class="empty-state">No customers found.</div>
        } @else {
          <div class="overflow-x">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Customer</th><th>Phone</th><th>Visits</th>
                  <th>Total Spent</th><th>Last Visit</th><th>Tag</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (c of visible(); track c.id) {
                  <tr>
                    <td>
                      <div class="cust-cell">
                        <div class="avatar">{{ initials(c.name ?? c.phone) }}</div>
                        <div class="cust-name">{{ c.name || '—' }}</div>
                      </div>
                    </td>
                    <td>{{ c.phone }}</td>
                    <td>{{ c.visitCount }}</td>
                    <td style="font-weight:500">₹{{ c.totalSpent.toLocaleString('en-IN') }}</td>
                    <td style="color:#7A7060">{{ c.lastVisit ? fmtDate(c.lastVisit) : '—' }}</td>
                    <td><span class="tag New">New</span></td>
                    <td>
                      <div class="action-btns">
                        <button class="act-btn ghost" (click)="openDrawer(c)">
                          <app-icon name="eye" [size]="14" [sw]="1.8"></app-icon>
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <div class="pagination">
            <div class="pg-info">Showing {{ visible().length }} of {{ all().length }}</div>
            <div class="pg-btns">
              <button class="pg-btn"><app-icon name="chevron-left" [size]="15" [sw]="1.8"></app-icon></button>
              <button class="pg-btn active">1</button>
              <button class="pg-btn"><app-icon name="chevron-right" [size]="15" [sw]="1.8"></app-icon></button>
            </div>
          </div>
        }
      </div>
    </div>

    <!-- Customer detail drawer -->
    @if (selectedCustomer()) {
      <div class="drawer-overlay" (click)="closeDrawer()">
        <div class="drawer" (click)="$event.stopPropagation()">
          <div class="drawer-head">
            <span class="drawer-title">Customer Profile</span>
            <button class="close-btn" (click)="closeDrawer()">
              <app-icon name="x" [size]="15" [sw]="1.8"></app-icon>
            </button>
          </div>
          <div class="drawer-body">
            <div class="cust-profile">
              <div class="cust-avatar-lg">{{ initials(selectedCustomer()!.name ?? selectedCustomer()!.phone) }}</div>
              <div class="cust-profile-info">
                <div class="name">{{ selectedCustomer()!.name || '—' }}</div>
                <div class="phone">{{ selectedCustomer()!.phone }}</div>
                @if (selectedCustomer()!.email) { <div class="email">{{ selectedCustomer()!.email }}</div> }
              </div>
            </div>

            <div class="stat-grid">
              <div class="stat-chip">
                <div class="stat-val">{{ selectedCustomer()!.visitCount }}</div>
                <div class="stat-lbl">Visits</div>
              </div>
              <div class="stat-chip">
                <div class="stat-val">₹{{ selectedCustomer()!.totalSpent.toLocaleString('en-IN') }}</div>
                <div class="stat-lbl">Total Spent</div>
              </div>
              <div class="stat-chip">
                <div class="stat-val">{{ selectedCustomer()!.lastVisit ? fmtDate(selectedCustomer()!.lastVisit!) : '—' }}</div>
                <div class="stat-lbl">Last Visit</div>
              </div>
            </div>

            <div class="detail-section">
              <div class="detail-section-title">Details</div>
              <div class="detail-row">
                <span class="detail-label">Member since</span>
                <span class="detail-value">{{ selectedCustomer()!.createdAt | date:'dd MMM yyyy' }}</span>
              </div>
              @if (selectedCustomer()!.birthday) {
                <div class="detail-row">
                  <span class="detail-label">Birthday</span>
                  <span class="detail-value">{{ selectedCustomer()!.birthday }}</span>
                </div>
              }
              @if (selectedCustomer()!.anniversary) {
                <div class="detail-row">
                  <span class="detail-label">Anniversary</span>
                  <span class="detail-value">{{ selectedCustomer()!.anniversary }}</span>
                </div>
              }
              @if (selectedCustomer()!.specialEventName) {
                <div class="detail-row">
                  <span class="detail-label">{{ selectedCustomer()!.specialEventName }}</span>
                  <span class="detail-value">{{ selectedCustomer()!.specialEventDate }}</span>
                </div>
              }
            </div>
          </div>
        </div>
      </div>
    }
  `
})
export class CustomersComponent implements OnInit {
  private customerService = inject(CustomerService);
  all = signal<Customer[]>([]);
  loading = signal(true);
  activeFilter = signal<string>('All');
  search = signal('');

  readonly kpis = CRM_KPIS;
  readonly filters = FILTERS;

  selectedCustomer = signal<Customer | null>(null);

  totalCount = computed(() => this.all().length > 0 ? String(this.all().length) : '—');

  visible = computed(() => {
    const q = this.search().trim().toLowerCase();
    return this.all().filter(c => {
      const matchSearch = !q || (c.name ?? '').toLowerCase().includes(q) || c.phone.includes(q);
      return matchSearch;
    });
  });

  ngOnInit(): void {
    this.customerService.getAll().subscribe({
      next: d => { this.all.set(d); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  setFilter(f: string): void { this.activeFilter.set(f); }

  openDrawer(c: Customer): void { this.selectedCustomer.set(c); }
  closeDrawer(): void { this.selectedCustomer.set(null); }

  initials(name: string): string {
    return name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
  }

  fmtDate(d: string | Date): string {
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}
