import type { MetadataRoute } from 'next';
import { isPreview, site } from '../lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  // Section anchors are part of the homepage, not separate indexable pages.
  return isPreview ? [] : [{ url: `${site.url}/` }];
}
