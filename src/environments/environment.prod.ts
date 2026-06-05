export const environment = {
  production: true,
  apiBaseUrl: 'https://<your-function-app>.azurewebsites.net/api',
  defaultTenantId: 'skyfall',
  devBypass: null as { tenantId: string; email: string; password: string } | null
};
