import { Address } from '../pages/Index';
import { Cluster, BikeWalkSettings, BikeWalkRoute } from '../types/multimodal';

export class ClusteringService {
  
  // Calculate distance between two coordinates (Haversine formula)
  private static calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  // Create clusters using simple distance-based clustering
  static createClusters(addresses: Address[], settings: BikeWalkSettings): Cluster[] {
    const clusters: Cluster[] = [];
    const unassigned = [...addresses];
    let clusterId = 0;

    while (unassigned.length > 0) {
      // Start new cluster with first unassigned address
      const seedAddress = unassigned[0];
      const clusterAddresses = [seedAddress];
      unassigned.splice(0, 1);

      // Find all addresses within walking distance
      let i = 0;
      while (i < unassigned.length && clusterAddresses.length < settings.preferredClusterSize) {
        const address = unassigned[i];
        
        // Check if this address is within walking distance of any address in current cluster
        const withinRange = clusterAddresses.some(clusterAddr => {
          if (!address.coordinates || !clusterAddr.coordinates) return false;
          const distance = this.calculateDistance(
            clusterAddr.coordinates[1], clusterAddr.coordinates[0], // lat, lng
            address.coordinates[1], address.coordinates[0]         // lat, lng
          );
          return distance <= settings.maxWalkingDistance;
        });

        if (withinRange) {
          clusterAddresses.push(address);
          unassigned.splice(i, 1);
        } else {
          i++;
        }
      }

      // Create cluster
      const cluster = this.createCluster(
        `cluster-${clusterId++}`,
        clusterAddresses,
        settings
      );
      clusters.push(cluster);
    }

    // Post-process to redistribute small clusters
    const optimizedClusters = this.redistributeSmallClusters(clusters, addresses, settings);

    return optimizedClusters;
  }

  // Post-process clusters to redistribute small clusters to nearby larger clusters
  private static redistributeSmallClusters(clusters: Cluster[], addresses: Address[], settings: BikeWalkSettings): Cluster[] {
    // Calculate minimum cluster size (e.g., 40% of preferred size, minimum 2)
    const minClusterSize = Math.max(2, Math.floor(settings.preferredClusterSize * 0.4));
    
    // Create a map of address ID to address for quick lookup
    const addressMap = new Map<string, Address>();
    addresses.forEach(addr => addressMap.set(addr.id, addr));
    
    const optimizedClusters: Cluster[] = [];
    const smallClusters: Cluster[] = [];
    
    // Separate small and normal clusters
    clusters.forEach(cluster => {
      if (cluster.addresses.length < minClusterSize) {
        smallClusters.push(cluster);
      } else {
        optimizedClusters.push(cluster);
      }
    });
    
    // Try to redistribute small clusters
    for (const smallCluster of smallClusters) {
      const smallClusterAddresses = smallCluster.addresses
        .map(id => addressMap.get(id))
        .filter(addr => addr !== undefined) as Address[];
      
      // Find the best cluster to merge with
      let bestCluster: Cluster | null = null;
      let bestScore = -1;
      
      for (const targetCluster of optimizedClusters) {
        // Skip if target cluster would become too large
        if (targetCluster.addresses.length + smallClusterAddresses.length > settings.preferredClusterSize * 1.5) {
          continue;
        }
        
        const targetAddresses = targetCluster.addresses
          .map(id => addressMap.get(id))
          .filter(addr => addr !== undefined) as Address[];
        
        // Calculate if all small cluster addresses can be within walking distance
        const allWithinRange = smallClusterAddresses.every(smallAddr => {
          if (!smallAddr.coordinates) return false;
          
          return targetAddresses.some(targetAddr => {
            if (!targetAddr.coordinates) return false;
            const distance = this.calculateDistance(
              smallAddr.coordinates![1], smallAddr.coordinates![0], // lat, lng
              targetAddr.coordinates![1], targetAddr.coordinates![0] // lat, lng
            );
            return distance <= settings.maxWalkingDistance;
          });
        });
        
        if (allWithinRange) {
          // Calculate score based on proximity to target cluster center
          const targetCenter = this.calculateOptimalBikeLocation(targetAddresses);
          const smallCenter = this.calculateOptimalBikeLocation(smallClusterAddresses);
          
          const distance = this.calculateDistance(
            targetCenter.lat, targetCenter.lng,
            smallCenter.lat, smallCenter.lng
          );
          
          // Prefer closer clusters and clusters with more room
          const score = (settings.maxWalkingDistance - distance) + 
                       (settings.preferredClusterSize - targetCluster.addresses.length) * 100;
          
          if (score > bestScore) {
            bestScore = score;
            bestCluster = targetCluster;
          }
        }
      }
      
      if (bestCluster) {
        // Merge small cluster into best cluster
        const mergedAddresses = bestCluster.addresses
          .map(id => addressMap.get(id))
          .filter(addr => addr !== undefined)
          .concat(smallClusterAddresses) as Address[];
        
        // Recreate the cluster with merged addresses
        const mergedCluster = this.createCluster(
          bestCluster.id,
          mergedAddresses,
          settings
        );
        
        // Replace the best cluster with the merged one
        const index = optimizedClusters.indexOf(bestCluster);
        optimizedClusters[index] = mergedCluster;
      } else {
        // If we can't merge this small cluster, keep it as is
        optimizedClusters.push(smallCluster);
      }
    }
    
    return optimizedClusters;
  }

