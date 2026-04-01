import Link from 'next/link';

const steps = [
  { icon: '🔍', num: '1', title: 'Browse & Search', desc: 'Explore 12,000+ quality-inspected cars. Filter by brand, budget, fuel type, and city.' },
  { icon: '📋', num: '2', title: 'Check Inspection Report', desc: 'Every car has a detailed 200+ point inspection report. Review the score, photos, and condition.' },
  { icon: '🚗', num: '3', title: 'Book a Test Drive', desc: 'Schedule a free test drive at your home or visit our nearest hub. Our team will bring the car to you.' },
  { icon: '💳', num: '4', title: 'Reserve with Deposit', desc: 'Pay a small refundable deposit to hold the car for 48 hours while you decide.' },
  { icon: '📝', num: '5', title: 'Complete Documentation', desc: 'We handle all paperwork — RC transfer, insurance, loan processing. Just sign and relax.' },
  { icon: '🏠', num: '6', title: 'Doorstep Delivery', desc: 'Your car is delivered to your doorstep in pristine condition. Drive away with confidence!' },
];

export default function HowItWorksPage() {
  return (
    <main>
      <div className="page-hero">
        <div className="container">
          <h1>How It Works</h1>
          <p>Buy your dream car in 6 simple steps</p>
        </div>
      </div>
      <section className="page-content">
        <div className="container">
          <div className="how-it-works-grid" style={{ maxWidth: 960, margin: '0 auto' }}>
            {steps.map((s) => (
              <div key={s.num} className="how-step">
                <div className="how-step-icon">{s.icon}</div>
                <span className="how-step-num">{s.num}</span>
                <h4>{s.title}</h4>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
            <Link href="/search" className="btn btn-primary btn-lg">Start Browsing</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
