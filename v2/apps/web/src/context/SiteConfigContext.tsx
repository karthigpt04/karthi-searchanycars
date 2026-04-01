'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { api } from '../lib/api';

export interface SiteConfig {
  site_name: string;
  hero: { title: string; subtitle: string };
  trust_bar: Array<{ icon: string; label: string; iconClass: string }>;
  budget_brackets: Array<{ label: string; min?: number; max?: number }>;
  body_types: Array<{ name: string; icon: string; count: string }>;
  fuel_types: Array<{ name: string; icon: string; count: string }>;
  cities: Array<{ name: string; slug: string; count: string; image?: string }>;
  reviews: Array<{ name: string; city: string; car: string; text: string; rating: number }>;
  nav_items: Array<{ label: string; path: string }>;
  footer: {
    brand_text: string;
    columns: Array<{
      key: string;
      title: string;
      links: Array<{ label: string; to: string }>;
    }>;
  };
  sell_cta: { title: string; description: string; button_text: string };
  splus_banner: { badge: string; title: string; description: string; features: Array<{ icon: string; label: string }> };
  spn_banner: { badge: string; title: string; description: string; features: Array<{ icon: string; label: string }> };
  contact_info: { phone: string; whatsapp: string; email: string; address: string };
}

export const defaultConfig: SiteConfig = {
  site_name: 'SearchAnyCars',
  hero: { title: 'Find Your Perfect Used Car', subtitle: 'Browse 12,000+ quality-inspected used cars with warranty, easy financing, and doorstep delivery across India' },
  trust_bar: [
    { icon: '🔍', label: '200+ Point Inspection', iconClass: 'trust-icon-blue' },
    { icon: '🔄', label: '7-Day Money Back', iconClass: 'trust-icon-green' },
    { icon: '🛡️', label: '1-Year Warranty', iconClass: 'trust-icon-blue' },
    { icon: '💰', label: 'Fixed Price — No Haggling', iconClass: 'trust-icon-orange' },
    { icon: '📋', label: 'Free RC Transfer', iconClass: 'trust-icon-green' },
  ],
  budget_brackets: [
    { label: 'Under ₹2L', max: 200000 },
    { label: '₹2-3L', min: 200000, max: 300000 },
    { label: '₹3-5L', min: 300000, max: 500000 },
    { label: '₹5-8L', min: 500000, max: 800000 },
    { label: '₹8-10L', min: 800000, max: 1000000 },
    { label: '₹10-15L', min: 1000000, max: 1500000 },
    { label: '₹15-20L', min: 1500000, max: 2000000 },
    { label: 'Above ₹20L', min: 2000000 },
  ],
  body_types: [
    { name: 'Hatchback', icon: '🚗', count: '420+' },
    { name: 'Sedan', icon: '🚘', count: '380+' },
    { name: 'SUV', icon: '🚙', count: '520+' },
    { name: 'MUV', icon: '🚐', count: '180+' },
    { name: 'Luxury Sedan', icon: '🏎️', count: '95+' },
    { name: 'Luxury SUV', icon: '🛻', count: '75+' },
  ],
  fuel_types: [
    { name: 'Petrol', icon: '⛽', count: '580+' },
    { name: 'Diesel', icon: '🛢️', count: '320+' },
    { name: 'CNG', icon: '💨', count: '95+' },
    { name: 'Electric', icon: '⚡', count: '45+' },
  ],
  cities: [
    { name: 'New Delhi', slug: 'new-delhi', count: '1,200+' },
    { name: 'Mumbai', slug: 'mumbai', count: '1,800+' },
    { name: 'Bengaluru', slug: 'bengaluru', count: '950+' },
    { name: 'Chennai', slug: 'chennai', count: '720+' },
    { name: 'Hyderabad', slug: 'hyderabad', count: '680+' },
    { name: 'Pune', slug: 'pune', count: '540+' },
    { name: 'Ahmedabad', slug: 'ahmedabad', count: '420+' },
    { name: 'Jaipur', slug: 'jaipur', count: '380+' },
    { name: 'Lucknow', slug: 'lucknow', count: '310+' },
    { name: 'Kolkata', slug: 'kolkata', count: '650+' },
    { name: 'Chandigarh', slug: 'chandigarh', count: '290+' },
    { name: 'Kochi', slug: 'kochi', count: '260+' },
  ],
  reviews: [
    { name: 'Rahul S.', city: 'New Delhi', car: 'Hyundai Creta', text: 'Found the perfect Creta within 2 days. The inspection report gave me complete confidence.', rating: 5 },
    { name: 'Priya M.', city: 'Mumbai', car: 'Honda City', text: 'The fixed pricing was such a relief - no haggling! The 7-day return policy sealed the deal.', rating: 5 },
    { name: 'Vikram K.', city: 'Bengaluru', car: 'Tata Nexon', text: 'Best used car buying experience. The EMI calculator helped me plan my finances.', rating: 5 },
  ],
  nav_items: [
    { label: 'Home', path: '/' },
    { label: 'Buy Cars', path: '/search' },
    { label: 'S-Plus', path: '/splus' },
    { label: 'S-Plus New', path: '/splus-new' },
    { label: 'How It Works', path: '/how-it-works' },
    { label: 'About Us', path: '/about' },
    { label: 'FAQs', path: '/faq' },
    { label: 'Contact', path: '/contact' },
  ],
  footer: {
    brand_text: "India's most trusted used car platform. Quality-inspected cars with warranty & money-back guarantee.",
    columns: [
      { key: 'company', title: 'Company', links: [{ label: 'About Us', to: '/about' }, { label: 'How It Works', to: '/how-it-works' }, { label: 'S-Plus Premium', to: '/splus' }, { label: 'S-Plus New', to: '/splus-new' }, { label: 'Contact Us', to: '/contact' }] },
      { key: 'buy', title: 'Buy Cars', links: [{ label: 'Maruti Suzuki', to: '/search?brand=Maruti+Suzuki' }, { label: 'Hyundai', to: '/search?brand=Hyundai' }, { label: 'Tata', to: '/search?brand=Tata' }, { label: 'Honda', to: '/search?brand=Honda' }, { label: 'All Brands', to: '/search' }] },
      { key: 'browse', title: 'Browse By', links: [{ label: 'SUVs', to: '/search?body_style=SUV' }, { label: 'Sedans', to: '/search?body_style=Sedan' }, { label: 'Hatchbacks', to: '/search?body_style=Hatchback' }, { label: 'Electric', to: '/search?fuel_type=Electric' }] },
      { key: 'support', title: 'Support', links: [{ label: 'FAQs', to: '/faq' }, { label: 'Warranty', to: '/faq' }, { label: 'Privacy Policy', to: '/faq' }, { label: 'Terms', to: '/faq' }] },
    ],
  },
  sell_cta: { title: 'Want to Sell Your Car?', description: 'List your car for free. Get the best price from verified buyers across India.', button_text: 'Sell Your Car' },
  splus_banner: { badge: 'S-Plus Premium', title: 'Experience Luxury, Pre-Owned', description: 'Handpicked premium cars with 300-point inspection, 2-year warranty, and dedicated concierge service.', features: [{ icon: '◆', label: '300-Point Inspection' }, { icon: '★', label: '2-Year Warranty' }, { icon: '♢', label: 'White-Glove Delivery' }, { icon: '↻', label: 'Personal Advisor' }] },
  spn_banner: { badge: 'S-Plus New', title: 'Brand New. Zero Owners. Your Name First.', description: 'Premium unregistered, unused, and demo cars from authorized dealers. Full manufacturer warranty included.', features: [{ icon: '◇', label: 'Factory Fresh' }, { icon: '★', label: 'Full Warranty' }, { icon: '◈', label: 'First Registration' }, { icon: '⟐', label: 'White-Glove Delivery' }] },
  contact_info: { phone: '+91 98765 43210', whatsapp: '+91 98765 43210', email: 'hello@searchanycars.com', address: 'Koramangala, Bengaluru, Karnataka 560034' },
};

const SiteConfigContext = createContext<{
  config: SiteConfig;
  loading: boolean;
  refreshConfig: () => void;
}>({
  config: defaultConfig,
  loading: true,
  refreshConfig: () => {},
});

export const useSiteConfig = () => useContext(SiteConfigContext);

export const SiteConfigProvider = ({ children }: { children: ReactNode }) => {
  const [config, setConfig] = useState<SiteConfig>(defaultConfig);
  const [loading, setLoading] = useState(true);

  const refreshConfig = useCallback(() => {
    api.getSiteConfig()
      .then((data) => {
        setConfig((prev) => ({ ...prev, ...data } as SiteConfig));
      })
      .catch(() => {
        // Keep defaults on error
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refreshConfig();
  }, [refreshConfig]);

  return (
    <SiteConfigContext.Provider value={{ config, loading, refreshConfig }}>
      {children}
    </SiteConfigContext.Provider>
  );
};
