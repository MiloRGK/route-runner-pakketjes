// MapBox Geocoding Service - Better for Dutch addresses
import { ENV } from '@/config/env';
import { Coordinates } from './coordinates.service';
import { Address } from '@/pages/Index';

export interface MapBoxGeocodeResult {
  coordinates: Coordinates;
  formatted: string;
  confidence: number;
  source: 'mapbox' | 'cache' | 'fallback';
  accuracy: 'exact' | 'interpolated' | 'approximate';
}

interface MapBoxResponse {
  features: Array<{
    place_name: string;
    center: [number, number]; // [lng, lat]
    relevance: number;
    properties: {
      accuracy?: string;
      address?: string;
    };
    place_type: string[];
    context: Array<{
      id: string;
      text: string;
      short_code?: string;
    }>;
  }>;
}

interface CacheEntry {
  result: MapBoxGeocodeResult;
  timestamp: number;
}

class MapBoxGeocodingService {
  private cache = new Map<string, CacheEntry>();
  private readonly maxRetries = ENV.RETRY_ATTEMPTS;
  private readonly timeout = ENV.REQUEST_TIMEOUT;
  private readonly cacheTime = ENV.GEOCODING_CACHE_DURATION;

  /**
   * Generate cache key for address
   */
  private getCacheKey(address: Address): string {
    return `${address.street}_${address.houseNumber}_${address.postalCode}_${address.city}`.toLowerCase();
  }

  /**
   * Get cached result if available and not expired
   */
  private getCachedResult(address: Address): MapBoxGeocodeResult | null {
    const key = this.getCacheKey(address);
    const cached = this.cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTime) {
      return { ...cached.result, source: 'cache' };
    }
    
    if (cached) {
      this.cache.delete(key);
    }
    
