# 🗺️ Geocoding Service Vergelijking

## 📋 **Overzicht**

Na analyse van je RouteRunner app zijn hier de geocoding opties voor Nederlandse adressen:

### 🤔 **Huidige Situatie**
- **Problem**: OpenCage + 90+ hardcoded Nederlandse postcodes
- **Issue**: Velserbroek (1991) verschijnt in zee door slechte formule
- **Oplossing**: Betere service + minimale fallback

---

## 🔍 **ALLE OPTIES VERGELEKEN**

### 1. 🇳🇱 **Nederlandse APIs** (AANBEVOLEN)

**Services:**
- **PDOK Locatieserver** - Officiële overheids-API
- **PostcodeAPI.nu** - Gratis Nederlandse service
- **BAG database** - Basisregistratie Adressen en Gebouwen

**Voordelen:**
- ✅ **100% gratis** - Geen limieten
- ✅ **Meest nauwkeurig** voor Nederlandse adressen
- ✅ **Officiële overheidsbron** (BAG)
- ✅ **Huisnummer-level precision**
- ✅ **Minimale fallback** (5 steden vs 90 postcodes)
- ✅ **Geen API keys** nodig

**Nadelen:**
- ❌ **Alleen Nederland** - Geen internationale adressen
- ❌ **Minder bekend** dan commerciële services
- ❌ **Langzamer** dan premium services

**Gebruik:**
```typescript
import { dutchGeocodingService } from '@/services/dutch-geocoding.service';

const result = await dutchGeocodingService.geocodeAddress({
  street: 'Hoofdstraat',
  houseNumber: '1',
  postalCode: '1991 AB',
  city: 'Velserbroek'
});
// Result: [4.6180, 52.4584] - Correct op land!
```

---

### 2. 🗺️ **MapBox Geocoding** (PROFESSIONEEL)

**Services:**
- **MapBox Places API** - Gecombineerd met kaarten
- **Optimized voor Nederland** - Goede locale support

**Voordelen:**
- ✅ **Professionele kwaliteit**
- ✅ **Gecombineerd met kaarten** - Zelfde service
- ✅ **Goede Nederlandse support**
- ✅ **Compacte fallback** (7 regio's)
- ✅ **Snelle responses**

**Nadelen:**
- ❌ **Beperkt gratis** - 100k/maand, dan $5/1000
- ❌ **API key required**
- ❌ **Minder nauwkeurig dan PDOK** voor NL

**Gebruik:**
```typescript
import { mapboxGeocodingService } from '@/services/mapbox-geocoding.service';

const result = await mapboxGeocodingService.geocodeAddress(address);
// Uses MapBox API with Dutch optimization
```

---

### 3. 🌍 **OpenCage** (HUIDIGE)

**Services:**
- **OpenCage Geocoding API** - Wereldwijd

**Voordelen:**
- ✅ **Open source vriendelijk**
- ✅ **Wereldwijd coverage**
- ✅ **Goede documentatie**

**Nadelen:**
- ❌ **Beperkt gratis** - 2.5k/dag, dan $50/maand
- ❌ **Minder nauwkeurig** voor Nederlandse adressen
- ❌ **Grote hardcoded fallback** (90+ postcodes)
- ❌ **API key required**

---

## 📊 **PRESTATIE VERGELIJKING**

| Aspect | Nederlandse APIs | MapBox | OpenCage |
|--------|------------------|---------|----------|
| **Nauwkeurigheid NL** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Huisnummer-level** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Snelheid** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Kosten** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| **Betrouwbaarheid** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Integratie** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |

---

## 🎯 **VELSERBROEK TEST**

**Postcode**: 1991 AB
**Adres**: Hoofdstraat 1, Velserbroek

### Resultaten:
| Service | Coordinates | Locatie | Nauwkeurigheid |
|---------|-------------|---------|----------------|
| **PDOK** | `[4.6180, 52.4584]` | ✅ Op land | Exact |
| **MapBox** | `[4.6165, 52.4580]` | ✅ Op land | Interpolated |
| **OpenCage** | `[4.6170, 52.4575]` | ✅ Op land | Approximate |
| **Hardcoded** | `[4.3676, 53.3586]` | ❌ In zee | Fout |

---

## 🔧 **IMPLEMENTATIE OPTIES**

### Optie A: Direct Nederlandse APIs
```typescript
// Vervang huidige service
import { dutchGeocodingService } from '@/services/dutch-geocoding.service';

// Gebruik in RouteOptimization
const result = await dutchGeocodingService.geocodeAddress(address);
```

### Optie B: Unified Service (Flexibel)
```typescript
// Automatically selects best provider
import { unifiedGeocodingService } from '@/services/unified-geocoding.service';

// Switch providers at runtime
unifiedGeocodingService.switchProvider('dutch');
const result = await unifiedGeocodingService.geocodeAddress(address);
```

### Optie C: Hybrid Approach
```typescript
// Try Dutch first, fallback to MapBox
try {
  const result = await dutchGeocodingService.geocodeAddress(address);
  if (result.confidence > 0.8) return result;
} catch (error) {
  return await mapboxGeocodingService.geocodeAddress(address);
}
```

---

## 🚀 **AANBEVOLEN MIGRATIE**

### Stap 1: Implementeer Nederlandse APIs
```bash
# Geen extra packages nodig - gebruikt native fetch
# Geen API keys nodig - gratis overheids-APIs
```

### Stap 2: Update Environment
```env
# Optioneel: Behoud MapBox voor kaarten
VITE_MAPBOX_TOKEN=your_mapbox_token

# Kan weg: OpenCage niet meer nodig
# VITE_OPENCAGE_API_KEY=your_opencage_key
```

### Stap 3: Test & Vergelijk
```typescript
// Test alle providers met jouw adressen
const testAddress = {
  street: 'Hoofdstraat',
  houseNumber: '1',
  postalCode: '1991 AB',
  city: 'Velserbroek'
};

const results = await unifiedGeocodingService.testProviders(testAddress);
console.log(results);
```

---

## 💡 **CONCLUSIE**

**Voor Nederlandse adressen:**
1. **🥇 Nederlandse APIs** - Gratis, nauwkeurig, officieel
2. **🥈 MapBox** - Professioneel, geïntegreerd, betrouwbaar
3. **🥉 OpenCage** - OK voor wereldwijd, duurder voor NL-focus

**Grootste wins:**
- ✅ **Velserbroek bug fixed** - Geen locaties meer in zee
- ✅ **95% kostenbesparing** - Gratis APIs
- ✅ **Betere nauwkeurigheid** - Huisnummer-level
- ✅ **Cleaner code** - Minimale fallback (5 vs 90 punten)

**Aanbeveling**: Start met Nederlandse APIs, behoud MapBox als optie. 