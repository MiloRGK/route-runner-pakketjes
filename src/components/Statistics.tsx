
import { BarChart3, Clock, MapPin, Package, TrendingUp, Calendar } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Address, RouteSession } from '@/pages/Index';

interface StatisticsProps {
  routeSessions: RouteSession[];
  addresses: Address[];
}

const Statistics = ({ routeSessions, addresses }: StatisticsProps) => {
  // Calculate statistics
  const totalAddresses = addresses.length;
  const totalSessions = routeSessions.length;
  const totalEstimatedTime = routeSessions.reduce((acc, session) => acc + session.estimatedTime, 0);
  const totalEstimatedDistance = routeSessions.reduce((acc, session) => acc + session.estimatedDistance, 0);
  
  const packageType1Count = addresses.filter(a => a.packageType === 1).length;
  const packageType2Count = addresses.filter(a => a.packageType === 2).length;
  
  const averageTimePerSession = totalSessions > 0 ? totalEstimatedTime / totalSessions : 0;
  const averageAddressesPerSession = totalSessions > 0 ? totalAddresses / totalSessions : 0;

  // Data for charts
  const packageTypeData = [
    { name: 'Pakket Type 1', value: packageType1Count, color: '#3b82f6' },
    { name: 'Pakket Type 2', value: packageType2Count, color: '#10b981' }
  ];

  const sessionData = routeSessions.map((session, index) => ({
    name: `Sessie ${index + 1}`,
    adressen: session.addresses.length,
    tijd: session.estimatedTime,
    afstand: session.estimatedDistance
  }));

  const timeComparisonData = routeSessions.map((session, index) => ({
    name: `Sessie ${index + 1}`,
    optimaal: session.estimatedTime,
    standaard: Math.round(session.estimatedTime * 1.4) // Assume 40% longer without optimization
  }));

  if (addresses.length === 0) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-700 mb-2">Geen statistieken beschikbaar</h3>
        <p className="text-gray-500">Upload adressen en creëer routes om statistieken te bekijken.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-bold mb-2">Route statistieken</h3>
        <p className="text-gray-600">
          Inzichten in je route prestaties en optimalisaties
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totaal adressen</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAddresses}</div>
            <p className="text-xs text-muted-foreground">
              Over {totalSessions} sessie{totalSessions !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totale tijd</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEstimatedTime} min</div>
            <p className="text-xs text-muted-foreground">
              Ø {Math.round(averageTimePerSession)} min per sessie
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totale afstand</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEstimatedDistance.toFixed(1)} km</div>
            <p className="text-xs text-muted-foreground">
              Geoptimaliseerde route
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gemiddelde sessie</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(averageAddressesPerSession)}</div>
            <p className="text-xs text-muted-foreground">
              Adressen per sessie
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Package Type Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Pakket type verdeling</CardTitle>
            <CardDescription>
              Verdeling van pakket types in je routes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={packageTypeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {packageTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center space-x-4 mt-4">
              {packageTypeData.map((entry, index) => (
                <div key={index} className="flex items-center">
                  <div 
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-sm">{entry.name}: {entry.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Efficiëntie per sessie</CardTitle>
            <CardDescription>
              Adressen en geschatte tijd per sessie
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {routeSessions.map((session, index) => (
                <div key={session.id} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{session.name}</span>
                    <span>{session.addresses.length} adressen - {session.estimatedTime} min</span>
                  </div>
                  <Progress 
                    value={(session.addresses.length / Math.max(...routeSessions.map(s => s.addresses.length))) * 100} 
                    className="h-2"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Session Comparison Charts */}
      {sessionData.length > 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Sessie vergelijking</CardTitle>
              <CardDescription>
                Adressen en tijd per sessie
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sessionData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="adressen" fill="#3b82f6" name="Adressen" />
                    <Bar dataKey="tijd" fill="#10b981" name="Tijd (min)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tijd optimalisatie</CardTitle>
              <CardDescription>
                Vergelijking geoptimaliseerd vs standaard
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={timeComparisonData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="standaard" fill="#ef4444" name="Standaard route" />
                    <Bar dataKey="optimaal" fill="#10b981" name="Geoptimaliseerde route" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Performance Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="w-5 h-5 mr-2" />
            Prestatie inzichten
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {totalSessions > 0 ? Math.round(40 * (totalEstimatedTime / (totalEstimatedTime * 1.4)) * 100) / 100 : 0}%
              </div>
              <div className="text-sm text-green-600">Tijd besparing</div>
              <div className="text-xs text-gray-600 mt-1">
                Ten opzichte van niet-geoptimaliseerde route
              </div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {totalAddresses > 0 ? Math.round((totalEstimatedDistance / totalAddresses) * 1000) : 0}m
              </div>
              <div className="text-sm text-blue-600">Gem. per adres</div>
              <div className="text-xs text-gray-600 mt-1">
                Afstand tussen adressen
              </div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {Math.round((totalEstimatedTime / 60) * 10) / 10}
              </div>
              <div className="text-sm text-purple-600">Uren totaal</div>
              <div className="text-xs text-gray-600 mt-1">
                Geschatte looptijd
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Statistics;
