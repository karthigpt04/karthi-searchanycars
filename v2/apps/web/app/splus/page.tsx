import type { Metadata } from 'next';
import SplusClient from './SplusClient';

export const metadata: Metadata = {
  title: 'S-Plus Premium Pre-Owned Cars — Luxury Collection',
  description: 'Handpicked premium pre-owned luxury cars. BMW, Mercedes-Benz, Audi, Jaguar, Porsche & more. 300-point inspection, 2-year warranty, white-glove delivery.',
  alternates: { canonical: 'https://searchanycars.com/splus' },
};

export default function SplusPage() {
  return <SplusClient />;
}
