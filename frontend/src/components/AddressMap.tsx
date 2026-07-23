import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Search, MapPin, Navigation, Loader2 } from 'lucide-react';

interface AddressComponents {
  province: string;
  district: string;
  city: string;
  ward: string;
  street: string;
  postalCode: string;
  latitude: number;
  longitude: number;
  displayAddress: string;
}

interface AddressMapProps {
  onLocationSelect: (addressData: AddressComponents) => void;
  selectedCity?: string; // We can use this to center the map closer to the chosen city if location is denied
}

export const AddressMap: React.FC<AddressMapProps> = ({ onLocationSelect, selectedCity }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onLocationSelectRef = useRef(onLocationSelect);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const [mapError, setMapError] = useState('');

  // Keep callback ref updated
  useEffect(() => {
    onLocationSelectRef.current = onLocationSelect;
  }, [onLocationSelect]);

  // Center mapping coordinates for main cities in Nepal as search fallbacks
  const getCityCoordinates = (city: string): [number, number] => {
    switch (city.toLowerCase()) {
      case 'nepalgunj': return [28.0500, 81.6167];
      case 'kathmandu': return [27.7172, 85.3240];
      case 'lalitpur': return [27.6744, 85.3218];
      case 'bhaktapur': return [27.6710, 85.4298];
      case 'pokhara': return [28.2096, 83.9856];
      case 'biratnagar': return [26.4525, 87.2717];
      case 'butwal': return [27.7006, 83.4484];
      case 'dharan': return [26.8125, 87.2833];
      case 'chitwan': return [27.5291, 84.3542];
      default: return [28.3949, 84.1240]; // Center of Nepal
    }
  };

  // Reverse Geocoding function
  const reverseGeocode = async (lat: number, lon: number) => {
    setIsReverseGeocoding(true);
    setMapError('');
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&addressdetails=1`
      );
      if (!response.ok) throw new Error('Failed to fetch address details');
      
      const data = await response.json();
      const address = data.address || {};
      
      // Parse structured address components for Nepal
      const province = address.state || address.region || '';
      const district = address.county || address.district || '';
      const city = address.city || address.town || address.village || address.municipality || address.suburb || '';
      const ward = address.neighbourhood || address.suburb || address.quarter || '';
      const street = address.road || address.street || address.path || '';
      const postalCode = address.postcode || '';
      
      // Format a user-friendly display address
      const displayAddress = data.display_name || [street, ward, city, district, province].filter(Boolean).join(', ');

      onLocationSelectRef.current({
        province,
        district,
        city,
        ward,
        street,
        postalCode,
        latitude: lat,
        longitude: lon,
        displayAddress
      });
    } catch (err) {
      console.error('Error reverse geocoding:', err);
      setMapError('Failed to retrieve address details from OpenStreetMap. Please type manually.');
    } finally {
      setIsReverseGeocoding(false);
    }
  };

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Define standard custom icon using OSM leaflet assets directly
    const DefaultIcon = L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
    });
    L.Marker.prototype.options.icon = DefaultIcon;

    // Decide initial center (Nepal default, or city default if provided)
    const initialCenter: [number, number] = selectedCity ? getCityCoordinates(selectedCity) : [28.3949, 84.1240];
    const initialZoom = selectedCity ? 12 : 7;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false // We will render our zoom controls to style them nicely
    }).setView(initialCenter, initialZoom);
    mapRef.current = map;

    // Add zoom controls at custom position
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    // Initial marker
    const marker = L.marker(initialCenter, { draggable: true }).addTo(map);
    markerRef.current = marker;

    // Set map triggers
    map.on('click', (e) => {
      const { lat, lng } = e.latlng;
      marker.setLatLng([lat, lng]);
      reverseGeocode(lat, lng);
    });

    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      reverseGeocode(pos.lat, pos.lng);
    });

    // Auto-Geolocation trigger
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          if (mapRef.current && markerRef.current) {
            mapRef.current.setView([latitude, longitude], 15);
            markerRef.current.setLatLng([latitude, longitude]);
            reverseGeocode(latitude, longitude);
          }
        },
        (_err) => {
          console.warn('Geolocation access denied. Centering on default city coordinates.');
          // Pre-trigger reverse-geocode on default city center
          const latlng = getCityCoordinates(selectedCity || '');
          reverseGeocode(latlng[0], latlng[1]);
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    } else {
      // Browser geolocator unavailable
      const latlng = getCityCoordinates(selectedCity || '');
      reverseGeocode(latlng[0], latlng[1]);
    }

    return () => {
      map.off();
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  // Center on current user location manually
  const handleRecenterLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          if (mapRef.current && markerRef.current) {
            mapRef.current.setView([latitude, longitude], 15);
            markerRef.current.setLatLng([latitude, longitude]);
            reverseGeocode(latitude, longitude);
          }
        },
        () => {
          alert('Could not retrieve your location. Please check your browser permission settings.');
        }
      );
    }
  };

  // Handle Search Input
  const handleSearchSubmit = async (e?: React.FormEvent | React.KeyboardEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchResults([]);
    setMapError('');

    try {
      // Nominatim search API constrained to Nepal
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery
        )}&countrycodes=np&limit=5&addressdetails=1`
      );
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      setSearchResults(data);
      if (data.length === 0) {
        setMapError('No locations found matching your search in Nepal.');
      }
    } catch (err) {
      console.error('Search error:', err);
      setMapError('Search service temporarily unavailable.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearchSubmit(e);
    }
  };

  // Select Search result
  const handleSelectSearchResult = (result: any) => {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);

    if (mapRef.current && markerRef.current) {
      mapRef.current.setView([lat, lon], 15);
      markerRef.current.setLatLng([lat, lon]);
      
      // Clear suggestions
      setSearchResults([]);
      setSearchQuery(result.display_name);

      // Parse fields directly from response or trigger geocoding to retrieve structured details
      reverseGeocode(lat, lon);
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Search Input Box (Div wrapper to prevent form nesting reloads) */}
      <div className="relative z-20 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search city, area, landmark, or street in Nepal..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:border-indigo-400 focus:bg-white transition-all"
          />
        </div>
        <button
          type="button"
          onClick={() => handleSearchSubmit()}
          disabled={isSearching}
          className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Search'}
        </button>

        {/* Floating current location button */}
        <button
          type="button"
          onClick={handleRecenterLocation}
          title="Recenter Geolocation"
          className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-indigo-650 hover:border-indigo-200 shadow-sm transition-all cursor-pointer flex items-center justify-center"
        >
          <Navigation className="w-4 h-4" />
        </button>
      </div>

      {/* Suggestion list */}
      {searchResults.length > 0 && (
        <div className="relative z-35 -mt-2">
          <div className="absolute top-0 left-0 right-0 max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg divide-y divide-slate-100 z-50">
            {searchResults.map((item) => (
              <button
                key={item.place_id}
                type="button"
                onClick={() => handleSelectSearchResult(item)}
                className="w-full text-left px-4 py-3 text-xs sm:text-sm text-slate-650 hover:bg-slate-50/80 transition-colors flex items-start gap-2.5"
              >
                <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <span>{item.display_name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Map display (Shrunk to h-48 sm:h-52 for optimal screen sizing) */}
      <div className="relative border border-slate-150 rounded-2xl overflow-hidden shadow-sm">
        <div ref={mapContainerRef} className="h-48 sm:h-52 w-full z-10" />

        {/* Loading Overlay */}
        {(isReverseGeocoding || isSearching) && (
          <div className="absolute inset-0 bg-slate-50/40 backdrop-blur-xs flex items-center justify-center z-20">
            <div className="bg-white px-4 py-2.5 rounded-full border border-slate-100 shadow-md flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-650" />
              <span className="text-xs font-extrabold text-slate-600">Retrieving coordinates...</span>
            </div>
          </div>
        )}
      </div>

      {mapError && (
        <p className="text-[11px] sm:text-xs text-rose-500 font-semibold select-none">
          ⚠️ {mapError}
        </p>
      )}
    </div>
  );
};

export default AddressMap;