  // Create a single cluster from addresses
  private static createCluster(id: string, addresses: Address[], settings: BikeWalkSettings): Cluster {
    // Calculate optimal bike location (geometric center)
    const bikeLocation = this.calculateOptimalBikeLocation(addresses);
    
    // Optimize walking route within cluster
    const walkingRoute = this.optimizeWalkingRoute(addresses, bikeLocation);
    
    // Calculate total walking distance and time
    const { totalDistance, totalTime } = this.calculateWalkingStats(addresses, walkingRoute, settings);

    return {
      id,
      addresses: addresses.map(addr => addr.id),
      bikeLocation,
      walkingRoute: walkingRoute.map(addr => addr.id),
      totalWalkingDistance: totalDistance,
      totalWalkingTime: totalTime,
    };
  }

  // Calculate optimal bike parking location (nearest real address to geometric center)
  private static calculateOptimalBikeLocation(addresses: Address[]): { lat: number; lng: number } {
    const validAddresses = addresses.filter(addr => addr.coordinates);
    
    if (validAddresses.length === 0) {
      return { lat: 52.0907, lng: 5.1214 }; // Default to Utrecht
    }

    if (validAddresses.length === 1) {
      // Only one address, park bike at that location
      return {
        lat: validAddresses[0].coordinates![1], // coordinates[1] is lat
        lng: validAddresses[0].coordinates![0], // coordinates[0] is lng
      };
    }

    // Calculate geometric center first
    const sumLng = validAddresses.reduce((sum, addr) => sum + addr.coordinates![0], 0); // coordinates[0] is lng
    const sumLat = validAddresses.reduce((sum, addr) => sum + addr.coordinates![1], 0); // coordinates[1] is lat
    
    const geometricCenter = {
      lat: sumLat / validAddresses.length,
      lng: sumLng / validAddresses.length,
    };

    // Find the address closest to the geometric center
    let closestAddress = validAddresses[0];
    let minDistance = this.calculateDistance(
      geometricCenter.lat, geometricCenter.lng,
      validAddresses[0].coordinates![1], validAddresses[0].coordinates![0]
    );

    for (let i = 1; i < validAddresses.length; i++) {
      const distance = this.calculateDistance(
        geometricCenter.lat, geometricCenter.lng,
        validAddresses[i].coordinates![1], validAddresses[i].coordinates![0]
      );
      
      if (distance < minDistance) {
        minDistance = distance;
        closestAddress = validAddresses[i];
      }
    }

    // Return the coordinates of the closest real address
    return {
      lat: closestAddress.coordinates![1], // coordinates[1] is lat
      lng: closestAddress.coordinates![0], // coordinates[0] is lng
    };
  }

