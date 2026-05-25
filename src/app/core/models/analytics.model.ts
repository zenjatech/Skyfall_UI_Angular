export interface DailyRevenue { date: string; revenue: number; orderCount: number; }
export interface TopMenuItem { menuItemId: string; name: string; quantitySold: number; revenue: number; }

export interface DashboardAnalytics {
  todayRevenue: number;
  todayOrders: number;
  activeTables: number;
  totalCustomers: number;
  weeklyRevenue: DailyRevenue[];
  topItems: TopMenuItem[];
}
