// Environment Configuration
// TODO: Move these to actual environment variables in production

export const ENV = {
  // API Keys (should be moved to .env.local)
  OPENCAGE_API_KEY: import.meta.env.VITE_OPENCAGE_API_KEY || '8cd50accbc214b2484dd1db860cc146f',
  MAPBOX_TOKEN: import.meta.env.VITE_MAPBOX_TOKEN || 'pk.eyJ1IjoicnV1ZGplcm9vZCIsImEiOiJjbWQwOGx5c3YwdXR3MmtzangwMGJzMWRlIn0.9ReKdp1YmmgNAD3uoqv5xg',

  // Application Configuration
  APP_NAME: import.meta.env.VITE_APP_NAME || 'RouteRunner',
  APP_VERSION: import.meta.env.VITE_APP_VERSION || '1.0.0',

  // Map Configuration
  DEFAULT_MAP_CENTER: [
    parseFloat(import.meta.env.VITE_DEFAULT_MAP_CENTER_LNG || '4.9041'),
    parseFloat(import.meta.env.VITE_DEFAULT_MAP_CENTER_LAT || '52.3676')
  ] as [number, number],
  DEFAULT_MAP_ZOOM: parseInt(import.meta.env.VITE_DEFAULT_MAP_ZOOM || '10'),

  // Performance Settings
  GEOCODING_CACHE_DURATION: parseInt(import.meta.env.VITE_GEOCODING_CACHE_DURATION || '86400000'), // 24 hours
  MAX_ADDRESSES_PER_REQUEST: parseInt(import.meta.env.VITE_MAX_ADDRESSES_PER_REQUEST || '50'),
  RETRY_ATTEMPTS: parseInt(import.meta.env.VITE_RETRY_ATTEMPTS || '3'),
  REQUEST_TIMEOUT: parseInt(import.meta.env.VITE_REQUEST_TIMEOUT || '10000'),

  // Development
  IS_DEV: import.meta.env.DEV,
  IS_PROD: import.meta.env.PROD
} as const;

// Type-safe environment access
export type EnvKey = keyof typeof ENV;

// Validation function
export const validateEnv = (): void => {
  if (!ENV.OPENCAGE_API_KEY) {
    console.warn('OPENCAGE_API_KEY is not set. Geocoding may not work properly.');
  }
  if (!ENV.MAPBOX_TOKEN) {
    console.warn('MAPBOX_TOKEN is not set. Map functionality may not work properly.');
  }
}; 