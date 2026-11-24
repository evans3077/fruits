import React, { useEffect, useRef, useState } from 'react';
import { APIProvider, useMapsLibrary } from '@vis.gl/react-google-maps';
import { MapPin, Search } from 'lucide-react';
import { KENYA_COUNTIES } from '../../lib/kenya';
import { dispatchGmpQuotaExceeded, isGmpQuotaError } from '../../lib/mapsQuota';

export interface ParsedKenyaPlace {
  county?: string;
  town?: string;
  estate?: string;
  landmark?: string;
  formattedAddress: string;
}

interface KenyaAddressAutocompleteProps {
  mapsApiKey: string;
  onSelectPlace: (parsed: ParsedKenyaPlace) => void;
}

function matchKenyaCounty(raw: string): string | undefined {
  const normalized = raw.replace(/\s+County$/i, '').trim().toLowerCase();
  if (!normalized) return undefined;
  return KENYA_COUNTIES.find(
    (c) =>
      c.toLowerCase() === normalized ||
      normalized.includes(c.toLowerCase()) ||
      c.toLowerCase().includes(normalized)
  );
}

interface PlaceAddressComponent {
  types?: string[];
  longText?: string | null;
  shortText?: string | null;
}

interface PlacesSuggestionItem {
  placePrediction?: {
    placeId?: string;
    text?: { text?: string };
    toPlace: () => {
      displayName?: string | null;
      formattedAddress?: string | null;
      addressComponents?: PlaceAddressComponent[];
      fetchFields: (opts: { fields: string[] }) => Promise<unknown>;
    };
  } | null;
}

const AutocompleteBox: React.FC<{
  onSelectPlace: (parsed: ParsedKenyaPlace) => void;
}> = ({ onSelectPlace }) => {
  const placesLib = useMapsLibrary('places');
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<PlacesSuggestionItem[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const tokenRef = useRef<unknown>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  useEffect(() => {
    if (!placesLib || query.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    let active = true;
    const timer = window.setTimeout(async () => {
      try {
        if (!tokenRef.current) {
          tokenRef.current = new placesLib.AutocompleteSessionToken();
        }
        const response = await placesLib.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: query.trim(),
          sessionToken: tokenRef.current as never,
          includedRegionCodes: ['ke'],
        });
        const results = (response?.suggestions || []) as PlacesSuggestionItem[];
        if (!active) return;
        setSuggestions(results);
        setOpen(results.length > 0);
      } catch (err) {
        if (isGmpQuotaError(err)) {
          dispatchGmpQuotaExceeded();
        }
        if (active) setSuggestions([]);
      }
    }, 220);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [placesLib, query]);

  const handleChoose = async (suggestion: PlacesSuggestionItem) => {
    const prediction = suggestion.placePrediction;
    if (!prediction || !placesLib) return;

    setBusy(true);
    try {
      const place = prediction.toPlace();
      await place.fetchFields({
        fields: ['displayName', 'formattedAddress', 'location', 'addressComponents'],
      });
      // Reset session token after place selection billing cycle
      tokenRef.current = new placesLib.AutocompleteSessionToken();

      const components = place.addressComponents || [];
      let county: string | undefined;
      let town = '';
      let estate = '';

      for (const comp of components) {
        const types = comp.types || [];
        const text = comp.longText || comp.shortText || '';
        if (!county && types.includes('administrative_area_level_1')) {
          county = matchKenyaCounty(text);
        }
        if (!town && (types.includes('locality') || types.includes('administrative_area_level_2'))) {
          town = text;
        }
        if (
          !estate &&
          (types.includes('sublocality_level_1') ||
            types.includes('sublocality') ||
            types.includes('neighborhood') ||
            types.includes('route'))
        ) {
          estate = text;
        }
      }

      const displayName = place.displayName || '';
      const formatted = place.formattedAddress || prediction.text?.text || displayName;

      if (!estate && displayName) {
        estate = displayName;
      }
      if (!county && formatted) {
        county = matchKenyaCounty(formatted);
      }
      if (!town && county) {
        town = county;
      }

      setQuery(formatted);
      setOpen(false);
      onSelectPlace({
        county,
        town,
        estate,
        landmark: displayName && displayName !== estate ? displayName : '',
        formattedAddress: formatted,
      });
    } catch (err) {
      if (isGmpQuotaError(err)) {
        dispatchGmpQuotaExceeded();
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div ref={wrapperRef} className="relative space-y-1">
      <label htmlFor="co-address-search" className="text-xs font-medium text-zinc-700">
        Search Kenyan Street, Estate or Building (Google Places)
      </label>
      <div className="relative">
        <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          id="co-address-search"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (suggestions.length > 0) setOpen(true);
          }}
          placeholder="Type e.g. Yaya Centre Kilimani, Westlands, Nyali..."
          disabled={busy}
          autoComplete="off"
          className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-zinc-300 text-sm bg-white focus:outline-none focus:border-zinc-950"
        />
      </div>

      {open && suggestions.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-30 left-0 right-0 mt-1 rounded-xl border border-zinc-200 bg-white shadow-xl max-h-60 overflow-y-auto divide-y divide-zinc-100"
        >
          {suggestions.map((s, idx) => {
            const label = s.placePrediction?.text?.text || '';
            if (!label) return null;
            return (
              <li key={s.placePrediction?.placeId || idx}>
                <button
                  type="button"
                  onClick={() => handleChoose(s)}
                  className="w-full px-3.5 py-2.5 text-left text-xs sm:text-sm text-zinc-800 hover:bg-zinc-50 flex items-start gap-2 cursor-pointer"
                >
                  <MapPin className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
                  <span>{label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export const KenyaAddressAutocomplete: React.FC<KenyaAddressAutocompleteProps> = ({
  mapsApiKey,
  onSelectPlace,
}) => {
  if (!mapsApiKey) return null;

  return (
    <APIProvider apiKey={mapsApiKey} language="en" region="KE">
      <AutocompleteBox onSelectPlace={onSelectPlace} />
    </APIProvider>
  );
};
