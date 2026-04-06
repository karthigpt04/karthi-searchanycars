import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: "About Us — India's Trusted Used Car Platform",
  description: "SearchAnyCars is India's most trusted used car marketplace. Quality-inspected cars with warranty, money-back guarantee, and free RC transfer.",
  alternates: { canonical: 'https://searchanycars.com/about' },
};

const values = [
  { icon: '🚗', title: '12,000+ Cars', desc: 'Browse one of India\'s largest collections of quality-inspected used cars.' },
  { icon: '🔍', title: '200+ Point Inspection', desc: 'Every car undergoes a rigorous multi-point inspection before listing.' },
  { icon: '🛡️', title: '1-Year Warranty', desc: 'Comprehensive warranty covering engine and transmission.' },
  { icon: '🔄', title: '7-Day Returns', desc: 'Not satisfied? Get a full refund within 7 days of delivery.' },
  { icon: '💰', title: 'Fixed Pricing', desc: 'No haggling. Transparent, fair pricing on every car.' },
  { icon: '🏠', title: 'Doorstep Delivery', desc: 'We deliver your car to your home with complete documentation.' },
];

export default function AboutPage() {
  return (
    <main>
      <div className="page-hero">
        <div className="container">
          <h1>About SearchAnyCars</h1>
          <p>India&apos;s most trusted used car marketplace</p>
        </div>
      </div>
      <section className="page-content">
        <div className="container">
          <div style={{ maxWidth: 720, margin: '0 auto 2.5rem', textAlign: 'center' }}>
            <h2 style={{ marginBottom: '0.75rem' }}>Our Mission</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', lineHeight: 1.7 }}>
              We believe buying a used car should be as simple and trustworthy as buying a new one.
              SearchAnyCars brings transparency, quality assurance, and convenience to the pre-owned car market.
            </p>
          </div>
          <div className="about-grid">
            {values.map((v) => (
              <div key={v.title} className="about-card">
                <div className="about-card-icon">{v.icon}</div>
                <h3>{v.title}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.35rem' }}>{v.desc}</p>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
            <Link href="/search" className="btn btn-primary btn-lg">Browse Cars</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