    return null;
  }

  /**
   * Store result in cache
   */
  private setCachedResult(address: Address, result: MapBoxGeocodeResult): void {
    const key = this.getCacheKey(address);
    this.cache.set(key, {
      result,
      timestamp: Date.now()
    });
  }

  /**
   * Smart fallback using Netherlands center points
   */
  private createSmartFallback(address: Address): MapBoxGeocodeResult {
    // Only a few strategic fallback points instead of huge list
    const postalCode = parseInt(address.postalCode.substring(0, 4));
    
    let coordinates: Coordinates;
    let locationName: string;
    
    // Major Dutch cities as fallback (much smaller list)
    if (postalCode >= 1000 && postalCode <= 1399) {
      coordinates = [4.9041, 52.3676]; // Amsterdam region
      locationName = "Amsterdam region";
    } else if (postalCode >= 2000 && postalCode <= 2999) {
      coordinates = [4.3571, 52.1326]; // Haarlem/Den Haag region  
      locationName = "Haarlem/Den Haag region";
    } else if (postalCode >= 3000 && postalCode <= 3999) {
      coordinates = [4.4777, 51.9225]; // Rotterdam/Utrecht region
      locationName = "Rotterdam/Utrecht region";
    } else if (postalCode >= 4000 && postalCode <= 5999) {
      coordinates = [5.1214, 51.6878]; // Brabant region
      locationName = "Brabant region";
    } else if (postalCode >= 6000 && postalCode <= 6999) {
      coordinates = [5.8669, 51.8426]; // Limburg/Gelderland region
      locationName = "Limburg/Gelderland region";
    } else if (postalCode >= 7000 && postalCode <= 8999) {
      coordinates = [6.0919, 52.5125]; // Overijssel/Flevoland region
      locationName = "Overijssel/Flevoland region";
    } else if (postalCode >= 9000 && postalCode <= 9999) {
      coordinates = [6.5665, 53.2194]; // Groningen/Friesland region
      locationName = "Groningen/Friesland region";
    } else {
      coordinates = [5.2913, 52.1326]; // Netherlands center
      locationName = "Netherlands center";
    }
    
    return {
      coordinates,
      formatted: `${address.street} ${address.houseNumber}, ${address.postalCode} ${address.city} (${locationName})`,
      confidence: 0.2, // Low confidence for fallback
      source: 'fallback',
      accuracy: 'approximate'
    };
  }

  /**
   * Make MapBox geocoding request
   */
  private async makeMapBoxRequest(query: string, retryCount = 0): Promise<MapBoxResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      // MapBox geocoding endpoint with Dutch optimization
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?` +
        `access_token=${ENV.MAPBOX_TOKEN}&` +
        `country=nl&` +
        `language=nl&` +
        `limit=1&` +
        `types=address,poi`,
        {
          signal: controller.signal,
          headers: {
            'User-Agent': `${ENV.APP_NAME}/${ENV.APP_VERSION}`,
          }
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('RATE_LIMIT');
        }
        if (response.status >= 500) {
          throw new Error('API_ERROR');
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('NETWORK_ERROR');
        }
        if (error.message === 'RATE_LIMIT' || error.message === 'API_ERROR') {
          throw error;
        }
      }
      
      // Retry logic with exponential backoff
      if (retryCount < this.maxRetries) {
        const delay = Math.pow(2, retryCount) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.makeMapBoxRequest(query, retryCount + 1);
      }
      
      throw new Error('NETWORK_ERROR');
    }
  }

  /**
   * Geocode a single address using MapBox
   */
  async geocodeAddress(address: Address): Promise<MapBoxGeocodeResult> {
    // Check cache first
    const cached = this.getCachedResult(address);
    if (cached) {
      return cached;
    }

    // Build optimized queries for Dutch addresses
    const queries = [
      `${address.street} ${address.houseNumber}, ${address.postalCode} ${address.city}, Netherlands`,
      `${address.postalCode} ${address.houseNumber}, Netherlands`, // Dutch postal codes are very specific
      `${address.street} ${address.houseNumber}, ${address.city}, Netherlands`,
      `${address.postalCode}, Netherlands` // Postal code only as last resort
    ];

    let bestResult: MapBoxGeocodeResult | null = null;

    for (const query of queries) {
      try {
        const response = await this.makeMapBoxRequest(query);
        
        if (response.features && response.features.length > 0) {
          const feature = response.features[0];
          const [lng, lat] = feature.center;
          
          // Check if coordinates are within Netherlands bounds
          if (lng >= 3.3 && lng <= 7.3 && lat >= 50.7 && lat <= 53.6) {
            const accuracy = feature.properties?.accuracy || 
              (feature.place_type.includes('address') ? 'exact' : 
               feature.place_type.includes('poi') ? 'interpolated' : 'approximate');
            
            const result: MapBoxGeocodeResult = {
              coordinates: [lng, lat],
              formatted: feature.place_name,
              confidence: feature.relevance,
              source: 'mapbox',
              accuracy: accuracy as 'exact' | 'interpolated' | 'approximate'
            };
            
            // Prefer exact addresses
            if (accuracy === 'exact' || feature.relevance > 0.8) {
              bestResult = result;
              break;
            }
            
            if (!bestResult || result.confidence > bestResult.confidence) {
              bestResult = result;
            }
          }
        }
      } catch (error) {
        console.warn(`MapBox geocoding error for query "${query}":`, error);
        continue;
      }
    }

    // Use best result or smart fallback
    const finalResult = bestResult || this.createSmartFallback(address);
    
    // Cache the result
    this.setCachedResult(address, finalResult);
    
    if (ENV.IS_DEV) {
      console.log(`MapBox geocoded ${address.street} ${address.houseNumber}:`, finalResult);
    }
    
    return finalResult;
  }

  /**
   * Geocode multiple addresses with rate limiting
   */
  async geocodeAddresses(addresses: Address[]): Promise<{
    results: Map<string, MapBoxGeocodeResult>;
    errors: Array<{ address: string; error: string; code: string }>;
  }> {
    const results = new Map<string, MapBoxGeocodeResult>();
    const errors: Array<{ address: string; error: string; code: string }> = [];
    
    // Process in smaller batches for MapBox
    const batchSize = 3; // MapBox rate limits are stricter
    const batches = [];
    
    for (let i = 0; i < addresses.length; i += batchSize) {
      batches.push(addresses.slice(i, i + batchSize));
    }
    
    for (const batch of batches) {
      const promises = batch.map(async (address) => {
        try {
          const result = await this.geocodeAddress(address);
          results.set(address.id, result);
        } catch (error) {
          errors.push({
            address: `${address.street} ${address.houseNumber}`,
            error: error instanceof Error ? error.message : 'Unknown error',
            code: 'API_ERROR'
          });
        }
      });
      
      await Promise.all(promises);
      
      // Rate limiting delay between batches
      if (batches.indexOf(batch) < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1200)); // Longer delay for MapBox
      }
    }
    
    return { results, errors };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache stats
   */
  getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size,
      hitRate: 0 // TODO: Implement hit rate tracking
    };
  }
}

// Export singleton instance
export const mapboxGeocodingService = new MapBoxGeocodingService();
export default mapboxGeocodingService; 