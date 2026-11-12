// GEES CHILLS phone numbers, read from the environment so they can change without a code edit.
// Both are NEXT_PUBLIC_ because they appear in client components; Next.js inlines them at build
// time, so each must be read as a literal `process.env.NEXT_PUBLIC_…` expression.

/** Used when NEXT_PUBLIC_WHATSAPP_NUMBER is unset: +233 27 794 6635. */
export const DEFAULT_WHATSAPP_NUMBER = '233277946635';
/** Used when NEXT_PUBLIC_CALL_NUMBER is unset: +233 20 226 2120. */
export const DEFAULT_CALL_NUMBER = '233202262120';

const GHANA_COUNTRY_CODE = '233';
const GHANA_NATIONAL_LENGTH = 9;
// E.164: a country code that never starts with 0, up to 15 digits in all.
const INTERNATIONAL_DIGITS = /^[1-9]\d{6,14}$/;

export type PhoneNumber = {
  /** Digits only, with country code, as wa.me expects: 233277946635. */
  digits: string;
  /** E.164 form for tel: links and structured data: +233277946635. */
  e164: string;
  /** Grouped for reading: +233 27 794 6635. */
  display: string;
};

/** Groups Ghana numbers as +233 27 794 6635; other countries are shown as plain +digits. */
export function formatPhoneNumber(digits: string): string {
  const national = digits.slice(GHANA_COUNTRY_CODE.length);
  if (!digits.startsWith(GHANA_COUNTRY_CODE) || national.length !== GHANA_NATIONAL_LENGTH) return `+${digits}`;
  return `+${GHANA_COUNTRY_CODE} ${national.slice(0, 2)} ${national.slice(2, 5)} ${national.slice(5)}`;
}

/**
 * Parses a phone number from an environment variable, falling back when it is unset or blank.
 * Spaces, brackets, dashes and a leading + are ignored. Throws, naming the variable, when the
 * value is set but is not a full international number, so a typo fails the build instead of
 * publishing a broken link.
 */
export function parsePhoneNumber(name: string, raw: string | undefined, fallback: string): PhoneNumber {
  const value = raw?.trim() ? raw : fallback;
  const digits = value.replace(/[\s()+-]/g, '');
  const truncatedGhanaNumber = digits.startsWith(GHANA_COUNTRY_CODE) && digits.length !== GHANA_COUNTRY_CODE.length + GHANA_NATIONAL_LENGTH;
  if (!INTERNATIONAL_DIGITS.test(digits) || truncatedGhanaNumber) {
    throw new Error(`${name} must be an international phone number with country code, e.g. 233277946635; got "${value}".`);
  }
  return { digits, e164: `+${digits}`, display: formatPhoneNumber(digits) };
}

export const contactNumbers = {
  whatsapp: parsePhoneNumber('NEXT_PUBLIC_WHATSAPP_NUMBER', process.env.NEXT_PUBLIC_WHATSAPP_NUMBER, DEFAULT_WHATSAPP_NUMBER),
  call: parsePhoneNumber('NEXT_PUBLIC_CALL_NUMBER', process.env.NEXT_PUBLIC_CALL_NUMBER, DEFAULT_CALL_NUMBER),
};

/** WhatsApp chat link for the business number, optionally with a pre-filled message. */
export function whatsappUrl(message?: string): string {
  const base = `https://wa.me/${contactNumbers.whatsapp.digits}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
