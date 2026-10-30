# Enable enquiry emails on Vercel

The application is prepared for the domain supplied: **geeschills.com**.
Enquiries are delivered to **geeschills@gmail.com**.

## 1. Verify the sender in Resend

1. Create/sign into https://resend.com and open Domains.
2. Add `geeschills.com` as a sending domain.
3. Copy the exact DNS records Resend displays into the provider that manages this domain's DNS. Use the names, values and record types shown in your dashboard; do not guess them. Existing website records should stay in place.
4. Click Verify and wait until the sending domain is verified.
5. Create a sending API key scoped to that domain.

Reference: https://resend.com/docs/dashboard/domains/introduction

`enquiries@geeschills.com` is the outgoing sender identity. Resend domain verification lets the app send from it; it does not create a mailbox. The business receives enquiries in Gmail, and Reply uses the visitor's email address.

## 2. Configure the Vercel project

Import this repository as a **Next.js** project, or use the existing project.
Use the default Next.js build/output settings. Remove any old output-directory override such as `out` or `dist`: this version needs Vercel Functions for `/api/enquiries/`.

Under Project → Settings → Environment Variables, set:

| Name | Value |
| --- | --- |
| `RESEND_API_KEY` | Your private Resend sending API key |
| `ENQUIRY_FROM_EMAIL` | `GEES CHILLS <enquiries@geeschills.com>` |
| `ENQUIRY_TO_EMAIL` | `geeschills@gmail.com` |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Turnstile site key (public), see section 4 |
| `TURNSTILE_SECRET_KEY` | Turnstile secret key (private), see section 4 |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST URL, see section 4 |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST token (private), see section 4 |

Set them for Production. Add them to Preview/Development only if those environments should also send real emails. Never prefix the API key with `NEXT_PUBLIC_`, commit it, or put it in browser code.

Redeploy after saving the variables; they do not update an existing deployment.

Reference: https://vercel.com/docs/environment-variables

Add `geeschills.com` under Vercel project Domains and follow Vercel's displayed DNS instructions if the website domain is not connected yet.

## 3. Verify actual delivery

After deployment, submit one clearly labelled test enquiry using an email address you control. Check the recipient Gmail inbox and Spam, then check Resend's email logs. Confirm that Reply addresses the visitor. A successful API submission means Resend accepted the email; delivery is confirmed by the provider log/inbox.

The form collects name, visitor email, date, guest count, location, type of event, whether waiters are needed and optional notes. It validates these again on the server and shows an explicit failure if email is unconfigured or sending fails. No confirmation email is sent to visitors.

## 4. Spam and abuse protection

Built in, no setup needed:

- Server-side validation of every field; only the listed event types and waiter answers are accepted.
- Line breaks, control characters, zero-width spaces and text-direction overrides are rejected in single-line fields (notes may contain line breaks), so a visitor cannot fake extra lines in the email.
- Recipient is fixed on the server; visitor-supplied addresses are ignored. Emails are plain text.
- Cross-site browser submissions are rejected; bodies over 12KB are refused; a hidden bot-trap field.
- Security headers on every page (Content-Security-Policy, frame blocking, nosniff, referrer and permissions policies, HSTS), set in `next.config.ts`. If you add a third-party script, font or embed, add its domain to the policy there.
- Rate limit: 10 enquiries per IP address per hour, answered with HTTP 429. It is deliberately generous because Ghanaian mobile networks share IP addresses between many customers. Without Upstash (below) the count is kept per serverless instance only, which slows scripts but is not a firm limit.

Recommended before promoting the form:

1. **Cloudflare Turnstile** (free, mostly invisible bot check). In the Cloudflare dashboard open Turnstile → Add widget, enter `geeschills.com` (add `localhost` too for local testing), choose *Managed*. Set `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` in Vercel, then redeploy (the site key is built into the page). Once the secret is set, enquiries without a valid token are rejected. Cloudflare's test keys for local work: site `1x00000000000000000000AA`, secret `1x0000000000000000000000000000000AA`. Reference: https://developers.cloudflare.com/turnstile/
2. **Shared rate limit with Upstash Redis** (free tier is enough). Create a Redis database at https://upstash.com (or via Vercel → Storage → Marketplace → Upstash), copy its REST URL and token into `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`. If Upstash is unreachable the form keeps working with the per-instance count and logs an error.
3. **Optional Vercel Firewall rule** as an outer layer: Project → Firewall → Configure → New rule: *If* Request Path *equals* `/api/enquiries/` and Method *equals* `POST`, *then* Rate Limit, e.g. 20 requests per 60 seconds per IP, action Deny. Reference: https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting

## Local development

Copy `.env.example` to `.env.local` and fill in your private Resend API key:

```sh
cp .env.example .env.local
```

Put the same variables in ignored `.env.local`, then restart `npm run dev`.
Without the variables, the form reports that email is unavailable and directs visitors to WhatsApp. The API key is required only at request time, so builds can run before account setup is complete.

Checks (no real email sent):

```sh
node --test tests/enquiries.test.mjs
npm run typecheck
npm run build
```
