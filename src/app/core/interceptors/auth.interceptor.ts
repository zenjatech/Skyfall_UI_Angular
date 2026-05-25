import { HttpInterceptorFn } from '@angular/common/http';

const TOKEN_KEY = 'sf_token';
const TENANT_KEY = 'sf_tenant';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem(TOKEN_KEY);
  const tenantId = localStorage.getItem(TENANT_KEY);

  if (!token) return next(req);

  const cloned = req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`,
      ...(tenantId ? { 'X-Tenant-Id': tenantId } : {})
    }
  });
  return next(cloned);
};