  // Improved walking route optimization using 2-opt local search
  private static optimizeWalkingRoute(addresses: Address[], bikeLocation: { lat: number; lng: number }): Address[] {
    if (addresses.length <= 1) return addresses;
    if (addresses.length === 2) return addresses; // No optimization needed for 2 addresses

    // Start with nearest neighbor as initial solution
    let route = this.nearestNeighborRoute(addresses, bikeLocation);
    
    // Improve with 2-opt local search
    route = this.twoOptOptimization(route, bikeLocation);
    
    return route;
  }

  // Basic nearest neighbor algorithm
  private static nearestNeighborRoute(addresses: Address[], bikeLocation: { lat: number; lng: number }): Address[] {
    const route: Address[] = [];
    const remaining = [...addresses];
    let currentLocation = { lat: bikeLocation.lat, lng: bikeLocation.lng };
    
    while (remaining.length > 0) {
      let nearestIndex = 0;
      let nearestDistance = Infinity;

      for (let i = 0; i < remaining.length; i++) {
        const address = remaining[i];
        if (!address.coordinates) continue;

        const distance = this.calculateDistance(
          currentLocation.lat, currentLocation.lng,
          address.coordinates[1], address.coordinates[0] // lat, lng
        );

        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = i;
        }
      }

      const nearest = remaining.splice(nearestIndex, 1)[0];
      route.push(nearest);
      if (nearest.coordinates) {
        currentLocation = { lat: nearest.coordinates[1], lng: nearest.coordinates[0] };
      }
    }

