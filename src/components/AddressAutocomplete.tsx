
import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Loader2 } from 'lucide-react';
import { ENV } from '@/config/env';

interface AddressSuggestion {
  formatted: string;
  components: {
    house_number?: string;
    road?: string;
    postcode?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    neighbourhood?: string;
  };
  geometry: {
    lat: number;
    lng: number;
  };
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onAddressSelect: (address: {
    street: string;
    houseNumber: string;
    postalCode: string;
    city: string;
    coordinates: [number, number];
  }) => void;
  placeholder?: string;
  label?: string;
  id?: string;
}

const AddressAutocomplete = ({ 
  value, 
  onChange, 
  onAddressSelect, 
  placeholder = "Begin met typen...", 
  label = "Zoek adres",
  id = "address-search"
}: AddressAutocompleteProps) => {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout>();
  const inputRef = useRef<HTMLInputElement>(null);

  const searchAddresses = async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    try {
      // Probeer verschillende zoekstrategieën
      const searchQueries = [
        query, // Originele query
        query.replace(/\s+/g, '+'), // Spaties vervangen door +
        query + ', Nederland', // Nederland toevoegen
      ];

      let allResults: AddressSuggestion[] = [];

      for (const searchQuery of searchQueries) {
        console.log('Searching for:', searchQuery);
        
        const response = await fetch(
          `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(searchQuery)}&key=${ENV.OPENCAGE_API_KEY}&countrycode=nl&limit=10&no_annotations=1&language=nl`
        );
        
        if (response.ok) {
          const data = await response.json();
          console.log('Search results for', searchQuery, ':', data.results?.length || 0, 'results');
          
          if (data.results && data.results.length > 0) {
            // Filter duplicaten op basis van formatted adres
            const newResults = data.results.filter((result: AddressSuggestion) => 
              !allResults.some(existing => existing.formatted === result.formatted)
            );
            allResults = [...allResults, ...newResults];
            
            // Stop als we genoeg resultaten hebben
            if (allResults.length >= 5) break;
          }
        }
      }

      // Extra zoekopdracht zonder huisnummer als we weinig resultaten hebben
      if (allResults.length < 3) {
        const words = query.split(' ');
        if (words.length > 1) {
          const streetOnly = words.slice(0, -1).join(' '); // Laatste woord (mogelijk huisnummer) weglaten
          console.log('Searching street only:', streetOnly);
          
          const response = await fetch(
            `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(streetOnly)}&key=${ENV.OPENCAGE_API_KEY}&countrycode=nl&limit=5&no_annotations=1&language=nl`
          );
          
          if (response.ok) {
            const data = await response.json();
            if (data.results) {
              const newResults = data.results.filter((result: AddressSuggestion) => 
                !allResults.some(existing => existing.formatted === result.formatted)
              );
              allResults = [...allResults, ...newResults];
            }
          }
        }
      }

      console.log('Total unique results:', allResults.length);
      setSuggestions(allResults.slice(0, 8)); // Maximaal 8 resultaten tonen
      
    } catch (error) {
      console.error('Error searching addresses:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      if (value) {
        searchAddresses(value);
      } else {
        setSuggestions([]);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [value]);

  const handleSuggestionClick = (suggestion: AddressSuggestion) => {
    const components = suggestion.components;
    const street = components.road || '';
    const houseNumber = components.house_number || '';
    const postalCode = components.postcode || '';
    const city = components.city || components.town || components.village || components.municipality || '';

    console.log('Selected address components:', {
      street,
      houseNumber,
      postalCode,
      city,
      coordinates: [suggestion.geometry.lng, suggestion.geometry.lat]
    });

    onChange(suggestion.formatted);
    onAddressSelect({
      street,
      houseNumber,
      postalCode,
      city,
      coordinates: [suggestion.geometry.lng, suggestion.geometry.lat]
    });
    
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setShowSuggestions(true);
  };

  const handleInputFocus = () => {
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleInputBlur = () => {
    // Delay hiding to allow clicking on suggestions
    setTimeout(() => setShowSuggestions(false), 150);
  };

  return (
    <div className="relative">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          ref={inputRef}
          id={id}
          value={value}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          placeholder={placeholder}
          className="pr-8"
        />
        {isLoading && (
          <Loader2 className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
        )}
      </div>
      
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center space-x-2 border-b border-gray-100 last:border-b-0"
              onClick={() => handleSuggestionClick(suggestion)}
            >
              <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="text-sm">{suggestion.formatted}</span>
            </button>
          ))}
        </div>
      )}
      
      {showSuggestions && !isLoading && suggestions.length === 0 && value.length >= 3 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg p-3">
          <div className="text-sm text-gray-500 flex items-center space-x-2">
            <MapPin className="w-4 h-4" />
            <span>Geen adressen gevonden voor "{value}"</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddressAutocomplete;
