import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../../environments/environment';

const TOKEN_KEY = 'sf_token';
const TENANT_KEY = 'sf_tenant';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem(TOKEN_KEY);
  const tenantId = localStorage.getItem(TENANT_KEY) || environment.defaultTenantId;

  if (!token) {
    return next(req.clone({
      setHeaders: tenantId ? { 'X-Tenant-Id': tenantId } : {}
    }));
  }

  const cloned = req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`,
      ...(tenantId ? { 'X-Tenant-Id': tenantId } : {})
    }
  });
  return next(cloned);
};
