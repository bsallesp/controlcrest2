import { Meta, Title } from '@angular/platform-browser';
import { SEO } from './seo.constants';
import { buildLocalBusinessJsonLd } from './local-business-schema';

function canonicalBaseUrl(siteUrl: string): string {
  return siteUrl.replace(/\/$/, '');
}

export function setCanonicalLink(doc: Document, href: string): void {
  const head = doc.head;
  let link = doc.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = doc.createElement('link');
    link.setAttribute('rel', 'canonical');
    head.appendChild(link);
  }
  link.setAttribute('href', href);
}

export function injectJsonLd(doc: Document, data: Record<string, unknown>): void {
  const existing = doc.querySelector('script[type="application/ld+json"][data-cc-jsonld]');
  existing?.remove();
  const script = doc.createElement('script');
  script.type = 'application/ld+json';
  script.setAttribute('data-cc-jsonld', '1');
  script.textContent = JSON.stringify(data);
  doc.head.appendChild(script);
}

export function applySeo(meta: Meta, title: Title, doc: Document, siteUrl: string, phone: string): void {
  const base = canonicalBaseUrl(siteUrl);
  const pageUrl = `${base}/`;
  const ogImage = `${base}${SEO.ogImagePath}`;

  title.setTitle(SEO.title);
  meta.updateTag({ name: 'description', content: SEO.description });

  meta.updateTag({ property: 'og:title', content: SEO.title });
  meta.updateTag({ property: 'og:description', content: SEO.description });
  meta.updateTag({ property: 'og:url', content: pageUrl });
  meta.updateTag({ property: 'og:type', content: 'website' });
  meta.updateTag({ property: 'og:locale', content: 'en_US' });
  meta.updateTag({ property: 'og:site_name', content: SEO.siteName });
  meta.updateTag({ property: 'og:image', content: ogImage });
  meta.updateTag({ property: 'og:image:alt', content: SEO.ogImageAlt });

  meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
  meta.updateTag({ name: 'twitter:title', content: SEO.title });
  meta.updateTag({ name: 'twitter:description', content: SEO.description });
  meta.updateTag({ name: 'twitter:image', content: ogImage });

  setCanonicalLink(doc, pageUrl);
  injectJsonLd(doc, buildLocalBusinessJsonLd({ siteUrl: base, phone }));
}
