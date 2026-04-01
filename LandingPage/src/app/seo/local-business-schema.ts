import { SEO } from './seo.constants';
import { phoneToE164Us } from './phone-e164';

export function buildLocalBusinessJsonLd(params: {
  siteUrl: string;
  phone: string;
}): Record<string, unknown> {
  const base = params.siteUrl.replace(/\/$/, '');
  const tel = phoneToE164Us(params.phone);

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'HomeAndConstructionBusiness',
    name: SEO.siteName,
    description: SEO.description,
    url: `${base}/`,
    image: `${base}${SEO.ogImagePath}`,
    areaServed: [
      { '@type': 'AdministrativeArea', name: 'Broward County', containedInPlace: { '@type': 'State', name: 'Florida' } },
      { '@type': 'AdministrativeArea', name: 'Palm Beach County', containedInPlace: { '@type': 'State', name: 'Florida' } },
    ],
    priceRange: '$$',
  };

  if (tel) {
    schema['telephone'] = tel;
  }

  return schema;
}
