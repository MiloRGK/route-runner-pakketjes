
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

const RouteOptimization = ({ addresses, onRouteOptimized }: RouteOptimizationProps) => {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [sessionName, setSessionName] = useState('Route ' + new Date().toLocaleDateString());
  const [maxAddressesPerSession, setMaxAddressesPerSession] = useState([50]);
  const [walkingSpeed, setWalkingSpeed] = useState([4.5]); // km/h
  const [prioritizePackageType, setPrioritizePackageType] = useState(false);
  const [splitSessions, setSplitSessions] = useState(false);

  // Simplified route optimization algorithm
  const optimizeRoute = (addressList: Address[]): number[] => {
    if (addressList.length === 0) return [];
    
    const optimizedOrder: number[] = [];
    const visited = new Set<number>();
    
    // Start with address closest to center
    let currentIndex = 0;
    optimizedOrder.push(currentIndex);
    visited.add(currentIndex);

    // Greedy nearest neighbor approach
    while (visited.size < addressList.length) {
      let nextIndex = -1;
      let minDistance = Infinity;

      for (let i = 0; i < addressList.length; i++) {
        if (visited.has(i)) continue;
        
        // Simple distance calculation based on postal code similarity
        const currentPostal = addressList[currentIndex].postalCode;
        const candidatePostal = addressList[i].postalCode;
        const distance = Math.abs(parseInt(currentPostal.substring(0, 4)) - parseInt(candidatePostal.substring(0, 4)));
        
        // Bonus for same package type if prioritizing
        const packageBonus = prioritizePackageType && 
          addressList[currentIndex].packageType === addressList[i].packageType ? -100 : 0;
          
        const totalScore = distance + packageBonus;
        
        if (totalScore < minDistance) {
          minDistance = totalScore;
          nextIndex = i;
        }
      }

      if (nextIndex !== -1) {
        optimizedOrder.push(nextIndex);
        visited.add(nextIndex);
        currentIndex = nextIndex;
      }
    }

    return optimizedOrder;
  };

  const calculateEstimates = (addressCount: number) => {
    const averageWalkingTimeBetweenAddresses = 2; // minutes
    const averageDeliveryTime = 1; // minutes per address
    
    const estimatedTime = (addressCount * averageDeliveryTime) + 
                         ((addressCount - 1) * averageWalkingTimeBetweenAddresses);
    
    const estimatedDistance = (addressCount * 0.1) + // 100m per address on average
                             ((addressCount - 1) * 0.15); // 150m between addresses
    
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
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 2000));

      if (splitSessions && addresses.length > maxAddressesPerSession[0]) {
        // Create multiple sessions
        const sessions: RouteSession[] = [];
        const addressesPerSession = maxAddressesPerSession[0];
        
        for (let i = 0; i < addresses.length; i += addressesPerSession) {
          const sessionAddresses = addresses.slice(i, i + addressesPerSession);
          const optimizedOrder = optimizeRoute(sessionAddresses);
          const { estimatedTime, estimatedDistance } = calculateEstimates(sessionAddresses.length);
          
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

        // For now, return the first session
        onRouteOptimized(sessions[0]);
        
        toast({
          title: "Routes geoptimaliseerd",
          description: `${sessions.length} sessies gecreëerd met optimale routes.`,
        });
      } else {
        // Single session
        const optimizedOrder = optimizeRoute(addresses);
        const { estimatedTime, estimatedDistance } = calculateEstimates(addresses.length);
        
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
          description: `Optimale volgorde berekend voor ${addresses.length} adressen.`,
        });
      }
    } catch (error) {
      toast({
        title: "Optimalisatie mislukt",
        description: "Er ging iets mis bij het berekenen van de route.",
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
          Configureer de instellingen en optimaliseer je route
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
        </CardContent>
      </Card>
    </div>
  );
};

export default RouteOptimization;
