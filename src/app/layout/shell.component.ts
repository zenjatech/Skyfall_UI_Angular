import { Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AsyncPipe } from '@angular/common';
import { AuthService } from '../core/services/auth.service';
import { IconComponent } from '../core/components/icon.component';
import { OrderService } from '../core/services/order.service';
import { KotService } from '../core/services/kot.service';
import { ROUTE_ROLES } from '../core/guards/role.guard';

const NAV_GROUPS = [
  {
    label: 'OVERVIEW',
    items: [
      { label: 'Dashboard',   icon: 'layout-dashboard', route: '/dashboard' },
      { label: 'Live Orders', icon: 'receipt-text',     route: '/orders' },
      { label: 'Kitchen KOT', icon: 'chef-hat',         route: '/kitchen' },
    ]
  },
  {
    label: 'OPERATIONS',
    items: [
      { label: 'Table Map', icon: 'table-2',         route: '/tables' },
      { label: 'POS',       icon: 'credit-card',     route: '/pos' },
      { label: 'Menu',      icon: 'utensils-crossed',route: '/menu' },
      { label: 'Billing',   icon: 'receipt-text',    route: '/payments' },
    ]
  },
  {
    label: 'GROWTH',
    items: [
      { label: 'Customers', icon: 'users', route: '/customers' },
      { label: 'Analytics', icon: 'bar-chart-3', route: '/analytics' },
      { label: 'Campaigns', icon: 'megaphone', route: '/campaigns' },
    ]
  },
  {
    label: 'SYSTEM',
    items: [
      { label: 'Staff', icon: 'user-check', route: '/staff' },
      { label: 'Settings', icon: 'settings', route: '/settings' },
    ]
  },
];

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Owner Dashboard',
  '/orders':    'Live Orders',
  '/kitchen':   'Kitchen KOT',
  '/tables':    'Table Map',
  '/pos':       'Point of Sale',
  '/menu':      'Menu Management',
  '/analytics': 'Analytics',
  '/payments':  'Billing',
  '/campaigns': 'Campaigns',
  '/customers': 'Customer CRM',
  '/staff':     'Staff',
  '/settings':  'Settings',
};

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, AsyncPipe, IconComponent],
  styles: [`
    :host { display: contents; }

    /* ── Sidebar ── */
    .sidebar {
      position: fixed; top: 0; bottom: 0; left: 0;
      width: 220px;
      background: #fff;
      border-right: 1px solid #E8DBBF;
      display: flex; flex-direction: column;
      z-index: 40;
    }

    .brand {
      height: 86px;
      display: flex; align-items: center; gap: 12px;
      padding: 0 20px;
      flex-shrink: 0;
    }
    .brand-circle {
      width: 40px; height: 40px;
      border-radius: 50%;
      border: 1.5px solid #B8923A;
      background: #FBF6EC;
      color: #B8923A;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .brand-name {
      font-family: var(--font-heading);
      font-size: 17px;
      font-weight: 600;
      color: #1A1A1A;
      line-height: 1;
    }
    .brand-sub {
      font-size: 7px;
      font-weight: 600;
      letter-spacing: 0.24em;
      color: #8A6A24;
      margin-top: 4px;
    }

    /* ── Nav ── */
    .nav-scroll {
      flex: 1;
      padding: 0 12px;
      overflow-y: auto;
    }
    .nav-group {
      margin-bottom: 20px;
    }
    .nav-group-label {
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.18em;
      color: #A8998A;
      padding: 0 8px;
      margin-bottom: 8px;
    }
    .nav-item {
      display: flex;
      align-items: center;
      gap: 10px;
      height: 40px;
      padding: 0 12px;
      border-radius: 0 8px 8px 0;
      border-left: 3px solid transparent;
      font-size: 12px;
      font-weight: 400;
      color: #7A7060;
      text-decoration: none;
      transition: background .12s, color .12s;
      &:hover {
        background: #FBF6EC;
      }
      &.active {
        border-left-color: #B8923A;
        background: #F7EDD8;
        font-weight: 500;
        color: #8A6A24;
      }
    }

    .nav-item-inner { flex: 1; display: flex; align-items: center; justify-content: space-between; gap: 6px; min-width: 0; }
    .nav-label { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .nav-badge {
      min-width: 18px; height: 18px; padding: 0 5px;
      border-radius: 9px;
      background: #E53E3E;
      color: #fff;
      font-size: 10px; font-weight: 700; line-height: 18px;
      text-align: center;
      flex-shrink: 0;
    }

    /* ── User bar ── */
    .user-bar {
      border-top: 1px solid #E8DBBF;
      padding: 16px;
      flex-shrink: 0;
    }
    .user-row {
      display: flex; align-items: center; gap: 12px;
    }
    .avatar {
      width: 34px; height: 34px;
      border-radius: 50%;
      background: #F7EDD8;
      display: flex; align-items: center; justify-content: center;
      font-size: 12px; font-weight: 600;
      color: #8A6A24;
      flex-shrink: 0;
    }
    .user-info {
      flex: 1; min-width: 0;
      .user-name { font-size: 12px; font-weight: 500; color: #1A1A1A; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .user-role { font-size: 10px; color: #A8998A; text-transform: capitalize; }
    }
    .icon-btn {
      width: 32px; height: 32px;
      display: flex; align-items: center; justify-content: center;
      border-radius: 8px;
      border: none; background: none; cursor: pointer;
      color: #7A7060;
      transition: background .12s, color .12s;
      flex-shrink: 0;
      &:hover { background: #FBF6EC; color: #8A6A24; }
    }
    .signout-btn {
      margin-top: 12px;
      width: 100%; height: 32px;
      display: flex; align-items: center; justify-content: center; gap: 8px;
      border-radius: 8px;
      border: 1px solid #E8DBBF;
      background: #fff;
      font-size: 11px; font-weight: 500;
      color: #7A7060;
      cursor: pointer;
      transition: background .12s, color .12s;
      &:hover { background: #FBF6EC; color: #8A6A24; }
    }
    .role-chip {
      display: inline-block; margin-top: 6px;
      border-radius: 6px; padding: 2px 8px;
      font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em;
      &.admin   { background: #F7EDD8; color: #8A6A24; border: 1px solid #E8DBBF; }
      &.waiter  { background: #EBF0F9; color: #2A5A9A; border: 1px solid #c5d5f0; }
      &.kitchen { background: #EBF7ED; color: #2A7A3A; border: 1px solid #c0e0c8; }
    }

    /* ── Topbar ── */
    .topbar {
      position: fixed; top: 0; left: 220px; right: 0;
      height: 58px;
      background: #fff;
      border-bottom: 1px solid #E8DBBF;
      display: flex; align-items: center; justify-content: space-between;
      padding: 0 24px;
      z-index: 30;
    }
    .page-title {
      font-family: var(--font-heading);
      font-size: 20px; font-weight: 600;
      color: #1A1A1A;
      line-height: 1;
    }
    .topbar-right {
      display: flex; align-items: center; gap: 12px;
    }
    .date-chip {
      background: #F4EFE6;
      border-radius: 8px;
      padding: 6px 12px;
      font-size: 11px; font-weight: 500;
      color: #7A7060;
    }
    .period-toggle {
      display: flex;
      border: 1px solid #E8DBBF;
      border-radius: 8px;
      background: #fff;
      padding: 4px;
      gap: 2px;
    }
    .period-btn {
      height: 28px;
      padding: 0 12px;
      border-radius: 6px;
      border: none; background: none;
      font-size: 11px; font-weight: 500;
      color: #7A7060;
      cursor: pointer;
      transition: background .12s, color .12s;
      font-family: var(--font-body);
      &:hover { background: #FBF6EC; }
      &.active { background: #F7EDD8; color: #8A6A24; }
    }
    .notif-btn {
      position: relative;
      width: 36px; height: 36px;
      display: flex; align-items: center; justify-content: center;
      border: 1px solid #E8DBBF;
      border-radius: 8px;
      background: #fff;
      cursor: pointer;
      color: #7A7060;
      transition: background .12s, color .12s;
      &:hover { background: #FBF6EC; color: #8A6A24; }
    }
    .notif-dot {
      position: absolute; top: 8px; right: 8px;
      width: 6px; height: 6px;
      background: #B8923A;
      border-radius: 50%;
    }

    /* ── Main ── */
    .main-content {
      margin-left: 220px;
      padding-top: 58px;
      min-height: 100vh;
      background: var(--background);
    }
    .page-body {
      padding: 24px;
    }
  `],
  template: `
    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-circle">
          <app-icon name="star" [size]="17" [sw]="1.8"></app-icon>
        </div>
        <div>
          <div class="brand-name">SKYFALL</div>
          <div class="brand-sub">LOUNGE</div>
        </div>
      </div>

      <nav class="nav-scroll">
        @for (group of visibleNavGroups(); track group.label) {
          <div class="nav-group">
            <div class="nav-group-label">{{ group.label }}</div>
            @for (item of group.items; track item.route) {
              <a class="nav-item"
                 [routerLink]="item.route"
                 routerLinkActive="active">
                <app-icon [name]="item.icon" [size]="16" [sw]="1.8"></app-icon>
                <span class="nav-item-inner">
                  <span class="nav-label">{{ item.label }}</span>
                  @if (item.route === '/orders' && orderCount() > 0) {
                    <span class="nav-badge">{{ orderCount() }}</span>
                  }
                  @if (item.route === '/kitchen' && kotCount() > 0) {
                    <span class="nav-badge">{{ kotCount() }}</span>
                  }
                </span>
              </a>
            }
          </div>
        }
      </nav>

      @if (user$ | async; as user) {
        <div class="user-bar">
          <div class="user-row">
            <div class="avatar">{{ initials(user.name) }}</div>
            <div class="user-info">
              <div class="user-name">{{ user.name }}</div>
              <div class="role-chip {{ user.role }}">{{ user.role }}</div>
            </div>
            <button class="icon-btn" (click)="logout()" title="Sign out">
              <app-icon name="log-out" [size]="15" [sw]="1.8"></app-icon>
            </button>
          </div>
          <button class="signout-btn" (click)="logout()">
            <app-icon name="log-out" [size]="14" [sw]="1.8"></app-icon>
            Sign out
          </button>
        </div>
      }
    </aside>

    <!-- Topbar -->
    <header class="topbar">
      <h1 class="page-title">{{ pageTitle }}</h1>
      <div class="topbar-right">
        <div class="date-chip">{{ today }}</div>
        <div class="period-toggle">
          <button class="period-btn" [class.active]="period==='Today'" (click)="period='Today'">Today</button>
          <button class="period-btn" [class.active]="period==='Week'" (click)="period='Week'">Week</button>
          <button class="period-btn" [class.active]="period==='Month'" (click)="period='Month'">Month</button>
        </div>
        <button class="notif-btn" type="button" aria-label="Notifications">
          <app-icon name="bell" [size]="16" [sw]="1.8"></app-icon>
          <span class="notif-dot"></span>
        </button>
      </div>
    </header>

    <!-- Content -->
    <main class="main-content">
      <div class="page-body">
        <router-outlet />
      </div>
    </main>
  `
})
export class ShellComponent implements OnInit, OnDestroy {
  private auth         = inject(AuthService);
  private router       = inject(Router);
  private orderService = inject(OrderService);
  private kotService   = inject(KotService);

