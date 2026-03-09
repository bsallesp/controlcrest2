import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { environment } from '../environments/environment';
import { GoogleMapsService } from './core/google-maps.service';
import { LOG_CONTEXT, LoggerService } from './core/logger.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  providers: [{ provide: LOG_CONTEXT, useValue: 'AppComponent' }]
})
export class AppComponent implements AfterViewInit, OnDestroy {
  @ViewChild('placeAutocompleteContainer') placeAutocompleteContainerRef!: ElementRef<HTMLElement>;
  phone = environment.phone;
  locationLoading = false;
  form = new FormGroup({
    name: new FormControl('', Validators.required),
    phone: new FormControl('', Validators.required),
    contactPreference: new FormControl('', Validators.required),
    message: new FormControl(''),
    address: new FormControl('', Validators.required)
  });

  private removeAutocomplete: (() => void) | null = null;
  private observer: IntersectionObserver | null = null;

  constructor(
    private googleMaps: GoogleMapsService,
    private logger: LoggerService
  ) {}

  ngAfterViewInit(): void {
    this.logger.info('App initialized, setting up view');
    this.setupReveal();
    if (this.googleMaps.isAvailable) {
      this.logger.debug('Google Maps available, loading script and initializing autocomplete');
      this.googleMaps.loadScript().then(() => this.initPlaceAutocomplete()).catch((err) => {
        this.logger.error('Failed to load Google Maps or init autocomplete', err);
      });
    } else {
      this.logger.debug('Google Maps not available (no API key), skipping autocomplete');
    }
  }

  ngOnDestroy(): void {
    this.logger.debug('AppComponent destroying, cleaning autocomplete and observer');
    this.removeAutocomplete?.();
    this.observer?.disconnect();
  }

  private setupReveal(): void {
    if (typeof window === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.logger.debug('Reveal skipped (SSR or reduced motion)');
      return;
    }
    const els = document.querySelectorAll('.container.reveal');
    this.observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.target.classList.add('visible')),
      { rootMargin: '0px 0px -60px 0px', threshold: 0.1 }
    );
    els.forEach((el) => this.observer!.observe(el));
    this.logger.debug('Reveal observer attached', { count: els.length });
  }

  private async initPlaceAutocomplete(): Promise<void> {
    const container = this.placeAutocompleteContainerRef?.nativeElement;
    if (!container) {
      this.logger.warn('Place autocomplete container not found, skipping');
      return;
    }
    this.removeAutocomplete = await this.googleMaps.createPlaceAutocompleteElement(container, (addr) => {
      this.logger.info('Address selected from autocomplete', { address: addr });
      this.form.patchValue({ address: addr });
    });
    this.logger.debug('Place autocomplete initialized');
  }

  useLocation(): void {
    if (!navigator.geolocation) {
      this.logger.warn('Geolocation not supported');
      this.form.get('address')?.setErrors({ geolocation: 'not supported' });
      return;
    }
    this.logger.info('Requesting current position');
    this.locationLoading = true;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        this.logger.debug('Position obtained, reverse geocoding', { lat, lng });
        this.googleMaps.reverseGeocode(lat, lng).then((addr) => {
          this.locationLoading = false;
          if (addr) {
            this.logger.info('Address from geolocation', { address: addr });
            this.form.patchValue({ address: addr });
            const container = this.placeAutocompleteContainerRef?.nativeElement;
            if (container) {
              this.googleMaps.setPlaceAutocompleteDisplayValue(container, addr);
            }
          } else {
            this.logger.warn('Reverse geocode returned no address');
            this.form.get('address')?.setErrors({ geocode: 'Could not get address' });
          }
        });
      },
      (err) => {
        this.locationLoading = false;
        const msg = err.code === 1 ? 'Allow location in browser settings' : err.code === 3 ? 'Location timeout – try again' : 'Location unavailable (use HTTPS or allow location)';
        this.logger.warn('Geolocation error', { code: err.code, message: msg });
        this.form.get('address')?.setErrors({ geolocation: msg });
      },
      { timeout: 15000, maximumAge: 60000, enableHighAccuracy: true }
    );
  }

  formatUsPhone(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').slice(0, 10);

    let formatted = digits;
    if (digits.length > 6) {
      formatted = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    } else if (digits.length > 3) {
      formatted = `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    } else if (digits.length > 0) {
      formatted = `(${digits}`;
    }

    this.form.patchValue({ phone: formatted }, { emitEvent: false });
  }

  onSubmit(): void {
    if (this.form.valid) {
      this.logger.info('Form submitted', {
        name: this.form.value.name,
        phone: this.form.value.phone,
        contactPreference: this.form.value.contactPreference,
        hasMessage: !!this.form.value.message,
        address: this.form.value.address
      });
      // TODO: send to backend
    } else {
      this.logger.debug('Form submit attempted but invalid', {
        errors: this.form.errors,
        controls: {
          name: this.form.get('name')?.errors,
          phone: this.form.get('phone')?.errors,
          address: this.form.get('address')?.errors
        }
      });
    }
  }
}
