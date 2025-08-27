export interface BikeWalkSettings {
  maxWalkingDistance: number; // in meters
  walkingSpeed: number; // km/h
  cyclingSpeed: number; // km/h
  bikeParkingTime: number; // seconds
  preferredClusterSize: number; // number of addresses
  homeBase?: { lat: number; lng: number; address: string }; // optional home base location
}

export interface Cluster {
  id: string;
  addresses: string[]; // address IDs
  bikeLocation: {
    lat: number;
    lng: number;
    description?: string;
  };
  walkingRoute: string[]; // ordered address IDs for walking
  totalWalkingDistance: number; // meters
  totalWalkingTime: number; // minutes
}

export interface BikeWalkRoute {
  id: string;
  clusters: Cluster[];
  totalDistance: number; // meters
  totalTime: number; // minutes
  walkingDistance: number; // meters
  cyclingDistance: number; // meters
  walkingTime: number; // minutes
  cyclingTime: number; // minutes
  settings: BikeWalkSettings; // include settings for access to homeBase
}

export interface MultiModalSession {
  id: string;
  name: string;
  addresses: any[]; // Address[]
  bikeWalkRoute: BikeWalkRoute;
  settings: BikeWalkSettings;
  createdAt: Date;
  completedAt?: Date;
}

export const DEFAULT_BIKE_WALK_SETTINGS: BikeWalkSettings = {
  maxWalkingDistance: 400, // 400 meters
  walkingSpeed: 5, // 5 km/h
  cyclingSpeed: 18, // 18 km/h
  bikeParkingTime: 30, // 30 seconds
  preferredClusterSize: 8, // 8 addresses per cluster
}; 