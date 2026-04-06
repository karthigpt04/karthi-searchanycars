import type { Metadata } from 'next';
import FaqClient from './FaqClient';

export const metadata: Metadata = {
  title: 'Frequently Asked Questions',
  description:
    'Common questions about buying used cars on SearchAnyCars. Warranty, inspection, financing, return policy, RC transfer, and more.',
  alternates: { canonical: 'https://searchanycars.com/faq' },
};

const faqs = [
  { question: 'What is SearchAnyCars?', answer: 'SearchAnyCars is India\'s trusted used car marketplace. We offer quality-inspected, certified pre-owned cars with warranty, easy financing, and doorstep delivery.' },
  { question: 'How are cars inspected?', answer: 'Every car undergoes a rigorous 200+ point inspection covering the engine, transmission, electrical systems, body, interior, tyres, and safety features. Only cars that pass our quality standards are listed.' },
  { question: 'What is the 7-day money-back guarantee?', answer: 'If you\'re not satisfied with your purchase, you can return the car within 7 days of delivery for a full refund. No questions asked.' },
  { question: 'What does the warranty cover?', answer: 'Our 1-year comprehensive warranty covers the engine and transmission. Extended warranty options are available for additional coverage.' },
  { question: 'How does the reservation work?', answer: 'Pay a small refundable deposit (\u20B95,000-\u20B920,000 depending on the car\'s price) to hold the car for 48 hours. The deposit is applied to the purchase price or fully refunded if you cancel within the hold period.' },
  { question: 'Do you offer financing/EMI options?', answer: 'Yes, we partner with leading banks and NBFCs to offer competitive auto loans with EMI options starting from just \u20B94,999/month. Use our EMI calculator on any car listing page.' },
  { question: 'Is the RC transfer included?', answer: 'Yes! RC transfer is completely free. We handle all the paperwork, RTO visits, and documentation. The transferred RC is delivered to your address.' },
  { question: 'What documents do I need?', answer: 'You\'ll need a valid ID proof (Aadhaar/PAN), address proof, and bank account details for RC transfer. For financing, additional income documents may be required.' },
  { question: 'Can I sell my car on SearchAnyCars?', answer: 'Yes! List your car for free on our platform. We\'ll help you get the best price from verified buyers. Visit the "Sell Your Car" page to get started.' },
  { question: 'How do I book a test drive?', answer: 'Click the "Book Test Drive" button on any car listing. Choose between a home test drive or visiting our hub. Our team will confirm the appointment within 2 hours.' },
  { question: 'What is S-Plus Premium?', answer: 'S-Plus is our premium segment featuring handpicked luxury and high-end vehicles. These cars get a 300-point inspection, 2-year warranty, and dedicated concierge service.' },
  { question: 'Which cities do you serve?', answer: 'We currently serve 20+ cities across India including Delhi, Mumbai, Bengaluru, Chennai, Hyderabad, Pune, Ahmedabad, Jaipur, Kolkata, and more. Check our city page for full availability.' },
];

export default function FaqPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: faqs.map((faq) => ({
              '@type': 'Question',
              name: faq.question,
              acceptedAnswer: {
                '@type': 'Answer',
                text: faq.answer,
              },
            })),
          }),
        }}
      />
      <FaqClient />
    </>
  );
}
