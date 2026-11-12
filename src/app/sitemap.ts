import type { MetadataRoute } from 'next';
import { isPreview, site } from '../lib/site';
import { publicPages } from '../lib/routes';

export default function sitemap(): MetadataRoute.Sitemap {
  return isPreview ? [] : publicPages.map(path => ({ url: `${site.url}${path}` }));
}
