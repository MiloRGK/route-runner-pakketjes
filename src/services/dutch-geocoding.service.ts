// Dutch Geocoding Service - Most accurate for Dutch addresses
// Uses official Dutch government APIs (PDOK/BAG)
import { Coordinates } from './coordinates.service';
import { Address } from '@/pages/Index';

export interface DutchGeocodeResult {
  coordinates: Coordinates;
  formatted: string;
  confidence: number;
  source: 'pdok' | 'bag' | 'cache' | 'fallback';
  accuracy: 'exact' | 'interpolated' | 'approximate';
  bagId?: string; // Official Dutch building ID
}

interface PDOKResponse {
  response: {
    docs: Array<{
      centroide_ll: string; // "lat,lng" format
      weergavenaam: string;
      score: number;
      type: string;
      id: string;
      postcode?: string;
      huisnummer?: number;
      straatnaam?: string;
      woonplaatsnaam?: string;
    }>;
  };
}

interface CacheEntry {
  result: DutchGeocodeResult;
  timestamp: number;
}

class DutchGeocodingService {
  private cache = new Map<string, CacheEntry>();
  private readonly cacheTime = 24 * 60 * 60 * 1000; // 24 hours
  private readonly timeout = 10000; // 10 seconds

  /**
   * Generate cache key for address
   */
  private getCacheKey(address: Address): string {
    return `${address.street}_${address.houseNumber}_${address.postalCode}_${address.city}`.toLowerCase();
  }

  /**
   * Get cached result if available and not expired
   */
  private getCachedResult(address: Address): DutchGeocodeResult | null {
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
  private setCachedResult(address: Address, result: DutchGeocodeResult): void {
    const key = this.getCacheKey(address);
    this.cache.set(key, {
      result,
      timestamp: Date.now()
    });
  }

  /**
   * Minimal fallback using major city centers only
   */
  private createMinimalFallback(address: Address): DutchGeocodeResult {
    const postalCode = parseInt(address.postalCode.substring(0, 4));
    
    // Very minimal fallback - just major regions
    let coordinates: Coordinates;
    let regionName: string;
    
    if (postalCode >= 1000 && postalCode <= 1999) {
      coordinates = [4.9041, 52.3676]; // Amsterdam
      regionName = "Amsterdam";
    } else if (postalCode >= 2000 && postalCode <= 2999) {
      coordinates = [4.3013, 52.0705]; // Den Haag
      regionName = "Den Haag";
    } else if (postalCode >= 3000 && postalCode <= 3999) {
      coordinates = [4.4777, 51.9225]; // Rotterdam
      regionName = "Rotterdam";
    } else if (postalCode >= 5000 && postalCode <= 5999) {
      coordinates = [5.1214, 52.0907]; // Utrecht/Eindhoven
      regionName = "Utrecht/Eindhoven";
    } else {
      coordinates = [5.2913, 52.1326]; // Nederland centrum
      regionName = "Nederland centrum";
    }
    
    return {
      coordinates,
      formatted: `${address.street} ${address.houseNumber}, ${address.postalCode} ${address.city} (regio ${regionName})`,
      confidence: 0.1, // Very low confidence
      source: 'fallback',
      accuracy: 'approximate'
    };
  }

  /**
   * Search using PDOK Locatieserver (official Dutch government API)
   */
  private async searchPDOK(query: string): Promise<PDOKResponse | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      // PDOK Locatieserver - free official Dutch geocoding
      const response = await fetch(
        `https://api.pdok.nl/bzk/locatieserver/search/v3_1/suggest?` +
        `q=${encodeURIComponent(query)}&` +
        `rows=1&` +
        `fq=type:adres&` +
        `fl=id,weergavenaam,type,score,centroide_ll,postcode,huisnummer,straatnaam,woonplaatsnaam`,
        {
          signal: controller.signal,
          headers: {
            'User-Agent': 'RouteRunner/1.0',
          }
        }
      );

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        return data;
      }
      
