/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OPENCAGE_API_KEY: string;
  readonly VITE_MAPBOX_TOKEN: string;
  readonly VITE_APP_NAME: string;
  readonly VITE_APP_VERSION: string;
  readonly VITE_DEFAULT_MAP_CENTER_LAT: string;
  readonly VITE_DEFAULT_MAP_CENTER_LNG: string;
  readonly VITE_DEFAULT_MAP_ZOOM: string;
  readonly VITE_GEOCODING_CACHE_DURATION: string;
  readonly VITE_MAX_ADDRESSES_PER_REQUEST: string;
  readonly VITE_RETRY_ATTEMPTS: string;
  readonly VITE_REQUEST_TIMEOUT: string;
  readonly DEV: boolean;
  readonly PROD: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
