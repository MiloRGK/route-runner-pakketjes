
import { BarChart3, TrendingUp, Clock, MapPin, Package } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Address, RouteSession } from '@/pages/Index';

interface StatisticsProps {
  routeSessions: RouteSession[];
  addresses: Address[];
}

const Statistics = ({ routeSessions, addresses }: StatisticsProps) => {
  const totalSessions = routeSessions.length;
  const totalAddresses = routeSessions.reduce((sum, session) => sum + session.addresses.length, 0);
  const totalEstimatedTime = routeSessions.reduce((sum, session) => sum + session.estimatedTime, 0);
  const totalEstimatedDistance = routeSessions.reduce((sum, session) => sum + session.estimatedDistance, 0);
  const averageAddressesPerSession = totalSessions > 0 ? Math.round(totalAddresses / totalSessions) : 0;

  const packageType1Total = addresses.filter(a => a.packageType === 1).length;
  const packageType2Total = addresses.filter(a => a.packageType === 2).length;

  if (routeSessions.length === 0) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h3 className="text-xl font-semibold text-gray-600 mb-2">Geen statistieken beschikbaar</h3>
        <p className="text-gray-500">
          Maak eerst enkele routes om statistieken te kunnen bekijken.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-bold mb-2">Statistieken</h3>
        <p className="text-gray-600">
          Overzicht van al je route sessies en prestaties
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <MapPin className="w-10 h-10 text-blue-500 mx-auto mb-3" />
            <div className="text-3xl font-bold text-blue-600 mb-1">{totalSessions}</div>
            <div className="text-sm text-gray-600">Route sessies</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 text-center">
            <Package className="w-10 h-10 text-green-500 mx-auto mb-3" />
            <div className="text-3xl font-bold text-green-600 mb-1">{totalAddresses}</div>
            <div className="text-sm text-gray-600">Totaal adressen</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 text-center">
            <Clock className="w-10 h-10 text-purple-500 mx-auto mb-3" />
            <div className="text-3xl font-bold text-purple-600 mb-1">
              {Math.round(totalEstimatedTime / 60)}h {totalEstimatedTime % 60}m
            </div>
            <div className="text-sm text-gray-600">Totale looptijd</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 text-center">
            <TrendingUp className="w-10 h-10 text-orange-500 mx-auto mb-3" />
            <div className="text-3xl font-bold text-orange-600 mb-1">
              {totalEstimatedDistance.toFixed(1)}
            </div>
            <div className="text-sm text-gray-600">Kilometers gelopen</div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Gemiddelden per sessie</CardTitle>
            <CardDescription>
              Prestatie overzicht van je route sessies
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Gemiddeld adressen per sessie</span>
              <span className="font-semibold">{averageAddressesPerSession}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Gemiddelde looptijd</span>
              <span className="font-semibold">
                {totalSessions > 0 ? Math.round(totalEstimatedTime / totalSessions) : 0} min
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Gemiddelde afstand</span>
              <span className="font-semibold">
                {totalSessions > 0 ? (totalEstimatedDistance / totalSessions).toFixed(1) : 0} km
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Efficiency (adressen/uur)</span>
              <span className="font-semibold">
                {totalEstimatedTime > 0 ? Math.round((totalAddresses * 60) / totalEstimatedTime) : 0}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pakket verdeling</CardTitle>
            <CardDescription>
              Overzicht van de verschillende pakkettypes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-blue-500 rounded mr-3"></div>
                  <span>Pakket Type 1</span>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{packageType1Total}</div>
                  <div className="text-sm text-gray-500">
                    {addresses.length > 0 ? Math.round((packageType1Total / addresses.length) * 100) : 0}%
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-green-500 rounded mr-3"></div>
                  <span>Pakket Type 2</span>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{packageType2Total}</div>
                  <div className="text-sm text-gray-500">
                    {addresses.length > 0 ? Math.round((packageType2Total / addresses.length) * 100) : 0}%
                  </div>
                </div>
              </div>
            </div>

            {/* Visual representation */}
            <div className="mt-4">
              <div className="flex h-8 rounded-lg overflow-hidden">
                <div 
                  className="bg-blue-500"
                  style={{ 
                    width: addresses.length > 0 ? `${(packageType1Total / addresses.length) * 100}%` : '50%' 
                  }}
                />
                <div 
                  className="bg-green-500"
                  style={{ 
                    width: addresses.length > 0 ? `${(packageType2Total / addresses.length) * 100}%` : '50%' 
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Sessions */}
      <Card>
        <CardHeader>
          <CardTitle>Recente sessies</CardTitle>
          <CardDescription>
            Overzicht van je laatste route sessies
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {routeSessions.slice(-5).reverse().map((session, index) => (
              <div key={session.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="font-semibold">{session.name}</div>
                  <div className="text-sm text-gray-600">
                    {session.createdAt.toLocaleDateString()} • {session.addresses.length} adressen
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{session.estimatedTime} min</div>
                  <div className="text-sm text-gray-600">{session.estimatedDistance.toFixed(1)} km</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Statistics;
