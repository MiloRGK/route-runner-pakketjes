
import { useState } from 'react';
import { MapPin, Navigation, Clock, Ruler, CheckCircle, Circle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Address, RouteSession } from '@/pages/Index';
import { toast } from '@/hooks/use-toast';

interface RouteVisualizationProps {
  routeSessions: RouteSession[];
  addresses: Address[];
}

const RouteVisualization = ({ routeSessions, addresses }: RouteVisualizationProps) => {
  const [selectedSession, setSelectedSession] = useState<RouteSession | null>(
    routeSessions.length > 0 ? routeSessions[routeSessions.length - 1] : null
  );
  const [completedAddresses, setCompletedAddresses] = useState<Set<string>>(new Set());

  if (routeSessions.length === 0) {
    return (
      <div className="text-center py-12">
        <MapPin className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h3 className="text-xl font-semibold text-gray-600 mb-2">Geen routes beschikbaar</h3>
        <p className="text-gray-500">
          Optimaliseer eerst een route om deze hier te kunnen bekijken.
        </p>
      </div>
    );
  }

  const toggleAddressComplete = (addressId: string) => {
    const newCompleted = new Set(completedAddresses);
    if (newCompleted.has(addressId)) {
      newCompleted.delete(addressId);
    } else {
      newCompleted.add(addressId);
    }
    setCompletedAddresses(newCompleted);
    
    toast({
      title: newCompleted.has(addressId) ? "Adres voltooid" : "Adres niet voltooid",
      description: "Status bijgewerkt",
    });
  };

  const getOrderedAddresses = (session: RouteSession) => {
    return session.optimizedOrder.map(index => session.addresses[index]).filter(Boolean);
  };

  const completionPercentage = selectedSession ? 
    Math.round((completedAddresses.size / selectedSession.addresses.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-bold mb-2">Route weergave</h3>
        <p className="text-gray-600">
          Bekijk en volg je geoptimaliseerde route
        </p>
      </div>

      {/* Session Selection */}
      {routeSessions.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Selecteer route sessie</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {routeSessions.map((session) => (
                <Button
                  key={session.id}
                  variant={selectedSession?.id === session.id ? "default" : "outline"}
                  className="p-4 h-auto text-left justify-start"
                  onClick={() => setSelectedSession(session)}
                >
                  <div>
                    <div className="font-semibold">{session.name}</div>
                    <div className="text-sm opacity-75">
                      {session.addresses.length} adressen • {session.estimatedTime} min
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {selectedSession && (
        <>
          {/* Route Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <MapPin className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                <div className="text-2xl font-bold">{selectedSession.addresses.length}</div>
                <div className="text-sm text-gray-600">Adressen</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Clock className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <div className="text-2xl font-bold">{selectedSession.estimatedTime}</div>
                <div className="text-sm text-gray-600">Minuten</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Ruler className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                <div className="text-2xl font-bold">{selectedSession.estimatedDistance.toFixed(1)}</div>
                <div className="text-sm text-gray-600">Kilometer</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <CheckCircle className="w-8 h-8 text-orange-500 mx-auto mb-2" />
                <div className="text-2xl font-bold">{completionPercentage}%</div>
                <div className="text-sm text-gray-600">Voltooid</div>
              </CardContent>
            </Card>
          </div>

          {/* Progress Bar */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Voortgang</span>
                <span className="text-sm text-gray-600">
                  {completedAddresses.size} van {selectedSession.addresses.length}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Route List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Navigation className="w-5 h-5 mr-2" />
                Route volgorde
              </CardTitle>
              <CardDescription>
                Volg deze volgorde voor de meest efficiënte route
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {getOrderedAddresses(selectedSession).map((address, index) => {
                  const isCompleted = completedAddresses.has(address.id);
                  
                  return (
                    <div 
                      key={address.id}
                      className={`flex items-center p-4 rounded-lg border transition-all ${
                        isCompleted 
                          ? 'bg-green-50 border-green-200' 
                          : 'bg-white border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div 
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mr-4 ${
                          isCompleted 
                            ? 'bg-green-500 text-white' 
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {index + 1}
                      </div>
                      
                      <div className="flex-1">
                        <div className="font-semibold">
                          {address.street} {address.houseNumber}
                        </div>
                        <div className="text-sm text-gray-600">
                          {address.postalCode} {address.city}
                        </div>
                      </div>
                      
                      <Badge 
                        variant={address.packageType === 1 ? "default" : "secondary"}
                        className="mr-4"
                      >
                        Pakket {address.packageType}
                      </Badge>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleAddressComplete(address.id)}
                        className={isCompleted ? 'text-green-600' : 'text-gray-400'}
                      >
                        {isCompleted ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : (
                          <Circle className="w-5 h-5" />
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Map Placeholder */}
          <Card>
            <CardHeader>
              <CardTitle>Kaart weergave</CardTitle>
              <CardDescription>
                Interactieve kaart wordt binnenkort toegevoegd
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <MapPin className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                  <p className="text-gray-600">Kaart integratie komt binnenkort</p>
                  <p className="text-sm text-gray-500">
                    Google Maps/OpenStreetMap functionaliteit wordt toegevoegd
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default RouteVisualization;
