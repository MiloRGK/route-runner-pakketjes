// Types for earnings and money tracking system

export interface EarningsEntry {
  id: string;
  routeId?: string;
  routeName?: string;
  amount: number; // Amount earned in euros
  date: string; // ISO date string
  distance: number; // Distance in kilometers
  duration: number; // Duration in minutes
  description?: string;
  addresses?: string[]; // Addresses visited in this route
  createdAt: string;
}

export interface RouteEarnings {
  routeId: string;
  routeName: string;
  totalEarnings: number;
  distance: number;
  duration: number;
  entriesCount: number;
  averagePerKm: number;
  averagePerHour: number;
  lastEarning: string; // ISO date
}

export interface EarningsStats {
  totalEarnings: number;
  totalDistance: number;
  totalDuration: number; // in minutes
  totalEntries: number;
  averagePerKm: number;
  averagePerHour: number;
  averagePerRoute: number;
  bestRoute?: RouteEarnings;
  worstRoute?: RouteEarnings;
}

export interface EarningsMetrics {
  today: number;
  thisWeek: number;
  thisMonth: number;
  lastWeek: number;
  lastMonth: number;
  weeklyGrowth: number; // percentage
  monthlyGrowth: number; // percentage
}

export interface EarningsTrend {
  date: string;
  amount: number;
  distance: number;
  routes: number;
}

export interface DashboardData {
  stats: EarningsStats;
  metrics: EarningsMetrics;
  trends: EarningsTrend[];
  recentEntries: EarningsEntry[];
  topRoutes: RouteEarnings[];
}

export interface EarningsFilter {
  dateFrom?: string;
  dateTo?: string;
  minAmount?: number;
  maxAmount?: number;
  routeId?: string;
}