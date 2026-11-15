import { useEffect } from 'react';
import { brand } from '../config/brand';

export interface PageMetaOptions {
  title?: string | null;
  description?: string;
  canonical?: string;
  noindex?: boolean;
  ogType?: 'website' | 'product' | 'article';
  ogImage?: string;
  schema?: Record<string, any> | Array<Record<string, any>> | null;
}

function updateMetaTag(attrName: 'name' | 'property', attrValue: string, content: string | null) {
  let tag = document.querySelector<HTMLMetaElement>(`meta[${attrName}="${attrValue}"]`);
  if (content === null || content === undefined) {
    if (tag) tag.remove();
    return;
  }
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attrName, attrValue);
    document.head.appendChild(tag);
  }
  tag.content = content;
}

function updateLinkTag(rel: string, href: string | null) {
  let tag = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!href) {
    if (tag) tag.remove();
    return;
  }
  if (!tag) {
    tag = document.createElement('link');
    tag.rel = rel;
    document.head.appendChild(tag);
  }
  tag.href = href;
}

function updateJsonLd(schema: Record<string, any> | Array<Record<string, any>> | null) {
  const id = 'pixwora-page-ld-json';
  let tag = document.getElementById(id) as HTMLScriptElement | null;
  if (!schema) {
    if (tag) tag.remove();
    return;
  }
  if (!tag) {
    tag = document.createElement('script');
    tag.id = id;
    tag.type = 'application/ld+json';
    document.head.appendChild(tag);
  }
  tag.textContent = JSON.stringify(schema, null, 2);
}

/** Sets the browser tab title, meta tags, canonical link, and JSON-LD structured data. */
export function usePageMeta(
  titleOrOptions: string | null | PageMetaOptions,
  legacyDescription?: string,
  extraOptions?: Omit<PageMetaOptions, 'title' | 'description'>
) {
  const options: PageMetaOptions =
    typeof titleOrOptions === 'object' && titleOrOptions !== null
      ? titleOrOptions
      : {
          title: titleOrOptions,
          description: legacyDescription,
          ...extraOptions,
        };

  useEffect(() => {
    const rawTitle = options.title;
    const baseTitle = `${brand.displayName} — Original Stickers & Posters | Buy Online India`;
    const fullTitle = rawTitle
      ? rawTitle.toLowerCase().includes(brand.displayName.toLowerCase()) || rawTitle.toLowerCase().includes(brand.name.toLowerCase())
        ? rawTitle
        : `${rawTitle} — ${brand.displayName}`
      : baseTitle;

    document.title = fullTitle;

    const desc = options.description ?? brand.description;
    updateMetaTag('name', 'description', desc);

    // Robots noindex / index
    if (options.noindex) {
      updateMetaTag('name', 'robots', 'noindex, nofollow');
    } else {
      updateMetaTag('name', 'robots', 'index, follow');
    }

    // Canonical link
    const origin = brand.publicUrl || 'https://www.pixwora.store';
    const cleanPath = typeof window !== 'undefined' ? window.location.pathname : '';
    const cleanSearch = typeof window !== 'undefined' ? window.location.search : '';
    const defaultCanonical = `${origin}${cleanPath}${cleanSearch}`;
    const canonicalUrl = options.canonical ?? defaultCanonical;
    updateLinkTag('canonical', canonicalUrl);

    // Open Graph
    const ogImg = options.ogImage || `${origin}/logo.jpeg`;
    updateMetaTag('property', 'og:site_name', brand.displayName);
    updateMetaTag('property', 'og:type', options.ogType || 'website');
    updateMetaTag('property', 'og:title', fullTitle);
    updateMetaTag('property', 'og:description', desc);
    updateMetaTag('property', 'og:url', canonicalUrl);
    updateMetaTag('property', 'og:image', ogImg);

    // Twitter
    updateMetaTag('name', 'twitter:card', 'summary_large_image');
    updateMetaTag('name', 'twitter:title', fullTitle);
    updateMetaTag('name', 'twitter:description', desc);
    updateMetaTag('name', 'twitter:image', ogImg);

    // JSON-LD Structured Data
    if (options.schema) {
      updateJsonLd(options.schema);
    } else {
      updateJsonLd(null);
    }

    return () => {
      // Clean up page-specific JSON-LD when unmounting
      updateJsonLd(null);
    };
  }, [
    options.title,
    options.description,
    options.canonical,
    options.noindex,
    options.ogType,
    options.ogImage,
    JSON.stringify(options.schema),
  ]);
}
