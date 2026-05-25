import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent) },
  {
    path: '',
    loadComponent: () => import('./layout/shell.component').then(m => m.ShellComponent),
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent) },
      { path: 'pos', loadComponent: () => import('./pages/pos/pos.component').then(m => m.PosComponent) },
      { path: 'kitchen', loadComponent: () => import('./pages/kitchen/kitchen.component').then(m => m.KitchenComponent) },
      { path: 'orders', loadComponent: () => import('./pages/orders/orders.component').then(m => m.OrdersComponent) },
      { path: 'tables', loadComponent: () => import('./pages/tables/tables.component').then(m => m.TablesComponent) },
      { path: 'menu', loadComponent: () => import('./pages/menu/menu.component').then(m => m.MenuComponent) },
      { path: 'staff', loadComponent: () => import('./pages/staff/staff.component').then(m => m.StaffComponent) },
      { path: 'customers', loadComponent: () => import('./pages/customers/customers.component').then(m => m.CustomersComponent) },
      { path: 'billing/:orderId', loadComponent: () => import('./pages/billing/billing.component').then(m => m.BillingComponent) }
    ]
  },
  { path: '**', redirectTo: '' }
];
