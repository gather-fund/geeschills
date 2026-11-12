import { contactNumbers } from "./contact";

export const site = {
  url: "https://www.geeschills.com",
  name: "GEES CHILLS",
  title: "Drinks Chilling Service for Events in Ghana | GEES CHILLS",
  description:
    "Ice-cold drinks for weddings, birthdays, funerals, corporate events and family gatherings in Ghana. GEES CHILLS brings the coolers, ice and setup. Find your package and enquire about your event.",
  email: "geeschills@gmail.com",
  telephone: contactNumbers.call.e164, // calls; WhatsApp is contactNumbers.whatsapp
  socials: [
    { name: "Instagram", handle: "@geeschills_", url: "https://www.instagram.com/geeschills_/" },
    { name: "TikTok", handle: "@geeschillsgh", url: "https://www.tiktok.com/@geeschillsgh" },
  ],
} as const;

// Vercel previews should not compete with the production domain in search.
export const isPreview = process.env.VERCEL_ENV === "preview";
