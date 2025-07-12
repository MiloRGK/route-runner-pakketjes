import { useState, useEffect } from 'react';
import { MapPin, Navigation, Play, Pause, CheckCircle, Clock, Route as RouteIcon, Map } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Address, RouteSession } from '@/pages/Index';
import { toast } from '@/hooks/use-toast';
import MapView from './MapView';

interface RouteVisualizationProps {
  routeSessions: RouteSession[];
  addresses: Address[];
}

const RouteVisualization = ({ routeSessions, addresses }: RouteVisualizationProps) => {
  const [selectedSession, setSelectedSession] = useState<RouteSession | null>(null);
  const [currentAddressIndex, setCurrentAddressIndex] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [completedAddresses, setCompletedAddresses] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (routeSessions.length > 0 && !selectedSession) {
      setSelectedSession(routeSessions[routeSessions.length - 1]);
    }
  }, [routeSessions, selectedSession]);

  const getCurrentAddress = () => {
    if (!selectedSession || !selectedSession.optimizedOrder.length) return null;
    const addressIndex = selectedSession.optimizedOrder[currentAddressIndex];
    return selectedSession.addresses[addressIndex];
  };

  const getNextAddress = () => {
    if (!selectedSession || currentAddressIndex >= selectedSession.optimizedOrder.length - 1) return null;
    const nextIndex = selectedSession.optimizedOrder[currentAddressIndex + 1];
    return selectedSession.addresses[nextIndex];
  };

  const markCurrentComplete = () => {
    const currentAddress = getCurrentAddress();
    if (!currentAddress) return;

    setCompletedAddresses(prev => new Set([...prev, currentAddress.id]));
    
    if (currentAddressIndex < selectedSession!.optimizedOrder.length - 1) {
      setCurrentAddressIndex(prev => prev + 1);
      toast({
        title: "Adres voltooid",
        description: `${currentAddress.street} ${currentAddress.houseNumber} afgerond`,
      });
    } else {
      setIsActive(false);
      toast({
        title: "Route voltooid!",
        description: "Alle adressen zijn bezocht. Goed gedaan!",
      });
    }
  };

  const startRoute = () => {
    setIsActive(true);
    setCurrentAddressIndex(0);
    setCompletedAddresses(new Set());
    toast({
      title: "Route gestart",
      description: "Veel succes met je route!",
    });
  };

  const pauseRoute = () => {
    setIsActive(false);
    toast({
      title: "Route gepauzeerd",
      description: "Je kunt later verder gaan waar je gebleven was.",
    });
  };

  if (routeSessions.length === 0) {
    return (
      <div className="text-center py-12">
        <RouteIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-700 mb-2">Geen routes beschikbaar</h3>
        <p className="text-gray-500">Optimaliseer eerst een route om deze hier te kunnen bekijken.</p>
      </div>
    );
  }

  const currentAddress = getCurrentAddress();
  const nextAddress = getNextAddress();
  const progress = selectedSession ? (currentAddressIndex / selectedSession.optimizedOrder.length) * 100 : 0;
  const completedCount = completedAddresses.size;
  const totalCount = selectedSession?.addresses.length || 0;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-bold mb-2">Route navigatie</h3>
        <p className="text-gray-600">
          Volg je optimale route stap voor stap
        </p>
      </div>

      {/* Session Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Selecteer route sessie</CardTitle>
        </CardHeader>
        <CardContent>
          <Select 
            value={selectedSession?.id || ''} 
            onValueChange={(value) => {
              const session = routeSessions.find(s => s.id === value);
              setSelectedSession(session || null);
              setCurrentAddressIndex(0);
              setCompletedAddresses(new Set());
              setIsActive(false);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Kies een route sessie" />
            </SelectTrigger>
            <SelectContent>
              {routeSessions.map((session) => (
                <SelectItem key={session.id} value={session.id}>
                  {session.name} ({session.addresses.length} adressen)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedSession && (
        <>
          {/* Progress Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Voortgang</span>
                <span className="text-lg font-bold">
                  {completedCount}/{totalCount}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Progress value={progress} className="mb-4" />
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">{selectedSession.estimatedTime} min</div>
                  <div className="text-sm text-gray-600">Geschatte tijd</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">{selectedSession.estimatedDistance.toFixed(1)} km</div>
                  <div className="text-sm text-gray-600">Geschatte afstand</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">{Math.round(progress)}%</div>
                  <div className="text-sm text-gray-600">Voltooid</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs for Route Details and Map */}
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">
                <Navigation className="w-4 h-4 mr-2" />
                Route details
              </TabsTrigger>
              <TabsTrigger value="map">
                <Map className="w-4 h-4 mr-2" />
                Kaart weergave
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-6">
              {/* Current Address */}
              <Card className="border-2 border-primary">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <MapPin className="w-5 h-5 mr-2 text-primary" />
                    Huidig adres ({currentAddressIndex + 1}/{totalCount})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {currentAddress ? (
                    <div className="space-y-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold">
                          {currentAddress.street} {currentAddress.houseNumber}
                        </div>
                        <div className="text-lg text-gray-600">
                          {currentAddress.postalCode} {currentAddress.city}
                        </div>
                        <div className={`inline-block px-3 py-1 mt-2 rounded-full text-sm font-medium ${
                          currentAddress.packageType === 1 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          Pakket type {currentAddress.packageType}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {!isActive ? (
                          <Button onClick={startRoute} className="flex-1" size="lg">
                            <Play className="w-4 h-4 mr-2" />
                            Start route
                          </Button>
                        ) : (
                          <>
                            <Button onClick={pauseRoute} variant="outline" className="flex-1">
                              <Pause className="w-4 h-4 mr-2" />
                              Pauzeer
                            </Button>
                            <Button onClick={markCurrentComplete} className="flex-1" size="lg">
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Voltooid
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-green-700">Route voltooid!</h3>
                      <p className="text-green-600">Alle adressen zijn bezocht.</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Next Address */}
              {nextAddress && isActive && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Navigation className="w-5 h-5 mr-2" />
                      Volgende adres
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <div className="text-lg font-semibold">
                        {nextAddress.street} {nextAddress.houseNumber}
                      </div>
                      <div className="text-gray-600">
                        {nextAddress.postalCode} {nextAddress.city}
                      </div>
                      <div className={`inline-block px-2 py-1 mt-1 rounded-full text-xs ${
                        nextAddress.packageType === 1 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        Pakket {nextAddress.packageType}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Address List */}
              <Card>
                <CardHeader>
                  <CardTitle>Alle adressen in volgorde</CardTitle>
                  <CardDescription>
                    Optimale volgorde voor deze route
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {selectedSession.optimizedOrder.map((addressIndex, orderIndex) => {
                      const address = selectedSession.addresses[addressIndex];
                      const isCompleted = completedAddresses.has(address.id);
                      const isCurrent = orderIndex === currentAddressIndex && isActive;
                      
                      return (
                        <div
                          key={address.id}
                          className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                            isCurrent 
                              ? 'bg-primary/10 border border-primary' 
                              : isCompleted 
                                ? 'bg-green-50 border border-green-200' 
                                : 'bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                              isCurrent 
                                ? 'bg-primary text-white' 
                                : isCompleted 
                                  ? 'bg-green-500 text-white' 
                                  : 'bg-gray-300 text-gray-700'
                            }`}>
                              {isCompleted ? <CheckCircle className="w-4 h-4" /> : orderIndex + 1}
                            </div>
                            <div>
                              <div className="font-medium">
                                {address.street} {address.houseNumber}
                              </div>
                              <div className="text-sm text-gray-600">
                                {address.postalCode} {address.city}
                              </div>
                            </div>
                          </div>
                          <div className={`px-2 py-1 rounded-full text-xs ${
                            address.packageType === 1 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            Pakket {address.packageType}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="map">
              <MapView 
                routeSession={selectedSession}
                currentAddressIndex={currentAddressIndex}
                completedAddresses={completedAddresses}
              />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
};

export default RouteVisualization;
