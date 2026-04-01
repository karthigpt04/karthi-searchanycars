'use client';

import { useState } from 'react';

const faqs = [
  { q: 'What is SearchAnyCars?', a: 'SearchAnyCars is India\'s trusted used car marketplace. We offer quality-inspected, certified pre-owned cars with warranty, easy financing, and doorstep delivery.' },
  { q: 'How are cars inspected?', a: 'Every car undergoes a rigorous 200+ point inspection covering the engine, transmission, electrical systems, body, interior, tyres, and safety features. Only cars that pass our quality standards are listed.' },
  { q: 'What is the 7-day money-back guarantee?', a: 'If you\'re not satisfied with your purchase, you can return the car within 7 days of delivery for a full refund. No questions asked.' },
  { q: 'What does the warranty cover?', a: 'Our 1-year comprehensive warranty covers the engine and transmission. Extended warranty options are available for additional coverage.' },
  { q: 'How does the reservation work?', a: 'Pay a small refundable deposit (₹5,000-₹20,000 depending on the car\'s price) to hold the car for 48 hours. The deposit is applied to the purchase price or fully refunded if you cancel within the hold period.' },
  { q: 'Do you offer financing/EMI options?', a: 'Yes, we partner with leading banks and NBFCs to offer competitive auto loans with EMI options starting from just ₹4,999/month. Use our EMI calculator on any car listing page.' },
  { q: 'Is the RC transfer included?', a: 'Yes! RC transfer is completely free. We handle all the paperwork, RTO visits, and documentation. The transferred RC is delivered to your address.' },
  { q: 'What documents do I need?', a: 'You\'ll need a valid ID proof (Aadhaar/PAN), address proof, and bank account details for RC transfer. For financing, additional income documents may be required.' },
  { q: 'Can I sell my car on SearchAnyCars?', a: 'Yes! List your car for free on our platform. We\'ll help you get the best price from verified buyers. Visit the "Sell Your Car" page to get started.' },
  { q: 'How do I book a test drive?', a: 'Click the "Book Test Drive" button on any car listing. Choose between a home test drive or visiting our hub. Our team will confirm the appointment within 2 hours.' },
  { q: 'What is S-Plus Premium?', a: 'S-Plus is our premium segment featuring handpicked luxury and high-end vehicles. These cars get a 300-point inspection, 2-year warranty, and dedicated concierge service.' },
  { q: 'Which cities do you serve?', a: 'We currently serve 20+ cities across India including Delhi, Mumbai, Bengaluru, Chennai, Hyderabad, Pune, Ahmedabad, Jaipur, Kolkata, and more. Check our city page for full availability.' },
];

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <main>
      <div className="page-hero">
        <div className="container">
          <h1>Frequently Asked Questions</h1>
          <p>Everything you need to know about buying cars on SearchAnyCars</p>
        </div>
      </div>
      <section className="page-content">
        <div className="container">
          <div className="faq-list">
            {faqs.map((faq, i) => (
              <div key={i} className="faq-item">
                <button className="faq-question" onClick={() => setOpenIndex(openIndex === i ? null : i)} type="button">
                  {faq.q}
                  <span style={{ fontSize: '0.7rem' }}>{openIndex === i ? '▲' : '▼'}</span>
                </button>
                {openIndex === i && <div className="faq-answer">{faq.a}</div>}
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
