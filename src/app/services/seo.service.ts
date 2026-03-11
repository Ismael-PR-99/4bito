import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

@Injectable({ providedIn: 'root' })
export class SeoService {
  private meta  = inject(Meta);
  private title = inject(Title);

  private readonly siteName = '4bito';
  private readonly defaultDescription =
    'Tu tienda online de camisetas retro de fútbol. Equipaciones clásicas de los 70s a los 00s.';

  /** Set page-level meta tags */
  setPage(pageTitle: string, description?: string): void {
    const fullTitle = `${pageTitle} | ${this.siteName}`;
    const desc = description ?? this.defaultDescription;

    this.title.setTitle(fullTitle);
    this.meta.updateTag({ name: 'description', content: desc });
    this.meta.updateTag({ property: 'og:title', content: fullTitle });
    this.meta.updateTag({ property: 'og:description', content: desc });
    this.meta.updateTag({ name: 'twitter:title', content: fullTitle });
    this.meta.updateTag({ name: 'twitter:description', content: desc });
  }

  /** Set product-specific meta tags */
  setProduct(name: string, description: string, imageUrl: string, price: number): void {
    const fullTitle = `${name} | ${this.siteName}`;

    this.title.setTitle(fullTitle);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ property: 'og:title', content: fullTitle });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:image', content: imageUrl });
    this.meta.updateTag({ property: 'og:type', content: 'product' });
    this.meta.updateTag({ name: 'twitter:title', content: fullTitle });
    this.meta.updateTag({ name: 'twitter:description', content: description });
    this.meta.updateTag({ name: 'twitter:image', content: imageUrl });

    // Product structured data via meta
    this.meta.updateTag({ property: 'product:price:amount', content: price.toFixed(2) });
    this.meta.updateTag({ property: 'product:price:currency', content: 'EUR' });
  }

  /** Reset to defaults */
  resetToDefaults(): void {
    this.title.setTitle(`${this.siteName} — Camisetas Retro de Fútbol`);
    this.meta.updateTag({ name: 'description', content: this.defaultDescription });
    this.meta.updateTag({ property: 'og:title', content: `${this.siteName} — Camisetas Retro de Fútbol` });
    this.meta.updateTag({ property: 'og:description', content: this.defaultDescription });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
  }
}
