export default function WhatsAppBanner() {
  const number = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '233277946635').replace(/[\s()+-]/g, '');
  const configured = /^[1-9]\d{6,14}$/.test(number);
  const message = encodeURIComponent('Hi GEES CHILLS! I’d like to enquire about a cooler hire package for my event.');
  const content = <>
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M20.5 11.6a8.5 8.5 0 0 1-12.7 7.5L3 20.5l1.4-4.6a8.5 8.5 0 1 1 16.1-4.3Z" /><path d="M8.2 7.5c.3-.2.6-.1.8.3l.8 1.6c.1.3 0 .5-.4.9l-.4.4c.7 1.6 1.8 2.7 3.4 3.4l.5-.6c.2-.3.5-.5.8-.3l1.8.9c.3.2.4.4.2.8-.3.9-1 1.4-2 1.3-3.3-.4-6.5-3.5-7-6.6-.2-1 .4-1.8 1.5-2.1Z" /></svg>
    <span>{configured ? 'Chat with us' : 'WhatsApp · number coming soon'}</span>
  </>;

  return <aside className="whatsapp-banner" aria-label="WhatsApp contact">
      {configured ? <a className="whatsapp-contact" href={`https://wa.me/${number}?text=${message}`} target="_blank" rel="noopener noreferrer" aria-label="Chat with GEES CHILLS on WhatsApp (opens in a new tab)">{content}</a> : <span className="whatsapp-contact whatsapp-unconfigured" aria-disabled="true">{content}</span>}
  </aside>;
}
