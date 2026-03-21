import { useState } from 'react'
import type { FormEvent } from 'react'
import { useSiteConfig } from '../context/SiteConfigContext'

export const ContactPage = () => {
  const { config } = useSiteConfig()
  const ci = config.contact_info
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!name || !email || !message) return
    setSubmitted(true)
  }

  return (
    <main>
      <div className="page-hero">
        <div className="container">
          <h1>Contact Us</h1>
          <p>We're here to help. Reach out to us for any questions about buying a used car.</p>
        </div>
      </div>

      <section className="section">
        <div className="container">
          <div className="contact-grid">
            <div>
              <h2 style={{ marginBottom: '1.5rem' }}>Get in Touch</h2>

              <div className="contact-info-card">
                <div className="contact-info-icon">📞</div>
                <div>
                  <h4 style={{ fontSize: '0.95rem' }}>Phone</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{ci.phone}</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Mon-Sat, 9 AM - 8 PM</p>
                </div>
              </div>

              <div className="contact-info-card">
                <div className="contact-info-icon">💬</div>
                <div>
                  <h4 style={{ fontSize: '0.95rem' }}>WhatsApp</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{ci.whatsapp}</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Quick responses, 24/7</p>
                </div>
              </div>

              <div className="contact-info-card">
                <div className="contact-info-icon">✉️</div>
                <div>
                  <h4 style={{ fontSize: '0.95rem' }}>Email</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{ci.email}</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>We respond within 24 hours</p>
                </div>
              </div>

              <div className="contact-info-card">
                <div className="contact-info-icon">📍</div>
                <div>
                  <h4 style={{ fontSize: '0.95rem' }}>Office</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{ci.address}</p>
                </div>
              </div>
            </div>

            <div>
              {submitted ? (
                <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 16, padding: '2rem', textAlign: 'center' }}>
                  <div className="form-success-icon" style={{ width: 56, height: 56, fontSize: '1.5rem', margin: '0 auto 1rem' }}>✓</div>
                  <h3>Message Sent!</h3>
                  <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                    Thank you for reaching out. Our team will get back to you within 24 hours.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 16, padding: '1.5rem' }}>
                  <h3 style={{ marginBottom: '1rem' }}>Send us a Message</h3>

                  <div className="form-group">
                    <label className="form-label">Full Name *</label>
                    <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" required />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Email *</label>
                      <input className="form-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Phone</label>
                      <input className="form-input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Message *</label>
                    <textarea className="form-input" rows={5} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="How can we help?" required style={{ resize: 'vertical' }} />
                  </div>

                  <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Send Message</button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
