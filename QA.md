# Local Next.js verification — 15 October 2026

- `npm run typecheck`: passed.
- `npm run build`: passed with Next.js 16.4.1 / Turbopack; home and not-found routes exported.
- Tested the production `out/` build through a local HTTP server.
- Package CTA selected Big celebration and focused the enquiry form.
- Empty submit rejected and no message generated.
- Whitespace-only name rejected with an explicit validation message; corrected name accepted.
- Guest count 0 rejected.
- Past event date rejected.
- Valid enquiry generated the expected package, name, date, guest count and location.
- Copy enquiry reported successful clipboard copy.
- Editing the guest count removed the old generated message.
- Desktop visual inspection completed; mobile DOM width check at 390px showed no horizontal overflow.
- Browser error log was empty during these checks.

The contact details are placeholders. No messages were sent. No deployment or source push was performed for this conversion. The existing published Site remains unchanged.

## Photography update — 18 October 2026

- Integrated both supplied photographs, replacing the illustrative hero and adding a malt-drink feature.
- Added responsive 480px/720px WebP assets, explicit image dimensions, descriptive alt text, a high-priority hero and lazy-loaded feature.
- Updated the promotional video poster to match the new photography.
- `npm run typecheck`: passed.
- `npm run build`: passed; static export generated in `out/`.
- Confirmed every local image/source-set/poster reference exists in the export.
- Live browser visual verification was unavailable: the computer-use service reported no browser available.
- Changes are local; no deployment performed.

## Responsive review — 18 October 2026

- Reviewed the local page visually in Chrome responsive mode at 320px, 390px, 621px and 768px widths.
- Fixed the cramped 320px header by placing the booking CTA on its own row.
- Made tablet hero typography scale smoothly to avoid awkward wrapping near the 620px breakpoint.
- Made the mobile promo player follow its native 9:16 ratio and available width.
- Set mobile form controls to 16px to avoid the usual iOS focus zoom; physical Safari/keyboard testing remains outstanding.
- Stacked date and guest fields on tablet; allowed grid children to shrink within their columns.
- Reviewed mobile package cards, photo presentation, enquiry fields, FAQ, footer and fixed WhatsApp control; no visible horizontal clipping in the reviewed sections.
- Confirmed the Big celebration package action updates the form selection at 320px.
- Footer contact link remains reachable above the fixed WhatsApp control.
- Browser console retained existing extension-injected hydration/listener messages and a missing favicon request; these are separate from responsive layout verification.
- Local changes only; no deployment performed.

## Email integration — 18 October 2026

- Added POST /api/enquiries with server-side validation, fixed recipient, Reply-To, bot-trap field, origin check and provider timeout/error handling.
- Changed the form to collect visitor email and show sending, accepted and failure states.
- Removed static export for Vercel Functions.
- `node --test tests/enquiries.test.mjs`: passed (validation, missing configuration, recipient protection, mocked success, provider rejection and network failure). All provider calls were mocked; no emails sent.
- `npm run typecheck` and `npm run build`: passed; /api/enquiries is a dynamic route.
- Resend verification, Vercel environment variables, deployment and real inbox delivery are pending account setup.
