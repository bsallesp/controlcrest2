import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

declare global {
  interface Window {
    initGoogleMaps?: () => void;
  }
}

@Injectable({
  providedIn: 'root'
})
export class GoogleMapsService {
  private loadPromise: Promise<void> | null = null;
  private readonly apiKey = environment.googleApiKey;
  private readonly hasValidKey: boolean;

  constructor() {
    this.hasValidKey = !!this.apiKey && this.apiKey !== 'YOUR_GOOGLE_PLACES_API_KEY';
  }

  get isAvailable(): boolean {
    return this.hasValidKey;
  }

  loadScript(): Promise<void> {
    if (!this.hasValidKey) {
      return Promise.reject(new Error('Google API key not configured'));
    }
    if (this.loadPromise) {
      return this.loadPromise;
    }
    this.loadPromise = new Promise((resolve, reject) => {
      window.initGoogleMaps = () => resolve();
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(this.apiKey)}&loading=async&libraries=places&callback=initGoogleMaps`;
      script.async = true;
      script.defer = true;
      script.onerror = () => reject(new Error('Failed to load Google Maps'));
      document.head.appendChild(script);
    });
    return this.loadPromise;
  }

  async createPlaceAutocompleteElement(
    container: HTMLElement,
    onPlaceSelect: (address: string) => void
  ): Promise<() => void> {
    await google.maps.importLibrary('places');
    const locationRestriction = { north: 27.0, south: 24.5, east: -80.0, west: -82.0 };
    const placeAutocomplete = new google.maps.places.PlaceAutocompleteElement({
      locationRestriction
    });
    placeAutocomplete.id = 'place-autocomplete-input';
    container.appendChild(placeAutocomplete);
    const handler = async (ev: { placePrediction?: { toPlace: () => Promise<google.maps.places.Place> } }) => {
      const placePrediction = ev.placePrediction;
      if (!placePrediction) return;
      const place = await placePrediction.toPlace();
      await place.fetchFields({ fields: ['formattedAddress'] });
      if (place.formattedAddress) {
        onPlaceSelect(place.formattedAddress);
      }
    };
    placeAutocomplete.addEventListener('gmp-select', handler as EventListener);
    return () => {
      placeAutocomplete.removeEventListener('gmp-select', handler as EventListener);
      placeAutocomplete.remove();
    };
  }

  reverseGeocode(lat: number, lng: number): Promise<string | null> {
    if (window.google?.maps?.Geocoder) {
      return new Promise((resolve) => {
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ location: { lat, lng } }, (results: google.maps.GeocoderResult[] | null, status: google.maps.GeocoderStatus) => {
          if (status === 'OK' && results?.[0]) {
            resolve(results[0].formatted_address);
          } else {
            this.reverseGeocodeNominatim(lat, lng).then(resolve);
          }
        });
      });
    }
    return this.reverseGeocodeNominatim(lat, lng);
  }

  reverseGeocodeNominatim(lat: number, lng: number): Promise<string | null> {
    return fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { Accept: 'application/json', 'User-Agent': 'ControlCrest-LandingPage' } }
    )
      .then((r) => r.json())
      .then((data) => (data?.display_name ? data.display_name : null))
      .catch(() => null);
  }
}
