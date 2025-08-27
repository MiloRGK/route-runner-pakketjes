// Unified Geocoding Service - Switch between providers
import { ENV } from '@/config/env';
import { dutchGeocodingService } from './dutch-geocoding.service';
import { mapboxGeocodingService } from './mapbox-geocoding.service';
import { geocodingService as opencageService } from './geocoding.service';
import { Address } from '@/pages/Index';
import { Coordinates } from './coordinates.service';

export type GeocodingProvider = 'dutch' | 'mapbox' | 'opencage';

export interface UnifiedGeocodeResult {
  coordinates: Coordinates;
  formatted: string;
  confidence: number;
  source: string;
  accuracy: 'exact' | 'interpolated' | 'approximate';
  provider: GeocodingProvider;
}

class UnifiedGeocodingService {
  private currentProvider: GeocodingProvider;

  constructor() {
    // Auto-select best provider based on available configuration
    this.currentProvider = this.selectBestProvider();
    
    if (ENV.IS_DEV) {
      console.log(`🌍 Geocoding provider: ${this.currentProvider}`);
    }
  }

  /**
   * Automatically select the best available provider
   */
  private selectBestProvider(): GeocodingProvider {
    // For Dutch addresses, prefer Dutch APIs if available
    // They're free and most accurate for Netherlands
    return 'dutch';
    
    // Alternative logic if you want to prefer MapBox:
    // if (ENV.MAPBOX_TOKEN) {
    //   return 'mapbox';
    // } else if (ENV.OPENCAGE_API_KEY) {
    //   return 'opencage';
    // } else {
    //   return 'dutch'; // Fallback to free Dutch APIs
    // }
  }

  /**
   * Get the active geocoding service
   */
  private getActiveService() {
    switch (this.currentProvider) {
      case 'dutch':
        return dutchGeocodingService;
      case 'mapbox':
        return mapboxGeocodingService;
      case 'opencage':
        return opencageService;
      default:
        return dutchGeocodingService; // Safe fallback
    }
  }

  /**
   * Manually switch provider
   */
  switchProvider(provider: GeocodingProvider): void {
    this.currentProvider = provider;
    
    if (ENV.IS_DEV) {
      console.log(`🔄 Switched to geocoding provider: ${provider}`);
    }
  }

  /**
   * Get current provider info
   */
  getProviderInfo(): {
    provider: GeocodingProvider;
    description: string;
    features: string[];
    cost: string;
  } {
    switch (this.currentProvider) {
      case 'dutch':
        return {
          provider: 'dutch',
          description: 'Nederlandse PDOK/BAG APIs',
          features: ['Gratis', 'Meest nauwkeurig voor NL', 'Officiële overheidsbron', 'Huisnummer-level'],
          cost: 'Gratis onbeperkt'
        };
      case 'mapbox':
        return {
          provider: 'mapbox',
          description: 'MapBox Geocoding API',
          features: ['Professioneel', 'Wereldwijd', 'Geïntegreerd met kaarten', 'Goede NL ondersteuning'],
          cost: '100k gratis/maand, daarna $5/1000'
        };
      case 'opencage':
        return {
          provider: 'opencage',
          description: 'OpenCage Geocoding API',
          features: ['Wereldwijd', 'Open source vriendelijk', 'Goed voor development'],
          cost: '2.5k gratis/dag, daarna $50/maand'
        };
    }
  }

  /**
   * Geocode single address using active provider
   */
  async geocodeAddress(address: Address): Promise<UnifiedGeocodeResult> {
    const service = this.getActiveService();
    const result = await service.geocodeAddress(address);
    
    // Normalize result to unified format
    return {
      coordinates: result.coordinates,
      formatted: result.formatted,
      confidence: result.confidence,
      source: result.source,
      accuracy: result.accuracy || 'approximate',
      provider: this.currentProvider
    };
  }

  /**
   * Geocode multiple addresses
   */
  async geocodeAddresses(addresses: Address[]): Promise<{
    results: Map<string, UnifiedGeocodeResult>;
    errors: Array<{ address: string; error: string; code: string }>;
    provider: GeocodingProvider;
  }> {
    const service = this.getActiveService();
    const { results, errors } = await service.geocodeAddresses(addresses);
    
    // Normalize results
    const unifiedResults = new Map<string, UnifiedGeocodeResult>();
    
    for (const [id, result] of results) {
      unifiedResults.set(id, {
        coordinates: result.coordinates,
        formatted: result.formatted,
        confidence: result.confidence,
        source: result.source,
        accuracy: result.accuracy || 'approximate',
        provider: this.currentProvider
      });
    }
    
    return {
      results: unifiedResults,
      errors,
      provider: this.currentProvider
    };
  }

  /**
   * Clear cache for active provider
   */
  clearCache(): void {
    this.getActiveService().clearCache();
  }

  /**
   * Get cache stats for active provider
   */
  getCacheStats(): { size: number; hitRate: number } {
    return this.getActiveService().getCacheStats();
  }

  /**
   * Test all available providers with a sample address
   */
  async testProviders(testAddress: Address): Promise<{
    dutch?: UnifiedGeocodeResult;
    mapbox?: UnifiedGeocodeResult;
    opencage?: UnifiedGeocodeResult;
  }> {
    const results: any = {};
    
    // Test Dutch APIs
    try {
      const dutchResult = await dutchGeocodingService.geocodeAddress(testAddress);
      results.dutch = {
        ...dutchResult,
        provider: 'dutch' as GeocodingProvider
      };
    } catch (error) {
      console.warn('Dutch geocoding test failed:', error);
    }
    
    // Test MapBox (if token available)
    if (ENV.MAPBOX_TOKEN) {
      try {
        const mapboxResult = await mapboxGeocodingService.geocodeAddress(testAddress);
        results.mapbox = {
          ...mapboxResult,
          provider: 'mapbox' as GeocodingProvider
        };
      } catch (error) {
        console.warn('MapBox geocoding test failed:', error);
      }
    }
    
    // Test OpenCage (if key available)
    if (ENV.OPENCAGE_API_KEY) {
      try {
        const opencageResult = await opencageService.geocodeAddress(testAddress);
        results.opencage = {
          ...opencageResult,
          provider: 'opencage' as GeocodingProvider
        };
      } catch (error) {
        console.warn('OpenCage geocoding test failed:', error);
      }
    }
    
    return results;
  }
}

// Export singleton instance
export const unifiedGeocodingService = new UnifiedGeocodingService();
export default unifiedGeocodingService; 