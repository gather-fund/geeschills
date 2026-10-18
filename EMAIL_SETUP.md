# Enable enquiry emails on Vercel

The application is prepared for the domain supplied: **geeschils.com**.
Enquiries are delivered to **gloriaamankrahyeboah97@gmail.com**.

## 1. Verify the sender in Resend

1. Create/sign into https://resend.com and open Domains.
2. Add `geeschils.com` as a sending domain.
3. Copy the exact DNS records Resend displays into the provider that manages this domain's DNS. Use the names, values and record types shown in your dashboard; do not guess them. Existing website records should stay in place.
4. Click Verify and wait until the sending domain is verified.
5. Create a sending API key scoped to that domain.

Reference: https://resend.com/docs/dashboard/domains/introduction

`enquiries@geeschils.com` is the outgoing sender identity. Resend domain verification lets the app send from it; it does not create a mailbox. The business receives enquiries in Gmail, and Reply uses the visitor's email address.

## 2. Configure the Vercel project

Import this repository as a **Next.js** project, or use the existing project.
Use the default Next.js build/output settings. Remove any old output-directory override such as `out` or `dist`: this version needs Vercel Functions for `/api/enquiries/`.

Under Project → Settings → Environment Variables, set:

| Name | Value |
| --- | --- |
| `RESEND_API_KEY` | Your private Resend sending API key |
| `ENQUIRY_FROM_EMAIL` | `GEES CHILLS <enquiries@geeschils.com>` |
| `ENQUIRY_TO_EMAIL` | `gloriaamankrahyeboah97@gmail.com` |

Set them for Production. Add them to Preview/Development only if those environments should also send real emails. Never prefix the API key with `NEXT_PUBLIC_`, commit it, or put it in browser code.

Redeploy after saving the variables; they do not update an existing deployment.

Reference: https://vercel.com/docs/environment-variables

Add `geeschils.com` under Vercel project Domains and follow Vercel's displayed DNS instructions if the website domain is not connected yet.

## 3. Verify actual delivery

After deployment, submit one clearly labelled test enquiry using an email address you control. Check the recipient Gmail inbox and Spam, then check Resend's email logs. Confirm that Reply addresses the visitor. A successful API submission means Resend accepted the email; delivery is confirmed by the provider log/inbox.

The form currently collects name, visitor email, date, guest count, location, package and optional notes. It validates these again on the server, ignores visitor-supplied recipient addresses, includes a hidden bot-trap field, rejects cross-origin browser submissions and shows an explicit failure if email is unconfigured or sending fails. No confirmation email is sent to visitors.

Configure rate limiting for `/api/enquiries` in Vercel's firewall as appropriate before promoting the form widely. The hidden field is only basic bot filtering, not a distributed rate limiter.

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
