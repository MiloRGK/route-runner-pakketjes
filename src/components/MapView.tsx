
import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapPin, Navigation, Eye, EyeOff, Locate } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Address, RouteSession } from '@/pages/Index';
import { toast } from '@/hooks/use-toast';
import { ENV } from '@/config/env';
import { walkingRoutingService } from '@/services/walking-routing.service';

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
  const currentLocationMarker = useRef<mapboxgl.Marker | null>(null);

      useEffect(() => {
      if (!mapContainer.current || !routeSession) return;

      // Initialize map
      mapboxgl.accessToken = ENV.MAPBOX_TOKEN;
    
    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v11',
        center: [4.6, 52.4], // Center on Netherlands
        zoom: 10
      });

      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

      map.current.on('load', () => {
        console.log('Map loaded successfully');
        setIsMapReady(true);
        updateMapWithRoute();
      });

      map.current.on('error', (e) => {
        console.error('Map error:', e);
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
      console.log('Updating map with route data');
      updateMapWithRoute();
    }
  }, [routeSession, currentAddressIndex, completedAddresses, isMapReady]);

  const updateMapWithRoute = () => {
    if (!map.current || !routeSession) {
      console.log('Map or route session not available');
      return;
    }

    console.log('Starting map update with route:', routeSession);

    // Clear existing markers and routes
    const markers = document.querySelectorAll('.mapboxgl-marker:not(.current-location-marker)');
    markers.forEach(marker => marker.remove());

    // Remove existing route layer if it exists
    if (map.current.getSource('route')) {
      if (map.current.getLayer('route-arrows')) {
        map.current.removeLayer('route-arrows');
      }
      if (map.current.getLayer('route')) {
        map.current.removeLayer('route');
      }
      map.current.removeSource('route');
    }

    // Remove existing bike route layers
    if (map.current.getSource('bike-route')) {
      if (map.current.getLayer('bike-route-arrows')) {
        map.current.removeLayer('bike-route-arrows');
      }
      if (map.current.getLayer('bike-route')) {
        map.current.removeLayer('bike-route');
      }
      map.current.removeSource('bike-route');
    }

    // Remove existing walking route layers
    for (let i = 0; i < 10; i++) { // Clean up to 10 clusters
      if (map.current.getSource(`walking-route-${i}`)) {
        if (map.current.getLayer(`walking-arrows-${i}`)) {
          map.current.removeLayer(`walking-arrows-${i}`);
        }
        if (map.current.getLayer(`walking-route-${i}`)) {
          map.current.removeLayer(`walking-route-${i}`);
        }
        map.current.removeSource(`walking-route-${i}`);
      }
    }

    // Check if this is a multi-modal route
    if (routeSession.bikeWalkRoute) {
      (async () => {
        await updateMapWithMultiModalRoute();
      })();
      return;
    }

    const addresses = routeSession.addresses;
    const optimizedOrder = routeSession.optimizedOrder;
    
    if (addresses.length === 0) {
      console.log('No addresses to display');
      return;
    }

    console.log('Processing', addresses.length, 'addresses in order:', optimizedOrder);

    // Check if any addresses have coordinates
    const addressesWithCoordinates = addresses.filter(addr => addr.coordinates && addr.coordinates.length === 2);
    
    if (addressesWithCoordinates.length === 0) {
      console.log('No addresses have coordinates. Showing notice.');
      toast({
        title: "Geen coördinaten beschikbaar",
        description: "De adressen hebben geen GPS-coördinaten. Gebruik de geocoding functie om coördinaten toe te voegen.",
        variant: "destructive"
      });
      return;
    }

    // Add markers for each address with coordinates
    const bounds = new mapboxgl.LngLatBounds();
    const routeCoordinates: [number, number][] = [];
    
    optimizedOrder.forEach((addressIndex, orderIndex) => {
      const address = addresses[addressIndex];
      if (!address.coordinates || address.coordinates.length !== 2) {
        console.log('Address has no valid coordinates:', address);
        return;
      }

      // Coordinates are now in [longitude, latitude] format
      const [lng, lat] = address.coordinates;
      const isCompleted = completedAddresses.has(address.id);
      const isCurrent = orderIndex === currentAddressIndex;

      console.log(`Adding marker for address ${orderIndex + 1}:`, address.street, address.houseNumber, 'at', [lng, lat]);

      // Create marker element
      const markerEl = document.createElement('div');
      markerEl.className = 'address-marker';
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
      routeCoordinates.push([lng, lat]);
    });

    // Create real walking route line through streets
    if (routeCoordinates.length > 1) {
      console.log('Creating walking route with', routeCoordinates.length, 'points');
      
      // Get actual walking routes between consecutive points
      createRealWalkingRoute(routeCoordinates);
    }

    // Fit map to show all markers with padding
    if (!bounds.isEmpty()) {
      console.log('Fitting map to bounds');
      map.current.fitBounds(bounds, {
        padding: 50,
        maxZoom: 16
      });
    }
  };

  // Multi-modal route visualization
  const updateMapWithMultiModalRoute = async () => {
    if (!map.current || !routeSession?.bikeWalkRoute) return;

    const bikeWalkRoute = routeSession.bikeWalkRoute;
    const bounds = new mapboxgl.LngLatBounds();
    
    // Define cluster colors
    const clusterColors = [
      '#ef4444', // red
      '#3b82f6', // blue  
      '#10b981', // green
      '#f59e0b', // yellow
      '#8b5cf6', // purple
      '#06b6d4', // cyan
      '#f97316', // orange
      '#84cc16', // lime
    ];

    // Add home base marker if provided
    if (bikeWalkRoute.settings?.homeBase) {
      const homeBase = bikeWalkRoute.settings.homeBase;
      
      const homeEl = document.createElement('div');
      homeEl.className = 'home-base-marker';
      homeEl.style.width = '32px';
      homeEl.style.height = '32px';
      homeEl.style.borderRadius = '50%';
      homeEl.style.display = 'flex';
      homeEl.style.alignItems = 'center';
      homeEl.style.justifyContent = 'center';
      homeEl.style.fontSize = '18px';
      homeEl.style.backgroundColor = '#1f2937';
      homeEl.style.border = '3px solid white';
      homeEl.style.boxShadow = '0 3px 6px rgba(0,0,0,0.3)';
      homeEl.innerHTML = '🏠';

      const homePopup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
        <div style="padding: 6px;">
          <div style="font-weight: bold; margin-bottom: 4px;">
            🏠 Thuisbasis
          </div>
          <div style="font-size: 12px; color: #666;">
            ${homeBase.address}
          </div>
          <div style="font-size: 11px; margin-top: 4px;">
            Start- en eindpunt van de route
          </div>
        </div>
      `);

      new mapboxgl.Marker(homeEl)
        .setLngLat([homeBase.lng, homeBase.lat])
        .setPopup(homePopup)
        .addTo(map.current!);

      bounds.extend([homeBase.lng, homeBase.lat]);
    }

    // Add markers for each cluster
    bikeWalkRoute.clusters.forEach((cluster: any, clusterIndex: number) => {
      const clusterColor = clusterColors[clusterIndex % clusterColors.length];
      
      // Add bike location marker
      const bikeEl = document.createElement('div');
      bikeEl.className = 'bike-marker';
      bikeEl.style.width = '36px';
      bikeEl.style.height = '36px';
      bikeEl.style.borderRadius = '50%';
      bikeEl.style.display = 'flex';
      bikeEl.style.alignItems = 'center';
      bikeEl.style.justifyContent = 'center';
      bikeEl.style.fontSize = '20px';
      bikeEl.style.backgroundColor = clusterColor;
      bikeEl.style.border = '3px solid white';
      bikeEl.style.boxShadow = '0 3px 6px rgba(0,0,0,0.3)';
      bikeEl.innerHTML = '🚲';

      // Find the address where the bike is parked
      const bikeAddress = cluster.addresses.map((addressId: string) => 
        routeSession.addresses.find((addr: any) => addr.id === addressId)
      ).find((addr: any) => addr?.coordinates && 
        addr.coordinates[0] === cluster.bikeLocation.lng && 
        addr.coordinates[1] === cluster.bikeLocation.lat
      );

      const bikePopup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
        <div style="padding: 6px;">
          <div style="font-weight: bold; margin-bottom: 4px;">
            🚲 Fietslocatie ${clusterIndex + 1}
          </div>
          ${bikeAddress ? `
            <div style="font-size: 12px; color: #666; margin-bottom: 4px;">
              Geparkeerd bij: ${bikeAddress.street} ${bikeAddress.houseNumber}
            </div>
          ` : ''}
          <div style="font-size: 12px; color: #666;">
            ${cluster.addresses.length} adressen in dit cluster
          </div>
          <div style="font-size: 11px; margin-top: 4px;">
            Loop: ${(cluster.totalWalkingDistance / 1000).toFixed(2)}km (~${Math.round(cluster.totalWalkingTime)} min)
          </div>
        </div>
      `);

      new mapboxgl.Marker(bikeEl)
        .setLngLat([cluster.bikeLocation.lng, cluster.bikeLocation.lat])
        .setPopup(bikePopup)
        .addTo(map.current!);

      bounds.extend([cluster.bikeLocation.lng, cluster.bikeLocation.lat]);

      // Add address markers for this cluster
      cluster.addresses.forEach((addressId: string, addressIndex: number) => {
        const address = routeSession.addresses.find((addr: any) => addr.id === addressId);
        if (!address?.coordinates) return;

        const [lng, lat] = address.coordinates;
        const isCompleted = completedAddresses.has(address.id);
        
        // Find the order index in the overall route
        const globalOrderIndex = routeSession.optimizedOrder.findIndex((addrIndex: number) => 
          routeSession.addresses[addrIndex].id === addressId
        );
        const isCurrent = globalOrderIndex === currentAddressIndex;

        const markerEl = document.createElement('div');
        markerEl.className = 'address-marker';
        markerEl.style.width = '28px';
        markerEl.style.height = '28px';
        markerEl.style.borderRadius = '50%';
        markerEl.style.display = 'flex';
        markerEl.style.alignItems = 'center';
        markerEl.style.justifyContent = 'center';
        markerEl.style.fontWeight = 'bold';
        markerEl.style.fontSize = '11px';
        markerEl.style.border = `2px solid ${clusterColor}`;
        markerEl.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';

        if (isCurrent) {
          markerEl.style.backgroundColor = '#3b82f6';
          markerEl.style.color = 'white';
          markerEl.innerHTML = '📍';
        } else if (isCompleted) {
          markerEl.style.backgroundColor = '#10b981';
          markerEl.style.color = 'white';
          markerEl.innerHTML = '✓';
        } else {
          markerEl.style.backgroundColor = 'white';
          markerEl.style.color = clusterColor;
          markerEl.innerHTML = (addressIndex + 1).toString();
        }

        const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
          <div style="padding: 4px;">
            <div style="font-weight: bold; margin-bottom: 4px;">
              ${addressIndex + 1}. ${address.street} ${address.houseNumber}
            </div>
            <div style="font-size: 12px; color: #666;">
              ${address.postalCode} ${address.city}
            </div>
            <div style="font-size: 11px; margin-top: 4px;">
              <span style="background: ${clusterColor}; color: white; padding: 2px 6px; border-radius: 10px;">
                Cluster ${clusterIndex + 1}
              </span>
              • Pakket type ${address.packageType}
            </div>
          </div>
        `);

        new mapboxgl.Marker(markerEl)
          .setLngLat([lng, lat])
          .setPopup(popup)
          .addTo(map.current!);

        bounds.extend([lng, lat]);
      });
    });

    // Add cycling routes between bike locations (and home base if provided)
    if (bikeWalkRoute.clusters.length > 0) {
      await createRealCyclingRoutes(bikeWalkRoute);
    }

    // Add walking routes within each cluster
    await createRealWalkingRoutesForClusters(bikeWalkRoute, clusterColors);

    // Fit map to show all markers
    if (!bounds.isEmpty()) {
      map.current.fitBounds(bounds, {
        padding: 70,
        maxZoom: 15
      });
    }

    toast({
      title: "Fiets+Voet route geladen",
      description: `${bikeWalkRoute.clusters.length} clusters met ${(bikeWalkRoute.walkingDistance / 1000).toFixed(1)}km lopen + ${(bikeWalkRoute.cyclingDistance / 1000).toFixed(1)}km fietsen!`,
    });
  };

  // New function to create real walking routes via streets
  const createRealWalkingRoute = async (points: [number, number][]) => {
    if (!map.current || points.length < 2) return;

    try {
      console.log('Calculating real walking routes...');
      
      // Get walking routes between consecutive points
      const allRouteCoordinates: [number, number][] = [];
      
      for (let i = 0; i < points.length - 1; i++) {
        const from = points[i];
        const to = points[i + 1];
        
        try {
          const walkingRoute = await walkingRoutingService.getWalkingRoute(from, to);
          
          // Add the route coordinates (excluding first point to avoid duplication)
          const routeCoords = walkingRoute.coordinates as [number, number][];
          if (i === 0) {
            allRouteCoordinates.push(...routeCoords);
          } else {
            allRouteCoordinates.push(...routeCoords.slice(1));
          }
          
          console.log(`Walking route ${i + 1}: ${walkingRoute.distance.toFixed(2)}km, ${walkingRoute.duration.toFixed(1)} min`);
        } catch (error) {
          console.warn(`Failed to get walking route ${i + 1}, using straight line`);
          // Fallback to straight line
          if (i === 0) {
            allRouteCoordinates.push(from, to);
          } else {
            allRouteCoordinates.push(to);
          }
        }
      }

      // Add the complete walking route to map
      map.current.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: allRouteCoordinates
          }
        }
      });

      // Main route line
      map.current.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#10b981', // Green for real walking routes
          'line-width': 4,
          'line-opacity': 0.8
        }
      });

      // Add direction arrows
      map.current.addLayer({
        id: 'route-arrows',
        type: 'symbol',
        source: 'route',
        layout: {
          'symbol-placement': 'line',
          'text-field': '▶',
          'text-size': 14,
          'symbol-spacing': 150,
          'text-rotation-alignment': 'map'
        },
        paint: {
          'text-color': '#10b981',
          'text-halo-color': 'white',
          'text-halo-width': 2
        }
      });

      toast({
        title: "Wandelroute geladen",
        description: "Route toont nu werkelijke wandelpaden via straten!",
      });

    } catch (error) {
      console.error('Error creating real walking route:', error);
      
      // Fallback to simple line
      map.current.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: points
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
          'line-color': '#6b7280', // Gray for fallback
          'line-width': 3,
          'line-opacity': 0.7,
          'line-dasharray': [3, 3]
        }
      });
    }
  };

  // Function to create real cycling routes via streets
  const createRealCyclingRoutes = async (bikeWalkRoute: any) => {
    if (!map.current) return;

    const routePoints: [number, number][] = [];
    
    // Start from home base if provided
    if (bikeWalkRoute.settings?.homeBase) {
      routePoints.push([bikeWalkRoute.settings.homeBase.lng, bikeWalkRoute.settings.homeBase.lat]);
    }
    
    // Add all cluster bike locations
    bikeWalkRoute.clusters.forEach((cluster: any) => {
      routePoints.push([cluster.bikeLocation.lng, cluster.bikeLocation.lat]);
    });
    
    // Return to home base if provided
    if (bikeWalkRoute.settings?.homeBase) {
      routePoints.push([bikeWalkRoute.settings.homeBase.lng, bikeWalkRoute.settings.homeBase.lat]);
    }

    if (routePoints.length < 2) return;

    try {
      console.log('Creating real cycling routes...');
      
      // Get cycling routes between consecutive points
      const allRouteCoordinates: [number, number][] = [];
      
      for (let i = 0; i < routePoints.length - 1; i++) {
        const from = routePoints[i];
        const to = routePoints[i + 1];
        
        try {
          // Use MapBox Directions API for cycling
          const response = await fetch(
            `https://api.mapbox.com/directions/v5/mapbox/cycling/${from[0]},${from[1]};${to[0]},${to[1]}?` +
            `access_token=${ENV.MAPBOX_TOKEN}&` +
            `geometries=geojson&` +
            `overview=full&` +
            `language=nl`,
            {
              headers: {
                'User-Agent': 'RouteRunner/1.0'
              }
            }
          );

          if (response.ok) {
            const data = await response.json();
            if (data.routes && data.routes.length > 0) {
              const routeCoords = data.routes[0].geometry.coordinates as [number, number][];
              
              // Add the route coordinates (excluding first point to avoid duplication)
              if (i === 0) {
                allRouteCoordinates.push(...routeCoords);
              } else {
                allRouteCoordinates.push(...routeCoords.slice(1));
              }
              
              console.log(`Cycling route ${i + 1}: ${(data.routes[0].distance / 1000).toFixed(2)}km, ${(data.routes[0].duration / 60).toFixed(1)} min`);
            } else {
              // Fallback to straight line
              if (i === 0) {
                allRouteCoordinates.push(from, to);
              } else {
                allRouteCoordinates.push(to);
              }
            }
          } else {
            console.warn(`Failed to get cycling route ${i + 1}, using straight line`);
            // Fallback to straight line
            if (i === 0) {
              allRouteCoordinates.push(from, to);
            } else {
              allRouteCoordinates.push(to);
            }
          }
        } catch (error) {
          console.warn(`Error getting cycling route ${i + 1}:`, error);
          // Fallback to straight line
          if (i === 0) {
            allRouteCoordinates.push(from, to);
          } else {
            allRouteCoordinates.push(to);
          }
        }
      }

      // Add the complete cycling route to map
      map.current.addSource('bike-route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: allRouteCoordinates
          }
        }
      });

      // Main cycling route line
      map.current.addLayer({
        id: 'bike-route',
        type: 'line',
        source: 'bike-route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#f59e0b', // Orange for bike routes
          'line-width': 6,
          'line-opacity': 0.8,
          'line-dasharray': [2, 2]
        }
      });

      // Add direction arrows for cycling routes
      map.current.addLayer({
        id: 'bike-route-arrows',
        type: 'symbol',
        source: 'bike-route',
        layout: {
          'symbol-placement': 'line',
          'text-field': '🚲',
          'text-size': 16,
          'symbol-spacing': 200,
          'text-rotation-alignment': 'map'
        },
        paint: {
          'text-color': '#f59e0b',
          'text-halo-color': 'white',
          'text-halo-width': 2
        }
      });

    } catch (error) {
      console.error('Error creating cycling routes:', error);
      
      // Fallback to simple straight lines
      map.current.addSource('bike-route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: routePoints
          }
        }
      });

      map.current.addLayer({
        id: 'bike-route',
        type: 'line',
        source: 'bike-route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#f59e0b',
          'line-width': 6,
          'line-opacity': 0.8,
          'line-dasharray': [2, 2]
        }
      });
    }
  };

  // Function to create real walking routes within clusters
  const createRealWalkingRoutesForClusters = async (bikeWalkRoute: any, clusterColors: string[]) => {
    if (!map.current) return;

    for (let clusterIndex = 0; clusterIndex < bikeWalkRoute.clusters.length; clusterIndex++) {
      const cluster = bikeWalkRoute.clusters[clusterIndex];
      const clusterColor = clusterColors[clusterIndex % clusterColors.length];
      
      // Get addresses in walking order
      const orderedAddresses = cluster.walkingRoute.map((addressId: string) => 
        routeSession?.addresses.find((addr: any) => addr.id === addressId)
      ).filter((addr: any) => addr?.coordinates);

      if (orderedAddresses.length > 0) {
        try {
          // Create walking route points (bike -> addresses -> bike)
          const walkingPoints: [number, number][] = [];
          
          // Start from bike location
          walkingPoints.push([cluster.bikeLocation.lng, cluster.bikeLocation.lat]);
          
          // Add all addresses in order
          orderedAddresses.forEach((address: any) => {
            walkingPoints.push([address.coordinates[0], address.coordinates[1]]);
          });
          
          // Return to bike location
          walkingPoints.push([cluster.bikeLocation.lng, cluster.bikeLocation.lat]);

          // Get real walking routes between consecutive points
          const allWalkingCoordinates: [number, number][] = [];
          
          for (let i = 0; i < walkingPoints.length - 1; i++) {
            const from = walkingPoints[i];
            const to = walkingPoints[i + 1];
            
            try {
              const walkingRoute = await walkingRoutingService.getWalkingRoute(from, to);
              const routeCoords = walkingRoute.coordinates as [number, number][];
              
              // Add the route coordinates (excluding first point to avoid duplication)
              if (i === 0) {
                allWalkingCoordinates.push(...routeCoords);
              } else {
                allWalkingCoordinates.push(...routeCoords.slice(1));
              }
              
              console.log(`Walking route ${clusterIndex + 1}.${i + 1}: ${walkingRoute.distance.toFixed(2)}km, ${walkingRoute.duration.toFixed(1)} min`);
            } catch (error) {
              console.warn(`Failed to get walking route for cluster ${clusterIndex + 1}, segment ${i + 1}:`, error);
              // Fallback to straight line
              if (i === 0) {
                allWalkingCoordinates.push(from, to);
              } else {
                allWalkingCoordinates.push(to);
              }
            }
          }

          // Add walking route to map
          map.current.addSource(`walking-route-${clusterIndex}`, {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: allWalkingCoordinates
              }
            }
          });

          map.current.addLayer({
            id: `walking-route-${clusterIndex}`,
            type: 'line',
            source: `walking-route-${clusterIndex}`,
            layout: {
              'line-join': 'round',
              'line-cap': 'round'
            },
            paint: {
              'line-color': clusterColor,
              'line-width': 3,
              'line-opacity': 0.7
            }
          });

          // Add direction arrows for walking routes
          map.current.addLayer({
            id: `walking-arrows-${clusterIndex}`,
            type: 'symbol',
            source: `walking-route-${clusterIndex}`,
            layout: {
              'symbol-placement': 'line',
              'text-field': '🚶‍♂️',
              'text-size': 12,
              'symbol-spacing': 100,
              'text-rotation-alignment': 'map'
            },
            paint: {
              'text-color': clusterColor,
              'text-halo-color': 'white',
              'text-halo-width': 1
            }
          });

        } catch (error) {
          console.error(`Error creating walking routes for cluster ${clusterIndex + 1}:`, error);
          
          // Fallback to simple straight lines
          const walkingCoordinates: [number, number][] = [];
          walkingCoordinates.push([cluster.bikeLocation.lng, cluster.bikeLocation.lat]);
          
          orderedAddresses.forEach((address: any) => {
            walkingCoordinates.push([address.coordinates[0], address.coordinates[1]]);
          });
          
          walkingCoordinates.push([cluster.bikeLocation.lng, cluster.bikeLocation.lat]);

          map.current.addSource(`walking-route-${clusterIndex}`, {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: walkingCoordinates
              }
            }
          });

          map.current.addLayer({
            id: `walking-route-${clusterIndex}`,
            type: 'line',
            source: `walking-route-${clusterIndex}`,
            layout: {
              'line-join': 'round',
              'line-cap': 'round'
            },
            paint: {
              'line-color': clusterColor,
              'line-width': 3,
              'line-opacity': 0.7,
              'line-dasharray': [3, 3] // Dashed for fallback
            }
          });
        }
      }
    }
  };

  const centerOnCurrentLocation = () => {
    if (!map.current) return;

    setIsLocating(true);
    console.log('Attempting to get current location');

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          console.log('Got current location:', latitude, longitude);
          
          // Remove existing current location marker
          if (currentLocationMarker.current) {
            currentLocationMarker.current.remove();
          }

          // Fly to current location
          map.current?.flyTo({
            center: [longitude, latitude],
            zoom: 15,
            duration: 2000
          });

          // Create current location marker element
          const currentLocationEl = document.createElement('div');
          currentLocationEl.className = 'current-location-marker';
          currentLocationEl.style.width = '20px';
          currentLocationEl.style.height = '20px';
          currentLocationEl.style.borderRadius = '50%';
          currentLocationEl.style.backgroundColor = '#ef4444';
          currentLocationEl.style.border = '3px solid white';
          currentLocationEl.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
          
          // Add pulse animation
          currentLocationEl.style.animation = 'pulse 2s infinite';
          
          // Ensure CSS animation is available
          if (!document.querySelector('#pulse-animation-style')) {
            const style = document.createElement('style');
            style.id = 'pulse-animation-style';
            style.textContent = `
              @keyframes pulse {
                0% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.2); opacity: 0.7; }
                100% { transform: scale(1); opacity: 1; }
              }
            `;
            document.head.appendChild(style);
          }

          // Create and add the marker
          currentLocationMarker.current = new mapboxgl.Marker(currentLocationEl)
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

              {routeSession?.bikeWalkRoute ? (
        // Multi-modal legend
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-gray-700 rounded-full flex items-center justify-center text-white text-xs">🏠</div>
            <span>Thuisbasis</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">🚲</div>
            <span>Fietslocaties</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">📍</div>
            <span>Huidig adres</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center text-white text-xs">✓</div>
            <span>Voltooid</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-1 bg-orange-500" style={{ borderStyle: 'dashed' }}></div>
            <span>Fietsroute</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-1 bg-red-500"></div>
            <span>Looproute</span>
          </div>
        </div>
      ) : (
        // Regular walking route legend
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
      )}
    </div>
  );
};

export default MapView;
