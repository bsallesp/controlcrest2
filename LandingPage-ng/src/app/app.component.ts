import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { environment } from '../environments/environment';
import { GoogleMapsService } from './core/google-maps.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements AfterViewInit, OnDestroy {
  @ViewChild('addressInput') addressInputRef!: ElementRef<HTMLInputElement>;
  phone = environment.phone;
  locationLoading = false;
  form = new FormGroup({
    name: new FormControl('', Validators.required),
    phone: new FormControl('', Validators.required),
    message: new FormControl(''),
    address: new FormControl('', Validators.required)
  });

  private removeAutocomplete: (() => void) | null = null;
  private observer: IntersectionObserver | null = null;

  constructor(private googleMaps: GoogleMapsService) {}

  ngAfterViewInit(): void {
    this.setupReveal();
    if (this.googleMaps.isAvailable) {
      this.googleMaps.loadScript().then(() => this.initAutocomplete()).catch(() => {});
    }
  }

  ngOnDestroy(): void {
    this.removeAutocomplete?.();
    this.observer?.disconnect();
  }

  private setupReveal(): void {
    if (typeof window === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const els = document.querySelectorAll('.container.reveal');
    this.observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.target.classList.add('visible')),
      { rootMargin: '0px 0px -60px 0px', threshold: 0.1 }
    );
    els.forEach((el) => this.observer!.observe(el));
  }

  private initAutocomplete(): void {
    const input = this.addressInputRef?.nativeElement;
    if (!input) return;
    this.removeAutocomplete = this.googleMaps.initAutocomplete(input, (addr) => {
      this.form.patchValue({ address: addr });
    });
  }

  useLocation(): void {
    if (!navigator.geolocation) {
      this.form.get('address')?.setErrors({ geolocation: 'not supported' });
      return;
    }
    this.locationLoading = true;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        this.googleMaps.reverseGeocode(lat, lng).then((addr) => {
          this.locationLoading = false;
          if (addr) {
            this.form.patchValue({ address: addr });
          } else {
            this.form.get('address')?.setErrors({ geocode: 'Could not get address' });
          }
        });
      },
      (err) => {
        this.locationLoading = false;
        const msg = err.code === 1 ? 'Allow location in browser settings' : err.code === 3 ? 'Location timeout – try again' : 'Location unavailable (use HTTPS or allow location)';
        this.form.get('address')?.setErrors({ geolocation: msg });
      },
      { timeout: 15000, maximumAge: 60000, enableHighAccuracy: true }
    );
  }

  onSubmit(): void {
    if (this.form.valid) {
      console.log('Submit', this.form.value);
      // TODO: send to backend
    }
  }
}
