import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent) },
  { path: 'menu/:tableId', loadComponent: () => import('./pages/customer-menu/customer-menu.component').then(m => m.CustomerMenuComponent) },
  { path: 'order/:orderId/track', loadComponent: () => import('./pages/order-track/order-track.component').then(m => m.OrderTrackComponent) },
  {
    path: '',
    loadComponent: () => import('./layout/shell.component').then(m => m.ShellComponent),
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', canActivate: [roleGuard], data: { roles: ['admin'] },          loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent) },
      { path: 'pos',       canActivate: [roleGuard], data: { roles: ['admin', 'waiter'] }, loadComponent: () => import('./pages/pos/pos.component').then(m => m.PosComponent) },
      { path: 'kitchen',   canActivate: [roleGuard], data: { roles: ['admin', 'kitchen'] },loadComponent: () => import('./pages/kitchen/kitchen.component').then(m => m.KitchenComponent) },
      { path: 'orders',    canActivate: [roleGuard], data: { roles: ['admin'] },           loadComponent: () => import('./pages/orders/orders.component').then(m => m.OrdersComponent) },
      { path: 'tables',    canActivate: [roleGuard], data: { roles: ['admin'] },           loadComponent: () => import('./pages/tables/tables.component').then(m => m.TablesComponent) },
      { path: 'menu',      canActivate: [roleGuard], data: { roles: ['admin'] },           loadComponent: () => import('./pages/menu/menu.component').then(m => m.MenuComponent) },
      { path: 'analytics', canActivate: [roleGuard], data: { roles: ['admin'] },           loadComponent: () => import('./pages/analytics/analytics.component').then(m => m.AnalyticsComponent) },
      { path: 'payments',  canActivate: [roleGuard], data: { roles: ['admin'] },           loadComponent: () => import('./pages/payments/payments.component').then(m => m.PaymentsComponent) },
      { path: 'campaigns', canActivate: [roleGuard], data: { roles: ['admin'] },           loadComponent: () => import('./pages/campaigns/campaigns.component').then(m => m.CampaignsComponent) },
      { path: 'customers', canActivate: [roleGuard], data: { roles: ['admin'] },           loadComponent: () => import('./pages/customers/customers.component').then(m => m.CustomersComponent) },
      { path: 'staff',     canActivate: [roleGuard], data: { roles: ['admin'] },           loadComponent: () => import('./pages/staff/staff.component').then(m => m.StaffComponent) },
      { path: 'settings',  canActivate: [roleGuard], data: { roles: ['admin'] },           loadComponent: () => import('./pages/settings/settings.component').then(m => m.SettingsComponent) },
      { path: 'billing/:orderId', canActivate: [roleGuard], data: { roles: ['admin'] },    loadComponent: () => import('./pages/billing/billing.component').then(m => m.BillingComponent) },
    ]
  },
  { path: '**', redirectTo: '' }
];
