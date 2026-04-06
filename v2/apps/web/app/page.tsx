import type { Metadata } from 'next';
import HomeClient from './HomeClient';

export const metadata: Metadata = {
  title: 'SearchAnyCars — Buy Certified Used Cars in India | Pre-Owned Cars with Warranty',
  description: 'Find 12,000+ quality-inspected used cars with warranty, easy financing, and doorstep delivery across India. Browse Hyundai, Maruti Suzuki, Tata, Honda, Kia, Mahindra & more.',
  keywords: ['used cars India', 'second hand cars', 'certified pre-owned cars', 'buy used car online', 'used car warranty', 'SearchAnyCars'],
  openGraph: {
    title: 'SearchAnyCars — Premium Certified Used Cars in India',
    description: 'Find certified pre-owned cars from trusted dealers across India. 200+ point inspection, 1-year warranty, 7-day money back guarantee.',
    url: 'https://searchanycars.com',
    siteName: 'SearchAnyCars',
    type: 'website',
    locale: 'en_IN',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SearchAnyCars — Premium Used Cars in India',
    description: 'Find certified pre-owned cars from trusted dealers across India.',
  },
  alternates: {
    canonical: 'https://searchanycars.com',
  },
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: 'SearchAnyCars',
            url: 'https://searchanycars.com',
            logo: 'https://searchanycars.com/icon.png',
            description: "India's most trusted used car marketplace. Quality-inspected cars with warranty and money-back guarantee.",
            contactPoint: {
              '@type': 'ContactPoint',
              telephone: '+91-98765-43210',
              contactType: 'customer service',
              areaServed: 'IN',
              availableLanguage: ['English', 'Hindi'],
            },
            sameAs: [],
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: 'SearchAnyCars',
            url: 'https://searchanycars.com',
            potentialAction: {
              '@type': 'SearchAction',
              target: 'https://searchanycars.com/search?search={search_term_string}',
              'query-input': 'required name=search_term_string',
            },
          }),
        }}
      />
      <HomeClient />
    </>
  );
}