      return null;
    } catch (error) {
      clearTimeout(timeoutId);
      console.warn('PDOK API error:', error);
      return null;
    }
  }

  /**
   * Geocode using PostcodeAPI.nu (alternative free Dutch service)
   */
  private async searchPostcodeAPI(postcode: string, houseNumber: string): Promise<{ lat: number; lng: number } | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      // PostcodeAPI.nu - free Dutch postcode service
      const response = await fetch(
        `https://postcode-api.apiwise.nl/v2/addresses/?postcode=${encodeURIComponent(postcode)}&number=${encodeURIComponent(houseNumber)}`,
        {
          signal: controller.signal,
          headers: {
            'User-Agent': 'RouteRunner/1.0',
          }
        }
      );

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (data.results && data.results.length > 0) {
          const result = data.results[0];
          return {
            lat: result.geo.center.wgs84.coordinates[1],
            lng: result.geo.center.wgs84.coordinates[0]
          };
        }
      }
      
      return null;
    } catch (error) {
      clearTimeout(timeoutId);
      console.warn('PostcodeAPI error:', error);
      return null;
    }
  }

  /**
   * Geocode a single address using Dutch APIs
   */
  async geocodeAddress(address: Address): Promise<DutchGeocodeResult> {
    // Check cache first
    const cached = this.getCachedResult(address);
    if (cached) {
      return cached;
    }

    // Try PDOK first (most accurate for Dutch addresses)
    const pdokQueries = [
      `${address.street} ${address.houseNumber} ${address.postalCode} ${address.city}`,
      `${address.postalCode} ${address.houseNumber}`, // Dutch postcodes are very specific
      `${address.street} ${address.houseNumber} ${address.city}`
    ];

    for (const query of pdokQueries) {
      try {
        const pdokResult = await this.searchPDOK(query);
        
        if (pdokResult?.response?.docs?.length > 0) {
          const doc = pdokResult.response.docs[0];
          const [lat, lng] = doc.centroide_ll.split(',').map(Number);
          
          // Validate coordinates are in Netherlands
          if (lng >= 3.3 && lng <= 7.3 && lat >= 50.7 && lat <= 53.6) {
            const result: DutchGeocodeResult = {
              coordinates: [lng, lat],
              formatted: doc.weergavenaam,
              confidence: doc.score,
              source: 'pdok',
              accuracy: doc.type === 'adres' ? 'exact' : 'interpolated',
              bagId: doc.id
            };
            
            this.setCachedResult(address, result);
            return result;
          }
        }
      } catch (error) {
        console.warn(`PDOK error for query "${query}":`, error);
        continue;
      }
    }

    // Fallback to PostcodeAPI.nu for postcode + house number
    try {
      const postcodeResult = await this.searchPostcodeAPI(address.postalCode, address.houseNumber);
      
      if (postcodeResult) {
        const result: DutchGeocodeResult = {
          coordinates: [postcodeResult.lng, postcodeResult.lat],
          formatted: `${address.street} ${address.houseNumber}, ${address.postalCode} ${address.city}`,
          confidence: 0.8, // High confidence for postal code + house number
          source: 'pdok',
          accuracy: 'exact'
        };
        
        this.setCachedResult(address, result);
        return result;
      }
    } catch (error) {
      console.warn('PostcodeAPI fallback error:', error);
    }

    // Use minimal fallback
    const fallbackResult = this.createMinimalFallback(address);
    this.setCachedResult(address, fallbackResult);
    return fallbackResult;
  }

  /**
   * Geocode multiple addresses with rate limiting
   */
  async geocodeAddresses(addresses: Address[]): Promise<{
    results: Map<string, DutchGeocodeResult>;
    errors: Array<{ address: string; error: string; code: string }>;
  }> {
    const results = new Map<string, DutchGeocodeResult>();
    const errors: Array<{ address: string; error: string; code: string }> = [];
    
    // Process in batches to be nice to free APIs
    const batchSize = 2; // Very conservative for free APIs
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
      
      // Conservative rate limiting for free APIs
      if (batches.indexOf(batch) < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
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
      hitRate: 0
    };
  }
}

// Export singleton instance
export const dutchGeocodingService = new DutchGeocodingService();
export default dutchGeocodingService; 