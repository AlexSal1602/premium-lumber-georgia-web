import { Facebook, Instagram, Mail, MapPin } from 'lucide-react';
import { site, type Locale } from '@/lib/site';
import { commonText } from '@/lib/translations/common';

function WhatsAppIcon() {
  return <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M20.5 3.5A11.9 11.9 0 0 0 12 0C5.4 0 0 5.4 0 12c0 2.1.5 4.2 1.6 6L0 24l6.2-1.6A12 12 0 0 0 12 24c6.6 0 12-5.4 12-12 0-3.2-1.2-6.2-3.5-8.5ZM12 22a10 10 0 0 1-5.1-1.4l-.4-.2-3.7 1 1-3.6-.3-.4A10 10 0 1 1 12 22Zm5.5-7.5c-.3-.1-1.8-.9-2.1-1-.3-.1-.5-.1-.7.2l-1 1.2c-.2.2-.4.2-.7.1a8.2 8.2 0 0 1-2.5-1.5 9.2 9.2 0 0 1-1.7-2.1c-.2-.3 0-.5.1-.6l.5-.6.3-.5c.1-.2 0-.4 0-.6L8.8 6.8c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.8.4-.3.3-1.1 1-1.1 2.5s1.1 2.9 1.3 3.1c.1.2 2.2 3.5 5.4 4.9.7.3 1.3.5 1.8.6.8.2 1.5.2 2.1.1.6-.1 1.8-.7 2.1-1.5.3-.7.3-1.4.2-1.5-.1-.2-.3-.3-.6-.4Z"/></svg>;
}
function TikTokIcon() {
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M16.6 0h-4v16.4a3.3 3.3 0 1 1-2.8-3.2V9.1a7.4 7.4 0 1 0 6.8 7.3V8.1a9.7 9.7 0 0 0 5.7 1.8V5.8A5.8 5.8 0 0 1 16.6 0Z"/></svg>;
}

export function ContactDetails({ locale }: { locale: Locale }) {
  return <div className="contact-details">
    <a className="contact-line" href={`mailto:${site.email}`}><Mail size={16} aria-hidden="true"/>{site.email}</a>
    <p className="contact-line"><MapPin size={16} aria-hidden="true"/><span>{commonText[locale].location}</span></p>
    <a className="contact-line whatsapp-contact" href={site.whatsapp} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp: ${site.phone}`}><WhatsAppIcon/><bdi dir="ltr">{site.phone}</bdi></a>
    <div className="social-links">
      <a href={site.socials.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook"><Facebook size={20} aria-hidden="true"/></a>
      <a href={site.socials.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram"><Instagram size={20} aria-hidden="true"/></a>
      <a href={site.socials.tiktok} target="_blank" rel="noopener noreferrer" aria-label="TikTok"><TikTokIcon/></a>
    </div>
  </div>;
}
