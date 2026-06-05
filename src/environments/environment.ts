export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:7071/api',
  defaultTenantId: 'skyfall',
  devBypass: {
    tenantId: 'skyfall',
    email: 'nathpronay@gmail.com',
    password: 'Pron@y1992'
  } as { tenantId: string; email: string; password: string } | null
};
