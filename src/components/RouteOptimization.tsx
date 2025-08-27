
import { useState } from 'react';
import { Route, Play, Settings, Zap, MapPin, Bike } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Address, RouteSession } from '@/pages/Index';
import { toast } from '@/hooks/use-toast';
import { unifiedGeocodingService } from '@/services/unified-geocoding.service';
import { walkingRoutingService } from '@/services/walking-routing.service';
import { calculateDistance } from '@/services/coordinates.service';
import { EarningsTracker } from '@/components/EarningsTracker';
import { ClusteringService } from '@/services/clustering.service';
import { BikeWalkSettings, DEFAULT_BIKE_WALK_SETTINGS } from '@/types/multimodal';
import AddressAutocomplete from './AddressAutocomplete';

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
  const [lastOptimizedRoute, setLastOptimizedRoute] = useState<RouteSession | null>(null);
  
  // Multi-modal routing state
  const [useMultiModal, setUseMultiModal] = useState(false);
  const [bikeWalkSettings, setBikeWalkSettings] = useState<BikeWalkSettings>(DEFAULT_BIKE_WALK_SETTINGS);
  const [homeBaseValue, setHomeBaseValue] = useState<string>('');
  const [homeBaseData, setHomeBaseData] = useState<{ lat: number; lng: number; address: string } | null>(null);

  // Note: Geocoding is now handled by the geocoding service

  // Improved Dutch postal code to coordinates mapping
  const getPostalCodeCoordinates = (postalCode: string): [number, number] => {
    const code = parseInt(postalCode.substring(0, 4));
    
    // More accurate mapping based on actual Dutch postal code areas
    // Returns [longitude, latitude] for consistency with Mapbox
    if (code >= 1000 && code <= 1099) return [4.9041, 52.3676]; // Amsterdam
    if (code >= 1100 && code <= 1299) return [4.8952, 52.3702]; // Amsterdam Noord
    if (code >= 1300 && code <= 1399) return [5.2213, 52.1326]; // Almere
    if (code >= 1400 && code <= 1499) return [4.6368, 52.1601]; // Bussum/Hilversum
    if (code >= 1500 && code <= 1599) return [4.7368, 52.1601]; // Zaandam area
    if (code >= 1600 && code <= 1699) return [4.8368, 52.2601]; // Wormer/Krommenie
    if (code >= 1700 && code <= 1799) return [4.7555, 52.5166]; // Heerhugowaard
    if (code >= 1800 && code <= 1899) return [4.6368, 52.5166]; // Alkmaar
    if (code >= 1900 && code <= 1999) return [4.6180, 52.4584]; // Castricum/Velserbroek area - FIXED!
    if (code >= 2000 && code <= 2199) return [4.3571, 52.1326]; // Haarlem
    if (code >= 2200 && code <= 2299) return [4.5041, 52.1676]; // Noordwijk
    if (code >= 2300 && code <= 2399) return [4.4777, 52.1601]; // Leiden
    if (code >= 2400 && code <= 2499) return [4.2368, 52.1601]; // Alphen aan den Rijn
    if (code >= 2500 && code <= 2599) return [4.3013, 52.0705]; // Den Haag
    if (code >= 2600 && code <= 2699) return [4.2368, 52.0705]; // Delft
    if (code >= 2700 && code <= 2799) return [4.5041, 52.0205]; // Zoetermeer
    if (code >= 2800 && code <= 2899) return [4.3913, 52.0467]; // Gouda
    if (code >= 3000 && code <= 3199) return [4.4777, 51.9225]; // Rotterdam
    if (code >= 3200 && code <= 3299) return [4.3913, 51.8467]; // Spijkenisse
    if (code >= 3300 && code <= 3399) return [4.6913, 51.8467]; // Dordrecht
    if (code >= 3400 && code <= 3499) return [4.9913, 51.8467]; // IJsselstein
    if (code >= 3500 && code <= 3599) return [5.2913, 52.0467]; // Utrecht
    if (code >= 3600 && code <= 3699) return [5.4913, 52.0467]; // Maarssen
    if (code >= 3700 && code <= 3799) return [5.6913, 52.0467]; // Zeist
    if (code >= 3800 && code <= 3899) return [5.3913, 52.1467]; // Amersfoort
    if (code >= 4000 && code <= 4199) return [5.8913, 51.6467]; // Tiel
    if (code >= 4200 && code <= 4299) return [5.0913, 51.6467]; // Gorinchem
    if (code >= 4300 && code <= 4399) return [5.2913, 51.6467]; // Zierikzee
    if (code >= 4400 && code <= 4499) return [4.0913, 51.6467]; // Yerseke
    if (code >= 4500 && code <= 4599) return [3.8913, 51.6467]; // Oostburg
    if (code >= 4600 && code <= 4699) return [4.2913, 51.5467]; // Bergen op Zoom
    if (code >= 4700 && code <= 4799) return [4.7913, 51.5467]; // Roosendaal
    if (code >= 4800 && code <= 4899) return [4.7913, 51.5467]; // Breda
    if (code >= 5000 && code <= 5199) return [5.4913, 51.5467]; // Tilburg
    if (code >= 5200 && code <= 5299) return [5.1913, 51.5467]; // 's-Hertogenbosch
    if (code >= 5300 && code <= 5399) return [5.6913, 51.5467]; // Zaltbommel
    if (code >= 5400 && code <= 5499) return [5.7913, 51.5467]; // Uden
    if (code >= 5500 && code <= 5599) return [5.9913, 51.5467]; // Veldhoven
    if (code >= 5600 && code <= 5699) return [5.5913, 51.4467]; // Eindhoven
    if (code >= 5700 && code <= 5799) return [5.8913, 51.4467]; // Helmond
    if (code >= 5800 && code <= 5899) return [6.0913, 51.8467]; // Venray
    if (code >= 5900 && code <= 5999) return [5.8913, 51.8467]; // Venlo
    if (code >= 6000 && code <= 6199) return [5.7913, 50.8467]; // Weert
    if (code >= 6200 && code <= 6299) return [5.6913, 50.8467]; // Maastricht
    if (code >= 6300 && code <= 6399) return [5.8913, 50.8467]; // Valkenburg
    if (code >= 6400 && code <= 6499) return [5.9913, 50.8467]; // Heerlen
    if (code >= 6500 && code <= 6599) return [6.0913, 50.8467]; // Nijmegen
    if (code >= 6600 && code <= 6699) return [5.8913, 50.9467]; // Wijchen
    if (code >= 6700 && code <= 6799) return [5.9913, 52.0467]; // Wageningen
    if (code >= 6800 && code <= 6899) return [5.9913, 51.9467]; // Arnhem
    if (code >= 6900 && code <= 6999) return [5.9913, 52.0467]; // Zevenaar
    if (code >= 7000 && code <= 7199) return [6.0913, 52.2467]; // Doetinchem
    if (code >= 7200 && code <= 7299) return [6.2913, 52.2467]; // Zutphen
    if (code >= 7300 && code <= 7399) return [6.1913, 52.2467]; // Apeldoorn
    if (code >= 7400 && code <= 7499) return [6.4913, 52.2467]; // Deventer
    if (code >= 7500 && code <= 7599) return [6.8913, 52.2467]; // Enschede
    if (code >= 7600 && code <= 7699) return [6.6913, 52.2467]; // Almelo
    if (code >= 7700 && code <= 7799) return [6.6913, 52.5467]; // Dedemsvaart
    if (code >= 7800 && code <= 7899) return [6.6913, 52.7467]; // Emmen
    if (code >= 8000 && code <= 8199) return [6.0913, 52.5467]; // Zwolle
    if (code >= 8200 && code <= 8299) return [5.8913, 52.7467]; // Lelystad
    if (code >= 8300 && code <= 8399) return [5.6913, 52.7467]; // Emmeloord
    if (code >= 8400 && code <= 8499) return [5.6913, 52.9467]; // Gorredijk
    if (code >= 8500 && code <= 8599) return [5.7913, 52.9467]; // Joure
    if (code >= 8600 && code <= 8699) return [5.5913, 52.9467]; // Sneek
    if (code >= 8700 && code <= 8799) return [5.8913, 53.0467]; // Bolsward
    if (code >= 8800 && code <= 8899) return [5.7913, 53.0467]; // Franeker
    if (code >= 8900 && code <= 8999) return [5.7913, 53.2467]; // Leeuwarden
    if (code >= 9000 && code <= 9199) return [5.7913, 53.2467]; // Groningen
    if (code >= 9200 && code <= 9299) return [5.7913, 53.4467]; // Drachten
    if (code >= 9300 && code <= 9399) return [6.5913, 53.1467]; // Roden
    if (code >= 9400 && code <= 9499) return [6.5913, 53.2467]; // Assen
    if (code >= 9500 && code <= 9599) return [6.7913, 53.2467]; // Stadskanaal
    if (code >= 9600 && code <= 9699) return [6.9913, 53.2467]; // Hoogezand
    if (code >= 9700 && code <= 9799) return [6.5913, 53.4467]; // Groningen
    if (code >= 9800 && code <= 9899) return [6.3913, 53.4467]; // Zuidhorn
    if (code >= 9900 && code <= 9999) return [6.7913, 53.5467]; // Appingedam
    
    // Default fallback - center of Netherlands
    return [5.2913, 52.1326];
  };

  // Enhanced route optimization using real walking routes
  const optimizeRoute = async (addressList: Address[]): Promise<{ order: number[], totalDistance: number, totalDuration: number }> => {
    if (addressList.length === 0) return { order: [], totalDistance: 0, totalDuration: 0 };
    
    // First, geocode all addresses using the new service
    toast({
      title: "Locaties ophalen",
      description: "Postcodes worden omgezet naar coördinaten...",
    });

    const { results, errors } = await unifiedGeocodingService.geocodeAddresses(addressList);
    
    if (errors.length > 0) {
      console.warn('Geocoding errors:', errors);
      toast({
        title: "Waarschuwing",
        description: `${errors.length} adressen konden niet worden gevonden. Fallback coördinaten worden gebruikt.`,
        variant: "destructive"
      });
    }

    // Convert to working format with coordinates
    const validAddresses = addressList.map((address, index) => {
      const geocodeResult = results.get(address.id);
      return {
        ...address,
        coordinates: geocodeResult?.coordinates,
        originalIndex: index,
        confidence: geocodeResult?.confidence || 0
      };
    });

    if (validAddresses.length === 0) return { order: [], totalDistance: 0, totalDuration: 0 };

    // Get all coordinates for walking route optimization
    const coordinates = validAddresses
      .filter(addr => addr.coordinates)
      .map(addr => addr.coordinates!);

    if (coordinates.length < 2) {
      return { 
        order: validAddresses.map((_, i) => i), 
        totalDistance: 0, 
        totalDuration: 0 
      };
    }

    toast({
      title: "Route berekenen",
      description: "Wandelroutes via straten worden berekend...",
    });

    // Use walking routing service for real street-based optimization
    const {
      routes,
      totalDistance,
      totalDuration,
      optimizedOrder
    } = await walkingRoutingService.getOptimalWalkingRoute(coordinates);

    // Apply package type optimization if enabled
    if (prioritizePackageType && optimizedOrder.length > 2) {
      // Group addresses by package type within the optimized route
      const groupedByPackage = optimizedOrder.reduce((groups, index) => {
        const address = validAddresses[index];
        const packageType = address.packageType;
        if (!groups[packageType]) groups[packageType] = [];
        groups[packageType].push(index);
        return groups;
      }, {} as Record<number, number[]>);

      // Re-order to minimize package type switching while keeping geographic proximity
      let reorderedRoute: number[] = [];
      const processedIndices = new Set<number>();

      for (const originalIndex of optimizedOrder) {
        if (processedIndices.has(originalIndex)) continue;

        const address = validAddresses[originalIndex];
        const samePackageGroup = groupedByPackage[address.packageType] || [];
        
        // Add all nearby addresses with same package type
        for (const samePackageIndex of samePackageGroup) {
          if (!processedIndices.has(samePackageIndex)) {
            reorderedRoute.push(samePackageIndex);
            processedIndices.add(samePackageIndex);
          }
        }
      }

      return { 
        order: reorderedRoute.map(i => validAddresses[i].originalIndex), 
        totalDistance, 
        totalDuration 
      };
    }

    return { 
      order: optimizedOrder.map(i => validAddresses[i].originalIndex), 
      totalDistance, 
      totalDuration 
    };
  };

  const calculateEstimates = (addressCount: number, actualDistance?: number, actualDuration?: number) => {
    const averageDeliveryTime = 1.5; // minutes per address per stop
    
    let estimatedDistance = actualDistance || (addressCount * 0.15); // fallback: 150m per address
    let walkingTime = actualDuration || ((estimatedDistance / walkingSpeed[0]) * 60); // use actual duration or estimate
    let deliveryTime = addressCount * averageDeliveryTime;
    
    const estimatedTime = Math.round(walkingTime + deliveryTime);
    
    return { estimatedTime, estimatedDistance };
  };

  // Multi-modal route optimization
  const optimizeMultiModalRoute = async (addressList: Address[]) => {
    // Check if addresses already have coordinates
    const needsGeocoding = addressList.filter(addr => !addr.coordinates);
    
    let geocodedAddresses = [...addressList];
    
    if (needsGeocoding.length > 0) {
      console.log(`Geocoding ${needsGeocoding.length} addresses that don't have coordinates...`);
      
      // Only geocode addresses that don't have coordinates
      const { results, errors } = await unifiedGeocodingService.geocodeAddresses(needsGeocoding);
      
      if (errors.length > 0) {
        console.warn('Geocoding errors:', errors);
        toast({
          title: "Waarschuwing",
          description: `${errors.length} adressen konden niet worden gevonden. Fallback coördinaten worden gebruikt.`,
          variant: "destructive"
        });
      }

      // Add coordinates to addresses that need them
      geocodedAddresses = addressList.map(address => {
        if (address.coordinates) {
          return address; // Already has coordinates
        }
        
        const geocodeResult = results.get(address.id);
        return {
          ...address,
          coordinates: geocodeResult?.coordinates || getPostalCodeCoordinates(address.postalCode)
        };
      });
    } else {
      console.log('All addresses already have coordinates, skipping geocoding');
    }

    // Handle home base if provided
    let finalSettings = { ...bikeWalkSettings };
    if (homeBaseData) {
      finalSettings.homeBase = homeBaseData;
    }

    // Create bike+walk route
    const bikeWalkRoute = ClusteringService.createBikeWalkRoute(geocodedAddresses, finalSettings);
    
    // Convert to RouteSession format
    const flattenedOrder = bikeWalkRoute.clusters.flatMap(cluster => 
      cluster.walkingRoute.map(addressId => 
        geocodedAddresses.findIndex(addr => addr.id === addressId)
      )
    );

    return {
      order: flattenedOrder,
      totalDistance: bikeWalkRoute.totalDistance / 1000, // convert to km
      totalDuration: bikeWalkRoute.totalTime,
      bikeWalkRoute
    };
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
      if (useMultiModal) {
        // Multi-modal optimization
        toast({
          title: "Fiets+Voet route berekenen",
          description: "Clusters worden gemaakt en optimale fietslocaties bepaald...",
        });

                 const { order: optimizedOrder, totalDistance, totalDuration, bikeWalkRoute } = await optimizeMultiModalRoute(addresses);
         
         const session: RouteSession = {
           id: `session-${Date.now()}`,
           name: `${sessionName} (Fiets+Voet)`,
           addresses: addresses,
           optimizedOrder,
           estimatedTime: Math.round(totalDuration),
           estimatedDistance: totalDistance,
           createdAt: new Date(),
           bikeWalkRoute: bikeWalkRoute
         };

        setLastOptimizedRoute(session);
        onRouteOptimized(session);
        
        toast({
          title: "Fiets+Voet route geoptimaliseerd",
          description: `Route berekend met ${bikeWalkRoute.clusters.length} clusters, ${(bikeWalkRoute.walkingDistance / 1000).toFixed(1)}km lopen + ${(bikeWalkRoute.cyclingDistance / 1000).toFixed(1)}km fietsen!`,
        });
      } else if (splitSessions && addresses.length > maxAddressesPerSession[0]) {
        // Create multiple sessions
        const sessions: RouteSession[] = [];
        const addressesPerSession = maxAddressesPerSession[0];
        
        for (let i = 0; i < addresses.length; i += addressesPerSession) {
          const sessionAddresses = addresses.slice(i, i + addressesPerSession);
          const { order: optimizedOrder, totalDistance, totalDuration } = await optimizeRoute(sessionAddresses);
          const { estimatedTime, estimatedDistance } = calculateEstimates(sessionAddresses.length, totalDistance, totalDuration);
          
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
        setLastOptimizedRoute(sessions[0]);
        onRouteOptimized(sessions[0]);
        
        toast({
          title: "Routes geoptimaliseerd",
          description: `${sessions.length} sessies gecreëerd met optimale routes.`,
        });
      } else {
        // Single session
        const { order: optimizedOrder, totalDistance, totalDuration } = await optimizeRoute(addresses);
        const { estimatedTime, estimatedDistance } = calculateEstimates(addresses.length, totalDistance, totalDuration);
        
        const session: RouteSession = {
          id: `session-${Date.now()}`,
          name: sessionName,
          addresses: addresses,
          optimizedOrder,
          estimatedTime,
          estimatedDistance,
          createdAt: new Date()
        };

        setLastOptimizedRoute(session);
        onRouteOptimized(session);
        
        toast({
          title: "Route geoptimaliseerd",
          description: `Optimale wandelroute berekend voor ${addresses.length} adressen via werkelijke straten!`,
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
          
          {/* Multi-modal preview */}
          {useMultiModal && addresses.length > 0 && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
              <h4 className="font-semibold text-blue-800 mb-2 flex items-center">
                <Bike className="w-4 h-4 mr-2" />
                Fiets+Voet Preview
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <p className="text-blue-700">
                    <strong>Geschatte clusters:</strong> {Math.ceil(addresses.length / bikeWalkSettings.preferredClusterSize)}
                  </p>
                  <p className="text-blue-700">
                    <strong>Max loopafstand:</strong> {bikeWalkSettings.maxWalkingDistance}m per cluster
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-blue-700">
                    <strong>Loopsnelheid:</strong> {bikeWalkSettings.walkingSpeed} km/h
                  </p>
                  <p className="text-blue-700">
                    <strong>Fietssnelheid:</strong> {bikeWalkSettings.cyclingSpeed} km/h
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Multi-Modal Settings */}
      <Card className={useMultiModal ? "border-blue-200 bg-blue-50" : ""}>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Bike className="w-5 h-5 mr-2" />
            Fiets + Voet Optimalisatie
          </CardTitle>
          <CardDescription>
            Optimaliseer je route met een combinatie van fietsen en lopen
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center space-x-2">
            <Switch
              checked={useMultiModal}
              onCheckedChange={setUseMultiModal}
            />
            <Label>Gebruik Fiets+Voet modus</Label>
          </div>
          <p className="text-sm text-gray-600">
            Creëer clusters van adressen en optimaliseer fietslocaties tussen clusters
          </p>

          {useMultiModal && (
            <div className="space-y-4 ml-6 p-4 bg-white rounded-lg border">
              <div className="space-y-2">
                <Label>Maximale loopafstand vanaf fiets: {bikeWalkSettings.maxWalkingDistance}m</Label>
                <Slider
                  value={[bikeWalkSettings.maxWalkingDistance]}
                  onValueChange={([value]) => setBikeWalkSettings(prev => ({ ...prev, maxWalkingDistance: value }))}
                  min={200}
                  max={800}
                  step={50}
                  className="w-full"
                />
                <p className="text-xs text-gray-500">
                  Adressen binnen deze afstand worden gegroepeerd in één cluster
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Loopsnelheid: {bikeWalkSettings.walkingSpeed} km/h</Label>
                  <Slider
                    value={[bikeWalkSettings.walkingSpeed]}
                    onValueChange={([value]) => setBikeWalkSettings(prev => ({ ...prev, walkingSpeed: value }))}
                    min={3}
                    max={6}
                    step={0.5}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Fietssnelheid: {bikeWalkSettings.cyclingSpeed} km/h</Label>
                  <Slider
                    value={[bikeWalkSettings.cyclingSpeed]}
                    onValueChange={([value]) => setBikeWalkSettings(prev => ({ ...prev, cyclingSpeed: value }))}
                    min={10}
                    max={25}
                    step={1}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Gewenste cluster grootte: {bikeWalkSettings.preferredClusterSize} adressen</Label>
                <Slider
                  value={[bikeWalkSettings.preferredClusterSize]}
                  onValueChange={([value]) => setBikeWalkSettings(prev => ({ ...prev, preferredClusterSize: value }))}
                  min={3}
                  max={15}
                  step={1}
                  className="w-full"
                />
                <p className="text-xs text-gray-500">
                  Aantal adressen dat je bij voorkeur per cluster wilt bezoeken
                </p>
              </div>

              <div className="space-y-2">
                <AddressAutocomplete
                  value={homeBaseValue}
                  onChange={setHomeBaseValue}
                  onAddressSelect={(addressData) => {
                    setHomeBaseData({
                      lat: addressData.coordinates[1], // coordinates[1] is lat
                      lng: addressData.coordinates[0], // coordinates[0] is lng
                      address: `${addressData.street} ${addressData.houseNumber}, ${addressData.postalCode} ${addressData.city}`
                    });
                  }}
                  placeholder="bijv. Hoofdstraat 1, 1234 AB Amsterdam"
                  label="Thuisbasis / Startlocatie"
                  id="home-base-search"
                />
                <p className="text-xs text-gray-500">
                  Adres waar je route start en eindigt (optioneel)
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Optimization Settings */}
      <Card className={useMultiModal ? "opacity-50" : ""}>
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

          {!useMultiModal && (
            <>
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
            </>
          )}
        </CardContent>
      </Card>

      {/* Optimization Button */}
      <Card>
        <CardContent className="pt-6">
          <Button 
            onClick={handleOptimize}
            disabled={isOptimizing || addresses.length === 0}
            className={`w-full h-14 text-lg ${useMultiModal ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
          >
            {isOptimizing ? (
              <>
                <Zap className="w-5 h-5 mr-2 animate-spin" />
                Route wordt geoptimaliseerd...
              </>
            ) : (
              <>
                {useMultiModal ? <Bike className="w-5 h-5 mr-2" /> : <Play className="w-5 h-5 mr-2" />}
                {useMultiModal ? 'Start Fiets+Voet optimalisatie' : 'Start optimalisatie'}
              </>
            )}
          </Button>
          
          {addresses.length === 0 && (
            <p className="text-center text-gray-500 mt-2 text-sm">
              Upload eerst adressen om te kunnen optimaliseren
            </p>
          )}
          
          <div className={`mt-4 p-3 rounded-lg ${useMultiModal ? 'bg-blue-50' : 'bg-green-50'}`}>
            <p className={`text-sm ${useMultiModal ? 'text-blue-800' : 'text-green-800'}`}>
              {useMultiModal ? (
                <>
                  <strong>🚲 Fiets+Voet modus:</strong> Adressen worden gegroepeerd in clusters, 
                  optimale fietslocaties worden bepaald, en je krijgt een route die zowel fietsen als lopen combineert!
                </>
              ) : (
                <>
                  <strong>🚶‍♂️ Echte wandelroutes:</strong> Route-optimalisatie gebruikt nu MapBox Directions API 
                  voor werkelijke wandelroutes via straten, inclusief nauwkeurige tijd- en afstandsschattingen!
                </>
              )}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Earnings Tracker - only show after successful optimization */}
      {lastOptimizedRoute && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center text-green-800">
              💰 Verdiensten Toevoegen
            </CardTitle>
            <CardDescription>
              Voeg je verdiensten toe voor deze geoptimaliseerde route
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex-1">
                <p className="text-sm text-green-700 mb-2">
                  <strong>Route:</strong> {lastOptimizedRoute.name}
                </p>
                <p className="text-sm text-green-600">
                  {lastOptimizedRoute.addresses.length} adressen • {lastOptimizedRoute.estimatedDistance.toFixed(1)} km • {lastOptimizedRoute.estimatedTime} min
                </p>
              </div>
              <EarningsTracker
                currentRoute={{
                  id: lastOptimizedRoute.id,
                  name: lastOptimizedRoute.name,
                  addresses: lastOptimizedRoute.addresses.map(addr => 
                    `${addr.street} ${addr.houseNumber}, ${addr.postalCode} ${addr.city}`
                  ),
                  distance: lastOptimizedRoute.estimatedDistance,
                  duration: lastOptimizedRoute.estimatedTime
                }}
                onEarningAdded={() => {
                  toast({
                    title: "Verdiensten toegevoegd!",
                    description: "Je verdiensten zijn succesvol geregistreerd voor deze route.",
                  });
                }}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RouteOptimization;
