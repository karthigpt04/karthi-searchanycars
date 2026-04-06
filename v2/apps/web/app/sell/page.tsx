import type { Metadata } from 'next';
import SellClient from './SellClient';

export const metadata: Metadata = {
  title: 'Sell Your Car — Get Best Price',
  description: 'Sell your car at the best price. Free listing, instant valuation, verified buyers across India. No middleman, no hassle.',
  alternates: { canonical: 'https://searchanycars.com/sell' },
};

export default function SellPage() {
  return <SellClient />;
}
