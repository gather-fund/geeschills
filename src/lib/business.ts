import { site } from "./site";

// Details printed on GEES CHILLS invoices. Fill in the empty values before sending invoices;
// the invoice page warns (on screen only) while any are missing.
export const business = {
  name: site.name,
  tagline: "Good times. Cold drinks.",
  address: "N39 Sun ST, Teshie Agblezaa", // e.g. 'P.O. Box …, Accra'
  email: site.email,
  phones: ["+233 27 794 6635"],
  vatNumber: "N/A", // Ghana Revenue Authority VAT number; prices are shown as VAT-inclusive
  paymentDetails:
    "VODAFONE CASH 020 226 2120 (GEES CHILLS) · Bank: …, Acc. no. …", // e.g. 'MTN MoMo 024 000 0000 (GEES CHILLS) · Bank: …, Acc. no. …'
};

export const missingBusinessDetails = () =>
  [
    !business.address && "business address",
    !business.vatNumber && "VAT number",
    !business.paymentDetails && "payment details",
  ].filter((item): item is string => Boolean(item));
