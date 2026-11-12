/** A question and answer shown in an FAQ list. */
export type FaqItem = { question: string; answer: string };

// Each page gets the questions that matter at that step, so no list repeats across pages.
export const packageFaqs: readonly FaqItem[] = [
  { question: 'Can you cater for my event size?', answer: 'We plan packages for small gatherings, large celebrations and everything in between. Share your guest count and drinks plan so we can discuss a suitable setup.' },
  { question: 'Can I include ice and delivery?', answer: 'Ask about ice, delivery, setup and collection in your enquiry. The available options, timings and costs will be agreed in your quote.' },
  { question: 'Can you provide waiters?', answer: 'Yes. Waiter service is available at an additional cost. Let us know in your enquiry if you’d like it.' },
];

export const enquiryFaqs: readonly FaqItem[] = [
  { question: 'What happens after I send an enquiry?', answer: 'We’ll reply to the email address you provided to talk through your drinks, the chilling you need and any extras, then agree the details and quote.' },
  { question: 'Is sending an enquiry a confirmed booking?', answer: 'No. Your booking is confirmed only after availability, your package and payment arrangements have been agreed. Sending an enquiry does not reserve your date.' },
];