    return route;
  }

  // 2-opt optimization to improve the route
  private static twoOptOptimization(route: Address[], bikeLocation: { lat: number; lng: number }): Address[] {
    let improved = true;
    let currentRoute = [...route];
    
    while (improved) {
      improved = false;
      
      for (let i = 0; i < currentRoute.length - 1; i++) {
        for (let j = i + 2; j < currentRoute.length; j++) {
          // Skip if we would create an invalid swap
          if (j === currentRoute.length - 1 && i === 0) continue;
          
          const currentDistance = this.calculateRouteDistance(currentRoute, bikeLocation);
          
          // Create new route by reversing the segment between i+1 and j
          const newRoute = [...currentRoute];
          const segment = newRoute.slice(i + 1, j + 1).reverse();
          newRoute.splice(i + 1, j - i, ...segment);
          
          const newDistance = this.calculateRouteDistance(newRoute, bikeLocation);
          
          if (newDistance < currentDistance) {
            currentRoute = newRoute;
            improved = true;
          }
        }
      }
    }
    
    return currentRoute;
  }

  // Calculate total distance for a route (from bike -> addresses -> back to bike)
  private static calculateRouteDistance(route: Address[], bikeLocation: { lat: number; lng: number }): number {
    if (route.length === 0) return 0;
    
    let totalDistance = 0;
    
    // Distance from bike to first address
    if (route[0].coordinates) {
      totalDistance += this.calculateDistance(
        bikeLocation.lat, bikeLocation.lng,
        route[0].coordinates[1], route[0].coordinates[0]
      );
    }
    
    // Distance between consecutive addresses
    for (let i = 0; i < route.length - 1; i++) {
      if (route[i].coordinates && route[i + 1].coordinates) {
        totalDistance += this.calculateDistance(
          route[i].coordinates[1], route[i].coordinates[0],
          route[i + 1].coordinates[1], route[i + 1].coordinates[0]
        );
      }
    }
    
    // Distance from last address back to bike
    if (route[route.length - 1].coordinates) {
      totalDistance += this.calculateDistance(
        route[route.length - 1].coordinates[1], route[route.length - 1].coordinates[0],
        bikeLocation.lat, bikeLocation.lng
      );
    }
    
    return totalDistance;
  }

  // Calculate walking statistics
  private static calculateWalkingStats(
    addresses: Address[], 
    walkingRoute: Address[], 
    settings: BikeWalkSettings
  ): { totalDistance: number; totalTime: number } {
    let totalDistance = 0;
    
    // Distance from bike to first address
    if (walkingRoute.length > 0 && walkingRoute[0].coordinates) {
      const bikeLocation = this.calculateOptimalBikeLocation(addresses);
      totalDistance += this.calculateDistance(
        bikeLocation.lat, bikeLocation.lng,
        walkingRoute[0].coordinates[1], walkingRoute[0].coordinates[0] // lat, lng
      );
    }

    // Distance between addresses
    for (let i = 0; i < walkingRoute.length - 1; i++) {
      const from = walkingRoute[i];
      const to = walkingRoute[i + 1];
      
      if (from.coordinates && to.coordinates) {
        totalDistance += this.calculateDistance(
          from.coordinates[1], from.coordinates[0], // lat, lng
          to.coordinates[1], to.coordinates[0]     // lat, lng
        );
      }
    }

    // Distance from last address back to bike
    if (walkingRoute.length > 0 && walkingRoute[walkingRoute.length - 1].coordinates) {
      const bikeLocation = this.calculateOptimalBikeLocation(addresses);
      totalDistance += this.calculateDistance(
        walkingRoute[walkingRoute.length - 1].coordinates[1], // lat
        walkingRoute[walkingRoute.length - 1].coordinates[0], // lng
        bikeLocation.lat, bikeLocation.lng
      );
    }

    const totalTime = (totalDistance / 1000) / settings.walkingSpeed * 60; // minutes

    return { totalDistance, totalTime };
  }

  // Create complete bike+walk route
  static createBikeWalkRoute(addresses: Address[], settings: BikeWalkSettings): BikeWalkRoute {
    const clusters = this.createClusters(addresses, settings);
    
    // Calculate cycling distances between clusters (and home base if provided)
    let totalCyclingDistance = 0;
    
    if (settings.homeBase && clusters.length > 0) {
      // Distance from home base to first cluster
      totalCyclingDistance += this.calculateDistance(
        settings.homeBase.lat, settings.homeBase.lng,
        clusters[0].bikeLocation.lat, clusters[0].bikeLocation.lng
      );
      
      // Distance between clusters
      for (let i = 0; i < clusters.length - 1; i++) {
        const from = clusters[i].bikeLocation;
        const to = clusters[i + 1].bikeLocation;
        totalCyclingDistance += this.calculateDistance(from.lat, from.lng, to.lat, to.lng);
      }
      
      // Distance from last cluster back to home base
      totalCyclingDistance += this.calculateDistance(
        clusters[clusters.length - 1].bikeLocation.lat, 
        clusters[clusters.length - 1].bikeLocation.lng,
        settings.homeBase.lat, settings.homeBase.lng
      );
    } else {
      // Calculate distances between clusters only
      for (let i = 0; i < clusters.length - 1; i++) {
        const from = clusters[i].bikeLocation;
        const to = clusters[i + 1].bikeLocation;
        totalCyclingDistance += this.calculateDistance(from.lat, from.lng, to.lat, to.lng);
      }
    }

    // Calculate totals
    const totalWalkingDistance = clusters.reduce((sum, cluster) => sum + cluster.totalWalkingDistance, 0);
    const totalWalkingTime = clusters.reduce((sum, cluster) => sum + cluster.totalWalkingTime, 0);
    const totalCyclingTime = (totalCyclingDistance / 1000) / settings.cyclingSpeed * 60; // minutes
    const totalParkingTime = clusters.length * settings.bikeParkingTime / 60; // minutes

    return {
      id: `bike-walk-route-${Date.now()}`,
      clusters,
      totalDistance: totalWalkingDistance + totalCyclingDistance,
      totalTime: totalWalkingTime + totalCyclingTime + totalParkingTime,
      walkingDistance: totalWalkingDistance,
      cyclingDistance: totalCyclingDistance,
      walkingTime: totalWalkingTime,
      cyclingTime: totalCyclingTime,
      settings: settings,
    };
  }
} 