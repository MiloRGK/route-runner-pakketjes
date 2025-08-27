// Geocoding Service with Cache and Error Handling
import { ENV } from '@/config/env';
import { Coordinates, getPostalCodeCoordinates, isWithinNetherlands } from './coordinates.service';
import { Address } from '@/pages/Index';

export interface GeocodeResult {
  coordinates: Coordinates;
  formatted: string;
  confidence: number;
  source: 'api' | 'cache' | 'fallback';
  accuracy?: 'exact' | 'interpolated' | 'approximate';
}

export interface GeocodeError {
  address: string;
  error: string;
  code: 'NETWORK_ERROR' | 'API_ERROR' | 'INVALID_ADDRESS' | 'RATE_LIMIT' | 'NO_RESULTS';
}

interface CacheEntry {
  result: GeocodeResult;
  timestamp: number;
}

interface OpenCageResult {
  formatted: string;
  confidence: number;
  geometry: {
    lat: number;
    lng: number;
  };
  components: {
    house_number?: string;
    road?: string;
    postcode?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
  };
}

class GeocodingService {
  private cache = new Map<string, CacheEntry>();
  private requestQueue: Array<() => Promise<void>> = [];
  private isProcessing = false;
  private readonly maxRetries = ENV.RETRY_ATTEMPTS;
  private readonly timeout = ENV.REQUEST_TIMEOUT;

  /**
   * Generate cache key for address
   */
  private getCacheKey(address: Address): string {
    return `${address.street}_${address.houseNumber}_${address.postalCode}_${address.city}`.toLowerCase();
  }

  /**
   * Get cached result if available and not expired
   */
  private getCachedResult(address: Address): GeocodeResult | null {
    const key = this.getCacheKey(address);
    const cached = this.cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < ENV.GEOCODING_CACHE_DURATION) {
      return { ...cached.result, source: 'cache' };
    }
    
    if (cached) {
      this.cache.delete(key); // Remove expired entry
    }
    
    return null;
  }

  /**
   * Store result in cache
   */
  private setCachedResult(address: Address, result: GeocodeResult): void {
    const key = this.getCacheKey(address);
    this.cache.set(key, {
      result,
      timestamp: Date.now()
    });
  }

  /**
   * Create fallback result using postal code
   */
  private createFallbackResult(address: Address): GeocodeResult {
    const coordinates = getPostalCodeCoordinates(address.postalCode);
    return {
      coordinates,
      formatted: `${address.street} ${address.houseNumber}, ${address.postalCode} ${address.city}`,
      confidence: 0.3, // Low confidence for fallback
      source: 'fallback'
    };
  }

  /**
   * Make API request with retry logic
   */
  private async makeApiRequest(query: string, retryCount = 0): Promise<OpenCageResult[]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(
        `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(query)}&key=${ENV.OPENCAGE_API_KEY}&countrycode=nl&limit=3&no_annotations=1&language=nl`,
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
      
      if (data.results && data.results.length > 0) {
        return data.results;
      }
      
      return [];
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
      
      // Retry logic
      if (retryCount < this.maxRetries) {
        const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.makeApiRequest(query, retryCount + 1);
      }
      
      throw new Error('NETWORK_ERROR');
    }
  }

  /**
   * Geocode a single address
   */
  async geocodeAddress(address: Address): Promise<GeocodeResult> {
    // Check cache first
    const cached = this.getCachedResult(address);
    if (cached) {
      return cached;
    }

    // Build query variants for better results
    const queries = [
      `${address.street} ${address.houseNumber}, ${address.postalCode} ${address.city}`,
      `${address.street} ${address.houseNumber}, ${address.postalCode}`,
      `${address.street} ${address.houseNumber}, ${address.city}`,
      `${address.postalCode} ${address.houseNumber}` // Dutch postal code format
    ];

    let bestResult: GeocodeResult | null = null;
    let lastError: string | null = null;

    for (const query of queries) {
      try {
        const results = await this.makeApiRequest(query);
        
        if (results.length > 0) {
          const result = results[0];
          const coordinates: Coordinates = [result.geometry.lng, result.geometry.lat];
          
          // Validate coordinates are in Netherlands
          if (!isWithinNetherlands(coordinates)) {
            continue;
          }
          
          const geocodeResult: GeocodeResult = {
            coordinates,
            formatted: result.formatted,
            confidence: result.confidence / 10, // Convert 0-10 to 0-1 scale
            source: 'api'
          };
          
          // Use result with highest confidence
          if (!bestResult || geocodeResult.confidence > bestResult.confidence) {
            bestResult = geocodeResult;
          }
          
          // If we have a high confidence result, use it
          if (geocodeResult.confidence > 0.8) {
            break;
          }
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Unknown error';
        continue;
      }
    }

    // Use best result or fallback
    const finalResult = bestResult || this.createFallbackResult(address);
    
    // Cache the result
    this.setCachedResult(address, finalResult);
    
    if (ENV.IS_DEV) {
      console.log(`Geocoded ${address.street} ${address.houseNumber}:`, finalResult);
    }
    
    return finalResult;
  }

  /**
   * Geocode multiple addresses with rate limiting
   */
  async geocodeAddresses(addresses: Address[]): Promise<{
    results: Map<string, GeocodeResult>;
    errors: GeocodeError[];
  }> {
    const results = new Map<string, GeocodeResult>();
    const errors: GeocodeError[] = [];
    
    // Process in batches to avoid rate limits
    const batchSize = 5;
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
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return { results, errors };
  }

  /**
   * Clear expired cache entries
   */
  clearExpiredCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > ENV.GEOCODING_CACHE_DURATION) {
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
export const geocodingService = new GeocodingService();
export default geocodingService; 