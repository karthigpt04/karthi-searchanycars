import type { Metadata } from 'next';
import SplusNewClient from './SplusNewClient';

export const metadata: Metadata = {
  title: 'S-Plus New — Brand New Unregistered Cars',
  description: 'Premium unregistered, unused, and demo cars from authorized dealers. Full manufacturer warranty. Your name first on the RC. Factory-fresh condition.',
  alternates: { canonical: 'https://searchanycars.com/splus-new' },
};

export default function SplusNewPage() {
  return <SplusNewClient />;
}
