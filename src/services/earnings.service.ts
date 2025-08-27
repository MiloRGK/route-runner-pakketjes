import {
  EarningsEntry,
  EarningsStats,
  EarningsMetrics,
  EarningsTrend,
  RouteEarnings,
  DashboardData,
  EarningsFilter
} from '../types/earnings';

class EarningsService {
  private static readonly STORAGE_KEY = 'route-runner-earnings';
  private static readonly ROUTE_EARNINGS_KEY = 'route-runner-route-earnings';

  // Get all earnings entries
  getAllEarnings(): EarningsEntry[] {
    const stored = localStorage.getItem(EarningsService.STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  // Add new earnings entry
  addEarning(earning: Omit<EarningsEntry, 'id' | 'createdAt'>): EarningsEntry {
    const entries = this.getAllEarnings();
    const newEntry: EarningsEntry = {
      ...earning,
      id: this.generateId(),
      createdAt: new Date().toISOString()
    };
    
    entries.push(newEntry);
    localStorage.setItem(EarningsService.STORAGE_KEY, JSON.stringify(entries));
    
    // Update route earnings if routeId is provided
    if (earning.routeId) {
      this.updateRouteEarnings(newEntry);
    }
    
    return newEntry;
  }

  // Update existing earnings entry
  updateEarning(id: string, updates: Partial<EarningsEntry>): EarningsEntry | null {
    const entries = this.getAllEarnings();
    const index = entries.findIndex(e => e.id === id);
    
    if (index === -1) return null;
    
    entries[index] = { ...entries[index], ...updates };
    localStorage.setItem(EarningsService.STORAGE_KEY, JSON.stringify(entries));
    
    return entries[index];
  }  // Delete earnings entry
  deleteEarning(id: string): boolean {
    const entries = this.getAllEarnings();
    const filteredEntries = entries.filter(e => e.id !== id);
    
    if (filteredEntries.length === entries.length) return false;
    
    localStorage.setItem(EarningsService.STORAGE_KEY, JSON.stringify(filteredEntries));
    return true;
  }

  // Get earnings with filters
  getFilteredEarnings(filter: EarningsFilter): EarningsEntry[] {
    let entries = this.getAllEarnings();
    
    if (filter.dateFrom) {
      entries = entries.filter(e => e.date >= filter.dateFrom!);
    }
    if (filter.dateTo) {
      entries = entries.filter(e => e.date <= filter.dateTo!);
    }
    if (filter.minAmount !== undefined) {
      entries = entries.filter(e => e.amount >= filter.minAmount!);
    }
    if (filter.maxAmount !== undefined) {
      entries = entries.filter(e => e.amount <= filter.maxAmount!);
    }
    if (filter.routeId) {
      entries = entries.filter(e => e.routeId === filter.routeId);
    }
    
    return entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  // Calculate basic statistics
  calculateStats(entries?: EarningsEntry[]): EarningsStats {
    const allEntries = entries || this.getAllEarnings();
    
    if (allEntries.length === 0) {
      return {
        totalEarnings: 0,
        totalDistance: 0,
        totalDuration: 0,
        totalEntries: 0,
        averagePerKm: 0,
        averagePerHour: 0,
        averagePerRoute: 0
      };
    }    
    const totalEarnings = allEntries.reduce((sum, entry) => sum + entry.amount, 0);
    const totalDistance = allEntries.reduce((sum, entry) => sum + entry.distance, 0);
    const totalDuration = allEntries.reduce((sum, entry) => sum + entry.duration, 0);
    
    const routeEarnings = this.getRouteEarnings();
    const sortedRoutes = routeEarnings.sort((a, b) => b.averagePerKm - a.averagePerKm);
    
    return {
      totalEarnings: Math.round(totalEarnings * 100) / 100,
      totalDistance: Math.round(totalDistance * 100) / 100,
      totalDuration,
      totalEntries: allEntries.length,
      averagePerKm: totalDistance > 0 ? Math.round((totalEarnings / totalDistance) * 100) / 100 : 0,
      averagePerHour: totalDuration > 0 ? Math.round((totalEarnings / (totalDuration / 60)) * 100) / 100 : 0,
      averagePerRoute: allEntries.length > 0 ? Math.round((totalEarnings / allEntries.length) * 100) / 100 : 0,
      bestRoute: sortedRoutes[0] || undefined,
      worstRoute: sortedRoutes[sortedRoutes.length - 1] || undefined
    };
  }

  // Calculate metrics for different time periods
  calculateMetrics(): EarningsMetrics {
    const entries = this.getAllEarnings();
    const now = new Date();
    
    // Helper function to get start of day
    const startOfDay = (date: Date) => {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      return d;
    };
    
    // Helper function to get start of week (Monday)
    const startOfWeek = (date: Date) => {
      const d = startOfDay(date);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      return new Date(d.setDate(diff));
    };    
    // Helper function to get start of month
    const startOfMonth = (date: Date) => {
      const d = startOfDay(date);
      return new Date(d.getFullYear(), d.getMonth(), 1);
    };
    
    const today = startOfDay(now);
    const thisWeekStart = startOfWeek(now);
    const thisMonthStart = startOfMonth(now);
    const lastWeekStart = new Date(thisWeekStart.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastMonthStart = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));
    const lastMonthEnd = new Date(thisMonthStart.getTime() - 1);
    
    const todayEarnings = entries
      .filter(e => new Date(e.date) >= today)
      .reduce((sum, e) => sum + e.amount, 0);
    
    const thisWeekEarnings = entries
      .filter(e => new Date(e.date) >= thisWeekStart)
      .reduce((sum, e) => sum + e.amount, 0);
    
    const thisMonthEarnings = entries
      .filter(e => new Date(e.date) >= thisMonthStart)
      .reduce((sum, e) => sum + e.amount, 0);
    
    const lastWeekEarnings = entries
      .filter(e => {
        const date = new Date(e.date);
        return date >= lastWeekStart && date < thisWeekStart;
      })
      .reduce((sum, e) => sum + e.amount, 0);
    
    const lastMonthEarnings = entries
      .filter(e => {
        const date = new Date(e.date);
        return date >= lastMonthStart && date <= lastMonthEnd;
      })
      .reduce((sum, e) => sum + e.amount, 0);
    
    const weeklyGrowth = lastWeekEarnings > 0 
      ? ((thisWeekEarnings - lastWeekEarnings) / lastWeekEarnings) * 100 
      : thisWeekEarnings > 0 ? 100 : 0;
    
    const monthlyGrowth = lastMonthEarnings > 0 
      ? ((thisMonthEarnings - lastMonthEarnings) / lastMonthEarnings) * 100 
      : thisMonthEarnings > 0 ? 100 : 0;    
    return {
      today: Math.round(todayEarnings * 100) / 100,
      thisWeek: Math.round(thisWeekEarnings * 100) / 100,
      thisMonth: Math.round(thisMonthEarnings * 100) / 100,
      lastWeek: Math.round(lastWeekEarnings * 100) / 100,
      lastMonth: Math.round(lastMonthEarnings * 100) / 100,
      weeklyGrowth: Math.round(weeklyGrowth * 100) / 100,
      monthlyGrowth: Math.round(monthlyGrowth * 100) / 100
    };
  }

  // Generate trends data for charts
  generateTrends(days: number = 30): EarningsTrend[] {
    const entries = this.getAllEarnings();
    const trends: EarningsTrend[] = [];
    const now = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayEntries = entries.filter(e => e.date.startsWith(dateStr));
      const dayAmount = dayEntries.reduce((sum, e) => sum + e.amount, 0);
      const dayDistance = dayEntries.reduce((sum, e) => sum + e.distance, 0);
      
      trends.push({
        date: dateStr,
        amount: Math.round(dayAmount * 100) / 100,
        distance: Math.round(dayDistance * 100) / 100,
        routes: dayEntries.length
      });
    }
    
    return trends;
  }  
  // Route earnings management
  private updateRouteEarnings(entry: EarningsEntry): void {
    if (!entry.routeId) return;
    
    const routeEarnings = this.getRouteEarnings();
    const existingIndex = routeEarnings.findIndex(r => r.routeId === entry.routeId);
    
    if (existingIndex >= 0) {
      // Update existing route
      const existing = routeEarnings[existingIndex];
      const entries = this.getAllEarnings().filter(e => e.routeId === entry.routeId);
      
      const totalEarnings = entries.reduce((sum, e) => sum + e.amount, 0);
      const totalDistance = entries.reduce((sum, e) => sum + e.distance, 0);
      const totalDuration = entries.reduce((sum, e) => sum + e.duration, 0);
      
      routeEarnings[existingIndex] = {
        ...existing,
        totalEarnings: Math.round(totalEarnings * 100) / 100,
        distance: Math.round(totalDistance * 100) / 100,
        duration: totalDuration,
        entriesCount: entries.length,
        averagePerKm: totalDistance > 0 ? Math.round((totalEarnings / totalDistance) * 100) / 100 : 0,
        averagePerHour: totalDuration > 0 ? Math.round((totalEarnings / (totalDuration / 60)) * 100) / 100 : 0,
        lastEarning: entry.date
      };
    } else {
      // Create new route earnings
      routeEarnings.push({
        routeId: entry.routeId,
        routeName: entry.routeName || `Route ${entry.routeId}`,
        totalEarnings: Math.round(entry.amount * 100) / 100,
        distance: Math.round(entry.distance * 100) / 100,
        duration: entry.duration,
        entriesCount: 1,
        averagePerKm: entry.distance > 0 ? Math.round((entry.amount / entry.distance) * 100) / 100 : 0,
        averagePerHour: entry.duration > 0 ? Math.round((entry.amount / (entry.duration / 60)) * 100) / 100 : 0,
        lastEarning: entry.date
      });
    }
    
    localStorage.setItem(EarningsService.ROUTE_EARNINGS_KEY, JSON.stringify(routeEarnings));
  }  
  getRouteEarnings(): RouteEarnings[] {
    const stored = localStorage.getItem(EarningsService.ROUTE_EARNINGS_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  // Get complete dashboard data
  getDashboardData(): DashboardData {
    const entries = this.getAllEarnings();
    const stats = this.calculateStats(entries);
    const metrics = this.calculateMetrics();
    const trends = this.generateTrends(30);
    const recentEntries = entries
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);
    const topRoutes = this.getRouteEarnings()
      .sort((a, b) => b.averagePerKm - a.averagePerKm)
      .slice(0, 5);
    
    return {
      stats,
      metrics,
      trends,
      recentEntries,
      topRoutes
    };
  }

  // Utility: Generate unique ID
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Export data for backup
  exportData(): string {
    const earnings = this.getAllEarnings();
    const routeEarnings = this.getRouteEarnings();
    return JSON.stringify({ earnings, routeEarnings }, null, 2);
  }

  // Import data from backup
  importData(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);
      if (data.earnings && Array.isArray(data.earnings)) {
        localStorage.setItem(EarningsService.STORAGE_KEY, JSON.stringify(data.earnings));
      }
      if (data.routeEarnings && Array.isArray(data.routeEarnings)) {
        localStorage.setItem(EarningsService.ROUTE_EARNINGS_KEY, JSON.stringify(data.routeEarnings));
      }
      return true;
    } catch (error) {
      console.error('Failed to import earnings data:', error);
      return false;
    }
  }

  // Clear all data
  clearAllData(): void {
    localStorage.removeItem(EarningsService.STORAGE_KEY);
    localStorage.removeItem(EarningsService.ROUTE_EARNINGS_KEY);
  }
}

export const earningsService = new EarningsService();