import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { LoggerService } from './logger.service';

declare global {
  interface Window {
    initGoogleMaps?: () => void;
  }
}

const CTX = 'GoogleMapsService';

@Injectable({
  providedIn: 'root'
})
export class GoogleMapsService {
  private loadPromise: Promise<void> | null = null;
  private readonly apiKey = environment.googleApiKey;
  private readonly hasValidKey: boolean;

  constructor(private logger: LoggerService) {
    this.hasValidKey = !!this.apiKey && this.apiKey !== 'YOUR_GOOGLE_PLACES_API_KEY';
    this.logger.debug(CTX, 'Service init', { hasValidKey: this.hasValidKey, apiKeySet: !!this.apiKey });
  }

  get isAvailable(): boolean {
    return this.hasValidKey;
  }

  loadScript(): Promise<void> {
    if (!this.hasValidKey) {
      this.logger.warn(CTX, 'Script load skipped: Google API key not configured');
      return Promise.reject(new Error('Google API key not configured'));
    }
    if (this.loadPromise) {
      this.logger.debug(CTX, 'Script already loading or loaded, returning existing promise');
      return this.loadPromise;
    }
    this.logger.info(CTX, 'Loading Google Maps script', { libraries: ['places'] });
    this.loadPromise = new Promise((resolve, reject) => {
      window.initGoogleMaps = () => {
        this.logger.info(CTX, 'Google Maps script loaded');
        resolve();
      };
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(this.apiKey)}&loading=async&libraries=places&callback=initGoogleMaps`;
      script.async = true;
      script.defer = true;
      script.onerror = () => {
        const err = new Error('Failed to load Google Maps');
        this.logger.error(CTX, 'Google Maps script failed', err);
        reject(err);
      };
      document.head.appendChild(script);
    });
    return this.loadPromise;
  }

  async createPlaceAutocompleteElement(
    container: HTMLElement,
    onPlaceSelect: (address: string) => void
  ): Promise<() => void> {
    this.logger.debug(CTX, 'Creating Place Autocomplete element');
    await google.maps.importLibrary('places');
    const locationRestriction = { north: 27.0, south: 24.5, east: -80.0, west: -82.0 };
    const placeAutocomplete = new google.maps.places.PlaceAutocompleteElement({
      locationRestriction
    });
    placeAutocomplete.id = 'place-autocomplete-input';
    container.appendChild(placeAutocomplete);
    this.logger.info(CTX, 'Place Autocomplete attached to container');
    const handler = async (ev: { placePrediction?: { toPlace: () => Promise<google.maps.places.Place> } }) => {
      const placePrediction = ev.placePrediction;
      if (!placePrediction) return;
      this.logger.debug(CTX, 'Place prediction selected, fetching place details');
      const place = await placePrediction.toPlace();
      await place.fetchFields({ fields: ['formattedAddress'] });
      if (place.formattedAddress) {
        this.logger.info(CTX, 'Place selected', { formattedAddress: place.formattedAddress });
        onPlaceSelect(place.formattedAddress);
      }
    };
    placeAutocomplete.addEventListener('gmp-select', handler as EventListener);
    return () => {
      placeAutocomplete.removeEventListener('gmp-select', handler as EventListener);
      placeAutocomplete.remove();
      this.logger.debug(CTX, 'Place Autocomplete removed');
    };
  }

  /**
   * Updates the Place Autocomplete widget's visible input with an address (e.g. from geolocation).
   * The widget does not bind to the form model, so we must set its internal input directly.
   */
  setPlaceAutocompleteDisplayValue(container: HTMLElement, address: string): boolean {
    const widget = container.querySelector('gmp-place-autocomplete') as (HTMLElement & { value?: string }) | null;
    if (!widget) {
      this.logger.warn(CTX, 'Place Autocomplete widget not found in container');
      return false;
    }

    try {
      (widget as unknown as { value: string }).value = address;
    } catch {
      widget.setAttribute('value', address);
    }

    widget.dispatchEvent(new Event('input', { bubbles: true }));
    this.logger.debug(CTX, 'Set Place Autocomplete value via widget API', { address });
    return true;
  }

  reverseGeocode(lat: number, lng: number): Promise<string | null> {
    this.logger.debug(CTX, 'Reverse geocode started', { lat, lng });
    if (window.google?.maps?.Geocoder) {
      return new Promise((resolve) => {
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ location: { lat, lng } }, (results: google.maps.GeocoderResult[] | null, status: google.maps.GeocoderStatus) => {
          if (status === 'OK' && results?.[0]) {
            this.logger.info(CTX, 'Reverse geocode OK (Google)', { address: results[0].formatted_address });
            resolve(results[0].formatted_address);
          } else {
            this.logger.debug(CTX, 'Google Geocoder fallback to Nominatim', { status });
            this.reverseGeocodeNominatim(lat, lng).then(resolve);
          }
        });
      });
    }
    this.logger.debug(CTX, 'Google Geocoder not available, using Nominatim');
    return this.reverseGeocodeNominatim(lat, lng);
  }

  reverseGeocodeNominatim(lat: number, lng: number): Promise<string | null> {
    this.logger.debug(CTX, 'Nominatim reverse geocode', { lat, lng });
    return fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { Accept: 'application/json', 'User-Agent': 'ControlCrest-LandingPage' } }
    )
      .then((r) => r.json())
      .then((data) => {
        const address = data?.display_name ? data.display_name : null;
        if (address) {
          this.logger.info(CTX, 'Reverse geocode OK (Nominatim)', { address });
        } else {
          this.logger.warn(CTX, 'Nominatim returned no display_name', { data });
        }
        return address;
      })
      .catch((err) => {
        this.logger.error(CTX, 'Nominatim reverse geocode failed', err);
        return null;
      });
  }
}
