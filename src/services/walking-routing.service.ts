// Walking Routing Service - Real street-based routes
import { ENV } from '@/config/env';
import { Coordinates } from './coordinates.service';

export interface WalkingRoute {
  distance: number; // in kilometers
  duration: number; // in minutes
  coordinates: Coordinates[]; // route path
  steps?: RouteStep[];
}

export interface RouteStep {
  instruction: string;
  distance: number;
  duration: number;
  coordinates: Coordinates;
}

interface MapBoxDirectionsResponse {
  routes: Array<{
    distance: number; // in meters
    duration: number; // in seconds
    geometry: {
      coordinates: Array<[number, number]>;
    };
    legs: Array<{
      steps: Array<{
        maneuver: {
          instruction: string;
          location: [number, number];
        };
        distance: number;
        duration: number;
      }>;
    }>;
  }>;
}

interface CacheEntry {
  route: WalkingRoute;
  timestamp: number;
}

class WalkingRoutingService {
  private cache = new Map<string, CacheEntry>();
  private readonly cacheTime = 60 * 60 * 1000; // 1 hour cache
  private readonly timeout = 15000; // 15 seconds timeout
  private readonly maxRetries = 2;

  /**
   * Generate cache key for route
   */
  private getCacheKey(from: Coordinates, to: Coordinates): string {
    const [fromLng, fromLat] = from;
    const [toLng, toLat] = to;
    return `${fromLng.toFixed(4)},${fromLat.toFixed(4)}-${toLng.toFixed(4)},${toLat.toFixed(4)}`;
  }

  /**
   * Get cached route if available
   */
  private getCachedRoute(from: Coordinates, to: Coordinates): WalkingRoute | null {
    const key = this.getCacheKey(from, to);
    const cached = this.cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTime) {
      return cached.route;
    }
    
    if (cached) {
      this.cache.delete(key);
    }
    
