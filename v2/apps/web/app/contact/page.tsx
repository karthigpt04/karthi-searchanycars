import type { Metadata } from 'next';
import ContactClient from './ContactClient';

export const metadata: Metadata = {
  title: 'Contact Us',
  description: 'Get in touch with SearchAnyCars. Call, WhatsApp, or email us for any queries about buying or selling used cars in India.',
  alternates: { canonical: 'https://searchanycars.com/contact' },
};

export default function ContactPage() {
  return <ContactClient />;
}
