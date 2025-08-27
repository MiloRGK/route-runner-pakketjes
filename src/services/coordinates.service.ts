// Unified Coordinates Service
// Handles all coordinate transformations and Dutch postal code mappings

export type Coordinates = [number, number]; // [longitude, latitude]
export type LatLng = { lat: number; lng: number };

/**
 * Comprehensive Dutch postal code to coordinates mapping
 * Returns [longitude, latitude] format for Mapbox compatibility
 */
export const getPostalCodeCoordinates = (postalCode: string): Coordinates => {
  const code = parseInt(postalCode.substring(0, 4));
  
  // Accurate mapping based on actual Dutch postal code areas
  // 1000-1999: Noord-Holland region
  if (code >= 1000 && code <= 1099) return [4.9041, 52.3676]; // Amsterdam Centrum
  if (code >= 1100 && code <= 1199) return [4.8952, 52.3702]; // Amsterdam Noord
  if (code >= 1200 && code <= 1299) return [4.8600, 52.3400]; // Hilversum
  if (code >= 1300 && code <= 1399) return [5.2213, 52.1326]; // Almere
  if (code >= 1400 && code <= 1499) return [5.1600, 52.2200]; // Bussum
  if (code >= 1500 && code <= 1599) return [4.8180, 52.4380]; // Zaandam
  if (code >= 1600 && code <= 1699) return [4.7700, 52.5000]; // Wormer/Krommenie
  if (code >= 1700 && code <= 1799) return [4.8500, 52.6700]; // Heerhugowaard
  if (code >= 1800 && code <= 1899) return [4.7500, 52.6300]; // Alkmaar
  if (code >= 1900 && code <= 1999) return [4.6180, 52.4584]; // Castricum/Velserbroek - FIXED!
  
  // 2000-2999: Zuid-Holland region
  if (code >= 2000 && code <= 2099) return [4.3571, 52.1326]; // Haarlem
  if (code >= 2100 && code <= 2199) return [4.3200, 52.1800]; // Heemstede
  if (code >= 2200 && code <= 2299) return [4.5041, 52.1676]; // Noordwijk
  if (code >= 2300 && code <= 2399) return [4.4777, 52.1601]; // Leiden
  if (code >= 2400 && code <= 2499) return [4.6500, 52.1300]; // Alphen aan den Rijn
  if (code >= 2500 && code <= 2599) return [4.3013, 52.0705]; // Den Haag
  if (code >= 2600 && code <= 2699) return [4.3600, 52.0100]; // Delft
  if (code >= 2700 && code <= 2799) return [4.4900, 52.0600]; // Zoetermeer
  if (code >= 2800 && code <= 2899) return [4.7100, 52.0200]; // Gouda
  if (code >= 2900 && code <= 2999) return [4.5400, 52.0400]; // Capelle aan den IJssel
  
  // 3000-3999: Zuid-Holland Zuid & Utrecht
  if (code >= 3000 && code <= 3199) return [4.4777, 51.9225]; // Rotterdam
  if (code >= 3200 && code <= 3299) return [4.3300, 51.8500]; // Spijkenisse
  if (code >= 3300 && code <= 3399) return [4.6700, 51.8100]; // Dordrecht
  if (code >= 3400 && code <= 3499) return [5.0400, 52.0200]; // IJsselstein
  if (code >= 3500 && code <= 3599) return [5.1214, 52.0907]; // Utrecht
  if (code >= 3600 && code <= 3699) return [5.1300, 52.1400]; // Maarssen
  if (code >= 3700 && code <= 3799) return [5.2300, 52.0900]; // Zeist
  if (code >= 3800 && code <= 3899) return [5.3878, 52.1561]; // Amersfoort
  if (code >= 3900 && code <= 3999) return [5.2700, 51.9900]; // Veenendaal
  
  // 4000-4999: Zeeland & West-Brabant
  if (code >= 4000 && code <= 4099) return [5.4300, 51.8900]; // Tiel
  if (code >= 4100 && code <= 4199) return [5.1800, 51.8300]; // Culemborg
  if (code >= 4200 && code <= 4299) return [4.9700, 51.8300]; // Gorinchem
  if (code >= 4300 && code <= 4399) return [3.9200, 51.6500]; // Zierikzee
  if (code >= 4400 && code <= 4499) return [3.9300, 51.5000]; // Yerseke
  if (code >= 4500 && code <= 4599) return [3.6100, 51.3700]; // Oostburg
  if (code >= 4600 && code <= 4699) return [4.2900, 51.4900]; // Bergen op Zoom
  if (code >= 4700 && code <= 4799) return [4.4500, 51.5300]; // Roosendaal
  if (code >= 4800 && code <= 4899) return [4.7760, 51.5719]; // Breda
  if (code >= 4900 && code <= 4999) return [4.7000, 51.6700]; // Oosterhout
  
  // 5000-5999: Noord-Brabant
  if (code >= 5000 && code <= 5099) return [5.0919, 51.5555]; // Tilburg
  if (code >= 5100 && code <= 5199) return [5.0600, 51.4500]; // Dongen
  if (code >= 5200 && code <= 5299) return [5.3037, 51.6878]; // 's-Hertogenbosch
  if (code >= 5300 && code <= 5399) return [5.2400, 51.8100]; // Zaltbommel
  if (code >= 5400 && code <= 5499) return [5.6200, 51.6600]; // Uden
  if (code >= 5500 && code <= 5599) return [5.4000, 51.4200]; // Veldhoven
  if (code >= 5600 && code <= 5699) return [5.4697, 51.4416]; // Eindhoven
  if (code >= 5700 && code <= 5799) return [5.6600, 51.4800]; // Helmond
  if (code >= 5800 && code <= 5899) return [5.9700, 51.5300]; // Venray
  if (code >= 5900 && code <= 5999) return [6.1600, 51.3700]; // Venlo
  
  // 6000-6999: Limburg & Gelderland
  if (code >= 6000 && code <= 6099) return [5.7100, 51.2500]; // Weert
  if (code >= 6100 && code <= 6199) return [5.8000, 50.9500]; // Echt
  if (code >= 6200 && code <= 6299) return [5.6881, 50.8429]; // Maastricht
  if (code >= 6300 && code <= 6399) return [5.8300, 50.8700]; // Valkenburg
  if (code >= 6400 && code <= 6499) return [5.9800, 50.8900]; // Heerlen
  if (code >= 6500 && code <= 6599) return [5.8669, 51.8426]; // Nijmegen
  if (code >= 6600 && code <= 6699) return [5.7300, 51.8000]; // Wijchen
  if (code >= 6700 && code <= 6799) return [5.6681, 51.9697]; // Wageningen
  if (code >= 6800 && code <= 6899) return [5.8987, 51.9851]; // Arnhem
  if (code >= 6900 && code <= 6999) return [6.0700, 51.9100]; // Zevenaar
  
  // 7000-7999: Gelderland & Overijssel
  if (code >= 7000 && code <= 7099) return [6.2969, 51.965]; // Doetinchem
  if (code >= 7100 && code <= 7199) return [6.1400, 52.1000]; // Winterswijk
  if (code >= 7200 && code <= 7299) return [6.2003, 52.1401]; // Zutphen
  if (code >= 7300 && code <= 7399) return [5.9694, 52.2112]; // Apeldoorn
  if (code >= 7400 && code <= 7499) return [6.1639, 52.255]; // Deventer
  if (code >= 7500 && code <= 7599) return [6.8939, 52.2215]; // Enschede
  if (code >= 7600 && code <= 7699) return [6.6611, 52.3508]; // Almelo
  if (code >= 7700 && code <= 7799) return [6.4500, 52.6000]; // Dedemsvaart
  if (code >= 7800 && code <= 7899) return [6.9069, 52.7797]; // Emmen
  if (code >= 7900 && code <= 7999) return [6.5900, 52.5200]; // Hoogeveen
  
  // 8000-8999: Overijssel & Flevoland & Friesland
  if (code >= 8000 && code <= 8199) return [6.0919, 52.5125]; // Zwolle
  if (code >= 8200 && code <= 8299) return [5.4714, 52.5181]; // Lelystad
  if (code >= 8300 && code <= 8399) return [5.7500, 52.7100]; // Emmeloord
  if (code >= 8400 && code <= 8499) return [6.0700, 52.9900]; // Gorredijk
  if (code >= 8500 && code <= 8599) return [5.9661, 52.9667]; // Joure
  if (code >= 8600 && code <= 8699) return [5.6581, 53.0311]; // Sneek
  if (code >= 8700 && code <= 8799) return [5.5189, 53.0894]; // Bolsward
  if (code >= 8800 && code <= 8899) return [5.5422, 53.1858]; // Franeker
  if (code >= 8900 && code <= 8999) return [5.7950, 53.2012]; // Leeuwarden
  
  // 9000-9999: Groningen & Drenthe
  if (code >= 9000 && code <= 9099) return [6.5665, 53.2194]; // Groningen
  if (code >= 9100 && code <= 9199) return [6.5000, 53.1100]; // Dokkum
  if (code >= 9200 && code <= 9299) return [6.0989, 52.9497]; // Drachten
  if (code >= 9300 && code <= 9399) return [6.3667, 53.1333]; // Roden
  if (code >= 9400 && code <= 9499) return [6.5611, 52.9956]; // Assen
  if (code >= 9500 && code <= 9599) return [6.9500, 52.9900]; // Stadskanaal
  if (code >= 9600 && code <= 9699) return [6.7500, 53.1600]; // Hoogezand
  if (code >= 9700 && code <= 9799) return [6.5900, 53.2400]; // Groningen Noord
  if (code >= 9800 && code <= 9899) return [6.3500, 53.4000]; // Zuidhorn
  if (code >= 9900 && code <= 9999) return [6.8500, 53.3200]; // Appingedam
  
  // Default fallback - center of Netherlands
  return [5.2913, 52.1326]; // Amersfoort area
};

