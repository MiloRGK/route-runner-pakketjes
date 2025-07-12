import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapPin, Navigation, Eye, EyeOff, Locate } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Address, RouteSession } from '@/pages/Index';
import { toast } from '@/hooks/use-toast';

interface MapViewProps {
  routeSession: RouteSession | null;
  currentAddressIndex: number;
  completedAddresses: Set<string>;
}

const MapView = ({ routeSession, currentAddressIndex, completedAddresses }: MapViewProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  // Hardcoded Mapbox token
  const MAPBOX_TOKEN = 'pk.eyJ1IjoicnV1ZGplcm9vZCIsImEiOiJjbWQwOGx5c3YwdXR3MmtzangwMGJzMWRlIn0.9ReKdp1YmmgNAD3uoqv5xg';

  useEffect(() => {
    if (!mapContainer.current || !routeSession) return;

    // Initialize map
    mapboxgl.accessToken = MAPBOX_TOKEN;
    
    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v11',
        center: [4.6, 52.4], // Center on Netherlands
        zoom: 10
      });

      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

      map.current.on('load', () => {
        setIsMapReady(true);
        updateMapWithRoute();
      });

      return () => {
        map.current?.remove();
      };
    } catch (error) {
      console.error('Error initializing map:', error);
    }
  }, [routeSession]);

  useEffect(() => {
    if (isMapReady && routeSession) {
      updateMapWithRoute();
    }
  }, [routeSession, currentAddressIndex, completedAddresses, isMapReady]);

  const updateMapWithRoute = () => {
    if (!map.current || !routeSession) return;

    // Clear existing markers and routes
    const markers = document.querySelectorAll('.mapboxgl-marker');
    markers.forEach(marker => marker.remove());

    // Remove existing route layer if it exists
    if (map.current.getSource('route')) {
      map.current.removeLayer('route');
      map.current.removeSource('route');
    }

    const addresses = routeSession.addresses;
    const optimizedOrder = routeSession.optimizedOrder;
    
    if (addresses.length === 0) return;

    // Add markers for each address
    const bounds = new mapboxgl.LngLatBounds();
    
    optimizedOrder.forEach((addressIndex, orderIndex) => {
      const address = addresses[addressIndex];
      if (!address.coordinates) return;

      const [lat, lng] = address.coordinates;
      const isCompleted = completedAddresses.has(address.id);
      const isCurrent = orderIndex === currentAddressIndex;

      // Create marker element
      const markerEl = document.createElement('div');
      markerEl.className = 'custom-marker';
      markerEl.style.width = '32px';
      markerEl.style.height = '32px';
      markerEl.style.borderRadius = '50%';
      markerEl.style.display = 'flex';
      markerEl.style.alignItems = 'center';
      markerEl.style.justifyContent = 'center';
      markerEl.style.fontWeight = 'bold';
      markerEl.style.fontSize = '12px';
      markerEl.style.border = '2px solid white';
      markerEl.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';

      if (isCurrent) {
        markerEl.style.backgroundColor = '#3b82f6'; // Blue for current
        markerEl.style.color = 'white';
        markerEl.innerHTML = '📍';
      } else if (isCompleted) {
        markerEl.style.backgroundColor = '#10b981'; // Green for completed
        markerEl.style.color = 'white';
        markerEl.innerHTML = '✓';
      } else {
        markerEl.style.backgroundColor = '#6b7280'; // Gray for pending
        markerEl.style.color = 'white';
        markerEl.innerHTML = (orderIndex + 1).toString();
      }

      // Create popup
      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
        <div style="padding: 4px;">
          <div style="font-weight: bold; margin-bottom: 4px;">
            ${orderIndex + 1}. ${address.street} ${address.houseNumber}
          </div>
          <div style="font-size: 12px; color: #666;">
            ${address.postalCode} ${address.city}
          </div>
          <div style="font-size: 11px; margin-top: 4px;">
            Pakket type ${address.packageType}
          </div>
        </div>
      `);

      new mapboxgl.Marker(markerEl)
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(map.current!);

      bounds.extend([lng, lat]);
    });

    // Create route line
    if (optimizedOrder.length > 1) {
      const routeCoordinates = optimizedOrder
        .map(addressIndex => {
          const address = addresses[addressIndex];
          if (!address.coordinates) return null;
          const [lat, lng] = address.coordinates;
          return [lng, lat];
        })
        .filter(coord => coord !== null);

      if (routeCoordinates.length > 1) {
        map.current.addSource('route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: routeCoordinates
            }
          }
        });

        map.current.addLayer({
          id: 'route',
          type: 'line',
          source: 'route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#3b82f6',
            'line-width': 3,
            'line-opacity': 0.8
          }
        });
      }
    }

    // Fit map to show all markers
    if (!bounds.isEmpty()) {
      map.current.fitBounds(bounds, {
        padding: 50,
        maxZoom: 16
      });
    }
  };

  const centerOnCurrentLocation = () => {
    if (!map.current) return;

    setIsLocating(true);

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          
          map.current?.flyTo({
            center: [longitude, latitude],
            zoom: 14,
            duration: 2000
          });

          // Add a marker for current location
          const currentLocationMarker = document.createElement('div');
          currentLocationMarker.className = 'current-location-marker';
          currentLocationMarker.style.width = '20px';
          currentLocationMarker.style.height = '20px';
          currentLocationMarker.style.borderRadius = '50%';
          currentLocationMarker.style.backgroundColor = '#ef4444';
          currentLocationMarker.style.border = '3px solid white';
          currentLocationMarker.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';

          new mapboxgl.Marker(currentLocationMarker)
            .setLngLat([longitude, latitude])
            .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML('<div style="padding: 4px; font-weight: bold;">Uw huidige locatie</div>'))
            .addTo(map.current!);

          setIsLocating(false);
          toast({
            title: "Locatie gevonden",
            description: "Kaart gecentreerd op uw huidige locatie",
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          setIsLocating(false);
          toast({
            title: "Locatie niet beschikbaar",
            description: "Kon uw huidige locatie niet bepalen. Controleer uw browser instellingen.",
            variant: "destructive"
          });
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    } else {
      setIsLocating(false);
      toast({
        title: "Geolocation niet ondersteund",
        description: "Uw browser ondersteunt geen locatieservices.",
        variant: "destructive"
      });
    }
  };

  if (!routeSession) {
    return (
      <div className="text-center py-12">
        <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-700 mb-2">Geen route geselecteerd</h3>
        <p className="text-gray-500">Selecteer een route om de kaart te bekijken.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Route kaart</h3>
        <Button 
          onClick={centerOnCurrentLocation}
          disabled={isLocating}
          variant="outline"
          size="sm"
        >
          <Locate className="w-4 h-4 mr-2" />
          {isLocating ? 'Locatie zoeken...' : 'Huidige locatie'}
        </Button>
      </div>
      
      <Card>
        <CardContent className="p-0">
          <div 
            ref={mapContainer} 
            className="w-full h-96 rounded-lg"
            style={{ minHeight: '400px' }}
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">📍</div>
          <span>Huidig adres</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center text-white text-xs">✓</div>
          <span>Voltooid</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-gray-500 rounded-full flex items-center justify-center text-white text-xs">#</div>
          <span>Te doen</span>
        </div>
      </div>
    </div>
  );
};

export default MapView;
