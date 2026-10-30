# GEES CHILLS — Next.js app

Local Next.js 16.4.1 + React 19.3.1 + TypeScript app. Preserves the GEES CHILLS website design, white-background logo, event packages, promo video and contact details. No deployment was performed for this conversion; the previous hosted website is unchanged.

## Run

Use Node 20.9 or later (Node 22 is installed on this computer).

```sh
export PATH=~/.local/opt/node-22/bin:$PATH
npm ci
npm run dev
```

Open http://127.0.0.1:3018. If that port is in use, run `npm run dev -- --port 3019`.

```sh
npm run typecheck
npm run build
```

The production build includes a server endpoint for email. Preview it with `npx next start --hostname 127.0.0.1 --port 3019`. See EMAIL_SETUP.md for environment variables; the site builds without credentials, but email sends require them.

## Structure

- `src/app/`: App Router page, root layout, metadata, shared styles and not-found page.
- `src/components/landing-page.tsx`: page sections and package selection.
- `src/components/package-cards.tsx`: typed package content and reusable cards.
- `src/components/enquiry-form.tsx`: React enquiry form, validation and submission status.
- `public/assets/`: logo, responsive drink photography, retained illustrative asset and promo video.
- `legacy/`: preserved original buildless page for reference; not served by Next.js.
- `next.config.ts`: Next.js server configuration for Vercel.

## Current behaviour

The enquiry form sends event details to a server endpoint using Resend. It requires a visitor email address and sets Reply-To to that address. The recipient defaults to geeschills@gmail.com. The WhatsApp control remains available if email sending fails.

**Account setup is still required.** Follow [EMAIL_SETUP.md](EMAIL_SETUP.md) to verify geeschills.com in Resend, add the private Vercel environment variables and test delivery.

The app now uses standard Next.js server hosting on Vercel. Static export has been removed because sending email requires a server endpoint. Previous `out/` files are historical and must not be deployed for this version.

## Media

The logo and two drink photographs were supplied by the user. The homepage uses the iced beer photograph in the hero and the malt photograph in an editorial feature. Each photograph has 480px and 720px WebP variants; the feature image loads lazily. The original illustrative hero is retained as an unused source asset. The promo contains manufacturer reference photos from https://www.wanmaroto.com/product/outdoor-leisure-use-cooler-box/; commercial reuse permission has not been verified. Google Fonts loads DM Sans and Manrope with system fallbacks.

See `QA.md` for checks performed on the Next.js version.

The website promo player uses `public/assets/promo-v8.mp4` (24 seconds, 1080 × 1920, H.264/AAC) and a poster frame `promo-v8-poster-2.jpg` taken from the video’s opening shot (2.5s). Versioned URLs prevent the previous video being reused from browser caches.

## WhatsApp contact

A fixed green “Chat with us” WhatsApp button with the site’s 4px corner radius in the bottom-right corner links to +233 27 794 6635 with a prefilled event enquiry. It appears across the site, respects mobile safe areas and reserves footer space. `NEXT_PUBLIC_WHATSAPP_NUMBER` can override the international number at build time.
