import { Link } from 'react-router-dom'

const steps = [
  { num: '1', icon: '🔍', title: 'Browse & Search', desc: 'Use our powerful filters to find the perfect car from 12,000+ quality-inspected listings. Compare specs, prices, and features side by side.' },
  { num: '2', icon: '📋', title: 'Check Inspection Report', desc: 'Every car comes with a detailed 200+ point inspection report. See the exact condition of exterior, interior, engine, and more with photo evidence.' },
  { num: '3', icon: '🚗', title: 'Book a Test Drive', desc: 'Schedule a free test drive at your home or visit our nearest hub. Our team will bring the car to you at your preferred time.' },
  { num: '4', icon: '💳', title: 'Reserve with a Deposit', desc: 'Pay a small refundable deposit to hold the car for 48 hours. The deposit is applied to your purchase price.' },
  { num: '5', icon: '📝', title: 'Complete Documentation', desc: 'We handle all paperwork — RC transfer, insurance, and more. Need financing? We connect you with our banking partners for the best rates.' },
  { num: '6', icon: '🏠', title: 'Doorstep Delivery', desc: 'Your car is cleaned, polished, and delivered to your doorstep. Plus, enjoy a 7-day money-back guarantee for complete peace of mind.' },
]

export const HowItWorksPage = () => {
  return (
    <main>
      <div className="page-hero">
        <div className="container">
          <h1>How It Works</h1>
          <p>Buy your dream used car in 6 simple steps. From search to doorstep delivery.</p>
        </div>
      </div>

      <section className="section">
        <div className="container-narrow">
          <div style={{ display: 'grid', gap: '2rem' }}>
            {steps.map((step) => (
              <div key={step.num} style={{
                display: 'grid',
                gridTemplateColumns: '60px 1fr',
                gap: '1.25rem',
                alignItems: 'start',
                padding: '1.5rem',
                background: '#fff',
                border: '1px solid var(--border)',
                borderRadius: '16px',
              }}>
                <div style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--navy), var(--navy-light))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                }}>
                  {step.icon}
                </div>
                <div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--coral)', fontWeight: 600, marginBottom: '0.25rem' }}>
                    Step {step.num}
                  </div>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '0.4rem' }}>{step.title}</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.6 }}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
            <h3 style={{ marginBottom: '0.75rem' }}>Ready to find your car?</h3>
            <Link to="/search" className="btn btn-primary btn-lg">Start Searching</Link>
          </div>
        </div>
      </section>
    </main>
  )
}
