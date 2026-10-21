# Invoices and the confirmed-orders sheet

The private page **/admin/invoice/** creates GEES CHILLS invoices and sends confirmed orders to a Google Sheet.

## Using it

1. Open `https://www.geeschills.com/admin/` and sign in with the admin password (`ADMIN_PASSWORD`). You stay signed in on that device for 12 hours; **Sign out** ends it sooner and clears any unsaved invoice from that browser.
2. Fill in the client, event and lines. Standard lines are pre-filled; leave a price empty to keep a line off the invoice, and leave QTY empty for flat charges such as transport. The preview updates as you type.
3. **Save & print / PDF** records the invoice in the register and opens the print window; choose "Save as PDF" to send it on WhatsApp or email. **Save as quote** records it without printing.
4. The first save issues the next invoice number from the Google Sheet (`GC-2026-0001`, `GC-2026-0002`, …, restarting each year). Numbers are never reused, and saving again updates the same invoice.
5. When the client confirms (for example once the deposit arrives), press **Mark as confirmed**; the order also appears in the "Confirmed orders" tab with its items. Once fully paid, press **Mark as paid**.
6. **Saved invoices** lists the register, newest first. Search by number or client and open one to edit, reprint or update its status.
7. **New invoice** clears the form for the next client.

The Google Sheet is the record of every invoice issued. Statuses are Quote → Confirmed → Paid. Printing needs the sheet connection, so every printed invoice has a registered number.

Before sending real invoices, fill in the business address, VAT number and payment details (MoMo or bank) in `src/lib/business.ts`. The page warns on screen while any are missing. Prices are printed as VAT-inclusive.

## One-time setup

### 1. Admin password

Set `ADMIN_PASSWORD` in Vercel (Project → Settings → Environment Variables, Production) to a long unique password of at least 12 characters; a password manager can generate one. Sign-in is refused until it is set. After 20 incorrect passwords an IP address is locked out for the rest of the hour. Changing the password signs out every device.

### 2. Google Sheet and Apps Script

1. Create a Google Sheet, e.g. "GEES CHILLS orders", in the Google account that should own the orders.
2. In the sheet open **Extensions → Apps Script**. Delete the sample code, paste the contents of `scripts/google-sheets-orders.gs`, and save.
3. Generate a secret, for example with `openssl rand -hex 32` in Terminal. In Apps Script open **Project Settings** (gear icon) → **Script Properties** → **Add script property**: name `WEBHOOK_SECRET`, value the secret.
4. Click **Deploy → New deployment**, choose type **Web app**, set *Execute as* **Me** and *Who has access* **Anyone**, then **Deploy** and allow the permissions Google asks for. "Anyone" lets the website reach the script without a Google sign-in; the secret is what stops others writing to the sheet.
5. Copy the **Web app URL** (it ends in `/exec`).

The script creates the "Invoices" and "Confirmed orders" tabs with headings when first needed. Do not rename the tabs or reorder their columns, and do not edit the Data column (it holds the copy used to reopen an invoice); other cells such as notes can be edited by hand.

### 3. Vercel variables

| Name | Value |
| --- | --- |
| `ADMIN_PASSWORD` | Your admin password |
| `SHEETS_WEBHOOK_URL` | The Web app URL from step 2.5 |
| `SHEETS_WEBHOOK_SECRET` | The same secret as `WEBHOOK_SECRET` |

Redeploy after saving. For local testing put the same values in `.env.local`.

### Changing the script later

Edit the code, then **Deploy → Manage deployments → Edit (pencil) → Version: New version → Deploy**. The URL stays the same. A brand-new deployment would get a new URL and need `SHEETS_WEBHOOK_URL` updating.

## Security notes

- `/admin` and `/api/admin` are protected in `src/proxy.ts`, and the orders API checks the session again itself. Both are excluded from search engines.
- The session is an HttpOnly, SameSite=Strict cookie signed with a key derived from `ADMIN_PASSWORD`; admin requests from other sites are refused.
- Totals sent to the sheet are recalculated on the server from the lines, not taken from the browser. Invoices reopened from the sheet are checked again before loading.
- Invoice numbers are issued by the script under a lock, so two devices saving at once still get different numbers.
- The site only posts to `script.google.com` Apps Script URLs, and the script rejects requests without the secret.
- Text that would start a spreadsheet formula (`=`, `+`, `-`, `@`) is stored as plain text.
