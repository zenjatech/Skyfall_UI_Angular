export interface DailyRevenue { date: string; revenue: number; orderCount: number; }
export interface TopMenuItem { menuItemId: string; name: string; quantitySold: number; revenue: number; }
export interface PaymentBreakdownItem { mode: string; amount: number; percent: number; }

export interface DashboardAnalytics {
  todayRevenue: number;
  todayOrders: number;
  activeTables: number;
  totalCustomers: number;
  weeklyRevenue: DailyRevenue[];
  topItems: TopMenuItem[];
  paymentBreakdown: PaymentBreakdownItem[];
}
