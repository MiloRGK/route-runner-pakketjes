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

interface NavigationStep {
  icon: string;
  action: string;
  description: string;
  addresses?: Address[];
  distance?: string;
  duration?: string;
  isCurrentStep: boolean;
  isCompleted: boolean;
  stepType: 'start' | 'cycle' | 'park' | 'walk' | 'return' | 'end';
}

// Generate navigation steps for multi-modal routes  
const generateNavigationSteps = (
  bikeWalkRoute: any, 
  addresses: Address[], 
  currentAddressIndex: number = 0, 
  completedAddresses: Set<string> = new Set()
): NavigationStep[] => {
  const steps: NavigationStep[] = [];
  let stepIndex = 0;
  let currentStepIndex = 0;

  // Start at home base if provided
  if (bikeWalkRoute.settings?.homeBase) {
    steps.push({
      icon: '🏠',
      action: 'Start bij thuisbasis',
      description: `Begin je route bij ${bikeWalkRoute.settings.homeBase.address}`,
      isCurrentStep: currentAddressIndex === 0 && completedAddresses.size === 0,
      isCompleted: currentAddressIndex > 0 || completedAddresses.size > 0,
      stepType: 'start'
    });
    stepIndex++;
  }

  // Calculate which cluster we're currently in
  let addressesProcessedSoFar = 0;
  let currentCluster = 0;
  
  for (let i = 0; i < bikeWalkRoute.clusters.length; i++) {
    const cluster = bikeWalkRoute.clusters[i];
    if (currentAddressIndex < addressesProcessedSoFar + cluster.addresses.length) {
      currentCluster = i;
      break;
    }
    addressesProcessedSoFar += cluster.addresses.length;
  }

  // Process each cluster
  bikeWalkRoute.clusters.forEach((cluster: any, clusterIndex: number) => {
    const clusterAddresses = cluster.addresses.map((addressId: string) => 
      addresses.find((addr: any) => addr.id === addressId)
    ).filter((addr: any) => addr);

    // Find bike location address
    const bikeLocationAddress = clusterAddresses.find((addr: any) => 
      addr?.coordinates && 
      addr.coordinates[0] === cluster.bikeLocation.lng && 
      addr.coordinates[1] === cluster.bikeLocation.lat
    );

    // Determine if this cluster is completed
    const clusterCompleted = clusterAddresses.every(addr => completedAddresses.has(addr.id));
    const isCurrentCluster = clusterIndex === currentCluster;
    const hasStartedCluster = clusterIndex < currentCluster || clusterAddresses.some(addr => completedAddresses.has(addr.id));

    // Cycling to cluster
    const cyclingDistance = clusterIndex === 0 ? 
      (bikeWalkRoute.settings?.homeBase ? '~2.5 km' : 'Start locatie') :
      '~1.8 km';
    
    steps.push({
      icon: '🚲',
      action: `Fiets naar cluster ${clusterIndex + 1}`,
      description: bikeLocationAddress ? 
        `Fiets naar de buurt van ${bikeLocationAddress.street} ${bikeLocationAddress.houseNumber}` :
        `Fiets naar cluster ${clusterIndex + 1} fietslocatie`,
      distance: cyclingDistance,
      duration: '~8 min',
      isCurrentStep: isCurrentCluster && !hasStartedCluster,
      isCompleted: clusterIndex < currentCluster || hasStartedCluster,
      stepType: 'cycle'
    });

    // Park bike
    steps.push({
      icon: '🚲',
      action: `Parkeer fiets bij cluster ${clusterIndex + 1}`,
      description: bikeLocationAddress ? 
        `Parkeer veilig bij ${bikeLocationAddress.street} ${bikeLocationAddress.houseNumber}` :
        'Zoek een veilige parkeerplaats voor je fiets',
      isCurrentStep: isCurrentCluster && hasStartedCluster && !clusterCompleted && clusterAddresses.filter(addr => completedAddresses.has(addr.id)).length === 0,
      isCompleted: clusterIndex < currentCluster || clusterAddresses.some(addr => completedAddresses.has(addr.id)),
      stepType: 'park'
    });

    // Walking route within cluster
    if (clusterAddresses.length > 0) {
      const walkingAddresses = cluster.walkingRoute.map((addressId: string) => 
        addresses.find((addr: any) => addr.id === addressId)
      ).filter((addr: any) => addr);

      steps.push({
        icon: '🚶‍♂️',
        action: `Loop route cluster ${clusterIndex + 1}`,
        description: `Bezoek ${walkingAddresses.length} adres${walkingAddresses.length > 1 ? 'sen' : ''} te voet`,
        addresses: walkingAddresses,
        distance: `${(cluster.totalWalkingDistance / 1000).toFixed(2)} km`,
        duration: `~${Math.round(cluster.totalWalkingTime)} min`,
        isCurrentStep: isCurrentCluster && hasStartedCluster && !clusterCompleted,
        isCompleted: clusterCompleted,
        stepType: 'walk'
      });
    }

    // Return to bike (unless last cluster)
    if (clusterIndex < bikeWalkRoute.clusters.length - 1 || bikeWalkRoute.settings?.homeBase) {
      steps.push({
        icon: '🚶‍♂️',
        action: `Keer terug naar fiets`,
        description: 'Loop terug naar je geparkeerde fiets',
        distance: '~0.1 km',
        duration: '~2 min',
        isCurrentStep: isCurrentCluster && clusterCompleted && clusterIndex === currentCluster,
        isCompleted: clusterIndex < currentCluster,
        stepType: 'return'
      });
    }
  });

  // Return to home base if provided
  if (bikeWalkRoute.settings?.homeBase) {
    const allClustersCompleted = bikeWalkRoute.clusters.every((cluster: any) => 
      cluster.addresses.every((addressId: string) => completedAddresses.has(addressId))
    );
    
    steps.push({
      icon: '🚲',
      action: 'Fiets terug naar thuisbasis',
      description: `Keer terug naar ${bikeWalkRoute.settings.homeBase.address}`,
      distance: '~2.5 km',
      duration: '~8 min',
      isCurrentStep: allClustersCompleted && currentAddressIndex >= addresses.length - 1,
      isCompleted: false,
      stepType: 'cycle'
    });

    steps.push({
      icon: '🏠',
      action: 'Route voltooid!',
      description: 'Je bent weer thuis aangekomen. Goed gedaan!',
      isCurrentStep: false,
      isCompleted: completedAddresses.size === addresses.length,
      stepType: 'end'
    });
  }

  return steps;
};

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
              {selectedSession.bikeWalkRoute ? (
                // Multi-modal statistics
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-blue-600">{selectedSession.estimatedTime} min</div>
                    <div className="text-sm text-gray-600">Totale tijd</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-green-600">{(selectedSession.bikeWalkRoute.walkingDistance / 1000).toFixed(1)} km</div>
                    <div className="text-sm text-gray-600">🚶‍♂️ Lopen</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-orange-600">{(selectedSession.bikeWalkRoute.cyclingDistance / 1000).toFixed(1)} km</div>
                    <div className="text-sm text-gray-600">🚲 Fietsen</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-purple-600">{Math.round(progress)}%</div>
                    <div className="text-sm text-gray-600">Voltooid</div>
                  </div>
                </div>
              ) : (
                // Regular walking route statistics
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
              )}
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

              {/* Navigation Steps for Multi-modal routes */}
              {selectedSession.bikeWalkRoute && (
                <Card className="border-green-200 bg-green-50">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Navigation className="w-5 h-5 mr-2" />
                      🗺️ Navigatie Stappenplan
                    </CardTitle>
                    <CardDescription>
                      Volg deze stappen voor je fiets+voet route
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 max-h-80 overflow-y-auto">
                                             {generateNavigationSteps(selectedSession.bikeWalkRoute, selectedSession.addresses, currentAddressIndex, completedAddresses).map((step, index) => (
                        <div 
                          key={index} 
                          className={`flex items-start space-x-3 p-3 rounded-lg transition-colors ${
                            step.isCurrentStep ? 'bg-blue-100 border-2 border-blue-400' : 'bg-white border'
                          }`}
                        >
                          <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            step.isCompleted 
                              ? 'bg-green-500 text-white' 
                              : step.isCurrentStep 
                                ? 'bg-blue-500 text-white' 
                                : 'bg-gray-300 text-gray-700'
                          }`}>
                            {step.isCompleted ? '✓' : index + 1}
                          </div>
                          <div className="flex-1">
                            <div className={`flex items-center space-x-2 font-medium ${
                              step.isCurrentStep ? 'text-blue-800' : 'text-gray-800'
                            }`}>
                              <span className="text-lg">{step.icon}</span>
                              <span>{step.action}</span>
                            </div>
                            <div className={`text-sm mt-1 ${
                              step.isCurrentStep ? 'text-blue-600' : 'text-gray-600'
                            }`}>
                              {step.description}
                            </div>
                            {step.addresses && step.addresses.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {step.addresses.map((addr, addrIndex) => (
                                  <div key={addr.id} className={`text-xs p-2 rounded ${
                                    step.isCurrentStep ? 'bg-blue-50' : 'bg-gray-50'
                                  }`}>
                                    {addrIndex + 1}. {addr.street} {addr.houseNumber}, {addr.postalCode} {addr.city}
                                  </div>
                                ))}
                              </div>
                            )}
                            {step.distance && (
                              <div className={`text-xs mt-1 ${
                                step.isCurrentStep ? 'text-blue-500' : 'text-gray-500'
                              }`}>
                                📏 {step.distance} • ⏱️ {step.duration}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Cluster Overview for Multi-modal routes */}
              {selectedSession.bikeWalkRoute && (
                <Card className="border-blue-200 bg-blue-50">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      🚲 Cluster Overzicht
                    </CardTitle>
                    <CardDescription>
                      {selectedSession.bikeWalkRoute.clusters.length} fietslocaties met looproutes
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {selectedSession.bikeWalkRoute.clusters.map((cluster: any, index: number) => (
                        <div key={cluster.id} className="p-3 bg-white rounded-lg border-l-4 border-blue-400">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-blue-800">
                              🚲 Cluster {index + 1}
                            </h4>
                            <span className="text-sm text-blue-600">
                              {cluster.addresses.length} adressen
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs text-blue-700">
                            <div>Loop: {(cluster.totalWalkingDistance / 1000).toFixed(2)}km</div>
                            <div>Tijd: ~{Math.round(cluster.totalWalkingTime)} min</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Address List */}
              <Card>
                <CardHeader>
                  <CardTitle>Alle adressen in volgorde</CardTitle>
                  <CardDescription>
                    {selectedSession.bikeWalkRoute ? 'Georganiseerd per cluster' : 'Optimale volgorde voor deze route'}
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
