import { DOCUMENT, NgIf } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AfterViewInit, Component, ElementRef, Inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { catchError, finalize } from 'rxjs/operators';
import { of } from 'rxjs';
import { environment } from '../environments/environment';
import { GoogleMapsService } from './core/google-maps.service';
import { applySeo } from './seo/apply-seo';
import { LOG_CONTEXT, LoggerService } from './core/logger.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ReactiveFormsModule, NgIf],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  providers: [{ provide: LOG_CONTEXT, useValue: 'AppComponent' }]
})
export class AppComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('placeAutocompleteContainer') placeAutocompleteContainerRef!: ElementRef<HTMLElement>;
  phone = environment.phone;
  locationLoading = false;
  /** Disables submit while POST is in flight */
  formSubmitting = false;
  /** User-visible result of the last submit attempt */
  formFeedback: { kind: 'success' | 'error'; text: string } | null = null;
  form = new FormGroup({
    name: new FormControl('', Validators.required),
    phone: new FormControl('', Validators.required),
    message: new FormControl(''),
    address: new FormControl('', Validators.required)
  });

  private removeAutocomplete: (() => void) | null = null;
  private observer: IntersectionObserver | null = null;

  constructor(
    private googleMaps: GoogleMapsService,
    private logger: LoggerService,
    private http: HttpClient,
    @Inject(DOCUMENT) private document: Document,
    private meta: Meta,
    private title: Title
  ) {}

  ngOnInit(): void {
    applySeo(this.meta, this.title, this.document, environment.siteUrl, environment.phone);
  }

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
    this.formFeedback = null;
    if (!this.form.valid) {
      this.logger.debug('Form submit attempted but invalid', {
        errors: this.form.errors,
        controls: {
          name: this.form.get('name')?.errors,
          phone: this.form.get('phone')?.errors,
          address: this.form.get('address')?.errors
        }
      });
      return;
    }

    const payload = {
      name: this.form.value.name as string,
      phone: this.form.value.phone as string,
      message: (this.form.value.message as string) || '',
      address: this.form.value.address as string
    };

    this.logger.info('Form submitted', {
      name: payload.name,
      phone: payload.phone,
      hasMessage: !!payload.message,
      address: payload.address
    });

    const url = environment.contactApiUrl?.trim() ?? '';

    if (!environment.production && !url) {
      this.formFeedback = {
        kind: 'success',
        text: 'Dev mode: submissions are not sent. Set contactApiUrl in environment.development.ts to test the API.'
      };
      return;
    }

    if (!url || url.includes('PLACEHOLDER')) {
      this.formFeedback = {
        kind: 'error',
        text: 'The form is not connected yet. Please call or text us — we will fix this shortly.'
      };
      return;
    }

    this.formSubmitting = true;
    this.http
      .post<{ ok: boolean }>(url, payload)
      .pipe(
        finalize(() => {
          this.formSubmitting = false;
        }),
        catchError(() => {
          this.formFeedback = {
            kind: 'error',
            text: 'Could not send your request. Please call or text us and we will help you right away.'
          };
          return of(null);
        })
      )
      .subscribe((res) => {
        if (res?.ok) {
          this.formFeedback = {
            kind: 'success',
            text: 'Thanks — we received your request and will be in touch shortly.'
          };
          this.form.reset();
        } else if (res !== null) {
          this.formFeedback = {
            kind: 'error',
            text: 'Could not send your request. Please try again or call us.'
          };
        }
      });
  }
}
