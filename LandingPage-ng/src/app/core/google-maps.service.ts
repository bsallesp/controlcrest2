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
    if (window.google?.maps?.places) {
      return Promise.resolve();
    }
    if (this.loadPromise) {
      return this.loadPromise;
    }
    this.loadPromise = new Promise((resolve, reject) => {
      window.initGoogleMaps = () => resolve();
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(this.apiKey)}&libraries=places&callback=initGoogleMaps`;
      script.async = true;
      script.defer = true;
      script.onerror = () => reject(new Error('Failed to load Google Maps'));
      document.head.appendChild(script);
    });
    return this.loadPromise;
  }

  initAutocomplete(input: HTMLInputElement, onPlaceSelect: (address: string) => void): () => void {
    if (!window.google?.maps?.places) return () => {};
    const bounds = new google.maps.LatLngBounds(
      new google.maps.LatLng(24.5, -82.0),
      new google.maps.LatLng(27.0, -80.0)
    );
    const autocomplete = new google.maps.places.Autocomplete(input, {
      types: ['address'],
      bounds,
      strictBounds: true,
      fields: ['formatted_address', 'address_components']
    });
    const listener = autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (place.formatted_address) {
        onPlaceSelect(place.formatted_address);
      }
    });
    return () => listener.remove();
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