/**
 * Convert latitude/longitude object to [longitude, latitude] array
 */
export const latLngToCoordinates = (latLng: LatLng): Coordinates => {
  return [latLng.lng, latLng.lat];
};

/**
 * Convert [longitude, latitude] array to latitude/longitude object
 */
export const coordinatesToLatLng = (coords: Coordinates): LatLng => {
  return { lng: coords[0], lat: coords[1] };
};

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param coord1 First coordinate [longitude, latitude]
 * @param coord2 Second coordinate [longitude, latitude]
 * @returns Distance in kilometers
 */
export const calculateDistance = (coord1: Coordinates, coord2: Coordinates): number => {
  const R = 6371; // Earth's radius in km
  const [lng1, lat1] = coord1;
  const [lng2, lat2] = coord2;
  
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lng2 - lng1) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Check if coordinates are within Netherlands bounds
 */
export const isWithinNetherlands = (coords: Coordinates): boolean => {
  const [lng, lat] = coords;
  return lng >= 3.3 && lng <= 7.3 && lat >= 50.7 && lat <= 53.6;
};

/**
 * Get the center point of multiple coordinates
 */
export const getCenterPoint = (coordinates: Coordinates[]): Coordinates => {
  if (coordinates.length === 0) return [5.2913, 52.1326]; // Default center
  
  const sumLng = coordinates.reduce((sum, coord) => sum + coord[0], 0);
  const sumLat = coordinates.reduce((sum, coord) => sum + coord[1], 0);
  
  return [sumLng / coordinates.length, sumLat / coordinates.length];
};

/**
 * Format coordinates for display
 */
export const formatCoordinates = (coords: Coordinates, precision: number = 4): string => {
  const [lng, lat] = coords;
  return `${lat.toFixed(precision)}, ${lng.toFixed(precision)}`;
}; 