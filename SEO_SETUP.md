# Search setup

Production domain: https://www.geeschills.com/

Implemented:

- Search title and description focused on GEES CHILLS’ drinks chilling service for events in Ghana.
- A homepage canonical URL, absolute social image URLs and Ghanaian English language metadata.
- `/robots.txt`, allowing public pages and excluding `/api/`, with a sitemap reference.
- `/sitemap.xml`, listing the homepage (section anchors are not separate pages).
- Organization, WebSite and Service JSON-LD using the supplied business contacts.
- No indexing for Vercel Preview deployments and the not-found page.
- Optional `GOOGLE_SITE_VERIFICATION` for Search Console's HTML-tag verification method.

## After deployment

1. Make `www.geeschills.com` the production domain in Vercel. Redirect any alternate domain to it.
2. Add the domain in Google Search Console and follow its DNS verification instructions. Alternatively, create a URL-prefix property and copy the HTML-tag token into `GOOGLE_SITE_VERIFICATION` in Vercel, then redeploy before verifying.
3. Submit `https://www.geeschills.com/sitemap.xml` in Search Console.
4. Use URL Inspection to check the homepage and request indexing. Use Google's Rich Results Test or Schema Markup Validator to inspect the deployed structured data.
5. If setting up Google Business Profile, use the business's real address/service-area information. An address, opening hours and reviews have not been invented in the site's structured data.

These code changes prepare the site for crawling and clear search presentation. Deployment and search-engine indexing have not been verified; rankings and rich results are determined by search engines.

References:

- https://developers.google.com/search/docs/appearance/structured-data/organization
- https://developers.google.com/search/docs/appearance/structured-data/local-business
