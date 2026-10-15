# GEES CHILLS website

Buildless, responsive landing page. Serve `dist/` with any static web server. Sites identity and static directory are in `.openai/hosting.json`.

## Editing
- Content: `dist/index.html`
- Appearance: `dist/style.css`
- Enquiry planner: `dist/script.js`
- Media: `dist/assets/`

Contact details are intentionally stubs at the user's request. The form only prepares and copies a message; it does not submit, store data or confirm a booking. Replace the contact stubs and wire the chosen enquiry channel before accepting live enquiries.

The logo was supplied by the user on a white background. The hero is the previously generated illustrative product image. The supplied promo contains third-party manufacturer photos sourced from https://www.wanmaroto.com/product/outdoor-leisure-use-cooler-box/; commercial reuse permission has not been verified. Preserve the private preview audience until the public-launch details are settled.

## Verification — 15 October 2026
- JavaScript syntax check passed using Node 22.
- Local site loaded in the browser, including hero and logo.
- Package button selected “Big celebration” in the enquiry planner.
- Empty submission blocked by required-field validation.
- Filled sample enquiry generated correct name, date, guest count, location and package, with an explicit not-sent message.
- Copy button confirmed successful copy.
- Mobile layout checked with a 390px requested viewport (browser reported 354px content width); no horizontal overflow. Heading break issue was corrected and rechecked visually.
- Default browser layout inspected. Mobile viewport override reset.

The enquiry planner has no backend. Public contact and pricing remain unconfigured by design.
