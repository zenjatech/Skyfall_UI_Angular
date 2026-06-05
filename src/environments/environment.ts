export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:7071/api',
  defaultTenantId: 'skyfall',
  devBypass: null as { tenantId: string; email: string; password: string } | null
};
