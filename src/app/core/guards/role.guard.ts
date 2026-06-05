import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const ROLE_HOME: Record<string, string> = {
  admin:   '/dashboard',
  waiter:  '/pos',
  kitchen: '/kitchen',
};

export const ROUTE_ROLES: Record<string, string[]> = {
  dashboard: ['admin'],
  orders:    ['admin'],
  kitchen:   ['admin', 'kitchen'],
  tables:    ['admin'],
  pos:       ['admin', 'waiter'],
  menu:      ['admin'],
  analytics: ['admin'],
  payments:  ['admin'],
  campaigns: ['admin'],
  customers: ['admin'],
  staff:     ['admin'],
  settings:  ['admin'],
};

export const roleGuard: CanActivateFn = (route) => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  const roles  = (route.data['roles'] as string[] | undefined) ?? ['admin'];
  const role   = auth.currentUser?.role ?? '';
  if (roles.includes(role)) return true;
  return router.createUrlTree([ROLE_HOME[role] ?? '/login']);
};
