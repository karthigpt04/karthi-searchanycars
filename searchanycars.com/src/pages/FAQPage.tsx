import { useState } from 'react'

const faqs = [
  { q: 'How does SearchAnyCars work?', a: 'SearchAnyCars aggregates the best used car inventory from 100+ verified dealer partners and presents them under one trusted brand. Every car undergoes a 200+ point quality inspection, and we handle everything from test drives to doorstep delivery.' },
  { q: 'Are all cars inspected?', a: 'Yes! Every car listed on SearchAnyCars goes through a comprehensive 200+ point inspection covering exterior, interior, engine, electrical systems, tyres, brakes, and documentation. You can view the detailed inspection report on each car\'s page.' },
  { q: 'What is the money-back guarantee?', a: 'If you\'re not satisfied with your purchase, you can return the car within 7 days for a full refund. No questions asked. The car must be in the same condition as delivered.' },
  { q: 'What warranty is provided?', a: 'Every SearchAnyCars Assured vehicle comes with a 1-year comprehensive warranty covering the engine and transmission. Extended warranty options are also available for additional coverage.' },
  { q: 'How does the reservation work?', a: 'When you find a car you like, you can reserve it by paying a small refundable deposit (₹5,000-₹20,000 depending on the car). This holds the car for 48 hours while we process your booking. The deposit is fully applied to the purchase price.' },
  { q: 'Can I book a test drive at home?', a: 'Yes! We offer free home test drives across all operational cities. Simply book a test drive on the car\'s page, select "Home Test Drive", and our team will bring the car to your doorstep at your preferred time.' },
  { q: 'Do you offer financing?', a: 'Yes, we partner with leading banks and NBFCs to offer competitive financing options. Use our built-in EMI calculator to plan your finances, and our team will help you find the best loan rates.' },
  { q: 'Is RC transfer included?', a: 'Yes! RC transfer is completely free when you buy through SearchAnyCars. We handle all paperwork, documentation, and the entire transfer process at no extra cost.' },
  { q: 'What documents do I need to buy a car?', a: 'You\'ll need: Aadhaar Card, PAN Card, Address Proof, and Income Proof (if opting for financing). Our team will guide you through the entire documentation process.' },
  { q: 'Can I sell my car on SearchAnyCars?', a: 'We\'re currently focused on providing the best buying experience. Sell-your-car functionality is coming soon. Enter your registration number on our homepage to get notified when it launches.' },
  { q: 'What cities do you operate in?', a: 'We currently operate in Delhi NCR, Mumbai, Bengaluru, Chennai, Hyderabad, Pune, Ahmedabad, Jaipur, and Lucknow. We\'re rapidly expanding to more cities.' },
  { q: 'How are prices determined?', a: 'Our pricing is based on market analysis, car condition, mileage, age, and service history. All prices are fixed — there\'s no haggling or hidden charges. The price you see includes everything.' },
]

export const FAQPage = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <main>
      <div className="page-hero">
        <div className="container">
          <h1>Frequently Asked Questions</h1>
          <p>Everything you need to know about buying a used car with SearchAnyCars</p>
        </div>
      </div>

      <section className="section">
        <div className="container">
          <div className="faq-list">
            {faqs.map((faq, i) => (
              <div key={i} className="faq-item">
                <button
                  className="faq-question"
                  onClick={() => setOpenIndex(openIndex === i ? null : i)}
                  type="button"
                >
                  {faq.q}
                  <span style={{ fontSize: '0.8rem' }}>{openIndex === i ? '−' : '+'}</span>
                </button>
                {openIndex === i && (
                  <div className="faq-answer">{faq.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
