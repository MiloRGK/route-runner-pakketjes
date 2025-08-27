import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription } from './ui/alert';
import { 
  Euro, 
  TrendingUp, 
  TrendingDown, 
  MapPin, 
  Clock, 
  Target,
  Calendar,
  Route,
  Download,
  Upload,
  Trash2,
  Eye,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react';
import { earningsService } from '../services/earnings.service';
import { DashboardData, EarningsEntry } from '../types/earnings';
import { EarningsTracker } from './EarningsTracker';
import { toast } from 'sonner';

export const EarningsDashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = () => {
    setLoading(true);
    try {
      const data = earningsService.getDashboardData();
      setDashboardData(data);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Fout bij laden van dashboard data');
    } finally {
      setLoading(false);
    }
  };  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const formatPercentage = (percentage: number) => {
    const sign = percentage > 0 ? '+' : '';
    return `${sign}${percentage.toFixed(1)}%`;
  };

  const handleEarningAdded = (earning: EarningsEntry) => {
    loadDashboardData();
    toast.success('Verdiensten bijgewerkt!');
  };

  const handleExportData = () => {
    try {
      const data = earningsService.exportData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `earnings-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Data geëxporteerd!');
    } catch (error) {
      toast.error('Fout bij exporteren');
    }
  };

  const handleClearData = () => {
    if (window.confirm('Weet je zeker dat je alle verdiensten data wilt verwijderen? Dit kan niet ongedaan gemaakt worden.')) {
      earningsService.clearAllData();
      loadDashboardData();
      toast.success('Alle data verwijderd');
    }
  };  
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">💰 Verdiensten Dashboard</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <Alert>
        <AlertDescription>
          Geen verdiensten data beschikbaar. Begin met het toevoegen van je eerste verdiensten!
        </AlertDescription>
      </Alert>
    );
  }

  const { stats, metrics, trends, recentEntries, topRoutes } = dashboardData;  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            💰 Verdiensten Dashboard
          </h1>
          <p className="text-gray-600 mt-1">
            Overzicht van je verdiensten en route analyses
          </p>
        </div>
        <div className="flex gap-2">
          <EarningsTracker onEarningAdded={handleEarningAdded} />
          <Button variant="outline" size="sm" onClick={handleExportData}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm" onClick={handleClearData}>
            <Trash2 className="h-4 w-4 mr-2" />
            Wissen
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Earnings */}
        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Euro className="h-4 w-4" />
              Totale Verdiensten
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalEarnings)}</div>
            <div className="text-xs text-green-100 mt-1">
              {stats.totalEntries} routes afgerond
            </div>
          </CardContent>
        </Card>

        {/* This Month */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Deze Maand
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.thisMonth)}</div>
            <div className="flex items-center gap-1 text-xs mt-1">
              {metrics.monthlyGrowth >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500" />
              )}
              <span className={metrics.monthlyGrowth >= 0 ? 'text-green-600' : 'text-red-600'}>
                {formatPercentage(metrics.monthlyGrowth)} vs vorige maand
              </span>
            </div>
          </CardContent>
        </Card>        
        {/* Per Kilometer */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Per Kilometer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.averagePerKm)}</div>
            <div className="text-xs text-gray-500 mt-1">
              {stats.totalDistance.toFixed(1)} km totaal
            </div>
          </CardContent>
        </Card>

        {/* Per Hour */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Per Uur
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.averagePerHour)}</div>
            <div className="text-xs text-gray-500 mt-1">
              {Math.round(stats.totalDuration / 60)} uur totaal
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overzicht</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="routes">Routes</TabsTrigger>
          <TabsTrigger value="recent">Recent</TabsTrigger>
        </TabsList>        
        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Weekly Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Week Voortgang
                </CardTitle>
                <CardDescription>
                  Deze week vs vorige week
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Deze Week</span>
                    <span className="text-sm font-bold">{formatCurrency(metrics.thisWeek)}</span>
                  </div>
                  <Progress 
                    value={metrics.lastWeek > 0 ? (metrics.thisWeek / metrics.lastWeek) * 100 : 100} 
                    className="h-2"
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">Vorige Week</span>
                    <span className="text-sm">{formatCurrency(metrics.lastWeek)}</span>
                  </div>
                  <Progress value={100} className="h-2 opacity-50" />
                </div>
                <div className="flex items-center gap-2 text-sm">
                  {metrics.weeklyGrowth >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  )}
                  <span className={metrics.weeklyGrowth >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {formatPercentage(metrics.weeklyGrowth)} groei
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Best & Worst Routes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Route Prestaties
                </CardTitle>
                <CardDescription>
                  Beste en slechtste routes per km
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {stats.bestRoute && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-green-800">🏆 Beste Route</span>
                      <Badge className="bg-green-600">{formatCurrency(stats.bestRoute.averagePerKm)}/km</Badge>
                    </div>
                    <div className="text-sm text-green-600 mt-1">
                      {stats.bestRoute.routeName} - {formatCurrency(stats.bestRoute.totalEarnings)} totaal
                    </div>
                  </div>
                )}
                
                {stats.worstRoute && stats.worstRoute.routeId !== stats.bestRoute?.routeId && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-red-800">📉 Kan Beter</span>
                      <Badge variant="outline" className="text-red-600">{formatCurrency(stats.worstRoute.averagePerKm)}/km</Badge>
                    </div>
                    <div className="text-sm text-red-600 mt-1">
                      {stats.worstRoute.routeName} - {formatCurrency(stats.worstRoute.totalEarnings)} totaal
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>        
        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Verdiensten Trend (Laatste 30 Dagen)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {trends.slice(-7).map((trend, idx) => {
                  const maxAmount = Math.max(...trends.map(t => t.amount));
                  const percentage = maxAmount > 0 ? (trend.amount / maxAmount) * 100 : 0;
                  
                  return (
                    <div key={trend.date} className="space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-medium">
                          {new Date(trend.date).toLocaleDateString('nl-NL', { 
                            weekday: 'short', 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </span>
                        <div className="flex items-center gap-3">
                          <span>{formatCurrency(trend.amount)}</span>
                          <span className="text-gray-500 text-xs">
                            {trend.distance.toFixed(1)}km
                          </span>
                          {trend.routes > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {trend.routes} routes
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {trends.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Nog geen trend data beschikbaar</p>
                  <p className="text-sm">Begin met het toevoegen van verdiensten!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>        
        {/* Routes Tab */}
        <TabsContent value="routes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Route className="h-5 w-5" />
                Top Presterende Routes
              </CardTitle>
              <CardDescription>
                Gerangschikt op verdiensten per kilometer
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topRoutes.length > 0 ? topRoutes.map((route, idx) => (
                  <div key={route.routeId} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold text-sm">
                        {idx + 1}
                      </div>
                      <div>
                        <div className="font-medium">{route.routeName}</div>
                        <div className="text-sm text-gray-500 flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {route.distance.toFixed(1)} km
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {Math.round(route.duration)} min
                          </span>
                          <span>{route.entriesCount} keer gedaan</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg">{formatCurrency(route.averagePerKm)}/km</div>
                      <div className="text-sm text-gray-500">
                        {formatCurrency(route.totalEarnings)} totaal
                      </div>
                      <div className="text-xs text-gray-400">
                        {formatCurrency(route.averagePerHour)}/uur
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-8 text-gray-500">
                    <Route className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Nog geen routes met verdiensten</p>
                    <p className="text-sm">Voeg verdiensten toe aan je routes om analyses te zien!</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>        
        {/* Recent Tab */}
        <TabsContent value="recent" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Recente Verdiensten
              </CardTitle>
              <CardDescription>
                Je laatste 10 verdiensten entries
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentEntries.length > 0 ? recentEntries.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <div>
                        <div className="font-medium">
                          {entry.routeName || 'Algemene Route'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(entry.date).toLocaleDateString('nl-NL', {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                        {entry.description && (
                          <div className="text-xs text-gray-400 mt-1">
                            {entry.description}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-600">
                        {formatCurrency(entry.amount)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {entry.distance.toFixed(1)} km • {entry.duration} min
                      </div>
                      <div className="text-xs text-gray-400">
                        {formatCurrency(entry.distance > 0 ? entry.amount / entry.distance : 0)}/km
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-8 text-gray-500">
                    <Euro className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Nog geen verdiensten geregistreerd</p>
                    <p className="text-sm">Klik op "Verdiensten Toevoegen" om te beginnen!</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};