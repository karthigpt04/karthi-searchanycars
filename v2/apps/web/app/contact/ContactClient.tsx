'use client';

import { useState } from 'react';
import { useSiteConfig } from '../../src/context/SiteConfigContext';

export default function ContactClient() {
  const { config } = useSiteConfig();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <main>
      <div className="page-hero">
        <div className="container">
          <h1>Contact Us</h1>
          <p>We&apos;d love to hear from you</p>
        </div>
      </div>
      <section className="page-content">
        <div className="container">
          <div className="contact-grid">
            <div>
              <h2 style={{ marginBottom: '1.25rem' }}>Get in Touch</h2>
              <div className="contact-info-card">
                <div className="contact-info-icon">📞</div>
                <div><h4>Phone</h4><p style={{ color: 'var(--text-secondary)' }}>{config.contact_info.phone}</p></div>
              </div>
              <div className="contact-info-card">
                <div className="contact-info-icon">💬</div>
                <div><h4>WhatsApp</h4><p style={{ color: 'var(--text-secondary)' }}>{config.contact_info.whatsapp}</p></div>
              </div>
              <div className="contact-info-card">
                <div className="contact-info-icon">✉️</div>
                <div><h4>Email</h4><p style={{ color: 'var(--text-secondary)' }}>{config.contact_info.email}</p></div>
              </div>
              <div className="contact-info-card">
                <div className="contact-info-icon">📍</div>
                <div><h4>Address</h4><p style={{ color: 'var(--text-secondary)' }}>{config.contact_info.address}</p></div>
              </div>
            </div>
            <div>
              {submitted ? (
                <div className="empty-state">
                  <div className="form-success-icon">✓</div>
                  <h3>Message Sent!</h3>
                  <p>Thank you for reaching out. Our team will get back to you within 24 hours.</p>
                  <button className="btn btn-primary" onClick={() => setSubmitted(false)} type="button">Send Another</button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 16, padding: '1.5rem' }}>
                  <h2 style={{ marginBottom: '1.25rem' }}>Send a Message</h2>
                  <div className="form-row">
                    <div className="form-group"><label className="form-label">Name *</label><input className="form-input" value={name} onChange={e => setName(e.target.value)} required placeholder="Your name" /></div>
                    <div className="form-group"><label className="form-label">Email *</label><input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com" /></div>
                  </div>
                  <div className="form-row">
                    <div className="form-group"><label className="form-label">Phone</label><input className="form-input" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98765 43210" /></div>
                    <div className="form-group"><label className="form-label">Subject</label><input className="form-input" value={subject} onChange={e => setSubject(e.target.value)} placeholder="How can we help?" /></div>
                  </div>
                  <div className="form-group"><label className="form-label">Message *</label><textarea className="form-input" value={message} onChange={e => setMessage(e.target.value)} required rows={5} placeholder="Tell us more..." style={{ resize: 'vertical' }} /></div>
                  <button className="btn btn-primary btn-lg" type="submit" style={{ width: '100%' }}>Send Message</button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
