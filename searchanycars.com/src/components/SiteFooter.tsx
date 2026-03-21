import { Link } from 'react-router-dom'
import { useState } from 'react'
import { useSiteConfig } from '../context/SiteConfigContext'

export const SiteFooter = () => {
  const { config } = useSiteConfig()
  const [openCol, setOpenCol] = useState<string | null>(null)
  const toggle = (col: string) => setOpenCol(openCol === col ? null : col)

  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <h3 style={{ fontFamily: "'Poppins', sans-serif", fontSize: '1.1rem' }}>
              Search<span style={{ color: 'var(--coral)' }}>Any</span>Cars
            </h3>
            <p>{config.footer.brand_text}</p>
          </div>

          {config.footer.columns.map((col) => (
            <div key={col.key} className="footer-col">
              <button className="footer-col-toggle" onClick={() => toggle(col.key)} type="button">
                <h4>{col.title}</h4>
                <span className={`footer-chevron ${openCol === col.key ? 'open' : ''}`}>&#9660;</span>
              </button>
              <div className={`footer-col-links ${openCol === col.key ? 'footer-col-links-open' : ''}`}>
                {col.links.map((link) => (
                  <Link key={link.label} to={link.to}>{link.label}</Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="footer-bottom">
          <span>&copy; {new Date().getFullYear()} SearchAnyCars.com</span>
        </div>
      </div>
    </footer>
  )
}
