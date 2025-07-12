
import { useState } from 'react';
import { Route, Play, Settings, Zap, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Address, RouteSession } from '@/pages/Index';
import { toast } from '@/hooks/use-toast';

interface RouteOptimizationProps {
  addresses: Address[];
  onRouteOptimized: (session: RouteSession) => void;
}

const OPENCAGE_API_KEY = '8cd50accbc214b2484dd1db860cc146f';

const RouteOptimization = ({ addresses, onRouteOptimized }: RouteOptimizationProps) => {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [sessionName, setSessionName] = useState('Route ' + new Date().toLocaleDateString());
  const [maxAddressesPerSession, setMaxAddressesPerSession] = useState([50]);
  const [walkingSpeed, setWalkingSpeed] = useState([4.5]); // km/h
  const [prioritizePackageType, setPrioritizePackageType] = useState(false);
  const [splitSessions, setSplitSessions] = useState(false);

  // Geocode address using OpenCage API
  const geocodeAddress = async (address: Address): Promise<[number, number] | null> => {
    const query = `${address.street} ${address.houseNumber}, ${address.postalCode} ${address.city}, Netherlands`;
    
    try {
      const response = await fetch(
        `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(query)}&key=${OPENCAGE_API_KEY}&limit=1&countrycode=nl`
      );
      
      if (!response.ok) {
        console.warn(`Geocoding failed for ${address.street} ${address.houseNumber}`);
        return null;
      }
      
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        const { lat, lng } = data.results[0].geometry;
        return [lat, lng];
      }
      
      return null;
    } catch (error) {
      console.warn(`Geocoding error for ${address.street} ${address.houseNumber}:`, error);
      return null;
    }
  };

  // Calculate distance between two coordinates using Haversine formula
  const calculateDistance = (coord1: [number, number], coord2: [number, number]): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (coord2[0] - coord1[0]) * Math.PI / 180;
    const dLon = (coord2[1] - coord1[1]) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(coord1[0] * Math.PI / 180) * Math.cos(coord2[0] * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Enhanced route optimization algorithm with real coordinates
  const optimizeRoute = async (addressList: Address[]): Promise<{ order: number[], totalDistance: number }> => {
    if (addressList.length === 0) return { order: [], totalDistance: 0 };
    
    // First, geocode all addresses
    toast({
      title: "Locaties ophalen",
      description: "Postcodes worden omgezet naar coördinaten...",
    });

    const addressesWithCoords = await Promise.all(
      addressList.map(async (address, index) => {
        const coords = await geocodeAddress(address);
        return { ...address, coordinates: coords, originalIndex: index };
      })
    );

    // Filter out addresses that couldn't be geocoded and use fallback
    const validAddresses = addressesWithCoords.map((addr, index) => {
      if (!addr.coordinates) {
        // Fallback: use postal code for rough positioning
        const postalCode = parseInt(addr.postalCode.substring(0, 4));
        const lat = 52.3676 + (postalCode - 1000) * 0.001; // Rough approximation for Netherlands
        const lng = 4.9041 + (postalCode - 1000) * 0.0005;
        addr.coordinates = [lat, lng];
      }
      return addr;
    });

    if (validAddresses.length === 0) return { order: [], totalDistance: 0 };

    // Nearest neighbor algorithm with real distance calculation
    const optimizedOrder: number[] = [];
    const visited = new Set<number>();
    let totalDistance = 0;
    
    // Start with the first address
    let currentIndex = 0;
    optimizedOrder.push(validAddresses[currentIndex].originalIndex);
    visited.add(currentIndex);

    while (visited.size < validAddresses.length) {
      let nextIndex = -1;
      let minDistance = Infinity;

      for (let i = 0; i < validAddresses.length; i++) {
        if (visited.has(i)) continue;
        
        const currentCoords = validAddresses[currentIndex].coordinates!;
        const candidateCoords = validAddresses[i].coordinates!;
        let distance = calculateDistance(currentCoords, candidateCoords);
        
        // Bonus for same package type if prioritizing
        if (prioritizePackageType && 
            validAddresses[currentIndex].packageType === validAddresses[i].packageType) {
          distance *= 0.8; // 20% distance reduction for same package type
        }
        
        if (distance < minDistance) {
          minDistance = distance;
          nextIndex = i;
        }
      }

      if (nextIndex !== -1) {
        optimizedOrder.push(validAddresses[nextIndex].originalIndex);
        visited.add(nextIndex);
        totalDistance += minDistance;
        currentIndex = nextIndex;
      }
    }

    return { order: optimizedOrder, totalDistance };
  };

  const calculateEstimates = (addressCount: number, actualDistance?: number) => {
    const averageDeliveryTime = 1.5; // minutes per address
    const walkingSpeedKmh = walkingSpeed[0];
    
    let estimatedDistance = actualDistance || (addressCount * 0.15); // fallback: 150m per address
    let walkingTime = (estimatedDistance / walkingSpeedKmh) * 60; // convert to minutes
    let deliveryTime = addressCount * averageDeliveryTime;
    
    const estimatedTime = Math.round(walkingTime + deliveryTime);
    
    return { estimatedTime, estimatedDistance };
  };

  const handleOptimize = async () => {
    if (addresses.length === 0) {
      toast({
        title: "Geen adressen",
        description: "Upload eerst adressen voordat je kunt optimaliseren.",
        variant: "destructive"
      });
      return;
    }

    setIsOptimizing(true);

    try {
      if (splitSessions && addresses.length > maxAddressesPerSession[0]) {
        // Create multiple sessions
        const sessions: RouteSession[] = [];
        const addressesPerSession = maxAddressesPerSession[0];
        
        for (let i = 0; i < addresses.length; i += addressesPerSession) {
          const sessionAddresses = addresses.slice(i, i + addressesPerSession);
          const { order: optimizedOrder, totalDistance } = await optimizeRoute(sessionAddresses);
          const { estimatedTime, estimatedDistance } = calculateEstimates(sessionAddresses.length, totalDistance);
          
          const session: RouteSession = {
            id: `session-${Date.now()}-${i}`,
            name: `${sessionName} - Deel ${Math.floor(i / addressesPerSession) + 1}`,
            addresses: sessionAddresses,
            optimizedOrder,
            estimatedTime,
            estimatedDistance,
            createdAt: new Date()
          };
          
          sessions.push(session);
        }

        // Return the first session
        onRouteOptimized(sessions[0]);
        
        toast({
          title: "Routes geoptimaliseerd",
          description: `${sessions.length} sessies gecreëerd met optimale routes.`,
        });
      } else {
        // Single session
        const { order: optimizedOrder, totalDistance } = await optimizeRoute(addresses);
        const { estimatedTime, estimatedDistance } = calculateEstimates(addresses.length, totalDistance);
        
        const session: RouteSession = {
          id: `session-${Date.now()}`,
          name: sessionName,
          addresses: addresses,
          optimizedOrder,
          estimatedTime,
          estimatedDistance,
          createdAt: new Date()
        };

        onRouteOptimized(session);
        
        toast({
          title: "Route geoptimaliseerd",
          description: `Optimale volgorde berekend voor ${addresses.length} adressen met echte coördinaten.`,
        });
      }
    } catch (error) {
      console.error('Route optimization error:', error);
      toast({
        title: "Optimalisatie mislukt",
        description: "Er ging iets mis bij het berekenen van de route. Probeer het opnieuw.",
        variant: "destructive"
      });
    } finally {
      setIsOptimizing(false);
    }
  };

  const packageType1Count = addresses.filter(a => a.packageType === 1).length;
  const packageType2Count = addresses.filter(a => a.packageType === 2).length;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-bold mb-2">Route optimaliseren</h3>
        <p className="text-gray-600">
          Configureer de instellingen en optimaliseer je route met echte locatiegegevens
        </p>
      </div>

      {/* Current Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <MapPin className="w-5 h-5 mr-2" />
            Huidige status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{addresses.length}</div>
              <div className="text-sm text-blue-600">Totaal adressen</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{packageType1Count}</div>
              <div className="text-sm text-green-600">Pakket type 1</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{packageType2Count}</div>
              <div className="text-sm text-purple-600">Pakket type 2</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Optimization Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="w-5 h-5 mr-2" />
            Optimalisatie instellingen
          </CardTitle>
          <CardDescription>
            Pas de instellingen aan naar jouw voorkeuren
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="sessionName">Sessie naam</Label>
            <Input
              id="sessionName"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              placeholder="Naam voor deze route sessie"
            />
          </div>

          <div className="space-y-2">
            <Label>Loopsnelheid: {walkingSpeed[0]} km/h</Label>
            <Slider
              value={walkingSpeed}
              onValueChange={setWalkingSpeed}
              min={3}
              max={6}
              step={0.5}
              className="w-full"
            />
            <p className="text-sm text-gray-600">
              Gemiddelde loopsnelheid voor tijdschatting
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              checked={prioritizePackageType}
              onCheckedChange={setPrioritizePackageType}
            />
            <Label>Groepeer op pakkettype</Label>
          </div>
          <p className="text-sm text-gray-600">
            Probeer adressen met hetzelfde pakkettype bij elkaar te houden
          </p>

          <div className="flex items-center space-x-2">
            <Switch
              checked={splitSessions}
              onCheckedChange={setSplitSessions}
            />
            <Label>Splits in meerdere sessies</Label>
          </div>

          {splitSessions && (
            <div className="ml-6 space-y-2">
              <Label>Maximaal adressen per sessie: {maxAddressesPerSession[0]}</Label>
              <Slider
                value={maxAddressesPerSession}
                onValueChange={setMaxAddressesPerSession}
                min={10}
                max={100}
                step={5}
                className="w-full"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Optimization Button */}
      <Card>
        <CardContent className="pt-6">
          <Button 
            onClick={handleOptimize}
            disabled={isOptimizing || addresses.length === 0}
            className="w-full h-14 text-lg"
          >
            {isOptimizing ? (
              <>
                <Zap className="w-5 h-5 mr-2 animate-spin" />
                Route wordt geoptimaliseerd...
              </>
            ) : (
              <>
                <Play className="w-5 h-5 mr-2" />
                Start optimalisatie
              </>
            )}
          </Button>
          
          {addresses.length === 0 && (
            <p className="text-center text-gray-500 mt-2 text-sm">
              Upload eerst adressen om te kunnen optimaliseren
            </p>
          )}
          
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>✨ Nieuwe functie:</strong> Route-optimalisatie gebruikt nu echte GPS-coördinaten 
              via OpenCage API voor nauwkeurige afstandsberekeningen en optimale routes.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RouteOptimization;
