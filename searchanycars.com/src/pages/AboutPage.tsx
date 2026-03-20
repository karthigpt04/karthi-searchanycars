import { Link } from 'react-router-dom'

export const AboutPage = () => {
  return (
    <main>
      <div className="page-hero">
        <div className="container">
          <h1>About SearchAnyCars</h1>
          <p>India's most trusted used car broker platform. We search across 100+ dealers so you don't have to.</p>
        </div>
      </div>

      <section className="section">
        <div className="container-narrow">
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2>Our Mission</h2>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.75rem', fontSize: '1.05rem', maxWidth: '640px', margin: '0.75rem auto 0' }}>
              To make buying a used car as trustworthy and hassle-free as buying a new one. We aggregate the best inventory from verified dealer partners and present it under one trusted brand with consistent quality standards.
            </p>
          </div>

          <div className="about-grid">
            {[
              { icon: '🔍', title: '12,000+ Cars', desc: 'Curated inventory from 100+ verified dealer partners across India' },
              { icon: '✅', title: '200+ Point Inspection', desc: 'Every car undergoes rigorous quality inspection before listing' },
              { icon: '🛡️', title: '1-Year Warranty', desc: 'Comprehensive warranty on engine and transmission for peace of mind' },
              { icon: '🔄', title: '7-Day Returns', desc: 'Not satisfied? Get a full refund within 7 days, no questions asked' },
              { icon: '💰', title: 'Fixed Pricing', desc: 'No haggling, no hidden charges. The price you see is the price you pay' },
              { icon: '🚗', title: 'Doorstep Delivery', desc: 'We handle RC transfer, insurance, and deliver to your doorstep' },
            ].map((item) => (
              <div key={item.title} className="about-card">
                <div className="about-card-icon">{item.icon}</div>
                <h3 style={{ fontSize: '1.05rem', marginBottom: '0.35rem' }}>{item.title}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{item.desc}</p>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: '3rem' }}>
            <Link to="/search" className="btn btn-primary btn-lg">Browse Our Cars</Link>
          </div>
        </div>
      </section>
    </main>
  )
}
