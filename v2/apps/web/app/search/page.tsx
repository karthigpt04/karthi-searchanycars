import { Suspense } from 'react';
import type { Metadata } from 'next';
import { SearchClient } from './SearchClient';

export const metadata: Metadata = {
  title: 'Search Used Cars — Browse by Brand, Budget, City',
  description: 'Search and compare 12,000+ used cars across India. Filter by brand, budget, fuel type, transmission, city. All cars quality-inspected with 1-year warranty.',
  alternates: { canonical: 'https://searchanycars.com/search' },
};

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <main>
          <div className="section-sm section-gray">
            <div className="container">
              <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Search Used Cars</h1>
            </div>
          </div>
          <section className="section-sm">
            <div className="container">
              <div className="card-grid">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="skeleton-card">
                    <div className="skeleton-image" />
                    <div className="skeleton-text-lg skeleton" />
                    <div className="skeleton-text skeleton" />
                  </div>
                ))}
              </div>
            </div>
          </section>
        </main>
      }
    >
      <SearchClient />
    </Suspense>
  );
}