  readonly user$   = this.auth.user$;
  readonly userRole = this.auth.currentUser?.role ?? 'admin';
  period: 'Today' | 'Week' | 'Month' = 'Today';

  visibleNavGroups = computed(() => {
    const role = this.auth.currentUser?.role ?? 'admin';
    return NAV_GROUPS
      .map(group => ({
        ...group,
        items: group.items.filter(item => {
          const routeKey = item.route.replace('/', '');
          const allowed = ROUTE_ROLES[routeKey] ?? ['admin'];
          return allowed.includes(role);
        })
      }))
      .filter(group => group.items.length > 0);
  });

  orderCount = signal(0);
  kotCount   = signal(0);

  private pollInterval?: ReturnType<typeof setInterval>;

  ngOnInit(): void {
    this.pollCounts();
    this.pollInterval = setInterval(() => this.pollCounts(), 30000);
  }

  ngOnDestroy(): void {
    if (this.pollInterval) clearInterval(this.pollInterval);
  }

  private pollCounts(): void {
    this.orderService.getActive().subscribe(orders => this.orderCount.set(orders.filter(o => !o.isPaid).length));
    this.kotService.getAll().subscribe(kots =>
      this.kotCount.set(kots.filter(k => k.status !== 'completed').length)
    );
  }

  get pageTitle(): string {
    const url = '/' + this.router.url.split('/')[1];
    return PAGE_TITLES[url] ?? 'Skyfall Admin';
  }

  get today(): string {
    return new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }

  initials(name: string): string {
    return name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
  }

  logout() { this.auth.logout(); }
}
