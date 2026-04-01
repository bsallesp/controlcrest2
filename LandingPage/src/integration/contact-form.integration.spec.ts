import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Meta, Title } from '@angular/platform-browser';
import { AppComponent } from '../app/app.component';
import { GoogleMapsService } from '../app/core/google-maps.service';
import { environment } from '../environments/environment';

/**
 * HTTP real para `environment.contactApiUrl` (substituído por environment.development via angular.json).
 * Só em `npm run test:integration` — pasta `src/integration/` está fora do tsconfig.spec padrão.
 */
describe('AppComponent — envio do formulário (integração, HTTP real)', () => {
  let fixture: ComponentFixture<AppComponent>;
  let component: AppComponent;

  const googleMapsStub: Pick<
    GoogleMapsService,
    'isAvailable' | 'loadScript' | 'createPlaceAutocompleteElement' | 'reverseGeocode' | 'setPlaceAutocompleteDisplayValue'
  > = {
    isAvailable: false,
    loadScript: () => Promise.reject(new Error('stub')),
    createPlaceAutocompleteElement: async () => () => {},
    reverseGeocode: () => Promise.resolve(null),
    setPlaceAutocompleteDisplayValue: () => false
  };

  beforeEach(async () => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 45000;

    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideHttpClient(),
        Meta,
        Title,
        { provide: GoogleMapsService, useValue: googleMapsStub }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('envia POST para a API de contato e exibe feedback de sucesso', async () => {
    component.form.patchValue({
      name: 'Integration Test',
      phone: '(555) 987-6543',
      address: '100 Integration Ln, Fort Lauderdale, FL 33301',
      message: 'Teste automatizado de integração — pode ignorar.'
    });
    expect(component.form.valid).toBe(true);

    component.onSubmit();
    expect(component.formSubmitting).toBe(true);
    fixture.detectChanges();

    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.formSubmitting).toBe(false);
    expect(component.formFeedback?.kind).withContext(
      `API: ${environment.contactApiUrl} — feedback: ${component.formFeedback?.text ?? '(nenhum)'}`
    ).toBe('success');
    expect(component.formFeedback?.text).toContain('Thanks');
  });
});