    return null;
  }

  /**
   * Store route in cache
   */
  private setCachedRoute(from: Coordinates, to: Coordinates, route: WalkingRoute): void {
    const key = this.getCacheKey(from, to);
    this.cache.set(key, {
      route,
      timestamp: Date.now()
    });
  }

  /**
   * Calculate fallback walking route using straight line + 30% detour factor
   */
  private calculateFallbackRoute(from: Coordinates, to: Coordinates): WalkingRoute {
    const [fromLng, fromLat] = from;
    const [toLng, toLat] = to;
    
    // Haversine distance calculation
    const R = 6371; // Earth's radius in km
    const dLat = (toLat - fromLat) * Math.PI / 180;
    const dLon = (toLng - fromLng) * Math.PI / 180;
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(fromLat * Math.PI / 180) * Math.cos(toLat * Math.PI / 180) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const straightDistance = R * c;
    
    // Add 30% detour factor for street walking
    const walkingDistance = straightDistance * 1.3;
    
    // Estimate walking time: 5 km/h average walking speed
    const walkingDuration = (walkingDistance / 5) * 60; // minutes
    
    return {
      distance: walkingDistance,
      duration: walkingDuration,
      coordinates: [from, to], // Simple line
      steps: [{
        instruction: `Loop ${walkingDistance.toFixed(1)}km naar bestemming`,
        distance: walkingDistance,
        duration: walkingDuration,
        coordinates: to
      }]
    };
  }

  /**
   * Get walking route using MapBox Directions API
   */
  private async getMapBoxRoute(from: Coordinates, to: Coordinates, retryCount = 0): Promise<MapBoxDirectionsResponse | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const [fromLng, fromLat] = from;
      const [toLng, toLat] = to;
      
      // MapBox Directions API for walking
      const response = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/walking/${fromLng},${fromLat};${toLng},${toLat}?` +
        `access_token=${ENV.MAPBOX_TOKEN}&` +
        `geometries=geojson&` +
        `overview=full&` +
        `steps=true&` +
        `language=nl`,
        {
          signal: controller.signal,
          headers: {
            'User-Agent': `${ENV.APP_NAME}/${ENV.APP_VERSION}`,
          }
        }
      );

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        return data;
      }
      
      if (response.status === 429) {
        throw new Error('RATE_LIMIT');
      }
      
      return null;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.message === 'RATE_LIMIT') {
        throw error;
      }
      
      // Retry logic
      if (retryCount < this.maxRetries) {
        const delay = Math.pow(2, retryCount) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.getMapBoxRoute(from, to, retryCount + 1);
      }
      
      console.warn('MapBox Directions API error:', error);
      return null;
    }
  }

  /**
   * Get walking route between two points
   */
  async getWalkingRoute(from: Coordinates, to: Coordinates): Promise<WalkingRoute> {
    // Check cache first
    const cached = this.getCachedRoute(from, to);
    if (cached) {
      return cached;
    }

    // Same location check
    const [fromLng, fromLat] = from;
    const [toLng, toLat] = to;
    const distance = Math.abs(fromLng - toLng) + Math.abs(fromLat - toLat);
    
    if (distance < 0.0001) { // Very close points (about 10 meters)
      const zeroRoute: WalkingRoute = {
        distance: 0,
        duration: 0,
        coordinates: [from],
        steps: []
      };
      this.setCachedRoute(from, to, zeroRoute);
      return zeroRoute;
    }

    try {
      // Try MapBox Directions API first
      const directionsResponse = await this.getMapBoxRoute(from, to);
      
      if (directionsResponse?.routes && directionsResponse.routes.length > 0) {
        const route = directionsResponse.routes[0];
        
        const walkingRoute: WalkingRoute = {
          distance: route.distance / 1000, // convert meters to km
          duration: route.duration / 60, // convert seconds to minutes
          coordinates: route.geometry.coordinates as Coordinates[],
          steps: route.legs[0]?.steps.map(step => ({
            instruction: step.maneuver.instruction,
            distance: step.distance / 1000,
            duration: step.duration / 60,
            coordinates: step.maneuver.location as Coordinates
          })) || []
        };
        
        this.setCachedRoute(from, to, walkingRoute);
        
        if (ENV.IS_DEV) {
          console.log(`🚶‍♂️ Real walking route: ${walkingRoute.distance.toFixed(2)}km, ${walkingRoute.duration.toFixed(1)} min`);
        }
        
        return walkingRoute;
      }
    } catch (error) {
      console.warn('Error getting MapBox walking route:', error);
    }

    // Fallback to estimated route
    const fallbackRoute = this.calculateFallbackRoute(from, to);
    this.setCachedRoute(from, to, fallbackRoute);
    
    if (ENV.IS_DEV) {
      console.log(`📏 Fallback route (estimated): ${fallbackRoute.distance.toFixed(2)}km, ${fallbackRoute.duration.toFixed(1)} min`);
    }
    
    return fallbackRoute;
  }

  /**
   * Calculate optimal walking route through multiple points
   */
  async getOptimalWalkingRoute(points: Coordinates[]): Promise<{
    routes: WalkingRoute[];
    totalDistance: number;
    totalDuration: number;
    optimizedOrder: number[];
  }> {
    if (points.length < 2) {
      return {
        routes: [],
        totalDistance: 0,
        totalDuration: 0,
        optimizedOrder: points.length === 1 ? [0] : []
      };
    }

    // For now, use simple nearest neighbor optimization
    // TODO: Implement more sophisticated TSP algorithm for better optimization
    const visited = new Set<number>();
    const optimizedOrder: number[] = [];
    const routes: WalkingRoute[] = [];
    let totalDistance = 0;
    let totalDuration = 0;

    // Start from first point
    let currentIndex = 0;
    optimizedOrder.push(currentIndex);
    visited.add(currentIndex);

    while (visited.size < points.length) {
      let bestNextIndex = -1;
      let bestRoute: WalkingRoute | null = null;
      let shortestDistance = Infinity;

      // Find nearest unvisited point
      for (let i = 0; i < points.length; i++) {
        if (visited.has(i)) continue;

        const route = await this.getWalkingRoute(points[currentIndex], points[i]);
        
        if (route.distance < shortestDistance) {
          shortestDistance = route.distance;
          bestNextIndex = i;
          bestRoute = route;
        }
      }

      if (bestNextIndex !== -1 && bestRoute) {
        optimizedOrder.push(bestNextIndex);
        visited.add(bestNextIndex);
        routes.push(bestRoute);
        totalDistance += bestRoute.distance;
        totalDuration += bestRoute.duration;
        currentIndex = bestNextIndex;
      } else {
        break;
      }
    }

    return {
      routes,
      totalDistance,
      totalDuration,
      optimizedOrder
    };
  }

  /**
   * Get multiple routes in parallel (with rate limiting)
   */
  async getMultipleRoutes(routePairs: Array<{ from: Coordinates; to: Coordinates }>): Promise<{
    routes: Map<string, WalkingRoute>;
    errors: Array<{ from: Coordinates; to: Coordinates; error: string }>;
  }> {
    const routes = new Map<string, WalkingRoute>();
    const errors: Array<{ from: Coordinates; to: Coordinates; error: string }> = [];
    
    // Process in small batches to respect API rate limits
    const batchSize = 3;
    const batches = [];
    
    for (let i = 0; i < routePairs.length; i += batchSize) {
      batches.push(routePairs.slice(i, i + batchSize));
    }
    
    for (const batch of batches) {
      const promises = batch.map(async ({ from, to }) => {
        try {
          const route = await this.getWalkingRoute(from, to);
          const key = this.getCacheKey(from, to);
          routes.set(key, route);
        } catch (error) {
          errors.push({
            from,
            to,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      });
      
      await Promise.all(promises);
      
      // Rate limiting delay between batches
      if (batches.indexOf(batch) < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return { routes, errors };
  }

  /**
   * Clear expired cache entries
   */
  clearExpiredCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > this.cacheTime) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size,
      hitRate: 0 // TODO: Implement hit rate tracking
    };
  }

  /**
   * Clear all cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// Export singleton instance
export const walkingRoutingService = new WalkingRoutingService();
export default walkingRoutingService; 